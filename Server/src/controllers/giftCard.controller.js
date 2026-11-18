import mongoose from 'mongoose';
import crypto from 'crypto';
import GiftCard, {GIFT_CARD_STATUSES} from '../models/giftCard.model.js';
const SHARE_TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;
const newShareToken = () => crypto.randomBytes(24).toString('base64url');
import {
  nowInBusinessTz,
  toDateKey,
} from '../services/spaceBookingAvailability.service.js';

const CODE_RE = /^[A-Z0-9][A-Z0-9-]{2,39}$/;
const MAX_CODE_RETRIES = 5;

const roundMoney = value => Math.round(Number(value) * 100) / 100;

const normalizeCode = value => String(value ?? '').trim().toUpperCase();

const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const staffFromReq = req => ({
  m_staff_id: req.user?.m_staff_id ?? req.user?.userId ?? null,
  m_staff_name: req.user?.name ?? null,
  m_staff_email: req.user?.email ?? null,
});

const todayKey = () => nowInBusinessTz().dateKey;
const keyToDate = key => new Date(`${key}T00:00:00Z`);

/** A card is usable once. Zero value means it has been used. Expiry still wins after that day, unless expiryType is never. */
const resolveStatus = ({requested, balance, expiryKey, expiryType}) => {
  if (requested === 'Cancelled') return 'Cancelled';
  if (requested === 'Inactive') return 'Inactive';
  if (balance <= 0) return 'Used';
  if (expiryType !== 'never' && expiryKey && expiryKey < todayKey()) return 'Expired';
  if (requested === 'Expired') return 'Expired';
  return requested === 'Inactive' ? 'Inactive' : 'Active';
};

const serializeGiftCard = (doc, {withTransactions = false} = {}) => {
  const plain = typeof doc?.toObject === 'function' ? doc.toObject() : {...doc};
  const initialAmount = Number(plain.initialAmount || 0);
  const currentBalance = Number(plain.currentBalance || 0);
  const expiryType = plain.expiryType || (plain.expiryDate ? 'custom' : 'never');
  const result = {
    _id: String(plain._id),
    id: String(plain._id),
    code: plain.code,
    name: plain.name,
    initialAmount,
    currentBalance,
    amountUsed: roundMoney(Math.max(0, initialAmount - currentBalance)),
    expiryType,
    expiryDate: plain.expiryDate ? toDateKey(plain.expiryDate) || '' : '',
    customer: plain.customer ? String(plain.customer) : null,
    customerId: plain.customerId || '',
    customerName: plain.customerName || '',
    customerMobile: plain.customerMobile || '',
    customerEmail: plain.customerEmail || '',
    status: plain.status,
    createdBy: plain.createdByName || plain.createdBy?.m_staff_name || '',
    createdByStaff: plain.createdBy || null,
    updatedByStaff: plain.updatedBy || null,
    isShared: Boolean(plain.shareToken),
    sharedAt: plain.shareToken ? plain.sharedAt || null : null,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
  if (withTransactions) {
    result.transactions = (plain.transactions || [])
      .map(t => ({...t, _id: String(t._id)}))
      .sort((a, b) => new Date(b.at) - new Date(a.at));
  }
  return result;
};

const generateGiftCardCode = async () => {
  const year = nowInBusinessTz().dateKey.slice(0, 4);
  const prefix = `GC-${year}-`;
  const docs = await GiftCard.find({code: {$regex: `^${prefix}\\d+$`}})
    .select('code')
    .lean();
  const max = docs.reduce((acc, d) => {
    const n = Number(d.code.slice(prefix.length));
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
};

/** Mark overdue / emptied Active cards so list results reflect reality. Only expire non-never cards with past date. */
const syncGiftCardStatuses = async () => {
  try {
    const todayStart = keyToDate(todayKey());
    await Promise.all([
      GiftCard.updateMany(
        {status: 'Active', currentBalance: {$lte: 0}},
        {$set: {status: 'Used'}},
      ),
      GiftCard.updateMany(
        {
          status: 'Active',
          currentBalance: {$gt: 0},
          expiryType: {$ne: 'never'},
          expiryDate: {$ne: null, $lt: todayStart},
        },
        {$set: {status: 'Expired'}},
      ),
    ]);
  } catch (err) {
    console.error('syncGiftCardStatuses error:', err);
  }
};

/**
 * Validates body fields. With `partial`, only provided fields are checked.
 * Returns normalized values keyed by model field.
 */
const buildPayload = (body = {}, {partial = false} = {}) => {
  const payload = {};
  const errors = [];

  if (body.code !== undefined && String(body.code).trim() !== '') {
    const code = normalizeCode(body.code);
    if (!CODE_RE.test(code)) {
      errors.push('Code must be 3-40 characters: letters, numbers or hyphens.');
    } else {
      payload.code = code;
    }
  } else if (partial && body.code !== undefined) {
    errors.push('Gift card code cannot be empty.');
  }

  if (!partial || body.name !== undefined) {
    const name = String(body.name ?? '').trim();
    if (!name) errors.push('Gift card name is required.');
    else if (name.length > 120) errors.push('Name must be at most 120 characters.');
    else payload.name = name;
  }

  if (!partial || body.initialAmount !== undefined) {
    const n = Number(body.initialAmount);
    if (body.initialAmount === '' || body.initialAmount == null || !Number.isFinite(n)) {
      errors.push('Amount is required.');
    } else if (n <= 0) {
      errors.push('Amount must be greater than 0.');
    } else {
      payload.initialAmount = roundMoney(n);
    }
  }

  // Expiry configuration: 'never' or 'custom'
  const rawExpiryType = body.expiryType !== undefined ? String(body.expiryType).trim().toLowerCase() : undefined;
  if (rawExpiryType === 'never') {
    payload.expiryType = 'never';
    payload.expiryKey = null;
  } else if (rawExpiryType === 'custom') {
    payload.expiryType = 'custom';
    if (!partial || body.expiryDate !== undefined) {
      const key = toDateKey(body.expiryDate);
      if (!key) errors.push('A valid expiry date is required when choosing a specific date.');
      else payload.expiryKey = key;
    }
  } else if (!partial || body.expiryDate !== undefined) {
    if (body.expiryDate) {
      const key = toDateKey(body.expiryDate);
      if (!key) errors.push('A valid expiry date is required.');
      else {
        payload.expiryKey = key;
        payload.expiryType = 'custom';
      }
    } else {
      payload.expiryType = 'never';
      payload.expiryKey = null;
    }
  }

  // Customer assignment fields
  if (body.customer !== undefined) {
    payload.customer = body.customer && mongoose.Types.ObjectId.isValid(String(body.customer))
      ? new mongoose.Types.ObjectId(String(body.customer))
      : null;
  }
  if (body.customerId !== undefined) {
    payload.customerId = String(body.customerId ?? '').trim() || null;
  }
  if (body.customerName !== undefined) {
    payload.customerName = String(body.customerName ?? '').trim();
  }
  if (body.customerMobile !== undefined) {
    payload.customerMobile = String(body.customerMobile ?? '').trim();
  }
  if (body.customerEmail !== undefined) {
    payload.customerEmail = String(body.customerEmail ?? '').trim().toLowerCase();
  }

  if (body.status !== undefined) {
    const status = String(body.status).trim();
    if (!GIFT_CARD_STATUSES.includes(status)) {
      errors.push(`Status must be one of: ${GIFT_CARD_STATUSES.join(', ')}.`);
    } else {
      payload.status = status;
    }
  }

  if (body.createdBy !== undefined) {
    payload.createdByName = String(body.createdBy ?? '').trim().slice(0, 120);
  }

  return {payload, errors};
};

const duplicateCodeResponse = (res, code) =>
  res.status(409).json({
    success: false,
    code: 'DUPLICATE_CODE',
    message: `A gift card with code "${code}" already exists.`,
  });

export const createGiftCard = async (req, res) => {
  try {
    const {payload, errors} = buildPayload(req.body);
    if (errors.length) {
      return res.status(400).json({success: false, message: errors[0], errors});
    }

    if (payload.expiryType !== 'never' && payload.expiryKey && payload.expiryKey < todayKey()) {
      return res.status(400).json({
        success: false,
        message: 'Expiry date cannot be in the past.',
      });
    }

    const amount = payload.initialAmount;
    const staff = staffFromReq(req);
    const autoCode = !payload.code;
    const expiryType = payload.expiryType || (payload.expiryKey ? 'custom' : 'never');

    for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
      const code = payload.code || (await generateGiftCardCode());
      try {
        const card = await GiftCard.create({
          code,
          name: payload.name,
          initialAmount: amount,
          currentBalance: amount,
          expiryType,
          expiryDate: payload.expiryKey ? keyToDate(payload.expiryKey) : null,
          customer: payload.customer || null,
          customerId: payload.customerId || null,
          customerName: payload.customerName || '',
          customerMobile: payload.customerMobile || '',
          customerEmail: payload.customerEmail || '',
          status: resolveStatus({
            requested: payload.status,
            balance: amount,
            expiryKey: payload.expiryKey,
            expiryType,
          }),
          createdByName: payload.createdByName || staff.m_staff_name || '',
          createdBy: staff,
          updatedBy: staff,
          transactions: [
            {
              type: 'issue',
              amount,
              balanceAfter: amount,
              note: 'Gift card issued for one use',
              by: staff,
            },
          ],
        });
        return res.status(201).json({
          success: true,
          message: 'Gift card created successfully.',
          giftCard: serializeGiftCard(card, {withTransactions: true}),
        });
      } catch (err) {
        if (err?.code === 11000 && autoCode) continue;
        if (err?.code === 11000) return duplicateCodeResponse(res, code);
        throw err;
      }
    }

    return res.status(409).json({
      success: false,
      message: 'Could not generate a unique gift card code. Please try again.',
    });
  } catch (error) {
    console.error('createGiftCard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create gift card.',
    });
  }
};

export const getGiftCards = async (req, res) => {
  try {
    await syncGiftCardStatuses();

    const {search = '', status} = req.query;
    const query = {};

    if (status && String(status) !== 'All') {
      if (!GIFT_CARD_STATUSES.includes(String(status))) {
        return res.status(400).json({success: false, message: 'Invalid status filter.'});
      }
      query.status = String(status);
    }

    const s = String(search).trim();
    if (s) {
      const rx = {$regex: escapeRegex(s), $options: 'i'};
      query.$or = [
        {code: rx},
        {name: rx},
        {createdByName: rx},
        {customerName: rx},
        {customerMobile: rx},
        {customerId: rx},
      ];
    }

    const cards = await GiftCard.find(query)
      .select('-transactions')
      .sort({createdAt: -1})
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Gift cards fetched successfully.',
      giftCards: cards.map(c => serializeGiftCard(c)),
    });
  } catch (error) {
    console.error('getGiftCards error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch gift cards.',
    });
  }
};

export const getGiftCardById = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false, message: 'Invalid gift card id.'});
    }

    await syncGiftCardStatuses();
    const card = await GiftCard.findById(id).lean();
    if (!card) {
      return res.status(404).json({success: false, message: 'Gift card not found.'});
    }

    return res.status(200).json({
      success: true,
      giftCard: serializeGiftCard(card, {withTransactions: true}),
    });
  } catch (error) {
    console.error('getGiftCardById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch gift card.',
    });
  }
};

/** Checkout lookup: returns the card plus whether it can be redeemed right now. Supports customer restriction check. */
export const getGiftCardByCode = async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);
    if (!code) {
      return res.status(400).json({success: false, message: 'Gift card code is required.'});
    }

    await syncGiftCardStatuses();
    const card = await GiftCard.findOne({code}).select('-transactions').lean();
    if (!card) {
      return res.status(404).json({
        success: false,
        message: `Gift card "${code}" not found.`,
      });
    }

    let reason = '';
    if (card.status !== 'Active') {
      reason = `This gift card is ${card.status.toLowerCase()}.`;
    } else if (card.currentBalance <= 0) {
      reason = 'This gift card has already been used.';
    } else if (card.expiryType !== 'never' && card.expiryDate && toDateKey(card.expiryDate) < todayKey()) {
      reason = 'This gift card has expired.';
    }

    // Customer assignment validation if the card is assigned to a specific customer
    const hasCustomerRestriction = Boolean(card.customer || card.customerId || card.customerMobile);
    if (!reason && hasCustomerRestriction) {
      const requestedCustomer = String(req.query.customerId || req.query.customer || '').trim();
      const requestedPhone = String(req.query.customerPhone || req.query.phone || '').trim().replace(/\D/g, '').slice(-10);

      const cardCustomerId = String(card.customer?._id || card.customer || card.customerId || '').trim();
      const cardMobile = String(card.customerMobile || '').trim().replace(/\D/g, '').slice(-10);

      const idMatches = requestedCustomer && (cardCustomerId === requestedCustomer || String(card.customerId) === requestedCustomer);
      const phoneMatches = requestedPhone && cardMobile && cardMobile === requestedPhone;

      if (requestedCustomer || requestedPhone) {
        if (!idMatches && !phoneMatches) {
          reason = `This gift card is exclusively assigned to ${card.customerName || card.customerMobile || 'another customer'} and cannot be redeemed for this customer.`;
        }
      }
    }

    return res.status(200).json({
      success: true,
      redeemable: !reason,
      reason,
      giftCard: serializeGiftCard(card),
    });
  } catch (error) {
    console.error('getGiftCardByCode error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to look up gift card.',
    });
  }
};

export const updateGiftCard = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false, message: 'Invalid gift card id.'});
    }

    const card = await GiftCard.findById(id);
    if (!card) {
      return res.status(404).json({success: false, message: 'Gift card not found.'});
    }

    const {payload, errors} = buildPayload(req.body, {partial: true});
    if (errors.length) {
      return res.status(400).json({success: false, message: errors[0], errors});
    }

    const alreadyUsed = card.status === 'Used' || card.currentBalance <= 0;
    if (alreadyUsed && payload.status === 'Active') {
      return res.status(400).json({
        success: false,
        message: 'This gift card has already been used and cannot be used again.',
      });
    }
    if (
      alreadyUsed &&
      payload.initialAmount != null &&
      payload.initialAmount !== card.initialAmount
    ) {
      return res.status(400).json({
        success: false,
        message: 'The amount cannot be changed after the gift card has been used.',
      });
    }

    const staff = staffFromReq(req);
    const expiryType = payload.expiryType ?? card.expiryType ?? (card.expiryDate ? 'custom' : 'never');
    const expiryKey = payload.expiryKey ?? (expiryType === 'never' ? null : toDateKey(card.expiryDate));
    const nextAmount = alreadyUsed
      ? card.initialAmount
      : payload.initialAmount ?? card.initialAmount;

    if (payload.code) card.code = payload.code;
    if (payload.name !== undefined) card.name = payload.name;
    if (payload.createdByName !== undefined) card.createdByName = payload.createdByName;
    
    card.expiryType = expiryType;
    if (expiryType === 'never') {
      card.expiryDate = null;
    } else if (payload.expiryKey) {
      card.expiryDate = keyToDate(payload.expiryKey);
    }

    if (payload.customer !== undefined) card.customer = payload.customer;
    if (payload.customerId !== undefined) card.customerId = payload.customerId;
    if (payload.customerName !== undefined) card.customerName = payload.customerName;
    if (payload.customerMobile !== undefined) card.customerMobile = payload.customerMobile;
    if (payload.customerEmail !== undefined) card.customerEmail = payload.customerEmail;

    card.initialAmount = nextAmount;
    if (!alreadyUsed) card.currentBalance = nextAmount;
    card.status = resolveStatus({
      requested: payload.status ?? card.status,
      balance: card.currentBalance,
      expiryKey,
      expiryType,
    });
    card.updatedBy = staff;

    try {
      await card.save();
    } catch (err) {
      if (err?.code === 11000) return duplicateCodeResponse(res, card.code);
      throw err;
    }

    return res.status(200).json({
      success: true,
      message: 'Gift card updated successfully.',
      giftCard: serializeGiftCard(card, {withTransactions: true}),
    });
  } catch (error) {
    console.error('updateGiftCard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update gift card.',
    });
  }
};

/**
 * Uses an Active, unexpired card exactly once. The whole amount is consumed
 * in one update, so the same code cannot be applied again. Enforces customer restriction.
 */
export const redeemGiftCard = async (req, res) => {
  try {
    const code = normalizeCode(req.body?.code);
    const reference = String(req.body?.reference ?? '').trim().slice(0, 120);
    const note = String(req.body?.note ?? '').trim().slice(0, 300);

    if (!code) {
      return res.status(400).json({success: false, message: 'Gift card code is required.'});
    }

    const todayStart = keyToDate(todayKey());
    const staff = staffFromReq(req);

    // First check existing card for status, expiry, and customer restriction
    const targetCard = await GiftCard.findOne({code}).lean();
    if (!targetCard) {
      return res.status(404).json({success: false, message: `Gift card "${code}" not found.`});
    }

    if (targetCard.status === 'Used') {
      return res.status(400).json({
        success: false,
        code: 'NOT_REDEEMABLE',
        message: 'This gift card has already been used.',
      });
    }
    if (targetCard.status !== 'Active') {
      return res.status(400).json({
        success: false,
        code: 'NOT_REDEEMABLE',
        message: `This gift card is ${targetCard.status.toLowerCase()}.`,
      });
    }
    if (targetCard.expiryType !== 'never' && targetCard.expiryDate && toDateKey(targetCard.expiryDate) < todayKey()) {
      return res.status(400).json({
        success: false,
        code: 'NOT_REDEEMABLE',
        message: 'This gift card has expired.',
      });
    }

    // Customer assignment validation
    const hasCustomerRestriction = Boolean(targetCard.customer || targetCard.customerId || targetCard.customerMobile);
    if (hasCustomerRestriction) {
      const redeemingCustomer = String(req.body?.customerId || req.body?.customer || '').trim();
      const redeemingPhone = String(req.body?.customerPhone || req.body?.phone || '').trim().replace(/\D/g, '').slice(-10);

      const cardCustomerId = String(targetCard.customer?._id || targetCard.customer || targetCard.customerId || '').trim();
      const cardMobile = String(targetCard.customerMobile || '').trim().replace(/\D/g, '').slice(-10);

      const idMatches = redeemingCustomer && (cardCustomerId === redeemingCustomer || String(targetCard.customerId) === redeemingCustomer);
      const phoneMatches = redeemingPhone && cardMobile && cardMobile === redeemingPhone;

      if (!idMatches && !phoneMatches) {
        return res.status(403).json({
          success: false,
          code: 'CUSTOMER_MISMATCH',
          message: `This gift card is exclusively assigned to ${targetCard.customerName || targetCard.customerMobile || 'another customer'} and cannot be redeemed.`,
        });
      }
    }

    const updated = await GiftCard.findOneAndUpdate(
      {
        code,
        status: 'Active',
        currentBalance: {$gt: 0},
        $or: [
          {expiryType: 'never'},
          {expiryDate: null},
          {expiryDate: {$gte: todayStart}},
        ],
      },
      [
        {
          $set: {
            status: 'Used',
            currentBalance: 0,
            updatedBy: {$literal: staff},
            updatedAt: '$$NOW',
            transactions: {
              $concatArrays: [
                {$ifNull: ['$transactions', []]},
                [
                  {
                    _id: new mongoose.Types.ObjectId(),
                    type: 'redeem',
                    amount: {$multiply: [-1, '$currentBalance']},
                    balanceAfter: 0,
                    reference: {$literal: reference},
                    note: {$literal: note || 'Used once at checkout'},
                    by: {$literal: staff},
                    at: '$$NOW',
                  },
                ],
              ],
            },
          },
        },
      ],
      {new: true},
    );

    if (!updated) {
      return res.status(400).json({
        success: false,
        code: 'NOT_REDEEMABLE',
        message: 'This gift card cannot be used.',
      });
    }

    const redeemTxn = [...(updated.transactions || [])].reverse().find(t => t.type === 'redeem');
    const redeemedAmount = roundMoney(Math.abs(redeemTxn?.amount || 0));

    return res.status(200).json({
      success: true,
      message: `Gift card ${code} used once (₹${redeemedAmount}).`,
      redeemedAmount,
      giftCard: serializeGiftCard(updated, {withTransactions: true}),
    });
  } catch (error) {
    console.error('redeemGiftCard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to redeem gift card.',
    });
  }
};

/**
 * Reverses one earlier redemption (e.g. when invoice creation fails after the
 * card was charged). Only a redeem with the same `reference` can be reversed,
 * and only once, so this can't be used to top up a card arbitrarily.
 */
export const refundGiftCard = async (req, res) => {
  try {
    const code = normalizeCode(req.body?.code);
    const reference = String(req.body?.reference ?? '').trim().slice(0, 120);
    if (!code || !reference) {
      return res.status(400).json({
        success: false,
        message: 'Gift card code and redemption reference are required.',
      });
    }

    const card = await GiftCard.findOne({code}).select('transactions').lean();
    if (!card) {
      return res.status(404).json({success: false, message: `Gift card "${code}" not found.`});
    }
    const redeemTxn = (card.transactions || []).find(
      t => t.type === 'redeem' && t.reference === reference,
    );
    if (!redeemTxn) {
      return res.status(404).json({
        success: false,
        message: 'No matching redemption found for this gift card.',
      });
    }

    const amount = roundMoney(Math.abs(redeemTxn.amount));
    const staff = staffFromReq(req);
    const note = String(req.body?.note ?? '').trim().slice(0, 300);

    const updated = await GiftCard.findOneAndUpdate(
      {
        code,
        transactions: {$not: {$elemMatch: {type: 'refund', reference}}},
      },
      [
        {
          $set: {
            currentBalance: {
              $min: [
                '$initialAmount',
                {$round: [{$add: ['$currentBalance', amount]}, 2]},
              ],
            },
          },
        },
        {
          $set: {
            status: {
              $cond: [
                {$and: [{$eq: ['$status', 'Used']}, {$gt: ['$currentBalance', 0]}]},
                'Active',
                '$status',
              ],
            },
            updatedBy: {$literal: staff},
            updatedAt: '$$NOW',
            transactions: {
              $concatArrays: [
                {$ifNull: ['$transactions', []]},
                [
                  {
                    _id: new mongoose.Types.ObjectId(),
                    type: 'refund',
                    amount,
                    balanceAfter: '$currentBalance',
                    reference: {$literal: reference},
                    note: {$literal: note || 'Redemption reversed'},
                    by: {$literal: staff},
                    at: '$$NOW',
                  },
                ],
              ],
            },
          },
        },
      ],
      {new: true},
    );

    if (!updated) {
      return res.status(409).json({
        success: false,
        code: 'ALREADY_REFUNDED',
        message: 'This redemption has already been reversed.',
      });
    }

    return res.status(200).json({
      success: true,
      message: `₹${amount} restored to gift card ${code}.`,
      refundedAmount: amount,
      giftCard: serializeGiftCard(updated, {withTransactions: true}),
    });
  } catch (error) {
    console.error('refundGiftCard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reverse gift card redemption.',
    });
  }
};   
export const shareGiftCard = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false, message: 'Invalid gift card id.'});
    }

    await syncGiftCardStatuses();
    const card = await GiftCard.findById(id).select('-transactions');
    if (!card) {
      return res.status(404).json({success: false, message: 'Gift card not found.'});
    }
    if (card.status !== 'Active') {
      return res.status(400).json({
        success: false,
        message: `Only active gift cards can be shared. This card is ${card.status.toLowerCase()}.`,
      });
    }

    const regenerate = req.body?.regenerate === true;
    if (card.shareToken && !regenerate) {
      return res.status(200).json({
        success: true,
        message: 'Share link ready.',
        shareToken: card.shareToken,
        sharedAt: card.sharedAt,
        giftCard: serializeGiftCard(card),
      });
    }

    const staff = staffFromReq(req);
    for (let attempt = 0; attempt < 3; attempt++) {
      card.shareToken = newShareToken();
      card.sharedAt = new Date();
      card.sharedBy = staff;
      try {
        await card.save();
        return res.status(200).json({
          success: true,
          message: regenerate
            ? 'New share link created. The old link no longer works.'
            : 'Share link created.',
          shareToken: card.shareToken,
          sharedAt: card.sharedAt,
          giftCard: serializeGiftCard(card),
        });
      } catch (err) {
        if (err?.code !== 11000) throw err;
      }
    }
    return res.status(500).json({success: false, message: 'Could not create a share link.'});
  } catch (error) {
    console.error('shareGiftCard error:', error);
    return res.status(500).json({success: false, message: 'Failed to share gift card.'});
  }
};

export const revokeGiftCardShare = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false, message: 'Invalid gift card id.'});
    }

    const card = await GiftCard.findByIdAndUpdate(
      id,
      {$unset: {shareToken: 1, sharedBy: 1}, $set: {sharedAt: null}},
      {new: true},
    ).select('-transactions');
    if (!card) {
      return res.status(404).json({success: false, message: 'Gift card not found.'});
    }

    return res.status(200).json({
      success: true,
      message: 'Share link disabled. Anyone with the old link can no longer open it.',
      giftCard: serializeGiftCard(card),
    });
  } catch (error) {
    console.error('revokeGiftCardShare error:', error);
    return res.status(500).json({success: false, message: 'Failed to disable share link.'});
  }
};

/** Unauthenticated view for share links. Exposes only what the recipient needs. */
export const getPublicGiftCard = async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.set('X-Robots-Tag', 'noindex, nofollow');
  const notFound = () =>
    res.status(404).json({
      success: false,
      message: 'This gift card link is invalid or has been disabled.',
    });

  try {
    const token = String(req.params.token ?? '');
    if (!SHARE_TOKEN_RE.test(token)) return notFound();

    const card = await GiftCard.findOne({shareToken: token})
      .select('code name initialAmount currentBalance expiryType expiryDate status')
      .lean();
    if (!card) return notFound();

    const isNever = card.expiryType === 'never' || !card.expiryDate;
    const expiryKey = isNever ? '' : (toDateKey(card.expiryDate) || '');
    const status = resolveStatus({
      requested: card.status,
      balance: Number(card.currentBalance || 0),
      expiryKey,
      expiryType: card.expiryType,
    });
    const usable = status === 'Active';

    return res.status(200).json({
      success: true,
      giftCard: {
        name: card.name,
        code: usable ? card.code : `${card.code.slice(0, 3)}••••••`,
        initialAmount: Number(card.initialAmount || 0),
        currentBalance: usable ? Number(card.currentBalance || 0) : 0,
        expiryType: card.expiryType || (card.expiryDate ? 'custom' : 'never'),
        expiryDate: isNever ? 'Never Expires' : expiryKey,
        status,
        usable,
      },
    });
  } catch (error) {
    console.error('getPublicGiftCard error:', error);
    return res.status(500).json({success: false, message: 'Failed to load gift card.'});
  }
};

export const deleteGiftCard = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false, message: 'Invalid gift card id.'});
    }

    const card = await GiftCard.findById(id).select('transactions.type code').lean();
    if (!card) {
      return res.status(404).json({success: false, message: 'Gift card not found.'});
    }

    if ((card.transactions || []).some(t => t.type === 'redeem')) {
      return res.status(409).json({
        success: false,
        code: 'HAS_REDEMPTIONS',
        message: 'This gift card has been redeemed and cannot be deleted. Cancel it instead.',
      });
    }

    await GiftCard.deleteOne({_id: id});
    return res.status(200).json({
      success: true,
      message: 'Gift card deleted successfully.',
    });
  } catch (error) {
    console.error('deleteGiftCard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete gift card.',
    });
  }
};

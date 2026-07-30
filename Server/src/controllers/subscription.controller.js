import mongoose from 'mongoose';
import Counter from '../models/counter.model.js';
import Subscription from '../models/subscription.model.js';
import Customer from '../models/customer.model.js';
import Membership from '../models/membership.model.js';
import Wallet from '../models/wallet.model.js';
import {sendSubscriptionCreatedEmail} from '../utils/brevoMailer.js';
import {
  validateSubscriptionCreateBody,
  validateSubscriptionUpdateBody,
} from '../schemas/subscription.schema.js';
import {validateReferralDiscountForOrder} from './affiliate.controller.js';
import {validateCouponForOrder} from './coupon.controller.js';
import {creditReferralDiscountToInviter, markReferralDiscountUsed} from '../modules/customer/services/referral.service.js';
import {sendNewMembershipWhatsApp} from '../modules/customer/services/whatsapp.service.js';
import {resolvePlanMeta} from '../services/membershipPlan.service.js';
import {appendTransaction} from './wallet.controller.js';

/** Credit fixed plan wallet cashback when membership is purchased (idempotent). */
const creditPlanPurchaseCashback = async ({
  customer,
  subscriptionCode,
  amount,
  planName,
  createdBy,
}) => {
  const cashbackAmt = Math.max(0, Number(amount ?? 0));
  if (!customer?._id || !(cashbackAmt > 0)) return null;

  let wallet = await Wallet.findOne({customerId: customer._id});
  if (!wallet) {
    wallet = await Wallet.create({
      customerId: customer._id,
      customerName: String(customer.name ?? '').trim(),
      customerPhone: String(customer.mobile ?? '').trim(),
      walletAmount: 0,
      transactions: [],
    });
  }

  const ref = String(subscriptionCode || '').trim();
  const alreadyCredited = (wallet.transactions || []).some(
    tx =>
      String(tx.referenceId || '').trim() === ref &&
      String(tx.type || '').toLowerCase() === 'credit' &&
      String(tx.referenceType || '') === 'MembershipPurchase' &&
      /cashback/i.test(String(tx.note || '')),
  );
  if (alreadyCredited) return wallet;

  return appendTransaction(wallet, {
    type: 'credit',
    amount: cashbackAmt,
    note: `Membership purchase cashback · ${planName || 'Plan'} · ${ref}`,
    referenceType: 'MembershipPurchase',
    referenceId: ref,
    walletType: 'cashback',
    createdBy,
  });
};

const getNextSubscriptionNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    {key: 'subscription_number'},
    {$inc: {value: 1}},
    {new: true, upsert: true, setDefaultsOnInsert: true},
  );
  return counter.value;
};

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isJuniorMembership = value => {
  const v = String(value ?? '').trim().toLowerCase();
  return v.includes('junior') || v.includes('junoir');
};

/** Resolve plan priority from payload or Membership catalogue. */
const resolveMembershipPriority = async ({
  membershipId,
  membershipPlanId,
  membershipType,
  priorityFromBody,
}) => {
  const fromBody = Number(priorityFromBody);
  if (Number.isFinite(fromBody) && fromBody >= 0) return fromBody;

  const query = {};
  if (membershipId && mongoose.Types.ObjectId.isValid(String(membershipId))) {
    query._id = membershipId;
  } else if (membershipPlanId) {
    query.planId = String(membershipPlanId).trim().toLowerCase();
  } else if (membershipType) {
    query.planId = String(membershipType).trim().toLowerCase();
  }
  if (!Object.keys(query).length) return 0;

  const plan = await Membership.findOne(query).select('priority').lean();
  return Math.max(0, Number(plan?.priority ?? 0) || 0);
};

/**
 * Customer's effective priority for upgrade rules.
 * Junior membership priority does not restrict upgrades (treated as 0).
 */
const getCustomerUpgradePriority = async customerPhone => {
  const customer = await Customer.findOne({
    mobile: String(customerPhone || '').trim(),
    isDeleted: {$ne: true},
  })
    .select('priority membershipType membershipPlanId')
    .lean();

  if (!customer) return 0;
  if (isJuniorMembership(customer.membershipType)) return 0;

  const stored = Number(customer.priority ?? 0);
  if (Number.isFinite(stored) && stored > 0) return stored;

  if (customer.membershipPlanId) {
    const plan = await Membership.findById(customer.membershipPlanId)
      .select('priority')
      .lean();
    return Math.max(0, Number(plan?.priority ?? 0) || 0);
  }

  const type = String(customer.membershipType || '').trim().toLowerCase();
  if (type && type !== 'none') {
    const plan = await Membership.findOne({planId: type}).select('priority').lean();
    return Math.max(0, Number(plan?.priority ?? 0) || 0);
  }

  return 0;
};

/** Human-readable validity for WhatsApp `newmembership` {{3}}. */
const formatSubscriptionValidity = ({startDate, endDate, repeatUnit, repeatType}) => {
  const unit = String(repeatUnit || '').trim().toLowerCase();
  const type = String(repeatType || '').trim().toLowerCase();
  if (unit === 'year' || type === 'yearly') return '1 year';
  if (unit === 'month' || type === 'monthly') return '1 month';
  if (type === 'weekly') return '1 week';

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  if (
    start &&
    end &&
    !Number.isNaN(start.getTime()) &&
    !Number.isNaN(end.getTime()) &&
    end > start
  ) {
    const days = Math.round((end.getTime() - start.getTime()) / 86400000);
    if (days >= 360) return '1 year';
    if (days >= 28 && days <= 31) return '1 month';
    if (days > 0) return `${days} days`;
  }

  return '1 year';
};

export const createSubscription = async (req, res) => {
  try {
    const parsed = validateSubscriptionCreateBody(req.body);
    if (!parsed.ok) {
      return res.status(400).json({
        success: false,
        message: parsed.errors.join(' '),
        errors: parsed.errors,
      });
    }

    const nextNumber = await getNextSubscriptionNumber();
    const subscriptionPrefix = 'SUB';
    const subscriptionCode = `${subscriptionPrefix}-${nextNumber}`;

    const staffFromReq = {
      m_staff_id: req.user?.userId ?? null,
      m_staff_name: req.user?.name ?? null,
      m_staff_email: req.user?.email ?? null,
    };

    const createdBy = parsed.data.createdBy ?? staffFromReq;
    const membershipType = String(parsed.data.membershipType ?? '').trim().toLowerCase();
    const juniorMembership = isJuniorMembership(membershipType);

    const newPriority = await resolveMembershipPriority({
      membershipId: parsed.data.membershipId,
      membershipPlanId: parsed.data.membershipPlanId,
      membershipType,
      priorityFromBody: parsed.data.priority,
    });

    // Junior: always allowed (priority rules do not apply).
    // Non-Junior: only allow if newPriority > customer's current priority.
    if (!juniorMembership) {
      const currentPriority = await getCustomerUpgradePriority(
        parsed.data.customerPhone,
      );
      if (currentPriority > 0 && newPriority <= currentPriority) {
        return res.status(409).json({
          success: false,
          message:
            'Membership upgrade not allowed. Choose a plan with a higher priority than the customer\'s current membership. (Same or lower priority plans, and downgrades, are blocked. Junior membership is always allowed.)',
        });
      }
    }

    let referralDiscount = 0;
    let appliedReferral = null;
    const referral = parsed.data.referral;
    if (referral?.code || Number(referral?.discountAmount) > 0) {
      const referralValidation = await validateReferralDiscountForOrder({
        customerPhone: parsed.data.customerPhone,
        referralCode: referral?.code,
        orderAmount: parsed.data.subTotal,
        items: (parsed.data.items || []).map(item => ({
          productName: item.productName,
          qty: item.qty,
          unitPrice: item.unitPrice,
          discount: item.discount,
          lineTotal: item.lineTotal,
          category: item.category || 'membership',
        })),
      });
      if (!referralValidation.ok) {
        const softSkip =
          /no referral discount applies|no enabled commission rules|no commission rules/i.test(
            String(referralValidation.message || ''),
          );
        if (!softSkip) {
          return res.status(400).json({
            success: false,
            message: referralValidation.message,
          });
        }
      } else {
        appliedReferral = referralValidation;
        referralDiscount = Number(referralValidation.discountAmount ?? 0);
      }
    }

    let couponDiscount = 0;
    let appliedCoupon = null;
    const coupon = parsed.data.coupon;
    if (coupon?.code) {
      const couponValidation = await validateCouponForOrder({
        code: coupon.code,
        orderAmount: Math.max(0, parsed.data.subTotal - referralDiscount),
        customerPhone: parsed.data.customerPhone,
      });
      if (!couponValidation.ok) {
        return res.status(400).json({
          success: false,
          message: couponValidation.message,
        });
      }
      appliedCoupon = couponValidation.coupon;
      couponDiscount = Number(couponValidation.discountAmount ?? 0);
    }

    const itemDiscountTotal = (parsed.data.items || []).reduce(
      (sum, item) => sum + Number(item.discount ?? 0),
      0,
    );
    const computedDiscountTotal = itemDiscountTotal + couponDiscount + referralDiscount;
    const computedGrandTotal = Math.max(0, Number(parsed.data.subTotal) - computedDiscountTotal);

    const subscription = await Subscription.create({
      subscriptionPrefix,
      subscriptionNumber: nextNumber,
      subscriptionCode,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      membershipId: parsed.data.membershipId,
      membershipPlanId: parsed.data.membershipPlanId,
      membershipType: membershipType || 'general',
      priority: newPriority,
      invoiceDate: parsed.data.invoiceDate,
      dueDate: parsed.data.dueDate,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      repeatType: parsed.data.repeatType,
      repeatEvery: parsed.data.repeatEvery,
      repeatUnit: parsed.data.repeatUnit,
      salesPersonName: parsed.data.salesPersonName,
      notes: parsed.data.notes,
      status: parsed.data.status,
      items: parsed.data.items.map(item => ({
        productName: item.productName,
        qty: item.qty,
        unitPrice: item.unitPrice,
        discount: item.discount,
        lineTotal: item.lineTotal,
      })),
      students: parsed.data.students,
      subTotal: parsed.data.subTotal,
      discountTotal: computedDiscountTotal,
      grandTotal: computedGrandTotal,
      referral: appliedReferral
        ? {
            code: appliedReferral.referralCode,
            inviterName: appliedReferral.inviterName || '',
            label: appliedReferral.label || 'Membership Referral Discount',
            discountAmount: referralDiscount,
          }
        : undefined,
      coupon: appliedCoupon
        ? {
            code: appliedCoupon.code,
            title: appliedCoupon.title,
            discountAmount: couponDiscount,
          }
        : undefined,
      createdBy,
      noOfInvoices: 0,
      nextInvoiceDate: parsed.data.startDate,
    });

    if (appliedReferral) {
      const commissionAmount = Number(
        appliedReferral.commissionAmount ?? referralDiscount ?? 0,
      );
      try {
        const buyer = await Customer.findOne({
          mobile: parsed.data.customerPhone,
          isDeleted: {$ne: true},
        })
          .select('_id name')
          .lean();

        if (commissionAmount > 0) {
          await creditReferralDiscountToInviter({
            inviterId: appliedReferral.inviterId,
            referredCustomerId: appliedReferral.buyerId || buyer?._id,
            sourceType: 'subscription',
            sourceId: subscriptionCode,
            orderAmount: parsed.data.subTotal,
            commissionAmount,
            commissionType: appliedReferral.discountType,
            commissionValue: appliedReferral.discountValue,
            category: appliedReferral.segments?.[0]?.category || 'membership',
            segments: appliedReferral.segments,
            buyerName: buyer?.name || parsed.data.customerName,
          });
        }

        if (referralDiscount > 0 && (appliedReferral.buyerId || buyer?._id)) {
          await markReferralDiscountUsed({
            customerId: appliedReferral.buyerId || buyer._id,
            sourceId: subscriptionCode,
          });
        }
      } catch (creditError) {
        console.error(
          'createSubscription referral commission credit error:',
          creditError,
        );
      }
    }

    const customerForMembership = await Customer.findOne({
      mobile: parsed.data.customerPhone,
      isDeleted: {$ne: true},
    })
      .select('_id membershipType priority membershipPlanId')
      .lean();

    if (juniorMembership) {
      // Junior does not overwrite a higher / non-Junior membership on the customer.
      const existingType = String(customerForMembership?.membershipType || 'none')
        .trim()
        .toLowerCase();
      const hasMainMembership =
        existingType &&
        existingType !== 'none' &&
        !isJuniorMembership(existingType);
      if (!hasMainMembership) {
        await Customer.findOneAndUpdate(
          {mobile: parsed.data.customerPhone},
          {
            $set: {
              membershipType: 'junior',
              priority: newPriority,
              ...(parsed.data.membershipId &&
              mongoose.Types.ObjectId.isValid(parsed.data.membershipId)
                ? {membershipPlanId: parsed.data.membershipId}
                : {}),
            },
          },
        );
      }
    } else {
      await Customer.findOneAndUpdate(
        {mobile: parsed.data.customerPhone},
        {
          $set: {
            membershipType: membershipType || 'general',
            priority: newPriority,
            ...(parsed.data.membershipId &&
            mongoose.Types.ObjectId.isValid(parsed.data.membershipId)
              ? {membershipPlanId: parsed.data.membershipId}
              : {}),
          },
        },
      );
    }

    try {
      const customer = await Customer.findOne({
        mobile: parsed.data.customerPhone,
      })
        .select('name email whatsappNumber mobile')
        .lean();
      const customerEmail = String(customer?.email ?? '').trim().toLowerCase();

      if (customerEmail && EMAIL_RE.test(customerEmail)) {
        await sendSubscriptionCreatedEmail({
          toEmail: customerEmail,
          customerName: customer?.name || parsed.data.customerName,
          subscriptionCode,
          subscription,
        });
      } else {
        console.warn(
          `createSubscription: email not sent for ${subscriptionCode} (missing/invalid customer email).`,
        );
      }
    } catch (mailError) {
      console.error('createSubscription email error:', mailError);
    }

    // Credit plan wallet cashback + WhatsApp on activation
    try {
      const statusNorm = String(parsed.data.status || '').trim().toLowerCase();
      if (statusNorm === 'active' || statusNorm === 'completed') {
        let membershipLabel =
          String(parsed.data.items?.[0]?.productName || '').trim() ||
          String(parsed.data.membershipType || 'Membership').trim();
        let validity = formatSubscriptionValidity({
          startDate: parsed.data.startDate,
          endDate: parsed.data.endDate,
          repeatUnit: parsed.data.repeatUnit,
          repeatType: parsed.data.repeatType,
        });
        let planWalletCashback = 0;

        try {
          const planQuery = {};
          if (parsed.data.membershipId) {
            planQuery._id = parsed.data.membershipId;
          } else if (parsed.data.membershipPlanId) {
            planQuery.planId = String(parsed.data.membershipPlanId)
              .trim()
              .toLowerCase();
          }
          if (Object.keys(planQuery).length) {
            const plan = await Membership.findOne(planQuery).lean();
            if (plan) {
              const meta = resolvePlanMeta(plan);
              membershipLabel = meta.label || membershipLabel;
              validity = meta.validity || validity;
              // Temporarily disabled: do not credit purchase cashback on membership create
              planWalletCashback = 0;
            }
          }
        } catch (planError) {
          console.warn(
            'createSubscription: membership plan lookup failed:',
            planError?.message || planError,
          );
        }

        // Temporarily disabled: membership purchase cashback is always ₹0
        // (re-enable by restoring plan.walletCashback.amount + env fallback below)
        const safeCashback = 0;

        const customer = await Customer.findOne({
          mobile: parsed.data.customerPhone,
        })
          .select('_id name whatsappNumber mobile')
          .lean();

        if (planWalletCashback > 0 && customer) {
          try {
            await creditPlanPurchaseCashback({
              customer,
              subscriptionCode,
              amount: planWalletCashback,
              planName: membershipLabel,
              createdBy: parsed.data.createdBy,
            });
          } catch (walletError) {
            console.error(
              'createSubscription wallet cashback error:',
              walletError?.message || walletError,
            );
          }
        }

        const whatsappTo =
          String(customer?.whatsappNumber || '').trim() ||
          String(customer?.mobile || parsed.data.customerPhone).trim();

        if (whatsappTo) {
          void (async () => {
            try {
              await sendNewMembershipWhatsApp({
                to: whatsappTo,
                name: customer?.name || parsed.data.customerName || 'Member',
                membershipLabel,
                validity,
                cashbackLabel: `₹${safeCashback}`,
              });
            } catch (waError) {
              console.error(
                '[NewMembership] WhatsApp send error:',
                waError?.message || waError,
              );
            }
          })();
        }
      }
    } catch (waSetupError) {
      console.error(
        'createSubscription WhatsApp setup error:',
        waSetupError?.message || waSetupError,
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Subscription created successfully.',
      subscription,
    });
  } catch (error) {
    console.error('createSubscription error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create subscription.',
    });
  }
};

export const getSubscriptions = async (req, res) => {
  try {
    const search = String(req.query.search ?? '').trim();
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const status = String(req.query.status ?? '').trim().toLowerCase();

    const query = {};
    if (status && status !== 'all') query.status = status;

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        {subscriptionCode: regex},
        {customerName: regex},
        {customerPhone: regex},
      ];
    }

    const subscriptions = await Subscription.find(query)
      .sort({createdAt: -1})
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Subscriptions fetched successfully.',
      subscriptions,
    });
  } catch (error) {
    console.error('getSubscriptions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions.',
    });
  }
};

export const getSubscriptionById = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false, message: 'Invalid id.'});
    }

    const subscription = await Subscription.findById(id).lean();
    if (!subscription) {
      return res.status(404).json({success: false, message: 'Subscription not found.'});
    }

    return res.status(200).json({
      success: true,
      message: 'Subscription fetched successfully.',
      subscription,
    });
  } catch (error) {
    console.error('getSubscriptionById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription.',
    });
  }
};

export const updateSubscription = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false, message: 'Invalid id.'});
    }

    const parsed = validateSubscriptionUpdateBody(req.body);
    if (!parsed.ok) {
      return res.status(400).json({
        success: false,
        message: parsed.errors.join(' '),
        errors: parsed.errors,
      });
    }

    if (parsed.data.customerPhone || parsed.data.membershipType || parsed.data.endDate || parsed.data.priority !== undefined) {
      const existing = await Subscription.findById(id).lean();
      if (!existing) {
        return res.status(404).json({success: false, message: 'Subscription not found.'});
      }

      const nextCustomerPhone = parsed.data.customerPhone ?? existing.customerPhone;
      const nextMembershipType = String(
        parsed.data.membershipType ?? existing.membershipType ?? 'general',
      ).toLowerCase();
      const juniorMembership = isJuniorMembership(nextMembershipType);

      if (!juniorMembership) {
        const newPriority = await resolveMembershipPriority({
          membershipId: parsed.data.membershipId ?? existing.membershipId,
          membershipPlanId:
            parsed.data.membershipPlanId ?? existing.membershipPlanId,
          membershipType: nextMembershipType,
          priorityFromBody:
            parsed.data.priority !== undefined
              ? parsed.data.priority
              : existing.priority,
        });
        const currentPriority = await getCustomerUpgradePriority(nextCustomerPhone);
        // Allow keeping same plan on edit; block only when changing to lower/equal priority from a different plan
        const existingPriority = Math.max(0, Number(existing.priority ?? 0) || 0);
        const changingPlan =
          String(parsed.data.membershipId ?? existing.membershipId) !==
            String(existing.membershipId) ||
          String(parsed.data.membershipPlanId ?? existing.membershipPlanId) !==
            String(existing.membershipPlanId) ||
          nextMembershipType !== String(existing.membershipType || '').toLowerCase();

        if (
          changingPlan &&
          currentPriority > 0 &&
          newPriority <= currentPriority &&
          newPriority !== existingPriority
        ) {
          return res.status(409).json({
            success: false,
            message:
              'Membership upgrade not allowed. New plan priority must be higher than the customer\'s current membership priority.',
          });
        }
      }
    }

    const subscription = await Subscription.findByIdAndUpdate(
      id,
      {$set: parsed.data},
      {new: true},
    );

    if (!subscription) {
      return res.status(404).json({success: false, message: 'Subscription not found.'});
    }

    if (parsed.data.customerPhone || parsed.data.membershipType || parsed.data.priority !== undefined) {
      const membershipType = String(
        parsed.data.membershipType ?? subscription.membershipType ?? 'general',
      )
        .trim()
        .toLowerCase();
      const juniorMembership = isJuniorMembership(membershipType);
      const priority = Math.max(
        0,
        Number(
          parsed.data.priority ??
            subscription.priority ??
            0,
        ) || 0,
      );

      if (juniorMembership) {
        const customer = await Customer.findOne({
          mobile: parsed.data.customerPhone ?? subscription.customerPhone,
        })
          .select('membershipType')
          .lean();
        const existingType = String(customer?.membershipType || 'none').toLowerCase();
        const hasMain =
          existingType &&
          existingType !== 'none' &&
          !isJuniorMembership(existingType);
        if (!hasMain) {
          await Customer.findOneAndUpdate(
            {mobile: parsed.data.customerPhone ?? subscription.customerPhone},
            {$set: {membershipType: 'junior', priority}},
          );
        }
      } else {
        await Customer.findOneAndUpdate(
          {mobile: parsed.data.customerPhone ?? subscription.customerPhone},
          {
            $set: {
              membershipType,
              priority,
              ...(subscription.membershipId &&
              mongoose.Types.ObjectId.isValid(subscription.membershipId)
                ? {membershipPlanId: subscription.membershipId}
                : {}),
            },
          },
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Subscription updated successfully.',
      subscription,
    });
  } catch (error) {
    console.error('updateSubscription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update subscription.',
    });
  }
};

export const deleteSubscription = async (req, res) => {
  try {
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({success: false, message: 'Invalid id.'});
    }

    const deleted = await Subscription.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({success: false, message: 'Subscription not found.'});
    }

    return res.status(200).json({
      success: true,
      message: 'Subscription deleted successfully.',
    });
  } catch (error) {
    console.error('deleteSubscription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete subscription.',
    });
  }
};

const normalizeBulkPhone = raw => {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const digits = String(Math.trunc(Math.abs(raw)));
    return digits.length > 10 ? digits.slice(-10) : digits;
  }
  const digits = String(raw ?? '').replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const toBulkIsoDate = value => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Excel serial date
    const epoch = Date.UTC(1899, 11, 30);
    const d = new Date(epoch + value * 86400000);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const text = String(value ?? '').trim();
  if (!text) return '';
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return text;
};

const resolveMembershipFromExcel = async membershipPlanRaw => {
  const key = String(membershipPlanRaw ?? '').trim();
  if (!key) return null;

  const escaped = escapeRegex(key);
  const plan = await Membership.findOne({
    $or: [
      {planId: new RegExp(`^${escaped}$`, 'i')},
      {displayName: new RegExp(`^${escaped}$`, 'i')},
    ],
  }).lean();

  return plan || null;
};

const mapExcelRowToCreateBody = async (excelRow, req) => {
  const customerName = String(excelRow?.customerName ?? '').trim();
  const customerPhone = normalizeBulkPhone(excelRow?.customerPhone);
  const membershipPlanKey = String(excelRow?.membershipPlan ?? '').trim();
  const startDate = toBulkIsoDate(excelRow?.startDate);
  const endDate = toBulkIsoDate(excelRow?.endDate);
  const salesPersonName =
    String(excelRow?.salesPersonName ?? '').trim() ||
    String(req.user?.name || req.user?.m_staff_name || 'Admin').trim();
  const amount = Math.max(0, Number(excelRow?.amount ?? 0) || 0);
  const statusRaw = String(excelRow?.status ?? 'active').trim().toLowerCase();
  const status = [
    'draft',
    'active',
    'completed',
    'expired',
    'error',
    'cancelled',
  ].includes(statusRaw)
    ? statusRaw
    : 'active';
  const repeatTypeRaw = String(excelRow?.repeatType ?? 'yearly')
    .trim()
    .toLowerCase();
  const repeatType = ['weekly', 'monthly', 'yearly', 'lifetime'].includes(
    repeatTypeRaw,
  )
    ? repeatTypeRaw
    : 'yearly';
  const notes = String(excelRow?.notes ?? '').trim();

  if (!customerName) throw new Error('customerName is required');
  if (!/^[6-9]\d{9}$/.test(customerPhone)) {
    throw new Error('customerPhone must be a valid 10-digit Indian mobile');
  }
  if (!membershipPlanKey) throw new Error('membershipPlan is required');
  if (!startDate) throw new Error('startDate is required');
  if (!endDate) throw new Error('endDate is required');

  const plan = await resolveMembershipFromExcel(membershipPlanKey);
  if (!plan) {
    throw new Error(`Membership plan not found: ${membershipPlanKey}`);
  }

  const unitPrice =
    amount > 0 ? amount : Math.max(0, Number(plan.pricing?.amount ?? 0) || 0);
  const planLabel = String(plan.displayName || plan.planId || membershipPlanKey);
  const membershipType = String(plan.planId || plan.displayName || 'general')
    .trim()
    .toLowerCase();
  const junior = isJuniorMembership(membershipType);

  // Ensure customer exists (createSubscription only updates existing customers)
  let customer = await Customer.findOne({
    mobile: customerPhone,
    isDeleted: {$ne: true},
  });
  if (!customer) {
    customer = await Customer.create({
      name: customerName,
      mobile: customerPhone,
      membershipType: 'none',
      createdBy: {
        m_staff_id: req.user?.userId ?? null,
        m_staff_name: req.user?.name ?? req.user?.m_staff_name ?? null,
        m_staff_email: req.user?.email ?? null,
      },
    });
  }

  const students = [];
  if (junior) {
    const studentName = String(excelRow?.studentName ?? '').trim();
    const classStd = String(excelRow?.classStd ?? '').trim();
    const relation = String(excelRow?.relation ?? '').trim();
    const parentName =
      String(excelRow?.parentName ?? '').trim() || customerName;
    const studentId = String(excelRow?.studentId ?? '').trim();
    const schoolName = String(excelRow?.schoolName ?? '').trim();
    const dob = toBulkIsoDate(excelRow?.dob) || null;

    if (!studentName || !classStd || !relation || !parentName) {
      throw new Error(
        'Junior plan requires studentName, classStd, relation, parentName',
      );
    }
    if (!studentId) {
      throw new Error('Junior plan requires studentId');
    }

    students.push({
      studentName,
      schoolName,
      dob,
      classStd,
      relation,
      parentName,
      studentId,
    });
  }

  return {
    customerName: customer.name || customerName,
    customerPhone,
    membershipId: String(plan._id),
    membershipPlanId: String(plan.planId || ''),
    membershipType,
    priority: Number(plan.priority ?? 0) || 0,
    invoiceDate: startDate,
    dueDate: endDate,
    repeatType,
    repeatEvery: repeatType === 'lifetime' ? null : 1,
    repeatUnit:
      repeatType === 'lifetime'
        ? null
        : repeatType === 'yearly'
          ? 'year'
          : 'month',
    salesPersonName,
    notes,
    items: [
      {
        productName: planLabel,
        qty: 1,
        unitPrice,
        discount: 0,
        category: 'membership',
      },
    ],
    students,
    subTotal: unitPrice,
    discountTotal: 0,
    grandTotal: unitPrice,
    status,
    createdBy: {
      m_staff_id: req.user?.userId ?? null,
      m_staff_name: req.user?.name ?? req.user?.m_staff_name ?? null,
      m_staff_email: req.user?.email ?? null,
    },
  };
};

/**
 * POST /subscriptions/bulk
 * Body: { subscriptions: ExcelRow[] }
 */
export const bulkCreateSubscriptions = async (req, res) => {
  try {
    const {subscriptions} = req.body || {};

    if (!subscriptions || !Array.isArray(subscriptions)) {
      return res.status(400).json({
        success: false,
        message: 'No subscriptions array provided.',
      });
    }

    if (!subscriptions.length) {
      return res.status(400).json({
        success: false,
        message: 'subscriptions array is empty.',
      });
    }

    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (let index = 0; index < subscriptions.length; index += 1) {
      const excelRow = subscriptions[index];
      try {
        const body = await mapExcelRowToCreateBody(excelRow, req);

        let createResult = null;
        const fakeRes = {
          status(code) {
            this.statusCode = code;
            return this;
          },
          json(payload) {
            createResult = {
              statusCode: this.statusCode || 200,
              payload,
            };
            return createResult;
          },
        };

        await createSubscription({...req, body}, fakeRes);

        if (createResult?.payload?.success) {
          successCount += 1;
          results.push({
            index,
            success: true,
            customerPhone: body.customerPhone,
            subscriptionCode: createResult.payload?.subscription?.subscriptionCode,
            message: createResult.payload?.message || 'Created',
          });
        } else {
          failedCount += 1;
          results.push({
            index,
            success: false,
            customerPhone: body.customerPhone,
            message:
              createResult?.payload?.message ||
              (Array.isArray(createResult?.payload?.errors)
                ? createResult.payload.errors.join(' ')
                : 'Failed to create subscription'),
          });
        }
      } catch (rowError) {
        failedCount += 1;
        results.push({
          index,
          success: false,
          customerPhone: normalizeBulkPhone(excelRow?.customerPhone),
          message: rowError?.message || 'Failed to process row',
        });
      }
    }

    const httpStatus =
      failedCount === 0 ? 201 : successCount === 0 ? 400 : 200;

    return res.status(httpStatus).json({
      success: failedCount === 0,
      message: `Processed ${subscriptions.length} row(s): ${successCount} created, ${failedCount} failed.`,
      summary: {
        total: subscriptions.length,
        successful: successCount,
        failed: failedCount,
      },
      results,
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to bulk upload subscriptions.',
    });
  }
};

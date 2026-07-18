import AffiliateSettings, {
  normalizeAffiliateRules,
} from '../models/affiliateSettings.model.js';
import Customer from '../models/customer.model.js';
import AffiliateCommission from '../models/affiliateCommission.model.js';
import PayoutRequest from '../models/payoutRequest.model.js';
import CommissionLedger from '../models/commissionLedger.model.js';
import WalletWithdrawal from '../models/walletWithdrawal.model.js';
import mongoose from 'mongoose';

const mergeNested = (target, source) => {
  if (!source || typeof source !== 'object') return target;
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      mergeNested(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
};

const toPlain = (value) => {
  if (!value) return {};
  return typeof value.toObject === 'function' ? value.toObject() : {...value};
};

const applyNested = (settings, field, payload) => {
  if (!payload) return;
  settings[field] = mergeNested(toPlain(settings[field]), payload);
  settings.markModified(field);
};

const withdrawalStatusToPayout = {
  requested: 'Pending',
  under_review: 'In Process',
  approved: 'In Process',
  paid: 'Paid',
  rejected: 'Failed',
};

const payoutStatusToWithdrawal = {
  Pending: 'requested',
  'In Process': 'under_review',
  Paid: 'paid',
  Failed: 'rejected',
};

const mapWithdrawalToPayout = (withdrawal) => ({
  _id: withdrawal._id,
  source: 'withdrawal',
  affiliateId: withdrawal.customer,
  amount: withdrawal.amount,
  status: withdrawalStatusToPayout[withdrawal.status] || 'Pending',
  payoutMethod: withdrawal.method === 'upi' ? 'UPI' : 'Bank Transfer',
  payoutDetails: withdrawal.payoutDetails,
  failureReason: withdrawal.status === 'rejected' ? withdrawal.adminNote || 'Rejected' : null,
  requestedAt: withdrawal.createdAt,
  processedAt: withdrawal.paidAt || withdrawal.reviewedAt || null,
  transactionId: withdrawal.walletDebitRef || null,
});

const mapPayoutRequest = (payout) => ({
  ...payout.toObject(),
  source: 'payout',
});

const ensureSettings = async () => {
  let settings = await AffiliateSettings.findOne({key: 'default'});
  if (!settings) {
    settings = await AffiliateSettings.create({key: 'default'});
  }

  const normalizedRules = normalizeAffiliateRules(settings.rules);
  const before = JSON.stringify(
    (settings.rules || []).map(rule =>
      typeof rule.toObject === 'function' ? rule.toObject() : rule,
    ),
  );
  const after = JSON.stringify(normalizedRules);
  if (before !== after) {
    settings.rules = normalizedRules;
    settings.markModified('rules');
    await settings.save();
  }

  return settings;
};

// --- SETTINGS ---

export const getAffiliateSettings = async (req, res) => {
  try {
    const settings = await ensureSettings();
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({message: error.message});
  }
};

export const updateAffiliateSettings = async (req, res) => {
  try {
    const payload = req.body;
    const settings = await ensureSettings();

    if (payload.isEnabled !== undefined) settings.isEnabled = payload.isEnabled;
    if (payload.rules) {
      settings.rules = normalizeAffiliateRules(payload.rules);
      settings.markModified('rules');
    }
    if (payload.milestones) settings.milestones = payload.milestones;
    applyNested(settings, 'withdrawal', payload.withdrawal);
    applyNested(settings, 'payoutSettings', payload.payoutSettings);
    applyNested(settings, 'programControls', payload.programControls);
    applyNested(settings, 'milestoneSettings', payload.milestoneSettings);
    applyNested(settings, 'notifications', payload.notifications);
    applyNested(settings, 'registrationSettings', payload.registrationSettings);
    if (payload.cookieDurationDays !== undefined) settings.cookieDurationDays = payload.cookieDurationDays;
    if (payload.maxCommissionPerOrder !== undefined) settings.maxCommissionPerOrder = payload.maxCommissionPerOrder;
    if (payload.autoApproveCommissions !== undefined) settings.autoApproveCommissions = payload.autoApproveCommissions;
    if (payload.affiliateDashboardAccess !== undefined) settings.affiliateDashboardAccess = payload.affiliateDashboardAccess;
    if (payload.analyticsTracking !== undefined) settings.analyticsTracking = payload.analyticsTracking;

    settings.updatedBy = {
      m_staff_id: req.user?._id,
      m_staff_name: req.user?.name,
      m_staff_email: req.user?.email,
    };

    await settings.save();
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({message: error.message});
  }
};

// --- OVERVIEW & STATS ---

export const getAffiliateOverview = async (req, res) => {
  try {
    const affiliates = await Customer.find({membershipType: {$ne: 'none'}}).select(
      'name email affiliateBalance totalCustomersReferred createdAt membershipType status',
    );

    const revenueAgg = await CommissionLedger.aggregate([
      {$group: {_id: null, total: {$sum: '$orderAmount'}, commissions: {$sum: '$commissionAmount'}}},
    ]);

    const referralCount = await Customer.countDocuments({referredBy: {$ne: null}});

    const topAffiliates = await Customer.aggregate([
      {$match: {membershipType: {$ne: 'none'}}},
      {
        $lookup: {
          from: 'commissionledgers',
          localField: '_id',
          foreignField: 'affiliateId',
          as: 'commissions',
        },
      },
      {
        $addFields: {
          totalCommissionEarned: {$sum: '$commissions.commissionAmount'},
          totalRevenueGenerated: {$sum: '$commissions.orderAmount'},
        },
      },
      {$sort: {totalCommissionEarned: -1}},
      {$limit: 5},
      {
        $project: {
          name: 1,
          email: 1,
          customerId: 1,
          totalCommissionEarned: 1,
          totalRevenueGenerated: 1,
          affiliateBalance: 1,
        },
      },
    ]);

    res.status(200).json({
      totalAffiliates: affiliates.length,
      totalRevenue: revenueAgg[0]?.total || 0,
      totalCommissions: revenueAgg[0]?.commissions || 0,
      totalReferrals: referralCount,
      topAffiliates,
    });
  } catch (error) {
    res.status(500).json({message: error.message});
  }
};

export const getAffiliateLeaderboard = async (req, res) => {
  try {
    const customers = await Customer.aggregate([
      {$match: {membershipType: {$ne: 'none'}}},
      {
        $lookup: {
          from: 'commissionledgers',
          localField: '_id',
          foreignField: 'affiliateId',
          as: 'commissions',
        },
      },
      {
        $addFields: {
          totalCommissionEarned: {$sum: '$commissions.commissionAmount'},
          totalRevenueGenerated: {$sum: '$commissions.orderAmount'},
        },
      },
      {$sort: {totalCommissionEarned: -1}},
      {$limit: 50},
      {
        $project: {
          name: 1,
          mobile: 1,
          email: 1,
          referralCode: 1,
          affiliateBalance: 1,
          totalCommissionEarned: 1,
          totalRevenueGenerated: 1,
        },
      },
    ]);

    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({message: error.message});
  }
};

export const getAffiliateStats = async (req, res) => {
  try {
    const totalAffiliates = await Customer.countDocuments({membershipType: {$ne: 'none'}});

    const commissions = await AffiliateCommission.aggregate([
      {
        $group: {
          _id: '$status',
          totalAmount: {$sum: '$commissionAmount'},
        },
      },
    ]);

    res.status(200).json({totalAffiliates, commissions});
  } catch (error) {
    res.status(500).json({message: error.message});
  }
};

export const getWalletSummary = async (req, res) => {
  try {
    const balanceAgg = await Customer.aggregate([
      {$match: {membershipType: {$ne: 'none'}}},
      {
        $group: {
          _id: null,
          totalWalletBalance: {
            $sum: {$add: ['$affiliateBalance', '$affiliateReserved']},
          },
          withdrawableBalance: {$sum: '$affiliateBalance'},
        },
      },
    ]);

    const payoutStats = await PayoutRequest.aggregate([
      {
        $group: {
          _id: '$status',
          total: {$sum: '$amount'},
          count: {$sum: 1},
        },
      },
    ]);

    const withdrawalStats = await WalletWithdrawal.aggregate([
      {
        $group: {
          _id: '$status',
          total: {$sum: '$amount'},
          count: {$sum: 1},
        },
      },
    ]);

    const findStat = (items, status) => items.find(s => s._id === status) || {total: 0, count: 0};

    const pendingTotal =
      findStat(payoutStats, 'Pending').total +
      findStat(withdrawalStats, 'requested').total;
    const inProcessTotal =
      findStat(payoutStats, 'In Process').total +
      findStat(withdrawalStats, 'under_review').total +
      findStat(withdrawalStats, 'approved').total;
    const paidTotal =
      findStat(payoutStats, 'Paid').total + findStat(withdrawalStats, 'paid').total;

    res.status(200).json({
      totalWalletBalance: balanceAgg[0]?.totalWalletBalance || 0,
      withdrawableBalance: balanceAgg[0]?.withdrawableBalance || 0,
      pendingPayouts: pendingTotal,
      inProcessPayouts: inProcessTotal,
      totalPayoutsAllTime: paidTotal,
    });
  } catch (error) {
    res.status(500).json({message: error.message});
  }
};

// --- AFFILIATES LIST ---

const buildAffiliatePipeline = (match = {}) => [
  {$match: match},
  {
    $lookup: {
      from: 'commissionledgers',
      localField: '_id',
      foreignField: 'affiliateId',
      as: 'commissions',
    },
  },
  {
    $lookup: {
      from: 'customers',
      localField: '_id',
      foreignField: 'referredBy',
      as: 'referredCustomers',
    },
  },
  {
    $addFields: {
      totalCustomersReferred: {$size: '$referredCustomers'},
      totalRevenueGenerated: {$sum: '$commissions.orderAmount'},
      totalCommissionEarned: {$sum: '$commissions.commissionAmount'},
    },
  },
  {
    $project: {
      name: 1,
      email: 1,
      mobile: 1,
      customerId: 1,
      membershipType: 1,
      status: 1,
      createdAt: 1,
      affiliateBalance: 1,
      walletAmount: 1,
      totalCustomersReferred: 1,
      totalRevenueGenerated: 1,
      totalCommissionEarned: 1,
    },
  },
];

export const getAffiliatesList = async (req, res) => {
  try {
    const {
      status,
      membershipType,
      search,
      dateFrom,
      dateTo,
      sortBy = 'latest',
    } = req.query;

    const match = {membershipType: {$ne: 'none'}};

    if (status && status !== 'all') match.status = status;
    if (membershipType && membershipType !== 'all') match.membershipType = membershipType;

    if (dateFrom || dateTo) {
      match.createdAt = {};
      if (dateFrom) match.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        match.createdAt.$lte = end;
      }
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      match.$or = [{name: regex}, {email: regex}, {customerId: regex}, {mobile: regex}];
    }

    const pipeline = buildAffiliatePipeline(match);

    const sortMap = {
      latest: {createdAt: -1},
      oldest: {createdAt: 1},
      revenue: {totalRevenueGenerated: -1},
      commission: {totalCommissionEarned: -1},
    };
    pipeline.push({$sort: sortMap[sortBy] || sortMap.latest});

    const affiliates = await Customer.aggregate(pipeline);
    res.status(200).json(affiliates);
  } catch (error) {
    res.status(500).json({message: error.message});
  }
};

export const getAffiliateById = async (req, res) => {
  try {
    const {id} = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({message: 'Invalid affiliate id'});
    }

    const pipeline = buildAffiliatePipeline({
      _id: new mongoose.Types.ObjectId(id),
    });
    const results = await Customer.aggregate(pipeline);

    if (!results.length) {
      return res.status(404).json({message: 'Affiliate not found'});
    }

    const affiliate = results[0];

    const breakdown = await CommissionLedger.aggregate([
      {$match: {affiliateId: affiliate._id}},
      {
        $group: {
          _id: '$orderType',
          count: {$sum: 1},
          revenue: {$sum: '$orderAmount'},
          commission: {$sum: '$commissionAmount'},
        },
      },
    ]);

    const referredCount = await Customer.countDocuments({referredBy: affiliate._id});

    res.status(200).json({
      ...affiliate,
      activeCustomers: referredCount,
      revenueBreakdown: breakdown,
    });
  } catch (error) {
    res.status(500).json({message: error.message});
  }
};

// --- PAYOUTS ---

export const getPayoutsList = async (req, res) => {
  try {
    const {status, payoutMethod, search, dateFrom, dateTo} = req.query;

    const payoutFilter = {};
    const withdrawalFilter = {};

    if (dateFrom || dateTo) {
      const dateRange = {};
      if (dateFrom) dateRange.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        dateRange.$lte = end;
      }
      payoutFilter.requestedAt = dateRange;
      withdrawalFilter.createdAt = dateRange;
    }

    const [payoutRequests, walletWithdrawals] = await Promise.all([
      PayoutRequest.find(payoutFilter)
        .populate('affiliateId', 'name email customerId')
        .sort({createdAt: -1}),
      WalletWithdrawal.find(withdrawalFilter)
        .populate('customer', 'name email customerId')
        .sort({createdAt: -1}),
    ]);

    let payouts = [
      ...payoutRequests.map(mapPayoutRequest),
      ...walletWithdrawals.map(mapWithdrawalToPayout),
    ].sort((a, b) => new Date(b.requestedAt || b.createdAt) - new Date(a.requestedAt || a.createdAt));

    if (status && status !== 'all') {
      payouts = payouts.filter((p) => p.status === status);
    }

    if (payoutMethod && payoutMethod !== 'all') {
      payouts = payouts.filter((p) => p.payoutMethod === payoutMethod);
    }

    if (search) {
      const q = search.toLowerCase();
      payouts = payouts.filter(
        (p) =>
          p.affiliateId?.name?.toLowerCase().includes(q) ||
          p.affiliateId?.customerId?.toLowerCase().includes(q) ||
          p.transactionId?.toLowerCase().includes(q),
      );
    }

    const stats = {pending: {total: 0, count: 0}, inProcess: {total: 0, count: 0}, paid: {total: 0, count: 0}, failed: {total: 0, count: 0}};
    const methodTotals = {};

    payouts.forEach((p) => {
      const key =
        p.status === 'Pending'
          ? 'pending'
          : p.status === 'In Process'
            ? 'inProcess'
            : p.status === 'Paid'
              ? 'paid'
              : p.status === 'Failed'
                ? 'failed'
                : null;
      if (key) {
        stats[key].total += p.amount || 0;
        stats[key].count += 1;
      }
      if (p.status === 'Paid') {
        const method = p.payoutMethod || 'Other';
        methodTotals[method] = (methodTotals[method] || 0) + (p.amount || 0);
      }
    });

    const methodStats = Object.entries(methodTotals).map(([_id, total]) => ({_id, total}));
    const failedRecent = payouts
      .filter((p) => p.status === 'Failed')
      .slice(0, 5);

    res.status(200).json({
      payouts,
      stats,
      methodStats,
      failedRecent,
    });
  } catch (error) {
    res.status(500).json({message: error.message});
  }
};

export const createManualPayout = async (req, res) => {
  try {
    const {affiliateId, amount, payoutMethod, payoutDetails, markPending} = req.body;

    if (!affiliateId || !amount || amount <= 0) {
      return res.status(400).json({message: 'Valid affiliateId and amount are required'});
    }

    const customer = await Customer.findById(affiliateId);
    if (!customer) {
      return res.status(404).json({message: 'Affiliate not found'});
    }

    if ((customer.affiliateBalance || 0) < amount) {
      return res.status(400).json({message: 'Insufficient affiliate balance for this payout'});
    }

    if (!markPending) {
      customer.affiliateBalance -= amount;
      await customer.save();
    } else {
      customer.affiliateReserved = (customer.affiliateReserved || 0) + amount;
      customer.affiliateBalance -= amount;
      await customer.save();
    }

    const payout = new PayoutRequest({
      affiliateId,
      amount,
      payoutMethod: payoutMethod || 'Manual',
      payoutDetails: payoutDetails || {},
      status: markPending ? 'Pending' : 'Paid',
      processedAt: markPending ? null : new Date(),
      processedBy: markPending
        ? undefined
        : {
            m_staff_id: req.user?._id,
            m_staff_name: req.user?.name,
          },
    });

    await payout.save();
    await payout.populate('affiliateId', 'name email customerId');

    res.status(201).json({
      message: markPending ? 'Payout request created' : 'Manual payout created and balance deducted',
      payout: mapPayoutRequest(payout),
    });
  } catch (error) {
    res.status(500).json({message: error.message});
  }
};

export const updatePayoutStatus = async (req, res) => {
  try {
    const {id} = req.params;
    const {status, failureReason, transactionId, source = 'payout'} = req.body;

    if (source === 'withdrawal') {
      const withdrawal = await WalletWithdrawal.findById(id).populate('customer', 'name email customerId');
      if (!withdrawal) {
        return res.status(404).json({message: 'Withdrawal request not found'});
      }

      const previousStatus = withdrawal.status;
      const nextWithdrawalStatus = payoutStatusToWithdrawal[status];
      if (!nextWithdrawalStatus) {
        return res.status(400).json({message: 'Invalid status'});
      }

      withdrawal.status = nextWithdrawalStatus;
      withdrawal.reviewedBy = {
        m_staff_id: req.user?._id,
        m_staff_name: req.user?.name,
        m_staff_email: req.user?.email,
      };
      withdrawal.reviewedAt = new Date();

      const customer = await Customer.findById(withdrawal.customer);

      if (status === 'Failed' && previousStatus !== 'rejected' && customer) {
        withdrawal.adminNote = failureReason || 'Rejected by admin';
        withdrawal.rejectedAt = new Date();
        if (withdrawal.reserved) {
          customer.affiliateBalance += withdrawal.amount;
          customer.affiliateReserved = Math.max(0, (customer.affiliateReserved || 0) - withdrawal.amount);
          await customer.save();
        }
      } else if (status === 'Paid' && previousStatus !== 'paid') {
        withdrawal.paidAt = new Date();
        withdrawal.walletDebitRef = transactionId || withdrawal.walletDebitRef;
        if (customer && withdrawal.reserved) {
          customer.affiliateReserved = Math.max(0, (customer.affiliateReserved || 0) - withdrawal.amount);
          await customer.save();
        }
      }

      await withdrawal.save();
      return res.status(200).json({
        message: 'Withdrawal status updated',
        payout: mapWithdrawalToPayout(withdrawal),
      });
    }

    const payout = await PayoutRequest.findById(id);
    if (!payout) {
      return res.status(404).json({message: 'Payout request not found'});
    }

    const previousStatus = payout.status;
    payout.status = status;

    if (status === 'Failed' && previousStatus !== 'Failed') {
      payout.failureReason = failureReason || 'Payment failed';
      const customer = await Customer.findById(payout.affiliateId);
      if (customer) {
        customer.affiliateBalance += payout.amount;
        customer.affiliateReserved = Math.max(0, (customer.affiliateReserved || 0) - payout.amount);
        await customer.save();
      }
    } else if (status === 'Paid' && previousStatus !== 'Paid') {
      payout.transactionId = transactionId;
      payout.processedAt = new Date();
      payout.processedBy = {
        m_staff_id: req.user?._id,
        m_staff_name: req.user?.name,
      };

      if (previousStatus === 'Pending' || previousStatus === 'In Process') {
        const customer = await Customer.findById(payout.affiliateId);
        if (customer) {
          customer.affiliateReserved = Math.max(0, (customer.affiliateReserved || 0) - payout.amount);
          await customer.save();
        }
      }
    } else if (status === 'In Process' && previousStatus === 'Pending') {
      const customer = await Customer.findById(payout.affiliateId);
      if (customer && (customer.affiliateReserved || 0) < payout.amount) {
        customer.affiliateReserved = (customer.affiliateReserved || 0) + payout.amount;
        await customer.save();
      }
    }

    await payout.save();
    await payout.populate('affiliateId', 'name email customerId');

    res.status(200).json({message: 'Payout status updated', payout: mapPayoutRequest(payout)});
  } catch (error) {
    res.status(500).json({message: error.message});
  }
};

import Customer from '../../../models/customer.model.js';
import AffiliateSettings, {
  normalizeAffiliateRules,
} from '../../../models/affiliateSettings.model.js';
import AffiliateCommission from '../../../models/affiliateCommission.model.js';
import CommissionLedger from '../../../models/commissionLedger.model.js';

const generateReferralCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `W${code}`;
};

const ensureReferralCode = async customer => {
  if (customer.referralCode) return customer;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    customer.referralCode = generateReferralCode();
    try {
      await customer.save();
      return customer;
    } catch (error) {
      if (error?.code !== 11000) throw error;
      customer.referralCode = undefined;
    }
  }

  throw new Error('Could not generate a unique referral code');
};

const ensureAffiliateSettings = async () => {
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

const calculateSignupBonusAmount = rule =>
  Math.max(0, Math.round(Number(rule?.commissionValue || 0) * 100) / 100);

const ensureInviteBalanceCredited = async (commission, inviterId) => {
  if (!commission) return commission;

  // Only repair commissions created with the new explicit flag.
  // Legacy records without the flag are assumed already balanced.
  if (commission.meta?.balanceCredited !== false) {
    return commission;
  }

  await Customer.updateOne(
    {_id: inviterId},
    {$inc: {affiliateBalance: Number(commission.commissionAmount || 0)}},
  );

  commission.meta = {
    ...(typeof commission.meta?.toObject === 'function'
      ? commission.meta.toObject()
      : commission.meta || {}),
    balanceCredited: true,
  };
  if (typeof commission.save === 'function') {
    commission.markModified?.('meta');
    await commission.save();
  } else {
    await AffiliateCommission.updateOne(
      {_id: commission._id},
      {$set: {'meta.balanceCredited': true}},
    );
  }

  return commission;
};

export const creditInviteReward = async ({
  referredCustomerId,
  orderAmount,
  paidAmount = orderAmount,
  sourceId,
  eventTrigger,
}) => {
  const referredCustomer = await Customer.findById(referredCustomerId);
  if (!referredCustomer?.referredBy) {
    return null;
  }

  const settings = await ensureAffiliateSettings();
  const inviteRule = settings.rules?.find(rule => rule.category === 'invite');
  if (settings.isEnabled === false || !inviteRule || inviteRule.enabled === false) {
    return null;
  }

  // Signup bonus only. Legacy purchase-based triggers are ignored.
  const configuredTrigger = 'registration';
  if (eventTrigger !== configuredTrigger) return null;

  // Always use the configured fixed amount (percentage of ₹0 would never pay).
  const commissionAmount = calculateSignupBonusAmount(inviteRule);
  if (commissionAmount <= 0) return null;

  const idempotencyKey = `invite:${configuredTrigger}:${referredCustomer._id}`;
  const existing = await AffiliateCommission.findOne({idempotencyKey});
  if (existing) {
    if (!referredCustomer.inviteRewardCredited) {
      referredCustomer.inviteRewardCredited = true;
      await referredCustomer.save();
    }
    return ensureInviteBalanceCredited(existing, referredCustomer.referredBy);
  }

  if (referredCustomer.inviteRewardCredited) {
    return null;
  }

  const claimed = await Customer.findOneAndUpdate(
    {_id: referredCustomer._id, inviteRewardCredited: {$ne: true}},
    {$set: {inviteRewardCredited: true}},
    {new: true},
  );
  if (!claimed) return null;

  try {
    const commission = await AffiliateCommission.create({
      inviter: referredCustomer.referredBy,
      referredCustomer: referredCustomer._id,
      category: 'invite',
      sourceType: eventTrigger,
      sourceId: String(sourceId || referredCustomer._id),
      orderAmount: Number(orderAmount || 0),
      commissionType: 'fixed',
      commissionValue: Number(inviteRule.commissionValue || 0),
      commissionAmount,
      status: 'credited',
      idempotencyKey,
      description: `Signup bonus for ${referredCustomer.name || 'referred customer'}`,
      approvedAt: new Date(),
      creditedAt: new Date(),
      meta: {balanceCredited: false},
    });

    return ensureInviteBalanceCredited(commission, referredCustomer.referredBy);
  } catch (error) {
    if (error?.code === 11000) {
      await Customer.updateOne(
        {_id: referredCustomer._id},
        {$set: {inviteRewardCredited: true}},
      );
      const existingCommission = await AffiliateCommission.findOne({
        idempotencyKey,
      });
      return ensureInviteBalanceCredited(
        existingCommission,
        referredCustomer.referredBy,
      );
    }
    await Customer.updateOne(
      {_id: referredCustomer._id},
      {$set: {inviteRewardCredited: false}},
    );
    throw error;
  }
};

export const getReferralDashboard = async (customerId, appBaseUrl) => {
  const customer = await Customer.findById(customerId);
  if (!customer || customer.isDeleted) {
    const error = new Error('Customer not found');
    error.status = 404;
    throw error;
  }

  await ensureReferralCode(customer);

  const settings = await ensureAffiliateSettings();
  const inviteRule =
    settings.rules?.find(r => r.category === 'invite') || {
      enabled: true,
      commissionType: 'fixed',
      commissionValue: 100,
    };

  const [totalReferrals, activeReferrals] = await Promise.all([
    Customer.countDocuments({
      referredBy: customer._id,
      isDeleted: {$ne: true},
    }),
    Customer.countDocuments({
      referredBy: customer._id,
      isDeleted: {$ne: true},
      status: 'active',
      membershipType: {$ne: 'none'},
    }),
  ]);

  const recentReferrals = await Customer.find({
    referredBy: customer._id,
    isDeleted: {$ne: true},
  })
    .select('name createdAt membershipType status')
    .sort({createdAt: -1})
    .limit(10);

  const [commissionSummary, legacySummary, referralEarnings] = await Promise.all([
    AffiliateCommission.aggregate([
      {$match: {inviter: customer._id}},
      {
        $group: {
          _id: '$status',
          amount: {$sum: '$commissionAmount'},
          count: {$sum: 1},
        },
      },
    ]),
    CommissionLedger.aggregate([
      {$match: {affiliateId: customer._id}},
      {
        $group: {
          _id: '$status',
          amount: {$sum: '$commissionAmount'},
          count: {$sum: 1},
        },
      },
    ]),
    AffiliateCommission.aggregate([
      {$match: {inviter: customer._id}},
      {
        $group: {
          _id: '$referredCustomer',
          totalEarned: {
            $sum: {
              $cond: [
                {$in: ['$status', ['approved', 'credited']]},
                '$commissionAmount',
                0,
              ],
            },
          },
          pendingEarnings: {
            $sum: {
              $cond: [{$eq: ['$status', 'pending']}, '$commissionAmount', 0],
            },
          },
        },
      },
    ]),
  ]);

  const primaryCount = commissionSummary.reduce(
    (sum, row) => sum + Number(row.count || 0),
    0,
  );
  const summary = primaryCount > 0 ? commissionSummary : legacySummary;
  const earnedStatuses =
    primaryCount > 0 ? ['approved', 'credited'] : ['Approved', 'Paid'];
  const pendingStatuses = primaryCount > 0 ? ['pending'] : ['Hold'];
  const earned = summary
    .filter(row => earnedStatuses.includes(row._id))
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const pending = summary
    .filter(row => pendingStatuses.includes(row._id))
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const transactions = summary.reduce(
    (sum, row) => sum + Number(row.count || 0),
    0,
  );
  const earningsByReferral = new Map(
    referralEarnings.map(row => [String(row._id), row]),
  );

  const recentReferralsWithEarnings = recentReferrals.map(referral => {
    const referralSummary = earningsByReferral.get(String(referral._id));
    return {
      id: referral._id,
      name: referral.name,
      membershipType: referral.membershipType,
      status: referral.status,
      joinedAt: referral.createdAt,
      totalEarned: referralSummary?.totalEarned || 0,
      pendingEarnings: referralSummary?.pendingEarnings || 0,
    };
  });

  const base = String(appBaseUrl || process.env.CUSTOMER_APP_URL || 'https://woowooarthouse.in').replace(
    /\/$/,
    '',
  );
  const referralCode = customer.referralCode;
  const shareUrl = `${base}/login?ref=${encodeURIComponent(referralCode)}`;
  const shareMessage = `Join me on WOOWOO Art House! Use my invite code ${referralCode} and start your creative journey. ${shareUrl}`;

  return {
    programEnabled: settings.isEnabled !== false,
    referralCode,
    shareUrl,
    shareMessage,
    inviteReward: {
      enabled: inviteRule.enabled !== false,
      type: inviteRule.commissionType || 'fixed',
      value: inviteRule.commissionValue || 0,
    },
    wallet: {
      affiliateBalance: customer.affiliateBalance || 0,
      affiliateReserved: customer.affiliateReserved || 0,
      cashbackBalance: customer.cashbackBalance || 0,
    },
    stats: {
      totalReferrals,
      activeReferrals,
      totalEarned: earned,
      pendingEarnings: pending,
      totalTransactions: transactions,
      totalOrders: transactions,
    },
    recentReferrals: recentReferralsWithEarnings,
  };
};

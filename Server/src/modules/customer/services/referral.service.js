import Customer from '../../../models/customer.model.js';
import AffiliateSettings from '../../../models/affiliateSettings.model.js';
import AffiliateCommission from '../../../models/affiliateCommission.model.js';
import CommissionLedger from '../../../models/commissionLedger.model.js';

const ensureReferralCode = async customer => {
  if (customer.referralCode) return customer;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  customer.referralCode = `W${code}`;
  await customer.save();
  return customer;
};

const calculateCommission = (rule, orderAmount) => {
  const amount = Number(orderAmount || 0);
  if (amount < Number(rule.minOrderAmount || 0)) return 0;

  const raw =
    rule.commissionType === 'percentage'
      ? (amount * Number(rule.commissionValue || 0)) / 100
      : Number(rule.commissionValue || 0);
  const max = Number(rule.maxCommissionAmount);
  const capped = Number.isFinite(max) && max > 0 ? Math.min(raw, max) : raw;
  return Math.max(0, Math.round(capped * 100) / 100);
};

export const creditInviteReward = async ({
  referredCustomerId,
  orderAmount,
  paidAmount = orderAmount,
  sourceId,
  eventTrigger,
}) => {
  const referredCustomer = await Customer.findById(referredCustomerId);
  if (
    !referredCustomer?.referredBy ||
    referredCustomer.inviteRewardCredited
  ) {
    return null;
  }

  const settings = await AffiliateSettings.findOne({key: 'default'});
  const inviteRule = settings?.rules?.find(rule => rule.category === 'invite');
  if (
    settings?.isEnabled === false ||
    !inviteRule ||
    inviteRule.enabled === false
  ) {
    return null;
  }

  const configuredTrigger =
    inviteRule.inviteTrigger || 'first_paid_transaction';
  const triggerMatches =
    configuredTrigger === eventTrigger ||
    (configuredTrigger === 'first_paid_transaction' &&
      eventTrigger === 'membership_activate' &&
      Number(paidAmount || 0) > 0);
  if (!triggerMatches) return null;

  const commissionAmount = calculateCommission(inviteRule, orderAmount);
  if (commissionAmount <= 0) return null;

  const idempotencyKey = `invite:${configuredTrigger}:${referredCustomer._id}`;
  const existing = await AffiliateCommission.findOne({idempotencyKey});
  if (existing) {
    if (!referredCustomer.inviteRewardCredited) {
      referredCustomer.inviteRewardCredited = true;
      await referredCustomer.save();
    }
    return existing;
  }

  const claimed = await Customer.findOneAndUpdate(
    {_id: referredCustomer._id, inviteRewardCredited: false},
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
      commissionType: inviteRule.commissionType,
      commissionValue: Number(inviteRule.commissionValue || 0),
      commissionAmount,
      status: 'credited',
      idempotencyKey,
      description: `Invite reward for ${referredCustomer.name || 'referred customer'}`,
      approvedAt: new Date(),
      creditedAt: new Date(),
    });

    await Customer.updateOne(
      {_id: referredCustomer.referredBy},
      {$inc: {affiliateBalance: commissionAmount}},
    );
    return commission;
  } catch (error) {
    if (error?.code === 11000) {
      await Customer.updateOne(
        {_id: referredCustomer._id},
        {$set: {inviteRewardCredited: true}},
      );
      return AffiliateCommission.findOne({idempotencyKey});
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

  let settings = await AffiliateSettings.findOne({key: 'default'});
  if (!settings) {
    settings = await AffiliateSettings.create({key: 'default'});
  }

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

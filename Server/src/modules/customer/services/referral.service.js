import Customer from '../../../models/customer.model.js';
import AffiliateSettings from '../../../models/affiliateSettings.model.js';
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

  const totalReferrals = await Customer.countDocuments({
    referredBy: customer._id,
    isDeleted: {$ne: true},
  });

  const recentReferrals = await Customer.find({
    referredBy: customer._id,
    isDeleted: {$ne: true},
  })
    .select('name createdAt membershipType status')
    .sort({createdAt: -1})
    .limit(10);

  const earningsAgg = await CommissionLedger.aggregate([
    {$match: {affiliateId: customer._id}},
    {
      $group: {
        _id: null,
        totalEarned: {$sum: '$commissionAmount'},
        totalOrders: {$sum: 1},
      },
    },
  ]);

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
      totalEarned: earningsAgg[0]?.totalEarned || 0,
      totalOrders: earningsAgg[0]?.totalOrders || 0,
    },
    recentReferrals: recentReferrals.map(r => ({
      name: r.name,
      membershipType: r.membershipType,
      status: r.status,
      joinedAt: r.createdAt,
    })),
  };
};

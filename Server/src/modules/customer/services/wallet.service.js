import Customer from '../../../models/customer.model.js';
import Wallet from '../../../models/wallet.model.js';
import WalletWithdrawal from '../../../models/walletWithdrawal.model.js';
import AffiliateCommission from '../../../models/affiliateCommission.model.js';
import CommissionLedger from '../../../models/commissionLedger.model.js';
import {getReferralDashboard} from './referral.service.js';

const startOfMonth = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const categoryLabels = {
  invite: 'Signup',
  membership: 'Membership',
  product: 'Shopping',
  space: 'Booking',
  service: 'Services',
  food: 'Food',
  affiliate: 'Withdrawable',
  csp: 'CSP Sale',
  other: 'Other',
};

const statusIsEarned = status =>
  ['approved', 'credited', 'Approved', 'Paid'].includes(status);

const normalizeCategory = record => {
  if (record.category) return record.category;
  const legacy = String(record.orderType || 'other').toLowerCase();
  if (legacy === 'store') return 'product';
  if (legacy === 'services') return 'service';
  if (legacy === 'milestone') return 'other';
  return legacy;
};

export const getWalletDashboard = async (customerId, appBaseUrl) => {
  const customer = await Customer.findById(customerId).lean();
  if (!customer || customer.isDeleted) {
    const error = new Error('Customer not found');
    error.status = 404;
    throw error;
  }

  const monthStart = startOfMonth();
  const [
    wallet,
    commissions,
    legacyCommissions,
    withdrawals,
    referral,
    referralsThisMonth,
  ] = await Promise.all([
    Wallet.findOne({customerId}).lean(),
    AffiliateCommission.find({inviter: customerId})
      .sort({createdAt: -1})
      .lean(),
    CommissionLedger.find({affiliateId: customerId})
      .sort({createdAt: -1})
      .lean(),
    WalletWithdrawal.find({customer: customerId})
      .sort({createdAt: -1})
      .lean(),
    getReferralDashboard(customerId, appBaseUrl),
    Customer.countDocuments({
      referredBy: customerId,
      isDeleted: {$ne: true},
      createdAt: {$gte: monthStart},
    }),
  ]);

  const usePrimaryCommissions = commissions.length > 0;
  const earningRecords = usePrimaryCommissions ? commissions : legacyCommissions;
  const generalBalance = Number(customer.walletAmount ?? wallet?.walletAmount ?? 0);
  const affiliateBalance = Number(customer.affiliateBalance || 0);
  const affiliateReserved = Number(customer.affiliateReserved || 0);
  const cashbackBalance = Number(customer.cashbackBalance || 0);

  const earnedRecords = earningRecords.filter(record =>
    statusIsEarned(record.status),
  );
  const earnedThisMonth = earnedRecords
    .filter(record => new Date(record.createdAt) >= monthStart)
    .reduce(
      (sum, record) =>
        sum + Number(record.commissionAmount || 0),
      0,
    );
  const revenueThisMonth = earningRecords
    .filter(record => new Date(record.createdAt) >= monthStart)
    .reduce((sum, record) => sum + Number(record.orderAmount || 0), 0);
  const transactionsThisMonth = earningRecords.filter(
    record => new Date(record.createdAt) >= monthStart,
  ).length;

  const categories = Object.entries(categoryLabels).map(([category, label]) => {
    const categoryRecords = earningRecords.filter(record => {
      return normalizeCategory(record) === category;
    });
    return {
      category,
      label,
      amount: categoryRecords
        .filter(record => statusIsEarned(record.status))
        .reduce((sum, record) => sum + Number(record.commissionAmount || 0), 0),
      transactionCount: categoryRecords.length,
    };
  });

  const walletTransactions = (wallet?.transactions || []).map(transaction => {
    const refType = String(transaction.referenceType || '').trim();
    const isCsp = refType === 'CspSale';
    const walletType = String(transaction.walletType || 'general').toLowerCase();
    return {
      id: String(transaction._id),
      kind: 'wallet',
      title:
        transaction.note ||
        (isCsp
          ? 'CSP sale share'
          : transaction.type === 'credit'
            ? 'Wallet credit'
            : 'Wallet debit'),
      type: transaction.type,
      amount: Number(transaction.amount || 0),
      status: 'completed',
      category: isCsp
        ? 'csp'
        : walletType === 'affiliate'
          ? 'affiliate'
          : walletType || 'general',
      withdrawable: isCsp || walletType === 'affiliate',
      createdAt: transaction.createdAt,
    };
  });

  const commissionTransactions = earningRecords.map(record => ({
    id: String(record._id),
    kind: 'commission',
    title:
      record.description ||
      `${categoryLabels[record.category] || record.orderType || 'Affiliate'} earning`,
    type:
      ['cancelled', 'reversed', 'Cancelled'].includes(record.status)
        ? 'debit'
        : 'credit',
    amount: Number(record.commissionAmount || 0),
    status: record.status,
    category:
      normalizeCategory(record),
    createdAt: record.createdAt,
  }));

  const withdrawalTransactions = withdrawals.map(withdrawal => ({
    id: String(withdrawal._id),
    kind: 'withdrawal',
    title:
      withdrawal.method === 'bank'
        ? 'Withdrawal to bank'
        : 'Withdrawal to UPI',
    type: 'debit',
    amount: Number(withdrawal.amount || 0),
    status: withdrawal.status,
    category: 'withdrawal',
    createdAt: withdrawal.createdAt,
  }));

  const transactions = [
    ...walletTransactions,
    ...commissionTransactions,
    ...withdrawalTransactions,
  ]
    .filter(transaction => transaction.createdAt)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  const conversionRate =
    referral.stats.totalReferrals > 0
      ? Math.round(
          (referral.stats.activeReferrals / referral.stats.totalReferrals) *
            1000,
        ) / 10
      : 0;

  return {
    balances: {
      totalAvailable: generalBalance + affiliateBalance + cashbackBalance,
      generalBalance,
      affiliateBalance,
      affiliateReserved,
      cashbackBalance,
      withdrawable: affiliateBalance,
    },
    summary: {
      cashbackBalance,
      totalAffiliateEarned: referral.stats.totalEarned,
      rewardTransactions: earningRecords.length,
      totalTransactions: transactions.length,
    },
    affiliateThisMonth: {
      earnings: earnedThisMonth,
      referrals: referralsThisMonth,
      revenue: revenueThisMonth,
      conversionRate,
      transactionCount: transactionsThisMonth,
    },
    categories,
    transactions,
    referral: {
      referralCode: referral.referralCode,
      shareUrl: referral.shareUrl,
      shareMessage: referral.shareMessage,
    },
    updatedAt: new Date().toISOString(),
  };
};

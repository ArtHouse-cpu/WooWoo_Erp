import {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpRight,
  Calendar,
  ChevronRight,
  Coffee,
  Copy,
  FileText,
  Gift,
  HelpCircle,
  Percent,
  PieChart,
  Plus,
  ShoppingBag,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';
import Swal from 'sweetalert2';
import {DashboardSidebar} from '../../components/dashboard/DashboardSidebar';
import {TopNavbar} from '../../components/dashboard/TopNavbar';
import {authApi} from '../../services/auth.service';
import {getErrorMessage} from '../../services/axios';
import type {WalletDashboard} from '../../types/auth';

const formatInr = (value = 0) =>
  `₹${Number(value || 0).toLocaleString('en-IN')}`;

const formatTxDate = (value: string) => {
  const date = new Date(value);
  const now = new Date();
  const time = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round(
    (startOfDay(now) - startOfDay(date)) / (24 * 60 * 60 * 1000),
  );

  if (dayDiff === 0) return `Today, ${time}`;
  if (dayDiff === 1) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString('en-IN', {day: '2-digit', month: 'short'})}, ${time}`;
};

const txVisuals: Record<string, {icon: typeof ArrowDown; color: string; bg: string}> = {
  invite: {icon: ArrowDown, color: 'text-[#22C55E]', bg: 'bg-[#DCFCE7]'},
  membership: {icon: Gift, color: 'text-[#16A34A]', bg: 'bg-[#DCFCE7]'},
  product: {icon: ShoppingBag, color: 'text-[#F97316]', bg: 'bg-[#FFEDD5]'},
  space: {icon: Calendar, color: 'text-[#2563EB]', bg: 'bg-[#DBEAFE]'},
  service: {icon: Wrench, color: 'text-[#2563EB]', bg: 'bg-[#DBEAFE]'},
  food: {icon: Coffee, color: 'text-[#CA8A04]', bg: 'bg-[#FEF9C3]'},
  withdrawal: {icon: ArrowUpRight, color: 'text-[#7C3AED]', bg: 'bg-[#F3E8FF]'},
  general: {icon: Wallet, color: 'text-[#6366F1]', bg: 'bg-[#EEF2FF]'},
  cashback: {icon: Gift, color: 'text-[#6366F1]', bg: 'bg-[#EEF2FF]'},
  affiliate: {icon: TrendingUp, color: 'text-[#22C55E]', bg: 'bg-[#DCFCE7]'},
  csp: {icon: TrendingUp, color: 'text-[#16A34A]', bg: 'bg-[#DCFCE7]'},
  other: {icon: PieChart, color: 'text-[#4B5563]', bg: 'bg-[#F3F4F6]'},
};

const earnCategoryVisuals: Record<string, {icon: typeof UserPlus; color: string; bg: string}> = {
  invite: {icon: UserPlus, color: 'text-[#7C3AED]', bg: 'bg-[#F3E8FF]'},
  membership: {icon: Gift, color: 'text-[#22C55E]', bg: 'bg-[#DCFCE7]'},
  product: {icon: ShoppingBag, color: 'text-[#EC4899]', bg: 'bg-[#FCE7F3]'},
  space: {icon: Calendar, color: 'text-[#F97316]', bg: 'bg-[#FFEDD5]'},
  service: {icon: Wrench, color: 'text-[#2563EB]', bg: 'bg-[#DBEAFE]'},
  food: {icon: Coffee, color: 'text-[#CA8A04]', bg: 'bg-[#FEF9C3]'},
};

const earnCategoryLabels: Record<string, string> = {
  invite: 'Signup',
  membership: 'Membership',
  product: 'Shopping',
  space: 'Booking',
  service: 'Services',
  food: 'Food',
};

export default function WalletPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WalletDashboard | null>(null);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  const loadWallet = async () => {
    setLoading(true);
    try {
      const response = await authApi.getWalletDashboard();
      setData(response.data.data || null);
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Could not load wallet',
        text: getErrorMessage(error, 'Please try again'),
        confirmButtonColor: '#111111',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWallet();
  }, []);

  const visibleTransactions = useMemo(
    () =>
      showAllTransactions
        ? data?.transactions || []
        : (data?.transactions || []).slice(0, 4),
    [data?.transactions, showAllTransactions],
  );

  const copyValue = async (title: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      await Swal.fire({
        icon: 'success',
        title: `${title} copied!`,
        timer: 1400,
        showConfirmButton: false,
      });
    } catch {
      await Swal.fire({
        icon: 'error',
        title: 'Copy failed',
        text: value,
        confirmButtonColor: '#111111',
      });
    }
  };

  const onInvite = async () => {
    if (!data) return;
    const result = await Swal.fire({
      title: 'Share invite?',
      text: 'Share your WOOWOO referral invite with friends.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Share',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#EA580C',
      cancelButtonColor: '#9CA3AF',
    });
    if (!result.isConfirmed) return;

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Join WOOWOO Art House',
          text: data.referral.shareMessage,
          url: data.referral.shareUrl,
        });
        return;
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
      }
    }
    await copyValue('Invite link', data.referral.shareUrl);
  };

  const onWithdraw = async () => {
    if (!data) return;
    await Swal.fire({
      icon: 'info',
      title: 'Withdraw',
      text:
        data.balances.withdrawable > 0
          ? `You have ${formatInr(data.balances.withdrawable)} available to withdraw (includes CSP sale share and affiliate earnings). Withdrawal requests will be available here soon.`
          : 'No withdrawable balance yet. Earn CSP sale share or affiliate rewards to build your balance.',
      confirmButtonColor: '#111111',
    });
  };

  const onAddMoney = async () => {
    await Swal.fire({
      icon: 'info',
      title: 'Add Money',
      text: 'Adding money to your wallet will be available soon.',
      confirmButtonColor: '#111111',
    });
  };

  // Screenshot design: Cashbacks / Earnings / Rewards / Statistics
  const stats = data
    ? [
        {
          id: 'cashbacks',
          label: 'Cashbacks',
          icon: Wallet,
          value: formatInr(data.summary.cashbackBalance),
          color: 'text-[#6366F1]',
        },
        {
          id: 'earnings',
          label: 'Earnings',
          icon: TrendingUp,
          value: formatInr(data.summary.totalAffiliateEarned),
          color: 'text-[#22C55E]',
        },
        {
          id: 'rewards',
          label: 'Rewards',
          icon: Gift,
          value: String(data.summary.rewardTransactions),
          color: 'text-[#EA580C]',
        },
        {
          id: 'statistics',
          label: 'Statistics',
          icon: PieChart,
          value: String(data.summary.totalTransactions),
          color: 'text-[#2563EB]',
        },
      ]
    : [];

  const affiliateStats = data
    ? [
        {
          id: 'earnings',
          label: 'Earnings',
          icon: Wallet,
          value: formatInr(data.affiliateThisMonth.earnings),
          color: 'text-[#7C3AED]',
          bg: 'bg-[#F3E8FF]',
        },
        {
          id: 'referrals',
          label: 'Referrals',
          icon: Users,
          value: String(data.affiliateThisMonth.referrals),
          color: 'text-[#22C55E]',
          bg: 'bg-[#DCFCE7]',
        },
        {
          id: 'revenue',
          label: 'Revenue',
          icon: FileText,
          value: formatInr(data.affiliateThisMonth.revenue),
          color: 'text-[#F97316]',
          bg: 'bg-[#FFEDD5]',
        },
        {
          id: 'conversion',
          label: 'Conversion',
          icon: Percent,
          value: `${data.affiliateThisMonth.conversionRate}%`,
          color: 'text-[#2563EB]',
          bg: 'bg-[#DBEAFE]',
        },
      ]
    : [];

  const earnCategories = (data?.categories || [])
    .filter(category => category.category in earnCategoryVisuals)
    .map(category => ({
      ...category,
      label: earnCategoryLabels[category.category] || category.label,
      ...earnCategoryVisuals[category.category],
    }));

  const shareLinkDisplay = data
    ? data.referral.shareUrl.replace(/^https?:\/\//, '')
    : '';

  const inviteEarnCard = (isFloating = false) => {
    if (!data) return null;
    return (
      <div
        className={`relative overflow-hidden rounded-[20px] sm:rounded-[24px] border border-[#FFE4D6] bg-gradient-to-r from-[#FFF5F1] via-[#FFF9F6] to-[#FFFBF9] p-4 sm:p-5 shadow-[0_8px_30px_rgba(234,88,12,0.06)] ${
          isFloating
            ? 'border-2 bg-[#FFFBF9]/95 shadow-[0_-10px_40px_rgba(234,88,12,0.12)] backdrop-blur-md'
            : ''
        }`}
      >
        {/* Compact Header with Gift Sticker at top-left */}
        <div className="mb-3 flex items-center gap-2.5 sm:gap-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center">
            <svg
              className="h-9 w-9 sm:h-10 sm:w-10"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 25L18 28M85 30L82 33M20 75L23 72M78 80L81 77"
                stroke="#F97316"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="28" cy="20" r="2" fill="#2563EB" />
              <circle cx="75" cy="22" r="3" fill="#EAB308" />
              <circle cx="85" cy="70" r="2" fill="#EF4444" />
              <circle cx="15" cy="65" r="3.5" fill="#22C55E" />

              <g transform="translate(15, 25)">
                <rect x="5" y="25" width="60" height="45" rx="4" fill="#FEF08A" stroke="#EA580C" strokeWidth="3" />
                <rect x="0" y="15" width="70" height="12" rx="3" fill="#FDE047" stroke="#EA580C" strokeWidth="3" />
                <rect x="30" y="25" width="10" height="45" fill="#EF4444" />
                <rect x="30" y="15" width="10" height="12" fill="#EF4444" />
                <path d="M35 15C25 5 15 5 25 15C35 25 35 15 35 15Z" fill="#EF4444" stroke="#D97706" strokeWidth="1" />
                <path d="M35 15C45 5 55 5 45 15C35 25 35 15 35 15Z" fill="#EF4444" stroke="#D97706" strokeWidth="1" />
              </g>
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-[18px] font-bold leading-tight text-[#EA580C]">Invite &amp; Earn</h3>
            <p className="mt-0.5 text-[13px] font-medium text-[#6B7280]">
              Invite friends and earn exciting rewards
            </p>
          </div>
        </div>

        {/* Code & Referral Link in One Row */}
        <div className="grid grid-cols-1 gap-2.5 min-[340px]:grid-cols-2">
          {/* Your Code card */}
          <div className="flex h-[56px] items-center justify-between rounded-[12px] border border-dashed border-[#FFE4D6] bg-white px-3 py-1.5">
            <div className="min-w-0 flex-1 pr-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider leading-none text-[#9CA3AF]">
                YOUR CODE
              </p>
              <p className="mt-1 truncate text-[13px] font-extrabold leading-tight text-[#111111]">
                {data.referral.referralCode}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void copyValue('Code', data.referral.referralCode)}
              className="cursor-pointer shrink-0 p-1 text-[#EA580C] transition hover:text-[#F97316]"
              title="Copy Code"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>

          {/* Referral Link card */}
          <div className="flex h-[56px] items-center justify-between rounded-[12px] border border-dashed border-[#FFE4D6] bg-white px-3 py-1.5">
            <div className="min-w-0 flex-1 pr-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider leading-none text-[#9CA3AF]">
                REFERRAL LINK
              </p>
              <p className="mt-1 truncate text-[13px] font-extrabold leading-tight text-[#111111]">
                {shareLinkDisplay}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void copyValue('Link', data.referral.shareUrl)}
              className="cursor-pointer shrink-0 p-1 text-[#EA580C] transition hover:text-[#F97316]"
              title="Copy Link"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Invite Button */}
        <button
          type="button"
          onClick={() => void onInvite()}
          className="mt-4 flex h-[48px] w-full cursor-pointer items-center justify-center rounded-[12px] bg-gradient-to-r from-[#EA580C] to-[#F97316] text-center text-[13px] font-extrabold text-white shadow-[0_4px_12px_rgba(234,88,12,0.2)] transition hover:opacity-95 active:scale-[0.99]"
        >
          Invite
        </button>
      </div>
    );
  };

  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="rounded-[24px] bg-white p-12 text-center text-[13px] text-[#6B7280] shadow-sm">
          Loading wallet data...
        </div>
      );
    }

    if (!data) {
      return (
        <div className="rounded-[24px] bg-white p-12 text-center shadow-sm">
          <p className="text-[14px] font-semibold text-[#111111]">Wallet data unavailable</p>
          <button
            type="button"
            onClick={() => void loadWallet()}
            className="mt-3 text-[13px] font-semibold text-[#2563EB]"
          >
            Try again
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* 1. Main Wallet Balance Card */}
        <div className="relative overflow-hidden rounded-[24px] bg-[#0A0F1D] p-6 text-white shadow-xl">
          <div className="relative flex flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <p className="text-[12px] font-semibold tracking-wider text-slate-400">Balance</p>
              <h2 className="text-[36px] font-black leading-none tracking-tight">
                {formatInr(data.balances.totalAvailable)}
              </h2>
              <p className="pt-1 text-[12px] font-medium text-slate-400">
                Available to withdraw {formatInr(data.balances.withdrawable)}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => void onWithdraw()}
                  className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-[#EA580C] text-white shadow-[0_6px_20px_rgba(234,88,12,0.35)] transition hover:scale-105 hover:bg-[#F97316] active:scale-95"
                  aria-label="Withdraw"
                >
                  <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
                </button>
                <span className="mt-2 text-[11px] font-semibold text-slate-300">Withdraw</span>
              </div>
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => void onAddMoney()}
                  className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-slate-100 bg-white text-[#111111] shadow-[0_6px_20px_rgba(255,255,255,0.05)] transition hover:scale-105 hover:bg-slate-50 active:scale-95"
                  aria-label="Add Money"
                >
                  <Plus className="h-5 w-5" strokeWidth={2.5} />
                </button>
                <span className="mt-2 text-[11px] font-semibold text-slate-300">Add Money</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Stat Categories Grid */}
        <div className="rounded-[24px] border border-black/[0.05] bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
          <div className="grid grid-cols-4 divide-x divide-slate-100">
            {stats.map(item => (
              <div key={item.id} className="flex flex-col items-center justify-center text-center">
                <item.icon className={`h-6 w-6 ${item.color}`} strokeWidth={1.5} />
                <p className="mt-2 text-[11px] font-bold text-slate-600">{item.label}</p>
                <p className={`mt-1 text-[15px] font-extrabold ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Affiliate Earnings */}
        <div className="space-y-2.5">
          <h3 className="text-[15px] font-black text-[#111111]">Affiliate Earnings (This Month)</h3>
          <div className="rounded-[24px] border border-black/[0.05] bg-white p-2 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
            <div className="grid grid-cols-4 divide-x divide-slate-100 py-2.5">
              {affiliateStats.map(item => (
                <div key={item.id} className="flex items-center justify-center gap-2 px-1">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.bg}`}>
                    <item.icon className={`h-[16px] w-[16px] ${item.color}`} strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-black leading-none text-[#111111]">{item.value}</p>
                    <p className="mt-0.5 text-[9px] font-semibold leading-none text-[#9CA3AF]">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Recent Transactions */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-black text-[#111111]">Recent Transactions</h3>
            {data.transactions.length > 4 ? (
              <button
                type="button"
                onClick={() => setShowAllTransactions(value => !value)}
                className="inline-flex cursor-pointer items-center gap-0.5 text-[12px] font-extrabold text-[#6B7280] transition hover:text-[#111111]"
              >
                {showAllTransactions ? 'Show less' : 'View all'} <ChevronRight className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <div className="rounded-[24px] border border-black/[0.05] bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
            {visibleTransactions.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-[#6B7280]">
                No transactions yet. Start earning by inviting friends!
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleTransactions.map(tx => {
                  const income = tx.type === 'credit';
                  const visual =
                    txVisuals[tx.kind === 'withdrawal' ? 'withdrawal' : tx.category] ||
                    txVisuals.other;
                  const Icon = income ? visual.icon : txVisuals.withdrawal.icon;
                  return (
                    <div
                      key={`${tx.kind}-${tx.id}`}
                      className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${visual.bg}`}>
                          <Icon className={`h-[16px] w-[16px] ${visual.color}`} strokeWidth={income ? 2.5 : 1.75} />
                        </div>
                        <div>
                          <p className="text-[13px] font-extrabold text-[#111111]">{tx.title}</p>
                          {tx.withdrawable && income ? (
                            <p className="mt-0.5 text-[10px] font-semibold text-[#16A34A]">
                              Withdrawable
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-[13px] font-black ${income ? 'text-[#22C55E]' : 'text-[#111111]'}`}>
                          {income ? '+' : '-'} {formatInr(tx.amount)}
                        </p>
                        <p className="mt-0.5 text-[10px] font-medium text-[#9CA3AF]">
                          {formatTxDate(tx.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 5. You Earn From */}
        <div className="space-y-2.5">
          <h3 className="text-[15px] font-black text-[#111111]">You Earn From</h3>
          <div className="rounded-[24px] border border-black/[0.05] bg-white p-2 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
            <div className="grid grid-cols-3 divide-x divide-slate-100 py-1.5 sm:grid-cols-6">
              {earnCategories.map(item => (
                <div key={item.category} className="flex flex-col items-center justify-center py-1 text-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${item.bg}`}>
                    <item.icon className={`h-4 w-4 ${item.color}`} strokeWidth={2} />
                  </div>
                  <p className="mt-1.5 text-[9px] font-bold leading-none text-slate-500">{item.label}</p>
                  <p className="mt-1 text-[10px] font-extrabold leading-none text-[#22C55E]">
                    {formatInr(item.amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-dvh bg-[#FAFBFD]">
      <DashboardSidebar
        mode="drawer"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="mx-auto max-w-[1440px] p-4 md:p-6">
        {/* Desktop / tablet shell */}
        <div className="hidden gap-6 xl:flex">
          <DashboardSidebar mode="fixed" />

          <div className="min-w-0 flex-1 space-y-6 pb-[260px]">
            <TopNavbar onMenuClick={() => setSidebarOpen(true)} />

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="cursor-pointer text-[#111111] transition hover:opacity-80"
                aria-label="Go back"
              >
                <ArrowLeft className="h-6 w-6" strokeWidth={2.25} />
              </button>
              <h1 className="text-[24px] font-black text-[#111111]">Wallet</h1>
            </div>

            {renderMainContent()}
          </div>
        </div>

        {/* Mobile / tablet (< xl) */}
        <div className="xl:hidden">
          <header className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="cursor-pointer text-[#111111] transition hover:opacity-80"
                aria-label="Go back"
              >
                <ArrowLeft className="h-6 w-6" strokeWidth={2.25} />
              </button>
              <h1 className="text-[22px] font-extrabold tracking-tight text-[#111111]">Wallet</h1>
            </div>

            <button
              type="button"
              onClick={() =>
                void Swal.fire({
                  icon: 'info',
                  title: 'Wallet Help',
                  text: 'Your wallet shows real balances, affiliate earnings, and transactions from your account.',
                  confirmButtonColor: '#111111',
                })
              }
              className="cursor-pointer text-[#111111] transition hover:opacity-80"
              aria-label="Help"
            >
              <HelpCircle className="h-6 w-6" strokeWidth={1.75} />
            </button>
          </header>

          <div className="pb-[260px]">{renderMainContent()}</div>
        </div>
      </div>

      {/* Floating Sticky Invite & Earn Card */}
      {!loading && data ? (
        <div className="fixed inset-x-4 bottom-4 z-40 mx-auto w-[calc(100%-2rem)] max-w-lg md:bottom-6 md:left-[calc(50%+140px)] md:right-auto md:inset-x-auto md:mx-0 md:max-w-2xl md:-translate-x-1/2 lg:max-w-3xl">
          {inviteEarnCard(true)}
        </div>
      ) : null}
    </div>
  );
}

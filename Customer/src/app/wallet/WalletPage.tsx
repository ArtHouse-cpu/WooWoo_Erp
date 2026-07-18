import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {
  ArrowLeft,
  HelpCircle,
  Wallet,
  Plus,
  ArrowUp,
  ArrowUpRight,
  Gift,
  PieChart,
  TrendingUp,
  Users,
  FileText,
  Percent,
  ArrowDown,
  ShoppingBag,
  Calendar,
  Wrench,
  Coffee,
  Award,
  UserPlus,
  Copy,
  ChevronRight,
} from 'lucide-react';
import {toast} from 'sonner';
import {DashboardSidebar} from '../../components/dashboard/DashboardSidebar';
import {TopNavbar} from '../../components/dashboard/TopNavbar';
import {useAuthStore} from '../../store/authStore';

export default function WalletPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const customer = useAuthStore(s => s.customer);
  
  const wallet = customer?.walletBalance ?? customer?.walletAmount ?? 4250;
  const withdrawable = Math.max(0, wallet - 500); // exactly ₹3,750 when balance is ₹4,250

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  // 1. Stats Grid data
  const stats = [
    {id: 'cashbacks', label: 'Cashbacks', icon: Wallet, value: '₹12', color: 'text-[#6366F1]'},
    {id: 'earnings', label: 'Earnings', icon: TrendingUp, value: '₹8', color: 'text-[#22C55E]'},
    {id: 'rewards', label: 'Rewards', icon: Gift, value: '5', color: 'text-[#EA580C]'},
    {id: 'statistics', label: 'Statistics', icon: PieChart, value: '6', color: 'text-[#2563EB]'},
  ];

  // 2. Affiliate Earnings data
  const affiliateStats = [
    {id: 'earnings', label: 'Earnings', icon: Wallet, value: '₹2,850', color: 'text-[#7C3AED]', bg: 'bg-[#F3E8FF]'},
    {id: 'referrals', label: 'Referrals', icon: Users, value: '128', color: 'text-[#22C55E]', bg: 'bg-[#DCFCE7]'},
    {id: 'revenue', label: 'Revenue', icon: FileText, value: '₹28,450', color: 'text-[#F97316]', bg: 'bg-[#FFEDD5]'},
    {id: 'conversion', label: 'Conversion', icon: Percent, value: '6.8%', color: 'text-[#2563EB]', bg: 'bg-[#DBEAFE]'},
  ];

  // 3. Recent Transactions data
  const transactions = [
    {
      id: 'tx1',
      title: 'Referral Bonus',
      amount: '+ ₹150',
      date: 'Today, 09:30 AM',
      icon: ArrowDown,
      iconColor: 'text-[#22C55E]',
      iconBg: 'bg-[#DCFCE7]',
      isIncome: true,
    },
    {
      id: 'tx2',
      title: 'Store Purchase Commission',
      amount: '+ ₹72',
      date: 'Yesterday, 08:20 PM',
      icon: ShoppingBag,
      iconColor: 'text-[#F97316]',
      iconBg: 'bg-[#FFEDD5]',
      isIncome: true,
    },
    {
      id: 'tx3',
      title: 'Space Booking Commission',
      amount: '+ ₹300',
      date: '12 May, 07:10 PM',
      icon: Calendar,
      iconColor: 'text-[#2563EB]',
      iconBg: 'bg-[#DBEAFE]',
      isIncome: true,
    },
    {
      id: 'tx4',
      title: 'Withdrawal to Bank',
      amount: '- ₹2,000',
      date: '11 May, 10:45 AM',
      icon: ArrowUpRight,
      iconColor: 'text-[#7C3AED]',
      iconBg: 'bg-[#F3E8FF]',
      isIncome: false,
    },
  ];

  // 4. "You Earn From" data
  const earnCategories = [
    {id: 'signup', label: 'Signup', icon: UserPlus, value: '₹100', color: 'text-[#7C3AED]', bg: 'bg-[#F3E8FF]'},
    {id: 'membership', label: 'Membership', icon: Award, value: '₹1,250', color: 'text-[#22C55E]', bg: 'bg-[#DCFCE7]'},
    {id: 'shopping', label: 'Shopping', icon: ShoppingBag, value: '₹750', color: 'text-[#EC4899]', bg: 'bg-[#FCE7F3]'},
    {id: 'booking', label: 'Booking', icon: Calendar, value: '₹450', color: 'text-[#F97316]', bg: 'bg-[#FFEDD5]'},
    {id: 'services', label: 'Services', icon: Wrench, value: '₹200', color: 'text-[#2563EB]', bg: 'bg-[#DBEAFE]'},
    {id: 'food', label: 'Food', icon: Coffee, value: '₹100', color: 'text-[#CA8A04]', bg: 'bg-[#FEF9C3]'},
  ];

  const inviteEarnCard = (isFloating = false) => (
    <div className={`rounded-[24px] border border-[#FFE4D6] bg-gradient-to-r from-[#FFF5F1] via-[#FFF9F6] to-[#FFFBF9] p-5 shadow-[0_8px_30px_rgba(234,88,12,0.03)] relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 ${isFloating ? 'border-2 shadow-[0_-10px_40px_rgba(234,88,12,0.12)] bg-[#FFFBF9]/95 backdrop-blur-md' : ''}`}>
      <div className="flex-1 space-y-4">
        <div>
          <h3 className="text-[18px] font-black text-[#EA580C]">Invite & Earn</h3>
          <p className="text-[12px] font-semibold text-[#6B7280] mt-0.5">Invite friends and earn exciting rewards</p>
        </div>

        <div className="flex flex-col gap-3.5 pt-1">
          <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full">
            {/* Your Code box */}
            <div className="w-full sm:flex-1 rounded-[12px] border border-dashed border-[#FFE4D6] bg-white px-3 py-1.5 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Your Code</p>
                <p className="text-[12px] font-extrabold text-[#111111]">WOO1234</p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('WOO1234')}
                className="text-[#EA580C] hover:text-[#F97316] transition p-1 cursor-pointer"
                title="Copy Code"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Referral Link box */}
            <div className="w-full sm:flex-[2] rounded-[12px] border border-dashed border-[#FFE4D6] bg-white px-3 py-1.5 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Referral Link</p>
                <p className="text-[12px] font-extrabold text-[#111111] truncate max-w-[150px] md:max-w-none">
                  woowooarthouse.in/WOO1234
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('woowooarthouse.in/WOO1234')}
                className="text-[#EA580C] hover:text-[#F97316] transition p-1 cursor-pointer"
                title="Copy Link"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => toast.success('Invite link shared!')}
            className="w-full rounded-[12px] bg-[#EA580C] hover:bg-[#F97316] text-white py-3.5 text-[12px] font-extrabold shadow-[0_4px_12px_rgba(234,88,12,0.15)] transition hover:scale-102 active:scale-98 cursor-pointer text-center"
          >
            Invite
          </button>
        </div>
      </div>

      {/* Gift box graphics with confetti */}
      <div className="shrink-0 flex items-center justify-center pr-4">
        <svg className="w-16 h-16 md:w-20 md:h-20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 25L18 28M85 30L82 33M20 75L23 72M78 80L81 77" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
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
    </div>
  );

  const renderMainContent = (showInviteInline: boolean) => (
    <div className="space-y-6">
      {/* 1. Main Wallet Balance Card */}
      <div className="rounded-[24px] bg-[#0A0F1D] p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative flex flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <p className="text-[12px] font-semibold text-slate-400 tracking-wider">Balance</p>
            <h2 className="text-[36px] font-black tracking-tight leading-none">
              ₹{wallet.toLocaleString('en-IN', {minimumFractionDigits: 0})}
            </h2>
            <p className="text-[12px] font-medium text-slate-400 pt-1">
              Available to withdraw ₹{withdrawable.toLocaleString('en-IN', {minimumFractionDigits: 0})}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => toast.info('Withdraw functionality coming soon!')}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EA580C] hover:bg-[#F97316] text-white shadow-[0_6px_20px_rgba(234,88,12,0.35)] transition hover:scale-105 active:scale-95 cursor-pointer"
                aria-label="Withdraw"
              >
                <ArrowUp className="h-5.5 w-5.5" strokeWidth={2.5} />
              </button>
              <span className="text-[11px] font-semibold text-slate-300 mt-2">Withdraw</span>
            </div>
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => toast.info('Add money functionality coming soon!')}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white hover:bg-slate-50 text-[#111111] shadow-[0_6px_20px_rgba(255,255,255,0.05)] border border-slate-100 transition hover:scale-105 active:scale-95 cursor-pointer"
                aria-label="Add Money"
              >
                <Plus className="h-5.5 w-5.5" strokeWidth={2.5} />
              </button>
              <span className="text-[11px] font-semibold text-slate-300 mt-2">Add Money</span>
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
              <p className="text-[11px] font-bold text-slate-600 mt-2">{item.label}</p>
              <p className={`text-[15px] font-extrabold mt-1 ${item.color}`}>{item.value}</p>
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
                  <p className="truncate text-[12px] font-black text-[#111111] leading-none">{item.value}</p>
                  <p className="mt-0.5 text-[9px] font-semibold text-[#9CA3AF] leading-none">{item.label}</p>
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
          <button
            type="button"
            onClick={() => toast.info('Transaction history details coming soon!')}
            className="inline-flex items-center gap-0.5 text-[12px] font-extrabold text-[#6B7280] hover:text-[#111111] transition cursor-pointer"
          >
            View all <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="rounded-[24px] border border-black/[0.05] bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
          <div className="divide-y divide-slate-100">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tx.iconBg}`}>
                    <tx.icon className={`h-[16px] w-[16px] ${tx.iconColor}`} strokeWidth={tx.isIncome ? 2.5 : 1.75} />
                  </div>
                  <p className="text-[13px] font-extrabold text-[#111111]">{tx.title}</p>
                </div>
                <div className="text-right">
                  <p className={`text-[13px] font-black ${tx.isIncome ? 'text-[#22C55E]' : 'text-[#111111]'}`}>
                    {tx.amount}
                  </p>
                  <p className="text-[10px] font-medium text-[#9CA3AF] mt-0.5">{tx.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. You Earn From */}
      <div className="space-y-2.5">
        <h3 className="text-[15px] font-black text-[#111111]">You Earn From</h3>
        <div className="rounded-[24px] border border-black/[0.05] bg-white p-2 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
          <div className="grid grid-cols-6 divide-x divide-slate-100 py-2.5">
            {earnCategories.map(item => (
              <div key={item.id} className="flex flex-col items-center justify-center text-center">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${item.bg}`}>
                  <item.icon className={`h-4 w-4 ${item.color}`} strokeWidth={2} />
                </div>
                <p className="text-[9px] font-bold text-slate-500 mt-2 leading-none">{item.label}</p>
                <p className="text-[10px] font-extrabold text-[#22C55E] mt-1.5 leading-none">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Invite & Earn Banner */}
      {showInviteInline && inviteEarnCard(false)}
    </div>
  );

  return (
    <div className="min-h-dvh bg-[#FAFBFD] relative">
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
                className="text-[#111111] hover:opacity-80 transition cursor-pointer"
                aria-label="Go back"
              >
                <ArrowLeft className="h-6 w-6" strokeWidth={2.25} />
              </button>
              <h1 className="text-[24px] font-black text-[#111111]">Wallet</h1>
            </div>

            {renderMainContent(false)}
          </div>
        </div>

        {/* Mobile / tablet (< xl) */}
        <div className="xl:hidden">
          {/* Custom Wallet Mobile Header - Matches reference exactly */}
          <header className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="text-[#111111] hover:opacity-80 transition cursor-pointer"
                aria-label="Go back"
              >
                <ArrowLeft className="h-6 w-6" strokeWidth={2.25} />
              </button>
              <h1 className="text-[22px] font-extrabold tracking-tight text-[#111111]">Wallet</h1>
            </div>
            
            <button
              type="button"
              onClick={() => toast.info('Help details are coming soon!')}
              className="text-[#111111] hover:opacity-80 transition cursor-pointer"
              aria-label="Help"
            >
              <HelpCircle className="h-6 w-6" strokeWidth={1.75} />
            </button>
          </header>

          <div className="pb-[260px]">
            {renderMainContent(false)}
          </div>
        </div>
      </div>

      {/* Floating Sticky Invite & Earn Modal - Centered inside main content column on web/mobile */}
      <div className="fixed bottom-4 inset-x-4 md:bottom-6 md:left-[calc(50%+140px)] md:right-auto md:inset-x-auto -translate-x-0 md:-translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto md:mx-0">
        {inviteEarnCard(true)}
      </div>
    </div>
  );
}

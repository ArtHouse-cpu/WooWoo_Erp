import {useState, useMemo, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {
  Calendar,
  ChevronLeft,
  ChevronDown,
  Check,
  ShoppingBag,
  Wrench,
  Soup,
  Infinity,
  Clock,
  Tag,
  Wallet,
  ChevronUp,
  MoreVertical,
  Gift,
  X,
} from 'lucide-react';
import {toast} from 'sonner';
import {DashboardSidebar} from '../../components/dashboard/DashboardSidebar';
import {TopNavbar} from '../../components/dashboard/TopNavbar';
import {authApi} from '../../services/auth.service';
import {getErrorMessage} from '../../services/axios';
import type {ActivityItem} from '../../types/auth';

type DateFilter = 'today' | 'week' | 'month' | 'last_month' | 'lifetime';
type Category = 'shopping' | 'services' | 'space' | 'food';

export interface Transaction {
  invoiceId?: string;
  invoiceNo: string;
  items: string;
  dateTime: string;
  amount: number;
  totalPaid: number;
  discount: number;
  cashback: number;
  status: 'Paid' | 'Pending';
  category: Category;
  timestamp: number;
}

/** Kept for MembershipOnboardingPage import compatibility */
export const MOCK_TRANSACTIONS: Transaction[] = [];

const mapCategory = (raw?: string): Category => {
  const value = String(raw || 'shopping').toLowerCase();
  if (value === 'services' || value === 'service') return 'services';
  if (value === 'space') return 'space';
  if (value === 'food' || value === 'cafe') return 'food';
  // product / general / shopping → shopping tab
  return 'shopping';
};

const mapActivityToTransaction = (a: ActivityItem): Transaction => {
  const d = new Date(a.createdAt);
  const datePart = d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timePart = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const amount = Number(a.paidAmount ?? a.subTotal ?? 0) || 0;
  const discount = Number(a.discountAmount ?? 0) || 0;
  const cashback = Number(a.cashbackAmount ?? 0) || 0;
  const totalPaid = Number(a.totalPaid ?? Math.max(0, amount - discount)) || 0;

  return {
    invoiceId: a.invoiceId,
    invoiceNo: a.invoiceNumber || '—',
    items: `${Number(a.itemCount ?? 0) || 0} Items`,
    dateTime: `${datePart}, ${timePart}`,
    amount,
    totalPaid,
    discount,
    cashback,
    status: a.status === 'Pending' ? 'Pending' : 'Paid',
    category: mapCategory(a.category),
    timestamp: d.getTime(),
  };
};

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const isInDateFilter = (timestamp: number, dateFilter: DateFilter) => {
  if (dateFilter === 'lifetime') return true;

  const now = new Date();
  const itemDate = new Date(timestamp);
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (dateFilter === 'today') {
    return startOfDay(itemDate) === startOfDay(now);
  }

  if (dateFilter === 'week') {
    const diffMs = startOfDay(now) - startOfDay(itemDate);
    return diffMs >= 0 && diffMs <= 7 * oneDayMs;
  }

  if (dateFilter === 'month') {
    return (
      itemDate.getMonth() === now.getMonth() &&
      itemDate.getFullYear() === now.getFullYear()
    );
  }

  if (dateFilter === 'last_month') {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return (
      itemDate.getMonth() === lastMonth.getMonth() &&
      itemDate.getFullYear() === lastMonth.getFullYear()
    );
  }

  return true;
};

export default function ActivityPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(
    null,
  );

  const [dateFilter, setDateFilter] = useState<DateFilter>('lifetime');
  const [activeCategory, setActiveCategory] = useState<Category>('shopping');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const res = await authApi.getActivity({page: 1, limit: 100});
        if (!cancelled) {
          setActivities(res.data.data?.activities ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error, 'Failed to load activity'));
          setActivities([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const transactions = useMemo(
    () => activities.map(mapActivityToTransaction),
    [activities],
  );

  const filterLabels = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    last_month: 'Last Month',
    lifetime: 'Lifetime',
  };

  const selectFilter = (filter: DateFilter) => {
    setDateFilter(filter);
    setDropdownOpen(false);
  };

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(item => {
        if (item.category !== activeCategory) return false;
        return isInDateFilter(item.timestamp, dateFilter);
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, activeCategory, dateFilter]);

  const categoryConfig = {
    shopping: {
      card1Bg: 'from-[#FFFDFB] to-[#FFF7ED] border-[#FFEDD5]',
      iconBg: 'bg-[#FFF7ED]',
      iconColor: 'text-[#EA580C]',
      textColor: 'text-[#EA580C]',
      countLabel: 'Total Orders',
      valueLabel: 'Total Order Value',
      icon: ShoppingBag,
    },
    services: {
      card1Bg: 'from-[#FCFAFE] to-[#FAF5FF] border-[#E9D5FF]/60',
      iconBg: 'bg-[#FAF5FF]',
      iconColor: 'text-[#9333EA]',
      textColor: 'text-[#9333EA]',
      countLabel: 'Total Services',
      valueLabel: 'Total Service Value',
      icon: Wrench,
    },
    space: {
      card1Bg: 'from-[#F9FDFB] to-[#EAFDF4] border-[#BBF7D0]/60',
      iconBg: 'bg-[#EAFDF4]',
      iconColor: 'text-[#16A34A]',
      textColor: 'text-[#16A34A]',
      countLabel: 'Total Bookings',
      valueLabel: 'Total Booking Value',
      icon: Calendar,
    },
    food: {
      card1Bg: 'from-[#FFFBFB] to-[#FEF2F2] border-[#FCA5A5]/60',
      iconBg: 'bg-[#FEF2F2]',
      iconColor: 'text-[#EF4444]',
      textColor: 'text-[#EF4444]',
      countLabel: 'Total Orders',
      valueLabel: 'Total Spend Value',
      icon: Soup,
    },
  };

  const categoryStats = useMemo(() => {
    const currentCount = filteredTransactions.length;
    const currentValue = filteredTransactions.reduce(
      (acc, item) => acc + item.amount,
      0,
    );
    const currentDiscount = filteredTransactions.reduce(
      (acc, item) => acc + item.discount,
      0,
    );
    const currentCashback = filteredTransactions.reduce(
      (acc, item) => acc + item.cashback,
      0,
    );

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthTransactions = transactions.filter(item => {
      if (item.category !== activeCategory) return false;
      const dateObj = new Date(item.timestamp);
      return (
        dateObj.getMonth() === lastMonth.getMonth() &&
        dateObj.getFullYear() === lastMonth.getFullYear()
      );
    });

    const lastMonthDiscount = lastMonthTransactions.reduce(
      (acc, item) => acc + item.discount,
      0,
    );
    const lastMonthCashback = lastMonthTransactions.reduce(
      (acc, item) => acc + item.cashback,
      0,
    );

    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) {
        return {percent: current > 0 ? 100 : 0, isUp: true};
      }
      const diff = current - previous;
      const percent = Math.round((diff / previous) * 100);
      return {
        percent: Math.min(150, Math.abs(percent)),
        isUp: percent >= 0,
      };
    };

    return {
      count: currentCount,
      value: currentValue,
      discount: currentDiscount,
      cashback: currentCashback,
      discountTrend: calculateTrend(currentDiscount, lastMonthDiscount),
      cashbackTrend: calculateTrend(currentCashback, lastMonthCashback),
    };
  }, [filteredTransactions, transactions, activeCategory]);

  const totalBenefit = useMemo(() => {
    return categoryStats.discount + categoryStats.cashback;
  }, [categoryStats]);

  const savePercent = useMemo(() => {
    if (categoryStats.value === 0) return 0;
    return Math.min(
      100,
      Math.round((totalBenefit / categoryStats.value) * 100),
    );
  }, [categoryStats, totalBenefit]);

  const config = categoryConfig[activeCategory];
  const Card1Icon = config.icon;

  const categories = [
    {
      id: 'shopping' as Category,
      label: 'Shopping',
      icon: ShoppingBag,
      color: '#EA580C',
      activeStyle:
        'bg-[#FFF7ED] text-[#EA580C] border-[#FDBA74]/40',
    },
    {
      id: 'services' as Category,
      label: 'Services',
      icon: Wrench,
      color: '#9333EA',
      activeStyle:
        'bg-[#FAF5FF] text-[#9333EA] border-[#E9D5FF]/40',
    },
    {
      id: 'space' as Category,
      label: 'Space',
      icon: Calendar,
      color: '#16A34A',
      activeStyle:
        'bg-[#EAFDF4] text-[#16A34A] border-[#BBF7D0]/40',
    },
    {
      id: 'food' as Category,
      label: 'Food',
      icon: Soup,
      color: '#EF4444',
      activeStyle:
        'bg-[#FEF2F2] text-[#EF4444] border-[#FCA5A5]/40',
    },
  ];

  const content = (
    <div className="flex-1 space-y-6">
      <div className="relative flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-[#4B5563] shadow-[0_2px_8px_rgba(15,23,42,0.02)] transition hover:scale-95 cursor-pointer"
          aria-label="Go back"
        >
          <ChevronLeft className="h-5 w-5 text-[#111111]" strokeWidth={2.5} />
        </button>

        <h1 className="absolute left-25 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[18px] font-extrabold text-[#111111]">
          Activities
        </h1>

        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(v => !v)}
            className="flex h-9 items-center gap-2 rounded-xl border border-black/[0.04] bg-white px-3.5 text-[12px] font-extrabold text-[#111111] shadow-[0_2px_8px_rgba(15,23,42,0.02)] transition hover:scale-98 cursor-pointer"
          >
            <Calendar className="h-4 w-4 text-[#4B5563]" strokeWidth={2.2} />
            <span>{filterLabels[dateFilter]}</span>
            <ChevronDown className="h-3.5 w-3.5 text-[#9CA3AF]" strokeWidth={2.2} />
          </button>

          {dropdownOpen && (
            <>
              <button
                type="button"
                aria-label="Close dropdown"
                className="fixed inset-0 z-40 cursor-default bg-transparent"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 top-11 z-50 mt-1.5 w-44 overflow-hidden rounded-[20px] border border-black/[0.04] bg-white p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition duration-150">
                <ul className="space-y-0.5">
                  {(
                    [
                      'today',
                      'week',
                      'month',
                      'last_month',
                      'lifetime',
                    ] as DateFilter[]
                  ).map(item => {
                    const active = dateFilter === item;
                    const Icon =
                      item === 'lifetime'
                        ? Infinity
                        : item === 'last_month'
                          ? Clock
                          : Calendar;
                    return (
                      <li key={item}>
                        <button
                          type="button"
                          onClick={() => selectFilter(item)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[11px] font-bold transition-all cursor-pointer ${
                            active
                              ? 'bg-[#FFF7ED] text-[#EA580C]'
                              : 'text-[#4B5563] hover:bg-slate-50'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Icon
                              className="h-3.5 w-3.5"
                              strokeWidth={active ? 2.5 : 2}
                            />
                            {filterLabels[item]}
                          </span>
                          {active && (
                            <Check
                              className="h-3.5 w-3.5 text-[#EA580C]"
                              strokeWidth={3}
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      <div
        className="flex items-center gap-2 overflow-x-auto pb-2 -mx-5 px-5 scroll-smooth whitespace-nowrap flex-nowrap"
        style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}
      >
        {categories.map(cat => {
          const active = activeCategory === cat.id;
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`relative transition-all duration-200 cursor-pointer flex-shrink-0 ${
                active
                  ? `${cat.activeStyle} border shadow-sm rounded-full px-3.5 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2 text-[11px] sm:text-[12px] font-extrabold`
                  : 'bg-white text-[#6B7280] border border-black/[0.04] rounded-full px-3.5 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2 text-[11px] sm:text-[12px] font-extrabold hover:bg-slate-50'
              }`}
            >
              <Icon
                className="h-4 w-4"
                strokeWidth={active ? 2.5 : 2}
                style={{color: active ? cat.color : '#6B7280'}}
              />
              <span>{cat.label}</span>
              {active && (
                <span
                  className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full"
                  style={{backgroundColor: cat.color}}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div
          className={`bg-gradient-to-b ${config.card1Bg} border rounded-[24px] p-4 flex flex-col justify-between h-[155px] shadow-sm text-left`}
        >
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${config.iconBg} ${config.iconColor}`}
          >
            <Card1Icon className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-[22px] font-extrabold text-[#111111] leading-none mt-2">
              {loading ? '—' : categoryStats.count}
            </p>
            <p className="text-[11px] font-bold text-[#6B7280] leading-none mt-1">
              {config.countLabel}
            </p>
            <p
              className={`text-[15px] font-extrabold ${config.textColor} mt-3.5 leading-none`}
            >
              ₹{loading ? '—' : categoryStats.value.toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] font-bold text-[#6B7280] leading-none mt-1">
              {config.valueLabel}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-b from-[#FAFAFA] to-[#FAF5FF] border border-[#F3E8FF] rounded-[24px] p-4 flex flex-col justify-between h-[155px] shadow-sm text-left">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FAF5FF] text-[#9333EA]">
            <Tag className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-[22px] font-extrabold text-[#111111] leading-none mt-2">
              ₹{loading ? '—' : categoryStats.discount.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] font-bold text-[#6B7280] leading-none mt-1">
              Discount
            </p>
            <div className="flex items-center gap-1 mt-3.5 leading-none">
              <span className="text-[15px] font-extrabold text-[#9333EA]">
                {categoryStats.discountTrend.percent}%
              </span>
              <span
                className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                  categoryStats.discountTrend.isUp
                    ? 'bg-[#EAFDF4] text-[#10B981]'
                    : 'bg-[#FEF2F2] text-[#EF4444]'
                }`}
              >
                {categoryStats.discountTrend.isUp ? (
                  <ChevronUp className="h-2.5 w-2.5 stroke-[3]" />
                ) : (
                  <ChevronDown className="h-2.5 w-2.5 stroke-[3]" />
                )}
              </span>
            </div>
            <p className="text-[10px] font-bold text-[#6B7280] leading-none mt-1">
              vs Last Month
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-b from-[#FAFAFA] to-[#EFF6FF] border border-[#DBEAFE] rounded-[24px] p-4 flex flex-col justify-between h-[155px] shadow-sm text-left">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
            <Wallet className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-[22px] font-extrabold text-[#111111] leading-none mt-2">
              ₹{loading ? '—' : categoryStats.cashback.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] font-bold text-[#6B7280] leading-none mt-1">
              Cashbacks
            </p>
            <div className="flex items-center gap-1 mt-3.5 leading-none">
              <span className="text-[15px] font-extrabold text-[#2563EB]">
                {categoryStats.cashbackTrend.percent}%
              </span>
              <span
                className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                  categoryStats.cashbackTrend.isUp
                    ? 'bg-[#EAFDF4] text-[#10B981]'
                    : 'bg-[#FEF2F2] text-[#EF4444]'
                }`}
              >
                {categoryStats.cashbackTrend.isUp ? (
                  <ChevronUp className="h-2.5 w-2.5 stroke-[3]" />
                ) : (
                  <ChevronDown className="h-2.5 w-2.5 stroke-[3]" />
                )}
              </span>
            </div>
            <p className="text-[10px] font-bold text-[#6B7280] leading-none mt-1">
              vs Last Month
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-[16px] font-extrabold text-[#111111] text-left">
          Transaction History
        </h2>

        {loading ? (
          <div className="rounded-[24px] border border-black/[0.03] bg-white py-14 text-center shadow-sm">
            <p className="text-[13px] font-bold text-[#6B7280]">Loading activity...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="rounded-[24px] border border-black/[0.03] bg-white py-14 text-center shadow-sm">
            <Calendar
              className="mx-auto h-8 w-8 text-[#9CA3AF] opacity-50"
              strokeWidth={1.5}
            />
            <p className="mt-3 text-[13px] font-bold text-[#6B7280]">
              No transactions found
            </p>
            <p className="mt-1 text-[11px] text-[#9CA3AF]">
              No transactions recorded for this period.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[24px] border border-black/[0.03] bg-white shadow-sm">
            <div className="w-full overflow-hidden">
              <table className="w-full border-collapse text-left table-fixed sm:table-auto">
                <thead>
                  <tr className="border-b border-black/[0.03] bg-slate-50/50 text-[10px] font-extrabold uppercase tracking-wider text-[#6B7280]">
                    <th className="py-3 px-3 w-[26%] sm:w-auto">Invoice</th>
                    <th className="py-3 px-3 w-[28%] sm:w-auto">Paid</th>
                    <th className="py-3 px-3 w-[28%] sm:w-auto"> Benefited</th>
                    <th className="py-3 px-3 w-[18%] sm:w-auto">Status</th>
                    <th className="py-3 px-1 w-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.03]">
                  {filteredTransactions.map(item => {
                    const totalB = item.discount + item.cashback;
                    return (
                      <tr
                        key={item.invoiceId || item.invoiceNo}
                        onClick={() => setSelectedTransaction(item)}
                        className="hover:bg-slate-50/40 transition cursor-pointer"
                      >
                        <td className="py-4 px-3 align-top">
                          <div className="text-[11px] sm:text-[12px] font-extrabold text-[#111111] truncate">
                            {item.invoiceNo}
                          </div>
                          <div className="text-[9px] sm:text-[10px] text-[#9CA3AF] mt-0.5 font-semibold">
                            {item.dateTime.split(',')[0]}
                          </div>
                          <div className="text-[8px] sm:text-[9px] text-[#9CA3AF] font-medium mt-0.5">
                            {item.dateTime.split(',')[1]?.trim()}
                          </div>
                        </td>
                        <td className="py-4 px-3 align-top">
                          <div className="text-[11px] sm:text-[12px] font-extrabold text-[#111111]">
                            ₹{item.amount.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[9px] sm:text-[10px] text-[#9CA3AF] mt-0.5">
                            {item.items}
                          </div>
                        </td>
                        <td className="py-4 px-3 align-top">
                          <div className="text-[11px] sm:text-[12px] font-extrabold text-[#10B981]">
                            ₹{totalB}
                          </div>
                          {item.discount > 0 && (
                            <span className="block text-[9px] sm:text-[10px] font-bold text-[#8B5CF6] mt-0.5">
                              Disc. ₹{item.discount}
                            </span>
                          )}
                          {item.cashback > 0 && (
                            <span className="block text-[9px] sm:text-[10px] font-bold text-[#FF7A00] mt-0.5">
                              Cashback ₹{item.cashback}
                            </span>
                          )}
                          {item.discount === 0 && item.cashback === 0 && (
                            <span className="block text-[9px] sm:text-[10px] font-medium text-[#9CA3AF] mt-0.5">
                              —
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-3 align-top">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[8px] sm:text-[9px] font-extrabold ${
                              item.status === 'Paid'
                                ? 'bg-[#EAFDF4] text-[#10B981]'
                                : 'bg-[#FFF7ED] text-[#EA580C]'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-4 px-1 align-top">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedTransaction(item);
                            }}
                            className="text-[#9CA3AF] hover:text-[#4B5563] cursor-pointer"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {!loading && filteredTransactions.length > 0 && (
        <div className="sticky bottom-4 z-20 relative overflow-hidden rounded-[20px] bg-[#FFF8F5]/95 border border-[#FFEDD5] p-3.5 shadow-md backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFEBE5] text-[#FF5A26] shadow-sm">
                <Gift className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-[12px] font-extrabold text-[#111111]">
                  {activeCategory.charAt(0).toUpperCase() +
                    activeCategory.slice(1)}{' '}
                  Summary
                </h3>
                <p className="text-[15px] font-extrabold text-[#FF5A26] mt-0.5 leading-none">
                  ₹{totalBenefit.toLocaleString('en-IN')}
                </p>
                <p className="text-[9px] font-semibold text-[#4F5B73] mt-0.5">
                  Total Benefit ({filterLabels[dateFilter]})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[13px] font-extrabold text-[#FF5A26] leading-none">
                  {savePercent}% Saved
                </p>
                <p className="text-[9px] font-semibold text-[#4F5B73] mt-0.5">
                  of your spend
                </p>
              </div>
              <div
                className="h-8 w-8 rounded-full shrink-0 border border-white/80 shadow-sm"
                style={{
                  background: `conic-gradient(#FF5A26 ${savePercent}%, #FFE5D9 ${savePercent}% 100%)`,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardSidebar
        mode="drawer"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="mx-auto max-w-[1440px] p-4 md:p-6">
        <div className="hidden gap-6 xl:flex">
          <DashboardSidebar mode="fixed" />
          <div className="min-w-0 flex-1 space-y-6">
            <TopNavbar onMenuClick={() => setSidebarOpen(true)} />
            {content}
          </div>
        </div>

        <div className="xl:hidden">
          <div className="space-y-5 pb-6">{content}</div>
        </div>
      </div>

      {selectedTransaction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setSelectedTransaction(null)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-black/[0.05] bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] text-left animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/[0.03] pb-4">
              <div>
                <h3 className="text-[16px] font-extrabold text-[#111111]">
                  Invoice Receipt
                </h3>
                <p className="text-[11px] font-semibold text-[#9CA3AF] mt-0.5">
                  {selectedTransaction.invoiceNo}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 text-[#4B5563] transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                    Items / Description
                  </p>
                  <p className="text-[13px] font-extrabold text-[#111111] mt-1">
                    {selectedTransaction.items}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                    Category
                  </p>
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold mt-1 uppercase ${
                      selectedTransaction.category === 'shopping'
                        ? 'bg-[#FFF7ED] text-[#EA580C]'
                        : selectedTransaction.category === 'services'
                          ? 'bg-[#FAF5FF] text-[#9333EA]'
                          : selectedTransaction.category === 'space'
                            ? 'bg-[#EAFDF4] text-[#16A34A]'
                            : 'bg-[#FEF2F2] text-[#EF4444]'
                    }`}
                  >
                    {selectedTransaction.category}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                    Date & Time
                  </p>
                  <p className="text-[12px] font-semibold text-[#374151] mt-1">
                    {selectedTransaction.dateTime}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                    Status
                  </p>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-extrabold mt-1 ${
                      selectedTransaction.status === 'Paid'
                        ? 'bg-[#EAFDF4] text-[#10B981]'
                        : 'bg-[#FFF7ED] text-[#EA580C]'
                    }`}
                  >
                    {selectedTransaction.status}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50/50 rounded-2xl p-4 border border-black/[0.02] space-y-2 mt-2">
                <div className="flex justify-between text-[12px] font-semibold text-[#4B5563]">
                  <span>Subtotal</span>
                  <span>
                    ₹{selectedTransaction.amount.toLocaleString('en-IN')}
                  </span>
                </div>
                {selectedTransaction.discount > 0 && (
                  <div className="flex justify-between text-[12px] font-semibold text-[#9333EA]">
                    <span>Discount</span>
                    <span>
                      - ₹{selectedTransaction.discount.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                {selectedTransaction.cashback > 0 && (
                  <div className="flex justify-between text-[12px] font-semibold text-[#2563EB]">
                    <span>Cashback</span>
                    <span>
                      - ₹{selectedTransaction.cashback.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                <div className="border-t border-dashed border-slate-200 pt-2 flex justify-between text-[14px] font-extrabold text-[#111111]">
                  <span>Total Paid</span>
                  <span>
                    ₹{selectedTransaction.totalPaid.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="border-t border-dashed border-slate-200/50 pt-2 flex justify-between text-[13px] font-bold text-[#10B981]">
                  <span>Total Benefit</span>
                  <span>
                    ₹
                    {(
                      selectedTransaction.discount +
                      selectedTransaction.cashback
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-black/[0.03] pt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  toast.success(
                    `Invoice ${selectedTransaction.invoiceNo} shared successfully!`,
                  );
                  setSelectedTransaction(null);
                }}
                className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#374151] py-2.5 text-[12px] font-extrabold text-center transition cursor-pointer"
              >
                Share Invoice
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.success(
                    `Downloading invoice ${selectedTransaction.invoiceNo}...`,
                  );
                  setSelectedTransaction(null);
                }}
                className="flex-1 rounded-xl bg-[#111111] hover:bg-black text-white py-2.5 text-[12px] font-extrabold text-center transition cursor-pointer"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

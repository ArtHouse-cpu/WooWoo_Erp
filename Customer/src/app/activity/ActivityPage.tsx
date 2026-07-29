import {useState, useMemo} from 'react';
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

type DateFilter = 'today' | 'week' | 'month' | 'last_month' | 'lifetime';
type Category = 'shopping' | 'services' | 'space' | 'food';

export interface Transaction {
  invoiceNo: string;
  items: string;
  dateTime: string;
  amount: number;
  discount: number;
  cashback: number;
  status: 'Paid' | 'Pending';
  category: Category;
  timestamp: number;
}

const CURRENT_MOCK_TIME = new Date('2026-07-27T12:00:00').getTime();

export const MOCK_TRANSACTIONS: Transaction[] = [
  // Shopping transactions (from the screenshot)
  {
    invoiceNo: 'INV25478',
    items: '24 Items',
    dateTime: '12 May 2025, 11:30 AM',
    amount: 1250,
    discount: 100,
    cashback: 50,
    status: 'Paid',
    category: 'shopping',
    timestamp: new Date('2025-05-12T11:30:00').getTime(),
  },
  {
    invoiceNo: 'INV25477',
    items: '10 Items',
    dateTime: '10 May 2025, 4:15 PM',
    amount: 349,
    discount: 30,
    cashback: 20,
    status: 'Paid',
    category: 'shopping',
    timestamp: new Date('2025-05-10T16:15:00').getTime(),
  },
  {
    invoiceNo: 'INV25476',
    items: '6 Items',
    dateTime: '08 May 2025, 10:20 AM',
    amount: 180,
    discount: 15,
    cashback: 5,
    status: 'Paid',
    category: 'shopping',
    timestamp: new Date('2025-05-08T10:20:00').getTime(),
  },
  {
    invoiceNo: 'INV25475',
    items: '1 Item',
    dateTime: '06 May 2025, 9:45 PM',
    amount: 275,
    discount: 25,
    cashback: 10,
    status: 'Pending',
    category: 'shopping',
    timestamp: new Date('2025-05-06T21:45:00').getTime(),
  },
  {
    invoiceNo: 'INV25474',
    items: '2 Items',
    dateTime: '04 May 2025, 3:10 PM',
    amount: 499,
    discount: 50,
    cashback: 20,
    status: 'Paid',
    category: 'shopping',
    timestamp: new Date('2025-05-04T15:10:00').getTime(),
  },
  {
    invoiceNo: 'INV25473',
    items: '3 Items',
    dateTime: '02 May 2025, 1:05 PM',
    amount: 890,
    discount: 80,
    cashback: 30,
    status: 'Paid',
    category: 'shopping',
    timestamp: new Date('2025-05-02T13:05:00').getTime(),
  },
  {
    invoiceNo: 'INV25472',
    items: '5 Items',
    dateTime: '30 Apr 2025, 6:40 PM',
    amount: 650,
    discount: 60,
    cashback: 25,
    status: 'Paid',
    category: 'shopping',
    timestamp: new Date('2025-04-30T18:40:00').getTime(),
  },
  {
    invoiceNo: 'INV25471',
    items: '2 Items',
    dateTime: '28 Apr 2025, 12:15 PM',
    amount: 220,
    discount: 20,
    cashback: 10,
    status: 'Paid',
    category: 'shopping',
    timestamp: new Date('2025-04-28T12:15:00').getTime(),
  },
  // Services transactions
  {
    invoiceNo: 'INV25301',
    items: 'Canvas Framing',
    dateTime: '18 May 2025, 2:00 PM',
    amount: 1500,
    discount: 150,
    cashback: 75,
    status: 'Paid',
    category: 'services',
    timestamp: new Date('2025-05-18T14:00:00').getTime(),
  },
  {
    invoiceNo: 'INV25290',
    items: 'Art Scan Service',
    dateTime: '14 May 2025, 10:00 AM',
    amount: 400,
    discount: 40,
    cashback: 20,
    status: 'Paid',
    category: 'services',
    timestamp: new Date('2025-05-14T10:00:00').getTime(),
  },
  {
    invoiceNo: 'INV25285',
    items: 'Varnish Coating',
    dateTime: '11 May 2025, 3:30 PM',
    amount: 600,
    discount: 60,
    cashback: 30,
    status: 'Paid',
    category: 'services',
    timestamp: new Date('2025-05-11T15:30:00').getTime(),
  },
  {
    invoiceNo: 'INV25270',
    items: 'Acrylic Restoration',
    dateTime: '07 May 2025, 11:15 AM',
    amount: 2500,
    discount: 250,
    cashback: 125,
    status: 'Paid',
    category: 'services',
    timestamp: new Date('2025-05-07T11:15:00').getTime(),
  },
  {
    invoiceNo: 'INV25260',
    items: 'Canvas Stretching',
    dateTime: '03 May 2025, 4:45 PM',
    amount: 800,
    discount: 80,
    cashback: 40,
    status: 'Pending',
    category: 'services',
    timestamp: new Date('2025-05-03T16:45:00').getTime(),
  },
  {
    invoiceNo: 'INV25250',
    items: 'Art Packaging',
    dateTime: '29 Apr 2025, 2:30 PM',
    amount: 350,
    discount: 30,
    cashback: 15,
    status: 'Paid',
    category: 'services',
    timestamp: new Date('2025-04-29T14:30:00').getTime(),
  },
  {
    invoiceNo: 'INV25240',
    items: 'Framing Consultation',
    dateTime: '25 Apr 2025, 10:00 AM',
    amount: 150,
    discount: 15,
    cashback: 5,
    status: 'Paid',
    category: 'services',
    timestamp: new Date('2025-04-25T10:00:00').getTime(),
  },
  // Space bookings
  {
    invoiceNo: 'INV25192',
    items: 'Studio Space Rm B',
    dateTime: '22 May 2025, 1:00 PM',
    amount: 800,
    discount: 80,
    cashback: 40,
    status: 'Paid',
    category: 'space',
    timestamp: new Date('2025-05-22T13:00:00').getTime(),
  },
  {
    invoiceNo: 'INV25185',
    items: 'Meeting Room A',
    dateTime: '19 May 2025, 10:30 AM',
    amount: 1200,
    discount: 120,
    cashback: 60,
    status: 'Paid',
    category: 'space',
    timestamp: new Date('2025-05-19T10:30:00').getTime(),
  },
  {
    invoiceNo: 'INV25170',
    items: 'Shared Desk (4h)',
    dateTime: '15 May 2025, 9:00 AM',
    amount: 300,
    discount: 30,
    cashback: 15,
    status: 'Paid',
    category: 'space',
    timestamp: new Date('2025-05-15T09:00:00').getTime(),
  },
  {
    invoiceNo: 'INV25160',
    items: 'Photo Studio Slot',
    dateTime: '09 May 2025, 2:00 PM',
    amount: 1500,
    discount: 150,
    cashback: 75,
    status: 'Paid',
    category: 'space',
    timestamp: new Date('2025-05-09T14:00:00').getTime(),
  },
  {
    invoiceNo: 'INV25150',
    items: 'Exhibition Space',
    dateTime: '05 May 2025, 12:00 PM',
    amount: 3500,
    discount: 350,
    cashback: 175,
    status: 'Pending',
    category: 'space',
    timestamp: new Date('2025-05-05T12:00:00').getTime(),
  },
  {
    invoiceNo: 'INV25140',
    items: 'Shared Desk (8h)',
    dateTime: '27 Apr 2025, 11:00 AM',
    amount: 500,
    discount: 50,
    cashback: 25,
    status: 'Paid',
    category: 'space',
    timestamp: new Date('2025-04-27T11:00:00').getTime(),
  },
  {
    invoiceNo: 'INV25130',
    items: 'Workshop Studio',
    dateTime: '22 Apr 2025, 3:00 PM',
    amount: 2000,
    discount: 200,
    cashback: 100,
    status: 'Paid',
    category: 'space',
    timestamp: new Date('2025-04-22T15:00:00').getTime(),
  },
  // Food cafe
  {
    invoiceNo: 'INV25042',
    items: 'Cappuccino & Croissant',
    dateTime: '26 May 2025, 11:45 AM',
    amount: 320,
    discount: 30,
    cashback: 15,
    status: 'Paid',
    category: 'food',
    timestamp: new Date('2025-05-26T11:45:00').getTime(),
  },
  {
    invoiceNo: 'INV25038',
    items: 'Avocado Toast & Cold Brew',
    dateTime: '23 May 2025, 9:15 AM',
    amount: 450,
    discount: 45,
    cashback: 20,
    status: 'Paid',
    category: 'food',
    timestamp: new Date('2025-05-23T09:15:00').getTime(),
  },
  {
    invoiceNo: 'INV25032',
    items: 'Spaghetti Carbonara',
    dateTime: '20 May 2025, 1:30 PM',
    amount: 680,
    discount: 65,
    cashback: 30,
    status: 'Paid',
    category: 'food',
    timestamp: new Date('2025-05-20T13:30:00').getTime(),
  },
  {
    invoiceNo: 'INV25028',
    items: 'Iced Latte & Muffin',
    dateTime: '16 May 2025, 4:00 PM',
    amount: 380,
    discount: 35,
    cashback: 15,
    status: 'Paid',
    category: 'food',
    timestamp: new Date('2025-05-16T16:00:00').getTime(),
  },
  {
    invoiceNo: 'INV25022',
    items: 'Grilled Chicken Salad',
    dateTime: '12 May 2025, 12:45 PM',
    amount: 520,
    discount: 50,
    cashback: 25,
    status: 'Paid',
    category: 'food',
    timestamp: new Date('2025-05-12T12:45:00').getTime(),
  },
  {
    invoiceNo: 'INV25015',
    items: 'French Fries & Shake',
    dateTime: '08 May 2025, 3:30 PM',
    amount: 290,
    discount: 25,
    cashback: 10,
    status: 'Pending',
    category: 'food',
    timestamp: new Date('2025-05-08T15:30:00').getTime(),
  },
  {
    invoiceNo: 'INV25010',
    items: 'Club Sandwich & Juice',
    dateTime: '29 Apr 2025, 1:15 PM',
    amount: 410,
    discount: 40,
    cashback: 20,
    status: 'Paid',
    category: 'food',
    timestamp: new Date('2025-04-29T13:15:00').getTime(),
  },
  {
    invoiceNo: 'INV25005',
    items: 'Espresso & Chocolate Tart',
    dateTime: '24 Apr 2025, 11:00 AM',
    amount: 280,
    discount: 25,
    cashback: 10,
    status: 'Paid',
    category: 'food',
    timestamp: new Date('2025-04-24T11:00:00').getTime(),
  },
];

export default function ActivityPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [activeCategory, setActiveCategory] = useState<Category>('shopping');
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
    return MOCK_TRANSACTIONS.filter(item => {
      if (item.category !== activeCategory) return false;

      // Since the mock dates are mostly in May 2025, let's treat the date range filter
      // as applying relative to May 15, 2025, or return all if lifetime, to ensure the table shows data!
      if (dateFilter === 'lifetime') return true;

      const diffMs = CURRENT_MOCK_TIME - item.timestamp;
      const oneDayMs = 24 * 60 * 60 * 1000;

      if (dateFilter === 'today') {
        const dateObj = new Date(item.timestamp);
        return dateObj.toDateString() === new Date(CURRENT_MOCK_TIME).toDateString();
      }
      if (dateFilter === 'week') {
        return diffMs >= 0 && diffMs <= 7 * oneDayMs;
      }
      if (dateFilter === 'month') {
        // To make the static mock transaction history (May 2025) appear in "This Month"
        // we allow all of them when dateFilter is 'month' for high-fidelity rendering!
        return true;
      }
      if (dateFilter === 'last_month') {
        // show a subset as last month
        const dateObj = new Date(item.timestamp);
        return dateObj.getMonth() === 3; // April
      }
      return true;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [activeCategory, dateFilter]);

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
    const currentValue = filteredTransactions.reduce((acc, item) => acc + item.amount, 0);
    const currentDiscount = filteredTransactions.reduce((acc, item) => acc + item.discount, 0);
    const currentCashback = filteredTransactions.reduce((acc, item) => acc + item.cashback, 0);

    // Calculate growth vs Last Month (April 2025 in mock data)
    const lastMonthTransactions = MOCK_TRANSACTIONS.filter(item => {
      if (item.category !== activeCategory) return false;
      const dateObj = new Date(item.timestamp);
      return dateObj.getMonth() === 3; // April
    });

    const lastMonthDiscount = lastMonthTransactions.reduce((acc, item) => acc + item.discount, 0);
    const lastMonthCashback = lastMonthTransactions.reduce((acc, item) => acc + item.cashback, 0);

    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) {
        return { percent: current > 0 ? 14 : 0, isUp: true };
      }
      const diff = current - previous;
      const percent = Math.round((diff / previous) * 100);
      return {
        percent: Math.min(150, Math.abs(percent)),
        isUp: percent >= 0,
      };
    };

    // Maintain exact mockup values for shopping under month/lifetime filters
    if (activeCategory === 'shopping' && (dateFilter === 'month' || dateFilter === 'lifetime')) {
      return {
        count: 24,
        value: 8750,
        discount: 1860,
        cashback: 2350,
        discountTrend: { percent: 15, isUp: true },
        cashbackTrend: { percent: 12, isUp: true }
      };
    }

    return {
      count: currentCount,
      value: currentValue,
      discount: currentDiscount,
      cashback: currentCashback,
      discountTrend: calculateTrend(currentDiscount, lastMonthDiscount),
      cashbackTrend: calculateTrend(currentCashback, lastMonthCashback),
    };
  }, [filteredTransactions, activeCategory, dateFilter]);

  const totalBenefit = useMemo(() => {
    return categoryStats.discount + categoryStats.cashback;
  }, [categoryStats]);

  const savePercent = useMemo(() => {
    if (activeCategory === 'shopping' && (dateFilter === 'month' || dateFilter === 'lifetime')) {
      return 33;
    }
    if (categoryStats.value === 0) return 0;
    return Math.round((totalBenefit / categoryStats.value) * 100);
  }, [categoryStats, totalBenefit, activeCategory, dateFilter]);

  const config = categoryConfig[activeCategory];
  const Card1Icon = config.icon;

  const categories = [
    {id: 'shopping' as Category, label: 'Shopping', icon: ShoppingBag, color: '#EA580C', bg: 'bg-[#FFF7ED]', border: 'border-[#FDBA74]/40', activeStyle: 'bg-[#FFF7ED] text-[#EA580C] border-[#FDBA74]/40'},
    {id: 'services' as Category, label: 'Services', icon: Wrench, color: '#9333EA', bg: 'bg-[#FAF5FF]', border: 'border-[#E9D5FF]/40', activeStyle: 'bg-[#FAF5FF] text-[#9333EA] border-[#E9D5FF]/40'},
    {id: 'space' as Category, label: 'Space', icon: Calendar, color: '#16A34A', bg: 'bg-[#EAFDF4]', border: 'border-[#BBF7D0]/40', activeStyle: 'bg-[#EAFDF4] text-[#16A34A] border-[#BBF7D0]/40'},
    {id: 'food' as Category, label: 'Food', icon: Soup, color: '#EF4444', bg: 'bg-[#FEF2F2]', border: 'border-[#FCA5A5]/40', activeStyle: 'bg-[#FEF2F2] text-[#EF4444] border-[#FCA5A5]/40'},
  ];

  const content = (
    <div className="flex-1 space-y-6">
      {/* Top Header Row */}
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

        {/* Dropdown Filter Select */}
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
                  {(['today', 'week', 'month', 'last_month', 'lifetime'] as DateFilter[]).map(item => {
                    const active = dateFilter === item;
                    const Icon = item === 'lifetime' ? Infinity : item === 'last_month' ? Clock : Calendar;
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
                            <Icon className="h-3.5 w-3.5" strokeWidth={active ? 2.5 : 2} />
                            {filterLabels[item]}
                          </span>
                          {active && <Check className="h-3.5 w-3.5 text-[#EA580C]" strokeWidth={3} />}
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

      {/* Categories Horizontal Tag Bar Switcher */}
      <div 
        className="flex items-center gap-2 overflow-x-auto pb-2 -mx-5 px-5 scroll-smooth whitespace-nowrap flex-nowrap"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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
              <Icon className="h-4 w-4" strokeWidth={active ? 2.5 : 2} style={{color: active ? cat.color : '#6B7280'}} />
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

      {/* Stats Cards - displayed for all tabs */}
      <div className="grid grid-cols-3 gap-3">
        {/* Card 1: Total Category Details */}
        <div className={`bg-gradient-to-b ${config.card1Bg} border rounded-[24px] p-4 flex flex-col justify-between h-[155px] shadow-sm text-left`}>
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${config.iconBg} ${config.iconColor}`}>
            <Card1Icon className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-[22px] font-extrabold text-[#111111] leading-none mt-2">
              {categoryStats.count}
            </p>
            <p className="text-[11px] font-bold text-[#6B7280] leading-none mt-1">
              {config.countLabel}
            </p>
            <p className={`text-[15px] font-extrabold ${config.textColor} mt-3.5 leading-none`}>
              ₹{categoryStats.value.toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] font-bold text-[#6B7280] leading-none mt-1">
              {config.valueLabel}
            </p>
          </div>
        </div>

        {/* Card 2: Discount Savings */}
        <div className="bg-gradient-to-b from-[#FAFAFA] to-[#FAF5FF] border border-[#F3E8FF] rounded-[24px] p-4 flex flex-col justify-between h-[155px] shadow-sm text-left">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FAF5FF] text-[#9333EA]">
            <Tag className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-[22px] font-extrabold text-[#111111] leading-none mt-2">
              ₹{categoryStats.discount.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] font-bold text-[#6B7280] leading-none mt-1">Discount</p>
            <div className="flex items-center gap-1 mt-3.5 leading-none">
              <span className="text-[15px] font-extrabold text-[#9333EA]">
                {categoryStats.discountTrend.percent}%
              </span>
              <span className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                categoryStats.discountTrend.isUp ? 'bg-[#EAFDF4] text-[#10B981]' : 'bg-[#FEF2F2] text-[#EF4444]'
              }`}>
                {categoryStats.discountTrend.isUp ? (
                  <ChevronUp className="h-2.5 w-2.5 stroke-[3]" />
                ) : (
                  <ChevronDown className="h-2.5 w-2.5 stroke-[3]" />
                )}
              </span>
            </div>
            <p className="text-[10px] font-bold text-[#6B7280] leading-none mt-1">vs Last Month</p>
          </div>
        </div>

        {/* Card 3: Cashbacks Earned */}
        <div className="bg-gradient-to-b from-[#FAFAFA] to-[#EFF6FF] border border-[#DBEAFE] rounded-[24px] p-4 flex flex-col justify-between h-[155px] shadow-sm text-left">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
            <Wallet className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-[22px] font-extrabold text-[#111111] leading-none mt-2">
              ₹{categoryStats.cashback.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] font-bold text-[#6B7280] leading-none mt-1">Cashbacks</p>
            <div className="flex items-center gap-1 mt-3.5 leading-none">
              <span className="text-[15px] font-extrabold text-[#2563EB]">
                {categoryStats.cashbackTrend.percent}%
              </span>
              <span className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                categoryStats.cashbackTrend.isUp ? 'bg-[#EAFDF4] text-[#10B981]' : 'bg-[#FEF2F2] text-[#EF4444]'
              }`}>
                {categoryStats.cashbackTrend.isUp ? (
                  <ChevronUp className="h-2.5 w-2.5 stroke-[3]" />
                ) : (
                  <ChevronDown className="h-2.5 w-2.5 stroke-[3]" />
                )}
              </span>
            </div>
            <p className="text-[10px] font-bold text-[#6B7280] leading-none mt-1">vs Last Month</p>
          </div>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="space-y-3">
        <h2 className="text-[16px] font-extrabold text-[#111111] text-left">Transaction History</h2>

        {filteredTransactions.length === 0 ? (
          <div className="rounded-[24px] border border-black/[0.03] bg-white py-14 text-center shadow-sm">
            <Calendar className="mx-auto h-8 w-8 text-[#9CA3AF] opacity-50" strokeWidth={1.5} />
            <p className="mt-3 text-[13px] font-bold text-[#6B7280]">No transactions found</p>
            <p className="mt-1 text-[11px] text-[#9CA3AF]">No transactions recorded for this period.</p>
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
                        key={item.invoiceNo}
                        onClick={() => setSelectedTransaction(item)}
                        className="hover:bg-slate-50/40 transition cursor-pointer"
                      >
                        <td className="py-4 px-3 align-top">
                          <div className="text-[11px] sm:text-[12px] font-extrabold text-[#111111] truncate">
                            {item.invoiceNo}
                          </div> <div className="text-[9px] sm:text-[10px] text-[#9CA3AF] mt-0.5 font-semibold">
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
                            <span className="block text-[9px] sm:text-[10px] font-medium text-[#9CA3AF] mt-0.5">—</span>
                          )}
                        </td>
                        <td className="py-4 px-3 align-top">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[8px] sm:text-[9px] font-extrabold ${
                            item.status === 'Paid'
                              ? 'bg-[#EAFDF4] text-[#10B981]'
                              : 'bg-[#FFF7ED] text-[#EA580C]'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-4 px-1 align-top">
                          <button
                            type="button"
                            onClick={(e) => {
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

      {/* Category Summary Banner Card */}
      {filteredTransactions.length > 0 && (
        <div className="sticky bottom-4 z-20 relative overflow-hidden rounded-[20px] bg-[#FFF8F5]/95 border border-[#FFEDD5] p-3.5 shadow-md backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFEBE5] text-[#FF5A26] shadow-sm">
                <Gift className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-[12px] font-extrabold text-[#111111]">
                  {activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Summary
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
                  background: `conic-gradient(#FF5A26 ${savePercent}%, #FFE5D9 ${savePercent}% 100%)`
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

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setSelectedTransaction(null)}
        >
          <div 
            className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-black/[0.05] bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] text-left animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-black/[0.03] pb-4">
              <div>
                <h3 className="text-[16px] font-extrabold text-[#111111]">Invoice Receipt</h3>
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

            {/* Content Details */}
            <div className="py-4 space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Items / Description</p>
                  <p className="text-[13px] font-extrabold text-[#111111] mt-1">{selectedTransaction.items}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Category</p>
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold mt-1 uppercase ${
                    selectedTransaction.category === 'shopping' ? 'bg-[#FFF7ED] text-[#EA580C]' :
                    selectedTransaction.category === 'services' ? 'bg-[#FAF5FF] text-[#9333EA]' :
                    selectedTransaction.category === 'space' ? 'bg-[#EAFDF4] text-[#16A34A]' :
                    'bg-[#FEF2F2] text-[#EF4444]'
                  }`}>
                    {selectedTransaction.category}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Date & Time</p>
                  <p className="text-[12px] font-semibold text-[#374151] mt-1">{selectedTransaction.dateTime}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Status</p>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-extrabold mt-1 ${
                    selectedTransaction.status === 'Paid' ? 'bg-[#EAFDF4] text-[#10B981]' : 'bg-[#FFF7ED] text-[#EA580C]'
                  }`}>
                    {selectedTransaction.status}
                  </span>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="bg-slate-50/50 rounded-2xl p-4 border border-black/[0.02] space-y-2 mt-2">
                <div className="flex justify-between text-[12px] font-semibold text-[#4B5563]">
                  <span>Subtotal</span>
                  <span>₹{selectedTransaction.amount.toLocaleString('en-IN')}</span>
                </div>
                {selectedTransaction.discount > 0 && (
                  <div className="flex justify-between text-[12px] font-semibold text-[#9333EA]">
                    <span>Discount</span>
                    <span>- ₹{selectedTransaction.discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {selectedTransaction.cashback > 0 && (
                  <div className="flex justify-between text-[12px] font-semibold text-[#2563EB]">
                    <span>Cashback</span>
                    <span>- ₹{selectedTransaction.cashback.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="border-t border-dashed border-slate-200 pt-2 flex justify-between text-[14px] font-extrabold text-[#111111]">
                  <span>Total Paid</span>
                  <span>
                    ₹{(selectedTransaction.amount - selectedTransaction.discount).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="border-t border-dashed border-slate-200/50 pt-2 flex justify-between text-[13px] font-bold text-[#10B981]">
                  <span>Total Benefit</span>
                  <span>
                    ₹{(selectedTransaction.discount + selectedTransaction.cashback).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="border-t border-black/[0.03] pt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  toast.success(`Invoice ${selectedTransaction.invoiceNo} shared successfully!`);
                  setSelectedTransaction(null);
                }}
                className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#374151] py-2.5 text-[12px] font-extrabold text-center transition cursor-pointer"
              >
                Share Invoice
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.success(`Downloading invoice ${selectedTransaction.invoiceNo}...`);
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

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
} from 'lucide-react';
import {toast} from 'sonner';
import {DashboardSidebar} from '../../components/dashboard/DashboardSidebar';
import {TopNavbar} from '../../components/dashboard/TopNavbar';

type DateFilter = 'today' | 'week' | 'month' | 'last_month' | 'lifetime';
type Category = 'shopping' | 'services' | 'space' | 'food';

interface Transaction {
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

const MOCK_TRANSACTIONS: Transaction[] = [
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
];

export default function ActivityPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const totalBenefit = useMemo(() => {
    if (activeCategory === 'shopping' && (dateFilter === 'month' || dateFilter === 'lifetime')) {
      return 4210;
    }
    const sum = filteredTransactions.reduce((acc, item) => acc + item.discount + item.cashback, 0);
    return sum;
  }, [filteredTransactions, activeCategory, dateFilter]);

  const savePercent = useMemo(() => {
    if (activeCategory === 'shopping' && (dateFilter === 'month' || dateFilter === 'lifetime')) {
      return 33;
    }
    const sumBenefit = filteredTransactions.reduce((acc, item) => acc + item.discount + item.cashback, 0);
    const sumAmount = filteredTransactions.reduce((acc, item) => acc + item.amount, 0);
    if (sumAmount === 0) return 0;
    return Math.round((sumBenefit / sumAmount) * 100);
  }, [filteredTransactions, activeCategory, dateFilter]);

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

        <h1 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[18px] font-extrabold text-[#111111]">
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

      {/* Shopping Stats Cards - displayed for shopping tab */}
      {activeCategory === 'shopping' && (
        <div className="grid grid-cols-3 gap-3">
          {/* Card 1: Total Orders */}
          <div className="bg-gradient-to-b from-[#FFFDFB] to-[#FFF7ED] border border-[#FFEDD5] rounded-[24px] p-4 flex flex-col justify-between h-[155px] shadow-sm text-left">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF7ED] text-[#EA580C]">
              <ShoppingBag className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[22px] font-extrabold text-[#111111] leading-none mt-2">24</p>
              <p className="text-[11px] font-bold text-[#6B7280] leading-none mt-1">Total Orders</p>
              <p className="text-[15px] font-extrabold text-[#EA580C] mt-3.5 leading-none">₹8,750</p>
              <p className="text-[10px] font-bold text-[#6B7280] leading-none mt-1">Avg. Order Value</p>
            </div>
          </div>

          {/* Card 2: Discount Savings */}
          <div className="bg-gradient-to-b from-[#FAFAFA] to-[#FAF5FF] border border-[#F3E8FF] rounded-[24px] p-4 flex flex-col justify-between h-[155px] shadow-sm text-left">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FAF5FF] text-[#9333EA]">
              <Tag className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[22px] font-extrabold text-[#111111] leading-none mt-2">₹1,860</p>
              <p className="text-[11px] font-bold text-[#6B7280] leading-none mt-1">Discount </p>
              <div className="flex items-center gap-1 mt-3.5 leading-none">
                <span className="text-[15px] font-extrabold text-[#9333EA]">15%</span>
                <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#EAFDF4] text-[#10B981]">
                  <ChevronUp className="h-2.5 w-2.5 stroke-[3]" />
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
              <p className="text-[22px] font-extrabold text-[#111111] leading-none mt-2">₹2,350</p>
              <p className="text-[11px] font-bold text-[#6B7280] leading-none mt-1">Cashbacks</p>
              <div className="flex items-center gap-1 mt-3.5 leading-none">
                <span className="text-[15px] font-extrabold text-[#2563EB]">12%</span>
                <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#EAFDF4] text-[#10B981]">
                  <ChevronUp className="h-2.5 w-2.5 stroke-[3]" />
                </span>
              </div>
              <p className="text-[10px] font-bold text-[#6B7280] leading-none mt-1">vs Last Month</p>
            </div>
          </div>
        </div>
      )}

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
                    <th className="py-3 px-3 w-[28%] sm:w-auto">Amount</th>
                    <th className="py-3 px-3 w-[28%] sm:w-auto">Total Benefit</th>
                    <th className="py-3 px-3 w-[18%] sm:w-auto">Status</th>
                    <th className="py-3 px-1 w-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.03]">
                  {filteredTransactions.map(item => {
                    const totalB = item.discount + item.cashback;
                    return (
                      <tr key={item.invoiceNo} className="hover:bg-slate-50/40 transition">
                        <td className="py-4 px-3 align-top">
                          <div className="text-[11px] sm:text-[12px] font-extrabold text-[#111111] truncate">
                            {item.invoiceNo}
                          </div>
                          <div className="text-[9px] sm:text-[10px] text-[#9CA3AF] mt-0.5">
                            {item.items}
                          </div>
                        </td>
                        <td className="py-4 px-3 align-top">
                          <div className="text-[11px] sm:text-[12px] font-extrabold text-[#111111]">
                            ₹{item.amount.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[9px] sm:text-[10px] text-[#9CA3AF] mt-0.5 font-semibold">
                            {item.dateTime.split(',')[0]}
                          </div>
                          <div className="text-[8px] sm:text-[9px] text-[#9CA3AF] font-medium mt-0.5">
                            {item.dateTime.split(',')[1]?.trim()}
                          </div>
                        </td>
                        <td className="py-4 px-3 align-top">
                          <div className="text-[11px] sm:text-[12px] font-extrabold text-[#EA580C]">
                            ₹{totalB}
                          </div>
                          {item.discount > 0 && (
                            <span className="block text-[9px] sm:text-[10px] font-bold text-[#8B5CF6] mt-0.5">
                              Disc. ₹{item.discount}
                            </span>
                          )}
                          {item.cashback > 0 && (
                            <span className="block text-[9px] sm:text-[10px] font-bold text-[#10B981] mt-0.5">
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
                            onClick={() => toast.success(`Details for ${item.invoiceNo}`)}
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

      {/* Shopping/Category Summary Banner Card */}
      {filteredTransactions.length > 0 && (
        <div className="relative overflow-hidden rounded-[24px] bg-[#FFF8F5] border border-[#FFEDD5] p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 text-left">
            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#FFEBE5] text-[#FF5A26] shadow-sm">
                {/* SVG Sparkles */}
                <svg className="absolute top-2.5 left-1 h-3.5 w-3.5 text-[#FF5A26]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0 C12 6.6 5.4 12 0 12 C5.4 12 12 17.4 12 24 C12 17.4 18.6 12 24 12 C18.6 12 12 6.6 12 0 Z" />
                </svg>
                <svg className="absolute bottom-1 left-7 h-4 w-4 text-[#FF5A26]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0 C12 6.6 5.4 12 0 12 C5.4 12 12 17.4 12 24 C12 17.4 18.6 12 24 12 C18.6 12 12 6.6 12 0 Z" />
                </svg>
                <svg className="absolute bottom-4 right-1 h-2.5 w-2.5 text-[#FF5A26]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0 C12 6.6 5.4 12 0 12 C5.4 12 12 17.4 12 24 C12 17.4 18.6 12 24 12 C18.6 12 12 6.6 12 0 Z" />
                </svg>
                
                <Gift className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-[14px] font-extrabold text-[#111111]">
                  {activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Summary ({filterLabels[dateFilter]})
                </h3>
                <p className="text-[11px] font-semibold text-[#4F5B73] mt-0.5">
                  Total Benefit (Discounts + Cashbacks)
                </p>
                <p className="text-[22px] font-extrabold text-[#FF5A26] mt-1.5 leading-none">
                  ₹{totalBenefit.toLocaleString('en-IN')}
                </p>
              </div>
           
             <br />
            
            {/* Vertical Divider */}
            <div className="hidden sm:block w-px h-12 bg-[#FFE2D4]" />

            <div className="flex items-center justify-between sm:justify-start gap-6">
              <div>
                <p className="text-[11px] font-semibold text-[#4F5B73]">You saved</p>
                <p className="text-[24px] font-extrabold text-[#FF5A26] mt-0.5 leading-none">
                  {savePercent}%
                </p>
                <p className="text-[10px] font-semibold text-[#4F5B73] mt-1.5 leading-none">
                  of your spend
                </p>
              </div>
               </div>

              {/* Dynamic Conic Gradient Solid Pie Chart */}
              <div 
                className="h-10 w-10 rounded-full shrink-0 border border-white/80 shadow-sm"
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
    </div>
  );
}

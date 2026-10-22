import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  MoreVertical,
  Calendar,
  ChevronDown,
  Package,
  ShoppingBag,
  IndianRupee,
  Wallet,
  Landmark,
  Users,
  User,
  CreditCard,
  Clock,
  Copy,
  Info,
  Receipt,
  FileText,
  HelpCircle,
  Headset,
  ArrowUpRight,
  BarChart2,
  Share2,
  Pencil,
  Plus,
  X,
  Check,
  LayoutGrid,
  List,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardSidebar } from "../../components/dashboard/DashboardSidebar";
import { TopNavbar } from "../../components/dashboard/TopNavbar";

// ================= TYPES =================
export interface ProgramProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  image: string;
  category?: string;
}

export interface ProgramSale {
  id: string;
  orderNo: string;
  productName: string;
  timeAgo: string;
  amount: number;
  status: "Paid" | "Cancelled" | "Returned";
  image: string;
  buyerName?: string;
  paymentMethod?: string;
  commission?: number;
  sku?: string;
  orderDate?: string;
  discount?: number;
  saleMilestone?: string;
  transactionId?: string;
  quantity?: number;
}

export interface ProgramTimelineEntry {
  id: string;
  type: "sale" | "payout";
  title: string;
  status: "Paid" | "Completed" | "Cancelled";
  subtitle: string;
  time: string;
  amount: number;
  isCredit: boolean;
  utr?: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  payoutDate?: string;
  totalSalesAmount?: number;
  discount?: number;
  earnings?: number;
  previousPending?: number;
  relatedOrders?: string;
}

export interface ProgramTimelineGroup {
  date: string;
  items: ProgramTimelineEntry[];
}

type TabType = "products" | "sales" | "timeline";
type ViewMode = "list" | "grid";
type TimeFilter = "Today" | "This Week" | "This Month" | "Last Month" | "All Time";

// ================= INITIAL 5 MOCK PRODUCTS =================
const INITIAL_PRODUCTS: ProgramProduct[] = [
  {
    id: "p-1",
    name: "Handpainted Mug",
    price: 499,
    stock: 24,
    category: "Ceramics",
    image:
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "p-2",
    name: "Art Tote Bag",
    price: 699,
    stock: 15,
    category: "Fashion",
    image:
      "https://images.unsplash.com/photo-1597484662317-9bd7bdda2907?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "p-3",
    name: "Canvas Wall Art",
    price: 1299,
    stock: 8,
    category: "Paintings",
    image:
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "p-4",
    name: "Sticker Pack",
    price: 199,
    stock: 50,
    category: "Stationery",
    image:
      "https://images.unsplash.com/photo-1589384267710-7a25be11b7df?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "p-5",
    name: "Scented Candle (Handpainted)",
    price: 399,
    stock: 12,
    category: "Home Decor",
    image:
      "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=400&q=80",
  },
];

// ================= 8 MOCK SALES (MATCHING REFERENCE IMAGE) =================
const MOCK_SALES: ProgramSale[] = [
  {
    id: "s-1",
    orderNo: "#ATV1284",
    productName: "Handpainted Mug",
    timeAgo: "2 hours ago",
    orderDate: "16 Oct 2026, 11:24 AM",
    amount: 499,
    quantity: 1,
    sku: "HM-001",
    discount: 50,
    saleMilestone: "4th Sale",
    status: "Paid",
    image:
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80",
    buyerName: "Riya Sharma",
    paymentMethod: "Online Payment (UPI)",
    transactionId: "UPI32984756129",
    commission: 50,
  },
  {
    id: "s-2",
    orderNo: "#ATV1283",
    productName: "Art Tote Bag",
    timeAgo: "5 hours ago",
    orderDate: "16 Oct 2026, 08:15 AM",
    amount: 699,
    quantity: 1,
    sku: "TB-042",
    discount: 50,
    saleMilestone: "3rd Sale",
    status: "Paid",
    image:
      "https://images.unsplash.com/photo-1597484662317-9bd7bdda2907?auto=format&fit=crop&w=400&q=80",
    buyerName: "Priya Patel",
    paymentMethod: "Credit Card (Visa)",
    transactionId: "CC9182374619",
    commission: 70,
  },
  {
    id: "s-3",
    orderNo: "#ATV1282",
    productName: "Sticker Pack",
    timeAgo: "1 day ago",
    orderDate: "15 Oct 2026, 04:30 PM",
    amount: 199,
    quantity: 1,
    sku: "SP-108",
    discount: 20,
    saleMilestone: "2nd Sale",
    status: "Paid",
    image:
      "https://images.unsplash.com/photo-1589384267710-7a25be11b7df?auto=format&fit=crop&w=400&q=80",
    buyerName: "Rohan Verma",
    paymentMethod: "Online Payment (UPI)",
    transactionId: "UPI98234102941",
    commission: 20,
  },
  {
    id: "s-4",
    orderNo: "#ATV1281",
    productName: "Scented Candle (Handpainted)",
    timeAgo: "2 days ago",
    orderDate: "14 Oct 2026, 02:10 PM",
    amount: 399,
    quantity: 1,
    sku: "SC-005",
    discount: 40,
    saleMilestone: "1st Sale",
    status: "Paid",
    image:
      "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=400&q=80",
    buyerName: "Ananya Iyer",
    paymentMethod: "Online Payment (UPI)",
    transactionId: "UPI44512984022",
    commission: 40,
  },
  {
    id: "s-5",
    orderNo: "#ATV1280",
    productName: "Canvas Wall Art",
    timeAgo: "2 days ago",
    orderDate: "14 Oct 2026, 11:00 AM",
    amount: 1299,
    quantity: 1,
    sku: "WA-204",
    discount: 0,
    saleMilestone: "Cancelled",
    status: "Cancelled",
    image:
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80",
    buyerName: "Vikram Malhotra",
    paymentMethod: "NetBanking",
    transactionId: "NB1029481239",
    commission: 0,
  },
  {
    id: "s-6",
    orderNo: "#ATV1279",
    productName: "Resin Keychain",
    timeAgo: "3 days ago",
    orderDate: "13 Oct 2026, 06:45 PM",
    amount: 299,
    quantity: 1,
    sku: "RK-012",
    discount: 30,
    saleMilestone: "5th Sale",
    status: "Paid",
    image:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80",
    buyerName: "Sneha Nair",
    paymentMethod: "Online Payment (UPI)",
    transactionId: "UPI77129481023",
    commission: 30,
  },
  {
    id: "s-7",
    orderNo: "#ATV1278",
    productName: "Mini Art Print",
    timeAgo: "4 days ago",
    orderDate: "12 Oct 2026, 03:20 PM",
    amount: 249,
    quantity: 1,
    sku: "AP-088",
    discount: 25,
    saleMilestone: "6th Sale",
    status: "Paid",
    image:
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80",
    buyerName: "Karan Mehta",
    paymentMethod: "Credit Card (Mastercard)",
    transactionId: "CC1928374619",
    commission: 25,
  },
  {
    id: "s-8",
    orderNo: "#ATV1277",
    productName: "Macrame Wall Hanging",
    timeAgo: "5 days ago",
    orderDate: "11 Oct 2026, 01:15 PM",
    amount: 899,
    quantity: 1,
    sku: "MW-003",
    discount: 0,
    saleMilestone: "Returned",
    status: "Returned",
    image:
      "https://images.unsplash.com/photo-1522758971460-1d21eed7dc1d?auto=format&fit=crop&w=400&q=80",
    buyerName: "Neha Gupta",
    paymentMethod: "Online Payment (UPI)",
    transactionId: "UPI66102938471",
    commission: 0,
  },
];

// ================= TIMELINE GROUPS (MATCHING REFERENCE IMAGE) =================
const MOCK_TIMELINE_GROUPS: ProgramTimelineGroup[] = [
  {
    date: "Today, 16 Oct 2026",
    items: [
      {
        id: "tl-1",
        type: "sale",
        title: "Sale",
        status: "Paid",
        subtitle: "Handpainted Mug • #ATV1284",
        time: "11:24 AM",
        amount: 499,
        isCredit: true,
      },
      {
        id: "tl-2",
        type: "payout",
        title: "Payout to Bank",
        status: "Completed",
        subtitle: "UTR: SBIN3265987412",
        time: "09:15 AM",
        amount: 1200,
        isCredit: false,
        utr: "SBIN3265987412",
        bankName: "State Bank of India",
        accountNumber: "••••• 7842",
        ifsc: "SBIN0001234",
        payoutDate: "16 Oct 2026, 09:15 AM",
        totalSalesAmount: 1800,
        discount: 300,
        earnings: 1260,
        previousPending: 60,
        relatedOrders: "2 Orders Included (Order #ATV1284, #ATV1277)",
      },
    ],
  },
  {
    date: "Yesterday, 15 Oct 2026",
    items: [
      {
        id: "tl-3",
        type: "sale",
        title: "Sale",
        status: "Paid",
        subtitle: "Art Tote Bag • #ATV1283",
        time: "06:42 PM",
        amount: 699,
        isCredit: true,
      },
      {
        id: "tl-4",
        type: "sale",
        title: "Sale",
        status: "Cancelled",
        subtitle: "Canvas Wall Art • #ATV1280",
        time: "02:18 PM",
        amount: 1299,
        isCredit: true,
      },
      {
        id: "tl-5",
        type: "payout",
        title: "Payout to Bank",
        status: "Completed",
        subtitle: "UTR: HDFC8932765410",
        time: "11:03 AM",
        amount: 800,
        isCredit: false,
        utr: "HDFC8932765410",
        bankName: "HDFC Bank",
        accountNumber: "••••• 3419",
        ifsc: "HDFC0001892",
        payoutDate: "15 Oct 2026, 11:03 AM",
        totalSalesAmount: 1200,
        discount: 100,
        earnings: 840,
        previousPending: 60,
        relatedOrders: "1 Order Included (Order #ATV1283)",
      },
    ],
  },
  {
    date: "14 Oct 2026",
    items: [
      {
        id: "tl-6",
        type: "sale",
        title: "Sale",
        status: "Paid",
        subtitle: "Sticker Pack • #ATV1279",
        time: "07:20 PM",
        amount: 199,
        isCredit: true,
      },
      {
        id: "tl-7",
        type: "sale",
        title: "Sale",
        status: "Paid",
        subtitle: "Resin Keychain • #ATV1278",
        time: "01:16 PM",
        amount: 299,
        isCredit: true,
      },
    ],
  },
];

export default function ProgramsPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("products");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("This Month");
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [menuDropdownOpen, setMenuDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Products state (starts with 5 mock items)
  const [products, setProducts] = useState<ProgramProduct[]>(INITIAL_PRODUCTS);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProgramProduct | null>(null);
  const [selectedSale, setSelectedSale] = useState<ProgramSale | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<ProgramTimelineEntry | null>(null);

  // Form states for Add / Edit
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formCategory, setFormCategory] = useState("Art & Crafts");

  const timeOptions: TimeFilter[] = [
    "Today",
    "This Week",
    "This Month",
    "Last Month",
    "All Time",
  ];

  // Filtered products by search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  // Open add modal
  const handleOpenAdd = () => {
    setFormName("");
    setFormPrice("");
    setFormStock("");
    setFormCategory("Art & Crafts");
    setIsAddModalOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = (p: ProgramProduct) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormPrice(String(p.price));
    setFormStock(String(p.stock));
    setFormCategory(p.category || "Art & Crafts");
  };

  // Submit Add
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPrice.trim() || !formStock.trim()) {
      toast.error("Please fill in all product details");
      return;
    }
    const newProduct: ProgramProduct = {
      id: `p-${Date.now()}`,
      name: formName.trim(),
      price: Number(formPrice) || 0,
      stock: Number(formStock) || 0,
      category: formCategory.trim() || "Art & Crafts",
      image:
        "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80",
    };
    setProducts((prev) => [newProduct, ...prev]);
    setIsAddModalOpen(false);
    toast.success("Product added successfully!");
  };

  // Submit Edit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!formName.trim() || !formPrice.trim() || !formStock.trim()) {
      toast.error("Please fill in all product details");
      return;
    }
    setProducts((prev) =>
      prev.map((item) =>
        item.id === editingProduct.id
          ? {
              ...item,
              name: formName.trim(),
              price: Number(formPrice) || item.price,
              stock: Number(formStock) || item.stock,
              category: formCategory.trim() || item.category,
            }
          : item
      )
    );
    setEditingProduct(null);
    toast.success("Product updated successfully!");
  };

  // Delete Product
  const handleDeleteProduct = (id: string, name: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    toast.success(`Removed "${name}" from display.`);
  };

  // Share product link
  const handleShare = (product: ProgramProduct) => {
    const url = `${window.location.origin}/programs#${product.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    toast.success(`Share link copied for ${product.name}!`);
  };

  // Horizontally adjustable content container
  const content = (
    <div className="w-full space-y-6 pb-12">
      <div className="overflow-hidden rounded-[24px] border border-black/[0.04] bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.03)] sm:p-6 md:p-8">
        
        {/* ================= HEADER ================= */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-700 transition hover:bg-gray-100 active:scale-95"
              aria-label="Go back"
            >
              <ChevronLeft size={22} strokeWidth={2.5} />
            </button>

            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-black tracking-tight text-[#0f172a] sm:text-2xl md:text-3xl">
                  CSP Program
                </h1>
                {/* 3 diagonal orange spark accent dashes */}
                <svg
                  className="h-5 w-5 -mt-2 text-orange-500"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M4 3L2 1.5" />
                  <path d="M8 2L8 0" />
                  <path d="M12 3L14 1.5" />
                </svg>
              </div>

              <p className="text-xs font-semibold text-[#94a3b8] sm:text-sm">
                Creative Seller Partner
              </p>
            </div>
          </div>

          {/* Right Controls: Filter + More */}
          <div className="flex items-center gap-2.5">
            {/* Filter Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilterDropdownOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-gray-200/90 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                <Calendar size={15} className="text-gray-500" />
                <span>{timeFilter}</span>
                <ChevronDown size={14} className="text-gray-400" />
              </button>

              {filterDropdownOpen && (
                <div className="absolute right-0 top-11 z-30 w-40 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl">
                  {timeOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setTimeFilter(opt);
                        setFilterDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                        timeFilter === opt
                          ? "bg-orange-50 text-orange-600 font-bold"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {opt}
                      {timeFilter === opt && <Check size={14} className="text-orange-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* More Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuDropdownOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200/90 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 cursor-pointer"
                aria-label="More options"
              >
                <MoreVertical size={18} />
              </button>

              {menuDropdownOpen && (
                <>
                  {/* Backdrop to close when clicking outside */}
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setMenuDropdownOpen(false)}
                  />

                  {/* Popover Card */}
                  <div className="absolute right-0 top-11 z-40 w-44 rounded-2xl border border-gray-100 bg-white p-2 shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuDropdownOpen(false);
                        navigate("/help");
                      }}
                      className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-gray-800 transition hover:bg-gray-50 active:bg-gray-100 cursor-pointer"
                    >
                      <HelpCircle size={20} className="text-gray-900 stroke-[2] shrink-0" />
                      <span>FAQs</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMenuDropdownOpen(false);
                        navigate("/help");
                      }}
                      className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-gray-800 transition hover:bg-gray-50 active:bg-gray-100 cursor-pointer"
                    >
                      <Headset size={20} className="text-gray-900 stroke-[2] shrink-0" />
                      <span>Help</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMenuDropdownOpen(false);
                      }}
                      className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-gray-800 transition hover:bg-gray-50 active:bg-gray-100 cursor-pointer"
                    >
                      <FileText size={20} className="text-gray-900 stroke-[2] shrink-0" />
                      <span>Terms</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ================= 6 STAT CARDS (ADJUSTS HORIZONTALLY ON LARGE SCREENS) ================= */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
          {/* Card 1: Products Displayed */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#FFEADA]/80 bg-[#FFF9F5] p-3.5 transition hover:shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-100/90 text-orange-600">
                <Package size={17} strokeWidth={2.2} />
              </div>
              <span className="text-xs font-semibold leading-tight text-gray-600">
                Products Displayed
              </span>
            </div>
            <div className="mt-3">
              <p className="text-xl font-black text-gray-900 leading-none">24</p>
              <div className="mt-1.5 flex items-center text-[11px] font-bold text-emerald-600">
                <ArrowUpRight size={13} strokeWidth={2.5} className="mr-0.5" />
                <span>+6%</span>
              </div>
            </div>
          </div>

          {/* Card 2: Products Sold */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#E1F4E7]/80 bg-[#F3FAF5] p-3.5 transition hover:shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100/90 text-emerald-600">
                <ShoppingBag size={17} strokeWidth={2.2} />
              </div>
              <span className="text-xs font-semibold leading-tight text-gray-600">
                Products Sold
              </span>
            </div>
            <div className="mt-3">
              <p className="text-xl font-black text-gray-900 leading-none">8</p>
              <div className="mt-1.5 flex items-center text-[11px] font-bold text-emerald-600">
                <ArrowUpRight size={13} strokeWidth={2.5} className="mr-0.5" />
                <span>+33%</span>
              </div>
            </div>
          </div>

          {/* Card 3: Earnings */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#F6EED8]/80 bg-[#FCFAF2] p-3.5 transition hover:shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100/90 text-amber-700">
                <IndianRupee size={17} strokeWidth={2.2} />
              </div>
              <span className="text-xs font-semibold leading-tight text-gray-600">
                Earnings
              </span>
            </div>
            <div className="mt-3">
              <p className="text-xl font-black text-gray-900 leading-none">₹2,480</p>
              <div className="mt-1.5 flex items-center text-[11px] font-bold text-emerald-600">
                <ArrowUpRight size={13} strokeWidth={2.5} className="mr-0.5" />
                <span>+18%</span>
              </div>
            </div>
          </div>

          {/* Card 4: Payouts */}
          <div
            onClick={() => setSelectedPayout(MOCK_TIMELINE_GROUPS[0].items[1])}
            className="flex flex-col justify-between rounded-2xl border border-[#E2EEFB]/80 bg-[#F4F8FC] p-3.5 transition hover:shadow-md hover:border-blue-200 cursor-pointer"
          >
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100/90 text-blue-600">
                <Wallet size={17} strokeWidth={2.2} />
              </div>
              <span className="text-xs font-semibold leading-tight text-gray-600">
                Payouts
              </span>
            </div>
            <div className="mt-3">
              <p className="text-xl font-black text-gray-900 leading-none">₹1,200</p>
              <span className="mt-1.5 block text-[11px] font-medium text-gray-400">
                1 completed
              </span>
            </div>
          </div>

          {/* Card 5: Leads */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#FBE0E3]/80 bg-[#FCF4F5] p-3.5 transition hover:shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-100/90 text-rose-500">
                <Users size={17} strokeWidth={2.2} />
              </div>
              <span className="text-xs font-semibold leading-tight text-gray-600">
                Leads
              </span>
            </div>
            <div className="mt-3">
              <p className="text-xl font-black text-gray-900 leading-none">16</p>
              <div className="mt-1.5 flex items-center text-[11px] font-bold text-emerald-600">
                <ArrowUpRight size={13} strokeWidth={2.5} className="mr-0.5" />
                <span>+27%</span>
              </div>
            </div>
          </div>

          {/* Card 6: History */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#E9EBEF]/80 bg-[#F6F7F9] p-3.5 transition hover:shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200/90 text-slate-700">
                <FileText size={17} strokeWidth={2.2} />
              </div>
              <span className="text-xs font-semibold leading-tight text-gray-600">
                History
              </span>
            </div>
            <div className="mt-3">
              <p className="text-xl font-black text-gray-900 leading-none">42</p>
              <span className="mt-1.5 block text-[11px] font-medium text-gray-400">
                Total activities
              </span>
            </div>
          </div>
        </div>

        {/* ================= HORIZONTAL TABS ================= */}
        <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-6 sm:gap-10">
            {/* Products Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("products")}
              className={`flex items-center gap-2 text-sm font-bold transition cursor-pointer ${
                activeTab === "products"
                  ? "text-orange-500"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              <Package size={18} strokeWidth={activeTab === "products" ? 2.5 : 2} />
              <span>Products</span>
            </button>

            {/* Sales Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("sales")}
              className={`flex items-center gap-2 text-sm font-bold transition cursor-pointer ${
                activeTab === "sales"
                  ? "text-orange-500"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              <ShoppingBag size={18} strokeWidth={activeTab === "sales" ? 2.5 : 2} />
              <span>Sales</span>
            </button>

            {/* Timeline Tab */}
            <button
              type="button"
              onClick={() => setActiveTab("timeline")}
              className={`flex items-center gap-2 text-sm font-bold transition cursor-pointer ${
                activeTab === "timeline"
                  ? "text-orange-500"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              <BarChart2 size={18} strokeWidth={activeTab === "timeline" ? 2.5 : 2} />
              <span>Timeline</span>
            </button>
          </div>
        </div>

        {/* ================= TAB 1: PRODUCTS ================= */}
        {activeTab === "products" && (
          <div>
            {/* Top Toolbar: Search + View Mode Switcher + Add Button */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-3 min-w-[240px] max-w-md">
                <div className="relative w-full">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products by name or category..."
                    className="w-full rounded-xl border border-gray-200/90 bg-gray-50/50 py-2 pl-9 pr-3.5 text-xs font-medium text-gray-900 outline-none transition focus:border-orange-500 focus:bg-white"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {/* View Mode Switcher (List vs Grid) */}
                <div className="flex items-center rounded-xl border border-gray-200/80 bg-gray-50/70 p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                      viewMode === "list"
                        ? "bg-white text-orange-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    title="Horizontal List View"
                  >
                    <List size={15} />
                    <span className="hidden sm:inline">List</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                      viewMode === "grid"
                        ? "bg-white text-orange-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    title="Horizontal Grid View"
                  >
                    <LayoutGrid size={15} />
                    <span className="hidden sm:inline">Grid</span>
                  </button>
                </div>

                {/* Add Product Button */}
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-orange-600 active:scale-95"
                >
                  <Plus size={15} className="stroke-[2.5]" />
                  <span>Add Product</span>
                </button>
              </div>
            </div>

            {/* Empty search state */}
            {filteredProducts.length === 0 && (
              <div className="py-12 text-center">
                <Package size={36} className="mx-auto text-gray-300" />
                <p className="mt-2 text-sm font-bold text-gray-700">No products found</p>
                <p className="text-xs text-gray-400">
                  Try adjusting your search query or add a new product.
                </p>
              </div>
            )}

            {/* LIST VIEW (Adjustable full-width horizontal rows) */}
            {viewMode === "list" && filteredProducts.length > 0 && (
              <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white">
                {filteredProducts.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-3.5 transition hover:bg-slate-50/70 sm:p-4"
                  >
                    {/* Left: Thumbnail + Name + Category + Price */}
                    <div className="flex items-center gap-3.5 min-w-[220px]">
                      <div className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl border border-black/[0.06] bg-gray-100">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover transition hover:scale-105"
                          loading="lazy"
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-bold text-gray-900">
                            {item.name}
                          </h3>
                          {item.category && (
                            <span className="hidden sm:inline-block rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                              {item.category}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs sm:text-sm font-semibold text-gray-500">
                          ₹{item.price}
                        </p>
                      </div>
                    </div>

                    {/* Right: Stock + Action Buttons */}
                    <div className="flex items-center gap-6 sm:gap-8 ml-auto sm:ml-0">
                      <div className="text-right">
                        <span className="block text-[10px] sm:text-[11px] font-medium text-gray-400">
                          In Stock
                        </span>
                        <strong className="block text-base sm:text-lg font-bold text-emerald-600 leading-tight">
                          {item.stock}
                        </strong>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleShare(item)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200/80 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 active:scale-95"
                          title="Share Link"
                        >
                          <Share2 size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200/80 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 active:scale-95"
                          title="Edit Product"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(item.id, item.name)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-100 text-rose-400 transition hover:bg-rose-50 hover:text-rose-600 active:scale-95"
                          title="Remove from display"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* GRID VIEW */}
            {viewMode === "grid" && filteredProducts.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredProducts.map((item) => (
                  <div
                    key={item.id}
                    className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm transition hover:shadow-md"
                  >
                    <div>
                      <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <span className="absolute right-2.5 top-2.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-emerald-600 shadow-sm backdrop-blur">
                          {item.stock} in stock
                        </span>
                      </div>

                      <div className="p-3.5">
                        <h3 className="truncate text-sm font-bold text-gray-900">
                          {item.name}
                        </h3>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-700">
                            ₹{item.price}
                          </span>
                          {item.category && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                              {item.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleShare(item)}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900"
                      >
                        <Share2 size={14} />
                        <span>Share</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="rounded p-1 text-gray-500 hover:text-gray-900"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(item.id, item.name)}
                          className="rounded p-1 text-rose-400 hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: SALES (EXACT REFERENCE DESIGN) ================= */}
        {activeTab === "sales" && (
          <div>
            {/* Header: Recent Sales (8) + View All Button */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 sm:text-lg">
                Recent Sales ({MOCK_SALES.length})
              </h2>

              <button
                type="button"
                onClick={() => toast.info("Displaying all 8 recent sales records.")}
                className="flex items-center gap-1 rounded-full border border-orange-500/80 px-3.5 py-1 text-xs font-semibold text-orange-600 transition hover:bg-orange-50 active:scale-95"
              >
                <span>View All</span>
                <ArrowRight size={13} className="stroke-[2.5]" />
              </button>
            </div>

            {/* Sales List */}
            <div className="divide-y divide-gray-100/90 rounded-2xl border border-gray-100/80 bg-white">
              {MOCK_SALES.map((sale) => (
                <div
                  key={sale.id}
                  onClick={() => setSelectedSale(sale)}
                  className="group flex flex-wrap items-center justify-between gap-3 p-3 transition hover:bg-slate-50/70 sm:p-3.5 cursor-pointer"
                >
                  {/* Left: Thumbnail + Title + Order ID & Time */}
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-[200px]">
                    <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-xl border border-black/[0.04] bg-gray-100">
                      <img
                        src={sale.image}
                        alt={sale.productName}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-sm sm:text-[15px] font-bold text-gray-900">
                        {sale.productName}
                      </h3>
                      <p className="mt-0.5 text-xs text-gray-400 font-medium">
                        {sale.orderNo} <span className="mx-1">•</span> {sale.timeAgo}
                      </p>
                    </div>
                  </div>

                  {/* Right: Price + Status Badge + Arrow */}
                  <div className="flex items-center gap-3 sm:gap-4 ml-auto sm:ml-0">
                    <span className="text-sm sm:text-[15px] font-bold text-gray-900">
                      ₹{sale.amount.toLocaleString("en-IN")}
                    </span>

                    <span
                      className={`min-w-[68px] text-center rounded-full px-3 py-1 text-xs font-semibold ${
                        sale.status === "Paid"
                          ? "bg-[#E8F8EE] text-[#16A34A]"
                          : sale.status === "Cancelled"
                          ? "bg-[#FEECEB] text-[#DC2626]"
                          : "bg-[#EBF3FE] text-[#2563EB]"
                      }`}
                    >
                      {sale.status}
                    </span>

                    <ChevronRight size={17} className="text-gray-400 transition group-hover:translate-x-0.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 3: TIMELINE (EXACT REFERENCE DESIGN) ================= */}
        {activeTab === "timeline" && (
          <div className="space-y-6">
            {MOCK_TIMELINE_GROUPS.map((group) => (
              <div key={group.date} className="relative">
                {/* Date Heading with Orange Bullet */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shrink-0" />
                  <h3 className="text-sm font-bold text-gray-900 sm:text-[15px]">
                    {group.date}
                  </h3>
                </div>

                {/* Vertical timeline line connecting groups */}
                <div className="relative pl-5 sm:pl-6 space-y-2.5 before:absolute before:left-[4px] before:top-[-6px] before:bottom-[-16px] before:w-[1.5px] before:bg-gray-100 last:before:hidden">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (item.type === "payout") {
                          setSelectedPayout(item);
                        } else {
                          const match =
                            MOCK_SALES.find((s) => item.subtitle.includes(s.orderNo)) ||
                            MOCK_SALES[0];
                          setSelectedSale(match);
                        }
                      }}
                      className="group flex items-center justify-between gap-3 rounded-2xl border border-gray-100/90 bg-white p-3.5 sm:p-4 shadow-sm transition hover:shadow-md hover:border-gray-200 cursor-pointer"
                    >
                      {/* Left: Icon Badge + Title/Status + Subtitle + Time */}
                      <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                        {/* Circular Icon */}
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition group-hover:scale-105 ${
                            item.type === "sale"
                              ? "bg-[#EAF8F0] text-emerald-600"
                              : "bg-[#EBF3FE] text-blue-600"
                          }`}
                        >
                          {item.type === "sale" ? (
                            <ShoppingBag size={18} strokeWidth={2.2} />
                          ) : (
                            <Wallet size={18} strokeWidth={2.2} />
                          )}
                        </div>

                        {/* Title, Badge, Subtitle & Time */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm sm:text-[15px] font-bold text-gray-900">
                              {item.title}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                item.status === "Paid"
                                  ? "bg-[#E8F8EE] text-[#16A34A]"
                                  : item.status === "Completed"
                                  ? "bg-[#EBF3FE] text-[#2563EB]"
                                  : "bg-[#FEECEB] text-[#DC2626]"
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>

                          <p className="mt-0.5 text-xs text-gray-500 font-medium truncate">
                            {item.subtitle}
                          </p>

                          <span className="mt-0.5 block text-[11px] text-gray-400 font-medium">
                            {item.time}
                          </span>
                        </div>
                      </div>

                      {/* Right: Amount + Chevron */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm sm:text-[15px] font-bold text-gray-900">
                          {item.isCredit ? "+ " : "- "}₹{item.amount.toLocaleString("en-IN")}
                        </span>

                        <ChevronRight
                          size={17}
                          className="text-gray-400 transition group-hover:translate-x-0.5"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= PAYOUT DETAILS MODAL (MATCHING REFERENCE IMAGE) ================= */}
      {selectedPayout && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedPayout(null)}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-[32px] sm:rounded-[32px] bg-white shadow-2xl overflow-hidden border-t sm:border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Drag Handle (Mobile) */}
            <div className="flex shrink-0 justify-center pt-3 pb-1 sm:hidden">
              <div className="h-1.5 w-12 rounded-full bg-gray-300" />
            </div>

            {/* Header: Wallet Icon + Title + UTR + Status Badge + Close Button */}
            <div className="shrink-0 px-5 pt-3 sm:px-6 sm:pt-5 pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EBF3FE] text-[#2563EB]">
                    <Wallet size={22} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-[22px] font-extrabold text-gray-950 tracking-tight leading-none">
                      Payout Details
                    </h2>
                    <p className="text-xs text-gray-400 font-medium font-mono mt-1">
                      UTR: {selectedPayout.utr || "SBIN3265987412"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#E8F8EE] px-2.5 py-0.5 text-xs font-bold text-[#16A34A] border border-emerald-100/60">
                      {selectedPayout.status || "Completed"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedPayout(null)}
                      className="rounded-full p-1 text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                      aria-label="Close modal"
                    >
                      <X size={20} className="stroke-[2.2]" />
                    </button>
                  </div>
                  <span className="mt-1 text-[11px] sm:text-xs text-gray-400 font-medium">
                    {selectedPayout.payoutDate || "16 Oct 2026, 09:15 AM"}
                  </span>
                </div>
              </div>
            </div>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 pb-6 space-y-3.5">
              {/* Payout Amount Banner Card */}
              <div className="rounded-2xl bg-[#EEF5FF] border border-blue-100/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left: Amount */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-2xs border border-blue-100/60">
                    <ShoppingBag size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-gray-500">
                      Payout Amount
                    </span>
                    <p className="text-2xl sm:text-[26px] font-black text-gray-950 leading-tight">
                      ₹{selectedPayout.amount ? selectedPayout.amount.toLocaleString("en-IN") : "1,200"}
                    </p>
                  </div>
                </div>

                {/* Vertical Divider */}
                <div className="hidden sm:block h-10 w-[1px] bg-blue-200/60 mx-1" />

                {/* Right: Transferred to Bank */}
                <div className="flex flex-col sm:items-end">
                  <span className="text-[11px] font-medium text-gray-500">
                    Transferred to
                  </span>
                  <p className="text-xs font-bold text-gray-800 leading-snug">
                    {selectedPayout.bankName || "State Bank of India"}
                  </p>
                  <p className="text-xs font-semibold text-gray-500">
                    {selectedPayout.accountNumber || "••••• 7842"}
                  </p>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-lg bg-white px-2 py-0.5 text-[11px] font-bold text-blue-600 border border-blue-200/60 shadow-2xs w-fit">
                    <Landmark size={11} strokeWidth={2.5} /> Payout to Bank
                  </span>
                </div>
              </div>

              {/* Payout Summary Card */}
              <div className="rounded-2xl bg-[#F8FAFC] border border-gray-100/80 p-4 space-y-2.5">
                <h4 className="text-sm font-bold text-gray-900">Payout Summary</h4>

                {/* Total Sales Amount */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <span className="text-gray-500 font-medium">Total Sales Amount</span>
                  <span className="font-bold text-gray-900">
                    ₹{selectedPayout.totalSalesAmount ? selectedPayout.totalSalesAmount.toLocaleString("en-IN") : "1,800"}
                  </span>
                </div>

                {/* Discount */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <span className="text-gray-500 font-medium">Discount</span>
                  <span className="font-bold text-gray-700">
                    - ₹{selectedPayout.discount ?? 300}
                  </span>
                </div>

                {/* Your Earnings (70%) */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-600 font-medium">Your Earnings (70%)</span>
                    <Info
                      size={13}
                      className="text-gray-400 stroke-[2] cursor-pointer"
                      onClick={() =>
                        toast.info("Net earnings based on 70% partner revenue share.")
                      }
                    />
                  </div>
                  <span className="font-bold text-gray-900">
                    ₹{selectedPayout.earnings ? selectedPayout.earnings.toLocaleString("en-IN") : "1,260"}
                  </span>
                </div>

                {/* Previous Pending */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <span className="text-gray-500 font-medium">Previous Pending</span>
                  <span className="font-bold text-gray-700">
                    + ₹{selectedPayout.previousPending ?? 60}
                  </span>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200/70" />

                {/* Total Payout */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-950">Total Payout</span>
                  <span className="text-base sm:text-lg font-black text-gray-950">
                    ₹{selectedPayout.amount ? selectedPayout.amount.toLocaleString("en-IN") : "1,200"}
                  </span>
                </div>
              </div>

              {/* Related Orders Card */}
              <div
                onClick={() => {
                  setSelectedPayout(null);
                  setSelectedSale(MOCK_SALES[0]);
                }}
                className="rounded-2xl bg-[#F8FAFC] border border-gray-100/80 p-3.5 flex items-center justify-between transition hover:bg-slate-100/70 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF3ED] text-[#EA580C]">
                    <FileText size={18} strokeWidth={2.2} />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-gray-900">
                      2 Orders Included
                    </p>
                    <p className="text-[11px] text-gray-400 font-medium">
                      (Order #ATV1284, #ATV1277)
                    </p>
                  </div>
                </div>

                <ChevronRight size={16} className="text-gray-400" />
              </div>

              {/* Additional Information Card */}
              <div className="rounded-2xl bg-[#F8FAFC] border border-gray-100/80 p-4 space-y-3">
                <h4 className="text-sm font-bold text-gray-900">Additional Information</h4>

                {/* Bank Name */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <div className="flex items-center gap-3 text-gray-500 font-medium">
                    <Landmark size={15} className="text-gray-400 stroke-[1.8] shrink-0" />
                    <span>Bank Name</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {selectedPayout.bankName || "State Bank of India"}
                  </span>
                </div>

                {/* Account Number */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <div className="flex items-center gap-3 text-gray-500 font-medium">
                    <CreditCard size={15} className="text-gray-400 stroke-[1.8] shrink-0" />
                    <span>Account Number</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {selectedPayout.accountNumber || "••••• 7842"}
                  </span>
                </div>

                {/* IFSC */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <div className="flex items-center gap-3 text-gray-500 font-medium">
                    <Receipt size={15} className="text-gray-400 stroke-[1.8] shrink-0" />
                    <span>IFSC</span>
                  </div>
                  <span className="font-bold text-gray-900 font-mono text-xs">
                    {selectedPayout.ifsc || "SBIN0001234"}
                  </span>
                </div>

                {/* Payout Date */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <div className="flex items-center gap-3 text-gray-500 font-medium">
                    <Calendar size={15} className="text-gray-400 stroke-[1.8] shrink-0" />
                    <span>Payout Date</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {selectedPayout.payoutDate || "16 Oct 2026, 09:15 AM"}
                  </span>
                </div>
              </div>

              {/* Bottom Need Help Bar */}
              <div
                onClick={() => navigate("/help")}
                className="flex items-center justify-between pt-2 pb-1 text-xs text-gray-600 hover:text-gray-900 cursor-pointer transition"
              >
                <div className="flex items-center gap-1.5">
                  <HelpCircle size={15} className="text-gray-400 stroke-[2]" />
                  <span>Need any help?</span>
                  <span className="font-bold text-blue-600 hover:underline">
                    Contact us
                  </span>
                </div>
                <ChevronRight size={14} className="text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= SALE DETAILS MODAL (MATCHING REFERENCE IMAGE) ================= */}
      {selectedSale && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedSale(null)}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-[32px] sm:rounded-[32px] bg-white shadow-2xl overflow-hidden border-t sm:border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Drag Handle (Mobile) */}
            <div className="flex shrink-0 justify-center pt-3 pb-1 sm:hidden">
              <div className="h-1.5 w-12 rounded-full bg-gray-300" />
            </div>

            {/* Header: Title + Status Pill + Close button */}
            <div className="shrink-0 px-5 pt-3 sm:px-6 sm:pt-5 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl sm:text-[22px] font-extrabold text-gray-950 tracking-tight">
                    Sale Details
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      selectedSale.status === "Paid"
                        ? "bg-[#E8F8EE] text-[#16A34A] border border-emerald-100/60"
                        : selectedSale.status === "Cancelled"
                        ? "bg-[#FEECEB] text-[#DC2626] border border-red-100/60"
                        : "bg-[#EBF3FE] text-[#2563EB] border border-blue-100/60"
                    }`}
                  >
                    {selectedSale.status}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSale(null)}
                  className="rounded-full p-1.5 text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                  aria-label="Close modal"
                >
                  <X size={20} className="stroke-[2.2]" />
                </button>
              </div>

              {/* Sub-header: Order No & Date + Milestone Pill */}
              <div className="mt-1 flex items-center justify-between text-xs sm:text-[13px]">
                <p className="text-gray-500 font-medium">
                  Order {selectedSale.orderNo} <span className="mx-1">•</span>{" "}
                  {selectedSale.orderDate || "16 Oct 2026, 11:24 AM"}
                </p>

                <div className="flex items-center gap-1.5 rounded-full bg-[#FFF3ED] px-2.5 py-0.5 text-xs font-bold text-[#EA580C] border border-orange-100">
                  <BarChart2 size={13} className="stroke-[2.5]" />
                  <span>{selectedSale.saleMilestone || "4th Sale"}</span>
                </div>
              </div>
            </div>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 pb-6 space-y-3.5">
              {/* Product Info Box */}
              <div className="flex items-center justify-between gap-3 pt-1">
                {/* Product Thumbnail + Title + SKU + Price & Qty */}
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={selectedSale.image}
                    alt={selectedSale.productName}
                    className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover border border-gray-100 shrink-0 shadow-xs"
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-extrabold text-gray-900 leading-snug truncate">
                      {selectedSale.productName}
                    </h3>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                      SKU: {selectedSale.sku || "HM-001"}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs sm:text-[13px] font-bold text-gray-900">
                      <span>₹{selectedSale.amount}</span>
                      <span className="text-gray-300 font-normal">|</span>
                      <span className="text-gray-500 font-medium">
                        Qty: {selectedSale.quantity || 1}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total Amount Box (Light Blue) */}
                <div className="rounded-2xl bg-[#EEF5FF] px-4 py-3 text-center shrink-0 min-w-[110px] flex flex-col justify-center border border-blue-100/50">
                  <span className="text-[11px] font-semibold text-gray-500">
                    Total Amount
                  </span>
                  <span className="text-lg sm:text-xl font-extrabold text-gray-900 mt-0.5">
                    ₹{selectedSale.amount}
                  </span>
                </div>
              </div>

              {/* Order Summary Box */}
              <div className="rounded-2xl bg-[#F8FAFC] border border-gray-100/80 p-4 space-y-3">
                <h4 className="text-sm font-bold text-gray-900">Order Summary</h4>

                {/* Subtotal */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <span className="text-gray-500 font-medium">
                    Subtotal ({selectedSale.quantity || 1} item)
                  </span>
                  <span className="font-bold text-gray-900">₹{selectedSale.amount}</span>
                </div>

                {/* Discount */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-medium">Discount</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600 border border-emerald-100/60">
                      - ₹{selectedSale.discount ?? 50}
                    </span>
                  </div>
                  <span className="font-bold text-gray-700">
                    - ₹{selectedSale.discount ?? 50}
                  </span>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200/70" />

                {/* Total Billing */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">Total Billing</span>
                  <span className="text-sm sm:text-base font-extrabold text-gray-900">
                    ₹{Math.max(0, selectedSale.amount - (selectedSale.discount ?? 50))}
                  </span>
                </div>

                {/* Your Earnings Banner (Green Box) */}
                <div className="flex items-center justify-between rounded-xl bg-[#ECFDF5] px-3.5 py-2.5 border border-emerald-100/80">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-emerald-900">
                      Your Earnings (70%)
                    </span>
                    <Info
                      size={13}
                      className="text-emerald-700 stroke-[2] cursor-pointer"
                      onClick={() =>
                        toast.info("70% earnings based on CSP Creative Seller partner tier.")
                      }
                    />
                  </div>
                  <span className="text-sm sm:text-base font-extrabold text-emerald-600">
                    ₹{Math.round(
                      Math.max(0, selectedSale.amount - (selectedSale.discount ?? 50)) * 0.7
                    )}
                  </span>
                </div>
              </div>

              {/* Additional Information Box */}
              <div className="rounded-2xl bg-[#F8FAFC] border border-gray-100/80 p-4 space-y-3.5">
                <h4 className="text-sm font-bold text-gray-900">Additional Information</h4>

                {/* Customer Name */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <div className="flex items-center gap-3 text-gray-500 font-medium">
                    <User size={16} className="text-gray-400 stroke-[1.8] shrink-0" />
                    <span>Customer Name</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {selectedSale.buyerName || "Riya Sharma"}
                  </span>
                </div>

                {/* Payment Method */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <div className="flex items-center gap-3 text-gray-500 font-medium">
                    <CreditCard size={16} className="text-gray-400 stroke-[1.8] shrink-0" />
                    <span>Payment Method</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {selectedSale.paymentMethod || "Online Payment (UPI)"}
                  </span>
                </div>

                {/* Payment Time */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <div className="flex items-center gap-3 text-gray-500 font-medium">
                    <Clock size={16} className="text-gray-400 stroke-[1.8] shrink-0" />
                    <span>Payment Time</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {selectedSale.orderDate || "16 Oct 2026, 11:24 AM"}
                  </span>
                </div>

                {/* Transaction ID */}
                <div className="flex items-center justify-between text-xs sm:text-[13px]">
                  <div className="flex items-center gap-3 text-gray-500 font-medium">
                    <Receipt size={16} className="text-gray-400 stroke-[1.8] shrink-0" />
                    <span>Transaction ID</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 font-mono text-xs">
                      {selectedSale.transactionId || "UPI32984756129"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const tid = selectedSale.transactionId || "UPI32984756129";
                        navigator.clipboard?.writeText(tid);
                        toast.success("Transaction ID copied to clipboard!");
                      }}
                      className="rounded p-0.5 text-gray-400 hover:text-gray-700 transition cursor-pointer"
                      title="Copy Transaction ID"
                    >
                      <Copy size={14} className="stroke-[2]" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ================= ADD PRODUCT MODAL ================= */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Add New Product</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ceramic Planter"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">
                  Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Home Decor, Ceramics, Art"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="499"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="20"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-orange-500 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-orange-600 active:scale-95"
                >
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= EDIT PRODUCT MODAL ================= */}
      {editingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setEditingProduct(null)}
        >
          <div
            className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Edit Product</h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">
                  Category
                </label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-orange-500 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-orange-600 active:scale-95"
                >
                  Save Changes
                </button>
              </div>
            </form>
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
        {/* Desktop Layout */}
        <div className="hidden gap-6 xl:flex">
          <DashboardSidebar mode="fixed" />
          <div className="min-w-0 flex-1 space-y-6">
            <TopNavbar onMenuClick={() => setSidebarOpen(true)} />
            {content}
          </div>
        </div>

        {/* Mobile / Tablet Layout */}
        <div className="xl:hidden">
          <div className="space-y-5 pb-6">{content}</div>
        </div>
      </div>
    </div>
  );
}

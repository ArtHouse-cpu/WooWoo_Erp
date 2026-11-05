import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  Briefcase,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Ellipsis,
  Eye,
  FileText,
  Filter,
  MapPin,
  Monitor,
  MoreVertical,
  Package,
  Phone,
  Search,
  ShoppingCart,
  SquarePen,
  Ticket,
  Trash2,
  X,
  TrendingUp,
  UserPlus,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import {
  customerPayloadToFormData,
  handleCreateCustomer,
  handleUpdateCustomer,
  handleDeleteCustomer,
  handleDeleteInvoice,
  handleGetAllBookings,
  handleReceiveAllBookingPayment,
  handleGetCategories,
  handleGetCustomers,
  handleGetDashboardSummary,
  handleGetFoods,
  handleCreateFood,
  handleUpdateFood,
  handleDeleteFood,
  foodPayloadToFormData,
  type FoodPayload,
  handleGetInvoice,
  handleGetInvoices,
  handleGetMemberships,
  handleCreateProduct,
  handleDeleteProduct,
  handleGetProducts,
  handleGetServices,
  handleUpdateProduct,
  handleCreateSpace,
  handleDeleteSpace,
  handleGetSpaces,
  handleUpdateSpace,
  spacePayloadToFormData,
  type SpacePayload,
  handleGetSubscriptions,
  type AllBookingRow,
  type CustomerPayload,
  type DashboardPeriod,
  type DashboardSummaryData,
  type MembershipPlanPayload,
} from "@/services/apiClient";
import { usePersistedDateFilter } from "@/utils/rememberDateFilter";
import { usePermission } from "@/hooks/usePermission";
import { useAppSelector } from "@/store/hooks";
import RevenueCard from "@/features/home/components/RevenueCard";
import CreateCustomerModal from "@/features/network/components/CreateCustomerModal";
import CreateSubscriptionScreen from "@/features/sales/pages/CreateSubscriptionScreen";
import CreateProductModal from "@/features/sales/components/invoice/Modal/CreateProductModal";
import AddSpaceModal, {
  type SpaceFormPayload,
} from "@/features/catalogue/components/AddSpaceModal";
import AddFoodModal, {
  type FoodFormPayload,
} from "@/features/catalogue/components/AddFoodModal";
import CreatePosScreen, {
  INVOICE_SAVED_EVENT,
} from "@/features/sales/pages/CreatePosScreen";
import DuePaymentModal from "@/features/sales/components/invoice/Modal/DuePaymentModal";
import MobileInvoiceDetailsModal from "@/features/sales/components/invoice/Modal/MobileInvoiceDetailsModal";
import SalesReturnFlowModal from "@/features/sales/components/invoice/Modal/SalesReturnFlowModal";
import { currentInvoiceTotal } from "@/features/sales/utils/salesReturn";
import { downloadInvoicePdf, getInvoicePdfBlob } from "@/utils/pdfGenerator";
import {
  buildWoowooInvoiceWhatsAppMessage,
  normalizeIndianWhatsAppDigits,
  resolveHostedInvoiceLink,
} from "@/utils/whatsappInvoiceShare";
import { normalizeLineType } from "@/features/sales/utils/itemClassification";
import {
  billingMembershipFromCustomer,
  getMembershipBadgeLabel,
  isEmptyMembership,
} from "@/features/sales/utils/membershipInvoiceUtils";

type TabKey =
  | "bills"
  | "bookings"
  | "subscriptions"
  | "customers"
  | "memberships"
  | "products"
  | "spaces"
  | "services"
  | "food";

type DateFilter = "today" | "yesterday" | "week" | "month" | "year" | "all";

type BillCategory = "Store" | "Space" | "Food" | "Membership";

type RecentBill = {
  id: string;
  customer: string;
  phone: string;
  invoiceCode: string;
  amount: number;
  status: "Paid" | "Unpaid" | "Pending" | "Cancelled" | "Draft";
  paymentType: string;
  category: BillCategory;
  createdAt: Date | null;
  updatedAt: Date | null;
  raw: Record<string, unknown>;
};

type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  membership: string;
  createdAt: Date | null;
};

type GenericRow = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  amount?: string;
  numAmount?: number;
  dueAmount?: number;
  badge?: string;
  createdAt?: Date | null;
  phone?: string;
  code?: string;
  paymentType?: string;
  inclusions?: string[];
  owner?: string;
  imageUrl?: string | null;
  stockQty?: number;
  capacity?: number;
  spaceType?: string;
  day?: string;
  raw?: Record<string, unknown>;
};

function bookingDueInvoice(row: GenericRow) {
  const raw = row.raw || {};
  const due = Number(row.dueAmount || 0);
  const total = Number(row.numAmount || raw.grandTotal || 0);
  const paid = Math.max(0, total - due);
  const storedItems = Array.isArray(raw.items) ? raw.items : [];
  const items = storedItems.length
    ? storedItems
    : [
        {
          productName: String(raw.spaceName || row.subtitle || "Booking"),
          qty: Number(raw.durationHours || raw.spaceQty || 1) || 1,
          unitPrice: Number(raw.unitPrice || total),
          lineTotal: total,
        },
      ];
  const breakdown = (raw.paymentBreakdown || {}) as Record<string, number>;
  return {
    _id: row.id.startsWith("invoice-") ? row.id.slice("invoice-".length) : row.id,
    bill: row.code || "Booking",
    customer: row.title,
    amount: total,
    dueAmount: due,
    customerPhone: row.phone || "",
    raw: {
      ...raw,
      customerPhone: raw.customerPhone || row.phone || "",
      items,
      paymentBreakdown: {
        cash: Number(breakdown.cash || 0),
        upi: Number(breakdown.upi || 0),
        card: Number(breakdown.card || 0),
        wallet: Number(breakdown.wallet || 0),
        paidAmount: Number(breakdown.paidAmount ?? paid),
        dueAmount: Number(breakdown.dueAmount ?? due),
        changeAmount: Number(breakdown.changeAmount || 0),
      },
    },
  };
}

const PAGE_SIZE = 5;

const AVATAR_TONES = [
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-orange-100", text: "text-orange-700" },
  { bg: "bg-sky-100", text: "text-sky-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
] as const;

const CATEGORY_PILL: Record<BillCategory, string> = {
  Store: "bg-blue-50 text-blue-700",
  Space: "bg-emerald-50 text-emerald-700",
 
  Food: "bg-rose-50 text-rose-700",
  Membership: "bg-indigo-50 text-indigo-700",
};

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "bills", label: "Bills", icon: Monitor },
  { key: "bookings", label: "Bookings", icon: Calendar },
  { key: "subscriptions", label: "Subscriptions", icon: Ticket },
  { key: "customers", label: "Customers", icon: Users },
  { key: "memberships", label: "Memberships", icon: Crown },
  { key: "products", label: "Products", icon: Package },
  { key: "spaces", label: "Spaces", icon: MapPin },

  { key: "food", label: "Food", icon: Utensils },
];

const KPI_PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "custom", label: "Custom Range" },
  { value: "lifetime", label: "Lifetime" },
];

/** Local YYYY-MM-DD for dashboard fromDate/toDate (avoids UTC day shift). */
function kpiPeriodBounds(period: DashboardPeriod): {
  fromDate?: string;
  toDate?: string;
} {
  if (period === "lifetime") return {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const toYmd = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const to = toYmd(today);
  if (period === "today") return { fromDate: to, toDate: to };
  
  if(period === "yesterday")
    { 
      const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
         const yesterdayDate = toYmd(yesterday);

    return {
      fromDate: yesterdayDate,
      toDate: yesterdayDate,
    };
    }
  if (period === "this_week") {
    const day = today.getDay() || 7;
    const start = new Date(today);
    start.setDate(today.getDate() - (day - 1));
    return { fromDate: toYmd(start), toDate: to };
  }
  if (period === "this_month") {
    return {
      fromDate: toYmd(new Date(today.getFullYear(), today.getMonth(), 1)),
      toDate: to,
    };
  }
  const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const last = new Date(today.getFullYear(), today.getMonth(), 0);
  return { fromDate: toYmd(first), toDate: toYmd(last) };
}

/** Date window shared by the dashboard cards and the four list tabs. */
function dashboardListBounds(
  period: DashboardPeriod,
  customFrom: string,
  customTo: string,
): { fromDate?: string; toDate?: string; ready: boolean } {
  if (period === "lifetime") return { ready: true };
  if (period === "custom") {
    if (!customFrom || !customTo || customTo < customFrom) return { ready: false };
    return { fromDate: customFrom, toDate: customTo, ready: true };
  }
  return { ...kpiPeriodBounds(period), ready: true };
}

const MEMBERSHIP_BREAKDOWN_COLORS = [
  "text-blue-600",
  "text-emerald-600",
  "text-violet-600",
  "text-rose-600",
  "text-amber-600",
  "text-indigo-600",
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "NA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatMoney(amount: number) {
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCompact(amount: number) {
  const abs = Math.abs(amount);
  if (abs >= 100000) {
    const n = amount / 100000;
    return `₹${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}L`;
  }
  if (abs >= 1000) {
    const n = amount / 1000;
    return `₹${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}k`;
  }
  return formatMoney(amount);
}

function formatCount(n: number) {
  return n.toLocaleString("en-IN");
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatBillDate(date: Date | null) {
  if (!date) return { day: "—", time: "" };
  return {
    day: date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

function inDateRange(date: Date | null, filter: DateFilter) {
  if (filter === "all") return true;
  if (!date) return false;
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (filter === "today") return date >= start;

  if (filter === "yesterday") {  
   
   const yesterdayStart = new Date(start);
   yesterdayStart.setDate(yesterdayStart.getDate) - 1
    return date >= yesterdayStart && date < start;
  }
    
   

  if (filter === "week") {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - (day - 1));
    return date >= start;
  }
  if (filter === "month") {
    start.setDate(1);
    return date >= start;
  }
  start.setMonth(0, 1);
  return date >= start;
}

function toStatus(raw: unknown, dueAmount: number): RecentBill["status"] {
  const v = String(raw ?? "").toLowerCase();
  if (v === "cancelled") return "Cancelled";
  if (v === "draft") return "Draft";
  if (v === "pending" || v === "due" || v === "partial") return "Pending";
  if (v === "unpaid" || dueAmount > 0) return "Unpaid";
  return "Paid";
}

function formatPaymentType(raw: unknown): string {
  const v = String(raw ?? "").trim();
  if (!v) return "—";
  const upper = v.toUpperCase();
  if (upper === "UPI") return "UPI";
  if (upper === "MULTI") return "Multi";
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}

function emptyRevenueBuckets(): Record<BillCategory, number> {
  return {
    Store: 0,
    Space: 0,
    
    Food: 0,
    Membership: 0,
  };
}

function categoryFromLine(rec: Record<string, unknown>): BillCategory {
  const rawType = String(
    rec.lineCategory ?? rec.sourceType ?? rec.category ?? "",
  ).trim();
  const productName = String(rec.productName ?? rec.name ?? "").toLowerCase();
  if (
    /membership|subscription/.test(rawType.toLowerCase()) ||
    /membership|subscription/.test(productName)
  ) {
    return "Membership";
  }
  const lineType = normalizeLineType(rawType);
  if (lineType === "space") return "Space";

  if (lineType === "food") return "Food";
  return "Store";
}

function lineAmount(rec: Record<string, unknown>): number {
  const direct = Number(rec.lineTotal ?? rec.netAmount ?? 0);
  if (Number.isFinite(direct) && direct > 0) return direct;
  return Math.max(
    0,
    Number(rec.qty ?? 1) * Number(rec.unitPrice ?? rec.price ?? 0) -
      Number(rec.discount ?? 0),
  );
}

function billCategoryFromItems(items: unknown): BillCategory {
  if (!Array.isArray(items) || items.length === 0) return "Store";
  const totals = emptyRevenueBuckets();
  for (const item of items) {
    const rec = item as Record<string, unknown>;
    totals[categoryFromLine(rec)] += lineAmount(rec);
  }
  return (Object.entries(totals) as [BillCategory, number][]).sort(
    (a, b) => b[1] - a[1],
  )[0][0];
}

function statusStyles(status: RecentBill["status"]) {
  if (status === "Paid") {
    return { pill: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" };
  }
  if (status === "Unpaid" || status === "Pending") {
    return { pill: "bg-orange-50 text-orange-700", dot: "bg-orange-500" };
  }
  if (status === "Cancelled") {
    return { pill: "bg-rose-50 text-rose-700", dot: "bg-rose-500" };
  }
  return { pill: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
}

function genericStatusStyles(statusStr: string) {
  const s = String(statusStr || "").toLowerCase();
  if (
    s === "paid" ||
    s === "active" ||
    s === "confirmed" ||
    s === "ongoing" ||
    s === "completed"
  ) {
    return {
      pill: "border border-emerald-200 bg-emerald-50 text-emerald-600",
      dot: "bg-emerald-500",
      tablePill: "bg-emerald-50 text-emerald-700",
    };
  }
  if (
    s === "upcoming" ||
    s === "pending" ||
    s === "unpaid" ||
    s === "partial" ||
    s === "due"
  ) {
    return {
      pill: "border border-amber-200 bg-amber-50 text-amber-600",
      dot: "bg-amber-500",
      tablePill: "bg-amber-50 text-amber-700",
    };
  }
  if (s === "draft") {
    return {
      pill: "border border-slate-200 bg-slate-100 text-slate-600",
      dot: "bg-slate-400",
      tablePill: "bg-gray-100 text-gray-600",
    };
  }
  return {
    pill: "border border-rose-200 bg-rose-50 text-rose-600",
    dot: "bg-rose-500",
    tablePill: "bg-rose-50 text-rose-700",
  };
}

function getCustomerMembershipLabel(raw: any): string | null {
  if (!raw) return null;
  const m =
    raw.membershipType ||
    raw.membershipPlan ||
    raw.membership ||
    raw.customerMembership ||
    raw.customer?.membershipType ||
    raw.customer?.membership;
  if (!m || String(m).toLowerCase() === "none" || String(m).toLowerCase() === "visitor") {
    return null;
  }
  return String(m);
}

function getInvoiceCategories(raw: any): string[] {
  if (!raw) return [];
  const categories = new Set<string>();

  const notes = String(raw.notes || "").toLowerCase();
  if (notes.includes("food bill") || notes.includes("food")) {
    categories.add("Food");
  }
  if (notes.includes("space booking") || notes.includes("space")) {
    categories.add("Space");
  }

  const directCat = String(
    raw.invoiceCategory || raw.category || raw.billType || raw.sourceType || "",
  ).toLowerCase();
  if (directCat.includes("food")) categories.add("Food");
  if (directCat.includes("space")) categories.add("Space");
  if (directCat.includes("service")) categories.add("Service");
  if (directCat.includes("membership") || directCat.includes("subscription")) {
    categories.add("Membership");
  }

  const items = Array.isArray(raw.items) ? raw.items : [];
  for (const item of items) {
    const cat = String(
      item.lineCategory || item.sourceType || item.category || "",
    ).toLowerCase();
    const name = String(item.productName || item.name || "").toLowerCase();
    if (cat === "food" || cat === "foods" || name.includes("food") || item.isFood) {
      categories.add("Food");
    } else if (cat === "space" || cat === "spaces" || name.includes("space") || item.isSpace) {
      categories.add("Space");
    } else if (cat === "service" || cat === "services") {
      categories.add("Service");
    } else if (/membership|subscription/.test(cat) || /membership|subscription/.test(name)) {
      categories.add("Membership");
    }
  }

  return Array.from(categories);
}

function paymentStatusForWhatsApp(
  raw: Record<string, unknown>,
  rowStatus: string,
): string {
  const due = Number(
    (raw as any)?.pendingAmount ??
      (raw as any)?.paymentBreakdown?.dueAmount ??
      0,
  );
  if (due > 0.001 || rowStatus === "Pending") return "Pending";
  const ps = String(raw.paymentStatus ?? "").toLowerCase();
  if (ps === "full") return "Paid";
  if (ps === "partial" || ps === "due") return "Pending";
  return rowStatus;
}

export default function HomeScreen() {
  const navigate = useNavigate();
  const staff = useAppSelector((state) => state.user);
  const { canPath } = usePermission();

  const [openCreateCustomerModal, setOpenCreateCustomerModal] = useState(false);
  const [openCreateSubscriptionModal, setOpenCreateSubscriptionModal] =
    useState(false);
  const [openPos, setOpenPos] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const [tab, setTab] = useState<TabKey>("bills");
  const [search, setSearch] = useState("");
  const [listTick, setListTick] = useState(0);
  const [duePay, setDuePay] = useState<GenericRow | null>(null);
  /** Bills / customers table filter (independent of KPI dropdown). */
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  /** KPI cards period — drives /dashboard/summary and the list tabs. */
  const {
    datePreset: kpiPeriod,
    setDatePreset: setKpiPeriod,
    fromDate: customFrom,
    setFromDate: setCustomFrom,
    toDate: customTo,
    setToDate: setCustomTo,
  } = usePersistedDateFilter<DashboardPeriod>(
    "dashboard",
    "today",
    KPI_PERIOD_OPTIONS.map((opt) => opt.value),
    () => ({ from: "", to: "" }),
  );
  const listBounds = useMemo(
    () => dashboardListBounds(kpiPeriod, customFrom, customTo),
    [kpiPeriod, customFrom, customTo],
  );
  const [kpiOpen, setKpiOpen] = useState(false);
  const [dashboardSummary, setDashboardSummary] =
    useState<DashboardSummaryData | null>(null);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "Paid" | "Pending">(
    "all",
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia("(max-width: 767px)").matches,
  );
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const kpiRef = useRef<HTMLDivElement>(null);

  const [bills, setBills] = useState<RecentBill[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [membershipPlans, setMembershipPlans] = useState<
    MembershipPlanPayload[]
  >([]);
  const [kpisLoading, setKpisLoading] = useState(true);
  const [billsLoading, setBillsLoading] = useState(true);

  // Mobile invoice details and actions state
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [mobileDetailsInvoice, setMobileDetailsInvoice] = useState<any>(null);
  const [mobileDetailsLoading, setMobileDetailsLoading] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnIntent, setReturnIntent] = useState<"return" | "cancel">("return");
  const [returnInvoice, setReturnInvoice] = useState<any>(null);

  const [products, setProducts] = useState<GenericRow[]>([]);
  const [spaces, setSpaces] = useState<GenericRow[]>([]);
  const [services, setServices] = useState<GenericRow[]>([]);
  const [foods, setFoods] = useState<GenericRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<GenericRow[]>([]);
  const [bookings, setBookings] = useState<GenericRow[]>([]);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [subscriptionMode, setSubscriptionMode] = useState<"create" | "view">("create");
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [productCategories, setProductCategories] = useState<{ _id?: string; name?: string }[]>([]);
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>("all");
  const [viewProduct, setViewProduct] = useState<any | null>(null);
  const [editProduct, setEditProduct] = useState<any | null>(null);
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [productModalLoading, setProductModalLoading] = useState(false);
  const [selectedSpaceType, setSelectedSpaceType] = useState<string>("all");
  const [viewSpace, setViewSpace] = useState<any | null>(null);
  const [editingSpace, setEditingSpace] = useState<any | null>(null);
  const [openSpaceModal, setOpenSpaceModal] = useState(false);
  const [spaceModalSaving, setSpaceModalSaving] = useState(false);
  const [viewFood, setViewFood] = useState<any | null>(null);
  const [editFood, setEditFood] = useState<any | null>(null);
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [foodModalLoading, setFoodModalLoading] = useState(false);
  const [actionMenuFoodId, setActionMenuFoodId] = useState<string | null>(null);
  const [viewCustomer, setViewCustomer] = useState<any | null>(null);
  const [editCustomer, setEditCustomer] = useState<any | null>(null);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [showViewCustomerModal, setShowViewCustomerModal] = useState(false);
  const [customerModalLoading, setCustomerModalLoading] = useState(false);
  const [actionMenuCustomerId, setActionMenuCustomerId] = useState<string | null>(null);
  const [tabLoading, setTabLoading] = useState(false);
  const [invoiceRefresh, setInvoiceRefresh] = useState(0);

  const welcomeName =
    String(staff?.m_staff_name ?? "")
      .trim()
      .split(/\s+/)[0] || "Admin";

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (filterRef.current && !filterRef.current.contains(target)) {
        setFilterOpen(false);
      }
      if (kpiRef.current && !kpiRef.current.contains(target)) {
        setKpiOpen(false);
      }
      setMenuId(null);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    setPage(1);
    setVisibleCount(tab === "products" || tab === "spaces" || tab === "food" ? 6 : PAGE_SIZE);
    if (tab !== "products") {
      setSelectedProductCategory("all");
    }
    if (tab !== "spaces") {
      setSelectedSpaceType("all");
    }
  }, [tab, search, dateFilter, statusFilter, listBounds.fromDate, listBounds.toDate, listBounds.ready]);

  useEffect(() => {
    setPage(1);
    setVisibleCount(tab === "products" || tab === "spaces" || tab === "food" ? 6 : PAGE_SIZE);
  }, [selectedProductCategory, selectedSpaceType]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (!listBounds.ready) return;
    setKpisLoading(true);
    setBillsLoading(true);
    try {
      const [
        invoiceRes,
        customerRes,
        membershipRes,
      ] = await Promise.allSettled([
        // Sales bills only. Booking invoices are loaded with the Bookings tab.
        handleGetInvoices(
          "",
          undefined,
          2000,
          listBounds.fromDate || "",
          listBounds.toDate || "",
          "sales",
        ),
        canPath("/customers")
          ? handleGetCustomers(
              "",
              undefined,
              2000,
              1,
              listBounds.fromDate || "",
              listBounds.toDate || "",
            )
          : Promise.resolve(null),
        canPath("/membership") || canPath("/manage-plans")
          ? handleGetMemberships({ status: "Active" })
          : Promise.resolve(null),
      ]);

      const invoices =
        invoiceRes.status === "fulfilled" &&
        Array.isArray(invoiceRes.value?.invoices)
          ? invoiceRes.value.invoices
          : [];

      const mappedBills: RecentBill[] = invoices.map(
        (invoice: Record<string, unknown>, index: number) => {
          const due = Number(
            invoice?.pendingAmount ??
              (
                invoice?.paymentBreakdown as
                  | { dueAmount?: number }
                  | undefined
              )?.dueAmount ??
              0,
          );
          return {
            id: String(invoice?._id ?? index),
            customer: String(invoice?.customerName || "Walk-in customer"),
            phone: String(invoice?.customerPhone || "—"),
            invoiceCode: String(
              invoice?.invoiceCode ??
                `INV-${invoice?.invoiceNumber ?? index + 1}`,
            ),
            amount: Math.max(
              0,
              Number(invoice?.grandTotal ?? 0) -
                Number(invoice?.returnedAmount ?? 0),
            ),
            status: toStatus(invoice?.status ?? invoice?.paymentStatus, due),
            paymentType: formatPaymentType(invoice?.mode),
            category: billCategoryFromItems(invoice?.items),
            createdAt:
              parseDate(invoice?.updatedAt) ?? parseDate(invoice?.createdAt),
            raw: invoice,
          };
        },
      );
      setBills(mappedBills);
      setBillsLoading(false);

      const plans =
        membershipRes.status === "fulfilled" &&
        Array.isArray(membershipRes.value?.memberships)
          ? membershipRes.value.memberships
          : [];
      setMembershipPlans(plans);

      const customerList =
        customerRes.status === "fulfilled" &&
        Array.isArray(customerRes.value?.customers)
          ? customerRes.value.customers
          : [];
      setCustomers(
        customerList.map((c: Record<string, unknown>, i: number) => ({
          id: String(c?._id ?? i),
          name: String(c?.name || "Customer"),
          phone: String(c?.mobile || c?.phone || "—"),
          membership: (() => {
            const activeType = billingMembershipFromCustomer({
              membershipType:
                typeof c?.membershipType === "string" ? c.membershipType : "",
              membershipExpired: Boolean(c?.membershipExpired),
            });
            return isEmptyMembership(activeType)
              ? "Visitor"
              : getMembershipBadgeLabel(
                  plans,
                  activeType,
                  c?.membershipExpired ? null : c?.membershipPlanId,
                );
          })(),
          createdAt: parseDate(c?.createdAt),
          raw: c,
        })),
      );
    } catch {
      setBills([]);
      setCustomers([]);
    } finally {
      setKpisLoading(false);
      setBillsLoading(false);
    }
  }, [canPath, listBounds.fromDate, listBounds.ready, listBounds.toDate]);

  useEffect(() => {
    let alive = true;
    void loadDashboardData();
    return () => {
      alive = false;
    };
  }, [loadDashboardData, invoiceRefresh]);

  useEffect(() => {
    const onSaved = () => setInvoiceRefresh((current) => current + 1);
    window.addEventListener(INVOICE_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(INVOICE_SAVED_EVENT, onSaved);
  }, []);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const loadCards = async () => {
      if (!listBounds.ready) return;
      setCardsLoading(true);
      try {
        const response = await handleGetDashboardSummary(
          {
            period: kpiPeriod === "custom" ? "lifetime" : kpiPeriod,
            ...(listBounds.fromDate ? { fromDate: listBounds.fromDate } : {}),
            ...(listBounds.toDate ? { toDate: listBounds.toDate } : {}),
          },
          controller.signal,
        );
        if (!alive) return;
        if (response?.success && response.data) {
          setDashboardSummary(response.data);
        } else {
          throw new Error(response?.message || "Failed to load dashboard");
        }
      } catch (error: unknown) {
        if (!alive) return;
        const err = error as {
          name?: string;
          code?: string;
          response?: { data?: { message?: string } };
        };
        if (
          err?.name === "CanceledError" ||
          err?.name === "AbortError" ||
          err?.code === "ERR_CANCELED"
        ) {
          return;
        }
        await Swal.fire({
          icon: "error",
          title: "Dashboard update failed",
          text:
            err?.response?.data?.message ||
            "Could not refresh dashboard cards. Previous values are kept.",
          timer: 2800,
          showConfirmButton: false,
        });
      } finally {
        if (alive) setCardsLoading(false);
      }
    };
    void loadCards();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [kpiPeriod, listBounds.fromDate, listBounds.ready, listBounds.toDate]);

  useEffect(() => {
    if (
      tab === "bills" ||
      tab === "customers" ||
      tab === "memberships"
    ) {
      return;
    }
    let alive = true;
    const load = async () => {
      setTabLoading(true);
      try {
        if (tab === "bookings") {
          if (!listBounds.ready) return;
          const [res, invoiceRes] = await Promise.all([
            handleGetAllBookings({
              page: 1,
              limit: 100,
              fromDate: listBounds.fromDate,
              toDate: listBounds.toDate,
            }),
            handleGetInvoices(
              "",
              undefined,
              500,
              listBounds.fromDate || "",
              listBounds.toDate || "",
              "booking",
            ),
          ]);
          if (!alive) return;
          const list = Array.isArray(res?.bookings) ? res.bookings : [];
          const bookingRows: GenericRow[] = list.map((b: AllBookingRow, i: number) => {
              const customerName = b.customerName || b.customer?.name || "Customer";
              const code = b.bookingCode || `BK-${i + 1}`;
              const space = b.spaceName || b.spaceType || "";
              const inclusions: string[] = [];
              if (space) inclusions.push(space);
              if (b.services && b.services.length > 0) inclusions.push("Services");
              if (b.foods && b.foods.length > 0) inclusions.push("Food");
              const subtitle = inclusions.join(" · ") || "Booking";
              const dateObj =
                parseDate(b.bookingDate) ||
                parseDate(b.createdAt) ||
                null;
              return {
                id: String(b.id || b.sourceId || i),
                title: customerName,
                subtitle: `${subtitle} · ${code}`,
                meta: String(b.status || "Upcoming"),
                amount: formatMoney(Number(b.grandTotal ?? 0)),
                numAmount: Number(b.grandTotal ?? 0),
                dueAmount: Number(b.dueAmount ?? 0) < 1 ? 0 : Number(b.dueAmount ?? 0),
                createdAt: dateObj,
                phone: b.customerPhone || b.customer?.phone || "",
                code,
                paymentType:
                  Number(b.dueAmount ?? 0) < 1 ? "full" : b.paymentStatus || "—",
                inclusions,
                badge: b.membershipType || b.customer?.membershipType || "",
                raw: b as unknown as Record<string, unknown>,
              };
            });
          const linkedCodes = new Set(
            bookingRows
              .map((row) => String(row.raw?.invoiceCode || "").trim().toLowerCase())
              .filter(Boolean),
          );
          const bookingInvoices = Array.isArray(invoiceRes?.invoices)
            ? invoiceRes.invoices
            : [];
          const invoiceRows: GenericRow[] = bookingInvoices
            .filter((invoice: Record<string, unknown>) => {
              const code = String(invoice?.invoiceCode || "").trim().toLowerCase();
              return !code || !linkedCodes.has(code);
            })
            .map((invoice: Record<string, unknown>, i: number) => {
              const code = String(invoice?.invoiceCode || `INV-${i + 1}`);
              const due = Number(
                invoice?.pendingAmount ??
                  (invoice?.paymentBreakdown as { dueAmount?: number } | undefined)
                    ?.dueAmount ??
                  0,
              );
              return {
                id: `invoice-${String(invoice?._id ?? i)}`,
                title: String(invoice?.customerName || "Customer"),
                subtitle: `Booking invoice · ${code}`,
                meta: String(invoice?.status || "final"),
                amount: formatMoney(Number(invoice?.grandTotal ?? 0)),
                numAmount: Number(invoice?.grandTotal ?? 0),
                dueAmount: due > 0 && due < 1 ? 0 : due,
                createdAt:
                  parseDate(invoice?.invoiceDate) || parseDate(invoice?.createdAt),
                phone: String(invoice?.customerPhone || ""),
                code,
                paymentType: formatPaymentType(invoice?.mode),
                inclusions: ["Invoice"],
                raw: invoice,
              };
            });
          setBookings(
            [...bookingRows, ...invoiceRows].sort(
              (a, b) =>
                (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
            ),
          );
        }
        if (tab === "subscriptions") {
          if (!listBounds.ready) return;
          const res = await handleGetSubscriptions(
            "",
            100,
            undefined,
            1,
            listBounds.fromDate,
            listBounds.toDate,
            "createdAt",
          );
          if (!alive) return;
          const list = Array.isArray(res?.subscriptions)
            ? res.subscriptions
            : [];
          const sortedList = [...list].sort((a, b) => {
            const ta = parseDate(a?.createdAt)?.getTime() ?? 0;
            const tb = parseDate(b?.createdAt)?.getTime() ?? 0;
            if (tb !== ta) return tb - ta;
            return (
              Number(b?.subscriptionNumber ?? 0) -
              Number(a?.subscriptionNumber ?? 0)
            );
          });
          setSubscriptions(
            sortedList.map((s: Record<string, unknown>, i: number) => {
              const plan = String(
                s?.membershipType ||
                  s?.membershipPlan ||
                  s?.planId ||
                  "Membership",
              );
              const code = String(
                s?.subscriptionCode ??
                  `SUB-${s?.subscriptionNumber ?? i + 1}`,
              );
              const total = Number(s?.grandTotal ?? s?.amount ?? 0);
              const due = Number(s?.dueAmount ?? s?.pendingAmount ?? 0);
              return {
                id: String(s?._id ?? i),
                title: String(s?.customerName || s?.name || "Customer"),
                subtitle: `${plan} · ${code}`,
                meta: String(s?.status || "active"),
                amount: formatMoney(total),
                numAmount: total,
                dueAmount: due,
                createdAt:
                  parseDate(s?.createdAt) ||
                  parseDate(s?.invoiceDate) ||
                  parseDate(s?.startDate),
                phone: String(s?.customerPhone || s?.phone || ""),
                code,
                paymentType: String(s?.paymentMethod || s?.paymentMode || "UPI"),
                badge: plan,
                owner: String(s?.salesPersonName || "System"),
                raw: s,
              };
            }),
          );
        }
        if (tab === "products") {
          if (productCategories.length === 0) {
            try {
              const catRes = await handleGetCategories();
              if (alive) {
                const list = Array.isArray(catRes?.categories)
                  ? catRes.categories
                  : Array.isArray(catRes)
                    ? catRes
                    : [];
                setProductCategories(list);
              }
            } catch (err) {
              console.error("Failed to load categories:", err);
            }
          }
        }
        if (tab === "products" && products.length === 0) {
          const res = await handleGetProducts({ type: "product", limit: 50 });
          if (!alive) return;
          setProducts(
            (Array.isArray(res?.products) ? res.products : []).map(
              (p: Record<string, unknown>, i: number) => {
                const stock = Number(p?.stockQty ?? 0);
                const img =
                  (typeof p?.imageUrl === "string" && p.imageUrl.trim()
                    ? p.imageUrl.trim()
                    : null) ||
                  (Array.isArray(p?.images) &&
                  p.images.length > 0 &&
                  typeof p.images[0] === "string" &&
                  p.images[0].trim()
                    ? p.images[0].trim()
                    : null) ||
                  (typeof p?.image === "string" && p.image.trim()
                    ? p.image.trim()
                    : null) ||
                  null;
                return {
                  id: String(p?._id ?? i),
                  title: String(p?.productName || p?.name || "Product"),
                  subtitle: String(p?.category || "General"),
                  meta: stock > 0 ? "In stock" : "Out of stock",
                  amount: formatMoney(Number(p?.sellingPrice ?? 0)),
                  imageUrl: img,
                  stockQty: stock,
                  code: String(p?.barCode || p?.barcode || p?.itemCode || ""),
                  raw: p,
                };
              },
            ),
          );
        }
        if (tab === "spaces" && spaces.length === 0) {
          const res = await handleGetSpaces();
          if (!alive) return;
          setSpaces(
            (Array.isArray(res?.spaces) ? res.spaces : []).map(
              (s: Record<string, unknown>, i: number) => {
                const img =
                  (typeof s?.imageUrl === "string" && s.imageUrl.trim()
                    ? s.imageUrl.trim()
                    : null) ||
                  (Array.isArray(s?.images) &&
                  s.images.length > 0 &&
                  typeof s.images[0] === "string" &&
                  s.images[0].trim()
                    ? s.images[0].trim()
                    : null) ||
                  (typeof s?.image === "string" && s.image.trim()
                    ? s.image.trim()
                    : null) ||
                  null;
                const statusStr = String(s?.status || "Available");
                return {
                  id: String(s?._id ?? i),
                  title: String(s?.name || "Space"),
                  subtitle: String(s?.category || s?.spaceType || "Space"),
                  meta: statusStr,
                  amount: formatMoney(Number(s?.price ?? 0)),
                  imageUrl: img,
                  capacity: Number(s?.capacity ?? 0),
                  spaceType: String(s?.spaceType || ""),
                  day: String(s?.day || ""),
                  code: String(s?.spaceCode || ""),
                  raw: s,
                };
              },
            ),
          );
        }
        if (tab === "services" && services.length === 0) {
          const res = await handleGetServices();
          if (!alive) return;
          const list = Array.isArray(res?.services)
            ? res.services
            : Array.isArray(res?.products)
              ? res.products
              : [];
          setServices(
            list.map((s: Record<string, unknown>, i: number) => ({
              id: String(s?._id ?? i),
              title: String(
                s?.productName || s?.serviceName || s?.name || "Service",
              ),
              subtitle: String(s?.category || "Service"),
              meta: String(s?.primaryUnit || "—"),
              amount: formatMoney(Number(s?.sellingPrice ?? 0)),
            })),
          );
        }
        if (tab === "food" && foods.length === 0) {
          const res = await handleGetFoods();
          if (!alive) return;
          setFoods(
            (Array.isArray(res?.foods) ? res.foods : []).map(
              (f: Record<string, unknown>, i: number) => {
                const img =
                  (typeof f?.imageUrl === "string" && f.imageUrl.trim()
                    ? f.imageUrl.trim()
                    : null) ||
                  (Array.isArray(f?.images) &&
                  f.images.length > 0 &&
                  typeof f.images[0] === "string" &&
                  f.images[0].trim()
                    ? f.images[0].trim()
                    : null) ||
                  (typeof f?.image === "string" && f.image.trim()
                    ? f.image.trim()
                    : null) ||
                  null;
                return {
                  id: String(f?._id ?? i),
                  title: String(f?.name || "Food"),
                  subtitle: String(f?.category || "Food"),
                  meta: String(f?.status || "Active"),
                  amount: formatMoney(Number(f?.price ?? 0)),
                  imageUrl: img,
                  raw: f,
                };
              },
            ),
          );
        }
      } catch {
        /* keep empty lists */
      } finally {
        if (alive) setTabLoading(false);
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [
    tab,
    products.length,
    spaces.length,
    services.length,
    foods.length,
    listBounds.fromDate,
    listBounds.ready,
    listBounds.toDate,
    listTick,
  ]);

  const kpiPeriodLabel =
    KPI_PERIOD_OPTIONS.find((o) => o.value === kpiPeriod)?.label ?? "Today";

  const revenue = dashboardSummary?.revenue;
  const membershipSummary = dashboardSummary?.membership;
  const networkSummary = dashboardSummary?.network;
  const purchaseExpense = dashboardSummary?.purchaseExpense;

  const membershipBreakdown = useMemo(
    () =>
      (membershipSummary?.breakdown ?? []).map((row, i) => ({
        label: row.code,
        value: formatCount(row.count),
        colorClass: MEMBERSHIP_BREAKDOWN_COLORS[i % MEMBERSHIP_BREAKDOWN_COLORS.length],
      })),
    [membershipSummary],
  );

  const filteredBills = useMemo(() => {
    const term = search.trim().toLowerCase();
    return bills.filter((bill) => {
      if (statusFilter === "Paid" && bill.status !== "Paid") return false;
      if (
        statusFilter === "Pending" &&
        bill.status !== "Pending" &&
        bill.status !== "Unpaid"
      ) {
        return false;
      }
      if (!term) return true;
      return (
        bill.customer.toLowerCase().includes(term) ||
        bill.invoiceCode.toLowerCase().includes(term) ||
        bill.phone.toLowerCase().includes(term)
      );
    });
  }, [bills, search, statusFilter]);

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (!term) return true;
      return (
        c.name.toLowerCase().includes(term) ||
        c.phone.toLowerCase().includes(term) ||
        c.membership.toLowerCase().includes(term)
      );
    });
  }, [customers, search]);

  const membershipRows: GenericRow[] = useMemo(
    () =>
      membershipPlans.map((p, i) => ({
        id: String(p._id ?? p.planId ?? i),
        title: p.displayName || p.planId,
        subtitle: p.planType || "Plan",
        meta: p.status || "Active",
        amount: formatMoney(Number(p.pricing?.amount ?? 0)),
      })),
    [membershipPlans],
  );

  const genericRows =
    tab === "memberships"
      ? membershipRows
      : tab === "bookings"
        ? bookings
        : tab === "subscriptions"
          ? subscriptions
          : tab === "products"
            ? products
            : tab === "spaces"
              ? spaces
              : tab === "services"
                ? services
                : tab === "food"
                  ? foods
                  : [];

  const categoriesList = useMemo(() => {
    const fromApi = productCategories
      .map((c) => String(c?.name || "").trim())
      .filter(Boolean);
    const fromProducts = products
      .map((p) => String(p?.subtitle || "").trim())
      .filter(Boolean);
    return Array.from(new Set([...fromApi, ...fromProducts]));
  }, [productCategories, products]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      const cat = String(p.subtitle || "General").trim().toLowerCase();
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [products]);

  const spaceTypeCounts = useMemo(() => {
    const counts = { all: spaces.length, coworking: 0, exclusive: 0 };
    for (const s of spaces) {
      const typeStr = String(
        s.spaceType || (s.raw as any)?.spaceType || s.subtitle || "",
      )
        .toLowerCase()
        .replace(/[^a-z]/g, "");
      if (typeStr.includes("cowork")) {
        counts.coworking++;
      } else if (typeStr.includes("exclusive")) {
        counts.exclusive++;
      }
    }
    return counts;
  }, [spaces]);

  const filteredGeneric = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = genericRows.filter((row) => {
      if (
        tab !== "bookings" &&
        tab !== "subscriptions" &&
        row.createdAt !== undefined &&
        !inDateRange(row.createdAt ?? null, dateFilter)
      ) {
        return false;
      }
      if (tab === "products" && selectedProductCategory !== "all") {
        const rowCat = String(row.subtitle || "").trim().toLowerCase();
        if (rowCat !== selectedProductCategory.toLowerCase()) {
          return false;
        }
      }
      if (tab === "spaces" && selectedSpaceType !== "all") {
        const typeStr = String(
          row.spaceType || (row.raw as any)?.spaceType || row.subtitle || "",
        )
          .toLowerCase()
          .replace(/[^a-z]/g, "");
        const targetStr = selectedSpaceType.toLowerCase().replace(/[^a-z]/g, "");
        if (!typeStr.includes(targetStr)) {
          return false;
        }
      }
      if (!term) return true;
      return (
        row.title.toLowerCase().includes(term) ||
        row.subtitle.toLowerCase().includes(term) ||
        row.meta.toLowerCase().includes(term) ||
        (row.code && row.code.toLowerCase().includes(term)) ||
        (row.phone && row.phone.toLowerCase().includes(term))
      );
    });

    // Subscriptions and Bookings: always newest createdAt first (matches Date column)
    if (tab === "subscriptions" || tab === "bookings") {
      return [...filtered].sort((a, b) => {
        const ta = a.createdAt?.getTime() ?? 0;
        const tb = b.createdAt?.getTime() ?? 0;
        return tb - ta;
      });
    }

    return filtered;
  }, [genericRows, search, dateFilter, tab, selectedProductCategory, selectedSpaceType]);

  const pageSize = tab === "products" || tab === "spaces" || tab === "food" ? 6 : PAGE_SIZE;
  const tableTotal =
    tab === "bills"
      ? filteredBills.length
      : tab === "customers"
        ? filteredCustomers.length
        : filteredGeneric.length;
  const pageCount = Math.max(1, Math.ceil(tableTotal / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = isMobile ? 0 : (safePage - 1) * pageSize;
  const rowCount = isMobile ? visibleCount : pageSize;
  const pageBills = filteredBills.slice(start, start + rowCount);
  const pageCustomers = filteredCustomers.slice(start, start + rowCount);
  const pageGeneric = filteredGeneric.slice(start, start + rowCount);
  const hasMore = isMobile && visibleCount < tableTotal;

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore) return;
    let timer = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        if (loadingMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
        timer = window.setTimeout(() => {
          setVisibleCount((current) => current + pageSize);
          setLoadingMore(false);
          loadingMoreRef.current = false;
        }, 250);
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [hasMore, tab, visibleCount, pageSize]);

  const searchPlaceholder =
    tab === "bills"
      ? "Search by invoice no., customer name or phone..."
      : tab === "bookings"
        ? "Search bookings by customer, phone or booking code..."
        : tab === "customers"
          ? "Search customers by name or phone..."
          : tab === "subscriptions"
            ? "Search subscriptions by customer, plan or status..."
            : `Search ${tab}...`;

  const handleCreateCustomerSubmit = async (args: {
    payload: CustomerPayload;
    profileImageFile?: File | null;
  }) => {
    try {
      setCreatingCustomer(true);
      const createdBy = {
        m_staff_id: staff?.m_staff_id,
        m_staff_name: staff?.m_staff_name,
        m_staff_email: staff?.m_staff_email,
      };
      if (args.profileImageFile) {
        const fd = customerPayloadToFormData(
          { ...args.payload, createdBy },
          args.profileImageFile,
        );
        await handleCreateCustomer(fd);
      } else {
        await handleCreateCustomer({ ...args.payload, createdBy });
      }
      setOpenCreateCustomerModal(false);
      await Swal.fire(
        "Customer created",
        "Customer saved successfully.",
        "success",
      );
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "Create failed",
        err?.response?.data?.message ?? "Could not create customer. Try again.",
        "error",
      );
    } finally {
      setCreatingCustomer(false);
    }
  };

  const openBill = (bill: RecentBill) => {
    navigate("/create-invoice", { state: { invoice: bill.raw, mode: "view" } });
  };

  const continueDraft = (invoice: any) => {
    const raw = invoice?.raw ?? invoice;
    navigate("/create-invoice", {
      state: { invoice: raw, mode: "edit", openCheckout: true },
    });
  };

  const handleMobileBillClick = async (bill: RecentBill) => {
    setMobileDetailsInvoice(bill.raw || bill);
    setMobileDetailsOpen(true);
    setMobileDetailsLoading(true);
    try {
      const billId = String((bill.raw as any)?._id || bill.id);
      const res = await handleGetInvoice(billId);
      if (res?.invoice) {
        setMobileDetailsInvoice(res.invoice);
      }
    } catch (err) {
      console.error("Failed to fetch invoice details:", err);
    } finally {
      setMobileDetailsLoading(false);
    }
  };

  const handleWhatsAppShare = async (invoice: any) => {
    const raw = ((invoice?.raw ?? invoice) ?? {}) as Record<string, unknown>;

    const customerName =
      String(
        invoice?.customer || raw.customerName || "Customer",
      ).trim() || "Customer";

    const docCode = String(
      raw.returnCode ?? raw.invoiceCode ?? invoice?.invoiceCode ?? invoice?.bill ?? invoice?.id ?? "",
    );

    const isCreditNote = Boolean(raw.returnCode);
    const docLabel = isCreditNote
      ? "Sales Return / Credit Note"
      : "Invoice";

    const totalVal = Number(
      currentInvoiceTotal(raw) || invoice?.amount || raw?.grandTotal || 0,
    );
    const totalFormatted = `₹ ${totalVal.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    const paymentStatus = paymentStatusForWhatsApp(
      raw,
      String(invoice?.status || raw.status || ""),
    );

    const hostedLink = resolveHostedInvoiceLink(raw);

    const message = buildWoowooInvoiceWhatsAppMessage({
      customerName,
      docLabel,
      docCode,
      totalFormatted,
      paymentStatus,
      externalLink: hostedLink || undefined,
    });

    Swal.fire({
      title: "Preparing…",
      text: "Generating invoice PDF for WhatsApp",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    let blobPkg: { blob: Blob; filename: string } | null = null;
    try {
      blobPkg = await getInvoicePdfBlob(raw);
    } catch (e) {
      console.error(e);
    }

    Swal.close();

    const pdfFile =
      blobPkg &&
      new File([blobPkg.blob], blobPkg.filename, {
        type: "application/pdf",
      });

    const canSharePdf =
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      Boolean(pdfFile) &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [pdfFile!] });

    if (canSharePdf && pdfFile) {
      try {
        await navigator.share({
          text: message,
          files: [pdfFile],
        });
        return;
      } catch (err) {
        const aborted =
          err instanceof Error && err.name === "AbortError";
        if (aborted) return;
        console.warn("Share sheet failed, opening WhatsApp Web:", err);
      }
    }

    const digits = normalizeIndianWhatsAppDigits(
      String(invoice?.phone || raw.customerPhone || ""),
    );
    const waBase = digits
      ? `https://wa.me/${digits}`
      : "https://wa.me/";
    window.open(
      `${waBase}?text=${encodeURIComponent(message)}`,
      "_blank",
    );

    if (blobPkg) {
      const url = URL.createObjectURL(blobPkg.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = blobPkg.filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      await Swal.fire({
        icon: "info",
        title: "PDF downloaded",
        text: "Attach the downloaded PDF to your WhatsApp message (WhatsApp Web cannot auto-attach files).",
      });
    } else if (!hostedLink) {
      await Swal.fire({
        icon: "warning",
        title: "PDF unavailable",
        text: "Could not generate the invoice PDF. Try the Download button or add a hosted link from your server.",
      });
    }
  };

  const handleDownloadBill = async (invoice: any) => {
    const raw = (invoice?.raw ?? invoice) ?? invoice;
    try {
      Swal.fire({
        title: "Generating PDF...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      await downloadInvoicePdf(raw);
      Swal.close();
    } catch {
      Swal.fire("Error", "Could not generate PDF.", "error");
    }
  };

  const tabRoutes: Record<TabKey, string> = {
    bills: canPath("/pos") ? "/pos" : "/invoices",
    bookings: "/allBookings",
    subscriptions: "/subscriptions",
    customers: "/customers",
    memberships: "/manage-plans",
    products: "/products",
    spaces: "/spaces",
    services: "/services",
    food: "/foods",
  };

  const refreshProducts = async () => {
    try {
      const res = await handleGetProducts({ type: "product", limit: 50 });
      setProducts(
        (Array.isArray(res?.products) ? res.products : []).map(
          (p: Record<string, unknown>, i: number) => {
            const stock = Number(p?.stockQty ?? 0);
            const img =
              (typeof p?.imageUrl === "string" && p.imageUrl.trim()
                ? p.imageUrl.trim()
                : null) ||
              (Array.isArray(p?.images) &&
              p.images.length > 0 &&
              typeof p.images[0] === "string" &&
              p.images[0].trim()
                ? p.images[0].trim()
                : null) ||
              (typeof p?.image === "string" && p.image.trim()
                ? p.image.trim()
                : null) ||
              null;
            return {
              id: String(p?._id ?? i),
              title: String(p?.productName || p?.name || "Product"),
              subtitle: String(p?.category || "General"),
              meta: stock > 0 ? "In stock" : "Out of stock",
              amount: formatMoney(Number(p?.sellingPrice ?? 0)),
              imageUrl: img,
              stockQty: stock,
              code: String(p?.barCode || p?.barcode || p?.itemCode || ""),
              raw: p,
            };
          },
        ),
      );
    } catch (e) {
      console.error("Failed to refresh products:", e);
    }
  };

  const handleDeleteProductDashboard = async (productId: string) => {
    try {
      const result = await Swal.fire({
        title: "Delete Product?",
        text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Yes, delete it!",
      });

      if (result.isConfirmed) {
        await handleDeleteProduct(productId);
        setViewProduct(null);
        Swal.fire("Deleted!", "Product has been deleted.", "success");
        await refreshProducts();
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      Swal.fire("Error!", "Failed to delete product.", "error");
    }
  };

  const handleSubmitProductDashboard = async (formData: FormData) => {
    try {
      setProductModalLoading(true);
      const prodId = editProduct?._id || editProduct?.id;
      if (prodId) {
        await handleUpdateProduct(prodId, formData);
        Swal.fire("Updated!", "Product updated successfully.", "success");
      } else {
        await handleCreateProduct(formData);
        Swal.fire("Created!", "Product created successfully.", "success");
      }
      setShowCreateProductModal(false);
      setEditProduct(null);
      await refreshProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      throw error;
    } finally {
      setProductModalLoading(false);
    }
  };

  const refreshSpaces = async () => {
    try {
      const res = await handleGetSpaces();
      setSpaces(
        (Array.isArray(res?.spaces) ? res.spaces : []).map(
          (s: Record<string, unknown>, i: number) => {
            const img =
              (typeof s?.imageUrl === "string" && s.imageUrl.trim()
                ? s.imageUrl.trim()
                : null) ||
              (Array.isArray(s?.images) &&
              s.images.length > 0 &&
              typeof s.images[0] === "string" &&
              s.images[0].trim()
                ? s.images[0].trim()
                : null) ||
              (typeof s?.image === "string" && s.image.trim()
                ? s.image.trim()
                : null) ||
              null;
            const statusStr = String(s?.status || "Available");
            return {
              id: String(s?._id ?? i),
              title: String(s?.name || "Space"),
              subtitle: String(s?.category || s?.spaceType || "Space"),
              meta: statusStr,
              amount: formatMoney(Number(s?.price ?? 0)),
              imageUrl: img,
              capacity: Number(s?.capacity ?? 0),
              spaceType: String(s?.spaceType || ""),
              day: String(s?.day || ""),
              code: String(s?.spaceCode || ""),
              raw: s,
            };
          },
        ),
      );
    } catch (e) {
      console.error("Failed to refresh spaces:", e);
    }
  };

  const refreshFoods = async () => {
    try {
      const res = await handleGetFoods();
      setFoods(
        (Array.isArray(res?.foods) ? res.foods : []).map(
          (f: Record<string, unknown>, i: number) => {
            const img =
              (typeof f?.imageUrl === "string" && f.imageUrl.trim()
                ? f.imageUrl.trim()
                : null) ||
              (Array.isArray(f?.images) &&
              f.images.length > 0 &&
              typeof f.images[0] === "string" &&
              f.images[0].trim()
                ? f.images[0].trim()
                : null) ||
              (typeof f?.image === "string" && f.image.trim()
                ? f.image.trim()
                : null) ||
              null;
            return {
              id: String(f?._id ?? i),
              title: String(f?.name || "Food"),
              subtitle: String(f?.category || "Food"),
              meta: String(f?.status || "Active"),
              amount: formatMoney(Number(f?.price ?? 0)),
              imageUrl: img,
              raw: f,
            };
          },
        ),
      );
    } catch {
      /* ignore */
    }
  };

  
  
  const handleDeleteCustomerDashboard = async (customerId: string, customerName?: string) => {
    if (!customerId) return;
    const result = await Swal.fire({
      title: "Delete Customer?",
      text: `Are you sure you want to delete ${customerName || "this customer"}? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;

    try {
      await handleDeleteCustomer(customerId);
      setCustomers((prev) => prev.filter((c) => c.id !== customerId && (c.raw as any)?._id !== customerId));
      await Swal.fire({
        icon: "success",
        title: "Deleted",
        text: "Customer deleted successfully.",
        timer: 1500,
        showConfirmButton: false,
      });
      await loadDashboardData();
    } catch (err: any) {
      await Swal.fire(
        "Delete failed",
        err?.response?.data?.message || "Could not delete customer.",
        "error",
      );
    }
  };

  const handleDeleteFoodDashboard = async (foodId: string, foodName?: string) => {
    if (!foodId) return;
    const result = await Swal.fire({
      title: "Delete Food Item?",
      text: `Are you sure you want to delete ${foodName || "this food item"}? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;

    try {
      await handleDeleteFood(foodId);
      setViewFood(null);
      setFoods((prev) => prev.filter((f) => f.id !== foodId && (f.raw as any)?._id !== foodId));
      await Swal.fire({
        icon: "success",
        title: "Deleted",
        text: "Food item deleted successfully.",
        timer: 1500,
        showConfirmButton: false,
      });
      await refreshFoods();
    } catch (err: any) {
      await Swal.fire(
        "Delete failed",
        err?.response?.data?.message || "Could not delete food item.",
        "error",
      );
    }
  };

  const handleSaveFoodDashboard = async (
    payload: FoodFormPayload,
    imageFile: File | null,
  ) => {
    try {
      setFoodModalLoading(true);
      const formData = foodPayloadToFormData(payload, imageFile);
      const foodId = editFood?._id || editFood?.id;

      if (foodId) {
        await handleUpdateFood(foodId, formData);
        await Swal.fire({
          icon: "success",
          title: "Food updated",
          timer: 1400,
          showConfirmButton: false,
        });
      } else {
        await handleCreateFood(formData);
        await Swal.fire({
          icon: "success",
          title: "Food created",
          timer: 1400,
          showConfirmButton: false,
        });
      }

      setShowAddFoodModal(false);
      setEditFood(null);
      await refreshFoods();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "Save failed",
        err?.response?.data?.message || "Could not save food.",
        "error",
      );
    } finally {
      setFoodModalLoading(false);
    }
  };

  const handleDeleteSpaceDashboard = async (spaceId: string, spaceName: string) => {
    try {
      const result = await Swal.fire({
        title: "Delete space?",
        text: `Remove "${spaceName || "this space"}" from catalogue?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete",
        confirmButtonColor: "#ef4444",
      });

      if (result.isConfirmed) {
        await handleDeleteSpace(spaceId);
        setViewSpace(null);
        Swal.fire({
          icon: "success",
          title: "Deleted",
          text: "Space deleted successfully.",
          timer: 1400,
          showConfirmButton: false,
        });
        await refreshSpaces();
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Delete failed",
        err?.response?.data?.message || "Could not delete space.",
        "error",
      );
    }
  };

  const handleSubmitSpaceDashboard = async (
    payload: SpaceFormPayload,
    imageFile: File | null,
  ) => {
    try {
      setSpaceModalSaving(true);
      const formData = spacePayloadToFormData(payload, imageFile);
      const spaceId = editingSpace?._id || editingSpace?.id;

      if (spaceId) {
        await handleUpdateSpace(spaceId, formData);
        Swal.fire({
          icon: "success",
          title: "Space updated",
          timer: 1400,
          showConfirmButton: false,
        });
      } else {
        await handleCreateSpace(formData);
        Swal.fire({
          icon: "success",
          title: "Space created",
          timer: 1400,
          showConfirmButton: false,
        });
      }
      setOpenSpaceModal(false);
      setEditingSpace(null);
      await refreshSpaces();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Save failed",
        err?.response?.data?.message || "Could not save space.",
        "error",
      );
    } finally {
      setSpaceModalSaving(false);
    }
  };

  const handleMobileSubscriptionClick = (sub: GenericRow) => {
    if (sub.raw) {
      setSelectedSubscription(sub.raw);
      setSubscriptionMode("view");
      setOpenCreateSubscriptionModal(true);
    } else {
      navigate("/subscriptions");
    }
  };

  const handleMobileBookingClick = (row: GenericRow) => {
    if (row.id.startsWith("invoice-") && row.raw) {
      navigate("/create-invoice", { state: { invoice: row.raw, mode: "view" } });
      return;
    }
    navigate("/allBookings");
  };

  const openDuePay = (row: GenericRow) => {
    setDuePay(row);
  };


  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 font-sans">
      <section className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Welcome back, {welcomeName}!
            </p>
          </div>
          <div className="relative shrink-0" ref={kpiRef}>
            <button
              type="button"
              onClick={() => setKpiOpen((open) => !open)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 sm:h-10 sm:text-sm"
              aria-haspopup="listbox"
              aria-expanded={kpiOpen}
            >
              <span className="max-w-[7.5rem] truncate sm:max-w-none">
                {kpiPeriodLabel}
              </span>
              <ChevronDown
                size={14}
                className={`shrink-0 text-gray-400 transition ${kpiOpen ? "rotate-180" : ""}`}
              />
            </button>
            {kpiPeriod === "custom" ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(event) => setCustomFrom(event.target.value)}
                  className="h-9 rounded-xl border border-gray-200 bg-white px-2 text-xs text-gray-700 sm:h-10"
                  aria-label="From date"
                />
                <input
                  type="date"
                  value={customTo}
                  min={customFrom || undefined}
                  onChange={(event) => setCustomTo(event.target.value)}
                  className="h-9 rounded-xl border border-gray-200 bg-white px-2 text-xs text-gray-700 sm:h-10"
                  aria-label="To date"
                />
              </div>
            ) : null}
            {kpiOpen ? (
              <div
                role="listbox"
                className="absolute right-0 z-30 mt-1.5 min-w-[10.5rem] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
              >
                {KPI_PERIOD_OPTIONS.map((opt) => {
                  const active = opt.value === kpiPeriod;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        setKpiPeriod(opt.value);
                        setKpiOpen(false);
                      }}
                      className={`flex w-full items-center px-3 py-2 text-left text-sm transition ${
                        active
                          ? "bg-blue-50 font-semibold text-blue-700"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
        {/* <div className="hidden flex-wrap items-center gap-2 sm:flex"> */}
          {/* <button
            type="button"
            onClick={() => setOpenPos(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-600 shadow-sm transition hover:bg-blue-50"
          >
            <Monitor size={16} />
            POS
          </button> */}
          {/* <button
            type="button"
            onClick={() => navigate("/foodBill")}
            className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm font-semibold text-orange-600 shadow-sm transition hover:bg-orange-50"
          >
            <Utensils size={16} />
            Food Bill
          </button> */}
          {/* <button
            type="button"
            onClick={() => setOpenCreateCustomerModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-600 shadow-sm transition hover:bg-emerald-50"
          >
            <UserPlus size={16} />
            Add Customer
          </button> */}
          {/* <button
            type="button"
            onClick={() => setOpenCreateSubscriptionModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
          >
            <Crown size={16} />
            Activate Membership
          </button> */}
        {/* </div> */}
      </section>

      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <RevenueCard
          title="Revenue"
          period={kpiPeriodLabel}
          value={formatMoney(revenue?.total ?? 0)}
          icon={TrendingUp}
          iconWrapClass="bg-blue-600"
          loading={cardsLoading}
          breakdown={[
            {
              label: "Store",
              value: formatCompact(revenue?.store ?? 0),
              colorClass: "text-blue-600",
            },
            {
              label: "Space",
              value: formatCompact(revenue?.space ?? 0),
              colorClass: "text-emerald-600",
            },
            {
              label: "Services",
              value: formatCompact(revenue?.services ?? 0),
              colorClass: "text-violet-600",
            },
            {
              label: "Food",
              value: formatCompact(revenue?.food ?? 0),
              colorClass: "text-rose-600",
            },
            {
              label: "Membership",
              value: formatMoney(revenue?.membership ?? 0),
              colorClass: "text-indigo-600",
            },
          ]}
        />
        <RevenueCard
          title="Membership"
          period={kpiPeriodLabel}
          value={formatCount(membershipSummary?.total ?? 0)}
          icon={Crown}
          iconWrapClass="bg-violet-600"
          loading={cardsLoading}
          breakdown={membershipBreakdown}
        />
        <RevenueCard
          title="Network"
          period={kpiPeriodLabel}
          value={formatCount(networkSummary?.total ?? 0)}
          icon={UserPlus}
          iconWrapClass="bg-emerald-600"
          loading={cardsLoading}
          breakdown={[
            {
              label: "Customers",
              value: formatCount(networkSummary?.customers ?? 0),
              colorClass: "text-emerald-600",
            },
            {
              label: "Vendors",
              value: formatCount(networkSummary?.vendors ?? 0),
              colorClass: "text-blue-600",
            },
            {
              label: "CSP",
              value: formatCount(networkSummary?.csp ?? 0),
              colorClass: "text-rose-600",
            },
          ]}
        />
        <RevenueCard
          title="Purchase & Expense"
          period={kpiPeriodLabel}
          value={formatMoney(purchaseExpense?.total ?? 0)}
          icon={ShoppingCart}
          iconWrapClass="bg-orange-500"
          loading={cardsLoading}
          breakdown={[
            {
              label: "Purchase",
              value: formatMoney(purchaseExpense?.purchase ?? 0),
              colorClass: "text-blue-600",
            },
            {
              label: "Total Expenses",
              value: formatMoney(purchaseExpense?.expense ?? 0),
              colorClass: "text-orange-600",
            },
          ]}
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto border-b border-gray-100">
          <div className="flex min-w-max gap-1 px-2 pt-2 sm:px-4">
            {TABS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition ${
                    active
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 sm:p-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
            <Search size={16} className="shrink-0 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full min-w-0 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
            />
            
          </div>
           {tab === "bills" ? (
            <div className="relative shrink-0" ref={filterRef}>
              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                className="inline-flex h-[42px] items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:px-3"
                aria-label="Filter by payment status"
              >
                <Filter size={16} className="shrink-0 text-gray-400" />
                <span className="max-w-[4.5rem] truncate sm:max-w-none">
                  {statusFilter === "all" ? "All" : statusFilter}
                </span>
              </button>
              {filterOpen ? (
                <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
                  {(["all", "Paid", "Pending"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setStatusFilter(opt);
                        setFilterOpen(false);
                      }}
                      className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                        statusFilter === opt
                          ? "font-semibold text-blue-600"
                          : "text-gray-700"
                      }`}
                    >
                      {opt === "all" ? "All" : opt}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => navigate(tabRoutes[tab])}
            className="shrink-0 whitespace-nowrap px-1 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
          >
            View all
          </button>
        </div>

        {/* Category Pills Bar (for Products tab) */}
        {tab === "products" && (categoriesList.length > 0 || productCategories.length > 0) && (
          <div className="flex items-center gap-2 overflow-x-auto px-3 pb-3 sm:px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button
              type="button"
              onClick={() => setSelectedProductCategory("all")}
              className={`inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 cursor-pointer ${
                selectedProductCategory === "all"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All
              {selectedProductCategory === "all" && products.length > 0 && (
                <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-blue-600">
                  {products.length}
                </span>
              )}
            </button>
            {categoriesList.map((catName) => {
              const isSelected =
                selectedProductCategory.toLowerCase() ===
                catName.toLowerCase();
              const count =
                categoryCounts[catName.toLowerCase()] || 0;
              return (
                <button
                  key={catName}
                  type="button"
                  onClick={() =>
                    setSelectedProductCategory(
                      isSelected ? "all" : catName,
                    )
                  }
                  className={`inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 cursor-pointer ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {catName}
                  {isSelected && (
                    <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-blue-600">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Space Type Pills Bar (for Spaces tab) */}
        {tab === "spaces" && (
          <div className="flex items-center gap-2 overflow-x-auto px-3 pb-3 sm:px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button
              type="button"
              onClick={() => setSelectedSpaceType("all")}
              className={`inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 cursor-pointer ${
                selectedSpaceType === "all"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All
              {selectedSpaceType === "all" && spaces.length > 0 && (
                <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-blue-600">
                  {spaceTypeCounts.all}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() =>
                setSelectedSpaceType(
                  selectedSpaceType === "Coworking" ? "all" : "Coworking",
                )
              }
              className={`inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 cursor-pointer ${
                selectedSpaceType === "Coworking"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Co-working
              {selectedSpaceType === "Coworking" && (
                <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-blue-600">
                  {spaceTypeCounts.coworking}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() =>
                setSelectedSpaceType(
                  selectedSpaceType === "Exclusive" ? "all" : "Exclusive",
                )
              }
              className={`inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 cursor-pointer ${
                selectedSpaceType === "Exclusive"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Exclusive
              {selectedSpaceType === "Exclusive" && (
                <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-blue-600">
                  {spaceTypeCounts.exclusive}
                </span>
              )}
            </button>
          </div>
        )}

     

        {tab === "bills" ? (
          <>
            {/* Mobile View: Dedicated Card per transaction (Mobile only) */}
            <div className="block md:hidden space-y-2.5 p-3">
              {billsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white p-3.5"
                  />
                ))
              ) : pageBills.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <FileText size={24} />
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-slate-800">
                    No bills found
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    No bills found for this filter.
                  </p>
                </div>
              ) : (
                pageBills.map((bill) => {
                  const raw = (bill.raw || {}) as Record<string, unknown>;
                  const isPaid = bill.status === "Paid";
                  const isPending =
                    bill.status === "Pending" || bill.status === "Unpaid";
                  const isDraft = bill.status === "Draft";
                  const customerName =
                    bill.customer && bill.customer !== "undefined"
                      ? bill.customer
                      : "Walk-in Customer";
                  const categories = getInvoiceCategories(bill.raw);
                  const membershipLabel = getCustomerMembershipLabel(bill.raw);
                  const when = formatBillDate(bill.createdAt);
                  const dueAmount = Number(
                    raw.pendingAmount ??
                      (
                        raw.paymentBreakdown as
                          | { dueAmount?: number }
                          | undefined
                      )?.dueAmount ??
                      0,
                  );
                  const owner = String(
                    (raw.createdBy as { m_staff_name?: string } | undefined)
                      ?.m_staff_name ||
                      raw.salesPersonName ||
                      "System",
                  );
                  const displayStatus = isPending ? "Pending" : bill.status;

                  return (
                    <div
                      key={bill.id}
                      onClick={() => void handleMobileBillClick(bill)}
                      className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition hover:border-slate-300 active:bg-slate-50/70"
                    >
                      {/* Card Top Section */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {/* Customer Name + Membership Label */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="truncate text-base font-bold text-slate-900">
                              {customerName}
                            </h3>
                            {membershipLabel && (
                              <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-700 ring-1 ring-inset ring-purple-200">
                                {membershipLabel}
                              </span>
                            )}
                          </div>

                          {/* Invoice Code + Mode + Category Labels */}
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-medium text-slate-500">
                              {bill.invoiceCode}
                            </span>
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                              {bill.paymentType}
                            </span>
                            {categories.length > 0 ? (
                              categories.map((cat) => (
                                <span
                                  key={cat}
                                  className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                                    cat === "Food"
                                      ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
                                      : cat === "Space"
                                        ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200"
                                        : cat === "Membership"
                                          ? "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-200"
                                          : "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200"
                                  }`}
                                >
                                  {cat}
                                </span>
                              ))
                            ) : (
                              <span
                                className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${CATEGORY_PILL[bill.category]}`}
                              >
                                {bill.category}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end">
                          {/* Status Badge */}
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                              isPaid
                                ? "border border-emerald-200 bg-emerald-50 text-emerald-600"
                                : isPending
                                  ? "border border-amber-200 bg-amber-50 text-amber-600"
                                  : isDraft
                                    ? "border border-slate-200 bg-slate-100 text-slate-600"
                                    : "border border-rose-200 bg-rose-50 text-rose-600"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isPaid
                                  ? "bg-emerald-500"
                                  : isPending
                                    ? "bg-amber-500"
                                    : isDraft
                                      ? "bg-slate-400"
                                      : "bg-rose-500"
                              }`}
                            />
                            {displayStatus.toLowerCase()}
                          </span>

                          {/* Amount */}
                          <div className="mt-1.5 text-right">
                            <span className="text-base font-bold text-slate-900">
                              {formatMoney(bill.amount)}
                            </span>
                            {dueAmount > 0 && (
                              <div className="text-[10px] font-semibold text-amber-600">
                                Due {formatMoney(dueAmount)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Subtle Horizontal Divider */}
                      <div className="my-2.5 border-t border-slate-100" />

                      {/* Card Bottom Section */}
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex min-w-0 items-center gap-1 truncate text-slate-400">
                          <Calendar
                            size={13}
                            className="shrink-0 text-slate-400"
                          />
                          <span className="truncate">
                            {when.day}
                            {when.time ? `, ${when.time}` : ""} • By {owner}
                          </span>
                        </div>

                        <div
                          className="flex shrink-0 items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => void handleMobileBillClick(bill)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-95"
                            title="Bill Actions"
                            aria-label="Bill Actions"
                          >
                            <Ellipsis size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table (Desktop only) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-[860px] w-full text-sm">
                <thead className="bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Invoice No.</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Total Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Payment Type</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {billsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-t border-gray-50">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
                        </td>
                      </tr>
                    ))
                  ) : pageBills.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-12 text-center text-gray-500"
                      >
                        No bills found for this filter.
                      </td>
                    </tr>
                  ) : (
                    pageBills.map((bill, index) => {
                      const tone = AVATAR_TONES[index % AVATAR_TONES.length];
                      const styles = statusStyles(bill.status);
                      const when = formatBillDate(bill.createdAt);
                      const displayStatus =
                        bill.status === "Pending" || bill.status === "Unpaid"
                          ? "Pending"
                          : bill.status;
                      return (
                        <tr
                          key={bill.id}
                          className="border-t border-gray-50 transition hover:bg-slate-50/80"
                        >
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            {bill.invoiceCode}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tone.bg} ${tone.text}`}
                              >
                                {initials(bill.customer)}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-gray-900">
                                  {bill.customer}
                                </p>
                                <p className="truncate text-xs text-gray-500">
                                  {bill.phone}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <p>{when.day}</p>
                            <p className="text-xs text-gray-400">{when.time}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${CATEGORY_PILL[bill.category]}`}
                            >
                              {bill.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            {formatMoney(bill.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${styles.pill}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${styles.dot}`}
                              />
                              {displayStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {bill.paymentType}
                          </td>
                          <td className="relative px-4 py-3 text-right">
                            <button
                              type="button"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuId(menuId === bill.id ? null : bill.id);
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                              aria-label="Bill actions"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {menuId === bill.id ? (
                              <div
                                className="absolute right-4 z-20 mt-1 w-36 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 text-left shadow-lg"
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                {bill.status === "Draft" ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMenuId(null);
                                        continueDraft(bill.raw || bill);
                                      }}
                                      className="block w-full px-3 py-2 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50"
                                    >
                                      Continue
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMenuId(null);
                                        void (async () => {
                                          const invoiceId = String(
                                            (bill.raw as { _id?: string } | undefined)?._id ||
                                              bill.id,
                                          );
                                          const confirm = await Swal.fire({
                                            title: "Delete Invoice?",
                                            text: "This action cannot be undone.",
                                            icon: "error",
                                            showCancelButton: true,
                                            confirmButtonText: "Yes, Delete",
                                          });
                                          if (!confirm.isConfirmed) return;
                                          try {
                                            await handleDeleteInvoice(invoiceId);
                                            Swal.fire(
                                              "Deleted",
                                              "Invoice deleted successfully.",
                                              "success",
                                            );
                                            void loadDashboardData();
                                          } catch {
                                            Swal.fire(
                                              "Error",
                                              "Could not delete invoice.",
                                              "error",
                                            );
                                          }
                                        })();
                                      }}
                                      className="block w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                                    >
                                      Delete
                                    </button>
                                  </>
                                ) : (
                                <button
                                  type="button"
                                  onClick={() => openBill(bill)}
                                  className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  View bill
                                </button>
                                )}
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : tab === "bookings" ? (
          <>
            {/* Mobile Cards (Mobile only) */}
            <div className="block md:hidden space-y-2.5 p-3">
              {tabLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-28 animate-pulse rounded-2xl border border-slate-200/80 bg-slate-50 p-3.5"
                  />
                ))
              ) : pageGeneric.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                  <Package className="mx-auto h-8 w-8 text-slate-300" />
                  <h4 className="mt-3 text-sm font-semibold text-slate-800">
                    No bookings found
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    No bookings found for this filter.
                  </p>
                </div>
              ) : (
                pageGeneric.map((row, index) => {
                  const s = genericStatusStyles(row.meta);
                  const when = formatBillDate(row.createdAt ?? null);
                  return (
                    <div
                      key={row.id || index}
                      onClick={() => handleMobileBookingClick(row)}
                      className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition hover:border-slate-300 active:bg-slate-50/70"
                    >
                      {/* Card Top Section */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {/* Customer Name + Membership Label */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="truncate text-base font-bold text-slate-900">
                              {row.title || "Customer"}
                            </h3>
                            {row.badge && (
                              <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-700 ring-1 ring-inset ring-purple-200">
                                {row.badge}
                              </span>
                            )}
                          </div>

                          {/* Booking Code + Payment Status + Inclusions */}
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-medium text-slate-500">
                              {row.code}
                            </span>
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                              {row.paymentType || "Pending"}
                            </span>
                            {row.inclusions && row.inclusions.length > 0 ? (
                              row.inclusions.map((inc) => (
                                <span
                                  key={inc}
                                  className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                                    inc === "Food"
                                      ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
                                      : inc.toLowerCase().includes("space") ||
                                          inc.toLowerCase().includes("desk") ||
                                          inc.toLowerCase().includes("cabin") ||
                                          inc.toLowerCase().includes("room")
                                        ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200"
                                        : "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200"
                                  }`}
                                >
                                  {inc}
                                </span>
                              ))
                            ) : (
                              <span className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200">
                                Space
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end">
                          {/* Status Badge */}
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${s.pill}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                            {row.meta.toLowerCase()}
                          </span>

                          {/* Amount */}
                          <div className="mt-1.5 text-right">
                            <span className="text-base font-bold text-slate-900">
                              {row.amount}
                            </span>
                            {(row.dueAmount ?? 0) > 0 && (
                              <div className="text-[10px] font-semibold text-amber-600">
                                Due {formatMoney(row.dueAmount!)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Subtle Horizontal Divider */}
                      <div className="my-2.5 border-t border-slate-100" />

                      {/* Card Bottom Section */}
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex min-w-0 items-center gap-1 truncate text-slate-400">
                          <Calendar
                            size={13}
                            className="shrink-0 text-slate-400"
                          />
                          <span className="truncate">
                            {when.day}
                            {when.time ? `, ${when.time}` : ""}
                            {row.phone ? ` • ${row.phone}` : ""}
                          </span>
                        </div>

                        <div
                          className="flex shrink-0 items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(row.dueAmount ?? 0) > 0.009 ? (
                            <button
                              type="button"
                              onClick={() => openDuePay(row)}
                              className="rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700"
                            >
                              Due pay
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleMobileBookingClick(row)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-95"
                            title="View Booking"
                            aria-label="View Booking"
                          >
                            <Ellipsis size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table (Desktop only) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-[760px] w-full text-sm">
                <thead className="bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Booking Code</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Inclusions</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {tabLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-t border-gray-50">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
                        </td>
                      </tr>
                    ))
                  ) : pageGeneric.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-12 text-center text-gray-500"
                      >
                        No bookings found.
                      </td>
                    </tr>
                  ) : (
                    pageGeneric.map((row) => {
                      const s = genericStatusStyles(row.meta);
                      const when = formatBillDate(row.createdAt ?? null);
                      return (
                        <tr
                          key={row.id}
                          onClick={() => handleMobileBookingClick(row)}
                          className="cursor-pointer border-t border-gray-50 transition hover:bg-slate-50/80"
                        >
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            {row.code}
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">
                                {row.title}
                              </p>
                              {row.phone && (
                                <p className="text-xs text-gray-400">
                                  {row.phone}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <p>{when.day}</p>
                            {when.time && (
                              <p className="text-xs text-gray-400">
                                {when.time}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {row.inclusions && row.inclusions.length > 0 ? (
                                row.inclusions.map((inc) => (
                                  <span
                                    key={inc}
                                    className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700"
                                  >
                                    {inc}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.tablePill}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${s.dot}`}
                              />
                              {row.meta}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {row.paymentType || "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className="font-semibold text-gray-900">{row.amount}</p>
                            {(row.dueAmount ?? 0) > 0.009 ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openDuePay(row);
                                }}
                                className="mt-1 text-[11px] font-semibold text-amber-700 hover:underline"
                              >
                                Due {formatMoney(row.dueAmount || 0)} · Pay
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : tab === "subscriptions" ? (
          <>
            {/* Mobile Cards (Mobile only) */}
            <div className="block md:hidden space-y-2.5 p-3">
              {tabLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-28 animate-pulse rounded-2xl border border-slate-200/80 bg-slate-50 p-3.5"
                  />
                ))
              ) : pageGeneric.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                  <Ticket className="mx-auto h-8 w-8 text-slate-300" />
                  <h4 className="mt-3 text-sm font-semibold text-slate-800">
                    No subscriptions found
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    No subscriptions found for this filter.
                  </p>
                </div>
              ) : (
                pageGeneric.map((row, index) => {
                  const s = genericStatusStyles(row.meta);
                  const when = formatBillDate(row.createdAt ?? null);
                  return (
                    <div
                      key={row.id || index}
                      onClick={() => handleMobileSubscriptionClick(row)}
                      className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition hover:border-slate-300 active:bg-slate-50/70"
                    >
                      {/* Card Top Section */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {/* Customer Name + Plan Label */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="truncate text-base font-bold text-slate-900">
                              {row.title || "Customer"}
                            </h3>
                            {row.badge && (
                              <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-700 ring-1 ring-inset ring-purple-200">
                                {row.badge}
                              </span>
                            )}
                          </div>

                          {/* Code + Payment Method + Membership Tag */}
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-medium text-slate-500">
                              {row.code}
                            </span>
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                              {row.paymentType || "UPI"}
                            </span>
                            <span className="inline-flex items-center rounded-md bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 ring-1 ring-inset ring-purple-200">
                              Membership
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end">
                          {/* Status Badge */}
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${s.pill}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                            {row.meta.toLowerCase()}
                          </span>

                          {/* Amount */}
                          <div className="mt-1.5 text-right">
                            <span className="text-base font-bold text-slate-900">
                              {row.amount}
                            </span>
                            {(row.dueAmount ?? 0) > 0 && (
                              <div className="text-[10px] font-semibold text-amber-600">
                                Due {formatMoney(row.dueAmount!)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Subtle Horizontal Divider */}
                      <div className="my-2.5 border-t border-slate-100" />

                      {/* Card Bottom Section */}
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex min-w-0 items-center gap-1 truncate text-slate-400">
                          <Calendar
                            size={13}
                            className="shrink-0 text-slate-400"
                          />
                          <span className="truncate">
                            {when.day}
                            {when.time ? `, ${when.time}` : ""}
                            {row.owner ? ` • By ${row.owner}` : ""}
                          </span>
                        </div>

                        <div
                          className="flex shrink-0 items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleMobileSubscriptionClick(row)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-95"
                            title="View Subscription"
                            aria-label="View Subscription"
                          >
                            <Ellipsis size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table (Desktop only) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-[640px] w-full text-sm">
                <thead className="bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {tabLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-t border-gray-50">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
                        </td>
                      </tr>
                    ))
                  ) : pageGeneric.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-12 text-center text-gray-500"
                      >
                        No subscriptions found.
                      </td>
                    </tr>
                  ) : (
                    pageGeneric.map((row) => {
                      const when = formatBillDate(row.createdAt ?? null);
                      const s = genericStatusStyles(row.meta);
                      return (
                        <tr
                          key={row.id}
                          onClick={() => handleMobileSubscriptionClick(row)}
                          className="cursor-pointer border-t border-gray-50 transition hover:bg-slate-50/80"
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {row.title}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {row.badge || row.subtitle}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <div className="flex flex-col">
                              <span>{when?.day || "—"}</span>
                              {when?.time ? (
                                <span className="text-[11px] text-gray-400">
                                  {when.time}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.tablePill}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${s.dot}`}
                              />
                              {row.meta}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            {row.amount || "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : tab === "products" || tab === "spaces" || tab === "food" ? (
          <>
            {tabLoading ? (
              <div className="grid grid-cols-2 gap-2.5 p-3 sm:gap-3.5 sm:p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs"
                  >
                    <div className="aspect-4/3 w-full animate-pulse bg-slate-100" />
                    <div className="space-y-2 p-2.5 sm:p-3">
                      <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-100" />
                      <div className="h-3.5 w-3/4 animate-pulse rounded bg-slate-200" />
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                        <div className="h-3.5 w-1/3 animate-pulse rounded bg-slate-200" />
                        <div className="h-6 w-6 animate-pulse rounded-full bg-slate-100" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : pageGeneric.length === 0 ? (
              <div className="p-4 sm:p-6">
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                  {tab === "products" ? (
                    <Package className="mx-auto h-8 w-8 text-slate-300" />
                  ) : tab === "spaces" ? (
                    <MapPin className="mx-auto h-8 w-8 text-slate-300" />
                  ) : (
                    <Utensils className="mx-auto h-8 w-8 text-slate-300" />
                  )}
                  <h4 className="mt-3 text-sm font-semibold text-slate-800">
                    No {tab === "products" ? "products" : tab === "spaces" ? "spaces" : "food items"} found
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    {search
                      ? `No ${tab} matching "${search}".`
                      : `No ${tab} available in the dashboard.`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 p-3 sm:gap-3.5 sm:p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {pageGeneric.map((row, index) => {
                  const hasImage = Boolean(row.imageUrl && !imageErrors[row.id]);
                  return (
                    <div
                      key={row.id || index}
                      onClick={() => {
                        if (tab === "products") {
                          setViewProduct(row);
                        } else if (tab === "spaces") {
                          setViewSpace(row);
                        } else if (tab === "food") {
                          setViewFood(row);
                        } else {
                          navigate(
                            tabRoutes[tab] || "/foods",
                          );
                        }
                      }}
                      className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition hover:border-blue-300 hover:shadow-md cursor-pointer active:scale-[0.98]"
                    >
                      {/* Image Area */}
                      <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-100">
                        {hasImage ? (
                          <img
                            src={row.imageUrl!}
                            alt={row.title}
                            loading="lazy"
                            onError={() =>
                              setImageErrors((prev) => ({
                                ...prev,
                                [row.id]: true,
                              }))
                            }
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 text-slate-300">
                            {tab === "products" ? (
                              <Package
                                size={28}
                                className="text-slate-300 transition group-hover:text-blue-400"
                              />
                            ) : tab === "spaces" ? (
                              <MapPin
                                size={28}
                                className="text-slate-300 transition group-hover:text-blue-400"
                              />
                            ) : (
                              <Utensils
                                size={28}
                                className="text-slate-300 transition group-hover:text-orange-400"
                              />
                            )}
                          </div>
                        )}

                        {/* Top-Left: Veg/Non-Veg for food */}
                        {tab === "food" ? (
                          <div className="absolute top-2 left-2 z-10">
                            <span
                              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold shadow-xs backdrop-blur-xs ${
                                (row.raw as any)?.isVeg !== false
                                  ? "bg-emerald-600 text-white"
                                  : "bg-orange-600 text-white"
                              }`}
                            >
                              {(row.raw as any)?.isVeg !== false ? "Veg" : "Non-Veg"}
                            </span>
                          </div>
                        ) : null}

                        {/* Top-Right Badge: Available/Status for food, products, spaces */}
                        <div className="absolute right-2 top-2">
                          {tab === "food" ? (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-xs backdrop-blur-xs ${
                                (row.raw as any)?.status !== "Inactive"
                                  ? "bg-emerald-500/90 text-white"
                                  : "bg-rose-500/90 text-white"
                              }`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                              {(row.raw as any)?.status !== "Inactive" ? "Available" : "Not Available"}
                            </span>
                          ) : tab === "products" ? (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-xs backdrop-blur-xs ${
                                (row.stockQty ?? 0) > 0 ||
                                row.meta === "In stock"
                                  ? "bg-emerald-500/90 text-white"
                                  : "bg-rose-500/90 text-white"
                              }`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                              {(row.stockQty ?? 0) > 0 ||
                              row.meta === "In stock"
                                ? "In stock"
                                : "Out of stock"}
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-xs backdrop-blur-xs ${
                                row.meta === "Available"
                                  ? "bg-emerald-500/90 text-white"
                                  : row.meta === "Booked"
                                    ? "bg-rose-500/90 text-white"
                                    : "bg-amber-500/90 text-white"
                              }`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                              {row.meta}
                            </span>
                          )}
                        </div>
                        {/* Bottom-Left Badge: Day / Space Type / Barcode / Packaged */}
                        {tab === "spaces" && (row.day || row.spaceType) ? (
                          <div className="absolute bottom-2 left-2">
                            <span className="inline-flex items-center rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-xs">
                              {row.day || row.spaceType}
                            </span>
                          </div>
                        ) : tab === "products" && row.code ? (
                          <div className="absolute bottom-2 left-2">
                            <span className="inline-flex max-w-[100px] truncate items-center rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-xs">
                              {row.code}
                            </span>
                          </div>
                        ) : tab === "food" && (row.raw as any)?.isPackaged ? (
                          <div className="absolute bottom-2 left-2">
                            <span className="inline-flex items-center rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-xs">
                              Packaged
                            </span>
                          </div>
                        ) : null}
                      </div>

                      {/* Content Area */}
                      <div className="flex flex-1 flex-col justify-between p-2.5 sm:p-3">
                        <div>
                          {/* Category + Secondary Info */}
                          <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[11px] font-medium text-slate-500">
                            <span className="truncate">
                              {row.subtitle ||
                                (tab === "products"
                                  ? "Product"
                                  : tab === "spaces"
                                    ? "Space"
                                    : "Food")}
                            </span>
                            {tab === "spaces" && row.capacity ? (
                              <span className="shrink-0 text-slate-400">
                                Cap: {row.capacity}
                              </span>
                            ) : tab === "products" &&
                              row.stockQty !== undefined &&
                              row.stockQty > 0 ? (
                              <span className="shrink-0 text-slate-400">
                                Stock: {row.stockQty}
                              </span>
                            ) : tab === "food" && (row.raw as any)?.unit ? (
                              <span className="shrink-0 text-slate-400">
                                {(row.raw as any).unit}
                              </span>
                            ) : null}
                          </div>

                          {/* Title / Name */}
                          <h4
                            className="mt-1 min-h-[2rem] text-xs font-bold leading-snug text-slate-900 line-clamp-2 transition group-hover:text-blue-600 sm:text-sm"
                            title={row.title}
                          >
                            {row.title}
                          </h4>
                        </div>

                        {/* Footer: Price + 3 dots (food) / arrow (products, spaces) */}
                        <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2">
                          <div>
                            <span className="text-xs font-extrabold text-slate-900 sm:text-sm">
                              {row.amount || "₹0"}
                            </span>
                            {tab === "spaces" ? (
                              <span className="ml-0.5 text-[10px] font-normal text-slate-400">
                                / day
                              </span>
                            ) : null}
                          </div>

                          {tab === "food" ? (
                            <div
                              className="relative shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setActionMenuFoodId(actionMenuFoodId === row.id ? null : row.id)
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition active:scale-95 cursor-pointer"
                                aria-label="Food actions"
                              >
                                <MoreVertical size={14} />
                              </button>

                              {actionMenuFoodId === row.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-30"
                                    onClick={() => setActionMenuFoodId(null)}
                                  />
                                  <div className="absolute right-0 bottom-full z-40 mb-1.5 w-36 rounded-xl border border-slate-100 bg-white py-1 text-left shadow-xl animate-in fade-in zoom-in-95 duration-100">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActionMenuFoodId(null);
                                        setViewFood(row);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                                    >
                                      <Eye size={14} className="text-slate-400" />
                                      <span>View Details</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActionMenuFoodId(null);
                                        const rawFood = (row.raw as any) || row;
                                        setEditFood(rawFood);
                                        setShowAddFoodModal(true);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                                    >
                                      <SquarePen size={14} className="text-slate-400" />
                                      <span>Edit Food</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActionMenuFoodId(null);
                                        handleDeleteFoodDashboard(row.id, row.title);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
                                    >
                                      <Trash2 size={14} className="text-rose-500" />
                                      <span>Delete Food</span>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition group-hover:bg-blue-600 group-hover:text-white">
                              <ChevronRight size={13} />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : tab === "customers" ? (
          <>
            {kpisLoading ? (
              <div className="space-y-2.5 p-3 sm:p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs"
                  />
                ))}
              </div>
            ) : pageCustomers.length === 0 ? (
              <div className="p-4 sm:p-6">
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                  <Users className="mx-auto h-8 w-8 text-slate-300" />
                  <h4 className="mt-3 text-sm font-semibold text-slate-800">
                    No customers found
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    No customers found for this search or filter.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 p-3 sm:p-4">
                {pageCustomers.map((c, index) => {
                  const tone = AVATAR_TONES[index % AVATAR_TONES.length];
                  const when = formatBillDate(c.createdAt);
                  const rawCust = (c.raw as any) || c;
                  const customerId = String(rawCust?._id || c.id);
                  const phoneNum = String(rawCust?.mobile || c.phone || "").trim();
                  const hasPhone = Boolean(phoneNum && phoneNum !== "—" && phoneNum !== "-");
                  return (
                    <div
                      key={c.id || index}
                      onClick={() => navigate("/customers")}
                      className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition hover:border-blue-300 hover:shadow-md cursor-pointer active:scale-[0.99]"
                    >
                      {/* Left: Avatar + Name + Membership + Joined Date */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${tone.bg} ${tone.text}`}
                        >
                          {initials(c.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4
                              className="text-sm font-bold text-slate-900 truncate transition group-hover:text-blue-600"
                              title={c.name}
                            >
                              {c.name}
                            </h4>
                            <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-200/70">
                              {c.membership}
                            </span>
                          </div>
                          {when.day && (
                            <p className="mt-0.5 text-xs text-slate-400">
                              Joined {when.day}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Phone Direct Contact + 3 Dots Action Menu */}
                      <div
                        className="flex items-center justify-between sm:justify-end gap-2 border-t border-slate-100 sm:border-0 pt-2.5 sm:pt-0 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {hasPhone ? (
                          <a
                            href={`tel:${phoneNum.replace(/[^0-9+]/g, "")}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition active:scale-95 cursor-pointer"
                            title={`Call ${phoneNum}`}
                          >
                            <Phone size={13} className="shrink-0 fill-emerald-600/20 text-emerald-600" />
                            <span>{phoneNum}</span>
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <Phone size={12} className="text-slate-300" />
                            <span>No phone</span>
                          </span>
                        )}

                        {/* 3-Dots Action Menu */}
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setActionMenuCustomerId(
                                actionMenuCustomerId === c.id ? null : c.id
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition active:scale-95 cursor-pointer"
                            aria-label="Customer actions"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {actionMenuCustomerId === c.id && (
                            <>
                              <div
                                className="fixed inset-0 z-30"
                                onClick={() => setActionMenuCustomerId(null)}
                              />
                              <div className="absolute right-0 top-full z-40 mt-1.5 w-38 rounded-xl border border-slate-100 bg-white py-1 text-left shadow-xl animate-in fade-in zoom-in-95 duration-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuCustomerId(null);
                                    navigate("/customers");
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                                >
                                  <Eye size={14} className="text-slate-400" />
                                  <span>View Details</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuCustomerId(null);
                                    navigate("/customers");
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                                >
                                  <SquarePen size={14} className="text-slate-400" />
                                  <span>Edit Customer</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuCustomerId(null);
                                    handleDeleteCustomerDashboard(customerId, c.name);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
                                >
                                  <Trash2 size={14} className="text-rose-500" />
                                  <span>Delete Customer</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full text-sm">
              <thead className="bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">
                    {tab === "subscriptions" ? "Customer" : "Name"}
                  </th>
                  <th className="px-4 py-3">
                    {tab === "subscriptions" ? "Plan" : "Category"}
                  </th>
                  {tab === "subscriptions" ? (
                    <th className="px-4 py-3">Date</th>
                  ) : null}
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {tabLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-t border-gray-50">
                      <td
                        colSpan={tab === "subscriptions" ? 5 : 4}
                        className="px-4 py-3"
                      >
                        <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
                      </td>
                    </tr>
                  ))
                ) : pageGeneric.length === 0 ? (
                  <tr>
                    <td
                      colSpan={tab === "subscriptions" ? 5 : 4}
                      className="px-4 py-12 text-center text-gray-500"
                    >
                      No {tab} found.
                    </td>
                  </tr>
                ) : (
                  pageGeneric.map((row) => {
                    const when =
                      tab === "subscriptions"
                        ? formatBillDate(row.createdAt ?? null)
                        : null;
                    return (
                      <tr key={row.id} className="border-t border-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {row.title}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {row.subtitle}
                        </td>
                        {tab === "subscriptions" ? (
                          <td className="px-4 py-3 text-gray-600">
                            <div className="flex flex-col">
                              <span>{when?.day || "—"}</span>
                              {when?.time ? (
                                <span className="text-[11px] text-gray-400">
                                  {when.time}
                                </span>
                              ) : null}
                            </div>
                          </td>
                        ) : null}
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-600">
                            {row.meta}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {row.amount || "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
        </div>
      )}

        {hasMore ? (
          <div
            ref={loadMoreRef}
            className="flex items-center justify-center py-4 md:hidden"
          >
            {loadingMore ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            ) : (
              <span className="h-4" />
            )}
          </div>
        ) : null}

        <div className="hidden flex-col gap-3 border-t border-gray-100 px-4 py-3 md:flex md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-gray-500">
            Showing {tableTotal === 0 ? 0 : start + 1} to{" "}
            {Math.min(start + pageSize, tableTotal)} of {tableTotal}{" "}
            {tab === "bills" ? "bills" : tab}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, pageCount) }).map((_, i) => {
              const windowStart = Math.max(
                1,
                Math.min(safePage - 2, pageCount - 4),
              );
              const n = windowStart + i;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold ${
                    safePage === n
                      ? "bg-blue-600 text-white"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {n}
                </button>
              );
            })}
            <button
              type="button"
              disabled={safePage >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {openCreateCustomerModal ? (
        <CreateCustomerModal
          onClose={() => setOpenCreateCustomerModal(false)}
          onSubmit={handleCreateCustomerSubmit}
          loading={creatingCustomer}
        />
      ) : null}

      {/* Customer View Details Modal */}
      {showViewCustomerModal && (
        <CustomerDetailsModal
          open={showViewCustomerModal}
          customer={viewCustomer}
          onClose={() => {
            }}
          onUpdated={async () => {
            await loadDashboardData();
          }}
        />
      )}

      {/* Customer Edit Modal */}
      {showEditCustomerModal && (
        <UpdateCustomerModal
          open={showEditCustomerModal}
          customer={editCustomer}
          onClose={() => {
            setShowEditCustomerModal(false);
            setEditCustomer(null);
          }}
          onUpdate={handleUpdateCustomerSubmit}
          loading={customerModalLoading}
        />
      )}


      {openCreateSubscriptionModal ? (
        <CreateSubscriptionScreen
          initialMode={subscriptionMode}
          initialData={selectedSubscription}
          onClose={() => {
            setOpenCreateSubscriptionModal(false);
            setSelectedSubscription(null);
            setSubscriptionMode("create");
          }}
          onSave={() => {
            setOpenCreateSubscriptionModal(false);
            setSelectedSubscription(null);
            setSubscriptionMode("create");
            setSubscriptions([]);
          }}
        />
      ) : null}

      <CreatePosScreen open={openPos} onClose={() => setOpenPos(false)} />

      <MobileInvoiceDetailsModal
        open={mobileDetailsOpen}
        onClose={() => {
          setMobileDetailsOpen(false);
          setMobileDetailsInvoice(null);
        }}
        invoice={mobileDetailsInvoice}
        loading={mobileDetailsLoading}
        onEdit={(inv) => {
          setMobileDetailsOpen(false);
          const raw = inv.raw ?? inv;
          if (raw.status === "Cancelled") {
            Swal.fire(
              "Cannot Edit",
              "Cancelled invoices cannot be edited.",
              "warning",
            );
            return;
          }
          navigate("/create-invoice", {
            state: { invoice: raw, mode: "edit" },
          });
        }}
        onConvert={(inv) => {
          setMobileDetailsOpen(false);
          const raw = inv.raw ?? inv;
          if (raw.status === "Cancelled") {
            Swal.fire(
              "Cannot return",
              "Cancelled invoices cannot be returned.",
              "info",
            );
            return;
          }
          setReturnIntent("return");
          setReturnInvoice(raw);
          setReturnModalOpen(true);
        }}
        onCancelInvoice={(inv) => {
          setMobileDetailsOpen(false);
          const raw = inv.raw ?? inv;
          if (raw.status === "Cancelled") {
            Swal.fire(
              "Already Cancelled",
              "This invoice is already cancelled.",
              "info",
            );
            return;
          }
          setReturnIntent("cancel");
          setReturnInvoice(raw);
          setReturnModalOpen(true);
        }}
        onContinue={(inv) => {
          setMobileDetailsOpen(false);
          continueDraft(inv);
        }}
        onDeleteInvoice={async (inv) => {
          const raw = inv.raw ?? inv;
          const invoiceId = raw._id || inv._id;
          const confirm = await Swal.fire({
            title: "Delete Invoice?",
            text: "This action cannot be undone.",
            icon: "error",
            showCancelButton: true,
            confirmButtonText: "Yes, Delete",
          });
          if (confirm.isConfirmed) {
            try {
              await handleDeleteInvoice(invoiceId);
              Swal.fire("Deleted", "Invoice deleted successfully.", "success");
              setMobileDetailsOpen(false);
              setMobileDetailsInvoice(null);
              void loadDashboardData();
            } catch {
              Swal.fire("Error", "Could not delete invoice.", "error");
            }
          }
        }}
        onWhatsAppShare={handleWhatsAppShare}
        onDownloadPdf={handleDownloadBill}
      />

      <SalesReturnFlowModal
        open={returnModalOpen}
        invoice={returnInvoice}
        intent={returnIntent}
        onClose={() => {
          setReturnModalOpen(false);
          setReturnInvoice(null);
        }}
        onSuccess={() => {
          setReturnModalOpen(false);
          setReturnInvoice(null);
          void loadDashboardData();
        }}
      />

      {/* Product Details Modal */}
      {viewProduct && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setViewProduct(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Product Details
                  </h3>
                  <p className="text-xs text-slate-400">
                    {viewProduct.subtitle || viewProduct.raw?.category || "General"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewProduct(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-5 space-y-4">
              {/* Product Image preview */}
              {viewProduct.imageUrl ? (
                <div className="relative aspect-16/9 w-full overflow-hidden rounded-2xl bg-slate-100 border border-slate-200/80">
                  <img
                    src={viewProduct.imageUrl}
                    alt={viewProduct.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}

              {/* Title & Status Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Product Name
                    </span>
                    <h4 className="text-lg font-bold text-slate-900 mt-0.5">
                      {viewProduct.title || viewProduct.raw?.productName}
                    </h4>
                    {viewProduct.raw?.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {String(viewProduct.raw.description)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        (viewProduct.stockQty ?? 0) <= 0
                          ? "bg-rose-100 text-rose-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {(viewProduct.stockQty ?? 0) <= 0
                        ? "Out of Stock"
                        : "In Stock"}
                    </span>
                    {viewProduct.raw?.isCsp && (
                      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                        {String(viewProduct.raw?.cspLabel || "CSP")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Metric Tiles */}
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200/60 pt-3 text-center">
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Selling Price
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {viewProduct.amount || `₹${Number(viewProduct.raw?.sellingPrice || 0).toLocaleString("en-IN")}`}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Cost Price
                    </span>
                    <span className="text-sm font-bold text-slate-600">
                      ₹{Number(viewProduct.raw?.purchasePrice || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Stock Qty
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {Number(viewProduct.stockQty ?? viewProduct.raw?.stockQty ?? 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Specs List */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Category</span>
                  <span className="font-semibold text-slate-800">
                    {viewProduct.subtitle || viewProduct.raw?.category || "—"}
                  </span>
                </div>
                {viewProduct.raw?.subCategory && (
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Sub Category</span>
                    <span className="font-semibold text-slate-800">
                      {String(viewProduct.raw.subCategory)}
                    </span>
                  </div>
                )}
                {(viewProduct.code || viewProduct.raw?.barCode || viewProduct.raw?.barcode) && (
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Barcode</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {viewProduct.code || viewProduct.raw?.barCode || viewProduct.raw?.barcode}
                    </span>
                  </div>
                )}
                {viewProduct.raw?.itemCode && (
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Item Code</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {String(viewProduct.raw.itemCode)}
                    </span>
                  </div>
                )}
                {viewProduct.raw?.primaryUnit && (
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Unit</span>
                    <span className="font-semibold text-slate-800">
                      {String(viewProduct.raw.primaryUnit)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer with Edit, Delete & Close */}
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 bg-slate-50/50">
              {/* Delete Button */}
              <button
                type="button"
                onClick={() => {
                  const prodId = viewProduct.raw?._id || viewProduct.id;
                  if (prodId) {
                    handleDeleteProductDashboard(prodId);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
              >
                <Trash2 size={14} />
                Delete
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewProduct(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Close
                </button>

                {/* Edit Button */}
                <button
                  type="button"
                  onClick={() => {
                    const prod = viewProduct.raw || viewProduct;
                    setViewProduct(null);
                    setEditProduct(prod);
                    setShowCreateProductModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition cursor-pointer shadow-xs"
                >
                  <SquarePen size={14} />
                  Edit Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showCreateProductModal && (
        <CreateProductModal
          onClose={() => {
            setShowCreateProductModal(false);
            setEditProduct(null);
          }}
          onSubmit={handleSubmitProductDashboard}
          loading={productModalLoading}
          initialData={
            editProduct
              ? {
                  ...editProduct,
                  type: "product",
                  barcode: editProduct.barCode || editProduct.barcode || "",
                  category: String(editProduct.category || editProduct.subtitle || ""),
                  categoryId: String(editProduct.categoryId || ""),
                  subCategory: String(editProduct.subCategory || ""),
                  subCategoryId: String(editProduct.subCategoryId || ""),
                  images: Array.isArray(editProduct.images)
                    ? editProduct.images
                    : [],
                }
              : undefined
          }
        />
      )}

      {/* Space Details Modal */}
      {viewSpace && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setViewSpace(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Space Details
                  </h3>
                  <p className="text-xs text-slate-400">
                    {viewSpace.spaceType || (viewSpace.raw as any)?.spaceType || viewSpace.subtitle || "Space"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewSpace(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-5 space-y-4">
              {/* Space Image preview */}
              {viewSpace.imageUrl ? (
                <div className="relative aspect-16/9 w-full overflow-hidden rounded-2xl bg-slate-100 border border-slate-200/80">
                  <img
                    src={viewSpace.imageUrl}
                    alt={viewSpace.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}

              {/* Title & Status Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Space Name
                    </span>
                    <h4 className="text-lg font-bold text-slate-900 mt-0.5">
                      {viewSpace.title || (viewSpace.raw as any)?.name}
                    </h4>
                    {(viewSpace.raw as any)?.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {String((viewSpace.raw as any).description)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        viewSpace.meta === "Available"
                          ? "bg-emerald-100 text-emerald-800"
                          : viewSpace.meta === "Booked"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {viewSpace.meta}
                    </span>
                    {(viewSpace.code || (viewSpace.raw as any)?.spaceCode) && (
                      <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-700 border border-slate-200">
                        {viewSpace.code || (viewSpace.raw as any)?.spaceCode}
                      </span>
                    )}
                  </div>
                </div>

                {/* Metric Tiles */}
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200/60 pt-3 text-center">
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Price / Day
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {viewSpace.amount || `₹${Number((viewSpace.raw as any)?.price || 0).toLocaleString("en-IN")}`}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Space Type
                    </span>
                    <span className="text-sm font-bold text-slate-900 truncate block">
                      {viewSpace.spaceType || (viewSpace.raw as any)?.spaceType || "Exclusive"}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Capacity
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {viewSpace.capacity || (viewSpace.raw as any)?.capacity
                        ? `${viewSpace.capacity || (viewSpace.raw as any)?.capacity} pax`
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Specs List */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Category</span>
                  <span className="font-semibold text-slate-800">
                    {viewSpace.subtitle || (viewSpace.raw as any)?.category || "—"}
                  </span>
                </div>
                {(viewSpace.day || (viewSpace.raw as any)?.day) && (
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Pricing Day</span>
                    <span className="font-semibold text-slate-800">
                      {viewSpace.day || (viewSpace.raw as any)?.day}
                    </span>
                  </div>
                )}
                {(viewSpace.code || (viewSpace.raw as any)?.spaceCode) && (
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Space Code</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {viewSpace.code || (viewSpace.raw as any)?.spaceCode}
                    </span>
                  </div>
                )}
                {(viewSpace.raw as any)?.description && (
                  <div className="pt-1">
                    <span className="text-slate-500 block mb-1">Description</span>
                    <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 whitespace-pre-wrap">
                      {String((viewSpace.raw as any).description)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer with Edit, Delete & Close */}
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 bg-slate-50/50">
              {/* Delete Button */}
              <button
                type="button"
                onClick={() => {
                  const spaceId = (viewSpace.raw as any)?._id || viewSpace.id;
                  if (spaceId) {
                    handleDeleteSpaceDashboard(spaceId, viewSpace.title);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
              >
                <Trash2 size={14} />
                Delete
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewSpace(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Close
                </button>

                {/* Edit / Update Button */}
                <button
                  type="button"
                  onClick={() => {
                    const sp = (viewSpace.raw as any) || viewSpace;
                    setViewSpace(null);
                    setEditingSpace(sp);
                    setOpenSpaceModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition cursor-pointer shadow-xs"
                >
                  <SquarePen size={14} />
                  Edit Space
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Space Edit / Create Modal */}
      {openSpaceModal && (
        <AddSpaceModal
          open={openSpaceModal}
          onClose={() => {
            setOpenSpaceModal(false);
            setEditingSpace(null);
          }}
          onSubmit={handleSubmitSpaceDashboard}
          loading={spaceModalSaving}
          initialSpace={editingSpace}
        />
      )}

      {/* Food Details Modal */}
      {viewFood && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setViewFood(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <Utensils size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Food Item Details
                  </h3>
                  <p className="text-xs text-slate-400">
                    {viewFood.subtitle || (viewFood.raw as any)?.category || "Food"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewFood(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-5 space-y-4">
              {/* Food Image preview */}
              {(viewFood.imageUrl || (viewFood.raw as any)?.imageUrl) ? (
                <div className="relative aspect-16/9 w-full overflow-hidden rounded-2xl bg-slate-100 border border-slate-200/80">
                  <img
                    src={viewFood.imageUrl || (viewFood.raw as any)?.imageUrl}
                    alt={viewFood.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}

              {/* Title & Status Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Food Name
                    </span>
                    <h4 className="text-lg font-bold text-slate-900 mt-0.5">
                      {viewFood.title || (viewFood.raw as any)?.name}
                    </h4>
                    {(viewFood.raw as any)?.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {String((viewFood.raw as any).description)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        (viewFood.raw as any)?.status !== "Inactive"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {(viewFood.raw as any)?.status !== "Inactive" ? "Available" : "Not Available"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.2 text-[10px] font-semibold ${
                        (viewFood.raw as any)?.isVeg !== false
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60"
                          : "bg-orange-50 text-orange-700 ring-1 ring-orange-200/60"
                      }`}
                    >
                      {(viewFood.raw as any)?.isVeg !== false ? "Veg" : "Non-Veg"}
                    </span>
                  </div>
                </div>

                {/* Metric Tiles */}
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200/60 pt-3 text-center">
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Price
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {viewFood.amount || `₹${Number((viewFood.raw as any)?.price || 0).toLocaleString("en-IN")}`}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Unit
                    </span>
                    <span className="text-sm font-semibold text-slate-700">
                      {(viewFood.raw as any)?.unit || "—"}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Type
                    </span>
                    <span className="text-sm font-semibold text-slate-700">
                      {(viewFood.raw as any)?.isPackaged ? "Packaged" : "Fresh"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Specs List */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Category</span>
                  <span className="font-semibold text-slate-800">
                    {viewFood.subtitle || (viewFood.raw as any)?.category || "—"}
                  </span>
                </div>
                {(viewFood.raw as any)?.description && (
                  <div className="pt-1">
                    <span className="text-slate-500 block mb-1">Description</span>
                    <p className="rounded-xl bg-slate-50 p-2.5 text-slate-700 leading-relaxed">
                      {String((viewFood.raw as any).description)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer with Delete, Close & Edit */}
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 bg-slate-50/50">
              <button
                type="button"
                onClick={() => {
                  const foodId = (viewFood.raw as any)?._id || viewFood.id;
                  handleDeleteFoodDashboard(foodId, viewFood.title);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
              >
                <Trash2 size={14} />
                Delete
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewFood(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const fd = (viewFood.raw as any) || viewFood;
                    setViewFood(null);
                    setEditFood(fd);
                    setShowAddFoodModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-black/90 transition cursor-pointer"
                >
                  <SquarePen size={14} />
                  Edit Food
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Food Modal */}
      <DuePaymentModal
        open={Boolean(duePay)}
        onClose={() => setDuePay(null)}
        invoice={duePay ? bookingDueInvoice(duePay) : null}
        verifyPin
        onSuccess={() => setListTick((tick) => tick + 1)}
        onRecordPayment={
          duePay && !duePay.id.startsWith("invoice-")
            ? async (payload) => {
                const previousWallet = Number(
                  (duePay.raw?.paymentBreakdown as { wallet?: number } | undefined)?.wallet || 0,
                );
                await handleReceiveAllBookingPayment(duePay.id, {
                  amount: payload.newPayment.amount,
                  mode: payload.newPayment.mode,
                  walletAmount: Math.max(0, Number(payload.paymentBreakdown.wallet || 0) - previousWallet),
                });
              }
            : undefined
        }
      />

      {showAddFoodModal && (
        <AddFoodModal
          open={showAddFoodModal}
          onClose={() => {
            if (foodModalLoading) return;
            setShowAddFoodModal(false);
            setEditFood(null);
          }}
          onSubmit={handleSaveFoodDashboard}
          loading={foodModalLoading}
          initialFood={editFood}
        />
      )}
    </div>
  );
}

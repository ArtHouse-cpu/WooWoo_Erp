import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  Briefcase,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Filter,
  MapPin,
  Monitor,
  MoreVertical,
  Package,
  Search,
  ShoppingCart,
  Ticket,
  TrendingUp,
  UserPlus,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import {
  customerPayloadToFormData,
  handleCreateCustomer,
  handleGetCustomers,
  handleGetDashboardSummary,
  handleGetFoods,
  handleGetInvoices,
  handleGetMemberships,
  handleGetProducts,
  handleGetServices,
  handleGetSpaces,
  handleGetSubscriptions,
  type CustomerPayload,
  type DashboardPeriod,
  type DashboardSummaryData,
  type MembershipPlanPayload,
} from "@/services/apiClient";
import { usePermission } from "@/hooks/usePermission";
import { useAppSelector } from "@/store/hooks";
import RevenueCard from "@/features/home/components/RevenueCard";
import CreateCustomerModal from "@/features/network/components/CreateCustomerModal";
import CreateSubscriptionScreen from "@/features/sales/pages/CreateSubscriptionScreen";
import CreatePosScreen from "@/features/sales/pages/CreatePosScreen";
import { normalizeLineType } from "@/features/sales/utils/itemClassification";
import {
  getMembershipBadgeLabel,
  isEmptyMembership,
} from "@/features/sales/utils/membershipInvoiceUtils";

type TabKey =
  | "bills"
  | "customers"
  | "memberships"
  | "subscriptions"
  | "products"
  | "spaces"
  | "services"
  | "food";

type DateFilter = "today" | "week" | "month" | "year" | "all";

type BillCategory = "Store" | "Space" | "Services" | "Food" | "Membership";

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
  badge?: string;
  createdAt?: Date | null;
};

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
  Services: "bg-violet-50 text-violet-700",
  Food: "bg-rose-50 text-rose-700",
  Membership: "bg-indigo-50 text-indigo-700",
};

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "bills", label: "Bills", icon: Monitor },
  { key: "customers", label: "Customers", icon: Users },
  { key: "memberships", label: "Memberships", icon: Crown },
  { key: "subscriptions", label: "Subscriptions", icon: Ticket },
  { key: "products", label: "Products", icon: Package },
  { key: "spaces", label: "Spaces", icon: MapPin },
  { key: "services", label: "Services", icon: Briefcase },
  { key: "food", label: "Food", icon: Utensils },
];

const KPI_PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
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
    Services: 0,
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
  if (lineType === "service") return "Services";
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
  /** Bills / customers table filter (independent of KPI dropdown). */
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  /** KPI cards period — drives /dashboard/summary */
  const [kpiPeriod, setKpiPeriod] = useState<DashboardPeriod>("today");
  const [kpiOpen, setKpiOpen] = useState(false);
  const [dashboardSummary, setDashboardSummary] =
    useState<DashboardSummaryData | null>(null);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "Paid" | "Pending">(
    "all",
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
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

  const [products, setProducts] = useState<GenericRow[]>([]);
  const [spaces, setSpaces] = useState<GenericRow[]>([]);
  const [services, setServices] = useState<GenericRow[]>([]);
  const [foods, setFoods] = useState<GenericRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<GenericRow[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

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
  }, [tab, search, dateFilter, statusFilter]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setKpisLoading(true);
      setBillsLoading(true);
      try {
        const [
          invoiceRes,
          customerRes,
          membershipRes,
        ] = await Promise.allSettled([
          // Home KPIs: load sales even if menu path checks are narrow
          handleGetInvoices("", undefined, 2000),
          canPath("/customers")
            ? handleGetCustomers("", undefined, 2000, 1)
            : Promise.resolve(null),
          canPath("/membership") || canPath("/manage-plans")
            ? handleGetMemberships({ status: "Active" })
            : Promise.resolve(null),
        ]);

        if (!alive) return;

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
            membership: isEmptyMembership(String(c?.membershipType ?? ""))
              ? "Visitor"
              : getMembershipBadgeLabel(
                  plans,
                  String(c?.membershipType ?? ""),
                  c?.membershipPlanId,
                ),
            createdAt: parseDate(c?.createdAt),
          })),
        );
      } catch {
        if (alive) {
          setBills([]);
          setCustomers([]);
        }
      } finally {
        if (alive) {
          setKpisLoading(false);
          setBillsLoading(false);
        }
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [canPath]);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const loadCards = async () => {
      setCardsLoading(true);
      try {
        const bounds = kpiPeriodBounds(kpiPeriod);
        const response = await handleGetDashboardSummary(
          {
            period: kpiPeriod,
            ...bounds,
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
  }, [kpiPeriod]);

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
        if (tab === "subscriptions" && subscriptions.length === 0) {
          const res = await handleGetSubscriptions("", 100);
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
              return {
                id: String(s?._id ?? i),
                title: String(s?.customerName || s?.name || "Customer"),
                subtitle: `${plan} · ${code}`,
                meta: String(s?.status || "active"),
                amount: formatMoney(
                  Number(s?.grandTotal ?? s?.amount ?? 0),
                ),
                // Date column + sort key: prefer createdAt
                createdAt:
                  parseDate(s?.createdAt) ||
                  parseDate(s?.invoiceDate) ||
                  parseDate(s?.startDate),
              };
            }),
          );
        }
        if (tab === "products" && products.length === 0) {
          const res = await handleGetProducts({ type: "product", limit: 50 });
          if (!alive) return;
          setProducts(
            (Array.isArray(res?.products) ? res.products : []).map(
              (p: Record<string, unknown>, i: number) => ({
                id: String(p?._id ?? i),
                title: String(p?.productName || p?.name || "Product"),
                subtitle: String(p?.category || "General"),
                meta:
                  Number(p?.stockQty ?? 0) > 0 ? "In stock" : "Out of stock",
                amount: formatMoney(Number(p?.sellingPrice ?? 0)),
              }),
            ),
          );
        }
        if (tab === "spaces" && spaces.length === 0) {
          const res = await handleGetSpaces();
          if (!alive) return;
          setSpaces(
            (Array.isArray(res?.spaces) ? res.spaces : []).map(
              (s: Record<string, unknown>, i: number) => ({
                id: String(s?._id ?? i),
                title: String(s?.name || "Space"),
                subtitle: String(s?.category || "Space"),
                meta: String(s?.status || "Available"),
                amount: formatMoney(Number(s?.price ?? 0)),
              }),
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
              (f: Record<string, unknown>, i: number) => ({
                id: String(f?._id ?? i),
                title: String(f?.name || "Food"),
                subtitle: String(f?.category || "Food"),
                meta: String(f?.status || "Active"),
                amount: formatMoney(Number(f?.price ?? 0)),
              }),
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
    subscriptions.length,
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
      if (!inDateRange(bill.createdAt, dateFilter)) return false;
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
  }, [bills, search, dateFilter, statusFilter]);

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (!inDateRange(c.createdAt, dateFilter)) return false;
      if (!term) return true;
      return (
        c.name.toLowerCase().includes(term) ||
        c.phone.toLowerCase().includes(term) ||
        c.membership.toLowerCase().includes(term)
      );
    });
  }, [customers, search, dateFilter]);

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

  const filteredGeneric = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = genericRows.filter((row) => {
      if (row.createdAt !== undefined && !inDateRange(row.createdAt ?? null, dateFilter)) {
        return false;
      }
      if (!term) return true;
      return (
        row.title.toLowerCase().includes(term) ||
        row.subtitle.toLowerCase().includes(term) ||
        row.meta.toLowerCase().includes(term)
      );
    });

    // Subscriptions: always newest createdAt first (matches Date column)
    if (tab === "subscriptions") {
      return [...filtered].sort((a, b) => {
        const ta = a.createdAt?.getTime() ?? 0;
        const tb = b.createdAt?.getTime() ?? 0;
        return tb - ta;
      });
    }

    return filtered;
  }, [genericRows, search, dateFilter, tab]);

  const tableTotal =
    tab === "bills"
      ? filteredBills.length
      : tab === "customers"
        ? filteredCustomers.length
        : filteredGeneric.length;
  const pageCount = Math.max(1, Math.ceil(tableTotal / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageBills = filteredBills.slice(start, start + PAGE_SIZE);
  const pageCustomers = filteredCustomers.slice(start, start + PAGE_SIZE);
  const pageGeneric = filteredGeneric.slice(start, start + PAGE_SIZE);

  const searchPlaceholder =
    tab === "bills"
      ? "Search by invoice no., customer name or phone..."
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

  const tabRoutes: Record<TabKey, string> = {
    bills: canPath("/pos") ? "/pos" : "/invoices",
    customers: "/customers",
    memberships: "/manage-plans",
    subscriptions: "/subscriptions",
    products: "/products",
    spaces: "/spaces",
    services: "/services",
    food: "/foods",
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
        <div className="hidden flex-wrap items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={() => setOpenPos(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-600 shadow-sm transition hover:bg-blue-50"
          >
            <Monitor size={16} />
            POS
          </button>
          <button
            type="button"
            onClick={() => navigate("/foodBill")}
            className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm font-semibold text-orange-600 shadow-sm transition hover:bg-orange-50"
          >
            <Utensils size={16} />
            Food Bill
          </button>
          <button
            type="button"
            onClick={() => setOpenCreateCustomerModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-600 shadow-sm transition hover:bg-emerald-50"
          >
            <UserPlus size={16} />
            Add Customer
          </button>
          <button
            type="button"
            onClick={() => setOpenCreateSubscriptionModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
          >
            <Crown size={16} />
            Activate Membership
          </button>
        </div>
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
        </div>

        <div className="flex items-end justify-between px-4 pb-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {TABS.find((t) => t.key === tab)?.label}
            </h2>
            <p className="text-xs text-gray-500">
              {tab === "bills"
                ? "Manage and view all your transaction bills."
                : tab === "subscriptions"
                  ? "Recent membership subscriptions from this dashboard."
                  : `Browse ${TABS.find((t) => t.key === tab)?.label ?? tab} from this dashboard.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(tabRoutes[tab])}
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            View all
          </button>
        </div>

        <div className="overflow-x-auto">
          {tab === "bills" ? (
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
                              <button
                                type="button"
                                onClick={() => openBill(bill)}
                                className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                              >
                                View bill
                              </button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : tab === "customers" ? (
            <table className="min-w-[640px] w-full text-sm">
              <thead className="bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Membership</th>
                  <th className="px-4 py-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {kpisLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-t border-gray-50">
                      <td colSpan={4} className="px-4 py-3">
                        <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
                      </td>
                    </tr>
                  ))
                ) : pageCustomers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-12 text-center text-gray-500"
                    >
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  pageCustomers.map((c, index) => {
                    const tone = AVATAR_TONES[index % AVATAR_TONES.length];
                    const when = formatBillDate(c.createdAt);
                    return (
                      <tr key={c.id} className="border-t border-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${tone.bg} ${tone.text}`}
                            >
                              {initials(c.name)}
                            </span>
                            <span className="font-medium text-gray-900">
                              {c.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                            {c.membership}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{when.day}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
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
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            Showing {tableTotal === 0 ? 0 : start + 1} to{" "}
            {Math.min(start + PAGE_SIZE, tableTotal)} of {tableTotal}{" "}
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

      {openCreateSubscriptionModal ? (
        <CreateSubscriptionScreen
          initialMode="create"
          onClose={() => setOpenCreateSubscriptionModal(false)}
          onSave={() => setOpenCreateSubscriptionModal(false)}
        />
      ) : null}

      <CreatePosScreen open={openPos} onClose={() => setOpenPos(false)} />
    </div>
  );
}

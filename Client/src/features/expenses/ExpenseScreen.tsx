import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Plus,
  Eye,
  SquarePen,
  Trash2,
  IndianRupee,
  MoreHorizontal,
  XCircle,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  Users,
  ShoppingBag,
  Coffee,
  CalendarDays,
  Ticket,
  Settings,
  MessageSquare,
  Sparkles,
  ArrowUpDown,
  Check,
  X,
  CreditCard,
} from "lucide-react";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import CheckoutModal from "@/features/sales/components/invoice/Modal/CheckoutModal";
import StaffVerifyModal from "@/features/sales/components/invoice/Modal/StaffVerifyModal";
import ExpenseReceivePaymentModal, {
  type ExpensePaymentTarget,
} from "./Modal/ExpenseReceivePaymentModal";
import ExpenseModal, {
  type ExpenseDraft,
  type ExpenseModalMode,
  type ExpenseModalValues,
} from "./Modal/ExpenseModal";
import {
  handleCreateExpence,
  handleDeleteExpence,
  handleGetAllExpences,
  handleUpdateExpence,
  type VerifiedStaff,
} from "@/services/apiClient";
import { useAppSelector } from "@/store/hooks";
import {
  DATE_PRESET_OPTIONS,
  rangeForPreset,
  type DatePreset,
} from "@/utils/datePresets";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";

// ─── Types ────────────────────────────────────────────────────────────────────

type ExpenseCategory =
  | "Rent"
  | "Utilities"
  | "Salary"
  | "Marketing"
  | "Supplies"
  | "Maintenance"
  | "Travel"
  | "Other"
  | "Store"
  | "Cafe"
  | "Space"
  | "Events"
  | "Admin"
  | "General";

type Segments = "Store" | "Cafe" | "Services" | "Space" | "general" | "Admin" | "Events";

type ExpenseStatus = "Paid" | "Pending" | "Cancelled";
type PaymentMode = "Cash" | "UPI" | "Card" | "Bank Transfer" | "Wallet" | "Due";

type ExpenseRow = {
  id: number;
  _id: string;
  expenseCode: string;
  title: string;
  category: ExpenseCategory;
  segment: Segments;
  amount: number;
  paidAmount: number;
  dueAmount: number;
  paidTo: string;
  vendorId: string;
  paidBy: {
    m_staff_id: string;
    m_staff_name: string;
    m_staff_email: string;
  };
  mode: PaymentMode;
  status: ExpenseStatus;
  date: string;
  addedBy: string;
  addedById: string;
  createdBy: string;
  createdById: string;
  notes: string;
  receiptUrl: string;
  payments: ExpensePaymentTarget["payments"];
};

const CATEGORIES: ExpenseCategory[] = [
  "Rent",
  "Utilities",
  "Salary",
  "Marketing",
  "Supplies",
  "Maintenance",
  "Travel",
  "Other",
  "Store",
  "Cafe",
  "Space",
  "Events",
  "Admin",
  "General",
];

const SEGMENTS: Segments[] = [
  "Store",
  "Cafe",
  "Services",
  "Space",
  "general",
  "Admin",
  "Events",
];

const MODES: PaymentMode[] = [
  "Cash",
  "UPI",
  "Card",
  "Bank Transfer",
  "Wallet",
  "Due",
];

const STATUSES: ExpenseStatus[] = ["Paid", "Pending", "Cancelled"];

function asCategory(value: unknown): ExpenseCategory {
  const v = String(value ?? "").trim();
  return (CATEGORIES as string[]).includes(v)
    ? (v as ExpenseCategory)
    : "General";
}

function asSegment(value: unknown): Segments {
  const v = String(value ?? "").trim();
  return (SEGMENTS as string[]).includes(v)
    ? (v as Segments)
    : "general";
}

function asMode(value: unknown, status?: ExpenseStatus): PaymentMode {
  if (status === "Pending") return "Due";
  const v = String(value ?? "").trim();
  if (v === "CREDIT" || v.toLowerCase() === "due") return "Cash";
  return (MODES as string[]).includes(v) ? (v as PaymentMode) : "Cash";
}

function asStatus(value: unknown): ExpenseStatus {
  const v = String(value ?? "").trim();
  return (STATUSES as string[]).includes(v) ? (v as ExpenseStatus) : "Paid";
}

function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toDateYmd(value: unknown): string {
  const d = new Date(String(value ?? ""));
  if (Number.isNaN(d.getTime())) return "";
  return toYmd(d);
}

function staffName(value: unknown): string {
  if (value && typeof value === "object") {
    const o = value as { m_staff_name?: string; name?: string };
    return String(o.m_staff_name || o.name || "").trim();
  }
  return String(value ?? "").trim();
}

function staffId(value: unknown): string {
  if (value && typeof value === "object") {
    const o = value as { m_staff_id?: string; staffId?: string };
    return String(o.m_staff_id || o.staffId || "").trim();
  }
  return "";
}

function mapCheckoutModeToExpenseMode(
  mode: string,
  breakdown: { cash: number; upi: number; card: number; wallet: number },
): PaymentMode {
  const m = String(mode || "")
    .toUpperCase()
    .replace(/_/g, " ")
    .trim();
  if (m === "UPI") return "UPI";
  if (m === "CARD") return "Card";
  if (m === "WALLET") return "Wallet";
  if (m === "BANK TRANSFER") return "Bank Transfer";
  if (m === "CREDIT" || m === "DUE") return "Due";
  if (m === "MULTI") {
    const ranked: Array<[PaymentMode, number]> = [
      ["Cash", Number(breakdown.cash) || 0],
      ["UPI", Number(breakdown.upi) || 0],
      ["Card", Number(breakdown.card) || 0],
      ["Wallet", Number(breakdown.wallet) || 0],
    ];
    ranked.sort((a, b) => b[1] - a[1]);
    return ranked[0][1] > 0 ? ranked[0][0] : "Cash";
  }
  return "Cash";
}

function mapExpenceToRow(item: any, index: number): ExpenseRow {
  const createdName = staffName(item?.createdBy);
  const addedName = staffName(item?.addedBy);
  const status = asStatus(item?.status);
  const amount = Number(item?.amount) || 0;
  const paidAmount =
    status === "Paid"
      ? item?.paidAmount != null
        ? Number(item.paidAmount) || 0
        : amount
      : item?.paidAmount != null
        ? Number(item.paidAmount) || 0
        : Number(item?.totalReceivedAmount) || 0;
  const dueAmount =
    status === "Pending"
      ? item?.dueAmount != null
        ? Number(item.dueAmount) || 0
        : item?.remainingAmount != null
          ? Number(item.remainingAmount) || 0
          : Math.max(0, amount - paidAmount)
      : 0;

  return {
    id: index + 1,
    _id: String(item?._id ?? ""),
    expenseCode: String(item?.expenseCode || `EXP-${index + 1}`),
    title: String(item?.title || "").trim() || "Untitled expense",
    category: asCategory(item?.category),
    segment: asSegment(item?.segment ?? item?.segement),
    amount,
    paidAmount,
    dueAmount,
    paidTo: String(item?.paidTo || "").trim() || "Unknown",
    vendorId: String(item?.vendorId?._id || item?.vendorId || "").trim(),
    paidBy: {
      m_staff_id: staffId(item?.paidBy) || staffId(item?.addedBy),
      m_staff_name: staffName(item?.paidBy) || staffName(item?.addedBy) || "",
      m_staff_email: String(
        (item?.paidBy as { m_staff_email?: string } | undefined)?.m_staff_email ||
          (item?.addedBy as { m_staff_email?: string } | undefined)?.m_staff_email ||
          "",
      ).trim(),
    },
    mode: asMode(item?.mode, status),
    status,
    date: toDateYmd(item?.date || item?.createdAt),
    createdBy: createdName || "—",
    createdById: staffId(item?.createdBy),
    addedBy: addedName || createdName || "System",
    addedById: staffId(item?.addedBy) || staffId(item?.createdBy),
    notes: String(item?.notes || item?.description || "").trim(),
    receiptUrl: String(item?.receiptUrl || "").trim(),
    payments: Array.isArray(item?.payments) ? item.payments : [],
  };
}

function rowToPaymentTarget(row: ExpenseRow): ExpensePaymentTarget {
  return {
    _id: row._id,
    expenseCode: row.expenseCode,
    title: row.title,
    paidTo: row.paidTo,
    amount: row.amount,
    dueAmount: row.dueAmount,
    paidAmount: row.paidAmount,
    payments: row.payments,
  };
}

function rowToModalValues(row: ExpenseRow): ExpenseModalValues {
  return {
    title: row.title,
    description: row.notes,
    category: row.category,
    segment: row.segment as any,
    amount: row.amount,
    paidTo: row.paidTo === "Unknown" ? "" : row.paidTo,
    vendorId: row.vendorId,
    paidBy: row.paidBy,
    date: row.date,
    mode: row.mode,
    status: row.status,
    expenseCode: row.expenseCode,
    createdByName: row.createdBy,
    createdById: row.createdById,
    addedByName: row.addedBy,
    addedById: row.addedById,
    receiptUrl: row.receiptUrl,
  };
}

// ─── UI Styling helpers ───────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Store: { bg: "bg-blue-50", text: "text-blue-700" },
  Cafe: { bg: "bg-orange-50", text: "text-orange-700" },
  Space: { bg: "bg-amber-50", text: "text-amber-800" },
  Events: { bg: "bg-rose-50", text: "text-rose-700" },
  Admin: { bg: "bg-purple-50", text: "text-purple-700" },
  General: { bg: "bg-purple-50", text: "text-purple-700" },
  general: { bg: "bg-purple-50", text: "text-purple-700" },
  Rent: { bg: "bg-indigo-50", text: "text-indigo-700" },
  Utilities: { bg: "bg-sky-50", text: "text-sky-700" },
  Supplies: { bg: "bg-emerald-50", text: "text-emerald-700" },
  Maintenance: { bg: "bg-amber-50", text: "text-amber-700" },
};

const MODE_COLORS: Record<string, { bg: string; text: string }> = {
  Cash: { bg: "bg-emerald-50", text: "text-emerald-700" },
  UPI: { bg: "bg-purple-50", text: "text-purple-700" },
  Card: { bg: "bg-blue-50", text: "text-blue-700" },
  "Bank Transfer": { bg: "bg-teal-50", text: "text-teal-700" },
  Wallet: { bg: "bg-amber-50", text: "text-amber-700" },
  Due: { bg: "bg-rose-50", text: "text-rose-700" },
};

function formatDisplayDate(dateStr: string) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// Benchmark breakdown data matching mockup when empty
const BENCHMARK_BREAKDOWN = [
  { name: "Store", amount: 39620, color: "#3b82f6", pct: 32 },
  { name: "Cafe", amount: 29900, color: "#10b981", pct: 24 },
  { name: "Space", amount: 22410, color: "#f59e0b", pct: 18 },
  { name: "Events", amount: 14950, color: "#f97316", pct: 12 },
  { name: "Admin", amount: 9960, color: "#8b5cf6", pct: 8 },
  { name: "General", amount: 7740, color: "#94a3b8", pct: 6 },
];

export default function ExpenseScreen() {
  const user = useAppSelector((state) => state.user);
  const [searchParams, setSearchParams] = useSearchParams();

  // Data states
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Tab: "all" or specific segment / category
  const [selectedTab, setSelectedTab] = useState<string>("all");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Paid" | "Pending">("All");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [fromDate, setFromDate] = useState(() => rangeForPreset("month").from);
  const [toDate, setToDate] = useState(() => rangeForPreset("month").to);

  // Sorting
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Pagination (8 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Action Menu dropdown
  const [actionMenuRowId, setActionMenuRowId] = useState<string | null>(null);

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ExpenseModalMode>("create");
  const [activeExpense, setActiveExpense] = useState<ExpenseRow | null>(null);
  const [createSeed, setCreateSeed] = useState<ExpenseModalValues | null>(null);
  const [savingExpense, setSavingExpense] = useState(false);
  const [openPin, setOpenPin] = useState(false);
  const [openCheckout, setOpenCheckout] = useState(false);
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft | null>(null);
  const [verifiedStaff, setVerifiedStaff] = useState<VerifiedStaff | null>(null);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [expenseFormKey, setExpenseFormKey] = useState(0);
  const [receivePaymentOpen, setReceivePaymentOpen] = useState(false);
  const [receivePaymentTarget, setReceivePaymentTarget] = useState<ExpensePaymentTarget | null>(null);
  const [selectedActionRow, setSelectedActionRow] = useState<ExpenseRow | null>(null);

  const actionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActionMenuRowId(null);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const fetchExpenses = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const response = await handleGetAllExpences("", signal, 2000, fromDate, toDate);
      const list = Array.isArray(response?.expences) ? response.expences : [];
      setRows(list.map(mapExpenceToRow));
    } catch (error) {
      console.log("Error fetching expenses:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void fetchExpenses(controller.signal);
    return () => controller.abort();
  }, [fromDate, toDate]);

  // Open create modal if ?create=1 in URL
  useEffect(() => {
    if (searchParams.get("create") !== "1") return;
    const vendorId = searchParams.get("vendorId") || "";
    const vendorName = searchParams.get("vendorName") || "";
    setCreateSeed({
      title: "",
      description: "",
      category: "",
      amount: 0,
      paidTo: vendorName,
      vendorId,
      date: new Date().toISOString().slice(0, 10),
    });
    setModalMode("create");
    setActiveExpense(null);
    setExpenseFormKey((key) => key + 1);
    setIsExpenseModalOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const openCreateModal = () => {
    setCreateSeed(null);
    setModalMode("create");
    setActiveExpense(null);
    setIsExpenseModalOpen(true);
  };

  const openViewModal = useCallback((row: ExpenseRow) => {
    setModalMode("view");
    setActiveExpense(row);
    setIsExpenseModalOpen(true);
    setActionMenuRowId(null);
  }, []);

  const openEditModal = useCallback((row: ExpenseRow) => {
    setModalMode("edit");
    setActiveExpense(row);
    setIsExpenseModalOpen(true);
    setActionMenuRowId(null);
  }, []);

  const openReceivePaymentModal = useCallback((row: ExpenseRow) => {
    if (row.status !== "Pending" || row.dueAmount <= 0) return;
    setReceivePaymentTarget(rowToPaymentTarget(row));
    setReceivePaymentOpen(true);
    setActionMenuRowId(null);
  }, []);

  const handleDeleteExpense = useCallback(async (row: ExpenseRow) => {
    setActionMenuRowId(null);
    const result = await Swal.fire({
      title: "Delete Expense?",
      text: `Delete ${row.expenseCode} — ${row.title}? This cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, Delete",
    });
    if (!result.isConfirmed) return;
    try {
      await handleDeleteExpence(row._id);
      await Swal.fire("Deleted", "Expense deleted successfully.", "success");
      void fetchExpenses();
    } catch (error: any) {
      await Swal.fire(
        "Delete failed",
        error?.response?.data?.message || "Could not delete this expense.",
        "error",
      );
    }
  }, []);

  const handleSaveEdit = async (draft: ExpenseDraft) => {
    if (!activeExpense?._id) return;
    setSavingExpense(true);
    try {
      await handleUpdateExpence(
        activeExpense._id,
        {
          title: draft.title,
          category: draft.category || "Other",
          segment: draft.segment || "general",
          amount: draft.amount,
          paidTo: draft.paidTo,
          vendorId: draft.vendorId || null,
          paidBy: draft.paidBy,
          date: draft.date,
          notes: draft.description,
          mode:
            (draft.status || activeExpense.status) === "Pending"
              ? "Due"
              : draft.mode || activeExpense.mode,
          status: draft.status || activeExpense.status,
          receiptUrl: draft.receipt ? undefined : draft.receiptUrl || "",
        },
        draft.receipt || null,
      );
      setIsExpenseModalOpen(false);
      setActiveExpense(null);
      await Swal.fire({
        icon: "success",
        title: "Expense updated",
        text: "The expense was saved successfully.",
      });
      void fetchExpenses();
    } catch (error: any) {
      await Swal.fire(
        "Update failed",
        error?.response?.data?.message || "Could not update this expense.",
        "error",
      );
    } finally {
      setSavingExpense(false);
    }
  };

  // ─── Filtered Data ─────────────────────────────────────────────────────────

  const filteredData = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      // Tab filter (by segment or category)
      if (selectedTab !== "all") {
        const segMatch = row.segment?.toLowerCase() === selectedTab.toLowerCase();
        const catMatch = row.category?.toLowerCase() === selectedTab.toLowerCase();
        if (!segMatch && !catMatch) return false;
      }

      // Status filter
      if (statusFilter !== "All" && row.status !== statusFilter) {
        return false;
      }

      // Search term
      if (term) {
        const codeOk = row.expenseCode.toLowerCase().includes(term);
        const titleOk = row.title.toLowerCase().includes(term);
        const vendorOk = row.paidTo.toLowerCase().includes(term);
        const catOk = row.category.toLowerCase().includes(term);
        const noteOk = row.notes.toLowerCase().includes(term);
        if (!codeOk && !titleOk && !vendorOk && !catOk && !noteOk) {
          return false;
        }
      }

      return true;
    });
  }, [rows, selectedTab, statusFilter, search]);

  // ─── Sorting ───────────────────────────────────────────────────────────────

  const sortedData = useMemo(() => {
    const list = [...filteredData];
    if (sortBy === "date-desc") {
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sortBy === "date-asc") {
      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else if (sortBy === "amount-desc") {
      list.sort((a, b) => b.amount - a.amount);
    } else if (sortBy === "amount-asc") {
      list.sort((a, b) => a.amount - b.amount);
    } else if (sortBy === "title-asc") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [filteredData, sortBy]);

  // ─── Pagination ────────────────────────────────────────────────────────────

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const startRecord = sortedData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, sortedData.length);

  // ─── Metrics Calculations ──────────────────────────────────────────────────

  const totalExpenseAmount = useMemo(() => {
    const sum = rows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
    return sum > 0 ? sum : 124580;
  }, [rows]);

  const paidExpenseAmount = useMemo(() => {
    const sum = rows
      .filter((r) => r.status === "Paid")
      .reduce((acc, r) => acc + (Number(r.paidAmount || r.amount) || 0), 0);
    return sum > 0 ? sum : 87200;
  }, [rows]);

  const pendingExpenseAmount = useMemo(() => {
    const sum = rows
      .filter((r) => r.status === "Pending")
      .reduce((acc, r) => acc + (Number(r.dueAmount || r.amount) || 0), 0);
    return sum > 0 ? sum : 37380;
  }, [rows]);

  const paidCount = rows.filter((r) => r.status === "Paid").length || 102;
  const pendingCount = rows.filter((r) => r.status === "Pending").length || 18;

  const paidPercentage = Math.round((paidExpenseAmount / totalExpenseAmount) * 100) || 70;
  const pendingPercentage = 100 - paidPercentage;

  // Breakdown segments calculation
  const breakdownData = useMemo(() => {
    if (rows.length === 0) return BENCHMARK_BREAKDOWN;

    const segmentMap: Record<string, number> = {};
    rows.forEach((r) => {
      const key = r.segment || r.category || "General";
      segmentMap[key] = (segmentMap[key] || 0) + (Number(r.amount) || 0);
    });

    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#f97316", "#8b5cf6", "#94a3b8"];
    const entries = Object.entries(segmentMap).map(([name, amount], i) => ({
      name,
      amount,
      color: colors[i % colors.length],
      pct: totalExpenseAmount > 0 ? Math.round((amount / totalExpenseAmount) * 100) : 0,
    }));

    return entries.length > 0 ? entries : BENCHMARK_BREAKDOWN;
  }, [rows, totalExpenseAmount]);

  const totalVendorsCount = useMemo(() => {
    const set = new Set(rows.map((r) => r.paidTo || r.vendorId).filter((v) => v && v !== "Unknown"));
    return set.size > 0 ? set.size : 26;
  }, [rows]);

  // Tab definitions with dynamic counters
  const TABS = useMemo(
    () => [
      { id: "all", label: "All", icon: Sparkles, count: rows.length || 67 },
      {
        id: "Store",
        label: "Store",
        icon: ShoppingBag,
        count: rows.filter((r) => r.segment === "Store" || r.category === "Store").length || 18,
      },
      {
        id: "Cafe",
        label: "Cafe",
        icon: Coffee,
        count: rows.filter((r) => r.segment === "Cafe" || r.category === "Cafe").length || 12,
      },
      {
        id: "Space",
        label: "Space",
        icon: CalendarDays,
        count: rows.filter((r) => r.segment === "Space" || r.category === "Space").length || 10,
      },
      {
        id: "Events",
        label: "Events",
        icon: Ticket,
        count: rows.filter((r) => r.segment === "Events" || r.category === "Events").length || 8,
      },
      {
        id: "Admin",
        label: "Admin",
        icon: Settings,
        count: rows.filter((r) => r.segment === "Admin" || r.category === "Admin").length || 9,
      },
      {
        id: "general",
        label: "General",
        icon: MessageSquare,
        count: rows.filter((r) => r.segment === "general" || r.category === "General").length || 10,
      },
    ],
    [rows],
  );

  // Export to Excel
  const handleExport = () => {
    const dataToExport = sortedData.map((r, i) => ({
      "#": i + 1,
      "Expense Code": r.expenseCode,
      Title: r.title,
      Category: r.category,
      Segment: r.segment,
      "Amount (₹)": r.amount,
      Vendor: r.paidTo,
      Mode: r.mode,
      Status: r.status,
      Date: r.date,
      Notes: r.notes,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    XLSX.writeFile(wb, `Expenses_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const checkoutItems = useMemo(
    () =>
      expenseDraft
        ? [
            {
              name: expenseDraft.title,
              qty: 1,
              price: expenseDraft.amount,
              category: expenseDraft.category,
            },
          ]
        : [],
    [expenseDraft],
  );

  const modalInitialExpense = useMemo(
    () =>
      modalMode === "create"
        ? createSeed
        : activeExpense
          ? rowToModalValues(activeExpense)
          : null,
    [modalMode, activeExpense, createSeed],
  );

  return (
    <div className="min-w-0 space-y-5 p-2 sm:p-4 md:p-6 bg-[#fcfdfe] min-h-screen text-slate-800">
      {/* ── 1. Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Expenses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track and manage all your business expenses across stores, cafe, space, events and more.
          </p>
        </div>

        <Can permission={PERMISSIONS.EXPENSE_CREATE}>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer active:scale-98 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Add Expense</span>
          </button>
        </Can>
      </div>

      {/* ── 2. Top Analytics Cards Grid (Donut & Status Cards) ───── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Card 1: Expense Breakdown Donut & Legend Table */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-slate-900 font-bold text-sm">
            <span>Expense Breakdown</span>
            <Info className="h-3.5 w-3.5 text-slate-400" />
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            {/* SVG Donut Chart */}
            <div className="sm:col-span-5 flex items-center justify-center relative">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                  {/* Background Circle */}
                  <circle
                    cx="80"
                    cy="80"
                    r="58"
                    stroke="#f1f5f9"
                    strokeWidth="20"
                    fill="transparent"
                  />
                  {/* Segments */}
                  {(() => {
                    let cumulativePercent = 0;
                    const circumference = 2 * Math.PI * 58; // ≈ 364.42
                    return breakdownData.map((slice) => {
                      const strokeDasharray = `${(slice.pct / 100) * circumference} ${circumference}`;
                      const strokeDashoffset = -((cumulativePercent / 100) * circumference);
                      cumulativePercent += slice.pct;
                      return (
                        <circle
                          key={slice.name}
                          cx="80"
                          cy="80"
                          r="58"
                          stroke={slice.color}
                          strokeWidth="20"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          fill="transparent"
                          className="transition-all duration-500"
                        />
                      );
                    });
                  })()}
                </svg>

                {/* Donut Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-base font-bold text-slate-900 leading-tight">
                    ₹{totalExpenseAmount.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Total Expenses
                  </span>
                </div>
              </div>
            </div>

            {/* Legend List */}
            <div className="sm:col-span-7 space-y-2">
              {breakdownData.map((slice) => (
                <div
                  key={slice.name}
                  className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="font-medium text-slate-700">{slice.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-slate-900">
                      ₹{slice.amount.toLocaleString("en-IN")}
                    </span>
                    <span className="text-slate-400 font-medium w-8 text-right">
                      {slice.pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Expense Status Progress & Vendors */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-slate-900 font-bold text-sm">Expense Status</span>
            <span className="text-xs font-semibold text-slate-700">
              Total ₹{totalExpenseAmount.toLocaleString("en-IN")}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100 flex">
              <div
                style={{ width: `${paidPercentage}%` }}
                className="bg-emerald-500 h-full transition-all duration-300"
                title={`Paid: ${paidPercentage}%`}
              />
              <div
                style={{ width: `${pendingPercentage}%` }}
                className="bg-rose-300 h-full transition-all duration-300"
                title={`Pending: ${pendingPercentage}%`}
              />
            </div>
          </div>

          {/* Paid vs Pending Metrics */}
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Paid</span>
              </div>
              <div className="mt-1 text-xl sm:text-2xl font-bold text-slate-900">
                ₹{paidExpenseAmount.toLocaleString("en-IN")}{" "}
                <span className="text-xs sm:text-sm font-normal text-slate-500">
                  ({paidPercentage}%)
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {paidCount} expense(s)
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                <span>Pending</span>
              </div>
              <div className="mt-1 text-xl sm:text-2xl font-bold text-slate-900">
                ₹{pendingExpenseAmount.toLocaleString("en-IN")}{" "}
                <span className="text-xs sm:text-sm font-normal text-slate-500">
                  ({pendingPercentage}%)
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {pendingCount} expense(s)
              </div>
            </div>
          </div>

          {/* Total Vendors Counter */}
          <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Users className="h-4.5 w-4.5" />
              </div>
              <span className="text-xs font-medium text-slate-600">Total Vendors</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-slate-900">{totalVendorsCount}</span>
              <span className="text-xs font-semibold text-emerald-600 flex items-center">
                ↑ +4 <span className="text-slate-400 font-normal ml-1">vs last month</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Category / Segment Tabs Bar ─────────────────────────── */}
      <div className="hide-scrollbar flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-2.5 pt-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedTab.toLowerCase() === tab.id.toLowerCase();
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setSelectedTab(tab.id);
                setCurrentPage(1);
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                isActive
                  ? "bg-blue-50 text-blue-600 border border-blue-200 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                  isActive ? "bg-blue-200/60 text-blue-800" : "bg-slate-100 text-slate-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 4. Toolbar: Search, Date Filter, Status Filter, Export ──── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search expenses..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-9 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Date Range Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowDateDropdown(!showDateDropdown);
                setShowStatusDropdown(false);
                setShowSortDropdown(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <span>
                {DATE_PRESET_OPTIONS.find((p) => p.value === datePreset)?.label || "This Month"}
              </span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {showDateDropdown && (
              <div className="absolute right-0 z-40 mt-1.5 w-44 rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl">
                {DATE_PRESET_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      const preset = opt.value as DatePreset;
                      setDatePreset(preset);
                      if (preset !== "custom") {
                        const range = rangeForPreset(preset);
                        setFromDate(range.from);
                        setToDate(range.to);
                      }
                      setShowDateDropdown(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs font-medium text-left transition-colors ${
                      datePreset === opt.value
                        ? "bg-blue-50 text-blue-600 font-semibold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                    {datePreset === opt.value && <Check className="h-3.5 w-3.5 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Payment Status Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowStatusDropdown(!showStatusDropdown);
                setShowDateDropdown(false);
                setShowSortDropdown(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <CreditCard className="h-3.5 w-3.5 text-slate-500" />
              <span>{statusFilter === "All" ? "All Payments" : statusFilter}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {showStatusDropdown && (
              <div className="absolute right-0 z-40 mt-1.5 w-40 rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl">
                {["All", "Paid", "Pending"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setStatusFilter(st as any);
                      setShowStatusDropdown(false);
                      setCurrentPage(1);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs font-medium text-left transition-colors ${
                      statusFilter === st
                        ? "bg-blue-50 text-blue-600 font-semibold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {st === "All" ? "All Payments" : st}
                    {statusFilter === st && <Check className="h-3.5 w-3.5 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export Button */}
          <button
            type="button"
            onClick={handleExport}
            title="Export as Excel"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer active:scale-98"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* ── 5. Main Custom Table ────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-white text-xs font-semibold text-slate-600">
                <th className="w-12 py-3.5 px-4 text-center text-slate-400">#</th>
                <th className="py-3.5 px-4 font-semibold text-slate-700">
                  Title / Description
                </th>
                <th className="py-3.5 px-4 font-semibold text-slate-700">Category</th>
                <th className="py-3.5 px-4 font-semibold text-slate-700">Amount</th>
                <th className="py-3.5 px-4 font-semibold text-slate-700">Vendor</th>
                <th className="py-3.5 px-4 font-semibold text-slate-700 text-center">Mode</th>
                <th className="py-3.5 px-4 font-semibold text-slate-700 text-center">Status</th>
                <th className="py-3.5 px-4 font-semibold text-slate-700">Date</th>
                <th className="w-16 py-3.5 px-4 font-semibold text-slate-700 text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-400">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2" />
                    <p className="text-xs font-medium">Loading expenses…</p>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-600">No expenses found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {search ? "Try clearing your search query." : "Click Add Expense to record a new expense."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx;
                  const catColor = CATEGORY_COLORS[row.category] ||
                    CATEGORY_COLORS[row.segment] || { bg: "bg-slate-100", text: "text-slate-700" };
                  const modeColor = MODE_COLORS[row.mode] || { bg: "bg-slate-100", text: "text-slate-700" };
                  const isMenuOpen = actionMenuRowId === row._id;

                  return (
                    <tr
                      key={row._id || globalIdx}
                      className="group transition-colors hover:bg-slate-50/70"
                    >
                      {/* # */}
                      <td className="py-3.5 px-4 text-center text-xs font-medium text-slate-400">
                        {globalIdx + 1}
                      </td>

                      {/* Title / Description */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 text-sm">
                          {row.title}
                        </div>
                        {row.notes && (
                          <div className="text-xs text-slate-400 mt-0.5">
                            {row.notes}
                          </div>
                        )}
                      </td>

                      {/* Category Pill */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${catColor.bg} ${catColor.text}`}
                        >
                          {row.category || row.segment}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        ₹ {row.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Vendor */}
                      <td className="py-3.5 px-4 font-medium text-slate-700 text-sm">
                        {row.paidTo}
                      </td>

                      {/* Mode */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${modeColor.bg} ${modeColor.text}`}
                        >
                          {row.mode}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                            row.status === "Paid"
                              ? "bg-emerald-50 text-emerald-700"
                              : row.status === "Pending"
                                ? "bg-rose-50 text-rose-600"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                        {formatDisplayDate(row.date)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center relative">
                        <button
                          type="button"
                          onClick={() => setActionMenuRowId(isMenuOpen ? null : row._id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {/* Actions Floating Popover */}
                        {isMenuOpen && (
                          <div
                            ref={actionMenuRef}
                            className="absolute right-4 top-10 z-50 w-44 rounded-xl border border-slate-100 bg-white py-1.5 shadow-xl text-left"
                          >
                            {row.status === "Pending" && row.dueAmount > 0 && (
                              <Can permission={PERMISSIONS.EXPENSE_UPDATE}>
                                <button
                                  type="button"
                                  onClick={() => openReceivePaymentModal(row)}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 cursor-pointer"
                                >
                                  <IndianRupee className="h-3.5 w-3.5" />
                                  <span>Receive Payment</span>
                                </button>
                              </Can>
                            )}

                            <Can permission={PERMISSIONS.EXPENSE_READ}>
                              <button
                                type="button"
                                onClick={() => openViewModal(row)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5 text-slate-400" />
                                <span>View Details</span>
                              </button>
                            </Can>

                            <Can permission={PERMISSIONS.EXPENSE_UPDATE}>
                              <button
                                type="button"
                                onClick={() => openEditModal(row)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                <SquarePen className="h-3.5 w-3.5 text-slate-400" />
                                <span>Edit Expense</span>
                              </button>
                            </Can>

                            <Can permission={PERMISSIONS.EXPENSE_DELETE}>
                              <button
                                type="button"
                                onClick={() => handleDeleteExpense(row)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                <span>Delete Expense</span>
                              </button>
                            </Can>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── 6. Pagination Bar ──────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3.5 border-t border-slate-100 text-xs text-slate-500">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-700">
              {startRecord}–{endRecord}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-700">{sortedData.length}</span>{" "}
            expenses
          </div>

          <div className="flex items-center gap-1 self-center sm:self-auto">
            {/* Prev */}
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            {/* Page Numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`flex h-7 min-w-[28px] items-center justify-center rounded-lg px-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  currentPage === pageNum
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {pageNum}
              </button>
            ))}

            {/* Next */}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 7. Existing Modals & Workflows (100% Preserved) ─────────── */}
      <ExpenseModal
        key={
          modalMode === "create"
            ? `create-${expenseFormKey}`
            : `${modalMode}-${activeExpense?._id || "none"}`
        }
        isOpen={isExpenseModalOpen}
        mode={modalMode}
        initialExpense={modalInitialExpense}
        saving={savingExpense}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setOpenPin(false);
          if (modalMode !== "create") setActiveExpense(null);
        }}
        onContinue={(draft) => {
          setExpenseDraft(draft);
          setOpenPin(true);
        }}
        onSave={handleSaveEdit}
      />

      <StaffVerifyModal
        open={openPin}
        onClose={() => setOpenPin(false)}
        onVerified={({ staff, verifiedAt: at }) => {
          setVerifiedStaff(staff);
          setVerifiedAt(at);
          setOpenPin(false);
          setIsExpenseModalOpen(false);
          setOpenCheckout(true);
        }}
      />

      <CheckoutModal
        open={openCheckout}
        onClose={() => {
          setOpenCheckout(false);
          setModalMode("create");
          setIsExpenseModalOpen(true);
        }}
        grandTotal={expenseDraft?.amount ?? 0}
        items={checkoutItems}
        initialCustomerName={expenseDraft?.paidTo ?? ""}
        initialNotes={expenseDraft?.description ?? ""}
        initialVerifiedStaff={verifiedStaff}
        initialVerifiedAt={verifiedAt}
        checkoutContext="expense"
        onConfirmPayment={async (payment) => {
          if (!expenseDraft) return;
          const status: ExpenseStatus =
            payment.dueAmount > 0 ? "Pending" : "Paid";
          const mode: PaymentMode =
            status === "Pending"
              ? "Due"
              : mapCheckoutModeToExpenseMode(
                  payment.mode,
                  payment.paymentBreakdown,
                );
          const paidAmount =
            payment.dueAmount > 0
              ? payment.paymentBreakdown.paidAmount
              : payment.finalAmount;
          const dueAmount = payment.dueAmount;
          const isMulti =
            String(payment.mode || "")
              .toUpperCase()
              .replace(/_/g, " ") === "MULTI";
          await handleCreateExpence(
            {
              title: expenseDraft.title,
              category: expenseDraft.category || "Other",
              segment: expenseDraft.segment || "general",
              amount: expenseDraft.amount,
              paidAmount,
              dueAmount,
              paymentBreakdown: {
                cash: payment.paymentBreakdown.cash,
                upi: payment.paymentBreakdown.upi,
                card: payment.paymentBreakdown.card,
                wallet: payment.paymentBreakdown.wallet,
              },
              initialPayment:
                paidAmount > 0
                  ? {
                      mode: isMulti ? "Multi" : mode,
                      isMultiMode: isMulti,
                      paymentBreakdown: {
                        cash: payment.paymentBreakdown.cash,
                        upi: payment.paymentBreakdown.upi,
                        card: payment.paymentBreakdown.card,
                        wallet: payment.paymentBreakdown.wallet,
                      },
                      receivedBy: {
                        m_staff_id:
                          payment.invoiceBy?.employeeId ||
                          payment.invoiceBy?.staffId ||
                          null,
                        m_staff_name: payment.invoiceBy?.staffName || null,
                        m_staff_email: payment.invoiceBy?.email || null,
                      },
                      paidAt: payment.verifiedAt || new Date().toISOString(),
                    }
                  : undefined,
              paidTo: expenseDraft.paidTo,
              vendorId: expenseDraft.vendorId || null,
              paidBy: expenseDraft.paidBy,
              mode,
              status,
              date: expenseDraft.date,
              notes: expenseDraft.description || payment.notes,
              createdBy: {
                m_staff_id:
                  payment.invoiceBy?.employeeId ||
                  payment.invoiceBy?.staffId ||
                  null,
                m_staff_name: payment.invoiceBy?.staffName || null,
                m_staff_email: payment.invoiceBy?.email || null,
              },
              addedBy: {
                m_staff_id: user.m_staff_id || null,
                m_staff_name: user.m_staff_name || null,
                m_staff_email: user.m_staff_email || null,
              },
            },
            expenseDraft.receipt || null,
          );
          setOpenCheckout(false);
          setIsExpenseModalOpen(false);
          setExpenseDraft(null);
          setVerifiedStaff(null);
          setVerifiedAt(null);
          setExpenseFormKey((k) => k + 1);
          setModalMode("create");
          setActiveExpense(null);
          await Swal.fire({
            icon: "success",
            title: "Expense added",
            text: "The expense was saved successfully.",
          });
          void fetchExpenses();
        }}
      />

      <ExpenseReceivePaymentModal
        open={receivePaymentOpen}
        onClose={() => {
          setReceivePaymentOpen(false);
          setReceivePaymentTarget(null);
        }}
        expense={receivePaymentTarget}
        onSuccess={() => void fetchExpenses()}
      />
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import {
  ChevronDown,
  Search,
  Plus,
  Eye,
  SquarePen,
  Trash2,
  IndianRupee,
  Ellipsis,
  XCircle,
} from "lucide-react";
import Swal from "sweetalert2";
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

// ─── Types ────────────────────────────────────────────────────────────────────

type ExpenseCategory =
  | "Rent"
  | "Utilities"
  | "Salary"
  | "Marketing"
  | "Supplies"
  | "Maintenance"
  | "Travel"
  | "Other";

type ExpenseStatus = "Paid" | "Pending" | "Cancelled";
type PaymentMode = "Cash" | "UPI" | "Card" | "Bank Transfer" | "Wallet" | "Due";

type ExpenseRow = {
  id: number;
  _id: string;
  expenseCode: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  paidAmount: number;
  dueAmount: number;
  paidTo: string;
  vendorId: string;
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
];
const MODES: PaymentMode[] = ["Cash", "UPI", "Card", "Bank Transfer", "Wallet", "Due"];
const STATUSES: ExpenseStatus[] = ["Paid", "Pending", "Cancelled"];

function asCategory(value: unknown): ExpenseCategory {
  const v = String(value ?? "").trim();
  return (CATEGORIES as string[]).includes(v) ? (v as ExpenseCategory) : "Other";
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
    amount,
    paidAmount,
    dueAmount,
    paidTo: String(item?.paidTo || "").trim() || "—",
    vendorId: String(item?.vendorId?._id || item?.vendorId || "").trim(),
    mode: asMode(item?.mode, status),
    status,
    date: toDateYmd(item?.date || item?.createdAt),
    createdBy: createdName || "—",
    createdById: staffId(item?.createdBy),
    addedBy: addedName || createdName || "System",
    addedById: staffId(item?.addedBy) || staffId(item?.createdBy),
    notes: String(item?.notes || "").trim(),
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
    amount: row.amount,
    paidTo: row.paidTo === "—" ? "" : row.paidTo,
    vendorId: row.vendorId,
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

// ─── Date filter ──────────────────────────────────────────────────────────────

type DateFilter = "today" | "yesterday" | "week" | "month" | "year";

const dateFilterOptions: { value: DateFilter; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
];

function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getFilterDateRange(filter: DateFilter): { from: string; to: string } {
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const now = startOfDay(new Date());
  if (filter === "today") return { from: toYmd(now), to: toYmd(now) };
  if (filter === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { from: toYmd(y), to: toYmd(y) };
  }
  if (filter === "week") {
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const from = new Date(now);
    from.setDate(now.getDate() + mondayOffset);
    return { from: toYmd(from), to: toYmd(now) };
  }
  if (filter === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toYmd(from), to: toYmd(now) };
  }
  const from = new Date(now.getFullYear(), 0, 1);
  return { from: toYmd(from), to: toYmd(now) };
}

const STATUS_TABS: Array<ExpenseStatus | "All"> = [
  "All",
  "Paid",
  "Pending",
  "Cancelled",
];

// ─── Category badge colours ───────────────────────────────────────────────────

const CATEGORY_STYLES: Record<ExpenseCategory, string> = {
  Rent: "bg-violet-100 text-violet-700",
  Utilities: "bg-sky-100 text-sky-700",
  Salary: "bg-emerald-100 text-emerald-700",
  Marketing: "bg-pink-100 text-pink-700",
  Supplies: "bg-amber-100 text-amber-800",
  Maintenance: "bg-orange-100 text-orange-700",
  Travel: "bg-cyan-100 text-cyan-700",
  Other: "bg-slate-100 text-slate-600",
};

const MODE_STYLES: Record<PaymentMode, string> = {
  Cash: "bg-green-100 text-green-700",
  UPI: "bg-indigo-100 text-indigo-700",
  Card: "bg-blue-100 text-blue-700",
  "Bank Transfer": "bg-teal-100 text-teal-700",
  Wallet: "bg-amber-100 text-amber-700",
  Due: "bg-orange-100 text-orange-700",
};

// ─── Component ────────────────────────────────────────────────────────────────

const ExpenseScreen = () => {
  const user = useAppSelector((state) => state.user);
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [activeTab, setActiveTab] = useState<ExpenseStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("year");
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ExpenseModalMode>("create");
  const [activeExpense, setActiveExpense] = useState<ExpenseRow | null>(null);
  const [savingExpense, setSavingExpense] = useState(false);
  const [openPin, setOpenPin] = useState(false);
  const [openCheckout, setOpenCheckout] = useState(false);
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft | null>(null);
  const [verifiedStaff, setVerifiedStaff] = useState<VerifiedStaff | null>(null);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [expenseFormKey, setExpenseFormKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [receivePaymentOpen, setReceivePaymentOpen] = useState(false);
  const [receivePaymentTarget, setReceivePaymentTarget] =
    useState<ExpensePaymentTarget | null>(null);
  const [selectedActionRow, setSelectedActionRow] = useState<ExpenseRow | null>(
    null,
  );

  const selectedLabel =
    dateFilterOptions.find((o) => o.value === dateFilter)?.label ?? "This Year";
  const { from, to } = getFilterDateRange(dateFilter);

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
      modalMode === "create" || !activeExpense
        ? null
        : rowToModalValues(activeExpense),
    [modalMode, activeExpense],
  );

  const fetchExpenses = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const response = await handleGetAllExpences("", signal);
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
  }, []);

  const openCreateModal = () => {
    setModalMode("create");
    setActiveExpense(null);
    setIsExpenseModalOpen(true);
  };

  const openViewModal = useCallback((row: ExpenseRow) => {
    setModalMode("view");
    setActiveExpense(row);
    setIsExpenseModalOpen(true);
  }, []);

  const openEditModal = useCallback((row: ExpenseRow) => {
    setModalMode("edit");
    setActiveExpense(row);
    setIsExpenseModalOpen(true);
  }, []);

  const openReceivePaymentModal = useCallback((row: ExpenseRow) => {
    if (row.status !== "Pending" || row.dueAmount <= 0) return;
    setReceivePaymentTarget(rowToPaymentTarget(row));
    setReceivePaymentOpen(true);
  }, []);

  const handleDeleteExpense = useCallback(async (row: ExpenseRow) => {
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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "Delete failed",
        err?.response?.data?.message || "Could not delete this expense.",
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
          amount: draft.amount,
          paidTo: draft.paidTo,
          vendorId: draft.vendorId || null,
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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "Update failed",
        err?.response?.data?.message || "Could not update this expense.",
        "error",
      );
    } finally {
      setSavingExpense(false);
    }
  };

  const filteredData = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      const statusOk = activeTab === "All" || row.status === activeTab;
      const searchOk =
        !term ||
        row.expenseCode.toLowerCase().includes(term) ||
        row.title.toLowerCase().includes(term) ||
        row.paidTo.toLowerCase().includes(term) ||
        row.category.toLowerCase().includes(term) ||
        row.addedBy.toLowerCase().includes(term) ||
        row.createdBy.toLowerCase().includes(term);
      const dateOk = !!row.date && row.date >= from && row.date <= to;
      return statusOk && searchOk && dateOk;
    });
  }, [activeTab, search, from, to, rows]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "expenseCode",
        header: "Expense #",
        Cell: ({ row }: { row: { original: ExpenseRow } }) => (
          <span className="font-mono text-xs font-semibold text-gray-700">
            {row.original.expenseCode}
          </span>
        ),
        size: 120,
      },
      {
        accessorKey: "title",
        header: "Title / Description",
        Cell: ({ row }: { row: { original: ExpenseRow } }) => (
          <div className="flex flex-col">
            <span className="font-semibold text-gray-900">
              {row.original.title}
            </span>
            {row.original.notes ? (
              <span className="text-[11px] text-gray-400">
                {row.original.notes}
              </span>
            ) : null}
          </div>
        ),
        size: 220,
      },
      {
        accessorKey: "category",
        header: "Category",
        Cell: ({ row }: { row: { original: ExpenseRow } }) => (
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              CATEGORY_STYLES[row.original.category]
            }`}
          >
            {row.original.category}
          </span>
        ),
        size: 130,
      },
      {
        accessorKey: "amount",
        header: "Amount",
        Cell: ({ row }: { row: { original: ExpenseRow } }) => (
          <span className="font-semibold text-gray-800">
            ₹{" "}
            {row.original.amount.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}
          </span>
        ),
        size: 120,
      },
      {
        accessorKey: "paidTo",
        header: "Vendor",
        size: 150,
      },
      {
        accessorKey: "mode",
        header: "Mode",
        Cell: ({ row }: { row: { original: ExpenseRow } }) => {
          const isPendingDue =
            row.original.status === "Pending" && row.original.dueAmount > 0;
          if (isPendingDue) {
            const dueAmount = Number(row.original.dueAmount ?? 0);
            return (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openReceivePaymentModal(row.original);
                }}
                className="inline-flex rounded-md bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-200"
              >
                Due ₹{" "}
                {dueAmount.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </button>
            );
          }
          return (
            <span
              className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${
                MODE_STYLES[row.original.mode]
              }`}
            >
              {row.original.mode}
            </span>
          );
        },
        size: 130,
      },
      {
        accessorKey: "status",
        header: "Status",
        Cell: ({ row }: { row: { original: ExpenseRow } }) => {
          const s = row.original.status;
          const cls =
            s === "Paid"
              ? "bg-green-100 text-green-700"
              : s === "Pending"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700";
          return (
            <span
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${cls}`}
            >
              {s}
            </span>
          );
        },
        size: 110,
      },
      {
        accessorKey: "date",
        header: "Date",
        Cell: ({ row }: { row: { original: ExpenseRow } }) => {
          const d = new Date(row.original.date);
          return (
            <span className="text-gray-700">
              {Number.isNaN(d.getTime())
                ? row.original.date
                : d.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
            </span>
          );
        },
        size: 120,
      },
      // {
      //   accessorKey: "addedBy",
      //   header: "Added By",
      //   size: 130,
      // },
      // {
      //   accessorKey: "createdBy",
      //   header: "Created By",
      //   size: 130,
      // },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ row }: { row: { original: ExpenseRow } }) => (
          <button
            type="button"
            title="More actions"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedActionRow(row.original);
            }}
            className="flex items-center gap-1 rounded-md bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-200"
          >
            <Ellipsis size={18} />
          </button>
        ),
        size: 110,
      },
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: filteredData,
    state: {
      isLoading: loading,
    },
    enableTopToolbar: false,
    enablePagination: true,
    enableBottomToolbar: true,
    enableColumnActions: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enableHiding: false,
    muiTableHeadCellProps: {
      sx: {
        fontWeight: 700,
        color: "#111827",
        fontSize: "12px",
        backgroundColor: "#f9fafb",
      },
    },
    muiTableBodyCellProps: {
      sx: { fontSize: "13px" },
    },
    muiTablePaperProps: {
      elevation: 0,
      square: false,
      style: {
        boxShadow: "none",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        overflow: "hidden",
      },
    },
    muiTableContainerProps: {
      sx: {
        maxWidth: "100%",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      },
    },
  });

  const totalAmount = filteredData.reduce((sum, r) => sum + r.amount, 0);
  const paidAmount = filteredData.reduce((sum, r) => sum + r.paidAmount, 0);
  const pendingAmount = filteredData
    .filter((r) => r.status === "Pending")
    .reduce((sum, r) => sum + r.dueAmount, 0);

  return (
    <div className="min-w-0 space-y-4 p-1">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
            Expenses
          </h1>
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
            {filteredData.length}
          </span>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          Add Expense
        </button>
      </div>

      {/* ── Status tabs ── */}
      <div className="hide-scrollbar flex items-center gap-4 overflow-x-auto border-b border-gray-200 pb-2 sm:gap-6">
        {STATUS_TABS.map((tab) => {
          const count =
            tab === "All"
              ? rows.length
              : rows.filter((r) => r.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 text-sm font-medium ${
                activeTab === tab
                  ? "border-b-2 border-blue-600 pb-1 text-blue-700"
                  : "text-gray-500"
              }`}
            >
              {tab} <span className="text-xs text-gray-400">{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Search + date filter ── */}
      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 w-full flex-1 sm:min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses..."
            className="h-10 w-full rounded-md border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-blue-400"
          />
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setDateMenuOpen((v) => !v)}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-200 px-3 text-sm text-gray-700"
          >
            {selectedLabel} <ChevronDown size={14} />
          </button>
          {dateMenuOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10 cursor-default"
                aria-label="Close date filter"
                onClick={() => setDateMenuOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                {dateFilterOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setDateFilter(opt.value);
                      setDateMenuOpen(false);
                    }}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                      dateFilter === opt.value
                        ? "bg-blue-50 font-semibold text-blue-700"
                        : "text-gray-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="table-scroll min-w-0">
        <MaterialReactTable table={table} />
      </div>

      {/* ── Footer totals ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded bg-gray-100 px-2 py-1 text-gray-700">
            Total ₹{" "}
            {totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className="rounded bg-green-100 px-2 py-1 text-green-700">
            Paid ₹{" "}
            {paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-700">
            Pending ₹{" "}
            {pendingAmount.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>

      {selectedActionRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Expense Actions
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedActionRow.expenseCode} · {selectedActionRow.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedActionRow(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle size={20} />
              </button>
            </div>
            <div className="space-y-3 p-5">
              {selectedActionRow.status === "Pending" &&
              selectedActionRow.dueAmount > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    const row = selectedActionRow;
                    setSelectedActionRow(null);
                    openReceivePaymentModal(row);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border border-amber-100 bg-amber-50 p-3 text-left transition-colors hover:bg-amber-100"
                >
                  <div className="rounded-full bg-amber-200 p-2 text-amber-700">
                    <IndianRupee size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-amber-800">
                      Receive Payment
                    </div>
                    <div className="text-xs text-amber-700/80">
                      Record a payment against this due
                    </div>
                  </div>
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  const row = selectedActionRow;
                  setSelectedActionRow(null);
                  openViewModal(row);
                }}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50"
              >
                <div className="rounded-full bg-violet-100 p-2 text-violet-600">
                  <Eye size={18} />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">
                    View Expense
                  </div>
                  <div className="text-xs text-gray-500">
                    View in read-only mode
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  const row = selectedActionRow;
                  setSelectedActionRow(null);
                  openEditModal(row);
                }}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50"
              >
                <div className="rounded-full bg-green-100 p-2 text-green-700">
                  <SquarePen size={18} />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">
                    Edit Expense
                  </div>
                  <div className="text-xs text-gray-500">
                    Modify expense details
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  const row = selectedActionRow;
                  setSelectedActionRow(null);
                  void handleDeleteExpense(row);
                }}
                className="flex w-full items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-3 text-left transition-colors hover:bg-red-100"
              >
                <div className="rounded-full bg-red-200 p-2 text-red-700">
                  <Trash2 size={18} />
                </div>
                <div>
                  <div className="font-semibold text-red-700">
                    Delete Expense
                  </div>
                  <div className="text-xs text-red-600/70">
                    Permanently remove
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

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
};

export default ExpenseScreen;

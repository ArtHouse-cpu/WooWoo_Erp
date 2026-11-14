import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  BadgeIndianRupee,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  CircleX,
  Clock,
  Download,
  Edit3,
  Eye,
  Menu,
  MoreVertical,
  Phone,
  RefreshCcw,
  RotateCcw,
  Search,
  Settings,
  SquarePen,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermission } from "@/hooks/usePermission";
import {
  handleCancelOverviewBooking,
  handleDeleteAllBooking,
  handleDeleteSpaceBooking,
  handleGetBookingOverview,
  handleGetBookingPaymentSettings,
  handleUpdateAllBooking,
  handleUpdateBookingPaymentSettings,
  handleUpdateOverviewRefund,
  handleUpdateSpaceBooking,
  type BookingOverviewRow,
  type BookingPaymentSettings,
  type SpaceBookingStatus,
} from "@/services/apiClient";
import { previewBookingPayment } from "./paymentRule";

const BOOKING_STATUSES = [
  "",
  "Upcoming",
  "Ongoing",
  "Expired",
  "Cancelled",
  "Draft",
];
const REFUND_STATUSES = ["Pending", "Processing", "Completed", "Failed"];

const inr = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const when = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const badgeClass = (status: string) => {
  if (
    status === "Paid" ||
    status === "Refunded" ||
    status === "Upcoming" ||
    status === "Ongoing"
  ) {
    return "bg-emerald-50 text-emerald-700";
  }
  if (
    status === "Partially Paid" ||
    status === "Partially Refunded" ||
    status === "Pending" ||
    status === "Processing" ||
    status === "Expired" ||
    status === "Draft"
  ) {
    return "bg-amber-50 text-amber-800";
  }
  if (status === "Cancelled" || status === "Failed" || status === "Unpaid") {
    return "bg-rose-50 text-rose-700";
  }
  if (status === "Refund Pending") return "bg-violet-50 text-violet-700";
  return "bg-slate-100 text-slate-600";
};

type Kpis = {
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  pendingAmount: number;
  pendingRefundCount: number;
  pendingRefundAmount: number;
};

const emptyKpis: Kpis = {
  totalBookings: 0,
  confirmedBookings: 0,
  pendingBookings: 0,
  cancelledBookings: 0,
  totalRevenue: 0,
  pendingAmount: 0,
  pendingRefundCount: 0,
  pendingRefundAmount: 0,
};

const defaultSettings: BookingPaymentSettings = {
  enablePartialPayment: true,
  minimumPaymentType: "percentage",
  minimumPaymentValue: 70,
  paymentInstructions: "",
  refundPercent: 100,
};

type DatePresetType =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "lifetime"
  | "custom";

const DATE_PRESETS: { key: DatePresetType; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "this_week", label: "This Week" },
  { key: "last_week", label: "Last Week" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "this_year", label: "This Year" },
  { key: "lifetime", label: "Lifetime" },
  { key: "custom", label: "Custom Range" },
];

const formatYmd = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getRangeForPreset = (preset: DatePresetType): { from: string; to: string } => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (preset === "today") {
    const ymd = formatYmd(now);
    return { from: ymd, to: ymd };
  }
  if (preset === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const ymd = formatYmd(y);
    return { from: ymd, to: ymd };
  }
  if (preset === "this_week") {
    const day = now.getDay() || 7;
    const start = new Date(now);
    start.setDate(now.getDate() - (day - 1));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: formatYmd(start), to: formatYmd(end) };
  }
  if (preset === "last_week") {
    const day = now.getDay() || 7;
    const start = new Date(now);
    start.setDate(now.getDate() - (day - 1) - 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: formatYmd(start), to: formatYmd(end) };
  }
  if (preset === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: formatYmd(start), to: formatYmd(end) };
  }
  if (preset === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: formatYmd(start), to: formatYmd(end) };
  }
  if (preset === "this_year") {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    return { from: formatYmd(start), to: formatYmd(end) };
  }
  return { from: "", to: "" };
};

/** Smooth SVG Sparkline Graph */
function Sparkline({
  color,
  points,
  fillGradient,
}: {
  color: string;
  points: number[];
  fillGradient?: boolean;
}) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const width = 64;
  const height = 24;
  const step = width / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = i * step;
    const y = height - ((p - min) / range) * (height - 6) - 3;
    return [x, y];
  });

  let path = `M ${coords[0][0]} ${coords[0][1]}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const [x0, y0] = coords[i];
    const [x1, y1] = coords[i + 1];
    const mx = (x0 + x1) / 2;
    path += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
  }

  const fillPath = `${path} L ${width} ${height} L 0 ${height} Z`;
  const gradId = `spark-${color.replace("#", "")}`;

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0 hidden sm:block">
      {fillGradient && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
      )}
      {fillGradient && <path d={fillPath} fill={`url(#${gradId})`} />}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const AVATAR_PALETTES = [
  { bg: "bg-purple-100", text: "text-purple-700" },
  { bg: "bg-pink-100", text: "text-pink-700" },
  { bg: "bg-sky-100", text: "text-sky-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-amber-100", text: "text-amber-800" },
  { bg: "bg-indigo-100", text: "text-indigo-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-teal-100", text: "text-teal-700" },
];

function getCustomerInitials(name?: string) {
  const cleaned = String(name ?? "").trim();
  if (!cleaned) return "B";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

function formatDateDisplay(dateStr?: string) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function StatusBadge({ status }: { status: string }) {
  let bg = "bg-slate-100 text-slate-700 border-slate-200";
  let dot = "bg-slate-400";

  switch (status) {
    case "Upcoming":
      bg = "bg-sky-50 text-sky-700 border-sky-200/70";
      dot = "bg-sky-500";
      break;
    case "Ongoing":
      bg = "bg-emerald-50 text-emerald-700 border-emerald-200/70";
      dot = "bg-emerald-500";
      break;
    case "Expired":
      bg = "bg-amber-50 text-amber-700 border-amber-200/70";
      dot = "bg-amber-500";
      break;
    case "Cancelled":
      bg = "bg-rose-50 text-rose-700 border-rose-200/70";
      dot = "bg-rose-500";
      break;
    case "Draft":
      bg = "bg-purple-50 text-purple-700 border-purple-200/70";
      dot = "bg-purple-500";
      break;
    default:
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span>{status || "—"}</span>
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  let bg = "bg-slate-100 text-slate-700 border-slate-200";
  let dot = "bg-slate-400";

  switch (status) {
    case "Paid":
      bg = "bg-emerald-50 text-emerald-700 border-emerald-200/70";
      dot = "bg-emerald-500";
      break;
    case "Partially Paid":
      bg = "bg-amber-50 text-amber-800 border-amber-200/70";
      dot = "bg-amber-500";
      break;
    case "Unpaid":
      bg = "bg-rose-50 text-rose-700 border-rose-200/70";
      dot = "bg-rose-500";
      break;
    case "Refund Pending":
      bg = "bg-violet-50 text-violet-700 border-violet-200/70";
      dot = "bg-violet-500";
      break;
    case "Refunded":
      bg = "bg-teal-50 text-teal-700 border-teal-200/70";
      dot = "bg-teal-500";
      break;
    default:
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span>{status || "—"}</span>
    </span>
  );
}

function Badge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none ${badgeClass(value)}`}
    >
      {value || "—"}
    </span>
  );
}

export default function BookingOverView() {
  const { can } = usePermission();
  const canUpdate = can(PERMISSIONS.SPACE_BOOKING_UPDATE);
  const [tab, setTab] = useState<"overview" | "settings">("overview");
  const [kpis, setKpis] = useState<Kpis>(emptyKpis);
  const [rows, setRows] = useState<BookingOverviewRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [bookingStatus, setBookingStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [source, setSource] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [sort, setSort] = useState("bookingDate");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [cancelTarget, setCancelTarget] = useState<BookingOverviewRow | null>(
    null,
  );
  const [cancelReason, setCancelReason] = useState("");
  const [refundTarget, setRefundTarget] = useState<BookingOverviewRow | null>(
    null,
  );
  const [detail, setDetail] = useState<BookingOverviewRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] =
    useState<BookingPaymentSettings>(defaultSettings);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [refundForm, setRefundForm] = useState({
    status: "Pending",
    amount: "",
    method: "Cash",
    paymentReference: "",
    note: "",
  });

  const [datePreset, setDatePreset] = useState<DatePresetType>("lifetime");
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const [tempPreset, setTempPreset] = useState<DatePresetType>("lifetime");
  const [tempFrom, setTempFrom] = useState("");
  const [tempTo, setTempTo] = useState("");
  const [actionMenuRowId, setActionMenuRowId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<BookingOverviewRow | null>(null);
  const [editForm, setEditForm] = useState({
    customerName: "",
    customerPhone: "",
    bookingDate: "",
    startTime: "",
    endTime: "",
    bookingStatus: "Upcoming",
    notes: "",
  });

  const handlePresetSelect = (preset: DatePresetType) => {
    setDatePreset(preset);
    setPage(1);
    if (preset === "custom") {
      return;
    }
    const range = getRangeForPreset(preset);
    setFrom(range.from);
    setTo(range.to);
  };

  const openEdit = (row: BookingOverviewRow) => {
    setEditTarget(row);
    setEditForm({
      customerName: row.customerName || "",
      customerPhone: row.customerPhone || "",
      bookingDate: row.bookingDate || "",
      startTime: row.startTime || "",
      endTime: row.endTime || "",
      bookingStatus: row.bookingStatus || "Upcoming",
      notes: "",
    });
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    try {
      setSaving(true);
      if (editTarget.source === "space") {
        await handleUpdateSpaceBooking(editTarget.id, {
          customerName: editForm.customerName.trim(),
          customerPhone: editForm.customerPhone.trim(),
          bookingDate: editForm.bookingDate,
          startTime: editForm.startTime.trim(),
          endTime: editForm.endTime.trim(),
          status: editForm.bookingStatus as SpaceBookingStatus,
          notes: editForm.notes.trim(),
        });
      } else {
        await handleUpdateAllBooking(editTarget.id, {
          customerName: editForm.customerName.trim(),
          customerPhone: editForm.customerPhone.trim(),
          bookingDate: editForm.bookingDate,
          startTime: editForm.startTime.trim(),
          endTime: editForm.endTime.trim(),
          status: editForm.bookingStatus,
          notes: editForm.notes.trim(),
        });
      }
      setEditTarget(null);
      await load();
      await Swal.fire({
        icon: "success",
        title: "Booking updated",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not update the booking.";
      await Swal.fire("Update failed", message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: BookingOverviewRow) => {
    const result = await Swal.fire({
      title: "Delete booking?",
      text: `Are you sure you want to delete ${row.bookingCode} for ${row.customerName || "this customer"}? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, delete",
    });
    if (!result.isConfirmed) return;
    try {
      setSaving(true);
      if (row.source === "space") {
        await handleDeleteSpaceBooking(row.id);
      } else {
        await handleDeleteAllBooking(row.id);
      }
      await Swal.fire({
        icon: "success",
        title: "Booking deleted",
        timer: 1400,
        showConfirmButton: false,
      });
      await load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not delete booking.";
      await Swal.fire("Delete failed", message, "error");
    } finally {
      setSaving(false);
    }
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await handleGetBookingOverview({
        search,
        bookingStatus,
        paymentStatus,
        source,
        from,
        to,

        sort,
        order,
        page,
        limit: pageSize,
      });
      setKpis({
        ...emptyKpis,
        ...(data.kpis || {}),
        pendingAmount: Number(data.kpis?.pendingAmount) || 0,
      });
      setRows(data.bookings || []);
      setPages(data.pagination?.pages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not load bookings.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [
    search,
    bookingStatus,
    paymentStatus,
    source,
    from,
    to,
    sort,
    order,
    page,
    pageSize,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    handleGetBookingPaymentSettings()
      .then((next) => {
        if (!cancelled) setSettings({ ...defaultSettings, ...next });
      })
      .catch(() => {
        if (!cancelled) setSettings(defaultSettings);
      })
      .finally(() => {
        if (!cancelled) setSettingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const preview = useMemo(
    () => previewBookingPayment(5000, settings),
    [settings],
  );

  const toggleSort = (key: string) => {
    setPage(1);
    if (sort === key)
      setOrder((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setOrder("asc");
    }
  };

  const renderSortHeader = (key: string, label: string) => {
    const isSorted = sort === key;
    return (
      <button
        type="button"
        onClick={() => toggleSort(key)}
        className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition cursor-pointer"
      >
        <span>{label}</span>
        {isSorted ? (
          order === "asc" ? (
            <ChevronUp size={13} className="text-[#6344E7] stroke-[2.5]" />
          ) : (
            <ChevronDown size={13} className="text-[#6344E7] stroke-[2.5]" />
          )
        ) : (
          <ArrowUpDown size={12} className="text-slate-400 opacity-60" />
        )}
      </button>
    );
  };

  const paginationRange = useMemo(() => {
    if (pages <= 7) {
      return Array.from({ length: pages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, "...", pages];
    }
    if (page >= pages - 3) {
      return [1, "...", pages - 4, pages - 3, pages - 2, pages - 1, pages];
    }
    return [1, "...", page - 1, page, page + 1, "...", pages];
  }, [page, pages]);

  const handleExportBookings = () => {
    const exportData = rows.map((r, i) => ({
      "#": (page - 1) * pageSize + i + 1,
      "Booking ID": r.bookingCode,
      Type: r.source === "space" ? "Space Booking" : "Full Booking",
      Space: r.spaceName || "—",
      Customer: r.customerName || "—",
      Phone: r.customerPhone || "—",
      Date: r.bookingDate || "—",
      "Start Time": r.startTime || "—",
      "End Time": r.endTime || "—",
      Duration: r.duration || "—",
      "Total Amount": Number(r.grandTotal || 0),
      "Paid Amount": Number(r.paidAmount || 0),
      "Due Amount": Number(r.dueAmount || 0),
      "Payment Status": r.paymentStatus || "—",
      "Booking Status": r.bookingStatus || "—",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bookings");
    XLSX.writeFile(
      wb,
      `Booking_Overview_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  const hasActiveFilters = Boolean(
    search ||
      bookingStatus ||
      paymentStatus ||
      source ||
      from ||
      to ||
      datePreset !== "lifetime",
  );

  const resetAllFilters = () => {
    setSearch("");
    setBookingStatus("");
    setPaymentStatus("");
    setSource("");
    setFrom("");
    setTo("");
    setDatePreset("lifetime");
    setTempPreset("lifetime");
    setTempFrom("");
    setTempTo("");
    setIsPeriodOpen(false);
    setPage(1);
  };

  const togglePeriodPopover = () => {
    if (!isPeriodOpen) {
      setTempPreset(datePreset);
      setTempFrom(from);
      setTempTo(to);
    }
    setIsPeriodOpen((prev) => !prev);
  };

  const handleSelectTempPreset = (preset: DatePresetType) => {
    setTempPreset(preset);
    if (preset === "lifetime") {
      setTempFrom("");
      setTempTo("");
    } else {
      const range = getRangeForPreset(preset);
      setTempFrom(range.from);
      setTempTo(range.to);
    }
  };

  const handleClearPeriod = () => {
    setTempPreset("lifetime");
    setTempFrom("");
    setTempTo("");
    setDatePreset("lifetime");
    setFrom("");
    setTo("");
    setPage(1);
    setIsPeriodOpen(false);
  };

  const handleApplyPeriod = () => {
    setDatePreset(tempPreset);
    setFrom(tempFrom);
    setTo(tempTo);
    setPage(1);
    setIsPeriodOpen(false);
  };

  const getPeriodButtonLabel = () => {
    if (datePreset === "today") return "Today";
    if (datePreset === "yesterday") return "Yesterday";
    if (datePreset === "this_week") return "This Week";
    if (datePreset === "this_month") return "This Month";
    if (datePreset === "this_year") return "This Year";
    if (datePreset === "custom") {
      if (from && to) return `${from} to ${to}`;
      if (from) return `From ${from}`;
      if (to) return `Until ${to}`;
      return "Custom";
    }
    return "All Time";
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const saved = await handleUpdateBookingPaymentSettings(settings);
      setSettings({ ...defaultSettings, ...saved });
      await Swal.fire({
        icon: "success",
        title: "Settings saved",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not save settings.";
      await Swal.fire("Could not save", message, "error");
    } finally {
      setSaving(false);
    }
  };

  const submitCancel = async () => {
    if (!cancelTarget) return;
    try {
      setSaving(true);
      await handleCancelOverviewBooking(
        cancelTarget.source,
        cancelTarget.id,
        cancelReason.trim(),
      );
      setCancelTarget(null);
      setCancelReason("");
      await load();
      await Swal.fire({
        icon: "success",
        title: "Booking cancelled",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not cancel the booking.";
      await Swal.fire("Cancellation failed", message, "error");
    } finally {
      setSaving(false);
    }
  };

  const openRefund = (row: BookingOverviewRow) => {
    setRefundTarget(row);
    setRefundForm({
      status:
        row.refund?.status && row.refund.status !== "Completed"
          ? row.refund.status
          : "Processing",
      amount: String(row.refund?.amount || row.refund?.refundableAmount || ""),
      method: row.refund?.method || "Cash",
      paymentReference: row.refund?.paymentReference || "",
      note: "",
    });
  };

  const submitRefund = async () => {
    if (!refundTarget) return;
    try {
      setSaving(true);
      await handleUpdateOverviewRefund(refundTarget.source, refundTarget.id, {
        status: refundForm.status,
        amount: Number(refundForm.amount) || 0,
        method: refundForm.method,
        paymentReference: refundForm.paymentReference,
        note: refundForm.note,
      });
      const creditedToWallet =
        refundForm.method.trim().toLowerCase() === "wallet" &&
        refundForm.status !== "Failed";
      setRefundTarget(null);
      await load();
      await Swal.fire({
        icon: "success",
        title: creditedToWallet ? "Refund added to wallet" : "Refund updated",
        text: creditedToWallet
          ? `₹${(Number(refundForm.amount) || 0).toLocaleString("en-IN")} was added to the customer wallet.`
          : undefined,
        timer: 1600,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not update the refund.";
      await Swal.fire("Refund failed", message, "error");
    } finally {
      setSaving(false);
    }
  };

  const cards = [
    {
      label: "Total Bookings",
      value: String(kpis.totalBookings),
      icon: CalendarCheck,
      tone: "bg-sky-600 text-white",
      lightCard: "bg-sky-50 border-sky-200 text-sky-950",
      lightIcon: "bg-sky-100 text-sky-600",
      lightLabel: "text-sky-700",
      sparkColor: "#0284C7",
      sparkPoints: [10, 16, 13, 22, 19, 26, 23],
    },
    {
      label: "Confirmed Bookings",
      value: String(kpis.confirmedBookings),
      icon: CalendarClock,
      tone: "bg-emerald-600 text-white",
      lightCard: "bg-emerald-50 border-emerald-200 text-emerald-950",
      lightIcon: "bg-emerald-100 text-emerald-700",
      lightLabel: "text-emerald-700",
      sparkColor: "#059669",
      sparkPoints: [8, 14, 11, 20, 17, 25, 22],
    },
    {
      label: "Pending Bookings",
      value: String(kpis.pendingBookings),
      icon: Wallet,
      tone: "bg-amber-500 text-white",
      lightCard: "bg-amber-50 border-amber-200 text-amber-950",
      lightIcon: "bg-amber-100 text-amber-700",
      lightLabel: "text-amber-800",
      sparkColor: "#D97706",
      sparkPoints: [12, 16, 14, 19, 15, 21, 18],
    },
    {
      label: "Cancelled Bookings",
      value: String(kpis.cancelledBookings),
      icon: CircleX,
      tone: "bg-rose-600 text-white",
      lightCard: "bg-rose-50 border-rose-200 text-rose-950",
      lightIcon: "bg-rose-100 text-rose-600",
      lightLabel: "text-rose-700",
      sparkColor: "#E11D48",
      sparkPoints: [15, 12, 17, 10, 14, 9, 7],
    },
    {
      label: "Total Booking Revenue",
      value: inr(kpis.totalRevenue),
      hint: `Pending ${inr(kpis.pendingAmount)}`,
      icon: BadgeIndianRupee,
      tone: "bg-indigo-600 text-white",
      lightCard: "bg-indigo-50 border-indigo-200 text-indigo-950",
      lightIcon: "bg-indigo-100 text-indigo-600",
      lightLabel: "text-indigo-700",
      sparkColor: "#4F46E5",
      sparkPoints: [10, 17, 14, 25, 22, 28, 26],
    },
    {
      label: "Pending Refunds",
      value: String(kpis.pendingRefundCount),
      hint: inr(kpis.pendingRefundAmount),
      icon: RefreshCcw,
      tone: "bg-purple-600 text-white",
      lightCard: "bg-purple-50 border-purple-200 text-purple-950",
      lightIcon: "bg-purple-100 text-purple-600",
      lightLabel: "text-purple-700",
      sparkColor: "#9333EA",
      sparkPoints: [6, 11, 8, 15, 12, 17, 13],
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 p-3 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Booking Overview
          </h1>
        </div>
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setTab("overview")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${
              tab === "overview"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500"
            }`}
          >
            <Menu size={15} />
            <span className="hidden sm:inline">Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("settings")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${
              tab === "settings"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500"
            }`}
          >
            <Settings size={15} />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>

      {tab === "settings" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Enable Partial Payment
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            This setting controls checkout for both Space Booking and Full
            Booking. POS billing is unchanged.
          </p>
          {settingsLoading ? (
            <p className="mt-6 text-sm text-slate-500">Loading settings…</p>
          ) : (
            <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-5">
                <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">
                      Enable Partial Payment
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {settings.enablePartialPayment
                        ? "Customers can pay a portion of the booking total."
                        : "Customers must pay the full booking amount."}
                    </span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.enablePartialPayment}
                    disabled={!canUpdate}
                    onClick={() =>
                      setSettings((current) => ({
                        ...current,
                        enablePartialPayment: !current.enablePartialPayment,
                      }))
                    }
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${settings.enablePartialPayment ? "bg-emerald-500" : "bg-slate-300"} disabled:opacity-60`}
                  >
                    <span
                      className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${settings.enablePartialPayment ? "left-5" : "left-0.5"}`}
                    />
                  </button>
                </label>

                {settings.enablePartialPayment ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="mb-1 block font-semibold text-slate-700">
                        Minimum Payment Type
                      </span>
                      <select
                        disabled={!canUpdate}
                        value={settings.minimumPaymentType}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            minimumPaymentType: event.target
                              .value as BookingPaymentSettings["minimumPaymentType"],
                          }))
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-500"
                      >
                        <option value="percentage">Percentage</option>
                        <option value="fixed">Fixed Amount</option>
                      </select>
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block font-semibold text-slate-700">
                        Minimum Payment Value{" "}
                        {settings.minimumPaymentType === "percentage"
                          ? "(%)"
                          : "(₹)"}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={
                          settings.minimumPaymentType === "percentage"
                            ? 100
                            : undefined
                        }
                        disabled={!canUpdate}
                        value={settings.minimumPaymentValue}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            minimumPaymentValue:
                              Number(event.target.value) || 0,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-500"
                      />
                    </label>
                  </div>
                ) : null}

                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">
                    Payment Instructions
                  </span>
                  <textarea
                    disabled={!canUpdate}
                    value={settings.paymentInstructions}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        paymentInstructions: event.target.value,
                      }))
                    }
                    rows={3}
                    maxLength={500}
                    placeholder="Shown on the booking checkout page"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-500"
                  />
                </label>

                <label className="block max-w-xs text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">
                    Cancellation refund (%)
                  </span>
                  <span className="mb-1 block text-xs text-slate-500">
                    Percent of the amount already paid that becomes refundable.
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    disabled={!canUpdate}
                    value={settings.refundPercent}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        refundPercent: Number(event.target.value) || 0,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-500"
                  />
                </label>

                {canUpdate ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveSettings()}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save settings"}
                  </button>
                ) : (
                  <p className="text-xs text-slate-500">
                    You can view these settings. Updating them needs booking
                    edit access.
                  </p>
                )}
              </div>

              <aside className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Checkout preview
                </p>
                <p className="mt-3 text-sm text-slate-600">
                  Sample total booking price
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {inr(preview.total)}
                </p>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Amount payable now</span>
                    <span className="font-bold">{inr(preview.payable)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Remaining balance</span>
                    <span className="font-bold text-amber-700">
                      {inr(preview.balance)}
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-xs leading-5 text-slate-500">
                  {settings.enablePartialPayment
                    ? settings.minimumPaymentType === "percentage"
                      ? `Customers must pay at least ${settings.minimumPaymentValue}% at checkout.`
                      : `Customers must pay at least ${inr(settings.minimumPaymentValue)} at checkout, and never more than the booking total.`
                    : "Partial payment is off, so checkout collects the full amount."}
                </p>
              </aside>
            </div>
          )}
        </section>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* MOBILE VIEW (block md:hidden): Date Filter, 6 Light Pastel Cards, Search, 3 Dropdowns, Image Cards */}
          {/* ========================================================================= */}
          <div className="block md:hidden space-y-3">
            {/* 2. Top 6 KPI Cards (Different Light Pastel Colors) */}
            <div className="grid grid-cols-2 gap-2">
              {cards.map((card) => (
                <article
                  key={card.label}
                  className={`relative flex flex-col justify-between overflow-hidden rounded-xl border p-2.5 shadow-2xs ${card.lightCard}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider line-clamp-1 ${card.lightLabel}`}>
                      {card.label}
                    </span>
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${card.lightIcon}`}>
                      <card.icon size={13} />
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <p className="text-lg font-bold leading-tight tracking-tight">
                      {card.value}
                    </p>
                    {card.hint ? (
                      <p className="mt-0.5 truncate text-[9px] font-medium opacity-80">
                        {card.hint}
                      </p>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>

            {/* 3. Search and date filter on one line */}
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search bookings, customers, spaces..."
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white pr-8 pl-8.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-2xs"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              <select
                aria-label="Date filter"
                value={datePreset}
                onChange={(e) => handlePresetSelect(e.target.value as DatePresetType)}
                className="h-9 w-[108px] shrink-0 rounded-xl border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 shadow-2xs outline-none focus:border-indigo-500"
              >
                {DATE_PRESETS.map((preset) => (
                  <option key={preset.key} value={preset.key}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
            {datePreset === "custom" && (
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 block mb-1">From Date</span>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => {
                      setFrom(e.target.value);
                      setPage(1);
                    }}
                    className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 text-xs text-slate-700 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 block mb-1">To Date</span>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => {
                      setTo(e.target.value);
                      setPage(1);
                    }}
                    className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 text-xs text-slate-700 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* 4. Three Dropdowns */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {/* Dropdown 1: Booking Status */}
              <select
                value={bookingStatus}
                onChange={(e) => {
                  setBookingStatus(e.target.value);
                  setPage(1);
                }}
                className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-1.5 sm:px-2 text-[11px] font-medium text-slate-700 outline-none focus:border-indigo-500 truncate shadow-2xs"
              >
                <option value="">Status: All</option>
                {BOOKING_STATUSES.filter(Boolean).map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>

              {/* Dropdown 2: Payment Status */}
              <select
                value={paymentStatus}
                onChange={(e) => {
                  setPaymentStatus(e.target.value);
                  setPage(1);
                }}
                className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-1.5 sm:px-2 text-[11px] font-medium text-slate-700 outline-none focus:border-indigo-500 truncate shadow-2xs"
              >
                <option value="">Payment: All</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Partially Paid">Part. Paid</option>
                <option value="Paid">Paid</option>
                <option value="Refund Pending">Ref. Pending</option>
                <option value="Refunded">Refunded</option>
              </select>

              {/* Dropdown 3: Booking Type / Source */}
              <select
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  setPage(1);
                }}
                className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-1.5 sm:px-2 text-[11px] font-medium text-slate-700 outline-none focus:border-indigo-500 truncate shadow-2xs"
              >
                <option value="">Type: All</option>
                <option value="space">Space</option>
                <option value="full">Full</option>
              </select>
            </div>

            {/* 5. Booking Image Cards (2-2 cards in one row) */}
            <div className="space-y-3">
              {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-xs text-rose-700 font-medium">
                  {error}
                </div>
              ) : null}

              {loading ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                  Loading bookings…
                </div>
              ) : rows.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                  No bookings match these filters.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {rows.map((row) => {
                    const rowId = `${row.source}-${row.id}`;
                    const isMenuOpen = actionMenuRowId === rowId;
                    const rawRow = row as BookingOverviewRow & {
                      imageUrl?: string;
                      spaceImageUrl?: string;
                      image?: string;
                    };
                    const img = rawRow.imageUrl || rawRow.spaceImageUrl || rawRow.image;

                    return (
                      <article
                        key={rowId}
                        className={`group relative flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white shadow-2xs transition hover:border-slate-300 hover:shadow-xs ${
                          isMenuOpen ? "z-30 ring-1 ring-indigo-200" : "z-0"
                        }`}
                      >
                        {/* Image Area */}
                        <div className="relative aspect-4/3 w-full overflow-hidden rounded-t-xl bg-gradient-to-br from-indigo-50/80 via-slate-50 to-blue-50/60 border-b border-slate-100">
                          {img ? (
                            <img
                              src={img}
                              alt={row.spaceName || row.bookingCode}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100/80 text-indigo-600 shadow-2xs">
                                <Building2 size={16} />
                              </div>
                              <span className="mt-1 line-clamp-1 text-[10px] font-semibold text-slate-700 px-1">
                                {row.spaceName || "Art House Space"}
                              </span>
                            </div>
                          )}

                          {/* Top-Left: Booking Code */}
                          <div className="absolute top-1.5 left-1.5 z-10">
                            <span className="inline-flex items-center rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-2xs backdrop-blur-xs">
                              {row.bookingCode}
                            </span>
                          </div>

                          {/* Top-Right: Source Badge */}
                          <div className="absolute top-1.5 right-1.5 z-10">
                            <span className="inline-flex items-center rounded-md bg-white/90 px-1.5 py-0.5 text-[8px] font-bold text-slate-700 shadow-2xs backdrop-blur-xs">
                              {row.source === "space" ? "Space" : "Full"}
                            </span>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="flex flex-1 flex-col justify-between p-2 space-y-1.5">
                          <div className="space-y-1">
                            <h4
                              className="truncate text-xs font-bold text-slate-900 leading-snug"
                              title={row.customerName || "Walk-in Guest"}
                            >
                              {row.customerName || "Walk-in Guest"}
                            </h4>

                            <p
                              className="truncate text-[10px] font-medium text-slate-500"
                              title={row.spaceName || "—"}
                            >
                              {row.spaceName || "—"}
                            </p>

                            <div className="space-y-0.5 text-[10px] text-slate-500">
                              <div className="flex items-center gap-1 truncate">
                                <Calendar size={10} className="shrink-0 text-slate-400" />
                                <span className="truncate">{row.bookingDate || "—"}</span>
                              </div>
                              <div className="flex items-center gap-1 truncate">
                                <Clock size={10} className="shrink-0 text-slate-400" />
                                <span className="truncate">{row.startTime || "—"}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1 pt-0.5">
                              <Badge value={row.bookingStatus} />
                              <Badge value={row.paymentStatus} />
                            </div>
                          </div>

                          {/* Card Footer: Price on Left, 3 Dots Action Menu on Right Bottom Corner */}
                          <div className="flex items-end justify-between border-t border-slate-100 pt-1.5">
                            <div className="min-w-0 pr-1">
                              <span className="block text-[8px] uppercase font-semibold text-slate-400">Total</span>
                              <span className="block truncate text-xs font-bold text-slate-900 leading-tight">
                                {inr(row.grandTotal)}
                              </span>
                              <span className="block truncate text-[9px] font-semibold text-emerald-700">
                                {inr(row.paidAmount)} paid
                              </span>
                            </div>

                            {/* 3 Dots at Right Bottom Corner */}
                            <div
                              className="relative shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => setActionMenuRowId(isMenuOpen ? null : rowId)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition active:scale-95 cursor-pointer"
                                aria-label="Booking actions"
                              >
                                <MoreVertical size={14} />
                              </button>

                              {isMenuOpen && (
                                <>
                                  <div
                                    className="fixed inset-0 z-30"
                                    onClick={() => setActionMenuRowId(null)}
                                  />
                                  <div className="absolute right-0 bottom-full z-40 mb-1.5 w-32 rounded-xl border border-slate-100 bg-white py-1 text-left shadow-xl animate-in fade-in zoom-in-95 duration-100">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActionMenuRowId(null);
                                        setDetail(row);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                                    >
                                      <Eye size={13} className="text-slate-400" />
                                      <span>View</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActionMenuRowId(null);
                                        openEdit(row);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 cursor-pointer"
                                    >
                                      <Edit3 size={13} className="text-blue-500" />
                                      <span>Edit</span>
                                    </button>

                                    {row.canCancel && canUpdate ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActionMenuRowId(null);
                                          setCancelTarget(row);
                                          setCancelReason("");
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 cursor-pointer"
                                      >
                                        <CircleX size={13} className="text-amber-500" />
                                        <span>Cancel</span>
                                      </button>
                                    ) : null}

                                    {row.canRefund && canUpdate ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActionMenuRowId(null);
                                          openRefund(row);
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-50 cursor-pointer"
                                      >
                                        <RefreshCcw size={13} className="text-violet-500" />
                                        <span>Refund</span>
                                      </button>
                                    ) : null}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActionMenuRowId(null);
                                        void handleDelete(row);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer border-t border-slate-100"
                                    >
                                      <Trash2 size={13} className="text-rose-500" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {/* Mobile Pagination */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-600">
                <span>{total} bookings</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 font-semibold disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span>
                    {page} / {pages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= pages}
                    onClick={() => setPage((current) => current + 1)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 font-semibold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* DESKTOP VIEW (hidden md:block): Modern SaaS Table, KPIs & Filters */}
          {/* ========================================================================= */}
          <div className="hidden md:block space-y-4">
            {/* 6 KPI Cards in One Row */}
            <div className="grid grid-cols-6 gap-2 xl:gap-3">
              {cards.map((card) => (
                <article
                  key={card.label}
                  className={`rounded-2xl border p-3 shadow-xs flex items-center justify-between hover:shadow-md transition ${card.lightCard}`}
                >
                  <div className="min-w-0 pr-1.5 flex-1">
                    <p
                      className={`text-[10px] font-black uppercase tracking-wider truncate ${card.lightLabel}`}
                      title={card.label}
                    >
                      {card.label}
                    </p>
                    <p className="mt-0.5 text-lg xl:text-xl font-black text-slate-900 tracking-tight truncate">
                      {card.value}
                    </p>
                    {card.hint ? (
                      <p
                        className={`mt-0.5 text-[10px] font-bold truncate opacity-90 ${card.lightLabel}`}
                        title={card.hint}
                      >
                        {card.hint}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[10px] text-transparent select-none">—</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className={`h-9 w-9 xl:h-10 xl:w-10 shrink-0 items-center justify-center rounded-xl flex ${card.tone} shadow-xs`}
                    >
                      <card.icon size={18} className="stroke-[2.2]" />
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Filter & Search Toolbar (Single Row with Period Popover) */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-xs">
              <div className="flex items-center gap-2.5 flex-wrap xl:flex-nowrap">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search bookings by code, space, customer, phone..."
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white pr-8 pl-9 text-xs text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Booking Status Select */}
                <div className="w-44 shrink-0">
                  <select
                    value={bookingStatus}
                    onChange={(event) => {
                      setBookingStatus(event.target.value);
                      setPage(1);
                    }}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">All Booking Statuses</option>
                    {BOOKING_STATUSES.filter(Boolean).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Status Select */}
                <div className="w-44 shrink-0">
                  <select
                    value={paymentStatus}
                    onChange={(event) => {
                      setPaymentStatus(event.target.value);
                      setPage(1);
                    }}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">All Payment Statuses</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Paid">Paid</option>
                    <option value="Refund Pending">Refund Pending</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                </div>

                {/* Booking Type Select */}
                <div className="w-40 shrink-0">
                  <select
                    value={source}
                    onChange={(event) => {
                      setSource(event.target.value);
                      setPage(1);
                    }}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">All Booking Types</option>
                    <option value="space">Space Booking</option>
                    <option value="full">Full Booking</option>
                  </select>
                </div>

                {/* Export Button */}
                <button
                  type="button"
                  onClick={handleExportBookings}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer shrink-0"
                  title="Export current bookings to Excel"
                >
                  <Download size={14} className="stroke-[2.2]" />
                  <span>Export</span>
                </button>

                {/* Period Button & Popover */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={togglePeriodPopover}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-[#6344E7] bg-white text-xs font-bold text-[#6344E7] shadow-xs hover:bg-purple-50/50 transition cursor-pointer"
                  >
                    <Calendar size={14} className="text-[#6344E7]" />
                    <span>Period: {getPeriodButtonLabel()}</span>
                    <ChevronDown
                      size={14}
                      className={`text-[#6344E7] transition-transform duration-200 ${
                        isPeriodOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isPeriodOpen && (
                    <>
                      {/* Invisible backdrop to dismiss on click outside */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsPeriodOpen(false)}
                      />

                      {/* Popover Dropdown */}
                      <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                        <p className="text-xs font-bold text-slate-800 mb-2.5">
                          Select Period
                        </p>

                        {/* 6 Preset Chips in 3 columns */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { key: "lifetime", label: "All Time" },
                            { key: "today", label: "Today" },
                            { key: "yesterday", label: "Yesterday" },
                            { key: "this_week", label: "This Week" },
                            { key: "this_month", label: "This Month" },
                            { key: "this_year", label: "This Year" },
                          ].map((p) => {
                            const active = tempPreset === p.key;
                            return (
                              <button
                                key={p.key}
                                type="button"
                                onClick={() =>
                                  handleSelectTempPreset(p.key as DatePresetType)
                                }
                                className={`py-1.5 px-2 rounded-xl text-xs font-bold text-center transition cursor-pointer ${
                                  active
                                    ? "bg-[#6344E7] text-white shadow-xs"
                                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                }`}
                              >
                                {p.label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom Range */}
                        <p className="text-xs font-bold text-slate-800 mt-4 mb-2.5">
                          Custom Range
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="date"
                              value={tempFrom}
                              onChange={(e) => {
                                setTempFrom(e.target.value);
                                setTempPreset("custom");
                              }}
                              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500"
                            />
                          </div>
                          <span className="text-xs text-slate-400 font-medium">
                            to
                          </span>
                          <div className="relative flex-1">
                            <input
                              type="date"
                              value={tempTo}
                              onChange={(e) => {
                                setTempTo(e.target.value);
                                setTempPreset("custom");
                              }}
                              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        {/* Actions Footer */}
                        <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={handleClearPeriod}
                            className="text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            onClick={handleApplyPeriod}
                            className="px-4 py-1.5 rounded-xl bg-[#6344E7] hover:bg-[#5235D9] text-xs font-bold text-white shadow-xs transition cursor-pointer active:scale-95"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>

            {/* Desktop Modern Table Card */}
            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs">
              {error ? (
                <div className="px-4 py-3 bg-rose-50 text-xs font-semibold text-rose-700 border-b border-rose-100">
                  {error}
                </div>
              ) : null}

              <div className="overflow-x-auto">
                <table className="min-w-[1340px] w-full text-left text-xs">
                  <thead className="bg-[#FAF5FF]/50 border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-3.5 font-bold w-12 text-center">#</th>
                      <th className="px-3 py-3.5 font-bold">
                        {renderSortHeader("bookingCode", "Booking ID")}
                      </th>
                      <th className="px-3 py-3.5 font-bold">
                        {renderSortHeader("spaceName", "Space")}
                      </th>
                      <th className="px-3 py-3.5 font-bold">
                        {renderSortHeader("customerName", "Customer")}
                      </th>
                      <th className="px-3 py-3.5 font-bold">
                        {renderSortHeader("bookingDate", "Date")}
                      </th>
                      <th className="px-3 py-3.5 font-bold">
                        {renderSortHeader("startTime", "Start")}
                      </th>
                      <th className="px-3 py-3.5 font-bold">
                        {renderSortHeader("endTime", "End")}
                      </th>
                      <th className="px-3 py-3.5 font-bold">
                        {renderSortHeader("duration", "Duration")}
                      </th>
                      <th className="px-3 py-3.5 font-bold">
                        {renderSortHeader("grandTotal", "Total")}
                      </th>
                      <th className="px-3 py-3.5 font-bold">
                        {renderSortHeader("paidAmount", "Paid")}
                      </th>
                      <th className="px-3 py-3.5 font-bold">
                        {renderSortHeader("dueAmount", "Remaining")}
                      </th>
                      <th className="px-3 py-3.5 font-bold">Contact</th>
                      <th className="px-3 py-3.5 font-bold">Payment</th>
                      <th className="px-3 py-3.5 font-bold">Status</th>
                      <th className="px-3 py-3.5 font-bold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={15}
                          className="px-4 py-14 text-center text-xs font-semibold text-slate-400"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                            <span>Loading bookings…</span>
                          </div>
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={15}
                          className="px-4 py-14 text-center text-xs font-semibold text-slate-400"
                        >
                          No bookings match these filters.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, index) => {
                        const avatarPalette =
                          AVATAR_PALETTES[
                            Math.abs((row.customerName || "").charCodeAt(0) || 0) %
                              AVATAR_PALETTES.length
                          ];
                        return (
                          <tr
                            key={`${row.source}-${row.id}`}
                            className="hover:bg-slate-50/70 transition"
                          >
                            {/* # */}
                            <td className="px-3 py-3 text-center text-slate-400 font-semibold">
                              {(page - 1) * pageSize + index + 1}
                            </td>

                            {/* Booking ID & Type */}
                            <td className="px-3 py-3">
                              <button
                                type="button"
                                onClick={() => setDetail(row)}
                                className="font-bold text-[#2563EB] hover:text-[#1D4ED8] hover:underline transition cursor-pointer text-xs"
                                title="View details"
                              >
                                {row.bookingCode}
                              </button>
                              <div>
                                {row.source === "space" ? (
                                  <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                    Space
                                  </span>
                                ) : (
                                  <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-purple-50 text-purple-700">
                                    Full
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Space */}
                            <td className="px-3 py-3">
                              <span className="font-bold text-slate-800">
                                {row.spaceName || "—"}
                              </span>
                            </td>

                            {/* Customer */}
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${avatarPalette.bg} ${avatarPalette.text}`}
                                >
                                  {getCustomerInitials(row.customerName)}
                                </span>
                                <span
                                  className="font-bold text-slate-900 truncate max-w-[130px]"
                                  title={row.customerName}
                                >
                                  {row.customerName || "—"}
                                </span>
                              </div>
                            </td>

                            {/* Date */}
                            <td className="px-3 py-3 whitespace-nowrap text-slate-600 font-medium">
                              {formatDateDisplay(row.bookingDate)}
                            </td>

                            {/* Start */}
                            <td className="px-3 py-3 whitespace-nowrap text-slate-600 font-medium">
                              {row.startTime || "—"}
                            </td>

                            {/* End */}
                            <td className="px-3 py-3 whitespace-nowrap text-slate-600 font-medium">
                              {row.endTime || "—"}
                            </td>

                            {/* Duration */}
                            <td className="px-3 py-3 whitespace-nowrap">
                              <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                                {row.duration || "—"}
                              </span>
                            </td>

                            {/* Total */}
                            <td className="px-3 py-3 font-bold text-slate-900 whitespace-nowrap">
                              {inr(row.grandTotal)}
                            </td>

                            {/* Paid */}
                            <td className="px-3 py-3 font-semibold text-emerald-700 whitespace-nowrap">
                              {inr(row.paidAmount)}
                            </td>

                            {/* Remaining */}
                            <td className="px-3 py-3 whitespace-nowrap">
                              {Number(row.dueAmount) > 0 ? (
                                <span className="font-bold text-rose-600">
                                  {inr(row.dueAmount)}
                                </span>
                              ) : (
                                <span className="font-medium text-slate-400">
                                  ₹0
                                </span>
                              )}
                            </td>

                            {/* Contact */}
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                                <Phone size={12} className="text-slate-400" />
                                <span>{row.customerPhone || "—"}</span>
                              </div>
                            </td>

                            {/* Payment */}
                            <td className="px-3 py-3 whitespace-nowrap">
                              <PaymentBadge status={row.paymentStatus} />
                            </td>

                            {/* Status */}
                            <td className="px-3 py-3 whitespace-nowrap">
                              <StatusBadge status={row.bookingStatus} />
                            </td>

                            {/* Actions */}
                            <td className="px-3 py-3 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Details Eye Button */}
                                <button
                                  type="button"
                                  onClick={() => setDetail(row)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
                                  title="View Booking Details"
                                >
                                  <Eye size={13} />
                                </button>

                                {/* Edit Button */}
                                {canUpdate ? (
                                  <button
                                    type="button"
                                    onClick={() => openEdit(row)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200/70 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                                    title="Edit Booking"
                                  >
                                    <SquarePen size={13} />
                                  </button>
                                ) : null}

                                {/* Cancel Button */}
                                {row.canCancel && canUpdate ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCancelTarget(row);
                                      setCancelReason("");
                                    }}
                                    className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer whitespace-nowrap"
                                    title="Cancel Booking"
                                  >
                                    Cancel
                                  </button>
                                ) : null}

                                {/* Refund Button */}
                                {row.canRefund && canUpdate ? (
                                  <button
                                    type="button"
                                    onClick={() => openRefund(row)}
                                    className="rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-bold text-violet-700 hover:bg-violet-100 transition cursor-pointer whitespace-nowrap"
                                    title="Process Refund"
                                  >
                                    Refund
                                  </button>
                                ) : null}

                                {/* Delete Button */}
                                {canUpdate ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleDelete(row)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200/70 bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                                    title="Delete Booking"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer with Numbered Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 bg-white">
                <div className="text-xs font-medium text-slate-500">
                  Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}–
                  {Math.min(page * pageSize, total)} of {total} bookings
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <span>Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer focus:border-indigo-500"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  {/* Numbered pagination */}
                  <div className="flex items-center gap-1">
                    {/* First Page */}
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage(1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="First Page"
                    >
                      <ChevronsLeft size={14} />
                    </button>

                    {/* Prev Page */}
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((c) => Math.max(1, c - 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Previous Page"
                    >
                      <ChevronLeft size={14} />
                    </button>

                    {/* Pages */}
                    {paginationRange.map((p, idx) => {
                      if (p === "...") {
                        return (
                          <span
                            key={`ellipsis-${idx}`}
                            className="px-1 text-xs text-slate-400"
                          >
                            ...
                          </span>
                        );
                      }
                      const pageNum = p as number;
                      const isActive = pageNum === page;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setPage(pageNum)}
                          className={`flex h-7 min-w-[28px] items-center justify-center rounded-lg px-2 text-xs font-bold transition cursor-pointer ${
                            isActive
                              ? "bg-[#6344E7] text-white shadow-xs"
                              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    {/* Next Page */}
                    <button
                      type="button"
                      disabled={page >= pages}
                      onClick={() => setPage((c) => Math.min(pages, c + 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Next Page"
                    >
                      <ChevronRight size={14} />
                    </button>

                    {/* Last Page */}
                    <button
                      type="button"
                      disabled={page >= pages}
                      onClick={() => setPage(pages)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Last Page"
                    >
                      <ChevronsRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </>
      )}

      {cancelTarget ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/30 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Cancel booking</h3>
            <p className="mt-1 text-sm text-slate-500">
              {cancelTarget.bookingCode} · {cancelTarget.customerName}. The
              refundable amount follows the saved refund percent of the amount
              already paid.
            </p>
            <textarea
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              rows={3}
              placeholder="Cancellation reason"
              className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-400"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600"
              >
                Keep booking
              </button>
              <button
                type="button"
                disabled={saving || !cancelReason.trim()}
                onClick={() => void submitCancel()}
                className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Cancelling…" : "Confirm cancellation"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {refundTarget ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/30 p-3 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Refund</h3>
            <p className="mt-1 text-sm text-slate-500">
              Refundable {inr(refundTarget.refund?.refundableAmount || 0)}. A
              completed refund cannot be processed again.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-semibold">Status</span>
                <select
                  value={refundForm.status}
                  onChange={(event) =>
                    setRefundForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                >
                  {REFUND_STATUSES.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold">Amount</span>
                <input
                  type="number"
                  min={0}
                  value={refundForm.amount}
                  onChange={(event) =>
                    setRefundForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold">Method</span>
                <select
                  value={refundForm.method}
                  onChange={(event) =>
                    setRefundForm((current) => ({
                      ...current,
                      method: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                >
                  {["Cash", "UPI", "Card", "Wallet", "Bank transfer"].map(
                    (method) => (
                      <option key={method}>{method}</option>
                    ),
                  )}
                </select>
                {refundForm.method === "Wallet" ? (
                  <span className="mt-1 block text-xs text-slate-500">
                    This amount is added to the customer wallet, including space bookings.
                  </span>
                ) : null}
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold">
                  Payment reference
                </span>
                <input
                  value={refundForm.paymentReference}
                  onChange={(event) =>
                    setRefundForm((current) => ({
                      ...current,
                      paymentReference: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </label>
            </div>
            <textarea
              value={refundForm.note}
              onChange={(event) =>
                setRefundForm((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
              rows={2}
              placeholder="Note"
              className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefundTarget(null)}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600"
              >
                Close
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void submitRefund()}
                className="rounded-xl bg-violet-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Update refund"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detail ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/30 p-3 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {detail.bookingCode}
                </h3>
                <p className="text-sm text-slate-500">
                  {detail.customerName} · {detail.customerPhone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="text-sm font-semibold text-slate-500"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <p>
                Refundable:{" "}
                <span className="font-semibold">
                  {inr(detail.refund?.refundableAmount || 0)}
                </span>
              </p>
              <p>
                Refund status: <Badge value={detail.refund?.status || "—"} />
              </p>
              <p>Refund amount: {inr(detail.refund?.amount || 0)}</p>
              <p>Refund date: {when(detail.refund?.refundedAt)}</p>
              <p>Method: {detail.refund?.method || "—"}</p>
              <p>Reference: {detail.refund?.paymentReference || "—"}</p>
            </div>
            <h4 className="mt-5 text-sm font-bold text-slate-900">
              Cancellation history
            </h4>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              {(detail.cancellationHistory || []).length === 0 ? (
                <li>No cancellation recorded.</li>
              ) : (
                detail.cancellationHistory?.map((entry, index) => (
                  <li key={index} className="rounded-xl bg-slate-50 px-3 py-2">
                    <span className="font-semibold text-slate-800">
                      {entry.reason || "Cancelled"}
                    </span>
                    <span className="mt-0.5 block text-xs">
                      {when(entry.cancelledAt)} ·{" "}
                      {entry.cancelledBy?.m_staff_name || "Staff"}
                    </span>
                  </li>
                ))
              )}
            </ul>
            <h4 className="mt-5 text-sm font-bold text-slate-900">
              Refund history
            </h4>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              {(detail.refund?.history || []).length === 0 ? (
                <li>No refund updates yet.</li>
              ) : (
                detail.refund?.history?.map((entry, index) => (
                  <li key={index} className="rounded-xl bg-slate-50 px-3 py-2">
                    <span className="font-semibold text-slate-800">
                      {entry.status} · {inr(entry.amount || 0)}
                    </span>
                    <span className="mt-0.5 block text-xs">
                      {when(entry.at)} · {entry.by?.m_staff_name || "Staff"}
                      {entry.method ? ` · ${entry.method}` : ""}
                      {entry.paymentReference
                        ? ` · ${entry.paymentReference}`
                        : ""}
                    </span>
                    {entry.note ? (
                      <span className="mt-1 block">{entry.note}</span>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}

      {/* Edit Booking Modal */}
      {editTarget ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-3 sm:items-center">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit Booking</h3>
                <p className="text-xs text-slate-500">
                  {editTarget.bookingCode} · {editTarget.source === "space" ? "Space Booking" : "Full Booking"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-1">
                  Customer Name
                </span>
                <input
                  type="text"
                  value={editForm.customerName}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, customerName: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-1">
                  Customer Phone
                </span>
                <input
                  type="text"
                  value={editForm.customerPhone}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, customerPhone: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block mb-1">
                    Booking Date
                  </span>
                  <input
                    type="date"
                    value={editForm.bookingDate}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, bookingDate: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-700 block mb-1">
                    Booking Status
                  </span>
                  <select
                    value={editForm.bookingStatus}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, bookingStatus: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  >
                    {BOOKING_STATUSES.filter(Boolean).map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block mb-1">
                    Start Time
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. 10:00 AM"
                    value={editForm.startTime}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, startTime: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-700 block mb-1">
                    End Time
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. 02:00 PM"
                    value={editForm.endTime}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, endTime: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-1">
                  Notes
                </span>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Special requests or notes..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void submitEdit()}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

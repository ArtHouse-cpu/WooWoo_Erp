import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeIndianRupee,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CircleX,
  Clock,
  Edit3,
  Eye,
  Menu,
  MoreVertical,
  RefreshCcw,
  Search,
  Settings,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
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
        limit: 10,
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
      tone: "bg-slate-900 text-white",
      lightCard: "bg-sky-50 border-sky-200 text-sky-950",
      lightIcon: "bg-sky-100 text-sky-600",
      lightLabel: "text-sky-700",
    },
    {
      label: "Confirmed Bookings",
      value: String(kpis.confirmedBookings),
      icon: CalendarClock,
      tone: "bg-emerald-600 text-white",
      lightCard: "bg-emerald-50 border-emerald-200 text-emerald-950",
      lightIcon: "bg-emerald-100 text-emerald-700",
      lightLabel: "text-emerald-700",
    },
    {
      label: "Pending Bookings",
      value: String(kpis.pendingBookings),
      icon: Wallet,
      tone: "bg-amber-500 text-white",
      lightCard: "bg-amber-50 border-amber-200 text-amber-950",
      lightIcon: "bg-amber-100 text-amber-700",
      lightLabel: "text-amber-800",
    },
    {
      label: "Cancelled Bookings",
      value: String(kpis.cancelledBookings),
      icon: CircleX,
      tone: "bg-rose-600 text-white",
      lightCard: "bg-rose-50 border-rose-200 text-rose-950",
      lightIcon: "bg-rose-100 text-rose-600",
      lightLabel: "text-rose-700",
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
    },
    {
      label: "Pending Refunds",
      value: String(kpis.pendingRefundCount),
      hint: inr(kpis.pendingRefundAmount),
      icon: RefreshCcw,
      tone: "bg-violet-600 text-white",
      lightCard: "bg-purple-50 border-purple-200 text-purple-950",
      lightIcon: "bg-purple-100 text-purple-600",
      lightLabel: "text-purple-700",
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 p-3 sm:p-5">
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
            {/* 1. Date Filter Dropdown on Right Top above top 6 cards */}
            <div className="flex items-center justify-end">
              <div className="flex items-center gap-1.5">
                <CalendarDays size={14} className="text-indigo-600 shrink-0" />
                <select
                  value={datePreset}
                  onChange={(e) => handlePresetSelect(e.target.value as DatePresetType)}
                  className="h-8.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-2xs outline-none focus:border-indigo-500"
                >
                  {DATE_PRESETS.map((preset) => (
                    <option key={preset.key} value={preset.key}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Date Pickers when Custom Range is active */}
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

            {/* 3. Search Bar */}
            <div className="relative">
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
          {/* DESKTOP VIEW (hidden md:block): Preserves existing table and desktop controls */}
          {/* ========================================================================= */}
          <div className="hidden md:block space-y-4">
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
              {cards.map((card) => (
                <article
                  key={card.label}
                  className="relative flex h-[4.5rem] min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm sm:h-auto sm:flex-row sm:items-center sm:gap-3 sm:rounded-2xl sm:p-4"
                >
                  <span className={`absolute inset-y-1.5 left-0 w-0.5 rounded-full sm:hidden ${card.tone}`} />
                  <div className="min-w-0 flex-1 pl-1.5 sm:pl-0">
                    <p className="line-clamp-2 text-[9px] font-semibold uppercase leading-tight tracking-wide text-slate-400 sm:truncate sm:text-xs sm:leading-normal">
                      {card.label}
                    </p>
                    <p className="mt-0.5 truncate text-xl font-bold leading-none text-slate-900 sm:mt-1 sm:text-2xl">
                      {card.value}
                    </p>
                    {card.hint ? (
                      <p className="mt-0.5 truncate text-[8px] font-medium leading-tight text-slate-500 sm:mt-1 sm:text-xs">
                        {card.hint}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl sm:flex ${card.tone}`}
                  >
                    <card.icon size={18} />
                  </span>
                </article>
              ))}
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="relative block min-w-0">
                    <Search
                      size={15}
                      className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                      }}
                      placeholder="Search bookings..."
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white pr-2 pl-8 sm:pl-9 text-xs sm:text-sm outline-none focus:border-indigo-500 focus:ring-indigo-100 placeholder:text-xs"
                    />
                  </label>

                  <select
                    value={bookingStatus}
                    onChange={(event) => {
                      setBookingStatus(event.target.value);
                      setPage(1);
                    }}
                    className="h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 outline-none focus:border-indigo-500 truncate"
                  >
                    <option value="">Booking status</option>
                    {BOOKING_STATUSES.filter(Boolean).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  <select
                    value={paymentStatus}
                    onChange={(event) => {
                      setPaymentStatus(event.target.value);
                      setPage(1);
                    }}
                    className="h-9 w-full min-w-0 rounded-lg sm:rounded-xl border border-slate-200 bg-white px-2 sm:px-4 text-xs sm:text-sm text-slate-600 sm:text-slate-700 outline-none transition focus:border-indigo-500 sm:focus:ring-2 sm:focus:ring-indigo-100 truncate"
                  >
                    <option value="">Payment status</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Paid">Paid</option>
                    <option value="Refund Pending">Refund Pending</option>
                    <option value="Refunded">Refunded</option>
                  </select>

                  <select
                    value={source}
                    onChange={(event) => {
                      setSource(event.target.value);
                      setPage(1);
                    }}
                    className="h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 outline-none focus:border-indigo-500 truncate"
                  >
                    <option value="">All booking types</option>
                    <option value="space">Space Booking</option>
                    <option value="full">Full Booking</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:gap-3">
                  <span className="shrink-0 text-xs font-semibold text-slate-600">
                    Custom Date Range
                  </span>

                  <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                    <input
                      type="date"
                      value={from}
                      onChange={(event) => {
                        setFrom(event.target.value);
                        setPage(1);
                      }}
                      aria-label="From date"
                      className="h-9 w-full rounded-lg border border-slate-200 px-2 text-xs text-slate-600 outline-none focus:border-indigo-500 sm:w-40"
                    />

                    <span className="hidden text-xs text-slate-400 sm:inline">
                      to
                    </span>

                    <input
                      type="date"
                      value={to}
                      onChange={(event) => {
                        setTo(event.target.value);
                        setPage(1);
                      }}
                      aria-label="To date"
                      className="h-9 w-full rounded-lg sm:rounded-xl border border-slate-200 px-2 sm:px-3 text-xs sm:text-sm sm:py-2.5 text-slate-600 outline-none focus:border-indigo-500 sm:w-40"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {error ? (
                <p className="px-4 py-3 text-sm text-rose-600">{error}</p>
              ) : null}
              <div className="overflow-x-auto">
                <table className="min-w-[1280px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      {[
                        ["bookingCode", "Booking ID"],
                        ["spaceName", "Space"],
                        ["customerName", "Customer"],
                        ["bookingDate", "Date"],
                        ["startTime", "Start"],
                        ["endTime", "End"],
                        ["duration", "Duration"],
                        ["grandTotal", "Total"],
                        ["paidAmount", "Paid"],
                        ["dueAmount", "Remaining"],
                      ].map(([key, label]) => (
                        <th key={key} className="px-3 py-3 font-semibold">
                          <button
                            type="button"
                            onClick={() => toggleSort(key)}
                            className="inline-flex items-center gap-1"
                          >
                            {label}
                            {sort === key ? (order === "asc" ? "↑" : "↓") : ""}
                          </button>
                        </th>
                      ))}
                      <th className="px-3 py-3 font-semibold">Contact</th>
                      <th className="px-3 py-3 font-semibold">Payment</th>
                      <th className="px-3 py-3 font-semibold">Status</th>
                      <th className="px-3 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={14}
                          className="px-4 py-10 text-center text-slate-500"
                        >
                          Loading bookings…
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={14}
                          className="px-4 py-10 text-center text-slate-500"
                        >
                          No bookings match these filters.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr
                          key={`${row.source}-${row.id}`}
                          className="border-t border-slate-100"
                        >
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() => setDetail(row)}
                              className="font-semibold text-indigo-700"
                            >
                              {row.bookingCode}
                            </button>
                            <span className="mt-0.5 block text-[11px] text-slate-400">
                              {row.source === "space" ? "Space" : "Full"}
                            </span>
                          </td>
                          <td className="px-3 py-3">{row.spaceName || "—"}</td>
                          <td className="px-3 py-3">{row.customerName || "—"}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {row.bookingDate || "—"}
                          </td>
                          <td className="px-3 py-3">{row.startTime || "—"}</td>
                          <td className="px-3 py-3">{row.endTime || "—"}</td>
                          <td className="px-3 py-3">{row.duration || "—"}</td>
                          <td className="px-3 py-3 font-semibold">
                            {inr(row.grandTotal)}
                          </td>
                          <td className="px-3 py-3">{inr(row.paidAmount)}</td>
                          <td className="px-3 py-3">{inr(row.dueAmount)}</td>
                          <td className="px-3 py-3">
                            {row.customerPhone || "—"}
                          </td>
                          <td className="px-3 py-3">
                            <Badge value={row.paymentStatus} />
                          </td>
                          <td className="px-3 py-3">
                            <Badge value={row.bookingStatus} />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex gap-2">
                              {row.canCancel && canUpdate ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCancelTarget(row);
                                    setCancelReason("");
                                  }}
                                  className="rounded-lg bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"
                                >
                                  Cancel
                                </button>
                              ) : null}
                              {row.canRefund && canUpdate ? (
                                <button
                                  type="button"
                                  onClick={() => openRefund(row)}
                                  className="rounded-lg bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700"
                                >
                                  Refund
                                </button>
                              ) : null}
                              {!row.canCancel && !row.canRefund ? (
                                <button
                                  type="button"
                                  onClick={() => setDetail(row)}
                                  className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"
                                >
                                  Details
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                <span>{total} bookings</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span>
                    {page} / {pages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= pages}
                    onClick={() => setPage((current) => current + 1)}
                    className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
                  >
                    Next
                  </button>
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

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeIndianRupee,
  CalendarCheck,
  CalendarClock,
  CircleX,
  RefreshCcw,
  Search,
  Settings2,
  Wallet,
} from "lucide-react";
import Swal from "sweetalert2";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermission } from "@/hooks/usePermission";
import {
  handleCancelOverviewBooking,
  handleGetBookingOverview,
  handleGetBookingPaymentSettings,
  handleUpdateBookingPaymentSettings,
  handleUpdateOverviewRefund,
  type BookingOverviewRow,
  type BookingPaymentSettings,
} from "@/services/apiClient";
import { previewBookingPayment } from "./paymentRule";

const BOOKING_STATUSES = ["", "Upcoming", "Ongoing", "Expired", "Cancelled", "Draft"];
const PAYMENT_STATUS = [
 
  "Unpaid",
  "Partially Paid",
  "Paid",
  "Refund Pending",
  "Partially Refunded",
  "Refunded",
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
  if (status === "Paid" || status === "Refunded" || status === "Upcoming" || status === "Ongoing") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (status === "Partially Paid" || status === "Partially Refunded" || status === "Pending" || status === "Processing" || status === "Expired" || status === "Draft") {
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
  pendingRefundCount: number;
  pendingRefundAmount: number;
};

const emptyKpis: Kpis = {
  totalBookings: 0,
  confirmedBookings: 0,
  pendingBookings: 0,
  cancelledBookings: 0,
  totalRevenue: 0,
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

function Badge({ value }: { value: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClass(value)}`}>
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
  const [cancelTarget, setCancelTarget] = useState<BookingOverviewRow | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [refundTarget, setRefundTarget] = useState<BookingOverviewRow | null>(null);
  const [detail, setDetail] = useState<BookingOverviewRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<BookingPaymentSettings>(defaultSettings);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [refundForm, setRefundForm] = useState({
    status: "Pending",
    amount: "",
    method: "Cash",
    paymentReference: "",
    note: "",
  });

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
      setKpis(data.kpis || emptyKpis);
      setRows(data.bookings || []);
      setPages(data.pagination?.pages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Could not load bookings.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [search, bookingStatus, paymentStatus, source, from, to,  sort, order, page]);

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

  const preview = useMemo(() => previewBookingPayment(5000, settings), [settings]);

  const toggleSort = (key: string) => {
    setPage(1);
    if (sort === key) setOrder((current) => (current === "asc" ? "desc" : "asc"));
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
      await Swal.fire({ icon: "success", title: "Settings saved", timer: 1400, showConfirmButton: false });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Could not save settings.";
      await Swal.fire("Could not save", message, "error");
    } finally {
      setSaving(false);
    }
  };

  const submitCancel = async () => {
    if (!cancelTarget) return;
    try {
      setSaving(true);
      await handleCancelOverviewBooking(cancelTarget.source, cancelTarget.id, cancelReason.trim());
      setCancelTarget(null);
      setCancelReason("");
      await load();
      await Swal.fire({ icon: "success", title: "Booking cancelled", timer: 1400, showConfirmButton: false });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Could not cancel the booking.";
      await Swal.fire("Cancellation failed", message, "error");
    } finally {
      setSaving(false);
    }
  };

  const openRefund = (row: BookingOverviewRow) => {
    setRefundTarget(row);
    setRefundForm({
      status: row.refund?.status && row.refund.status !== "Completed" ? row.refund.status : "Processing",
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
      setRefundTarget(null);
      await load();
      await Swal.fire({ icon: "success", title: "Refund updated", timer: 1400, showConfirmButton: false });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Could not update the refund.";
      await Swal.fire("Refund failed", message, "error");
    } finally {
      setSaving(false);
    }
  };

  const cards = [
    { label: "Total Bookings", value: String(kpis.totalBookings), hint: "Space and full bookings", icon: CalendarCheck, tone: "bg-slate-900 text-white" },
    { label: "Confirmed Bookings", value: String(kpis.confirmedBookings), hint: "Not draft or cancelled", icon: CalendarClock, tone: "bg-emerald-600 text-white" },
    { label: "Pending Bookings", value: String(kpis.pendingBookings), hint: "Awaiting confirmation or payment", icon: Wallet, tone: "bg-amber-500 text-white" },
    { label: "Cancelled Bookings", value: String(kpis.cancelledBookings), hint: "Marked cancelled", icon: CircleX, tone: "bg-rose-600 text-white" },
    { label: "Total Booking Revenue", value: inr(kpis.totalRevenue), hint: "Confirmed booking totals", icon: BadgeIndianRupee, tone: "bg-indigo-600 text-white" },
    { label: "Pending Refunds", value: String(kpis.pendingRefundCount), hint: inr(kpis.pendingRefundAmount), icon: RefreshCcw, tone: "bg-violet-600 text-white" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 p-3 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Booking Overview</h1>
          <p className="mt-1 text-sm text-slate-500">
            Space bookings and full bookings, with payments, cancellations, and refunds.
          </p>
        </div>
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button type="button" onClick={() => setTab("overview")} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === "overview" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
            Overview
          </button>
          <button type="button" onClick={() => setTab("settings")} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === "settings" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
            <Settings2 size={15} /> Settings
          </button>
        </div>
      </div>

      {tab === "settings" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Enable Partial Payment</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            This setting controls checkout for both Space Booking and Full Booking. POS billing is unchanged.
          </p>
          {settingsLoading ? <p className="mt-6 text-sm text-slate-500">Loading settings…</p> : (
            <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-5">
                <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">Enable Partial Payment</span>
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
                    onClick={() => setSettings((current) => ({ ...current, enablePartialPayment: !current.enablePartialPayment }))}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${settings.enablePartialPayment ? "bg-emerald-500" : "bg-slate-300"} disabled:opacity-60`}
                  >
                    <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${settings.enablePartialPayment ? "left-5" : "left-0.5"}`} />
                  </button>
                </label>

                {settings.enablePartialPayment ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="mb-1 block font-semibold text-slate-700">Minimum Payment Type</span>
                      <select
                        disabled={!canUpdate}
                        value={settings.minimumPaymentType}
                        onChange={(event) => setSettings((current) => ({
                          ...current,
                          minimumPaymentType: event.target.value as BookingPaymentSettings["minimumPaymentType"],
                        }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-500"
                      >
                        <option value="percentage">Percentage</option>
                        <option value="fixed">Fixed Amount</option>
                      </select>
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block font-semibold text-slate-700">
                        Minimum Payment Value {settings.minimumPaymentType === "percentage" ? "(%)" : "(₹)"}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={settings.minimumPaymentType === "percentage" ? 100 : undefined}
                        disabled={!canUpdate}
                        value={settings.minimumPaymentValue}
                        onChange={(event) => setSettings((current) => ({
                          ...current,
                          minimumPaymentValue: Number(event.target.value) || 0,
                        }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-500"
                      />
                    </label>
                  </div>
                ) : null}

                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">Payment Instructions</span>
                  <textarea
                    disabled={!canUpdate}
                    value={settings.paymentInstructions}
                    onChange={(event) => setSettings((current) => ({ ...current, paymentInstructions: event.target.value }))}
                    rows={3}
                    maxLength={500}
                    placeholder="Shown on the booking checkout page"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-500"
                  />
                </label>

                <label className="block max-w-xs text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">Cancellation refund (%)</span>
                  <span className="mb-1 block text-xs text-slate-500">Percent of the amount already paid that becomes refundable.</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    disabled={!canUpdate}
                    value={settings.refundPercent}
                    onChange={(event) => setSettings((current) => ({ ...current, refundPercent: Number(event.target.value) || 0 }))}
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
                  <p className="text-xs text-slate-500">You can view these settings. Updating them needs booking edit access.</p>
                )}
              </div>

              <aside className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Checkout preview</p>
                <p className="mt-3 text-sm text-slate-600">Sample total booking price</p>
                <p className="text-2xl font-bold text-slate-900">{inr(preview.total)}</p>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span>Amount payable now</span><span className="font-bold">{inr(preview.payable)}</span></div>
                  <div className="flex justify-between"><span>Remaining balance</span><span className="font-bold text-amber-700">{inr(preview.balance)}</span></div>
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
          <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <article
                key={card.label}
                className="flex items-center justify-between rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-4 shadow-sm"
              >
                <div className="min-w-0 pr-1">
                  <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-slate-400 truncate">
                    {card.label}
                  </p>
                  <p className="mt-0.5 sm:mt-1 text-base sm:text-2xl font-bold text-slate-900 truncate">
                    {card.value}
                  </p>
                  <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-slate-500 truncate">
                    {card.hint}
                  </p>
                </div>
                <span
                  className={`flex h-8 w-8 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl ${card.tone}`}
                >
                  <card.icon size={16} className="sm:hidden" />
                  <card.icon size={18} className="hidden sm:block" />
                </span>
              </article>
            ))}
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="space-y-3">

              {/* row 1  */}

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <label className="relative block min-w-0">
                <Search 
                size={15} 
                className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400" 
                />
                <input
                  value={search}
                  onChange={(event) => {
                     setSearch(event.target.value); setPage(1); 
                    }}
                  placeholder="Search bookings..."

                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pr-2 pl-8 sm:pl-9 text-xs sm:text-sm outline-none focus:border-indigo-500 focus:ring-indigo-100 placeholder:text-xs"
                />
              </label>

{/* booking status */}
              <select 
              value={bookingStatus} 
              onChange={(event) => {
                 setBookingStatus(event.target.value);
                  setPage(1); 
                  }}
                className="h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 outline-none focus:border-indigo-500 truncate">
                <option value="">Booking status</option>
                {BOOKING_STATUSES.filter(Boolean).map((status) => 
                <option key={status} value={status}>{status}</option>)}
              </select>
              

              <select value={paymentStatus}
              onChange ={(event)=>{
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

             {/* { booking type} */}
              <select 
              value={source}
               onChange={(event) => {
                 setSource(event.target.value); 
                 setPage(1); }} 
                 className="h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 outline-none focus:border-indigo-500 truncate">
                <option value="">All booking types</option>
                <option value="space">Space Booking</option>
                <option value="full">Full Booking</option>
              </select>


              {/* <input value={spaceName} onChange={(event) => { setSpaceName(event.target.value); setPage(1); }} placeholder="Space name" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              <input value={customerName} onChange={(event) => { setCustomerName(event.target.value); setPage(1); }} placeholder="Customer name" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              <input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              <input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /> */}
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
                onChange={(event) => { setTo(event.target.value); setPage(1); }}
                aria-label="To date"
                className="h-9 w-full rounded-lg sm:rounded-xl border border-slate-200 px-2 sm:px-3 text-xs sm:text-sm sm:py-2.5 text-slate-600 outline-none focus:border-indigo-500 sm:w-40"
              />
              </div>
       

            </div>



            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {error ? <p className="px-4 py-3 text-sm text-rose-600">{error}</p> : null}
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
                        <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1">
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
                    <tr><td colSpan={14} className="px-4 py-10 text-center text-slate-500">Loading bookings…</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={14} className="px-4 py-10 text-center text-slate-500">No bookings match these filters.</td></tr>
                  ) : rows.map((row) => (
                    <tr key={`${row.source}-${row.id}`} className="border-t border-slate-100">
                      <td className="px-3 py-3">
                        <button type="button" onClick={() => setDetail(row)} className="font-semibold text-indigo-700">{row.bookingCode}</button>
                        <span className="mt-0.5 block text-[11px] text-slate-400">{row.source === "space" ? "Space" : "Full"}</span>
                      </td>
                      <td className="px-3 py-3">{row.spaceName || "—"}</td>
                      <td className="px-3 py-3">{row.customerName || "—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{row.bookingDate || "—"}</td>
                      <td className="px-3 py-3">{row.startTime || "—"}</td>
                      <td className="px-3 py-3">{row.endTime || "—"}</td>
                      <td className="px-3 py-3">{row.duration || "—"}</td>
                      <td className="px-3 py-3 font-semibold">{inr(row.grandTotal)}</td>
                      <td className="px-3 py-3">{inr(row.paidAmount)}</td>
                      <td className="px-3 py-3">{inr(row.dueAmount)}</td>
                      <td className="px-3 py-3">{row.customerPhone || "—"}</td>
                      <td className="px-3 py-3"><Badge value={row.paymentStatus} /></td>
                      <td className="px-3 py-3"><Badge value={row.bookingStatus} /></td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          {row.canCancel && canUpdate ? (
                            <button type="button" onClick={() => { setCancelTarget(row); setCancelReason(""); }} className="rounded-lg bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">Cancel</button>
                          ) : null}
                          {row.canRefund && canUpdate ? (
                            <button type="button" onClick={() => openRefund(row)} className="rounded-lg bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">Refund</button>
                          ) : null}
                          {!row.canCancel && !row.canRefund ? (
                            <button type="button" onClick={() => setDetail(row)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">Details</button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
              <span>{total} bookings</span>
              <div className="flex items-center gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40">Previous</button>
                <span>{page} / {pages}</span>
                <button type="button" disabled={page >= pages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40">Next</button>
              </div>
            </div>
          </section>
        </>
      )}

      {cancelTarget ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/30 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Cancel booking</h3>
            <p className="mt-1 text-sm text-slate-500">
              {cancelTarget.bookingCode} · {cancelTarget.customerName}. The refundable amount follows the saved refund percent of the amount already paid.
            </p>
            <textarea
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              rows={3}
              placeholder="Cancellation reason"
              className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-400"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setCancelTarget(null)} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600">Keep booking</button>
              <button type="button" disabled={saving || !cancelReason.trim()} onClick={() => void submitCancel()} className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
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
              Refundable {inr(refundTarget.refund?.refundableAmount || 0)}. A completed refund cannot be processed again.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-semibold">Status</span>
                <select value={refundForm.status} onChange={(event) => setRefundForm((current) => ({ ...current, status: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2">
                  {REFUND_STATUSES.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold">Amount</span>
                <input type="number" min={0} value={refundForm.amount} onChange={(event) => setRefundForm((current) => ({ ...current, amount: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold">Method</span>
                <select value={refundForm.method} onChange={(event) => setRefundForm((current) => ({ ...current, method: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2">
                  {["Cash", "UPI", "Card", "Wallet", "Bank transfer"].map((method) => <option key={method}>{method}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold">Payment reference</span>
                <input value={refundForm.paymentReference} onChange={(event) => setRefundForm((current) => ({ ...current, paymentReference: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
              </label>
            </div>
            <textarea value={refundForm.note} onChange={(event) => setRefundForm((current) => ({ ...current, note: event.target.value }))} rows={2} placeholder="Note" className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setRefundTarget(null)} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600">Close</button>
              <button type="button" disabled={saving} onClick={() => void submitRefund()} className="rounded-xl bg-violet-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
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
                <h3 className="text-lg font-bold text-slate-900">{detail.bookingCode}</h3>
                <p className="text-sm text-slate-500">{detail.customerName} · {detail.customerPhone}</p>
              </div>
              <button type="button" onClick={() => setDetail(null)} className="text-sm font-semibold text-slate-500">Close</button>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <p>Refundable: <span className="font-semibold">{inr(detail.refund?.refundableAmount || 0)}</span></p>
              <p>Refund status: <Badge value={detail.refund?.status || "—"} /></p>
              <p>Refund amount: {inr(detail.refund?.amount || 0)}</p>
              <p>Refund date: {when(detail.refund?.refundedAt)}</p>
              <p>Method: {detail.refund?.method || "—"}</p>
              <p>Reference: {detail.refund?.paymentReference || "—"}</p>
            </div>
            <h4 className="mt-5 text-sm font-bold text-slate-900">Cancellation history</h4>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              {(detail.cancellationHistory || []).length === 0 ? <li>No cancellation recorded.</li> : detail.cancellationHistory?.map((entry, index) => (
                <li key={index} className="rounded-xl bg-slate-50 px-3 py-2">
                  <span className="font-semibold text-slate-800">{entry.reason || "Cancelled"}</span>
                  <span className="mt-0.5 block text-xs">{when(entry.cancelledAt)} · {entry.cancelledBy?.m_staff_name || "Staff"}</span>
                </li>
              ))}
            </ul>
            <h4 className="mt-5 text-sm font-bold text-slate-900">Refund history</h4>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              {(detail.refund?.history || []).length === 0 ? <li>No refund updates yet.</li> : detail.refund?.history?.map((entry, index) => (
                <li key={index} className="rounded-xl bg-slate-50 px-3 py-2">
                  <span className="font-semibold text-slate-800">{entry.status} · {inr(entry.amount || 0)}</span>
                  <span className="mt-0.5 block text-xs">
                    {when(entry.at)} · {entry.by?.m_staff_name || "Staff"}
                    {entry.method ? ` · ${entry.method}` : ""}
                    {entry.paymentReference ? ` · ${entry.paymentReference}` : ""}
                  </span>
                  {entry.note ? <span className="mt-1 block">{entry.note}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

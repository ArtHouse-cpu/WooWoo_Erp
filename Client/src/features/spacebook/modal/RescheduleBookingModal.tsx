import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Building2,
  Calendar,
  CalendarClock,
  Check,
  Clock,
  Crown,
  Hash,
  IndianRupee,
  Info,
  Loader2,
  User,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import {
  handleQuoteSpaceReschedule,
  handleReceiveSpaceBookingPayment,
  handleRescheduleSpaceBooking,
  type SpaceBookingPayload,
  type SpaceRescheduleQuote,
} from "@/services/apiClient";
import { useSpaceAvailability, useBusinessNow } from "../hooks/useSpaceAvailability";
import { getSlotAvailability, timeToMinutes } from "../utils/bookingAvailability";

type View = "reschedule" | "payment" | "history";

type Props = {
  booking: SpaceBookingPayload;
  view: View;
  onClose: () => void;
  onSaved: () => void;
  onPay?: (quote: SpaceRescheduleQuote) => void;
};

function hoursBetween(start?: string, end?: string) {
  const from = timeToMinutes(start);
  const to = timeToMinutes(end);
  if (from == null || to == null || to <= from) return 1;
  return Math.max(1, Math.round((to - from) / 60));
}

function plusHours(start: string, hours: number) {
  const from = timeToMinutes(start);
  if (from == null) return "";
  const total = from + hours * 60;
  if (total > 24 * 60) return "";
  if (total === 24 * 60) return "24:00";
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const inr = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function dateInput(value?: string) {
  if (!value) return "";
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function displayDate(value?: string) {
  const key = dateInput(value);
  if (!key) return "—";
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ymd(value: Date) {
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

function parseYmd(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12);
}

function isWeekendDate(value: string) {
  const day = parseYmd(value).getDay();
  return day === 0 || day === 6;
}

function matchesDayType(value: string, type: "Weekday" | "Weekend") {
  if (!value) return false;
  return type === "Weekend" ? isWeekendDate(value) : !isWeekendDate(value);
}

function nearestUpcoming(type: "Weekday" | "Weekend") {
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  for (let step = 0; step < 14; step += 1) {
    const key = ymd(cursor);
    if (matchesDayType(key, type)) return key;
    cursor.setDate(cursor.getDate() + 1);
  }
  return ymd(cursor);
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function ScheduleDateField({
  value,
  dayType,
  onChange,
}: {
  value: string;
  dayType: "Weekday" | "Weekend";
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const selected = value ? parseYmd(value) : new Date();
  const [cursor, setCursor] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1),
  );

  useEffect(() => {
    if (!open || !value) return;
    const parsed = parseYmd(value);
    setCursor(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const lead = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: lead }, () => ""),
    ...Array.from({ length: days }, (_, index) =>
      ymd(new Date(year, month, index + 1, 12)),
    ),
  ];

  return (
    <div ref={boxRef} className="relative mt-2">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm text-slate-800 outline-none focus:border-violet-500"
      >
        <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="min-w-0 flex-1 truncate">{displayDate(value)}</span>
      </button>
      <p className="mt-1 text-[11px] font-medium text-slate-400">
        {dayType === "Weekend" ? "Saturday and Sunday only" : "Monday to Friday only"}
      </p>
      {open ? (
        <div className="absolute z-30 mt-1 w-[17.5rem] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
              aria-label="Previous month"
            >
              ‹
            </button>
            <p className="text-sm font-semibold text-slate-800">
              {cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </p>
            <button
              type="button"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
              aria-label="Next month"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400">
            {WEEKDAYS.map((label) => (
              <span key={label} className="py-1">{label}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((key, index) => {
              if (!key) return <span key={`empty-${index}`} />;
              const allowed = matchesDayType(key, dayType);
              const active = key === value;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!allowed}
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  className={`h-8 rounded-lg text-xs font-semibold ${
                    active
                      ? "bg-violet-600 text-white"
                      : allowed
                        ? "text-slate-700 hover:bg-violet-50"
                        : "cursor-not-allowed text-slate-300"
                  }`}
                >
                  {Number(key.slice(-2))}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const WALLET_TYPES = [
  { id: "nonWithdrawable", label: "Non-withdrawable" },
  { id: "withdrawable", label: "Withdrawable" },
];

export default function RescheduleBookingModal({
  booking,
  view,
  onClose,
  onSaved,
  onPay,
}: Props) {
  const id = String(booking._id || booking.id || "");
  const initialDay = /weekend/i.test(String(booking.spaceDay || "")) ? "Weekend" : "Weekday";
  const [date, setDate] = useState(dateInput(booking.bookingDate));
  const [dayType, setDayType] = useState<"Weekday" | "Weekend">(initialDay);
  const [duration, setDuration] = useState(() =>
    Math.min(6, Math.max(1, hoursBetween(booking.startTime, booking.endTime))),
  );
  const [start, setStart] = useState(booking.startTime || "09:00");
  const end = plusHours(start, duration);
  const [quote, setQuote] = useState<SpaceRescheduleQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payMode, setPayMode] = useState("UPI");
  const [refundMode, setRefundMode] = useState("Wallet");
  const [walletType, setWalletType] = useState("nonWithdrawable");
  const [pendingAmount, setPendingAmount] = useState(
    String(Number(booking.dueAmount || 0) || ""),
  );

  useEffect(() => {
    if (view !== "reschedule" || !date || !start || !end || end <= start) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoting(true);
    handleQuoteSpaceReschedule(id, {
      bookingDate: date,
      startTime: start,
      endTime: end,
      dayType,
    })
      .then((res) => {
        if (cancelled) return;
        setQuote(res.quote || null);
      })
      .catch((error: { response?: { data?: { message?: string } } }) => {
        if (!cancelled) {
          setQuote(null);
          toast.error(error?.response?.data?.message || "Could not price this slot.");
        }
      })
      .finally(() => {
        if (!cancelled) setQuoting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, dayType, end, id, start, view]);

  const now = useBusinessNow(view === "reschedule");
  const availability = useSpaceAvailability({
    spaceId: String(booking.spaceId || ""),
    from: date,
    to: date,
    excludeId: id,
    enabled: view === "reschedule" && Boolean(date),
  });
  const openSlots: { slotStart: string; slotEnd: string; status: "available" | "booked" | "unavailable" }[] = [];
  for (let hour = 6; hour < 24; hour += 1) {
    const slotStart = `${String(hour).padStart(2, "0")}:00`;
    const slotEnd = plusHours(slotStart, duration);
    if (!slotEnd) continue;
    openSlots.push({
      slotStart,
      slotEnd,
      status: getSlotAvailability(
        date,
        slotStart,
        slotEnd,
        availability.data?.busy || [],
        now,
      ),
    });
  }

  const confirmReschedule = async () => {
    if (!quote) return;
    const result = await Swal.fire({
      title: "Reschedule this booking?",
      text: "The same booking will move to the new date and time.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Reschedule",
    });
    if (!result.isConfirmed) return;
    setSaving(true);
    try {
      await handleRescheduleSpaceBooking(id, {
        bookingDate: date,
        startTime: start,
        endTime: end,
        dayType,
        refund: quote.refundable > 0 ? { mode: refundMode, walletType } : null,
      });
      toast.success("Booking rescheduled.");
      onSaved();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || "Could not reschedule.");
    } finally {
      setSaving(false);
    }
  };

  const confirmPayment = async () => {
    const amount = Number(pendingAmount);
    if (!(amount > 0)) {
      toast.error("Enter the amount to collect.");
      return;
    }
    const result = await Swal.fire({
      title: "Receive payment?",
      text: `Record ${inr(amount)} by ${payMode}.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Receive",
    });
    if (!result.isConfirmed) return;
    setSaving(true);
    try {
      await handleReceiveSpaceBookingPayment(id, {
        amount,
        mode: payMode,
        walletType,
      });
      toast.success("Payment recorded.");
      onSaved();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || "Could not record payment.");
    } finally {
      setSaving(false);
    }
  };

  const paid = Number(booking.paidAmount || 0);
  const due = Number(booking.dueAmount || 0);
  const total = Number(booking.grandTotal || booking.lineTotal || 0);
  const original = Number(booking.originalAmount || total);
  const refunded = (booking.payments || [])
    .filter((row) => row.kind === "refund")
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const statusLabel =
    due <= 0.009 && refunded > 0
      ? "Refunded"
      : due <= 0.009
        ? "Paid"
        : paid > 0
          ? "Partially Paid"
          : "Pending";

  const sameSchedule =
    Boolean(quote) && quote!.difference === 0 && quote!.currentDay === quote!.newDay;
  const customerLine = `${quote?.customerName || booking.customerName || "Customer"}${
    quote?.customerPhone || booking.customerPhone
      ? ` – ${quote?.customerPhone || booking.customerPhone}`
      : ""
  }`;
  const membershipLine = `${quote?.membershipLabel || quote?.membershipType || "General"}${
    quote?.membershipPercent ? ` – ${quote.membershipPercent}% space` : ""
  }`;
  const clockLabel = (value?: string) => {
    if (!value) return "";
    const [hStr, mStr = "00"] = value.split(":");
    let hour = Number(hStr);
    if (hour === 24) hour = 0;
    const period = hour >= 12 ? "PM" : "AM";
    const display = hour % 12 === 0 ? 12 : hour % 12;
    return `${String(display).padStart(2, "0")}:${mStr} ${period}`;
  };
  const timeLabel = (from?: string, to?: string) =>
    from && to ? `${clockLabel(from)} – ${clockLabel(to)}` : "—";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
      <div
        className={`flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${
          view === "reschedule" ? "max-w-5xl" : "max-w-lg"
        }`}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {view === "payment"
                  ? "Receive pending payment"
                  : view === "history"
                    ? "Payment history"
                    : "Reschedule Booking"}
              </h2>
              {view === "reschedule" ? (
                <p className="text-sm text-slate-500">
                  Change the date, time, or duration for this booking
                </p>
              ) : null}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 pb-4 sm:px-6">
          {view === "history" ? (
            <History booking={booking} />
          ) : view === "payment" ? (
            <div className="space-y-3">
              <MoneyCard original={original} total={total} paid={paid} refunded={refunded} due={due} />
              <label className="block text-xs font-medium text-slate-600">
                Amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pendingAmount}
                  onChange={(event) => setPendingAmount(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </label>
              <PayModes mode={payMode} setMode={setPayMode} walletType={walletType} setWalletType={setWalletType} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 p-3 sm:grid-cols-4">
                <Meta icon={Hash} label="Booking ID" value={id.slice(-6).toUpperCase()} />
                <Meta icon={User} label="Customer" value={booking.customerName || "—"} />
                <Meta icon={Building2} label="Space" value={booking.spaceName || "Space"} />
                <Meta icon={BadgeCheck} label="Status" value={statusLabel} accent={statusLabel === "Paid"} />
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <section className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                    <IndianRupee className="h-4 w-4 text-violet-600" />
                    Payment Details
                  </h3>
                  <MoneyRows original={original} total={total} paid={paid} refunded={refunded} due={due} />
                </section>
                <section className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Calendar className="h-4 w-4 text-violet-600" />
                    Current Booking
                  </h3>
                  <div className="space-y-2.5 text-sm">
                    <Fact icon={Calendar} label="Date" value={displayDate(booking.bookingDate)} />
                    <Fact icon={Clock} label="Time" value={timeLabel(booking.startTime, booking.endTime)} />
                    <Fact icon={Calendar} label="Type" value={booking.spaceDay || "—"} />
                    <Fact icon={IndianRupee} label="Price" value={inr(total)} />
                  </div>
                </section>
              </div>

              <section className="rounded-2xl border border-slate-200 p-4">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                    <Calendar className="h-3.5 w-3.5" />
                  </span>
                  Select New Schedule
                </h3>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Type for this Space</p>
                    <div className="mt-2 flex gap-2">
                      {(["Weekday", "Weekend"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setDayType(type);
                            setDate((current) =>
                              matchesDayType(current, type) ? current : nearestUpcoming(type),
                            );
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-semibold ${
                            dayType === type
                              ? "border-violet-600 bg-violet-600 text-white"
                              : "border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          <Calendar className="h-4 w-4" />
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="block text-sm font-semibold text-slate-800">
                    New Date <span className="text-rose-500">*</span>
                    <ScheduleDateField value={date} dayType={dayType} onChange={setDate} />
                  </label>
                </div>

                <label className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-800">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-slate-500" />
                    Hours (Duration)
                  </span>
                  <select
                    value={duration}
                    onChange={(event) => setDuration(Number(event.target.value))}
                    className="h-9 w-32 rounded-xl border border-slate-200 px-2 text-sm font-medium outline-none focus:border-violet-500"
                  >
                    {[1, 2, 3, 4, 5, 6].map((hour) => (
                      <option key={hour} value={hour}>{hour} hour{hour > 1 ? "s" : ""}</option>
                    ))}
                  </select>
                </label>

                <div className="mt-4">
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <Clock className="h-4 w-4 text-slate-500" />
                    Available Time Slots
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    {availability.loading ? (
                      <p className="col-span-full text-xs text-slate-400">Checking availability…</p>
                    ) : (
                      openSlots.map((slot) => {
                        const selected = start === slot.slotStart && slot.status === "available";
                        return (
                          <button
                            key={slot.slotStart}
                            type="button"
                            disabled={slot.status !== "available"}
                            onClick={() => setStart(slot.slotStart)}
                            className={`inline-flex items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-semibold ${
                              selected
                                ? "border-violet-600 bg-violet-50 text-violet-700"
                                : slot.status === "available"
                                  ? "border-slate-200 bg-white text-slate-700"
                                  : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                            }`}
                          >
                            {timeLabel(slot.slotStart, slot.slotEnd)}
                            {selected ? <Check className="h-3.5 w-3.5" /> : null}
                          </button>
                        );
                      })
                    )}
                  </div>
                  {!availability.loading && openSlots.every((slot) => slot.status !== "available") ? (
                    <p className="mt-2 text-xs text-slate-500">No open slot for these hours.</p>
                  ) : null}
                </div>
              </section>

              <section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-violet-700">
                  <Info className="h-4 w-4" />
                  Reschedule Summary
                </h3>
                {quoting ? (
                  <p className="text-sm text-slate-500">Calculating price…</p>
                ) : quote ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2 text-sm text-slate-700">
                      <p className="flex items-start gap-2">
                        <User className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                        Customer: {customerLine}
                      </p>
                      <p className="flex items-start gap-2">
                        <Crown className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                        Membership: {membershipLine}
                      </p>
                      {quote.membershipDiscount ? (
                        <p className="flex items-start gap-2">
                          <IndianRupee className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                          Membership discount: {inr(quote.membershipDiscount)}
                        </p>
                      ) : null}
                      <p className="flex items-start gap-2">
                        <IndianRupee className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                        Price: {inr(quote.newAmount)}
                        {sameSchedule ? " (same as original)" : ""}
                      </p>
                      <p className="flex items-start gap-2 font-semibold text-slate-900">
                        <IndianRupee className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                        New Booking Amount: {inr(quote.newAmount)}
                      </p>
                    </div>
                    <div className="space-y-2 text-sm text-slate-700">
                      <CheckLine
                        text={
                          sameSchedule
                            ? `Same ${quote.newDay} and ${quote.hours} hour${quote.hours > 1 ? "s" : ""} duration`
                            : `${quote.newDay} · ${quote.hours}h × ${inr(quote.hourlyRate)}`
                        }
                      />
                      {quote.additionalDue > 0 ? (
                        <CheckLine text={`Extra to collect: ${inr(quote.additionalDue)}`} warn />
                      ) : quote.refundable > 0 ? (
                        <CheckLine text={`Amount to settle: ${inr(quote.refundable)}`} />
                      ) : (
                        <CheckLine text="No additional amount will be charged" />
                      )}
                      {quote.additionalDue > 0 ? (
                        <CheckLine text="Collect the extra amount before confirming" warn />
                      ) : (
                        <CheckLine text="This booking can be rescheduled directly" />
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Choose a date and an open time slot.</p>
                )}

                {quote && quote.additionalDue > 0 ? (
                  <button
                    type="button"
                    onClick={() => onPay?.(quote)}
                    className="mt-4 w-full rounded-xl bg-[#ff5a36] px-3 py-2.5 text-sm font-semibold text-white"
                  >
                    Pay {inr(quote.additionalDue)}
                  </button>
                ) : null}
                {quote && quote.refundable > 0 ? (
                  <label className="mt-4 block text-sm font-medium text-slate-700">
                    Amount settlement
                    <select
                      value={refundMode}
                      onChange={(event) => setRefundMode(event.target.value)}
                      className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    >
                      <option value="Wallet">Wallet</option>
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash</option>
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
                      Settle {inr(quote.refundable)} by {refundMode}.
                    </p>
                    {refundMode === "Wallet" ? (
                      <div className="mt-2">
                        <WalletSelect value={walletType} onChange={setWalletType} />
                      </div>
                    ) : null}
                  </label>
                ) : null}
              </section>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3 sm:px-6">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">
            Close
          </button>
          {view === "reschedule" ? (
            <button
              type="button"
              disabled={!quote || quoting || saving || quote.additionalDue > 0}
              onClick={() => void confirmReschedule()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
              Confirm Reschedule
            </button>
          ) : null}
          {view === "payment" ? (
            <button
              type="button"
              disabled={saving || due <= 0}
              onClick={() => void confirmPayment()}
              className="inline-flex items-center gap-1 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Receive payment
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Hash;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${accent ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className={`truncate text-sm font-bold ${accent ? "text-emerald-600" : "text-slate-900"}`}>{value}</p>
      </div>
    </div>
  );
}

function MoneyRows({
  original,
  total,
  paid,
  refunded,
  due,
}: {
  original: number;
  total: number;
  paid: number;
  refunded: number;
  due: number;
}) {
  const rows = [
    ["Original amount", inr(original), ""],
    ["Current amount", inr(total), ""],
    ["Paid", inr(paid), "text-emerald-600"],
    ["Refund / wallet adjustment", inr(refunded), ""],
    ["Pending", inr(due), ""],
  ] as const;
  return (
    <div className="space-y-2 text-sm">
      {rows.map(([label, value, tone]) => (
        <div key={label} className="flex items-center justify-between gap-3">
          <span className="text-slate-600">{label}</span>
          <span className={`font-semibold text-slate-900 ${tone}`}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function MoneyCard(props: {
  original: number;
  total: number;
  paid: number;
  refunded: number;
  due: number;
}) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
      <MoneyRows {...props} />
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2 text-slate-600">
        <Icon className="h-4 w-4 text-slate-400" />
        {label}
      </span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function CheckLine({ text, warn }: { text: string; warn?: boolean }) {
  return (
    <p className={`flex items-start gap-2 ${warn ? "text-amber-700" : "text-slate-700"}`}>
      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${warn ? "text-amber-500" : "text-emerald-500"}`} />
      {text}
    </p>
  );
}

function WalletSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs"
    >
      {WALLET_TYPES.map((item) => (
        <option key={item.id} value={item.id}>{item.label}</option>
      ))}
    </select>
  );
}

function PayModes({
  mode,
  setMode,
  walletType,
  setWalletType,
}: {
  mode: string;
  setMode: (value: string) => void;
  walletType: string;
  setWalletType: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {["Cash", "UPI", "Wallet"].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setMode(item)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${mode === item ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200"}`}
          >
            {item}
          </button>
        ))}
      </div>
      {mode === "Wallet" ? <WalletSelect value={walletType} onChange={setWalletType} /> : null}
    </div>
  );
}

function History({ booking }: { booking: SpaceBookingPayload }) {
  const payments = booking.payments || [];
  const moves = booking.reschedules || [];
  if (!payments.length && !moves.length) {
    return <p className="text-xs text-slate-500">No payment or reschedule history yet.</p>;
  }
  return (
    <div className="space-y-2 text-xs">
      {moves.map((row, index) => (
        <div key={`move-${index}`} className="rounded-lg border border-slate-100 px-2 py-2">
          <p className="font-semibold text-slate-800">Rescheduled to {row.newDay}</p>
          <p>{displayDate(row.previousDate)} {row.previousStart}–{row.previousEnd} → {displayDate(row.newDate)} {row.newStart}–{row.newEnd}</p>
          <p>{inr(Number(row.previousAmount || 0))} → {inr(Number(row.newAmount || 0))}</p>
        </div>
      ))}
      {payments.map((row, index) => (
        <div key={`pay-${index}`} className="rounded-lg border border-slate-100 px-2 py-2">
          <p className="font-semibold text-slate-800">{row.kind === "refund" ? "Refund" : "Payment"} · {row.mode}</p>
          <p>{inr(Number(row.amount || 0))}</p>
          {row.note ? <p className="text-slate-500">{row.note}</p> : null}
        </div>
      ))}
    </div>
  );
}

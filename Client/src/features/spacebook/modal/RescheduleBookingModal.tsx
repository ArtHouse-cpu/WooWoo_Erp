import { useEffect, useState } from "react";
import { CalendarClock, Loader2, X } from "lucide-react";
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
  if (total > 21 * 60) return "";
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
  const [duration, setDuration] = useState(hoursBetween(booking.startTime, booking.endTime));
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
  const openSlots = Array.from({ length: 12 }, (_, index) => {
    const hour = 9 + index;
    const slotStart = `${String(hour).padStart(2, "0")}:00`;
    const slotEnd = plusHours(slotStart, duration);
    if (!slotEnd) return null;
    const status = getSlotAvailability(
      date,
      slotStart,
      slotEnd,
      availability.data?.busy || [],
      now,
    );
    return { slotStart, slotEnd, status };
  }).filter((slot): slot is { slotStart: string; slotEnd: string; status: "available" | "booked" | "unavailable" } => Boolean(slot));

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

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">
              {view === "payment"
                ? "Receive pending payment"
                : view === "history"
                  ? "Payment history"
                  : "Reschedule booking"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto px-4 py-3 text-sm">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Info label="Booking ID" value={id.slice(-6).toUpperCase()} />
            <Info label="Customer" value={booking.customerName} />
            <Info label="Space" value={booking.spaceName || "Space"} />
            <Info label="Status" value={statusLabel} />
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
            <p>Original amount: <b>{inr(original)}</b></p>
            <p>Current amount: <b>{inr(total)}</b></p>
            <p>Paid: <b>{inr(paid)}</b></p>
            <p>Refund / wallet adjustment: <b>{inr(refunded)}</b></p>
            <p>Pending: <b>{inr(due)}</b></p>
          </div>

          {view === "history" ? (
            <History booking={booking} />
          ) : view === "payment" ? (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-600">
                Amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pendingAmount}
                  onChange={(event) => setPendingAmount(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
              <PayModes mode={payMode} setMode={setPayMode} walletType={walletType} setWalletType={setWalletType} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                <p>Current date: {displayDate(booking.bookingDate)}</p>
                <p>Current time: {booking.startTime}–{booking.endTime}</p>
                <p>Current type: {booking.spaceDay || "—"}</p>
                <p>Current price: {inr(total)}</p>
              </div>
              <label className="block text-xs font-medium text-slate-600">
                New date
                <input
                  type="date"
                  value={date}
                  onChange={(event) => {
                    const next = event.target.value;
                    setDate(next);
                    const parsed = new Date(`${next}T12:00:00`);
                    const weekend = parsed.getDay() === 0 || parsed.getDay() === 6;
                    setDayType(weekend ? "Weekend" : "Weekday");
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2"
                />
              </label>
              <div>
                <p className="text-xs font-medium text-slate-600">Type for this space</p>
                <div className="mt-1 flex gap-2">
                  {(["Weekday", "Weekend"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setDayType(type)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${dayType === type ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200"}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block text-xs font-medium text-slate-600">
                Hours
                <select
                  value={duration}
                  onChange={(event) => setDuration(Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2"
                >
                  {[1, 2, 3, 4, 5, 6].map((hour) => (
                    <option key={hour} value={hour}>{hour} hour{hour > 1 ? "s" : ""}</option>
                  ))}
                </select>
              </label>
              <div>
                <p className="text-xs font-medium text-slate-600">Available time</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {availability.loading ? (
                    <p className="text-xs text-slate-400">Checking availability…</p>
                  ) : openSlots.filter((slot) => slot.status === "available").length === 0 ? (
                    <p className="text-xs text-slate-500">No open slot for these hours.</p>
                  ) : (
                    openSlots.map((slot) => (
                      <button
                        key={slot.slotStart}
                        type="button"
                        disabled={slot.status !== "available"}
                        onClick={() => setStart(slot.slotStart)}
                        className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                          start === slot.slotStart && slot.status === "available"
                            ? "border-slate-900 bg-slate-900 text-white"
                            : slot.status === "available"
                              ? "border-slate-200 text-slate-700"
                              : "cursor-not-allowed border-slate-100 text-slate-300"
                        }`}
                      >
                        {slot.slotStart}–{slot.slotEnd}
                        {slot.status === "booked" ? " booked" : ""}
                      </button>
                    ))
                  )}
                </div>
              </div>
              {quoting ? (
                <p className="text-xs text-slate-400">Calculating price…</p>
              ) : quote ? (
                <div className={`rounded-xl border p-3 text-xs ${quote.additionalDue > 0 ? "border-amber-200 bg-amber-50" : quote.difference < 0 ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                  <p>
                    {quote.difference === 0 && quote.currentDay === quote.newDay
                      ? <>Same {quote.newDay} and {quote.hours}h. Price stays <b>{inr(quote.previousAmount)}</b>.</>
                      : <>New type: <b>{quote.newDay}</b> · {quote.hours}h × {inr(quote.hourlyRate)}</>}
                  </p>
                  <p>Customer: <b>{quote.customerName || booking.customerName}</b>{quote.customerPhone || booking.customerPhone ? ` · ${quote.customerPhone || booking.customerPhone}` : ""}</p>
                  <p>Membership: <b>{quote.membershipLabel || quote.membershipType || "General"}</b>{quote.membershipPercent ? ` · ${quote.membershipPercent}% space` : ""}</p>
                  <p>Original booking amount: <b>{inr(quote.previousAmount)}</b></p>
                  {quote.membershipDiscount ? (
                    <p>Membership discount on the new price: <b>{inr(quote.membershipDiscount)}</b></p>
                  ) : null}
                  <p>New booking amount: <b>{inr(quote.newAmount)}</b></p>
                  {quote.additionalDue > 0 ? (
                    <p>Extra to collect at checkout: <b>{inr(quote.additionalDue)}</b></p>
                  ) : quote.refundable > 0 ? (
                    <p>Amount to settle: <b>{inr(quote.refundable)}</b></p>
                  ) : (
                    <p>No additional amount. This booking can be rescheduled directly.</p>
                  )}
                </div>
              ) : null}
              {quote && quote.additionalDue > 0 ? (
                <button
                  type="button"
                  onClick={() => onPay?.(quote)}
                  className="w-full rounded-xl bg-[#ff5a36] px-3 py-2 text-xs font-semibold text-white"
                >
                  Pay {inr(quote.additionalDue)}
                </button>
              ) : null}
              {quote && quote.refundable > 0 ? (
                <label className="block text-xs font-medium text-slate-600">
                  Amount settlement
                  <select
                    value={refundMode}
                    onChange={(event) => setRefundMode(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2"
                  >
                    <option value="Wallet">Wallet</option>
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                  </select>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Settle {inr(quote.refundable)} by {refundMode}.
                  </p>
                  {refundMode === "Wallet" ? (
                    <div className="mt-2">
                      <WalletSelect value={walletType} onChange={setWalletType} />
                    </div>
                  ) : null}
                </label>
              ) : null}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">
            Close
          </button>
          {view === "reschedule" ? (
            <button
              type="button"
              disabled={!quote || quoting || saving || quote.additionalDue > 0}
              onClick={() => void confirmReschedule()}
              className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Confirm reschedule
            </button>
          ) : null}
          {view === "payment" ? (
            <button
              type="button"
              disabled={saving || due <= 0}
              onClick={() => void confirmPayment()}
              className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Receive payment
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="truncate font-semibold text-slate-800">{value}</p>
    </div>
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

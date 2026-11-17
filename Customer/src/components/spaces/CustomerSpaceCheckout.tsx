import {useEffect, useMemo, useState} from 'react';
import {Calendar, Check, Clock, X} from 'lucide-react';
import type {SpaceCard} from '../../services/space.service';
import {fetchSpaceAvailability} from '../../services/space.service';
import {
  quoteSpaceBooking,
  startSpaceCheckout,
  verifySpaceCheckout,
  type ConfirmedSpaceBooking,
  type SpaceQuote,
} from '../../services/spaceCheckout.service';
import {getErrorMessage} from '../../services/axios';
import {useAuthStore} from '../../store/authStore';
import {formatInr} from './spaceActions';
import {loadRazorpayScript, openRazorpayCheckout} from '../../utils/razorpayCheckout';

const STARTS = Array.from({length: 18}, (_, index) => {
  const hour = 6 + index;
  return `${String(hour).padStart(2, '0')}:00`;
});

const minutes = (value: string) => {
  if (value === '24:00') return 24 * 60;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
};

const clock = (value: string) => {
  const total = minutes(value);
  const hour24 = Math.floor(total / 60);
  const minute = String(total % 60).padStart(2, '0');
  if (hour24 >= 24) return '12:00 AM';
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour = hour24 % 12 || 12;
  return `${hour}:${minute} ${period}`;
};

const toDateKey = (value?: string | Date) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const todayKey = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

type Props = {
  space: SpaceCard | null;
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string | Date;
  initialStartTime?: string;
  initialEndTime?: string;
};

export function CustomerSpaceCheckout({
  space,
  isOpen,
  onClose,
  initialDate,
  initialStartTime,
  initialEndTime,
}: Props) {
  const customer = useAuthStore(state => state.customer);
  const [date, setDate] = useState(todayKey());
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('12:00');
  const [busy, setBusy] = useState<Array<{startTime: string; endTime: string}>>([]);
  const [nowMinutes, setNowMinutes] = useState(0);
  const [serverToday, setServerToday] = useState(todayKey());
  const [couponCode, setCouponCode] = useState('');
  const [quote, setQuote] = useState<SpaceQuote | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoting, setQuoting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [confirmed, setConfirmed] = useState<ConfirmedSpaceBooking | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDate(toDateKey(initialDate) || todayKey());
    setStart(initialStartTime || '10:00');
    setEnd(initialEndTime || '12:00');
    setCouponCode('');
    setQuote(null);
    setQuoteError('');
    setPayError('');
    setConfirmed(null);
  }, [isOpen, space?.id, initialDate, initialStartTime, initialEndTime]);

  useEffect(() => {
    if (!isOpen || !space?.id || !date) return;
    const controller = new AbortController();
    fetchSpaceAvailability(space.id, date, date, controller.signal)
      .then(result => {
        setServerToday(result.today);
        setNowMinutes(result.nowMinutes);
        setBusy(result.busy.filter(row => row.date === date));
      })
      .catch(() => {
        if (!controller.signal.aborted) setBusy([]);
      });
    return () => controller.abort();
  }, [isOpen, space?.id, date]);

  const blocked = (from: string, to: string) => {
    const a = minutes(from);
    const b = minutes(to);
    if (date < serverToday || (date === serverToday && a <= nowMinutes)) return true;
    return busy.some(row => a < minutes(row.endTime) && minutes(row.startTime) < b);
  };

  const endOptions = useMemo(
    () => STARTS.filter(slot => minutes(slot) > minutes(start)).concat('24:00'),
    [start],
  );

  useEffect(() => {
    if (!isOpen || !space || confirmed) return;
    if (blocked(start, end)) {
      setQuote(null);
      setQuoteError('That time is already booked or has passed.');
      return;
    }
    const timer = window.setTimeout(() => {
      setQuoting(true);
      setQuoteError('');
      quoteSpaceBooking({
        spaceId: space.id,
        bookingDate: date,
        startTime: start,
        endTime: end,
        couponCode: couponCode.trim() || undefined,
      })
        .then(setQuote)
        .catch(error => {
          setQuote(null);
          setQuoteError(getErrorMessage(error, 'Could not price this slot.'));
        })
        .finally(() => setQuoting(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [isOpen, space?.id, date, start, end, couponCode, busy, nowMinutes, serverToday, confirmed]);

  if (!isOpen || !space) return null;

  const pay = async () => {
    if (!quote || paying) return;
    setPaying(true);
    setPayError('');
    try {
      const started = await startSpaceCheckout({
        spaceId: space.id,
        bookingDate: date,
        startTime: start,
        endTime: end,
        couponCode: couponCode.trim() || undefined,
      });
      if (started.mode === 'free') {
        setConfirmed(started.booking);
        return;
      }
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Razorpay could not be loaded.');
      await new Promise<void>((resolve, reject) => {
        openRazorpayCheckout({
          keyId: started.keyId,
          orderId: started.orderId,
          amount: started.amount,
          currency: started.currency,
          name: 'WOOWOO Art House',
          description: `${quote.spaceName} · ${date}`,
          prefill: {
            name: customer?.name,
            email: customer?.email,
            contact: customer?.mobile,
          },
          onSuccess: response => {
            verifySpaceCheckout({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
              .then(booking => {
                setConfirmed(booking);
                resolve();
              })
              .catch(error => {
                setPayError(getErrorMessage(error, 'Payment was received but the booking was not saved. Contact the studio with your payment id.'));
                reject(error);
              });
          },
          onDismiss: () => {
            setPayError('Payment was cancelled. The slot was not booked.');
            resolve();
          },
          onError: description => {
            setPayError(description || 'Payment failed. You can try again.');
            resolve();
          },
        });
      });
    } catch (error) {
      setPayError(getErrorMessage(error, 'Could not start payment.'));
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-violet-700">Book now</p>
            <h2 className="text-lg font-black text-slate-900">{space.name}</h2>
            <p className="text-xs text-slate-500">{customer?.name} · {customer?.mobile}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {confirmed ? (
          <div className="space-y-3 px-4 py-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check />
            </div>
            <h3 className="text-xl font-black text-slate-900">Booking confirmed</h3>
            <p className="text-sm text-slate-500">Reference {confirmed.bookingCode}</p>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-left text-sm">
              <p className="font-bold text-slate-800">{confirmed.spaceName}</p>
              <p className="mt-1 text-slate-500">{clock(confirmed.startTime)} – {clock(confirmed.endTime)} · {confirmed.durationHours}h</p>
              <p className="mt-1 font-bold text-slate-900">Paid ₹{formatInr(confirmed.paidAmount)} · {confirmed.paymentMode}</p>
              {confirmed.razorpayPaymentId ? <p className="mt-1 text-xs text-slate-400">Payment {confirmed.razorpayPaymentId}</p> : null}
            </div>
            <p className="text-xs text-slate-400">This booking is now in the studio space booking list.</p>
            <button type="button" onClick={onClose} className="h-11 w-full rounded-2xl bg-[#6344E7] font-bold text-white">Done</button>
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto px-4 py-4">
            <label className="block text-xs font-bold text-slate-500">
              Date
              <span className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 px-3">
                <Calendar size={14} />
                <input
                  type="date"
                  min={serverToday}
                  value={date}
                  onChange={event => setDate(event.target.value)}
                  className="h-10 w-full bg-transparent text-sm font-semibold outline-none"
                />
              </span>
            </label>

            <div>
              <p className="mb-1 flex items-center gap-1 text-xs font-bold text-slate-500"><Clock size={12} /> Start</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {STARTS.map(slot => {
                  const off = blocked(slot, `${String(Math.min(24, Number(slot.slice(0, 2)) + 1)).padStart(2, '0')}:00`.replace('24:00', '24:00'));
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={off}
                      onClick={() => {
                        setStart(slot);
                        if (minutes(end) <= minutes(slot)) {
                          const next = minutes(slot) + 60 >= 24 * 60 ? '24:00' : `${String(Number(slot.slice(0, 2)) + 1).padStart(2, '0')}:00`;
                          setEnd(next);
                        }
                      }}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${start === slot ? 'bg-[#6344E7] text-white' : off ? 'bg-slate-100 text-slate-300' : 'bg-violet-50 text-violet-700'}`}
                    >
                      {clock(slot)}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block text-xs font-bold text-slate-500">
              End
              <select
                value={end}
                onChange={event => setEnd(event.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold"
              >
                {endOptions.map(slot => (
                  <option key={slot} value={slot} disabled={blocked(start, slot)}>
                    {clock(slot)}{blocked(start, slot) ? ' · unavailable' : ''}
                  </option>
                ))}
              </select>
            </label>

            {quote?.offers?.length ? (
              <div className="rounded-2xl bg-violet-50 px-3 py-2 text-xs text-violet-800">
                {quote.offers.map(offer => (
                  <p key={offer.name}>
                    <span className="font-bold">{offer.name}.</span>{' '}
                    {offer.rules.map(rule => `Book ${rule.minimumHours}h, ${rule.freeHours}h free`).join(' · ')}
                  </p>
                ))}
              </div>
            ) : null}

            {quote?.coupons?.length ? (
              <div className="flex gap-1.5 overflow-x-auto">
                {quote.coupons.map(coupon => (
                  <button
                    key={coupon.code}
                    type="button"
                    onClick={() => setCouponCode(coupon.code)}
                    className="shrink-0 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-bold text-slate-700"
                  >
                    {coupon.code} · {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}
                  </button>
                ))}
              </div>
            ) : null}

            <label className="block text-xs font-bold text-slate-500">
              Coupon code
              <input
                value={couponCode}
                onChange={event => setCouponCode(event.target.value.toUpperCase())}
                placeholder="Enter code"
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold uppercase outline-none"
              />
            </label>
            {quote?.couponError ? <p className="text-xs font-semibold text-rose-600">{quote.couponError}</p> : null}

            <div className="space-y-1 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm">
              {quote ? (
                <>
                  <Row label="Hours" value={`${quote.hours}h · ${quote.dayType}`} />
                  <Row label="Space charges" value={`₹${formatInr(quote.baseAmount)}`} />
                  {quote.offer ? <Row label={quote.offer.name} value={`-₹${formatInr(quote.offer.discount)}`} /> : null}
                  {quote.membership.discount > 0 ? <Row label={`${quote.membership.label || 'Membership'} ${quote.membership.percent}%`} value={`-₹${formatInr(quote.membership.discount)}`} /> : null}
                  {quote.coupon ? <Row label={`Coupon ${quote.coupon.code}`} value={`-₹${formatInr(quote.coupon.discount)}`} /> : null}
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-900">
                    <span>To pay</span>
                    <span>₹{formatInr(quote.payable)}</span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400">{quoting ? 'Calculating…' : quoteError || 'Choose an available time.'}</p>
              )}
            </div>
            {payError ? <p className="text-xs font-semibold text-rose-600">{payError}</p> : null}
            <button
              type="button"
              disabled={!quote || quoting || paying || Boolean(quote.couponError && couponCode.trim())}
              onClick={() => void pay()}
              className="h-12 w-full rounded-2xl bg-[#6344E7] text-sm font-bold text-white disabled:opacity-40"
            >
              {paying ? 'Please wait…' : quote && quote.payable < 1 ? 'Confirm booking' : 'Proceed to pay'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({label, value}: {label: string; value: string}) {
  return (
    <div className="flex justify-between gap-3 text-slate-600">
      <span>{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}

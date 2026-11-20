import {useState, useEffect, useMemo, useRef} from 'react';
import {useNavigate} from 'react-router-dom';
import {
  X,
  Crown,
  Laptop,
  Plus,
  CalendarCheck,
  Calendar,
  ChevronDown,
  Coffee,
  Ticket,
  PiggyBank,
  ArrowRight,
  Check,
  Download,
  Loader2,
} from 'lucide-react';
import {toast} from 'sonner';
import type {SpaceCard} from '../../services/space.service';
import {formatInr, SPACE_WHATSAPP} from './spaceActions';
import {recordPortalEnquiry} from '../../services/enquiry.service';
import {useAuthStore} from '../../store/authStore';
import {getErrorMessage} from '../../services/axios';
import {loadRazorpayScript, openRazorpayCheckout} from '../../utils/razorpayCheckout';
import {
  downloadCoworkingInvoice,
  quoteCoworkingBooking,
  startCoworkingCheckout,
  verifyCoworkingCheckout,
  type CoworkingReceipt,
} from '../../services/coworkingCheckout.service';

export interface CoworkingPlan {
  id: string;
  name: string;
  subtitle: string;
  regularPrice: number;
  memberPrice: number;
  savings: number;
  durationDays: number;
}

export const COWORKING_BOOKING_PLANS: CoworkingPlan[] = [
  {
    id: 'day',
    name: '1 Day Pass',
    subtitle: 'Daily (1 Day)',
    regularPrice: 399,
    memberPrice: 319,
    savings: 80,
    durationDays: 1,
  },
  {
    id: 'weekly',
    name: 'Weekly Pass',
    subtitle: 'Weekly (7 Days)',
    regularPrice: 2599,
    memberPrice: 2079,
    savings: 520,
    durationDays: 7,
  },
  {
    id: 'monthly',
    name: 'Monthly Pass',
    subtitle: 'Monthly (30 Days)',
    regularPrice: 7999,
    memberPrice: 5999,
    savings: 2000,
    durationDays: 30,
  },
  {
    id: '3months',
    name: '3 Months Pass',
    subtitle: '3 Months (90 Days)',
    regularPrice: 19999,
    memberPrice: 13999,
    savings: 6000,
    durationDays: 90,
  },
  {
    id: '6months',
    name: '6 Months Pass',
    subtitle: '6 Months (180 Days)',
    regularPrice: 39998,
    memberPrice: 27999,
    savings: 12000,
    durationDays: 180,
  },
];

export interface CoworkingBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  space?: SpaceCard | null;
  initialPlanId?: string;
  initialStartDate?: string | Date;
  onSuccess?: () => void;
}

const PREMIUM_MEMBERSHIP = {
  name: 'Premium Membership (365 Days)',
  regularPrice: 1999,
  discountedPrice: 1499,
  savings: 500,
};

function formatDisplayDate(dateObj: Date): string {
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = dateObj.toLocaleDateString('en-US', {month: 'short'});
  const year = dateObj.getFullYear();
  return `${day} ${month} ${year}`;
}

function toInputDateString(dateObj: Date): string {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function CoworkingBookingModal({
  isOpen,
  onClose,
  space,
  initialPlanId = 'monthly',
  initialStartDate,
  onSuccess,
}: CoworkingBookingModalProps) {
  const navigate = useNavigate();
  const customer = useAuthStore(state => state.customer);
  const [receipt, setReceipt] = useState<CoworkingReceipt | null>(null);

  // Multi-step modal: 'booking' form -> 'confirmed' receipt
  const [step, setStep] = useState<'booking' | 'confirmed'>('booking');
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingId, setBookingId] = useState('WOO-274918');

  // Plan resolution: detect from space name or use initialPlanId, default to monthly
  const detectedPlanId = useMemo(() => {
    if (!space) return initialPlanId;
    const lower = (space.name || '').toLowerCase();
    if (lower.includes('1 day') || lower.includes('day pass')) return 'day';
    if (lower.includes('weekly')) return 'weekly';
    if (lower.includes('3 month') || lower.includes('quarterly')) return '3months';
    if (lower.includes('6 month') || lower.includes('semi-annual')) return '6months';
    if (lower.includes('month')) return 'monthly';
    return initialPlanId;
  }, [space, initialPlanId]);

  const [selectedPlanId, setSelectedPlanId] = useState<string>(detectedPlanId || 'monthly');
  const [preferredDrink, setPreferredDrink] = useState<'Tea' | 'Coffee'>('Tea');
  const [isPlanDropdownOpen, setIsPlanDropdownOpen] = useState(false);

  // Start Date state - defaults to Nov 1 2026 or current/initial date
  const [startDateObj, setStartDateObj] = useState<Date>(() => {
    if (initialStartDate) {
      const parsed = new Date(initialStartDate);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const now = new Date();
    return now.getFullYear() >= 2026 ? now : new Date(2026, 10, 1);
  });

  const dateInputRef = useRef<HTMLInputElement>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{code: string; discount: number} | null>(null);

  // Reset states when modal is opened
  useEffect(() => {
    if (isOpen) {
      setReceipt(null);
      setIsProcessing(false);
      setSelectedPlanId(detectedPlanId || 'monthly');
      if (initialStartDate) {
        const parsed = new Date(initialStartDate);
        if (!isNaN(parsed.getTime())) setStartDateObj(parsed);
      }
    }
  }, [isOpen, detectedPlanId, initialStartDate]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Selected plan calculation
  const currentPlan = useMemo(() => {
    return (
      COWORKING_BOOKING_PLANS.find(p => p.id === selectedPlanId) ||
      COWORKING_BOOKING_PLANS.find(p => p.id === 'monthly') ||
      COWORKING_BOOKING_PLANS[0]
    );
  }, [selectedPlanId]);

  // Dates
  const startsOnStr = useMemo(() => formatDisplayDate(startDateObj), [startDateObj]);
  const expiresOnStr = useMemo(() => {
    const end = new Date(startDateObj);
    end.setFullYear(end.getFullYear() + 1);
    end.setDate(end.getDate() - 1);
    return formatDisplayDate(end);
  }, [startDateObj]);

  const coworkingEndStr = useMemo(() => {
    const end = new Date(startDateObj);
    const duration = currentPlan.durationDays || 30;
    end.setDate(end.getDate() + duration - 1);
    return formatDisplayDate(end);
  }, [startDateObj, currentPlan.durationDays]);

  // Pricing calculations
  const totalRegular = PREMIUM_MEMBERSHIP.regularPrice + currentPlan.regularPrice;
  const subtotalYourPrice = PREMIUM_MEMBERSHIP.discountedPrice + currentPlan.memberPrice;
  const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
  const finalPayable = Math.max(0, subtotalYourPrice - couponDiscount);
  const totalSavings = (totalRegular - subtotalYourPrice) + couponDiscount;

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      toast.error('Please enter a coupon code');
      return;
    }
    try {
      const quote = await quoteCoworkingBooking({
        planId: currentPlan.id,
        startDate: toInputDateString(startDateObj),
        drink: preferredDrink,
        couponCode: code,
        spaceId: space?.id,
      });
      if (quote.couponError || !quote.coupon) {
        toast.error(quote.couponError || 'This coupon cannot be used.');
        return;
      }
      setAppliedCoupon({code: quote.coupon.code, discount: quote.coupon.discount});
      toast.success(`Coupon ${quote.coupon.code} applied.`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not apply this coupon.'));
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    toast.info('Coupon removed');
  };

  // Process continuing after payment
  const handleContinueToPayment = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const started = await startCoworkingCheckout({
        planId: currentPlan.id,
        startDate: toInputDateString(startDateObj),
        drink: preferredDrink,
        couponCode: appliedCoupon?.code || undefined,
        spaceId: space?.id,
      });
      if (started.mode === 'free') {
        setReceipt(started.booking);
        setBookingId(started.booking.bookingCode);
        setStep('confirmed');
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
          description: `CoWorking ${currentPlan.subtitle}`,
          prefill: {name: customer?.name, email: customer?.email, contact: customer?.mobile},
          onSuccess: response => {
            verifyCoworkingCheckout({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
              .then(booking => {
                setReceipt(booking);
                setBookingId(booking.bookingCode);
                setStep('confirmed');
                recordPortalEnquiry({
                  enquiryType: 'Space',
                  itemName: `Coworking · ${currentPlan.subtitle}`,
                  description: `Paid coworking booking ${booking.bookingCode}. Amount ₹${formatInr(booking.payable)}.`,
                });
                toast.success('Payment successful. Booking confirmed.');
                resolve();
              })
              .catch(error => {
                toast.error(getErrorMessage(error, 'Payment received, but the booking was not saved.'));
                reject(error);
              });
          },
          onDismiss: () => {
            toast.info('Payment cancelled. The booking was not created.');
            resolve();
          },
          onError: description => {
            toast.error(description || 'Payment failed. You can try again.');
            resolve();
          },
        });
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not start payment.'));
    } finally {
      setIsProcessing(false);
    }
  };

  // WhatsApp sender
  const handleOpenWhatsApp = () => {
    const message = [
      `*WooWoo CoWorking & Premium Booking Confirmed!*`,
      `Booking ID: ${bookingId}`,
      `----------------------------------`,
      `👑 *Membership:* Premium Membership (365 Days)`,
      `💻 *Plan:* CoWorking Plan - ${currentPlan.subtitle}`,
      `📅 *Membership Period:* ${startsOnStr} – ${expiresOnStr}`,
      `📅 *CoWorking Period:* ${startsOnStr} – ${coworkingEndStr}`,
      `☕ *Free Drink:* ${preferredDrink}`,
      `----------------------------------`,
      `💳 *Amount Paid:* ₹${formatInr(finalPayable)}`,
      `🎉 *Total Savings:* ₹${formatInr(totalSavings)}`,
    ].join('\n');

    const waUrl = `https://wa.me/${SPACE_WHATSAPP}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  // Download Invoice HTML receipt
  const handleDownloadInvoice = () => {
    downloadCoworkingInvoice(receipt || {
      id: bookingId,
      bookingCode: bookingId,
      planName: currentPlan.subtitle,
      spaceName: space?.name,
      drink: preferredDrink,
      startDate: startsOnStr,
      coworkingEnd: coworkingEndStr,
      membershipEnd: expiresOnStr,
      membershipName: 'Premium Membership (365 Days)',
      regularTotal: totalRegular,
      payable: finalPayable,
      savings: totalSavings,
      razorpayPaymentId: '',
    });
    toast.success(`Invoice ${receipt?.bookingCode || bookingId} downloaded`);
  };

  const handleSeeMyBookings = () => {
    onSuccess?.();
    onClose();
    navigate('/booking');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-[28px] sm:rounded-3xl bg-white p-3.5 sm:p-4 shadow-2xl text-left animate-in fade-in slide-in-from-bottom duration-200 overflow-y-auto max-h-[96dvh] space-y-2.5"
        onClick={e => e.stopPropagation()}
      >
        {/* Top drag handle indicator on mobile */}
        <div className="h-1.5 w-12 bg-slate-200 rounded-full mx-auto mb-1 sm:hidden" />

        {step === 'booking' ? (
          <>
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 pb-0.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-[#F5F0FF] border border-purple-100/90 text-[#673DE6] shrink-0">
                  <CalendarCheck className="h-5 w-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                    Complete Your Booking
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate mt-0.5">
                    Review your plans, dates and preferences to continue.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition cursor-pointer shrink-0"
                aria-label="Close booking modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Combined Plan Selection Banner */}
            <div className="rounded-2xl border border-purple-200/70 bg-[#FAF7FF] p-2.5 sm:p-3 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex min-w-0 items-center gap-2 sm:gap-2.5 flex-1">
                <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-[#FEF3C7] border border-amber-200/60 text-amber-500 shrink-0">
                  <Crown className="h-4 w-4 sm:h-4.5 sm:w-4.5 fill-amber-500 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-black leading-tight text-slate-900">
                    Premium Membership
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 leading-none mt-0.5">
                    365 Days Access
                  </div>
                </div>
              </div>

              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#673DE6] text-white shadow-xs">
                <Plus size={12} strokeWidth={3} />
              </div>

              <div className="flex min-w-0 items-center gap-2 sm:gap-2.5 flex-1 pl-1">
                <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-[#FEF3C7] border border-amber-200/60 text-amber-600 shrink-0">
                  <Laptop className="h-4 w-4 sm:h-4.5 sm:w-4.5 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-black leading-tight text-slate-900">
                    CoWorking Plan
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 leading-none truncate mt-0.5">
                    {currentPlan.subtitle}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Premium (365 Days) */}
            <div className="rounded-2xl border border-purple-100/90 bg-white p-2.5 sm:p-3 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FEF3C7] border border-amber-200/60 text-amber-500 shrink-0">
                  <Crown size={13} className="fill-amber-500 text-amber-500" />
                </div>
                <span className="text-xs sm:text-sm font-black text-slate-900">
                  Premium (365 Days)
                </span>
              </div>

              <div className="grid grid-cols-2 divide-x divide-slate-100 pt-0.5 text-[11px] sm:text-xs">
                <div className="flex items-center gap-1.5 text-slate-700 pr-2">
                  <Calendar size={13} className="text-[#673DE6] shrink-0" />
                  <span className="text-slate-400 font-medium">Starts:</span>
                  <span className="font-bold text-slate-900 truncate">{startsOnStr}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700 pl-3">
                  <Calendar size={13} className="text-[#673DE6] shrink-0" />
                  <span className="text-slate-400 font-medium">Expires:</span>
                  <span className="font-bold text-slate-900 truncate">{expiresOnStr}</span>
                </div>
              </div>
            </div>

            {/* Card 3: CoWorking Plan */}
            <div className="rounded-2xl border border-purple-100/90 bg-white p-2.5 sm:p-3 shadow-2xs space-y-1.5">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setIsPlanDropdownOpen(v => !v)}
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FEF3C7] border border-amber-200/60 text-amber-600 shrink-0">
                    <Laptop size={13} strokeWidth={2.2} />
                  </div>
                  <span className="text-xs sm:text-sm font-black text-slate-900">
                    CoWorking ({currentPlan.subtitle})
                  </span>
                </div>
                <ChevronDown
                  size={15}
                  className={`text-slate-400 transition-transform ${isPlanDropdownOpen ? 'rotate-180' : ''}`}
                />
              </div>

              {isPlanDropdownOpen && (
                <div className="py-1 border-t border-slate-100 grid grid-cols-1 gap-1">
                  {COWORKING_BOOKING_PLANS.map(plan => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => {
                        setSelectedPlanId(plan.id);
                        setIsPlanDropdownOpen(false);
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                        selectedPlanId === plan.id
                          ? 'bg-[#F5F0FF] text-[#673DE6]'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{plan.subtitle}</span>
                      <span>₹{formatInr(plan.memberPrice)}</span>
                    </button>
                  ))}
                </div>
              )}

              <div
                className="relative flex items-center gap-1.5 pt-0.5 text-[11px] sm:text-xs cursor-pointer"
                onClick={() => {
                  if (dateInputRef.current) {
                    if (typeof dateInputRef.current.showPicker === 'function') {
                      dateInputRef.current.showPicker();
                    } else {
                      dateInputRef.current.focus();
                    }
                  }
                }}
              >
                <Calendar size={13} className="text-[#673DE6] shrink-0" />
                <span className="text-slate-400 font-medium">Start:</span>
                <span className="font-bold text-slate-900">{startsOnStr}</span>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={toInputDateString(startDateObj)}
                  onChange={e => {
                    if (e.target.value) {
                      const [y, m, d] = e.target.value.split('-').map(Number);
                      setStartDateObj(new Date(y, m - 1, d));
                    }
                  }}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label="Choose Start Date"
                />
              </div>
            </div>

            {/* Card 4: Free Drink */}
            <div className="flex items-center justify-between rounded-2xl border border-purple-100/90 bg-white px-3 py-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <Coffee className="h-4 w-4 shrink-0 text-[#673DE6]" />
                <span className="text-xs sm:text-sm font-black text-slate-800">
                  Free Drink
                </span>
              </div>

              <div className="h-4 w-px bg-slate-200 mx-2" />

              <div className="flex items-center gap-2">
                {/* Tea Radio */}
                <button
                  type="button"
                  onClick={() => setPreferredDrink('Tea')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                    preferredDrink === 'Tea'
                      ? 'bg-[#F5F0FF] border border-[#673DE6] text-[#673DE6] shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 ${
                      preferredDrink === 'Tea' ? 'border-[#673DE6]' : 'border-slate-300'
                    }`}
                  >
                    {preferredDrink === 'Tea' && (
                      <div className="h-1.5 w-1.5 rounded-full bg-[#673DE6]" />
                    )}
                  </div>
                  <span>Tea</span>
                </button>

                {/* Coffee Radio */}
                <button
                  type="button"
                  onClick={() => setPreferredDrink('Coffee')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                    preferredDrink === 'Coffee'
                      ? 'bg-[#F5F0FF] border border-[#673DE6] text-[#673DE6] shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 ${
                      preferredDrink === 'Coffee' ? 'border-[#673DE6]' : 'border-slate-300'
                    }`}
                  >
                    {preferredDrink === 'Coffee' && (
                      <div className="h-1.5 w-1.5 rounded-full bg-[#673DE6]" />
                    )}
                  </div>
                  <span>Coffee</span>
                </button>
              </div>
            </div>

            {/* Card 5: Plan Summary Card */}
            <div className="space-y-2 rounded-2xl border border-purple-200/80 bg-[#FAF7FF] p-2.5 sm:p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-[#3B0764]">
                  PLAN SUMMARY
                </h4>
                <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 sm:px-2.5 py-0.5 rounded-full">
                  <PiggyBank size={12} className="shrink-0" />
                  <span>Total Savings: ₹{formatInr(totalSavings)}</span>
                </div>
              </div>

              {/* Side by side pricing cards in ONE ROW (strictly grid-cols-2 repeat(2, minmax(0, 1fr))) */}
              <div
                className="grid grid-cols-2 gap-2"
                style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
              >
                {/* Premium Card */}
                <div className="rounded-xl border border-purple-100 bg-white p-2 sm:p-2.5 shadow-3xs flex flex-col justify-between">
                  <div className="flex items-center gap-1 text-[10.5px] sm:text-[11px] font-black text-slate-900 truncate">
                    <Crown size={12} className="shrink-0 fill-amber-500 text-amber-500" />
                    <span className="truncate">Premium (365D)</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between text-xs">
                    <span className="text-slate-400 line-through text-[9.5px] sm:text-[10px]">
                      ₹{formatInr(PREMIUM_MEMBERSHIP.regularPrice)}
                    </span>
                    <span className="font-bold text-slate-900 text-[11px] sm:text-xs">
                      ₹{formatInr(PREMIUM_MEMBERSHIP.discountedPrice)}
                    </span>
                  </div>
                  <div className="text-[9.5px] sm:text-[10px] font-bold text-emerald-600 text-right">
                    Save ₹{formatInr(PREMIUM_MEMBERSHIP.savings)}
                  </div>
                </div>

                {/* CoWorking Plan Card */}
                <div className="rounded-xl border border-purple-100 bg-white p-2 sm:p-2.5 shadow-3xs flex flex-col justify-between">
                  <div className="flex items-center gap-1 text-[10.5px] sm:text-[11px] font-black text-slate-900 truncate">
                    <Laptop size={12} className="shrink-0 text-[#673DE6]" />
                    <span className="truncate">{currentPlan.subtitle}</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between text-xs">
                    <span className="text-slate-400 line-through text-[9.5px] sm:text-[10px]">
                      ₹{formatInr(currentPlan.regularPrice)}
                    </span>
                    <span className="font-bold text-slate-900 text-[11px] sm:text-xs">
                      ₹{formatInr(currentPlan.memberPrice)}
                    </span>
                  </div>
                  <div className="text-[9.5px] sm:text-[10px] font-bold text-emerald-600 text-right">
                    Save ₹{formatInr(currentPlan.savings)}
                  </div>
                </div>
              </div>

              {/* Total Payable Row */}
              <div className="flex items-center justify-between rounded-xl bg-[#F0E8FF] px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-black text-[#3B0764]">
                <span>Total Payable Amount</span>
                <div className="flex items-baseline gap-1.5 sm:gap-2">
                  <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 line-through">
                    ₹{formatInr(totalRegular)}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-[#673DE6]">
                    ₹{formatInr(finalPayable)}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 6: Apply Coupon Code */}
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-purple-100/90 bg-white p-1 pl-3 shadow-2xs">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Ticket size={16} className="text-[#673DE6] stroke-[2.2] shrink-0" />
                <input
                  type="text"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value)}
                  placeholder="Apply Coupon Code"
                  className="w-full text-xs font-medium text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
                />
              </div>

              {appliedCoupon ? (
                <div className="flex items-center gap-1 pr-2">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5">
                    <Check size={11} strokeWidth={3} />
                    -₹{formatInr(appliedCoupon.discount)}
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                    title="Remove coupon"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="px-4 py-1.5 rounded-xl border border-purple-200 bg-white hover:bg-[#F5F0FF] text-[#673DE6] text-xs font-black transition cursor-pointer shadow-3xs"
                >
                  Apply
                </button>
              )}
            </div>

            {/* Bottom CTA Button: Continue -> */}
            <div className="sticky bottom-0 left-0 right-0 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-white">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleContinueToPayment}
                className="w-full h-12 rounded-2xl bg-[#673DE6] hover:bg-[#5830d4] text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md shadow-purple-500/25 transition active:scale-[0.99] cursor-pointer disabled:opacity-75"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight size={16} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          /* STEP 2: BOOKING CONFIRMED SCREEN */
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Top Close Button */}
            <div className="flex justify-end -mt-1 -mr-1">
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6] text-slate-500 hover:bg-slate-200 transition cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Central Celebration Green Checkmark & Confetti */}
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
              {/* Confetti particles */}
              <span className="absolute -top-1 left-2 h-2.5 w-1 rounded-full bg-[#22C55E] -rotate-45" />
              <span className="absolute top-4 -left-1.5 h-2 w-2 rounded-full bg-[#EC4899]" />
              <span className="absolute bottom-2 -left-1 h-2.5 w-1 rounded-full bg-[#8B5CF6] rotate-45" />
              <span className="absolute -top-1 right-2 h-2.5 w-1 rounded-full bg-[#8B5CF6] rotate-45" />
              <span className="absolute top-4 -right-1.5 h-2 w-2 rounded-full bg-[#EC4899]" />
              <span className="absolute bottom-2 -right-1 h-2.5 w-1 rounded-full bg-[#F59E0B] -rotate-45" />

              {/* Main Green Check Badge */}
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#16A34A] text-white shadow-lg shadow-green-500/25">
                <Check size={36} strokeWidth={3.5} />
              </div>
            </div>

            {/* Header Titles */}
            <div className="text-center space-y-1">
              <h3 className="font-display text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Booking Confirmed!
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
                Your Premium Membership and CoWorking Plan have been successfully booked.
              </p>
            </div>

            {/* WhatsApp & Invoice Sent Banner */}
            <div className="rounded-2xl border border-emerald-200/90 bg-[#F0FDF4] p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
              <div
                onClick={handleOpenWhatsApp}
                className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition min-w-0 flex-1"
                title="Open WhatsApp notification"
              >
                <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-[#25D366] text-white shrink-0 shadow-xs">
                  <svg
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="fill-white stroke-none"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.05 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-[13px] font-black text-slate-900 leading-tight">
                    Details & invoice sent to WhatsApp
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium leading-tight mt-0.5">
                    We've shared your booking details and invoice on your WhatsApp number.
                  </p>
                </div>
              </div>

              <div className="h-9 w-[1px] bg-emerald-200 shrink-0 hidden sm:block" />

              {/* Download Invoice Button */}
              <button
                type="button"
                onClick={handleDownloadInvoice}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-[#6344E7] bg-white hover:bg-purple-50 text-[#6344E7] px-3.5 py-2 text-xs font-bold transition cursor-pointer shrink-0 shadow-2xs"
              >
                <Download size={15} strokeWidth={2.2} />
                <span>Download Invoice</span>
              </button>
            </div>

            {/* Booking Summary Card */}
            <div className="rounded-3xl border border-purple-200/80 bg-white p-4 sm:p-5 space-y-3.5 shadow-2xs">
              {/* Header Row */}
              <div className="flex items-center justify-between">
                <h4 className="font-display text-base sm:text-lg font-black text-slate-900">
                  Booking Summary
                </h4>
                <span className="rounded-full bg-[#F3E8FF] px-3 py-1 text-xs font-bold text-[#7C3AED]">
                  Booking ID: {bookingId}
                </span>
              </div>

              {/* CoWorking Plan */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FEF3C7] text-[#B45309] shrink-0 shadow-2xs">
                    <Laptop className="h-5 w-5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-black text-[#3B0764] leading-tight truncate">
                      CoWorking Plan
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold leading-tight mt-0.5">
                      {currentPlan.subtitle}
                    </div>
                  </div>
                </div>

                <div className="h-7 w-[1px] bg-slate-200 shrink-0" />

                <div className="flex items-center gap-2 shrink-0">
                  <Calendar className="h-4.5 w-4.5 text-[#6344E7] stroke-[2]" />
                  <span className="text-xs sm:text-[13px] font-bold text-slate-900">
                    {startsOnStr} – {coworkingEndStr}
                  </span>
                </div>
              </div>

              {/* Prices Breakdown */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-700 font-medium">Regular Price (Total)</span>
                  <span className="text-slate-900 font-bold">₹{formatInr(totalRegular)}</span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-700 font-medium">Discount (Total)</span>
                  <span className="font-bold text-[#16A34A]">– ₹{formatInr(totalSavings)}</span>
                </div>
              </div>

              {/* Amount Paid Banner */}
              <div className="rounded-2xl bg-[#EDE9FE] py-2.5 px-3.5 sm:px-4 flex items-center justify-between shadow-2xs">
                <span className="text-xs sm:text-sm font-black text-[#5B21B6]">
                  Amount Paid
                </span>
                <span className="text-base sm:text-lg font-black text-[#4C1D95]">
                  ₹{formatInr(finalPayable)}
                </span>
              </div>

              {/* Total Savings Banner */}
              <div className="rounded-2xl border border-green-200/80 bg-[#EAFBF0] py-2 px-3 sm:px-4 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2 text-[#15803D]">
                  <PiggyBank size={18} className="stroke-[2.2]" />
                  <span className="text-xs sm:text-sm font-black">Total Savings</span>
                </div>
                <span className="rounded-full bg-[#15803D] text-white px-3 py-0.5 text-xs sm:text-sm font-black shadow-2xs">
                  ₹{formatInr(totalSavings)}
                </span>
              </div>
            </div>

            {/* Bottom CTA: See My Bookings -> */}
            <button
              type="button"
              onClick={handleSeeMyBookings}
              className="w-full rounded-2xl bg-[#6344E7] hover:bg-[#5235D9] text-white py-3.5 sm:py-4 text-sm sm:text-base font-black flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 transition active:scale-[0.99] cursor-pointer"
            >
              <CalendarCheck size={18} className="stroke-[2.5]" />
              <span>See My Bookings</span>
              <ArrowRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

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
      setStep('booking');
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

  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      toast.error('Please enter a coupon code');
      return;
    }
    if (code === 'WOOWOO10' || code === 'SAVE10') {
      const discount = Math.round(subtotalYourPrice * 0.1);
      setAppliedCoupon({code, discount});
      toast.success(`Coupon ${code} applied! ₹${formatInr(discount)} saved.`);
    } else if (code === 'WELCOME500' || code === 'WOOWOO500') {
      const discount = 500;
      setAppliedCoupon({code, discount});
      toast.success(`Coupon ${code} applied! ₹500 saved.`);
    } else {
      const discount = 200;
      setAppliedCoupon({code, discount});
      toast.success(`Coupon ${code} applied! ₹${discount} saved.`);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    toast.info('Coupon removed');
  };

  // Process continuing after payment
  const handleContinueToPayment = () => {
    setIsProcessing(true);
    const generatedId = `WOO-${Math.floor(200000 + Math.random() * 800000)}`;
    setBookingId(generatedId);

    recordPortalEnquiry({
      enquiryType: 'Space',
      itemName: `Coworking · ${currentPlan.subtitle}`,
      description: `Coworking confirmed booking. ID: ${generatedId}. Start: ${startsOnStr}. Drink: ${preferredDrink}. Amount: ₹${formatInr(finalPayable)}.`,
    });

    // Simulate realistic instantaneous payment verification then transition to Confirmed screen
    setTimeout(() => {
      setIsProcessing(false);
      setStep('confirmed');
      toast.success('Payment successful! Booking confirmed.');
    }, 600);
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
      `☕ *Complimentary Drink:* ${preferredDrink}`,
      `----------------------------------`,
      `💳 *Amount Paid:* ₹${formatInr(finalPayable)}`,
      `🎉 *Total Savings:* ₹${formatInr(totalSavings)}`,
    ].join('\n');

    const waUrl = `https://wa.me/${SPACE_WHATSAPP}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  // Download Invoice HTML receipt
  const handleDownloadInvoice = () => {
    try {
      const invoiceData = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice - ${bookingId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 36px; color: #0f172a; max-width: 620px; margin: 0 auto; line-height: 1.5; }
    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
    .logo { font-size: 24px; font-weight: 900; color: #6344e7; }
    .sub { font-size: 13px; color: #64748b; margin-top: 4px; }
    .badge { background: #f3e8ff; color: #7c3aed; padding: 6px 14px; border-radius: 999px; font-weight: 800; font-size: 13px; }
    .row { display: flex; justify-content: space-between; margin: 12px 0; font-size: 14px; }
    .amount-box { background: #ede9fe; color: #4c1d95; font-size: 18px; font-weight: 800; padding: 12px 18px; border-radius: 14px; display: flex; justify-content: space-between; margin-top: 16px; }
    .savings-box { background: #eafbf0; color: #15803d; font-weight: 700; padding: 10px 18px; border-radius: 14px; display: flex; justify-content: space-between; margin-top: 8px; font-size: 14px; }
    .footer { margin-top: 36px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">WooWoo Art House</div>
      <div class="sub">CoWorking & Premium Membership Invoice</div>
    </div>
    <span class="badge">Booking ID: ${bookingId}</span>
  </div>
  <div class="row"><strong>Package:</strong><span>Premium Membership + CoWorking Plan</span></div>
  <div class="row"><strong>Membership Validity:</strong><span>365 Days (${startsOnStr} – ${expiresOnStr})</span></div>
  <div class="row"><strong>CoWorking Validity:</strong><span>${currentPlan.subtitle} (${startsOnStr} – ${coworkingEndStr})</span></div>
  <div class="row"><strong>Complimentary Beverage:</strong><span>${preferredDrink}</span></div>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 18px 0;" />
  <div class="row"><span>Regular Price (Total):</span><span style="text-decoration: line-through;">₹${formatInr(totalRegular)}</span></div>
  <div class="row" style="color: #16a34a; font-weight: 700;"><span>Discount (Total):</span><span>– ₹${formatInr(totalSavings)}</span></div>
  <div class="amount-box">
    <span>Amount Paid:</span>
    <span>₹${formatInr(finalPayable)}</span>
  </div>
  <div class="savings-box">
    <span>Total Savings:</span>
    <span>₹${formatInr(totalSavings)}</span>
  </div>
  <div class="footer">Thank you for choosing WooWoo Art House! • Contact: +91 80739 88123</div>
</body>
</html>`;

      const blob = new Blob([invoiceData], {type: 'text/html'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${bookingId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Invoice ${bookingId} downloaded successfully`);
    } catch {
      toast.error('Failed to download invoice');
    }
  };

  const handleSeeMyBookings = () => {
    onSuccess?.();
    onClose();
    navigate('/activity');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] bg-white p-5 sm:p-6 shadow-2xl text-left animate-in fade-in slide-in-from-bottom duration-200 overflow-y-auto max-h-[94vh] sm:max-h-[90vh] space-y-3.5"
        onClick={e => e.stopPropagation()}
      >
        {/* Top drag handle indicator on mobile */}
        <div className="h-1.5 w-12 bg-slate-300 rounded-full mx-auto mb-1 sm:hidden" />

        {step === 'booking' ? (
          <>
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 pb-0.5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-[#F6F2FF] border border-purple-100 text-[#6344E7] shrink-0">
                  <CalendarCheck className="h-6 w-6 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="font-display text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Complete Your Booking
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">
                    Review your plans, dates and preferences to continue.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6] text-slate-500 hover:bg-slate-200 transition cursor-pointer shrink-0"
                aria-label="Close booking modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Top Combined Plan Banner */}
            <div className="rounded-2xl border border-purple-200/90 bg-[#FAF7FF] p-3 sm:p-3.5 flex items-center justify-between shadow-2xs">
              {/* Left: Premium Membership */}
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-[#FEF3C7] text-[#D97706] shrink-0 shadow-2xs">
                  <Crown className="h-5 w-5 fill-[#D97706] stroke-[2]" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-black text-[#3B0764] leading-tight">
                    Premium
                  </div>
                  <div className="text-xs sm:text-sm font-black text-[#3B0764] leading-tight">
                    Membership
                  </div>
                </div>
              </div>

              {/* Center Connector: Purple Plus */}
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7C3AED] text-white shadow-xs shrink-0">
                <Plus size={16} strokeWidth={3} />
              </div>

              {/* Right: CoWorking Plan */}
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-[#FEF3C7] text-[#B45309] shrink-0 shadow-2xs">
                  <Laptop className="h-5 w-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-black text-[#3B0764] leading-tight">
                    CoWorking Plan
                  </div>
                  <div className="text-[11px] sm:text-xs font-semibold text-slate-600 leading-tight">
                    {currentPlan.subtitle}
                  </div>
                </div>
              </div>
            </div>

            {/* Date Row 1: Premium Membership */}
            <div className="rounded-2xl border border-purple-200/80 bg-white p-2.5 sm:p-3.5 flex items-center justify-between gap-1.5 sm:gap-2 shadow-2xs">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-[#FEF3C7] text-[#D97706] shrink-0">
                  <Crown size={14} className="fill-[#D97706]" />
                </div>
                <span className="text-[11px] sm:text-[13px] font-black text-slate-900 truncate">
                  Premium Membership (365 Days)
                </span>
              </div>

              <div className="h-6 sm:h-7 w-[1px] bg-slate-200 shrink-0" />

              <div className="flex items-center gap-1.5 shrink-0">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#6344E7] stroke-[2]" />
                <div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500 font-medium leading-none">
                    Starts On
                  </div>
                  <div className="text-[11px] sm:text-xs font-bold text-slate-900 leading-tight mt-0.5">
                    {startsOnStr}
                  </div>
                </div>
              </div>

              <div className="h-6 sm:h-7 w-[1px] bg-slate-200 shrink-0" />

              <div className="flex items-center gap-1.5 shrink-0">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#6344E7] stroke-[2]" />
                <div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500 font-medium leading-none">
                    Expires On
                  </div>
                  <div className="text-[11px] sm:text-xs font-bold text-slate-900 leading-tight mt-0.5">
                    {expiresOnStr}
                  </div>
                </div>
              </div>
            </div>

            {/* Date Row 2: CoWorking Plan + Interactive Start Date Picker */}
            <div className="rounded-2xl border border-purple-200/80 bg-white p-2.5 sm:p-3.5 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-[#FEF3C7] text-[#B45309] shrink-0">
                  <Laptop size={14} strokeWidth={2.2} />
                </div>
                <span className="text-[11px] sm:text-[13px] font-black text-slate-900 truncate">
                  CoWorking Plan ({currentPlan.subtitle})
                </span>
              </div>

              <div className="h-6 sm:h-7 w-[1px] bg-slate-200 shrink-0" />

              {/* Interactive Date Picker Trigger */}
              <div
                className="relative flex items-center gap-1.5 sm:gap-2 cursor-pointer hover:opacity-85 transition shrink-0"
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
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#6344E7] stroke-[2]" />
                <div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500 font-medium leading-none">
                    Start Date
                  </div>
                  <div className="text-[11px] sm:text-xs font-bold text-slate-900 leading-tight mt-0.5">
                    {startsOnStr}
                  </div>
                </div>
                <ChevronDown size={14} className="text-slate-400 ml-0.5" />

                {/* Hidden native date input to allow picking any date */}
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
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  aria-label="Choose Start Date"
                />
              </div>
            </div>

            {/* Preferred Complimentary Drink */}
            <div className="rounded-2xl border border-purple-200/80 bg-white p-2.5 sm:p-3.5 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <Coffee className="h-5 w-5 text-[#6344E7] stroke-[2.2] shrink-0" />
                <span className="text-xs sm:text-[13px] font-black text-slate-800">
                  Preferred Complimentary Drink
                </span>
              </div>

              <div className="h-6 sm:h-7 w-[1px] bg-slate-200 shrink-0 hidden sm:block" />

              {/* Radio Buttons for Tea & Coffee */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Tea Radio */}
                <button
                  type="button"
                  onClick={() => setPreferredDrink('Tea')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                    preferredDrink === 'Tea'
                      ? 'bg-[#F3E8FF] border border-[#A855F7] text-[#6B21A8] shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                      preferredDrink === 'Tea' ? 'border-[#7C3AED]' : 'border-slate-300'
                    }`}
                  >
                    {preferredDrink === 'Tea' && (
                      <div className="h-2 w-2 rounded-full bg-[#7C3AED]" />
                    )}
                  </div>
                  <span className="text-sm">♨</span>
                  <span>Tea</span>
                </button>

                {/* Coffee Radio */}
                <button
                  type="button"
                  onClick={() => setPreferredDrink('Coffee')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                    preferredDrink === 'Coffee'
                      ? 'bg-[#F3E8FF] border border-[#A855F7] text-[#6B21A8] shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                      preferredDrink === 'Coffee' ? 'border-[#7C3AED]' : 'border-slate-300'
                    }`}
                  >
                    {preferredDrink === 'Coffee' && (
                      <div className="h-2 w-2 rounded-full bg-[#7C3AED]" />
                    )}
                  </div>
                  <span className="text-sm">♨</span>
                  <span>Coffee</span>
                </button>
              </div>
            </div>

            {/* Plan Summary Card */}
            <div className="rounded-3xl border border-purple-200/80 bg-[#FAF7FF] p-4 sm:p-5 space-y-3 shadow-2xs">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 sm:gap-3 pb-1 border-b border-purple-100/80">
                <h4 className="font-display text-base sm:text-lg font-black text-slate-900">
                  Plan Summary
                </h4>
                <span className="w-16 sm:w-20 text-right text-[11px] sm:text-xs font-semibold text-slate-600">
                  Regular Price
                </span>
                <span className="w-16 sm:w-20 text-right text-[11px] sm:text-xs font-extrabold text-[#1E1B4B]">
                  Your Price
                </span>
                <div className="w-16 sm:w-20" />
              </div>

              {/* Summary Row 1: Premium Membership */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <Crown size={15} className="text-[#D97706] fill-[#D97706] shrink-0" />
                  <span className="font-bold text-slate-800 truncate">
                    Premium Membership (365 Days)
                  </span>
                </div>
                <span className="w-16 sm:w-20 text-right line-through text-slate-600 font-semibold text-xs sm:text-sm">
                  ₹{formatInr(PREMIUM_MEMBERSHIP.regularPrice)}
                </span>
                <span className="w-16 sm:w-20 text-right font-black text-slate-900 text-xs sm:text-sm">
                  ₹{formatInr(PREMIUM_MEMBERSHIP.discountedPrice)}
                </span>
                <div className="w-16 sm:w-20 flex justify-end">
                  <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[10px] sm:text-[11px] font-black text-[#166534] whitespace-nowrap">
                    Save ₹{formatInr(PREMIUM_MEMBERSHIP.savings)}
                  </span>
                </div>
              </div>

              {/* Summary Row 2: CoWorking Plan */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <Laptop size={15} className="text-[#7C3AED] stroke-[2.2] shrink-0" />
                  <span className="font-bold text-slate-800 truncate">
                    CoWorking Plan – {currentPlan.subtitle}
                  </span>
                </div>
                <span className="w-16 sm:w-20 text-right line-through text-slate-600 font-semibold text-xs sm:text-sm">
                  ₹{formatInr(currentPlan.regularPrice)}
                </span>
                <span className="w-16 sm:w-20 text-right font-black text-slate-900 text-xs sm:text-sm">
                  ₹{formatInr(currentPlan.memberPrice)}
                </span>
                <div className="w-16 sm:w-20 flex justify-end">
                  <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[10px] sm:text-[11px] font-black text-[#166534] whitespace-nowrap">
                    Save ₹{formatInr(currentPlan.savings)}
                  </span>
                </div>
              </div>

              {/* Total Payable Amount Banner */}
              <div className="rounded-2xl bg-[#EDE9FE] py-2.5 px-3.5 sm:px-4 flex items-center justify-between shadow-2xs">
                <span className="text-xs sm:text-sm font-black text-[#5B21B6]">
                  Total Payable Amount
                </span>
                <div className="flex items-center gap-2">
                  <span className="line-through text-slate-500 font-bold text-xs sm:text-sm">
                    ₹{formatInr(totalRegular)}
                  </span>
                  <span className="text-base sm:text-lg font-black text-[#4C1D95]">
                    ₹{formatInr(finalPayable)}
                  </span>
                </div>
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

            {/* Apply Coupon Code */}
            <div className="rounded-2xl border border-slate-200 bg-white p-2 sm:p-2.5 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 flex-1 pl-1">
                <Ticket size={18} className="text-[#7C3AED] stroke-[2.2] shrink-0" />
                <input
                  type="text"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value)}
                  placeholder="Apply Coupon Code"
                  className="text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none flex-1 font-medium"
                />
              </div>

              {appliedCoupon ? (
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-green-100 text-green-800 text-xs font-bold px-2 py-1">
                    <Check size={12} strokeWidth={3} />
                    -₹{formatInr(appliedCoupon.discount)}
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-slate-400 hover:text-slate-600 p-1"
                    title="Remove coupon"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="rounded-xl border border-purple-300 bg-white hover:bg-purple-50 text-[#6344E7] px-4 py-1.5 text-xs sm:text-sm font-bold transition cursor-pointer shadow-2xs"
                >
                  Apply
                </button>
              )}
            </div>

            {/* Bottom CTA Button: Continue -> */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleContinueToPayment}
              className="w-full rounded-2xl bg-[#6344E7] hover:bg-[#5235D9] text-white py-3.5 sm:py-4 text-sm sm:text-base font-black flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 transition active:scale-[0.99] cursor-pointer disabled:opacity-75"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight size={18} strokeWidth={2.5} />
                </>
              )}
            </button>
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

              {/* Row 1: Premium Membership */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FEF3C7] text-[#D97706] shrink-0 shadow-2xs">
                    <Crown className="h-5 w-5 fill-[#D97706] stroke-[2]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-black text-[#3B0764] leading-tight truncate">
                      Premium Membership
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold leading-tight mt-0.5">
                      Validity: 365 Days
                    </div>
                  </div>
                </div>

                <div className="h-7 w-[1px] bg-slate-200 shrink-0" />

                <div className="flex items-center gap-2 shrink-0">
                  <Calendar className="h-4.5 w-4.5 text-[#6344E7] stroke-[2]" />
                  <span className="text-xs sm:text-[13px] font-bold text-slate-900">
                    {startsOnStr} – {expiresOnStr}
                  </span>
                </div>
              </div>

              {/* Row 2: CoWorking Plan */}
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

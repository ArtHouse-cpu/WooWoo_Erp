import {useState, useEffect, useMemo} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {
  X,
  Users,
  Sparkles,
  Utensils,
  Volume2,
  Video,
  Projector,
  SunMedium,
  Wifi,
  Send,
  Building,
  Check,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import Swal from 'sweetalert2';
import type {SpaceCard} from '../../services/space.service';
import {
  SPACE_WHATSAPP,
  formatInr,
  spaceShareUrl,
  type MembershipTier,
} from './spaceActions';
import {SpacePhoto} from './SpacePhoto';
import {recordPortalEnquiry} from '../../services/enquiry.service';
import {useAuthStore} from '../../store/authStore';

export interface SpaceBookingModalProps {
  space: SpaceCard | null;
  isOpen: boolean;
  onClose: () => void;
  initialDate?: Date | string;
  initialStartTime?: string;
  initialEndTime?: string;
  membershipTier?: MembershipTier | null;
}

const POPULAR_PURPOSES = [
  'Shows & Performance',
  'Events & Party',
  'Workshops & Classes',
  'Shoots & Media',
  'Meetups & Seminars',
  'Coworking & Study',
  'Exhibition & Gallery',
  'Birthday / Celebration',
  'Private Gathering',
  'Other',
];

const AVAILABLE_SERVICES = [
  {id: 'speaker', label: 'Speaker & Sound System', icon: Volume2},
  {id: 'media_shoot', label: 'Media / Video Shoot', icon: Video},
  {id: 'projector', label: 'Projector & Screen', icon: Projector},
  {id: 'lighting', label: 'Special Lighting Setup', icon: SunMedium},
  {id: 'wifi', label: 'High-Speed Wi-Fi', icon: Wifi},
];

const FOOD_OPTIONS = [
  {id: 'starter', label: 'Starter'},
  {id: 'drinks', label: 'Drinks'},
  {id: 'main_course', label: 'Main Course'},
  {id: 'quick_bites', label: 'Quick Bites'},
];

function toIsoDate(d: Date | string | undefined): string {
  if (!d) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  if (typeof d === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) {
      const yyyy = parsed.getFullYear();
      const mm = String(parsed.getMonth() + 1).padStart(2, '0');
      const dd = String(parsed.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return d;
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDisplayDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    const d = new Date(year, month - 1, day);
    const dayNum = d.getDate();
    const monthName = new Intl.DateTimeFormat('en-GB', {month: 'short'}).format(d);
    const yr = d.getFullYear();
    return `${dayNum} ${monthName} ${yr}`;
  } catch {
    return dateStr;
  }
}

/** Calculates duration in hours between 24-hr times "HH:MM" */
const calcDurationHours = (from: string, to: string) => {
  if (!from || !to) return 0;
  const [fh, fm = 0] = from.split(':').map(Number);
  let [th, tm = 0] = to.split(':').map(Number);
  if (Number.isNaN(fh) || Number.isNaN(th)) return 0;
  const startM = fh * 60 + (Number.isNaN(fm) ? 0 : fm);
  let endM = th * 60 + (Number.isNaN(tm) ? 0 : tm);
  if (endM === 0 && startM > 0) endM = 24 * 60;
  if (th === 24) endM = 24 * 60 + (Number.isNaN(tm) ? 0 : tm);
  return Math.max(0.5, Math.round(((endM - startM) / 60) * 10) / 10);
};

/** Formats 24-hr "HH:MM" into 12-hr AM/PM format (e.g. "09:00 AM") */
const formatTimeSlotDisplay = (time24: string) => {
  if (!time24) return '06:00 AM';
  const [hStr, mStr] = time24.split(':');
  let h = Number(hStr);
  const m = Number(mStr) || 0;
  if (Number.isNaN(h)) h = 6;
  if (h === 24) h = 0;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
};

/** Generates quick slot presets for the given duration */
const getQuickSlotsForDuration = (hours: number) => {
  const dur = Math.max(1, Math.min(18, Math.round(hours || 1)));
  const slots: {label: string; start: string; end: string}[] = [];
  const candidateStarts = [9, 12, 15, 18, 20].filter(s => s + dur <= 24);
  if (candidateStarts.length === 0 && 6 + dur <= 24) {
    candidateStarts.push(6);
  }

  candidateStarts.forEach(startH => {
    const endH = startH + dur;
    const startStr = `${String(startH).padStart(2, '0')}:00`;
    const endStr = endH === 24 ? '24:00' : `${String(endH).padStart(2, '0')}:00`;
    slots.push({
      label: `${formatTimeSlotDisplay(startStr)} – ${formatTimeSlotDisplay(endStr)}`,
      start: startStr,
      end: endStr,
    });
  });
  return slots;
};

export function SpaceBookingModal({
  space,
  isOpen,
  onClose,
  initialDate,
  initialStartTime,
  initialEndTime,
  membershipTier,
}: SpaceBookingModalProps) {
  const customer = useAuthStore(state => state.customer);
  const [purpose, setPurpose] = useState(POPULAR_PURPOSES[0]);
  const [customPurpose, setCustomPurpose] = useState('');
  const [guestCount, setGuestCount] = useState<number>(15);
  const [bookingDate, setBookingDate] = useState<string>('');
  const [durationHours, setDurationHours] = useState(3);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');

  // Additional options
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [includeFood, setIncludeFood] = useState(false);
  const [selectedFoodItems, setSelectedFoodItems] = useState<string[]>([]);

  // Initialize/Reset state when modal opens or space changes
  useEffect(() => {
    if (!isOpen || !space) return;

    setPurpose(POPULAR_PURPOSES[0]);
    setCustomPurpose('');
    setGuestCount(space.capacity > 0 ? Math.min(space.capacity, 15) : 15);
    setBookingDate(toIsoDate(initialDate));
    const sTime = initialStartTime || '09:00';
    const eTime = initialEndTime || '12:00';
    setStartTime(sTime);
    setEndTime(eTime);
    const dur = calcDurationHours(sTime, eTime);
    setDurationHours(dur >= 1 ? dur : 3);
    setSelectedServices([]);
    setIncludeFood(false);
    setSelectedFoodItems([]);
  }, [isOpen, space, initialDate, initialStartTime, initialEndTime]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Weekend calculation for accurate pricing
  const isWeekend = useMemo(() => {
    try {
      const [year, month, day] = bookingDate.split('-').map(Number);
      if (!year || !month || !day) return false;
      const d = new Date(year, month - 1, day);
      const dayOfWeek = d.getDay();
      return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
    } catch {
      return false;
    }
  }, [bookingDate]);

  const currentDuration = calcDurationHours(startTime, endTime);
  const isValidTimeRange = currentDuration >= 1;
  const formattedSlotRange = `${formatTimeSlotDisplay(startTime)} – ${formatTimeSlotDisplay(endTime)}`;
  const quickSlots = getQuickSlotsForDuration(durationHours);

  const baseHourlyPrice = useMemo(() => {
    if (!space) return 0;
    const weekdayPrice = space.weekdayPrice ?? space.fromPrice;
    const weekendPrice = space.weekendPrice ?? Math.round(weekdayPrice * 1.3);
    return isWeekend ? weekendPrice : weekdayPrice;
  }, [space, isWeekend]);

  const unitDiscount = useMemo(() => {
    if (!membershipTier) return 0;
    return Math.round(baseHourlyPrice * (membershipTier.discountPercent / 100));
  }, [baseHourlyPrice, membershipTier]);

  const finalHourlyPrice = Math.max(0, baseHourlyPrice - unitDiscount);
  const calculatedTotal = finalHourlyPrice * durationHours;

  // Handle hours stepper change
  const handleDurationChange = (newDur: number) => {
    const safeDur = Math.max(1, Math.min(18, newDur));
    setDurationHours(safeDur);

    const [sh = 9, sm = 0] = startTime.split(':').map(Number);
    let startM = sh * 60 + sm;
    let endM = startM + Math.round(safeDur * 60);

    if (endM > 24 * 60) {
      startM = Math.max(6 * 60, 24 * 60 - Math.round(safeDur * 60));
      endM = startM + Math.round(safeDur * 60);
      const newStartH = Math.floor(startM / 60);
      const newStartM = startM % 60;
      setStartTime(
        `${String(newStartH).padStart(2, '0')}:${String(newStartM).padStart(2, '0')}`
      );
    }

    const newEndH = Math.floor(endM / 60);
    const newEndM = endM % 60;
    setEndTime(
      `${String(newEndH === 24 ? '24' : newEndH).padStart(2, '0')}:${String(newEndM).padStart(2, '0')}`
    );
  };

  // Handle custom start time change
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    if (!newStart) return;

    const [sh = 6, sm = 0] = newStart.split(':').map(Number);
    const startM = sh * 60 + sm;
    let endM = startM + Math.round(durationHours * 60);

    if (endM > 24 * 60) {
      endM = 24 * 60;
      const dur = Math.max(0.5, Math.round(((endM - startM) / 60) * 10) / 10);
      setDurationHours(dur);
    }

    const endH = Math.floor(endM / 60);
    const endMin = endM % 60;
    setEndTime(
      `${String(endH === 24 ? '24' : endH).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`
    );
  };

  // Handle custom end time change
  const handleEndTimeChange = (newEnd: string) => {
    const effectiveEnd = newEnd === '00:00' ? '24:00' : newEnd;
    setEndTime(effectiveEnd);

    const dur = calcDurationHours(startTime, effectiveEnd);
    if (dur >= 1) {
      setDurationHours(dur);
    }
  };

  // Handle quick slot preset click
  const handleSelectQuickSlot = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
    const dur = calcDurationHours(start, end);
    if (dur >= 1) {
      setDurationHours(dur);
    }
  };

  const toggleService = (label: string) => {
    setSelectedServices(prev =>
      prev.includes(label) ? prev.filter(item => item !== label) : [...prev, label],
    );
  };

  const toggleFoodItem = (label: string) => {
    setSelectedFoodItems(prev =>
      prev.includes(label) ? prev.filter(item => item !== label) : [...prev, label],
    );
  };

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!space) return;

    if (!isValidTimeRange || durationHours < 1) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Time Slot',
        text: 'Please ensure your end time is after start time with at least 1 hour duration.',
        confirmButtonColor: '#6344E7',
      });
      return;
    }

    const trimmedPurpose =
      purpose.toLowerCase() === 'other'
        ? (customPurpose.trim() || 'Other')
        : (purpose.trim() || 'Shows & Performance');
    const formattedDate = formatDisplayDate(bookingDate);
    const durationText = `${durationHours} ${durationHours === 1 ? 'hour' : 'hours'}`;
    const timingText = `${formattedSlotRange} (${durationText})`;
    const pricingText = `₹${formatInr(calculatedTotal)}`;
    const effectiveGuests = Math.max(1, guestCount || 1);
    const guestsText = `${effectiveGuests} ${effectiveGuests === 1 ? 'Guest' : 'Guests'}`;
    const spaceLink = spaceShareUrl(space.id, membershipTier?.id);

    // Build additional section
    const additionalLines: string[] = [];
    if (selectedServices.length > 0) {
      additionalLines.push(`• Services: ${selectedServices.join(', ')}`);
    }
    if (includeFood && selectedFoodItems.length > 0) {
      additionalLines.push(`• Food (Only Veg): ${selectedFoodItems.join(', ')}`);
    }

    const messageLines = [
      'Hi,',
      '',
      `I would like to book *${space.name}*`,
      '',
      `*Purpose* : ${trimmedPurpose}`,
      '',
      `Date: ${formattedDate}`,
      `Timing: ${timingText}`,
      `Pricing: ${pricingText}`,
      `Guests: ${guestsText}`,
    ];

    if (additionalLines.length > 0) {
      messageLines.push('');
      messageLines.push('*Additional:*');
      additionalLines.forEach(line => messageLines.push(line));
    }

    if (customer?.name || customer?.mobile) {
      messageLines.push(`Customer: ${customer?.name || ''}${customer?.mobile ? ` (${customer.mobile})` : ''}`);
    }

    messageLines.push('');
    messageLines.push(`Space Link: ${spaceLink}`);
    messageLines.push('');
    messageLines.push('*Please contact me for assistance.*');

    const fullMessage = messageLines.join('\n');
    recordPortalEnquiry({
      enquiryType: 'Space',
      itemName: space.name,
      description: `Booking request. Purpose: ${trimmedPurpose}. Date: ${formattedDate}. Timing: ${timingText}. Guests: ${guestsText}. Pricing: ${pricingText}.`,
    });
    const waUrl = `https://wa.me/${SPACE_WHATSAPP}?text=${encodeURIComponent(fullMessage)}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');

    Swal.fire({
      icon: 'success',
      title: 'Booking Request Prepared!',
      text: 'Opening WhatsApp to complete your booking with the WooWoo team.',
      confirmButtonColor: '#6344E7',
    });

    onClose();
  };

  if (!space) return null;

  const todayIso = toIsoDate(new Date());

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 text-left">
          {/* Backdrop */}
          <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs transition-opacity"
          />

          {/* Modal Container */}
          <motion.div
            initial={{y: '100%', opacity: 0}}
            animate={{y: 0, opacity: 1}}
            exit={{y: '100%', opacity: 0}}
            transition={{type: 'spring', damping: 28, stiffness: 280}}
            className="relative z-10 flex w-full max-w-lg max-h-[92dvh] flex-col rounded-t-[32px] sm:rounded-[28px] border border-slate-100 bg-white shadow-2xl overflow-hidden"
          >
            {/* Mobile Drag Indicator */}
            <div className="flex shrink-0 justify-center pt-3 pb-1 sm:hidden">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>

            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3E8FF] text-[#7C3AED]">
                  <Sparkles size={18} className="stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#6344E7]">
                    Book Now
                  </p>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                    {space.name}
                  </h2>
                  {customer?.name ? (
                    <p className="text-xs text-slate-500 font-medium truncate max-w-[220px] sm:max-w-xs">
                      {customer.name} {customer.mobile ? `· ${customer.mobile}` : ''}
                    </p>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleBookSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Space Preview Card */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 border border-slate-200/80">
                  <SpacePhoto
                    src={space.imageUrl || space.images?.[0] || null}
                    alt={space.name}
                    fallback={<Building className="h-6 w-6 text-[#7C3AED]" />}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F3E8FF] px-2 py-0.5 text-[10px] font-bold text-[#7C3AED]">
                      {space.category || space.spaceType || 'Space'}
                    </span>
                    {membershipTier && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                        {membershipTier.discountPercent}% OFF
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 truncate mt-0.5">
                    {space.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    From <span className="font-bold text-slate-900">₹{formatInr(space.fromPrice)}</span>/hr
                  </p>
                </div>
              </div>

              {/* 1. Purpose (Dropdown) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Purpose <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={purpose}
                    onChange={e => setPurpose(e.target.value)}
                    className="w-full h-[42px] px-3.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#6344E7] focus:ring-1 focus:ring-[#6344E7] bg-white cursor-pointer appearance-none pr-9 text-slate-900 shadow-2xs"
                  >
                    {POPULAR_PURPOSES.map(p => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                {purpose.toLowerCase() === 'other' && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-150">
                    <input
                      type="text"
                      value={customPurpose}
                      onChange={e => setCustomPurpose(e.target.value)}
                      placeholder="Specify your purpose (e.g. Photography, Dance, Workshop...)"
                      className="w-full h-[42px] px-3.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#6344E7] focus:ring-1 focus:ring-[#6344E7] bg-white text-slate-900 shadow-2xs"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* 2. Guest Count (Only count with no suggestions) */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#6344E7] shadow-2xs">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 leading-tight">Total Guests</p>
                      <p className="text-[11px] font-normal text-slate-500 leading-tight">Number of attendees</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setGuestCount(prev => Math.max(1, prev - 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-bold cursor-pointer text-sm active:scale-95 transition"
                      aria-label="Decrease guest count"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={guestCount === 0 ? '' : guestCount}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '') setGuestCount(0);
                        else {
                          const num = parseInt(val, 10);
                          if (!isNaN(num)) setGuestCount(Math.max(1, num));
                        }
                      }}
                      onBlur={() => {
                        if (guestCount < 1) setGuestCount(1);
                      }}
                      className="w-12 text-center text-xs sm:text-sm font-bold text-slate-900 bg-white border border-slate-200 rounded-xl py-1 focus:outline-hidden focus:border-[#6344E7]"
                    />
                    <button
                      type="button"
                      onClick={() => setGuestCount(prev => prev + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-bold cursor-pointer text-sm active:scale-95 transition"
                      aria-label="Increase guest count"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Date & Hours Required */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 truncate">
                    Select Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      min={todayIso}
                      value={bookingDate}
                      onChange={e => setBookingDate(e.target.value)}
                      required
                      className="w-full h-[42px] px-3 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#6344E7] focus:ring-1 focus:ring-[#6344E7] bg-white text-slate-900 cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 truncate">
                      Hours Required <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-semibold text-slate-400">Min 1 hr</span>
                  </div>
                  <div className="flex h-[42px] items-center justify-between rounded-xl border border-slate-200 bg-white px-2">
                    <button
                      type="button"
                      onClick={() => handleDurationChange(Math.max(1, durationHours - 1))}
                      disabled={durationHours <= 1}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm active:scale-95 transition cursor-pointer"
                      title="Decrease hours"
                    >
                      -
                    </button>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={18}
                        value={durationHours}
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val)) {
                            handleDurationChange(Math.max(1, Math.min(18, val)));
                          }
                        }}
                        className="w-7 sm:w-8 text-center text-xs font-bold text-slate-900 bg-transparent focus:outline-hidden"
                      />
                      <span className="text-xs font-semibold text-slate-600">
                        {durationHours === 1 ? 'Hr' : 'Hrs'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDurationChange(Math.min(18, durationHours + 1))}
                      disabled={durationHours >= 18}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm active:scale-95 transition cursor-pointer"
                      title="Increase hours"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Preferred Time Slot (Custom Timing) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Preferred Time Slot (Custom Timing) <span className="text-rose-500">*</span>
                  </label>
                  <span
                    className={`text-xs font-bold ${
                      isValidTimeRange ? 'text-[#6344E7]' : 'text-rose-500'
                    }`}
                  >
                    {isValidTimeRange ? formattedSlotRange : 'Invalid Range'}
                  </span>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div className="relative">
                    <input
                      type="time"
                      min="06:00"
                      max="23:59"
                      value={startTime}
                      onChange={e => handleStartTimeChange(e.target.value)}
                      className="w-full h-[42px] px-3 text-xs font-semibold text-slate-900 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-[#6344E7] focus:ring-1 focus:ring-[#6344E7] cursor-pointer"
                      title="Start Time"
                      required
                    />
                  </div>

                  <span className="text-xs font-bold text-slate-400 px-1">to</span>

                  <div className="relative">
                    <input
                      type="time"
                      min="06:00"
                      max="23:59"
                      value={endTime === '24:00' ? '00:00' : endTime}
                      onChange={e => handleEndTimeChange(e.target.value)}
                      className="w-full h-[42px] px-3 text-xs font-semibold text-slate-900 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-[#6344E7] focus:ring-1 focus:ring-[#6344E7] cursor-pointer"
                      title="End Time"
                      required
                    />
                  </div>
                </div>

                {/* Quick Slot Presets */}
                <div className="mt-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                  {quickSlots.map(slot => {
                    const isSelected =
                      startTime === slot.start &&
                      (endTime === slot.end || (endTime === '24:00' && slot.end === '00:00'));
                    return (
                      <button
                        key={slot.label}
                        type="button"
                        onClick={() => handleSelectQuickSlot(slot.start, slot.end)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition cursor-pointer border ${
                          isSelected
                            ? 'border-[#6344E7] bg-[#F5F3FF] text-[#6344E7] shadow-2xs font-bold'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>

                {!isValidTimeRange && (
                  <p className="mt-1 text-xs font-semibold text-rose-500">
                    End time must be at least 1 hour after start time.
                  </p>
                )}

                {/* Pricing Breakdown summary */}
                <div className="mt-2.5 flex items-center justify-between rounded-xl bg-[#F5F3FF] border border-[#DDD6FE] p-2.5 text-xs">
                  <div>
                    <span className="text-slate-600 font-medium">Estimated Pricing:</span>{' '}
                    <strong className="text-sm font-black text-[#6344E7]">
                      ₹{formatInr(calculatedTotal)}
                    </strong>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    ₹{formatInr(finalHourlyPrice)}/hr × {durationHours}h
                    {unitDiscount > 0 && ` (${membershipTier?.discountPercent}% OFF)`}
                  </div>
                </div>
              </div>

              {/* Section Divider */}
              <div className="pt-2 border-t border-slate-100 space-y-4">
                {/* 5. Additional Services (Scrollable in one row) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Additional Services (Optional)
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Scroll sideways
                    </span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
                    {AVAILABLE_SERVICES.map(srv => {
                      const Icon = srv.icon;
                      const isSelected = selectedServices.includes(srv.label);
                      return (
                        <button
                          type="button"
                          key={srv.id}
                          onClick={() => toggleService(srv.label)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border shrink-0 text-left transition cursor-pointer whitespace-nowrap ${
                            isSelected
                              ? 'bg-[#F5F3FF] border-[#6344E7] text-[#6344E7] shadow-2xs font-semibold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold ${
                              isSelected
                                ? 'bg-[#6344E7] border-[#6344E7] text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected ? <Check size={11} strokeWidth={3} /> : null}
                          </div>
                          <Icon size={14} className="shrink-0" />
                          <span className="text-xs">{srv.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 6. Food (Only Veg) */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-3.5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-2xs">
                        <Utensils className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-800 leading-tight">Food (Only Veg)</p>
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-black text-emerald-700">
                            <ShieldCheck size={10} />
                            Only Veg
                          </span>
                        </div>
                        <p className="text-[11px] font-normal text-slate-500 leading-tight">Require catering or snacks?</p>
                      </div>
                    </div>

                    {/* Yes / No Toggle */}
                    <div className="flex rounded-xl bg-slate-200/80 p-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setIncludeFood(false);
                          setSelectedFoodItems([]);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          !includeFood
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => setIncludeFood(true)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          includeFood
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Yes
                      </button>
                    </div>
                  </div>

                  {/* If Yes: Starter, Drinks, Main Course, Quick Bites */}
                  {includeFood && (
                    <motion.div
                      initial={{opacity: 0, height: 0}}
                      animate={{opacity: 1, height: 'auto'}}
                      exit={{opacity: 0, height: 0}}
                      className="pt-2 border-t border-slate-200/60"
                    >
                      <p className="text-xs font-semibold text-slate-600 mb-2">
                        Select Required Veg Food Categories:
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {FOOD_OPTIONS.map(opt => {
                          const isSelected = selectedFoodItems.includes(opt.label);
                          return (
                            <button
                              type="button"
                              key={opt.id}
                              onClick={() => toggleFoodItem(opt.label)}
                              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                                isSelected
                                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-2xs font-bold'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <div
                                className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[9px] font-black ${
                                  isSelected
                                    ? 'border-emerald-600 bg-emerald-600 text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected ? <Check size={10} strokeWidth={3} /> : null}
                              </div>
                              <span className="truncate">{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Submit Action */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#6344E7] hover:bg-[#5235D9] text-white text-sm sm:text-base font-bold shadow-md shadow-purple-500/25 transition active:scale-95 cursor-pointer"
                >
                  <Send size={16} />
                  <span>Book on WhatsApp · ₹{formatInr(calculatedTotal)}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

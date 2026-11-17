import {useState, useEffect, useMemo} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
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
  Plus,
  Minus,
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
  'Show',
  'Workshop',
  'Shoot',
  'Meeting',
  'Party',
  'Performance',
  'Exhibition',
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
  {id: 'drinks', label: 'Drinks / Beverages'},
  {id: 'main_course', label: 'Main Course'},
  {id: 'quick_bites', label: 'Quick Bites'},
];

const TIME_SLOTS = [
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
  '23:00',
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

function calculateDurationHours(start: string, end: string): number {
  const [sh = 0, sm = 0] = start.split(':').map(Number);
  const [eh = 0, em = 0] = end.split(':').map(Number);
  const sMin = sh * 60 + sm;
  const eMin = eh * 60 + em;
  const diffMin = eMin >= sMin ? eMin - sMin : 24 * 60 - sMin + eMin;
  return Math.max(0.5, Math.round((diffMin / 60) * 10) / 10);
}

export function SpaceBookingModal({
  space,
  isOpen,
  onClose,
  initialDate,
  initialStartTime,
  initialEndTime,
  membershipTier,
}: SpaceBookingModalProps) {
  const [purpose, setPurpose] = useState('Show');
  const [customPurpose, setCustomPurpose] = useState('');
  const [guestCount, setGuestCount] = useState<number>(60);
  const [bookingDate, setBookingDate] = useState<string>('');
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('09:00');

  // Additional options
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [includeFood, setIncludeFood] = useState(false);
  const [selectedFoodItems, setSelectedFoodItems] = useState<string[]>([]);

  // Initialize/Reset state when modal opens or space changes
  useEffect(() => {
    if (!isOpen || !space) return;

    setPurpose('Show');
    setCustomPurpose('');
    setGuestCount(space.capacity > 0 ? space.capacity : 60);
    setBookingDate(toIsoDate(initialDate));
    setStartTime(initialStartTime || '06:00');
    setEndTime(initialEndTime || '09:00');
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

  const durationHours = useMemo(
    () => calculateDurationHours(startTime, endTime),
    [startTime, endTime],
  );

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

  const handleGuestCountChange = (delta: number) => {
    setGuestCount(prev => Math.max(1, prev + delta));
  };

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!space) return;

    const trimmedPurpose =
      purpose.toLowerCase() === 'other'
        ? (customPurpose.trim() || 'Other')
        : (purpose.trim() || 'Show');
    const formattedDate = formatDisplayDate(bookingDate);
    const durationText = `${durationHours} ${durationHours === 1 ? 'hour' : 'hours'}`;
    const timingText = `${startTime} to ${endTime} (${durationText})`;
    const pricingText = `₹${formatInr(calculatedTotal)}`;
    const effectiveGuests = Math.max(1, guestCount || 1);
    const guestsText = `Up to ${effectiveGuests} ${effectiveGuests === 1 ? 'person' : 'people'}`;
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
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Book Space
                  </h2>
                  <p className="text-xs text-slate-500 font-medium truncate max-w-[220px] sm:max-w-xs">
                    {space.name}
                  </p>
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
                    {space.capacity > 0 && ` · Up to ${space.capacity} people`}
                  </p>
                </div>
              </div>

              {/* Field 1 & 2: Purpose and Guest Count in 50:50 ratio */}
              <div className="grid grid-cols-2 gap-3 items-start">
                {/* Purpose Column */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 truncate">
                    Purpose <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={purpose}
                      onChange={e => setPurpose(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-8 text-xs sm:text-sm font-bold text-slate-900 focus:border-[#6344E7] focus:outline-hidden focus:ring-2 focus:ring-[#6344E7]/20 cursor-pointer shadow-2xs"
                    >
                      {POPULAR_PURPOSES.map(p => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-slate-400">
                      <ChevronDown size={15} className="stroke-[2.5]" />
                    </div>
                  </div>
                </div>

                {/* Guest Count Column */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-1 text-xs font-bold text-slate-700 truncate">
                      <Users size={13} className="text-slate-500 shrink-0" />
                      <span>Guest Count <span className="text-rose-500">*</span></span>
                    </label>
                    {space.capacity > 0 && (
                      <span className="text-[10px] font-semibold text-slate-400 truncate hidden sm:inline">
                        Max {space.capacity}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-1 w-full">
                    <button
                      type="button"
                      onClick={() => handleGuestCountChange(-1)}
                      className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-white text-slate-700 shadow-2xs hover:bg-slate-100 transition cursor-pointer shrink-0"
                      title="Decrease guest count"
                      aria-label="Decrease guest count"
                    >
                      <Minus size={14} strokeWidth={2.5} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={space.capacity > 0 ? space.capacity * 2 : 1000}
                      value={guestCount === 0 ? '' : guestCount}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '') {
                          setGuestCount(0);
                        } else {
                          const num = parseInt(val, 10);
                          if (!isNaN(num)) setGuestCount(Math.max(1, num));
                        }
                      }}
                      onBlur={() => {
                        if (guestCount < 1) setGuestCount(1);
                      }}
                      placeholder="1"
                      className="w-full flex-1 bg-transparent text-center text-xs sm:text-sm font-black text-slate-900 focus:outline-hidden [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
                    />
                    <button
                      type="button"
                      onClick={() => handleGuestCountChange(1)}
                      className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-white text-slate-700 shadow-2xs hover:bg-slate-100 transition cursor-pointer shrink-0"
                      title="Increase guest count"
                      aria-label="Increase guest count"
                    >
                      <Plus size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                {/* If "Other" is selected, open placeholder input spanning across */}
                {purpose.toLowerCase() === 'other' && (
                  <div className="col-span-2 -mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <input
                      type="text"
                      value={customPurpose}
                      onChange={e => setCustomPurpose(e.target.value)}
                      placeholder="Specify your purpose (e.g. Photography, Dance, Workshop, Podcast...)"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:border-[#6344E7] focus:outline-hidden focus:ring-2 focus:ring-[#6344E7]/20 placeholder:text-slate-400 shadow-2xs"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* Field 3: Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <Calendar size={16} />
                  </div>
                  <input
                    type="date"
                    min={todayIso}
                    value={bookingDate}
                    onChange={e => setBookingDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:border-[#6344E7] focus:outline-hidden focus:ring-2 focus:ring-[#6344E7]/20"
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Selected: <strong className="text-slate-800">{formatDisplayDate(bookingDate)}</strong></span>
                  <span className={`font-semibold ${isWeekend ? 'text-amber-600' : 'text-slate-600'}`}>
                    {isWeekend ? 'Weekend rate applies' : 'Weekday rate applies'}
                  </span>
                </div>
              </div>

              {/* Field 4: Time (Start Time & End Time) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Timing <span className="text-rose-500">*</span>
                  </label>
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-[#6344E7]">
                    <Clock size={11} />
                    {durationHours} {durationHours === 1 ? 'hour' : 'hours'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-500 mb-1">Start Time</span>
                    <select
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 focus:border-[#6344E7] focus:outline-hidden"
                    >
                      {TIME_SLOTS.map(t => (
                        <option key={`start-${t}`} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-500 mb-1">End Time</span>
                    <select
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 focus:border-[#6344E7] focus:outline-hidden"
                    >
                      {TIME_SLOTS.map(t => (
                        <option key={`end-${t}`} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pricing Breakdown summary */}
                <div className="mt-2 flex items-center justify-between rounded-xl bg-purple-50/70 border border-purple-100 p-2.5 text-xs">
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
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                  Additional Add-ons
                </h4>

                {/* Additional Services - Sideways scroll & select */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Services
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Scroll sideways to select
                    </span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2 pt-0.5 -mx-1 px-1">
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
                              ? 'bg-purple-50/90 border-[#6344E7] text-[#6344E7] shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                              isSelected ? 'bg-[#6344E7] text-white' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {isSelected ? <Check size={12} strokeWidth={3} /> : <Icon size={12} />}
                          </div>
                          <span className="text-xs font-semibold">{srv.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Food (Only Veg) */}
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                        <Utensils size={14} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900">Food & Catering</span>
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-black text-emerald-700">
                            <ShieldCheck size={10} />
                            Only Veg
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">Strictly vegetarian catering options</p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeFood}
                        onChange={e => setIncludeFood(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {/* Food items when enabled - sideways scroll & select */}
                  {includeFood && (
                    <div className="mt-3 pt-2.5 border-t border-emerald-100/80">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="block text-[11px] font-bold text-slate-700">
                          Select food items:
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Scroll sideways
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1.5 -mx-1 px-1">
                        {FOOD_OPTIONS.map(item => {
                          const isSelected = selectedFoodItems.includes(item.label);
                          return (
                            <button
                              type="button"
                              key={item.id}
                              onClick={() => toggleFoodItem(item.label)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border shrink-0 text-left transition cursor-pointer whitespace-nowrap ${
                                isSelected
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                  : 'bg-white text-slate-700 border-emerald-200/60 hover:bg-emerald-50/50'
                              }`}
                            >
                              <div
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border ${
                                  isSelected
                                    ? 'bg-white text-emerald-600 border-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected && <Check size={10} strokeWidth={3} />}
                              </div>
                              <span className="text-xs font-semibold">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
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

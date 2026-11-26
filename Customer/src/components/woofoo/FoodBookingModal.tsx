import {useEffect, useState, type FormEvent} from 'react';
import {
  X,
  Users,
  Send,
  ChevronDown,
  UtensilsCrossed,
  Coffee,
  Sparkles,
} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';
import Swal from 'sweetalert2';
import {useAuthStore} from '../../store/authStore';
import {recordPortalEnquiry} from '../../services/enquiry.service';

type FoodBookingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  preferredItemName?: string;
};

const POPULAR_DINING_PURPOSES = [
  'Table Reservation & Dine-In',
  'Breakfast & Morning Bites',
  'Coffee & Beverages',
  'Snacks & Quick Bites',
  'Birthday / Party Celebration',
  'Group Meetup & Food Experience',
  'Private Gathering',
  'Other',
];

const FOOD_COURSE_OPTIONS = [
  {id: 'drinks', label: 'Drinks & Beverages'},
  {id: 'starter', label: 'Starters'},
  {id: 'breakfast', label: 'Breakfast'},
  {id: 'main', label: 'Main Course'},
  {id: 'quick', label: 'Quick Bites'},
  {id: 'dessert', label: 'Desserts'},
];

const WOOFOO_WHATSAPP = '918073988123';

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
  return Math.max(0, Math.round(((endM - startM) / 60) * 10) / 10);
};

/** Formats 24-hr "HH:MM" into 12-hr AM/PM format (e.g. "08:00 AM") */
const formatTimeSlotDisplay = (time24: string) => {
  if (!time24) return '08:00 AM';
  const [hStr, mStr] = time24.split(':');
  let h = Number(hStr);
  const m = Number(mStr) || 0;
  if (Number.isNaN(h)) h = 8;
  if (h === 24) h = 0;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
};

/** Generates quick slot presets for the given duration within 08:00 AM – 10:00 PM */
const getQuickSlotsForDuration = (hours: number) => {
  const dur = Math.max(1, Math.min(14, Math.round(hours || 1)));
  const slots: {label: string; start: string; end: string}[] = [];
  const candidateStarts = [8, 11, 13, 16, 18, 20].filter(s => s + dur <= 22);
  if (candidateStarts.length === 0 && 8 + dur <= 22) {
    candidateStarts.push(8);
  }

  candidateStarts.forEach(startH => {
    const endH = startH + dur;
    const startStr = `${String(startH).padStart(2, '0')}:00`;
    const endStr = `${String(endH).padStart(2, '0')}:00`;
    slots.push({
      label: `${formatTimeSlotDisplay(startStr)} – ${formatTimeSlotDisplay(endStr)}`,
      start: startStr,
      end: endStr,
    });
  });
  return slots;
};

export function FoodBookingModal({
  isOpen,
  onClose,
  preferredItemName,
}: FoodBookingModalProps) {
  const customer = useAuthStore(state => state.customer);

  const [purpose, setPurpose] = useState(POPULAR_DINING_PURPOSES[0]);
  const [customPurpose, setCustomPurpose] = useState('');
  const [isPurposeDropdownOpen, setIsPurposeDropdownOpen] = useState(false);
  const [date, setDate] = useState('');
  const [durationHours, setDurationHours] = useState(2);
  const [startTime, setStartTime] = useState('13:00');
  const [endTime, setEndTime] = useState('15:00');
  const [guestsCount, setGuestsCount] = useState(2);
  const [selectedFoodCategories, setSelectedFoodCategories] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default date to tomorrow
  const todayIso = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!isOpen) {
      setIsPurposeDropdownOpen(false);
      return;
    }
    if (!date) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(tomorrow.toISOString().split('T')[0]);
    }
    if (preferredItemName) {
      setNotes(prev => (prev ? prev : `Interested in: ${preferredItemName}`));
    }
  }, [isOpen, preferredItemName]);

  const currentDuration = calcDurationHours(startTime, endTime);
  const isValidTimeRange = currentDuration >= 1;
  const formattedSlotRange = `${formatTimeSlotDisplay(startTime)} – ${formatTimeSlotDisplay(endTime)}`;

  // Handle hours stepper change
  const handleDurationChange = (newHours: number) => {
    setDurationHours(newHours);
    const [startH = 8, startM = 0] = startTime.split(':').map(Number);
    const candidateEndH = startH + newHours;
    if (candidateEndH <= 22) {
      setEndTime(`${String(candidateEndH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`);
    } else {
      const adjustedStart = Math.max(8, 22 - newHours);
      setStartTime(`${String(adjustedStart).padStart(2, '0')}:00`);
      setEndTime('22:00');
    }
  };

  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    const [h = 8, m = 0] = newStart.split(':').map(Number);
    const newEndH = h + durationHours;
    if (newEndH <= 22) {
      setEndTime(`${String(newEndH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    } else {
      setEndTime('22:00');
    }
  };

  const handleEndTimeChange = (newEnd: string) => {
    setEndTime(newEnd);
    const dur = calcDurationHours(startTime, newEnd);
    if (dur >= 1) {
      setDurationHours(Math.round(dur));
    }
  };

  const handleSelectQuickSlot = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
    const dur = calcDurationHours(start, end);
    if (dur >= 1) {
      setDurationHours(Math.round(dur));
    }
  };

  const toggleFoodCategory = (label: string) => {
    setSelectedFoodCategories(prev =>
      prev.includes(label) ? prev.filter(c => c !== label) : [...prev, label]
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!date) {
      Swal.fire({
        icon: 'warning',
        title: 'Select a Date',
        text: 'Please choose your preferred date for food & dining.',
        confirmButtonColor: '#EA580C',
      });
      return;
    }

    if (!isValidTimeRange) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Time Range',
        text: 'Please select a valid time range of at least 1 hour.',
        confirmButtonColor: '#EA580C',
      });
      return;
    }

    setIsSubmitting(true);

    const effectivePurpose =
      purpose === 'Other' && customPurpose.trim() ? customPurpose.trim() : purpose;

    const customerName = customer?.name?.trim();
    const customerPhone = customer?.mobile?.trim();
    const durationLabel = `${durationHours} ${durationHours === 1 ? 'Hour' : 'Hours'}`;
    const timeSlotSummary = `${formatTimeSlotDisplay(startTime)} to ${formatTimeSlotDisplay(endTime)}`;

    const summaryLines = [
      `Food Enquiry & Table Booking: ${effectivePurpose}`,
      `Date: ${date}`,
      `Duration: ${durationLabel} (${timeSlotSummary})`,
      `Total Guests: ${guestsCount}`,
      preferredItemName ? `Featured Dish: ${preferredItemName}` : null,
      selectedFoodCategories.length > 0
        ? `Preferred Categories: ${selectedFoodCategories.join(', ')}`
        : null,
      notes.trim() ? `Notes / Requests: ${notes.trim()}` : null,
      customerName || customerPhone
        ? `Customer: ${customerName || 'Customer'} (${customerPhone || 'N/A'})`
        : null,
    ].filter(Boolean);

    const fullDescription = summaryLines.join('\n');

    // 1. Record lead enquiry in backend
    recordPortalEnquiry({
      enquiryType: 'Store',
      itemName: `Food Enquiry - ${effectivePurpose}`,
      description: fullDescription,
    });

    // 2. Format WhatsApp query
    const waLines = [
      '🍽️ *WooFoo Café - Food Enquiry & Availability*',
      '━━━━━━━━━━━━━━━━━━━━',
      `• *Purpose:* ${effectivePurpose}`,
      `• *Preferred Date:* ${date}`,
      `• *Duration Required:* ${durationLabel}`,
      `• *Preferred Time:* ${timeSlotSummary}`,
      `• *Total Guests:* ${guestsCount} Guests`,
      ...(preferredItemName ? [`• *Featured Dish:* ${preferredItemName}`] : []),
      ...(selectedFoodCategories.length > 0
        ? [`• *Food Categories:* ${selectedFoodCategories.join(', ')}`]
        : []),
      ...(notes.trim() ? [`• *Notes / Requests:* ${notes.trim()}`] : []),
      '━━━━━━━━━━━━━━━━━━━━',
      ...(customerName || customerPhone
        ? [`• *Customer:* ${customerName || ''}${customerPhone ? ` (${customerPhone})` : ''}`]
        : []),
      '',
      '*Please connect with me regarding table reservation and food options.*',
    ];

    const waUrl = `https://wa.me/${WOOFOO_WHATSAPP}?text=${encodeURIComponent(
      waLines.join('\n')
    )}`;

    setIsSubmitting(false);

    // Close and open WhatsApp
    onClose();
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    Swal.fire({
      icon: 'success',
      title: 'Food Enquiry Prepared!',
      text: 'Opening WhatsApp to connect you directly with our food concierge.',
      confirmButtonColor: '#EA580C',
      timer: 3500,
    });
  };

  const quickSlots = getQuickSlotsForDuration(durationHours);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          <motion.div
            initial={{y: '100%'}}
            animate={{y: 0}}
            exit={{y: '100%'}}
            transition={{type: 'spring', damping: 26, stiffness: 240}}
            className="relative z-10 flex w-full max-w-xl max-h-[92dvh] flex-col rounded-t-[32px] sm:rounded-[28px] border border-slate-100 bg-white shadow-2xl overflow-hidden"
          >
            {/* Mobile Drag Indicator */}
            <div className="flex shrink-0 justify-center pt-3 pb-1 sm:hidden">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>

            {/* In-Modal Purpose Selection Overlay (Covers within this modal on mobile) */}
            {isPurposeDropdownOpen && (
              <div className="absolute inset-0 z-30 bg-white flex flex-col sm:hidden animate-in fade-in duration-150">
                <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-orange-50/60 via-white to-white">
                  <span className="text-xs font-semibold text-slate-800">
                    Select Dining Purpose
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPurposeDropdownOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
                    aria-label="Close purpose selection"
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  {POPULAR_DINING_PURPOSES.map(p => {
                    const isSelected = purpose === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setPurpose(p);
                          setIsPurposeDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[10px] font-medium transition cursor-pointer text-left ${
                          isSelected
                            ? 'bg-[#FFF0EB] text-[#EA580C]'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{p}</span>
                        {isSelected && (
                          <span className="text-[10px] font-medium text-[#EA580C]">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-orange-50/60 via-white to-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFF0EB] text-[#EA580C] shadow-xs">
                  <UtensilsCrossed className="h-5 w-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                    Food Enquiry &amp; Availability
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    WooFoo Café · Table &amp; Dining Experience
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

            {/* Modal Form Scrollable Area */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-left">
              {/* Highlight if opened for a specific menu dish */}
              {preferredItemName && (
                <div className="flex items-center gap-2 rounded-2xl bg-orange-50 border border-orange-200/80 p-2.5 sm:p-3 text-xs text-[#EA580C]">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span className="font-semibold">
                    Inquiring for: <strong className="font-bold underline">{preferredItemName}</strong>
                  </span>
                </div>
              )}

              {/* 1. Dining Purpose */}
              <div>
                <label className="block text-[10px] font-medium text-slate-600 mb-1">
                  Dining Purpose / Occasion
                </label>
                {/* Mobile Button: opens in-modal dropdown */}
                <div className="sm:hidden">
                  <button
                    type="button"
                    onClick={() => setIsPurposeDropdownOpen(true)}
                    className="w-full h-9 px-3 text-[10px] font-medium rounded-xl border border-slate-200 bg-white text-slate-800 flex items-center justify-between cursor-pointer text-left focus:outline-hidden focus:border-[#EA580C]"
                  >
                    <span className="truncate">{purpose}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  </button>
                </div>

                {/* Desktop Native Select */}
                <div className="hidden sm:block relative">
                  <select
                    value={purpose}
                    onChange={e => setPurpose(e.target.value)}
                    className="w-full h-9 px-3 text-[10px] font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] bg-white cursor-pointer appearance-none pr-8 text-slate-800"
                  >
                    {POPULAR_DINING_PURPOSES.map(p => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>

                {purpose === 'Other' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={customPurpose}
                      onChange={e => setCustomPurpose(e.target.value)}
                      placeholder="Please specify your dining occasion..."
                      className="w-full h-9 px-3 text-[10px] font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] bg-white text-slate-800"
                    />
                  </div>
                )}
              </div>

              {/* 2. Select Date & Hours Required in Same Row */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-[8px] sm:text-[10px] font-medium text-slate-600 mb-1 truncate">
                    Select Date <span className="text-[#EA580C]">*</span>
                  </label>
                  <input
                    type="date"
                    min={todayIso}
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    required
                    className="w-full h-9 px-2 text-[8px] sm:text-[10px] font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] bg-white text-slate-800 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[8px] sm:text-[10px] font-medium text-slate-600 mb-1 truncate">
                    Duration Required <span className="text-[#EA580C]">*</span>
                  </label>
                  <div className="flex h-9 items-center justify-between rounded-xl border border-slate-200 bg-white px-2">
                    <button
                      type="button"
                      onClick={() => handleDurationChange(Math.max(1, durationHours - 1))}
                      disabled={durationHours <= 1}
                      className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-[8px] sm:text-[10px] active:scale-95 transition cursor-pointer"
                      title="Decrease hours"
                    >
                      -
                    </button>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={durationHours}
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val)) {
                            handleDurationChange(Math.max(1, Math.min(12, val)));
                          }
                        }}
                        className="w-7 sm:w-8 text-center text-[8px] sm:text-[10px] font-medium text-slate-800 bg-transparent focus:outline-none"
                      />
                      <span className="text-[8px] sm:text-[10px] font-medium text-slate-600">
                        {durationHours === 1 ? 'Hour' : 'Hours'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDurationChange(Math.min(12, durationHours + 1))}
                      disabled={durationHours >= 12}
                      className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-[8px] sm:text-[10px] active:scale-95 transition cursor-pointer"
                      title="Increase hours"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Custom Time Slot Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[8px] sm:text-[10px] font-medium text-slate-600">
                    Select Time Slot <span className="text-[#EA580C]">*</span>
                  </label>
                  <span
                    className={`text-[8px] sm:text-[10px] font-medium ${
                      isValidTimeRange ? 'text-[#EA580C]' : 'text-rose-500'
                    }`}
                  >
                    {isValidTimeRange ? formattedSlotRange : 'Invalid Range'}
                  </span>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-2">
                  {/* Start Time Input */}
                  <div className="relative">
                    <input
                      type="time"
                      min="08:00"
                      max="22:00"
                      value={startTime}
                      onChange={e => handleStartTimeChange(e.target.value)}
                      className="w-full h-9 px-2 text-[8px] sm:text-[10px] font-medium text-slate-800 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] cursor-pointer"
                      title="Start Time"
                      required
                    />
                  </div>

                  <span className="text-[8px] sm:text-[10px] font-medium text-slate-400 px-1 text-center">to</span>

                  {/* End Time Input */}
                  <div className="relative">
                    <input
                      type="time"
                      min="08:00"
                      max="22:00"
                      value={endTime === '24:00' ? '22:00' : endTime}
                      onChange={e => handleEndTimeChange(e.target.value)}
                      className="w-full h-9 px-2 text-[8px] sm:text-[10px] font-medium text-slate-800 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] cursor-pointer"
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
                        className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-medium shrink-0 transition cursor-pointer border ${
                          isSelected
                            ? 'border-[#EA580C] bg-[#FFF0EB] text-[#EA580C]'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>

                {!isValidTimeRange && (
                  <p className="mt-1 text-[11px] sm:text-xs font-medium text-rose-500">
                    End time must be at least 1 hour after start time (within 08:00 AM – 10:00 PM).
                  </p>
                )}
              </div>

              {/* 4. Total Guests */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-2.5 sm:p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#EA580C] shadow-2xs">
                      <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700 leading-tight">Total Guests</p>
                      <p className="text-[11px] sm:text-xs font-normal text-slate-500 leading-tight">Number of people dining</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setGuestsCount(prev => Math.max(1, prev - 1))}
                      className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-medium cursor-pointer text-[11px] sm:text-xs active:scale-95 transition"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={guestsCount}
                      onChange={e => setGuestsCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-10 sm:w-12 text-center text-[11px] sm:text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-xl py-0.5 sm:py-1 focus:outline-hidden focus:border-[#EA580C]"
                    />
                    <button
                      type="button"
                      onClick={() => setGuestsCount(prev => prev + 1)}
                      className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-medium cursor-pointer text-[11px] sm:text-xs active:scale-95 transition"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. Food Categories / Preferences (One Row Scrollable) */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  Interested Food / Beverage Categories
                </label>
                <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
                  {FOOD_COURSE_OPTIONS.map(opt => {
                    const isChecked = selectedFoodCategories.includes(opt.label);
                    return (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => toggleFoodCategory(opt.label)}
                        className={`flex items-center gap-2 py-2 px-3 rounded-xl border text-left transition shrink-0 cursor-pointer ${
                          isChecked
                            ? 'border-[#EA580C] bg-[#FFF0EB] text-[#EA580C] shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border text-[10px] font-medium ${
                            isChecked
                              ? 'border-[#EA580C] bg-[#EA580C] text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked ? '✓' : ''}
                        </div>
                        <Coffee className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-xs font-medium whitespace-nowrap">
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. Additional Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Additional Notes or Dietary Requests
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Need window seating, celebration cake, specific items from menu..."
                  className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-[#EA580C] text-slate-800 placeholder:text-slate-400"
                />
              </div>

              {/* 7. Submit Button: "Submit Query" */}
              <div className="pt-2 pb-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#EA580C] to-[#D97706] hover:from-[#D97706] hover:to-[#EA580C] text-white text-sm font-medium flex items-center justify-center gap-2 shadow-md shadow-orange-500/25 transition active:scale-[0.99] cursor-pointer disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  <span>Submit Query</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default FoodBookingModal;

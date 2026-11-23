import {useEffect, useState, type FormEvent} from 'react';
import {
  X,
  MapPin,
  Users,
  Baby,
  Sparkles,
  Palette,
  PartyPopper,
  GraduationCap,
  Frame,
  Send,
  ChevronDown,
} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';
import Swal from 'sweetalert2';
import {useAuthStore} from '../../store/authStore';
import {recordPortalEnquiry} from '../../services/enquiry.service';

export type ServiceTypeCategory = 'birthday' | 'classes' | 'framing';

type ServiceQueryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: ServiceTypeCategory;
  initialServiceName?: string;
};

const CITIES = [
  'Raipur',
  'Bhilai',
  'Durg',
  'Rajnandgaon',
  'Jagdalpur',
  'Bilaspur',
  'Kanker',
  'Dhamtari',
];

const SERVICES_WHATSAPP = '918073988123';

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
  const candidateStarts = [8, 11, 14, 17, 19].filter(s => s + dur <= 22);
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

export function ServiceQueryModal({
  isOpen,
  onClose,
  initialCategory = 'birthday',
  initialServiceName = '',
}: ServiceQueryModalProps) {
  const customer = useAuthStore(state => state.customer);

  const [category, setCategory] = useState<ServiceTypeCategory>(initialCategory);
  const [serviceName, setServiceName] = useState(initialServiceName);
  const [city, setCity] = useState(CITIES[0]);
  const [date, setDate] = useState('');
  const [durationHours, setDurationHours] = useState(3);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('11:00');

  // Guest counters (Adults & Kids)
  const [adultsCount, setAdultsCount] = useState(2);
  const [kidsCount, setKidsCount] = useState(0);

  // Classes specific
  const [classSubject, setClassSubject] = useState<'sketching' | 'painting' | 'both'>('painting');
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'advanced'>('beginner');
  const [schedule, setSchedule] = useState<'weekday' | 'weekend'>('weekend');

  // Framing specific
  const [framingType, setFramingType] = useState<'painting' | 'sketching' | 'photography' | 'other'>('painting');
  const [framingQuantity, setFramingQuantity] = useState(1);

  // Notes
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tomorrow's date as default min
  const todayIso = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!isOpen) return;
    setCategory(initialCategory);
    setServiceName(initialServiceName);
    if (!date) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(tomorrow.toISOString().split('T')[0]);
    }
  }, [isOpen, initialCategory, initialServiceName]);

  const currentDuration = calcDurationHours(startTime, endTime);
  const isValidTimeRange = currentDuration >= 1;
  const formattedSlotRange = `${formatTimeSlotDisplay(startTime)} – ${formatTimeSlotDisplay(endTime)}`;

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

    const [sh = 8, sm = 0] = newStart.split(':').map(Number);
    const startM = sh * 60 + sm;
    let endM = startM + Math.round(durationHours * 60);

    if (endM > 22 * 60) {
      endM = 22 * 60;
      const dur = Math.max(0.5, Math.round(((endM - startM) / 60) * 10) / 10);
      setDurationHours(dur);
    }

    const endH = Math.floor(endM / 60);
    const endMin = endM % 60;
    setEndTime(
      `${String(endH).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (category === 'birthday') {
      if (!date) {
        Swal.fire({
          icon: 'warning',
          title: 'Date Required',
          text: 'Please pick your preferred date.',
          confirmButtonColor: '#EA580C',
        });
        return;
      }

      if (!isValidTimeRange || durationHours < 1) {
        Swal.fire({
          icon: 'warning',
          title: 'Invalid Time Slot',
          text: 'Please ensure your end time is after start time with at least 1 hour duration.',
          confirmButtonColor: '#EA580C',
        });
        return;
      }
    }

    setIsSubmitting(true);

    const categoryLabel =
      category === 'birthday'
        ? 'Birthday / Creative Event'
        : category === 'classes'
        ? 'Classes & Courses'
        : 'Photo Framing';

    const classSubjectLabel =
      classSubject === 'sketching'
        ? 'Sketching'
        : classSubject === 'painting'
        ? 'Painting'
        : 'Both (Sketching & Painting)';

    const framingTypeLabel =
      framingType === 'painting'
        ? 'Painting'
        : framingType === 'sketching'
        ? 'Sketching'
        : framingType === 'photography'
        ? 'Photography'
        : 'Other Art';

    const cleanPhone = (customer?.mobile || '').replace(/\D/g, '').slice(-10);
    const customerDisplayName = (customer?.name || '').trim();

    const durationLabel = `${durationHours} ${durationHours === 1 ? 'Hour' : 'Hours'}`;
    const timeSlotSummary = `${formattedSlotRange} (${durationLabel})`;

    // Summary description for DB lead
    const summaryLines = [
      `Service: ${categoryLabel} ${serviceName ? `(${serviceName})` : ''}`,
      category === 'birthday' ? `City: ${city}` : null,
      category === 'birthday' ? `Date: ${date}` : null,
      category === 'birthday' ? `Hours Required: ${durationLabel}` : null,
      category === 'birthday' ? `Time Slot: ${timeSlotSummary}` : null,
      category === 'birthday' ? `Guests: ${adultsCount} Adults, ${kidsCount} Kids` : null,
      category === 'classes'
        ? `Classes: ${classSubjectLabel} | Level: ${skillLevel} | Schedule: ${schedule}`
        : null,
      category === 'framing'
        ? `Framing: ${framingTypeLabel} | Quantity: ${framingQuantity}`
        : null,
      notes.trim() ? `Notes: ${notes.trim()}` : null,
      customerDisplayName ? `Customer: ${customerDisplayName}${cleanPhone ? ` (${cleanPhone})` : ''}` : null,
    ].filter(Boolean);

    const fullDescription = summaryLines.join('\n');

    // 1. Record lead enquiry in backend
    recordPortalEnquiry({
      enquiryType: 'Service',
      itemName: `${categoryLabel}${category === 'birthday' ? ` - ${city}` : ''}`,
      description: fullDescription,
    });

    // 2. Format WhatsApp query
    const waLines = [
      '🎨 *WooWoo Art House - Service Enquiry*',
      '━━━━━━━━━━━━━━━━━━━━',
      `• *Service:* ${categoryLabel}${serviceName ? ` - ${serviceName}` : ''}`,
      ...(category === 'birthday'
        ? [
            `• *City:* ${city}`,
            `• *Date:* ${date}`,
            `• *Hours Required:* ${durationLabel}`,
            `• *Preferred Time:* ${timeSlotSummary}`,
            `• *Guests:* ${adultsCount} Adults · ${kidsCount} Kids`,
          ]
        : []),
      ...(category === 'classes'
        ? [
            `• *Class Type:* ${classSubjectLabel}`,
            `• *Skill Level:* ${skillLevel.toUpperCase()}`,
            `• *Schedule:* ${schedule.toUpperCase()}`,
          ]
        : []),
      ...(category === 'framing'
        ? [
            `• *Framing Item:* ${framingTypeLabel}`,
            `• *Quantity:* ${framingQuantity} Frame(s)`,
          ]
        : []),
      ...(notes.trim() ? [`• *Special Requests:* ${notes.trim()}`] : []),
      ...((customerDisplayName || cleanPhone)
        ? [
            '━━━━━━━━━━━━━━━━━━━━',
            `• *Customer:* ${customerDisplayName || 'Customer'}${cleanPhone ? ` (${cleanPhone})` : ''}`,
          ]
        : []),
    ];

    const waUrl = `https://wa.me/${SERVICES_WHATSAPP}?text=${encodeURIComponent(
      waLines.join('\n')
    )}`;

    setIsSubmitting(false);

    // Close and open WhatsApp
    onClose();
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    Swal.fire({
      icon: 'success',
      title: 'Enquiry Sent!',
      text: 'Your service request has been submitted. We will connect with you shortly on WhatsApp.',
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

          {/* Modal Card */}
          <motion.div
            initial={{y: '100%'}}
            animate={{y: 0}}
            exit={{y: '100%'}}
            transition={{type: 'spring', damping: 26, stiffness: 240}}
            className="relative z-10 flex w-full max-w-lg max-h-[92dvh] flex-col rounded-t-[32px] sm:rounded-[32px] bg-white shadow-2xl overflow-hidden border border-slate-100"
          >
            {/* Mobile Drag Indicator */}
            <div className="flex shrink-0 justify-center pt-3 pb-1 sm:hidden">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>

            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between px-5 pt-3 pb-3 border-b border-slate-100 bg-gradient-to-r from-orange-50/60 via-white to-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0EB] text-[#EA580C] shadow-xs">
                  <Sparkles className="h-5 w-5" strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                    Service Enquiry
                  </h3>
                  <p className="text-xs font-normal text-slate-500 leading-none mt-0.5">
                    Select service, timing &amp; location
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-4.5 w-4.5" strokeWidth={2.5} />
              </button>
            </div>

            {/* Modal Form Scrollable Area */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-y-auto p-5 text-left">
              <div className="space-y-4">
                {/* Category Segmented Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Select Service
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setCategory('birthday')}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition cursor-pointer ${
                        category === 'birthday'
                          ? 'border-[#EA580C] bg-[#FFF0EB] text-[#EA580C] shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <PartyPopper className="h-5 w-5 mb-1" />
                      <span className="text-xs font-semibold leading-tight">Birthday Event</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategory('classes')}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition cursor-pointer ${
                        category === 'classes'
                          ? 'border-[#EA580C] bg-[#FFF0EB] text-[#EA580C] shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <GraduationCap className="h-5 w-5 mb-1" />
                      <span className="text-xs font-semibold leading-tight">Classes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategory('framing')}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition cursor-pointer ${
                        category === 'framing'
                          ? 'border-[#EA580C] bg-[#FFF0EB] text-[#EA580C] shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <Frame className="h-5 w-5 mb-1" />
                      <span className="text-xs font-semibold leading-tight">Photo Framing</span>
                    </button>
                  </div>
                </div>

                {/* Birthday Event: City, Date & Hours Required, Time Slot, and Guest Count */}
                {category === 'birthday' && (
                  <>
                    {/* City Selection */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        City Location <span className="text-[#EA580C]">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#EA580C]" />
                        <select
                          value={city}
                          onChange={e => setCity(e.target.value)}
                          className="w-full h-[42px] rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-xs font-semibold text-slate-800 appearance-none outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] cursor-pointer"
                        >
                          {CITIES.map(c => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      </div>
                    </div>

                    {/* Date & Hours Required in Same Row */}
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 truncate">
                          Select Date <span className="text-[#EA580C]">*</span>
                        </label>
                        <input
                          type="date"
                          min={todayIso}
                          value={date}
                          onChange={e => setDate(e.target.value)}
                          required
                          className="w-full h-[42px] px-3 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] bg-white text-slate-800 cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 truncate">
                          Hours Required <span className="text-[#EA580C]">*</span>
                        </label>
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
                              className="w-8 sm:w-10 text-center text-xs font-semibold text-slate-800 bg-transparent focus:outline-none"
                            />
                            <span className="text-xs font-semibold text-slate-600">
                              {durationHours === 1 ? 'Hour' : 'Hours'}
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

                    {/* Preferred Time Slot (Custom Timing) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                         Select Time Slot  <span className="text-[#EA580C]">*</span>
                        </label>
                        <span
                          className={`text-xs font-bold ${
                            isValidTimeRange ? 'text-[#EA580C]' : 'text-rose-500'
                          }`}
                        >
                          {isValidTimeRange ? formattedSlotRange : 'Invalid Range'}
                        </span>
                      </div>

                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        {/* Start Time Input */}
                        <div className="relative">
                          <input
                            type="time"
                            min="08:00"
                            max="22:00"
                            value={startTime}
                            onChange={e => handleStartTimeChange(e.target.value)}
                            className="w-full h-[42px] px-3 text-xs font-semibold text-slate-800 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] cursor-pointer"
                            title="Start Time"
                            required
                          />
                        </div>

                        <span className="text-xs font-bold text-slate-400 px-1">to</span>

                        {/* End Time Input */}
                        <div className="relative">
                          <input
                            type="time"
                            min="08:00"
                            max="22:00"
                            value={endTime === '24:00' ? '22:00' : endTime}
                            onChange={e => handleEndTimeChange(e.target.value)}
                            className="w-full h-[42px] px-3 text-xs font-semibold text-slate-800 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] cursor-pointer"
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
                        <p className="mt-1 text-xs font-semibold text-rose-500">
                          End time must be at least 1 hour after start time (within 08:00 AM – 10:00 PM).
                        </p>
                      )}
                    </div>

                    {/* People Count: Adults & Kids */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Guest Count
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        {/* Adults */}
                        <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/50">
                          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                            <Users className="h-4 w-4 text-[#EA580C] shrink-0" />
                            <span className="text-xs font-semibold text-slate-700 truncate">Adults</span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setAdultsCount(prev => Math.max(1, prev - 1))}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-5 text-center text-xs font-semibold text-slate-800">
                              {adultsCount}
                            </span>
                            <button
                              type="button"
                              onClick={() => setAdultsCount(prev => prev + 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Kids */}
                        <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/50">
                          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                            <Baby className="h-4 w-4 text-[#7C3AED] shrink-0" />
                            <span className="text-xs font-semibold text-slate-700 truncate">Kids</span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setKidsCount(prev => Math.max(0, prev - 1))}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-5 text-center text-xs font-semibold text-slate-800">
                              {kidsCount}
                            </span>
                            <button
                              type="button"
                              onClick={() => setKidsCount(prev => prev + 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* DYNAMIC SECTION 1: Classes & Courses */}
                {category === 'classes' && (
                  <div className="p-3.5 rounded-2xl bg-[#FFF8F2] border border-[#FFEDD5] space-y-3">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-[#EA580C]" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#EA580C]">
                        Class Specifics
                      </h4>
                    </div>

                    {/* Sketch or Painting? */}
                    <div>
                      <label className="block text-xs font-semibold text-[#7C2D12] mb-1.5">
                        Subject: Sketch or Painting?
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          {id: 'sketching', label: '✏️ Sketching'},
                          {id: 'painting', label: '🎨 Painting'},
                          {id: 'both', label: '🖌️ Both'},
                        ].map(item => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setClassSubject(item.id as any)}
                            className={`py-2 px-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                              classSubject === item.id
                                ? 'bg-[#EA580C] text-white border-[#EA580C] shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-orange-50'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Level & Schedule Grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Beginner or Advanced */}
                      <div>
                        <label className="block text-xs font-semibold text-[#7C2D12] mb-1">
                          Skill Level
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            {id: 'beginner', label: 'Beginner'},
                            {id: 'advanced', label: 'Advanced'},
                          ].map(lvl => (
                            <button
                              key={lvl.id}
                              type="button"
                              onClick={() => setSkillLevel(lvl.id as any)}
                              className={`py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                                skillLevel === lvl.id
                                  ? 'bg-[#EA580C] text-white border-[#EA580C]'
                                  : 'bg-white text-slate-700 border-slate-200'
                              }`}
                            >
                              {lvl.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Weekday or Weekend */}
                      <div>
                        <label className="block text-xs font-semibold text-[#7C2D12] mb-1">
                          Schedule
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            {id: 'weekday', label: 'Weekday'},
                            {id: 'weekend', label: 'Weekend'},
                          ].map(sch => (
                            <button
                              key={sch.id}
                              type="button"
                              onClick={() => setSchedule(sch.id as any)}
                              className={`py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                                schedule === sch.id
                                  ? 'bg-[#EA580C] text-white border-[#EA580C]'
                                  : 'bg-white text-slate-700 border-slate-200'
                              }`}
                            >
                              {sch.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* DYNAMIC SECTION 2: Photo Framing */}
                {category === 'framing' && (
                  <div className="p-3.5 rounded-2xl bg-[#FAF5FF] border border-[#F3E8FF] space-y-3">
                    <div className="flex items-center gap-2">
                      <Frame className="h-4 w-4 text-[#7C3AED]" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#7C3AED]">
                        Framing Details
                      </h4>
                    </div>

                    {/* Is it painting, sketching, photography? */}
                    <div>
                      <label className="block text-xs font-semibold text-[#581C87] mb-1.5">
                        What are you framing?
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          {id: 'painting', label: '🎨 Painting'},
                          {id: 'sketching', label: '✏️ Sketching'},
                          {id: 'photography', label: '📷 Photography'},
                        ].map(type => (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setFramingType(type.id as any)}
                            className={`py-2 px-1 rounded-xl text-xs font-semibold border text-center transition cursor-pointer ${
                              framingType === type.id
                                ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-50'
                            }`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-purple-100">
                      <span className="text-xs font-semibold text-[#581C87]">
                        Frame Quantity
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFramingQuantity(prev => Math.max(1, prev - 1))}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-slate-600 font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-5 text-center text-xs font-semibold text-slate-800">
                          {framingQuantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setFramingQuantity(prev => prev + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-slate-600 font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Special Requests / Notes - for Birthday Event */}
                {category === 'birthday' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Specific Requirements (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Any theme ideas, specific requests, or queries..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#EA580C]"
                    />
                  </div>
                )}
              </div>

              {/* Sticky Submit Button inside form */}
              <div className="pt-4 mt-auto shrink-0">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#EA580C] to-[#D97706] hover:from-[#D97706] hover:to-[#EA580C] text-white text-xs sm:text-[13px] font-extrabold flex items-center justify-center gap-2 transition-all shadow-md shadow-orange-500/25 cursor-pointer disabled:opacity-50"
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

export default ServiceQueryModal;

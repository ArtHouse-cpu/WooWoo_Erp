import {useEffect, useState, type FormEvent} from 'react';
import {
  X,
  Calendar,
  Clock,
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

const TIME_SLOTS = [
  {id: 'morning', label: 'Morning', time: '10:00 AM – 01:00 PM'},
  {id: 'afternoon', label: 'Afternoon', time: '01:00 PM – 05:00 PM'},
  {id: 'evening', label: 'Evening', time: '05:00 PM – 08:00 PM'},
  {id: 'night', label: 'Night', time: '08:00 PM onwards'},
];

const SERVICES_WHATSAPP = '918073988123';

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
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0].label);

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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (category === 'birthday' && !date) {
      Swal.fire({
        icon: 'warning',
        title: 'Date Required',
        text: 'Please pick your preferred date.',
        confirmButtonColor: '#EA580C',
      });
      return;
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

    // Summary description for DB lead
    const summaryLines = [
      `Service: ${categoryLabel} ${serviceName ? `(${serviceName})` : ''}`,
      category === 'birthday' ? `City: ${city}` : null,
      category === 'birthday' ? `Date: ${date} | Time: ${timeSlot}` : null,
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
            `• *Time:* ${timeSlot}`,
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
            className="relative z-10 flex h-[84dvh] max-h-[600px] min-h-[480px] sm:h-[580px] w-full max-w-lg flex-col rounded-t-[32px] sm:rounded-[32px] bg-white shadow-2xl overflow-hidden border border-slate-100"
          >
            {/* Mobile Drag Indicator */}
            <div className="flex shrink-0 justify-center pt-3 pb-1 sm:hidden">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>

            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between px-5 pt-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0EB] text-[#EA580C]">
                  <Sparkles className="h-5 w-5" strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="text-[16px] sm:text-[17px] font-bold tracking-tight text-slate-900 leading-tight">
                    Service Enquiry
                  </h3>
                  <p className="text-[11px] font-medium text-slate-500 leading-none mt-0.5">
                    Select service, timing & location
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6] text-[#4B5563] transition hover:bg-[#E5E7EB]"
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
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Select Service
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCategory('birthday')}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all ${
                      category === 'birthday'
                        ? 'border-[#EA580C] bg-[#FFF8F2] text-[#EA580C] ring-1 ring-[#EA580C]'
                        : 'border-slate-200 bg-white text-[#4B5563] hover:bg-slate-50'
                    }`}
                  >
                    <PartyPopper className="h-5 w-5 mb-1" />
                    <span className="text-[11px] font-semibold leading-tight">Birthday Event</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('classes')}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all ${
                      category === 'classes'
                        ? 'border-[#EA580C] bg-[#FFF8F2] text-[#EA580C] ring-1 ring-[#EA580C]'
                        : 'border-slate-200 bg-white text-[#4B5563] hover:bg-slate-50'
                    }`}
                  >
                    <GraduationCap className="h-5 w-5 mb-1" />
                    <span className="text-[11px] font-semibold leading-tight">Classes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('framing')}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all ${
                      category === 'framing'
                        ? 'border-[#EA580C] bg-[#FFF8F2] text-[#EA580C] ring-1 ring-[#EA580C]'
                        : 'border-slate-200 bg-white text-[#4B5563] hover:bg-slate-50'
                    }`}
                  >
                    <Frame className="h-5 w-5 mb-1" />
                    <span className="text-[11px] font-semibold leading-tight">Photo Framing</span>
                  </button>
                </div>
              </div>

              {/* Birthday Event: City, Date & Time (Same Row), and Guest Count (Adults & Kids) */}
              {category === 'birthday' && (
                <>
                  {/* City Selection */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      City Location *
                    </label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#EA580C]" />
                      <select
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-[13px] font-medium text-slate-800 appearance-none outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C]"
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

                  {/* Date & Time Slot Grid - In the SAME row */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {/* Date Picker */}
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 truncate">
                        Date *
                      </label>
                      <div className="relative">
                        <Calendar className="pointer-events-none absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="date"
                          min={todayIso}
                          value={date}
                          onChange={e => setDate(e.target.value)}
                          required
                          className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-8 sm:pl-10 pr-2 text-[12px] sm:text-[13px] font-medium text-slate-800 outline-none focus:border-[#EA580C]"
                        />
                      </div>
                    </div>

                    {/* Time Slot Picker */}
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 truncate">
                        Time *
                      </label>
                      <div className="relative">
                        <Clock className="pointer-events-none absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <select
                          value={timeSlot}
                          onChange={e => setTimeSlot(e.target.value)}
                          className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-8 sm:pl-10 pr-7 text-[12px] sm:text-[13px] font-medium text-slate-800 appearance-none outline-none focus:border-[#EA580C]"
                        >
                          {TIME_SLOTS.map(slot => (
                            <option key={slot.id} value={slot.label}>
                              {slot.label} ({slot.time})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 sm:right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  {/* People Count: Adults & Kids */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Guest Count
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      {/* Adults */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/50">
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                          <Users className="h-4 w-4 text-[#EA580C] shrink-0" />
                          <span className="text-[12px] font-medium text-slate-700 truncate">Adults</span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setAdultsCount(prev => Math.max(1, prev - 1))}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 font-semibold hover:bg-slate-100 cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-5 text-center text-[13px] font-semibold text-slate-800">
                            {adultsCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => setAdultsCount(prev => prev + 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 font-semibold hover:bg-slate-100 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Kids */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/50">
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                          <Baby className="h-4 w-4 text-[#7C3AED] shrink-0" />
                          <span className="text-[12px] font-medium text-slate-700 truncate">Kids</span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setKidsCount(prev => Math.max(0, prev - 1))}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 font-semibold hover:bg-slate-100 cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-5 text-center text-[13px] font-semibold text-slate-800">
                            {kidsCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => setKidsCount(prev => prev + 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 font-semibold hover:bg-slate-100 cursor-pointer"
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
                    <h4 className="text-[12px] font-semibold uppercase tracking-wider text-[#EA580C]">
                      Class Specifics
                    </h4>
                  </div>

                  {/* Sketch or Painting? */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#7C2D12] mb-1.5">
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
                          className={`py-2 px-2 rounded-xl text-[11px] font-semibold border transition ${
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
                      <label className="block text-[10.5px] font-semibold text-[#7C2D12] mb-1">
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
                            className={`py-1.5 rounded-lg text-[10.5px] font-semibold border transition ${
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
                      <label className="block text-[10.5px] font-semibold text-[#7C2D12] mb-1">
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
                            className={`py-1.5 rounded-lg text-[10.5px] font-semibold border transition ${
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
                    <h4 className="text-[12px] font-semibold uppercase tracking-wider text-[#7C3AED]">
                      Framing Details
                    </h4>
                  </div>

                  {/* Is it painting, sketching, photography? */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#581C87] mb-1.5">
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
                          className={`py-2 px-1 rounded-xl text-[11px] font-semibold border text-center transition ${
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
                    <span className="text-[11.5px] font-semibold text-[#581C87]">
                      Frame Quantity
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFramingQuantity(prev => Math.max(1, prev - 1))}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-slate-600 font-semibold cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-5 text-center text-[13px] font-semibold text-slate-800">
                        {framingQuantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setFramingQuantity(prev => prev + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-slate-600 font-semibold cursor-pointer"
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
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Specific Requirements (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Any theme ideas, specific requests, or queries..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-[12px] font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#EA580C]"
                  />
                </div>
              )}
              </div>

              {/* Sticky Submit Button inside form */}
              <div className="pt-4 mt-auto shrink-0">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-[16px] bg-[#EA580C] text-white text-[14px] font-bold flex items-center justify-center gap-2 hover:bg-[#D97706] transition-all shadow-md cursor-pointer disabled:opacity-50"
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

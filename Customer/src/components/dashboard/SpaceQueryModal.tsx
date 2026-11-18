import {useEffect, useState, type FormEvent} from 'react';
import {
  X,
  Users,
  Sparkles,
  Building,
  Laptop,
  Volume2,
  Video,
  Projector,
  SunMedium,
  Wifi,
  Utensils,
  Send,
  Compass,
  ChevronDown,
} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';
import Swal from 'sweetalert2';
import {useAuthStore} from '../../store/authStore';
import {recordPortalEnquiry} from '../../services/enquiry.service';

export type SpaceTypeSelection = 'Exclusive Space' | 'Coworking' | 'Open / Any Space';

type SpaceQueryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialSpaceType?: SpaceTypeSelection;
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

const TIME_SLOTS = [
  {id: 'morning', label: 'Morning (10:00 AM – 01:00 PM)'},
  {id: 'afternoon', label: 'Afternoon (01:00 PM – 05:00 PM)'},
  {id: 'evening', label: 'Evening (05:00 PM – 08:00 PM)'},
  {id: 'night', label: 'Night (08:00 PM onwards)'},
  {id: 'fullday', label: 'Full Day (10:00 AM – 10:00 PM)'},
];

const ADDITIONAL_SERVICES = [
  {id: 'sound', label: 'Sound System & Mic', icon: Volume2},
  {id: 'projector', label: 'Projector & Screen', icon: Projector},
  {id: 'shoot', label: 'Media / Video Setup', icon: Video},
  {id: 'lighting', label: 'Ambient Lighting', icon: SunMedium},
  {id: 'wifi', label: 'High-Speed Wi-Fi', icon: Wifi},
];

const FOOD_OPTIONS = ['Starter', 'Drinks', 'Main Course', 'Quick Bites'];

const SPACE_WHATSAPP = '918073988123';

export function SpaceQueryModal({
  isOpen,
  onClose,
  initialSpaceType = 'Exclusive Space',
}: SpaceQueryModalProps) {
  const customer = useAuthStore(state => state.customer);

  const [spaceType, setSpaceType] = useState<SpaceTypeSelection>(initialSpaceType);
  const [purpose, setPurpose] = useState(POPULAR_PURPOSES[0]);
  const [customPurpose, setCustomPurpose] = useState('');
  const [city, setCity] = useState(CITIES[0]);
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0].label);
  const [guestsCount, setGuestsCount] = useState(15);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [foodVegRequired, setFoodVegRequired] = useState(false);
  const [selectedFoodItems, setSelectedFoodItems] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default date to tomorrow
  const todayIso = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!isOpen) return;
    setSpaceType(initialSpaceType);
    if (!date) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(tomorrow.toISOString().split('T')[0]);
    }
  }, [isOpen, initialSpaceType]);

  const toggleAmenity = (label: string) => {
    setSelectedAmenities(prev =>
      prev.includes(label) ? prev.filter(item => item !== label) : [...prev, label]
    );
  };

  const toggleFoodItem = (item: string) => {
    setSelectedFoodItems(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!date) {
      Swal.fire({
        icon: 'warning',
        title: 'Date Required',
        text: 'Please select a preferred date.',
        confirmButtonColor: '#EA580C',
      });
      return;
    }

    setIsSubmitting(true);

    const effectivePurpose =
      purpose === 'Other' ? (customPurpose.trim() || 'General Purpose') : purpose;

    const foodSummary = foodVegRequired
      ? `Yes${selectedFoodItems.length > 0 ? ` (${selectedFoodItems.join(', ')})` : ' (Details to be discussed)'}`
      : 'No';

    const customerName = customer?.name?.trim();
    const customerPhone = customer?.mobile ? customer.mobile.replace(/\D/g, '').slice(-10) : '';

    const summaryLines = [
      `Space Type: ${spaceType}`,
      `Purpose: ${effectivePurpose}`,
      `City: ${city}`,
      `Date: ${date}`,
      `Time: ${timeSlot}`,
      `Total Guests: ${guestsCount}`,
      selectedAmenities.length > 0 ? `Additional Services: ${selectedAmenities.join(', ')}` : null,
      `Food (Only Veg): ${foodSummary}`,
      notes.trim() ? `Notes: ${notes.trim()}` : null,
      customerName || customerPhone
        ? `Customer: ${customerName || ''}${customerPhone ? ` (${customerPhone})` : ''}`
        : null,
    ].filter(Boolean);

    const fullDescription = summaryLines.join('\n');

    // 1. Record lead enquiry in backend
    recordPortalEnquiry({
      enquiryType: 'Space',
      itemName: `${spaceType} - ${effectivePurpose}`,
      description: fullDescription,
    });

    // 2. Format WhatsApp query
    const waLines = [
      '🏛️ *WooWoo Art House - Space Enquiry*',
      '━━━━━━━━━━━━━━━━━━━━',
      `• *Space Preference:* ${spaceType}`,
      `• *Purpose:* ${effectivePurpose}`,
      `• *City:* ${city}`,
      `• *Preferred Date:* ${date}`,
      `• *Preferred Time:* ${timeSlot}`,
      `• *Total Guests:* ${guestsCount}`,
      ...(selectedAmenities.length > 0
        ? [`• *Additional Services:* ${selectedAmenities.join(', ')}`]
        : []),
      `• *Food (Only Veg):* ${foodSummary}`,
      ...(notes.trim() ? [`• *Notes / Requests:* ${notes.trim()}`] : []),
      '━━━━━━━━━━━━━━━━━━━━',
      ...(customerName || customerPhone
        ? [`• *Customer:* ${customerName || ''}${customerPhone ? ` (${customerPhone})` : ''}`]
        : []),
      '',
      '*Please connect with me regarding availability and options.*',
    ];

    const waUrl = `https://wa.me/${SPACE_WHATSAPP}?text=${encodeURIComponent(
      waLines.join('\n')
    )}`;

    setIsSubmitting(false);

    // Close and open WhatsApp
    onClose();
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    Swal.fire({
      icon: 'success',
      title: 'Space Enquiry Prepared!',
      text: 'Opening WhatsApp to connect you directly with our space concierge.',
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
            className="relative z-10 flex w-full max-w-xl max-h-[92dvh] flex-col rounded-t-[32px] sm:rounded-[28px] border border-slate-100 bg-white shadow-2xl overflow-hidden"
          >
            {/* Mobile Drag Indicator */}
            <div className="flex shrink-0 justify-center pt-3 pb-1 sm:hidden">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>

            {/* Modal Header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-orange-50/60 via-white to-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFF0EB] text-[#EA580C] shadow-xs">
                  <Compass className="h-5 w-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Space Enquiry &amp; Availability
                  </h3>
                  
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
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 sm:space-y-4.5 text-left">
              {/* 1. Space Type Preference */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                  Space Type Preference
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {id: 'Exclusive Space', label: 'Exclusive', icon: Building, desc: 'Lawn, Hall, Studio'},
                    {id: 'Coworking', label: 'Coworking', icon: Laptop, desc: 'Desks & Cabins'},
                    {id: 'Open / Any Space', label: 'Open / Any', icon: Sparkles, desc: 'Help Me Choose'},
                  ].map(tab => {
                    const Icon = tab.icon;
                    const isSelected = spaceType === tab.id;
                    return (
                      <button
                        type="button"
                        key={tab.id}
                        onClick={() => setSpaceType(tab.id as SpaceTypeSelection)}
                        className={`flex flex-col items-center p-2.5 rounded-2xl border text-center transition cursor-pointer ${
                          isSelected
                            ? 'border-[#EA580C] bg-[#FFF0EB] text-[#EA580C] shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <Icon className="h-4.5 w-4.5 mb-1 stroke-[2.2]" />
                        <span className="text-[12.5px] font-extrabold leading-tight">{tab.label}</span>
                        <span className="text-[9.5px] font-medium text-slate-500 mt-0.5 leading-none">
                          {tab.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Purpose (Dropdown) */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Purpose
                </label>
                <div className="relative">
                  <select
                    value={purpose}
                    onChange={e => setPurpose(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-[13px] font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] bg-white cursor-pointer appearance-none pr-9 text-slate-800"
                  >
                    {POPULAR_PURPOSES.map(p => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                {purpose === 'Other' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={customPurpose}
                      onChange={e => setCustomPurpose(e.target.value)}
                      placeholder="Please specify your event / purpose..."
                      className="w-full px-3.5 py-2.5 text-[13px] font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] bg-white text-slate-800"
                    />
                  </div>
                )}
              </div>

              {/* 3. Select Date | Select Time Slot in Same Row */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 truncate">
                    Select Date
                  </label>
                  <input
                    type="date"
                    min={todayIso}
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 text-[12.5px] sm:text-[13px] font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 truncate">
                    Select Time Slot
                  </label>
                  <div className="relative">
                    <select
                      value={timeSlot}
                      onChange={e => setTimeSlot(e.target.value)}
                      className="w-full px-3 py-2.5 text-[12.5px] sm:text-[13px] font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] bg-white cursor-pointer appearance-none pr-8 truncate text-slate-800"
                    >
                      {TIME_SLOTS.map(slot => (
                        <option key={slot.id} value={slot.label}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* 4. Total Guests */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#EA580C] shadow-2xs">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-extrabold text-slate-900 leading-tight">Total Guests</p>
                      <p className="text-[10.5px] font-medium text-slate-500 leading-tight">Number of attendees</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setGuestsCount(prev => Math.max(1, prev - 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-black cursor-pointer text-base active:scale-95 transition"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={guestsCount}
                      onChange={e => setGuestsCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-14 text-center text-[13px] font-black text-slate-900 bg-white border border-slate-200 rounded-xl py-1 focus:outline-hidden focus:border-[#EA580C]"
                    />
                    <button
                      type="button"
                      onClick={() => setGuestsCount(prev => prev + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-black cursor-pointer text-base active:scale-95 transition"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. Your City / Location (Dropdown) */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Your City / Location
                </label>
                <div className="relative">
                  <select
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-[13px] font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] bg-white cursor-pointer appearance-none pr-9 text-slate-800"
                  >
                    {CITIES.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* 6. Additional Services (One Row Scrollable) */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                  Additional Services (Optional)
                </label>
                <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
                  {ADDITIONAL_SERVICES.map(amenity => {
                    const Icon = amenity.icon;
                    const isChecked = selectedAmenities.includes(amenity.label);
                    return (
                      <button
                        type="button"
                        key={amenity.id}
                        onClick={() => toggleAmenity(amenity.label)}
                        className={`flex items-center gap-2 py-2 px-3 rounded-xl border text-left transition shrink-0 cursor-pointer ${
                          isChecked
                            ? 'border-[#EA580C] bg-[#FFF0EB] text-[#EA580C] shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold ${
                            isChecked
                              ? 'border-[#EA580C] bg-[#EA580C] text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked ? '✓' : ''}
                        </div>
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-[12px] font-bold whitespace-nowrap">
                          {amenity.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 7. Food (Only Veg) */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-2xs">
                      <Utensils className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[13px] font-extrabold text-slate-900 leading-tight">Food (Only Veg)</p>
                      <p className="text-[10.5px] font-medium text-slate-500 leading-tight">Require catering or snacks?</p>
                    </div>
                  </div>

                  {/* Yes / No Toggle */}
                  <div className="flex rounded-xl bg-slate-200/80 p-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setFoodVegRequired(false);
                        setSelectedFoodItems([]);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        !foodVegRequired
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFoodVegRequired(true);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        foodVegRequired
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>

                {/* If Yes: Starter, Drinks, Main Course, Quick Bites */}
                {foodVegRequired && (
                  <motion.div
                    initial={{opacity: 0, height: 0}}
                    animate={{opacity: 1, height: 'auto'}}
                    exit={{opacity: 0, height: 0}}
                    className="pt-2 border-t border-slate-200/60"
                  >
                    <p className="text-[11px] font-bold text-slate-600 mb-2">
                      Select Required Veg Food Categories:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {FOOD_OPTIONS.map(opt => {
                        const isSelected = selectedFoodItems.includes(opt);
                        return (
                          <button
                            type="button"
                            key={opt}
                            onClick={() => toggleFoodItem(opt)}
                            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-[12px] font-bold transition cursor-pointer ${
                              isSelected
                                ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-2xs'
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
                              {isSelected ? '✓' : ''}
                            </div>
                            <span className="truncate">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* 8. Additional Notes */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Additional Notes or Specific Requests
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Need acoustic setup, specific stage decoration, extended hours..."
                  className="w-full px-3.5 py-2.5 text-[13px] font-semibold rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-[#EA580C] text-slate-800 placeholder:text-slate-400"
                />
              </div>

              {/* 9. Submit Button: "Submit Query" */}
              <div className="pt-2 pb-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#EA580C] to-[#D97706] hover:from-[#D97706] hover:to-[#EA580C] text-white text-[14px] font-extrabold flex items-center justify-center gap-2 shadow-md shadow-orange-500/25 transition active:scale-[0.99] cursor-pointer"
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

export default SpaceQueryModal;

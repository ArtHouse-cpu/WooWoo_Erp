import {useEffect, useState, type FormEvent} from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Sparkles,
  Building,
  Laptop,
  PartyPopper,
  Volume2,
  Video,
  Projector,
  SunMedium,
  Wifi,
  Utensils,
  Send,
  User,
  Phone,
  Compass,
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
  'Other',
];

const TIME_SLOTS = [
  {id: 'morning', label: 'Morning (10:00 AM – 01:00 PM)'},
  {id: 'afternoon', label: 'Afternoon (01:00 PM – 05:00 PM)'},
  {id: 'evening', label: 'Evening (05:00 PM – 08:00 PM)'},
  {id: 'night', label: 'Night (08:00 PM onwards)'},
  {id: 'fullday', label: 'Full Day (10:00 AM – 10:00 PM)'},
];

const AMENITIES = [
  {id: 'sound', label: 'Sound System & Mic', icon: Volume2},
  {id: 'projector', label: 'Projector & Screen', icon: Projector},
  {id: 'shoot', label: 'Media / Video Shoot Setup', icon: Video},
  {id: 'lighting', label: 'Special Ambient Lighting', icon: SunMedium},
  {id: 'wifi', label: 'High-Speed Wi-Fi', icon: Wifi},
  {id: 'food', label: 'Veg Catering / Snacks', icon: Utensils},
];

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
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState(CITIES[0]);
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0].label);
  const [guestsCount, setGuestsCount] = useState(15);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default date to tomorrow
  const todayIso = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!isOpen) return;
    setSpaceType(initialSpaceType);
    setName(customer?.name || '');
    setPhone(customer?.mobile || '');
    if (!date) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(tomorrow.toISOString().split('T')[0]);
    }
  }, [isOpen, initialSpaceType, customer]);

  const toggleAmenity = (label: string) => {
    setSelectedAmenities(prev =>
      prev.includes(label) ? prev.filter(item => item !== label) : [...prev, label]
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    if (!name.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Name Required',
        text: 'Please enter your name.',
        confirmButtonColor: '#EA580C',
      });
      return;
    }

    if (!/^\d{10}$/.test(cleanPhone)) {
      Swal.fire({
        icon: 'warning',
        title: 'Valid Phone Required',
        text: 'Please provide a valid 10-digit WhatsApp number.',
        confirmButtonColor: '#EA580C',
      });
      return;
    }

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

    const summaryLines = [
      `Space Type: ${spaceType}`,
      `Purpose: ${effectivePurpose}`,
      `City: ${city}`,
      `Date: ${date}`,
      `Time: ${timeSlot}`,
      `Guests: Up to ${guestsCount} people`,
      selectedAmenities.length > 0 ? `Amenities: ${selectedAmenities.join(', ')}` : null,
      notes.trim() ? `Notes: ${notes.trim()}` : null,
      `Contact: ${name.trim()} (${cleanPhone})`,
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
      `• *Expected Guests:* Up to ${guestsCount} people`,
      ...(selectedAmenities.length > 0
        ? [`• *Required Amenities:* ${selectedAmenities.join(', ')}`]
        : []),
      ...(notes.trim() ? [`• *Notes / Requests:* ${notes.trim()}`] : []),
      '━━━━━━━━━━━━━━━━━━━━',
      `• *Customer:* ${name.trim()} (${cleanPhone})`,
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
                  <h3 className="text-base sm:text-lg font-black text-[#111111] tracking-tight">
                    Space Enquiry & Availability
                  </h3>
                  <p className="text-[11px] sm:text-xs font-semibold text-[#6B7280]">
                    Tell us your plan — our concierge will find the right fit
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
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-left">
              {/* 1. Space Type Preference */}
              <div>
                <label className="block text-[12px] font-black uppercase tracking-wider text-[#6B7280] mb-2">
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
                        <span className="text-[12px] font-extrabold leading-tight">{tab.label}</span>
                        <span className="text-[9px] font-medium text-slate-500 mt-0.5 leading-none">
                          {tab.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Purpose */}
              <div>
                <label className="block text-[12px] font-black uppercase tracking-wider text-[#6B7280] mb-2">
                  What Are You Planning?
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_PURPOSES.map(p => {
                    const isSelected = purpose === p;
                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setPurpose(p)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                          isSelected
                            ? 'border-[#EA580C] bg-[#EA580C] text-white shadow-xs'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                {purpose === 'Other' && (
                  <div className="mt-2.5">
                    <input
                      type="text"
                      value={customPurpose}
                      onChange={e => setCustomPurpose(e.target.value)}
                      placeholder="Please specify your event / purpose..."
                      className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C]"
                    />
                  </div>
                )}
              </div>

              {/* 3. Expected Guests Count */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#EA580C] shadow-2xs">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[13px] font-extrabold text-[#111111]">Expected People / Guests</p>
                      <p className="text-[10px] font-medium text-slate-500">Approximate attendee count</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setGuestsCount(prev => Math.max(1, prev - 5))}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-black cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-12 text-center text-sm font-black text-[#111111]">
                      {guestsCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setGuestsCount(prev => prev + 5)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-black cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex gap-1.5 mt-2.5 pt-2 border-t border-slate-200/60">
                  {[1, 5, 15, 30, 50, 100].map(cnt => (
                    <button
                      type="button"
                      key={cnt}
                      onClick={() => setGuestsCount(cnt)}
                      className={`flex-1 py-1 text-[10px] font-bold rounded-lg border transition ${
                        guestsCount === cnt
                          ? 'border-[#EA580C] bg-[#EA580C] text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {cnt}{cnt >= 100 ? '+' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#6B7280] mb-1.5">
                    <Calendar className="inline-block h-3.5 w-3.5 mr-1 text-[#EA580C]" /> Preferred Date
                  </label>
                  <input
                    type="date"
                    min={todayIso}
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#6B7280] mb-1.5">
                    <Clock className="inline-block h-3.5 w-3.5 mr-1 text-[#EA580C]" /> Preferred Time Slot
                  </label>
                  <select
                    value={timeSlot}
                    onChange={e => setTimeSlot(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] bg-white"
                  >
                    {TIME_SLOTS.map(slot => (
                      <option key={slot.id} value={slot.label}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 5. City */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#6B7280] mb-1.5">
                  <MapPin className="inline-block h-3.5 w-3.5 mr-1 text-[#EA580C]" /> Your City / Location
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {CITIES.map(c => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setCity(c)}
                      className={`py-1.5 px-1 text-[11px] font-bold rounded-xl border text-center transition cursor-pointer truncate ${
                        city === c
                          ? 'border-[#EA580C] bg-[#FFF0EB] text-[#EA580C]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* 6. Amenities / Requirements */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#6B7280] mb-2">
                  <PartyPopper className="inline-block h-3.5 w-3.5 mr-1 text-[#EA580C]" /> Amenities & Setup (Optional)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {AMENITIES.map(amenity => {
                    const Icon = amenity.icon;
                    const isChecked = selectedAmenities.includes(amenity.label);
                    return (
                      <button
                        type="button"
                        key={amenity.id}
                        onClick={() => toggleAmenity(amenity.label)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-left transition cursor-pointer ${
                          isChecked
                            ? 'border-[#EA580C] bg-[#FFF0EB] text-[#EA580C]'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border ${
                            isChecked
                              ? 'border-[#EA580C] bg-[#EA580C] text-white text-[10px] font-bold'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked ? '✓' : ''}
                        </div>
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-[11px] font-semibold leading-tight line-clamp-1">
                          {amenity.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 7. Contact Details */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                <p className="text-[11px] font-black uppercase tracking-wider text-[#6B7280]">
                  Your Contact Information
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      <User className="inline-block h-3 w-3 mr-0.5 text-slate-500" /> Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your Name"
                      required
                      className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-[#EA580C]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      <Phone className="inline-block h-3 w-3 mr-0.5 text-slate-500" /> WhatsApp Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="10-digit number"
                      required
                      maxLength={10}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-[#EA580C]"
                    />
                  </div>
                </div>
              </div>

              {/* 8. Additional Notes */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#6B7280] mb-1">
                  Additional Notes or Specific Requests
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Need acoustic setup, specific stage decoration, extended hours..."
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-[#EA580C]"
                />
              </div>

              {/* 9. Submit Button */}
              <div className="pt-2 pb-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#EA580C] to-[#D97706] hover:from-[#D97706] hover:to-[#EA580C] text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-md shadow-orange-500/25 transition active:scale-[0.99] cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  <span>Submit Space Enquiry via WhatsApp</span>
                </button>
                <p className="text-center text-[10px] font-semibold text-slate-400 mt-2">
                  No instant charge · Direct response from WooWoo Art House concierge
                </p>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
export default SpaceQueryModal;

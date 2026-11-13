import { useEffect, useState, useRef, type FormEvent } from 'react';
import {
  HeartHandshake,
  Phone,
  User,
  Sparkles,
  X,
  CheckCircle2,
  Camera,
  Check,
  Briefcase,
  Trash2,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Zap,
  MessageCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import { useAuthStore } from '../../store/authStore';

export type CvpApplication = {
  name: string;
  phone: string;
  selfieUrl?: string;
  profession: string;
  availability: string[];
  volunteeredBefore: boolean;
  eventCount?: string;
  eventType?: 'Unpaid' | 'Paid' | 'Both';
  status: 'under_review' | 'approved' | 'rejected';
  submittedAt: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: (application: CvpApplication) => void;
};

const WOOWOO_WHATSAPP = '918073988123';

const POPULAR_PROFESSIONS = [
  'Student',
  'Artist / Painter',
  'Graphic Designer',
  'Content Creator',
  'Working Professional',
  'Event Coordinator',
  'Freelancer',
  'Photographer',
];

const AVAILABILITY_OPTIONS = [
  {
    id: 'Morning',
    label: 'Morning',
    time: '9 AM – 1 PM',
    icon: Sunrise,
  },
  {
    id: 'Afternoon',
    label: 'Afternoon',
    time: '1 PM – 5 PM',
    icon: Sun,
  },
  {
    id: 'Evening',
    label: 'Evening',
    time: '5 PM – 9 PM',
    icon: Sunset,
  },
  {
    id: 'Night',
    label: 'Night',
    time: '9 PM onwards',
    icon: Moon,
  },
  {
    id: 'Anytime',
    label: 'Anytime',
    time: 'Fully Flexible',
    icon: Zap,
  },
];

const EVENT_COUNT_OPTIONS = ['1–2 Events', '3–5 Events', '6–10 Events', '10+ Events'];
const EVENT_TYPES: Array<'Unpaid' | 'Paid' | 'Both'> = ['Unpaid', 'Paid', 'Both'];

export function CvpJoinModal({ isOpen, onClose, onSubmitted }: Props) {
  const customer = useAuthStore((state) => state.customer);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [profession, setProfession] = useState('');
  const [availability, setAvailability] = useState<string[]>(['Morning', 'Evening']);
  const [volunteeredBefore, setVolunteeredBefore] = useState<boolean>(false);
  const [eventCount, setEventCount] = useState('1–2 Events');
  const [eventType, setEventType] = useState<'Unpaid' | 'Paid' | 'Both'>('Unpaid');

  const [existing, setExisting] = useState<CvpApplication | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const storageKey = `cvp_application_${customer?._id || 'guest'}`;

  // Load existing application or prefill user info
  useEffect(() => {
    if (!isOpen) return;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as CvpApplication;
        setExisting(parsed);
        setName(parsed.name || customer?.name || '');
        setPhone(parsed.phone || customer?.mobile || '');
        setSelfieUrl(parsed.selfieUrl || null);
        setProfession(parsed.profession || '');
        setAvailability(Array.isArray(parsed.availability) ? parsed.availability : ['Morning', 'Evening']);
        setVolunteeredBefore(Boolean(parsed.volunteeredBefore));
        setEventCount(parsed.eventCount || '1–2 Events');
        setEventType(parsed.eventType || 'Unpaid');
        setIsEditing(false);
      } else {
        setExisting(null);
        setName(customer?.name || '');
        setPhone(customer?.mobile || '');
        setSelfieUrl(null);
        setProfession('');
        setAvailability(['Morning', 'Evening']);
        setVolunteeredBefore(false);
        setEventCount('1–2 Events');
        setEventType('Unpaid');
        setIsEditing(true);
      }
    } catch {
      setExisting(null);
      setIsEditing(true);
    }
  }, [isOpen, customer, storageKey]);

  // Handle Selfie Upload
  const handleSelfieChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid file format',
        text: 'Please select an image file (JPG, PNG, WebP).',
        confirmButtonColor: '#059669',
      });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: 'File too large',
        text: 'Please select a photo smaller than 8MB.',
        confirmButtonColor: '#059669',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelfieUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Toggle availability options (multi-check)
  const toggleAvailability = (id: string) => {
    if (id === 'Anytime') {
      if (availability.includes('Anytime')) {
        setAvailability([]);
      } else {
        setAvailability(['Morning', 'Afternoon', 'Evening', 'Night', 'Anytime']);
      }
      return;
    }

    let next: string[];
    if (availability.includes(id)) {
      next = availability.filter((a) => a !== id && a !== 'Anytime');
    } else {
      next = [...availability, id];
      const allSpecific = ['Morning', 'Afternoon', 'Evening', 'Night'];
      if (allSpecific.every((s) => next.includes(s))) {
        next.push('Anytime');
      }
    }
    setAvailability(next);
  };

  // Format WhatsApp message & redirect
  const sendToWhatsApp = (appData: CvpApplication) => {
    const timeSlots = appData.availability.filter((a) => a !== 'Anytime');
    const availText = appData.availability.includes('Anytime')
      ? 'Anytime (Fully Flexible)'
      : timeSlots.length > 0
      ? timeSlots.join(', ')
      : 'Flexible';

    const pastText = appData.volunteeredBefore
      ? `Yes (${appData.eventCount || '1–2 Events'}, ${appData.eventType || 'Unpaid'})`
      : 'No (First-time Volunteer)';

    const lines = [
      '🎨 *WooWoo Art House — Community Volunteering Program (CVP)*',
      '',
      `👤 *Name:* ${appData.name}`,
      `📱 *Phone:* ${appData.phone}`,
      `💼 *Profession:* ${appData.profession}`,
      `⏰ *Availability:* ${availText}`,
      `🤝 *Volunteered Before:* ${pastText}`,
      appData.selfieUrl ? '📸 *Selfie:* Uploaded (I will also share it below)' : '📸 *Selfie:* Will share in chat',
      '',
      'Excited to join the community crew and assist at upcoming exhibitions & events! 🚀',
    ];

    const message = lines.join('\n');
    const url = `https://wa.me/${WOOWOO_WHATSAPP}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Name Required',
        text: 'Please enter your full name.',
        confirmButtonColor: '#059669',
      });
      return;
    }

    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      Swal.fire({
        icon: 'warning',
        title: 'Valid Phone Required',
        text: 'Please enter a valid 10-digit mobile number.',
        confirmButtonColor: '#059669',
      });
      return;
    }

    if (!selfieUrl) {
      Swal.fire({
        icon: 'warning',
        title: 'Selfie Required',
        text: 'Please upload or capture a selfie photo so our community coordinators can recognize you.',
        confirmButtonColor: '#059669',
      });
      return;
    }

    if (!profession.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Profession Required',
        text: 'Please enter or select your profession.',
        confirmButtonColor: '#059669',
      });
      return;
    }

    if (availability.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Availability Required',
        text: 'Please select at least one availability slot (Morning, Afternoon, Evening, Night, or Anytime).',
        confirmButtonColor: '#059669',
      });
      return;
    }

    setSubmitting(true);
    const newApp: CvpApplication = {
      name: name.trim(),
      phone: phone.trim(),
      selfieUrl: selfieUrl || undefined,
      profession: profession.trim(),
      availability,
      volunteeredBefore,
      eventCount: volunteeredBefore ? eventCount : undefined,
      eventType: volunteeredBefore ? eventType : undefined,
      status: 'under_review',
      submittedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(newApp));
      setExisting(newApp);
      setIsEditing(false);
      onSubmitted?.(newApp);

      // Redirect to WhatsApp
      sendToWhatsApp(newApp);

      Swal.fire({
        icon: 'success',
        title: 'Opening WhatsApp!',
        text: 'Your volunteering application is ready. Send the prefilled message on WhatsApp to connect with the WooWoo team!',
        confirmButtonColor: '#059669',
      });
      onClose();
    } catch (err) {
      console.error('Failed to save CVP application:', err);
      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: 'Could not save application. Please try again.',
        confirmButtonColor: '#059669',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/65 backdrop-blur-xs"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="relative z-10 w-full max-w-lg max-h-[92vh] flex flex-col rounded-[28px] border border-slate-100 bg-white shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="shrink-0 border-b border-slate-100 px-5 py-4 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-2xs">
                    <HeartHandshake className="h-6 w-6" strokeWidth={2.2} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-[16px] font-black text-slate-900 leading-tight">
                      Join Community Volunteering (CVP)
                    </h3>
                    <p className="text-[11.5px] font-bold text-slate-400">
                      WooWoo Art House Community Crew
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 text-left space-y-4">
              {existing && !isEditing ? (
                /* EXISTING APPLICATION SUMMARY VIEW */
                <div className="space-y-4">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                        Application Submitted
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-semibold leading-relaxed text-emerald-900">
                      Your CVP application is active! Tap below to chat directly with the team on WhatsApp or update your details.
                    </p>
                  </div>

                  {/* Summary Profile Card */}
                  <div className="rounded-2xl border border-slate-100 bg-[#FAFBFD] p-4 space-y-3">
                    <div className="flex items-center gap-3.5">
                      {existing.selfieUrl ? (
                        <img
                          src={existing.selfieUrl}
                          alt="Selfie"
                          className="h-16 w-16 rounded-2xl object-cover border-2 border-emerald-400 shadow-xs"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xl">
                          {existing.name.charAt(0) || 'V'}
                        </div>
                      )}
                      <div>
                        <h4 className="font-black text-slate-900 text-sm leading-tight">{existing.name}</h4>
                        <p className="text-xs font-bold text-slate-500 mt-0.5">{existing.profession}</p>
                        <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">{existing.phone}</p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-2.5 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="font-semibold">Availability</span>
                        <span className="font-bold text-slate-900">
                          {existing.availability?.filter((a) => a !== 'Anytime').join(', ') || 'Anytime'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="font-semibold">Volunteered Before</span>
                        <span className="font-bold text-slate-900">
                          {existing.volunteeredBefore
                            ? `Yes (${existing.eventCount || '1–2'}, ${existing.eventType || 'Unpaid'})`
                            : 'No (First time)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons for Existing */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => sendToWhatsApp(existing)}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#059669] py-3 text-sm font-extrabold text-white shadow-xs hover:bg-[#047857] transition cursor-pointer"
                    >
                      <MessageCircle className="h-4.5 w-4.5" />
                      <span>Chat on WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                      <span>Edit Application Details</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* APPLICATION FORM VIEW */
                <form id="cvp-join-form" onSubmit={handleSubmit} className="space-y-4">
                  {/* Informational banner */}
                  <div className="rounded-2xl bg-emerald-50/70 border border-emerald-100 p-3 flex items-start gap-2.5">
                    <Sparkles className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-[11.5px] font-semibold text-emerald-900 leading-relaxed">
                      Complete this quick form. Upon submission, you will be redirected to WhatsApp to confirm your joining with the WooWoo team!
                    </p>
                  </div>

                  {/* 1. UPLOAD (SELFIE) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Upload Selfie <span className="text-emerald-600">*</span>
                    </label>

                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      capture="user"
                      onChange={handleSelfieChange}
                      className="hidden"
                    />

                    {selfieUrl ? (
                      <div className="flex items-center gap-3.5 p-3 rounded-2xl border border-emerald-200 bg-emerald-50/50">
                        <div className="relative shrink-0">
                          <img
                            src={selfieUrl}
                            alt="Selfie preview"
                            className="h-16 w-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm"
                          />
                          <div className="absolute -top-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-extrabold text-slate-900 truncate">
                            Selfie Photo Added
                          </p>
                          <p className="text-[10.5px] font-semibold text-slate-500">
                            Clear front-facing photo
                          </p>
                          <div className="flex gap-2 mt-1.5">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="text-[11px] font-extrabold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                            >
                              Retake / Change
                            </button>
                            <span className="text-slate-300">·</span>
                            <button
                              type="button"
                              onClick={() => setSelfieUrl(null)}
                              className="text-[11px] font-extrabold text-rose-600 hover:text-rose-700 cursor-pointer flex items-center gap-0.5"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-[#F6FEF9] hover:bg-emerald-50/60 transition cursor-pointer text-center group"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 group-hover:scale-105 transition">
                          <Camera className="h-5 w-5" />
                        </div>
                        <span className="mt-2 text-xs font-extrabold text-slate-800">
                          Take a Selfie / Upload Photo
                        </span>
                        <span className="text-[10.5px] font-medium text-slate-400 mt-0.5">
                          Tap to open camera or browse gallery
                        </span>
                      </button>
                    )}
                  </div>

                  {/* 2. NAME & PHONE */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Full Name <span className="text-emerald-600">*</span>
                      </label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your name"
                          required
                          className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        WhatsApp Number <span className="text-emerald-600">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="10-digit number"
                          required
                          className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. PROFESSION */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Profession <span className="text-emerald-600">*</span>
                    </label>
                    <div className="relative mb-2">
                      <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={profession}
                        onChange={(e) => setProfession(e.target.value)}
                        placeholder="e.g. Student, Graphic Designer, Artist..."
                        required
                        className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    {/* Popular Profession Quick Chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_PROFESSIONS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setProfession(p)}
                          className={`rounded-lg px-2 py-1 text-[10.5px] font-bold transition cursor-pointer ${
                            profession === p
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. AVAILABILITY (MULTIPLE CHECKS) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Availability (Multiple Checks) <span className="text-emerald-600">*</span>
                      </label>
                      <span className="text-[10.5px] font-bold text-slate-400">
                        {availability.length} selected
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {AVAILABILITY_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const isChecked = availability.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => toggleAvailability(opt.id)}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              isChecked
                                ? 'border-emerald-500 bg-[#ECFDF5] text-emerald-800 shadow-2xs'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <div
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition ${
                                isChecked ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-extrabold leading-none truncate">
                                {opt.label}
                              </p>
                              <p className="text-[9.5px] font-semibold text-slate-400 mt-0.5 truncate">
                                {opt.time}
                              </p>
                            </div>
                            <div
                              className={`h-4 w-4 shrink-0 rounded-md border flex items-center justify-center transition ${
                                isChecked
                                  ? 'border-emerald-600 bg-emerald-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 5. VOLUNTEERING BEFORE (YES / NO) */}
                  <div className="rounded-2xl border border-slate-200 bg-[#FAFBFD] p-3.5 space-y-3">
                    <label className="block text-xs font-bold text-slate-700">
                      Have you volunteered before?
                    </label>

                    {/* Yes / No Toggle Pills */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setVolunteeredBefore(false)}
                        className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-2 ${
                          !volunteeredBefore
                            ? 'border-emerald-500 bg-emerald-600 text-white shadow-xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {!volunteeredBefore && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        <span>No (First Time)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setVolunteeredBefore(true)}
                        className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-2 ${
                          volunteeredBefore
                            ? 'border-emerald-500 bg-emerald-600 text-white shadow-xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {volunteeredBefore && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        <span>Yes (I Have)</span>
                      </button>
                    </div>

                    {/* Conditional Fields if Yes */}
                    {volunteeredBefore && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 pt-1 border-t border-slate-200/70"
                      >
                        {/* How Many Events */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                            How many events have you volunteered at?
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {EVENT_COUNT_OPTIONS.map((count) => (
                              <button
                                key={count}
                                type="button"
                                onClick={() => setEventCount(count)}
                                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                                  eventCount === count
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                {count}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Paid / Unpaid */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                            Was your volunteering experience:
                          </label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {EVENT_TYPES.map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setEventType(t)}
                                className={`py-1.5 px-2 rounded-lg text-xs font-bold text-center transition cursor-pointer border ${
                                  eventType === t
                                    ? 'border-emerald-600 bg-emerald-100/70 text-emerald-800'
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {t === 'Unpaid' ? 'Unpaid (Voluntary)' : t}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer with WhatsApp Redirect */}
            <div className="shrink-0 border-t border-slate-100 px-5 py-3.5 bg-slate-50/60">
              {existing && !isEditing ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-2xl bg-slate-800 py-3 text-xs font-extrabold text-white hover:bg-slate-900 transition cursor-pointer"
                >
                  Close
                </button>
              ) : (
                <button
                  type="submit"
                  form="cvp-join-form"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#059669] py-3 text-sm font-extrabold text-white shadow-xs hover:bg-[#047857] transition cursor-pointer disabled:opacity-60"
                >
                  <MessageCircle className="h-4.5 w-4.5" />
                  <span>{submitting ? 'Redirecting…' : 'Submit & Redirect to WhatsApp'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

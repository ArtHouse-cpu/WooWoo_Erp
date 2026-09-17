import { useState, useId } from "react";
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  Check,
  Users,
  Briefcase,
  Monitor,
  Layers,
  FileText,
} from "lucide-react";
import { toast } from "react-toastify";

export type NewBookingData = {
  name: string;
  phone: string;
  email: string;
  spaceType: string;
  bookingDate: string;
  bookingTime: string;
  bookingAt: string;
  status: "Expired" | "Upcoming" | "Ongoing";
  notes?: string;
};

type CreateBookingDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreateBooking?: (booking: NewBookingData) => void;
};

const SPACE_OPTIONS = [
  {
    id: "Meeting Room",
    label: "Meeting Room",
    capacity: "4–6 Seats",
    icon: Monitor,
    color: "from-blue-500/10 to-indigo-500/10 border-blue-200 text-blue-700",
    badge: "Smart Display & Audio",
  },
  {
    id: "Conference Room",
    label: "Conference Room",
    capacity: "12–18 Seats",
    icon: Users,
    color: "from-purple-500/10 to-violet-500/10 border-purple-200 text-purple-700",
    badge: "Projector & Mic Setup",
  },
  {
    id: "Private Cabin",
    label: "Private Cabin",
    capacity: "1–3 Seats",
    icon: Briefcase,
    color: "from-amber-500/10 to-orange-500/10 border-amber-200 text-amber-700",
    badge: "Quiet & Dedicated",
  },
  {
    id: "Co-working Space",
    label: "Co-working Desk",
    capacity: "Flexible Desk",
    icon: Layers,
    color: "from-emerald-500/10 to-teal-500/10 border-emerald-200 text-emerald-700",
    badge: "High-speed WiFi",
  },
];

const BRANCH_OPTIONS = [
  "Main Branch",
  "City Center",
  "North Campus",
  "Tech Park Wing",
];

const QUICK_DURATIONS = [
  { label: "1 hr", hours: 1 },
  { label: "2 hrs", hours: 2 },
  { label: "4 hrs", hours: 4 },
  { label: "Full Day", hours: 8 },
];

const CreateBookingDetailsModal = ({
  isOpen,
  onClose,
  onCreateBooking,
}: CreateBookingDetailsModalProps) => {
  const formId = useId();

  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [spaceType, setSpaceType] = useState("Meeting Room");
  const [bookingDate, setBookingDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [bookingFrom, setBookingFrom] = useState("10:00");
  const [bookingTo, setBookingTo] = useState("12:00");
  const [bookingAt, setBookingAt] = useState("Main Branch");
  const [status, setStatus] = useState<"Upcoming" | "Ongoing">("Upcoming");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  // Format 24h "10:00" to "10:00 AM"
  const formatTimeDisplay = (timeStr: string) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":").map(Number);
    if (isNaN(h)) return timeStr;
    const period = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const displayM = String(m || 0).padStart(2, "0");
    return `${displayH}:${displayM} ${period}`;
  };

  // Format "2026-09-18" to "18 Sep 2026"
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleQuickDuration = (hours: number) => {
    if (!bookingFrom) return;
    const [h, m] = bookingFrom.split(":").map(Number);
    const endH = (h + hours) % 24;
    const endStr = `${String(endH).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
    setBookingTo(endStr);
  };

  const validate = () => {
    const err: Record<string, string> = {};
    if (!name.trim()) err.name = "Customer name is required.";
    if (!phone.trim()) err.phone = "Phone number is required.";
    else if (!/^\d{10}$/.test(phone.trim().replace(/\D/g, ""))) {
      err.phone = "Please enter a valid 10-digit phone number.";
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      err.email = "Please enter a valid email address.";
    }
    if (!bookingDate) err.bookingDate = "Booking date is required.";
    if (!bookingFrom) err.bookingFrom = "Start time is required.";
    if (!bookingTo) err.bookingTo = "End time is required.";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const formattedTime = `${formatTimeDisplay(bookingFrom)} - ${formatTimeDisplay(bookingTo)}`;
    const formattedDate = formatDateDisplay(bookingDate);

    const newBooking: NewBookingData = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, "")}@example.com`,
      spaceType,
      bookingDate: formattedDate,
      bookingTime: formattedTime,
      bookingAt,
      status,
      notes: notes.trim(),
    };

    if (onCreateBooking) {
      onCreateBooking(newBooking);
    }
    toast.success(`Booking created for ${newBooking.name}!`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-100">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                New Space Booking
              </h2>
              <p className="text-xs text-slate-500">
                Reserve rooms, cabins, and collaborative workspaces
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 hover:shadow-sm"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form
          id={formId}
          onSubmit={handleSubmit}
          className="flex-1 space-y-6 overflow-y-auto px-6 py-5 text-sm text-slate-700"
        >
          {/* Section 1: Customer Info */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                1
              </span>
              <h3 className="font-semibold text-slate-800">
                Customer Information
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Full Name */}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                    }}
                    placeholder="e.g. Rahul Sharma"
                    className={`h-10 w-full rounded-xl border pl-10 pr-3 text-sm outline-none transition focus:ring-2 ${
                      errors.name
                        ? "border-rose-300 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-100"
                        : "border-slate-200 bg-white focus:border-indigo-500 focus:ring-indigo-100"
                    }`}
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-xs text-rose-500">{errors.name}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, ""));
                      if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
                    }}
                    placeholder="9876543210"
                    className={`h-10 w-full rounded-xl border pl-10 pr-3 text-sm outline-none transition focus:ring-2 ${
                      errors.phone
                        ? "border-rose-300 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-100"
                        : "border-slate-200 bg-white focus:border-indigo-500 focus:ring-indigo-100"
                    }`}
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-xs text-rose-500">{errors.phone}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                    }}
                    placeholder="name@example.com"
                    className={`h-10 w-full rounded-xl border pl-10 pr-3 text-sm outline-none transition focus:ring-2 ${
                      errors.email
                        ? "border-rose-300 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-100"
                        : "border-slate-200 bg-white focus:border-indigo-500 focus:ring-indigo-100"
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-rose-500">{errors.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Space & Location */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                2
              </span>
              <h3 className="font-semibold text-slate-800">
                Select Space & Branch
              </h3>
            </div>

            {/* Space Options Grid */}
            <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {SPACE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = spaceType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSpaceType(opt.id)}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                        isSelected
                          ? "border-indigo-300 bg-indigo-600 text-white"
                          : "border-slate-100 bg-slate-50 text-slate-600"
                      }`}
                    >
                      <Icon size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                          {opt.label}
                        </span>
                        {isSelected && (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white">
                            <Check size={10} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {opt.capacity}
                      </div>
                      <div className="mt-1 inline-block rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-100">
                        {opt.badge}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Branch Selection */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Branch Location <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={bookingAt}
                  onChange={(e) => setBookingAt(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  {BRANCH_OPTIONS.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Date & Timing */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                  3
                </span>
                <h3 className="font-semibold text-slate-800">
                  Schedule & Duration
                </h3>
              </div>

              {/* Quick duration presets */}
              <div className="hidden items-center gap-1 sm:flex">
                <span className="text-[11px] text-slate-400 mr-1">Duration:</span>
                {QUICK_DURATIONS.map((dur) => (
                  <button
                    key={dur.label}
                    type="button"
                    onClick={() => handleQuickDuration(dur.hours)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    +{dur.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Booking Date */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => {
                      setBookingDate(e.target.value);
                      if (errors.bookingDate) {
                        setErrors((prev) => ({ ...prev, bookingDate: "" }));
                      }
                    }}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* Time From */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Start Time <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Clock
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="time"
                    required
                    value={bookingFrom}
                    onChange={(e) => setBookingFrom(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* Time To */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  End Time <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Clock
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="time"
                    required
                    value={bookingTo}
                    onChange={(e) => setBookingTo(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
            </div>

            {/* Mobile quick duration presets */}
            <div className="mt-2 flex items-center gap-1.5 sm:hidden">
              <span className="text-[11px] text-slate-400">Duration:</span>
              {QUICK_DURATIONS.map((dur) => (
                <button
                  key={dur.label}
                  type="button"
                  onClick={() => handleQuickDuration(dur.hours)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700"
                >
                  +{dur.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: Status & Notes */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                4
              </span>
              <h3 className="font-semibold text-slate-800">
                Status & Additional Notes
              </h3>
            </div>

            <div className="space-y-3">
              {/* Initial Status */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Booking Status
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus("Upcoming")}
                    className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                      status === "Upcoming"
                        ? "border-blue-300 bg-blue-50 text-blue-700 ring-2 ring-blue-400/20"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Upcoming (Scheduled)
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus("Ongoing")}
                    className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                      status === "Ongoing"
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-400/20"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Ongoing (In-Use)
                  </button>
                </div>
              </div>

              {/* Special notes */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Notes / Special Requests (Optional)
                </label>
                <div className="relative">
                  <FileText
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-3 text-slate-400"
                  />
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Projector required, arrange extra chairs, guest visitor pass..."
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="text-xs text-slate-500">
            {spaceType} • {formatTimeDisplay(bookingFrom)} - {formatTimeDisplay(bookingTo)}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:text-sm"
            >
              Cancel
            </button>

            <button
              type="submit"
              form={formId}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-100 transition hover:from-indigo-700 hover:to-violet-700 active:scale-[0.98] sm:text-sm"
            >
              <Sparkles size={16} />
              Confirm Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateBookingDetailsModal;
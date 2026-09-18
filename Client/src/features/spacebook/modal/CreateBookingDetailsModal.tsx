import { useEffect, useId, useState } from "react";
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  Sparkles,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  handleGetSpaces,
  type SpaceBookingPayload,
  type SpaceBookingStatus,
  type SpacePayload,
} from "@/services/apiClient";

export type BookingFormPayload = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  spaceId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: SpaceBookingStatus;
  notes?: string;
  /** Pricing snapshot for checkout (create flow). */
  spaceName?: string;
  spaceDay?: string;
  spaceCategory?: string;
  unitPrice?: number;
  durationHours?: number;
  lineTotal?: number;
};

type CreateBookingDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: BookingFormPayload) => Promise<void> | void;
  /** When set, modal is in edit mode and fields are pre-filled. */
  initialBooking?: SpaceBookingPayload | null;
  /** Restore draft values after cancelling checkout (create flow). */
  draftValues?: BookingFormPayload | null;
  submitting?: boolean;
};

const QUICK_DURATIONS = [
  { label: "1 hr", hours: 1 },
  { label: "2 hrs", hours: 2 },
  { label: "4 hrs", hours: 4 },
  { label: "Full Day", hours: 8 },
];

const toDateInput = (value?: string | Date | null) => {
  if (!value) return new Date().toISOString().split("T")[0];
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    const asStr = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(asStr)) return asStr.slice(0, 10);
    return new Date().toISOString().split("T")[0];
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatTimeDisplay = (timeStr: string) => {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  if (Number.isNaN(h)) return timeStr;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = String(m || 0).padStart(2, "0");
  return `${displayH}:${displayM} ${period}`;
};

const timeToMinutes = (timeStr: string) => {
  const [h, m] = String(timeStr || "")
    .split(":")
    .map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const calcDurationHours = (from: string, to: string) => {
  const a = timeToMinutes(from);
  const b = timeToMinutes(to);
  if (a == null || b == null || b <= a) return 0;
  return Math.round(((b - a) / 60) * 100) / 100;
};

const spaceLabel = (space: SpacePayload) => {
  const day = space.day ? ` · ${space.day}` : "";
  const price =
    space.price != null
      ? ` · ₹${Number(space.price).toLocaleString("en-IN")}`
      : "";
  return `${space.name || "Unnamed"}${day}${price}`;
};

const CreateBookingDetailsModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialBooking = null,
  draftValues = null,
  submitting = false,
}: CreateBookingDetailsModalProps) => {
  const formId = useId();
  const isEdit = Boolean(initialBooking?._id || initialBooking?.id);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [bookingDate, setBookingDate] = useState(() =>
    new Date().toISOString().split("T")[0],
  );
  const [bookingFrom, setBookingFrom] = useState("10:00");
  const [bookingTo, setBookingTo] = useState("12:00");
  const [status, setStatus] = useState<SpaceBookingStatus>("Upcoming");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [spaces, setSpaces] = useState<SpacePayload[]>([]);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [spacesError, setSpacesError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    if (initialBooking) {
      setName(initialBooking.customerName || "");
      setPhone(initialBooking.customerPhone || "");
      setEmail(initialBooking.customerEmail || "");
      setSpaceId(String(initialBooking.spaceId || ""));
      setBookingDate(toDateInput(initialBooking.bookingDate));
      setBookingFrom(initialBooking.startTime || "10:00");
      setBookingTo(initialBooking.endTime || "12:00");
      setStatus((initialBooking.status as SpaceBookingStatus) || "Upcoming");
      setNotes(initialBooking.notes || "");
    } else if (draftValues) {
      setName(draftValues.customerName || "");
      setPhone(draftValues.customerPhone || "");
      setEmail(draftValues.customerEmail || "");
      setSpaceId(String(draftValues.spaceId || ""));
      setBookingDate(toDateInput(draftValues.bookingDate));
      setBookingFrom(draftValues.startTime || "10:00");
      setBookingTo(draftValues.endTime || "12:00");
      setStatus(draftValues.status || "Upcoming");
      setNotes(draftValues.notes || "");
    } else {
      setName("");
      setPhone("");
      setEmail("");
      setSpaceId("");
      setBookingDate(new Date().toISOString().split("T")[0]);
      setBookingFrom("10:00");
      setBookingTo("12:00");
      setStatus("Upcoming");
      setNotes("");
    }
    setErrors({});
  }, [isOpen, initialBooking, draftValues]);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();

    const loadSpaces = async () => {
      try {
        setSpacesLoading(true);
        setSpacesError("");
        const res = await handleGetSpaces(
          { status: "All" },
          controller.signal,
        );
        const list: SpacePayload[] = Array.isArray(res?.spaces)
          ? res.spaces
          : [];
        setSpaces(list);
        if (!list.length) {
          setSpacesError("No spaces available. Create a space first.");
        }
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code?: string }).code === "ERR_CANCELED"
        ) {
          return;
        }
        setSpaces([]);
        setSpacesError("Failed to load spaces. Please try again.");
      } finally {
        setSpacesLoading(false);
      }
    };

    void loadSpaces();
    return () => controller.abort();
  }, [isOpen]);

  if (!isOpen) return null;

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
    if (!spaceId) err.spaceId = "Please select a space.";
    if (!bookingDate) err.bookingDate = "Booking date is required.";
    if (!bookingFrom) err.bookingFrom = "Start time is required.";
    if (!bookingTo) err.bookingTo = "End time is required.";
    if (bookingFrom && bookingTo && bookingTo <= bookingFrom) {
      err.bookingTo = "End time must be after start time.";
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const selectedSpace = spaces.find(
    (s) => String(s._id) === String(spaceId),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (spacesLoading) {
      toast.error("Please wait for spaces to finish loading.");
      return;
    }

    const durationHours = calcDurationHours(bookingFrom, bookingTo);
    const unitPrice = Math.max(0, Number(selectedSpace?.price ?? 0));
    const lineTotal =
      Math.round(unitPrice * Math.max(durationHours, 0) * 100) / 100;

    if (!isEdit && lineTotal <= 0) {
      toast.error(
        "Booking total is ₹0. Check space price and booking duration.",
      );
      return;
    }

    const payload: BookingFormPayload = {
      customerName: name.trim(),
      customerPhone: phone.trim().replace(/\D/g, ""),
      customerEmail: email.trim() || undefined,
      spaceId,
      bookingDate,
      startTime: bookingFrom,
      endTime: bookingTo,
      status,
      notes: notes.trim() || undefined,
      spaceName: selectedSpace?.name || "",
      spaceDay: selectedSpace?.day || "",
      spaceCategory: selectedSpace?.category || "space",
      unitPrice,
      durationHours,
      lineTotal,
    };

    try {
      await onSubmit(payload);
    } catch {
      // Parent handles toast; keep modal open on failure.
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-100">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {isEdit ? "Edit Space Booking" : "New Space Booking"}
              </h2>
              <p className="text-xs text-slate-500">
                Select a space and enter booking details
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 hover:shadow-sm disabled:opacity-50"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form
          id={formId}
          onSubmit={handleSubmit}
          className="flex-1 space-y-6 overflow-y-auto px-6 py-5 text-sm text-slate-700"
        >
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
                      if (errors.name)
                        setErrors((prev) => ({ ...prev, name: "" }));
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
                      if (errors.phone)
                        setErrors((prev) => ({ ...prev, phone: "" }));
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
                      if (errors.email)
                        setErrors((prev) => ({ ...prev, email: "" }));
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

          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                2
              </span>
              <h3 className="font-semibold text-slate-800">Select Space</h3>
            </div>

            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Space <span className="text-rose-500">*</span>
            </label>

            {spacesLoading ? (
              <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-500">
                <Loader2 size={14} className="animate-spin" />
                Loading spaces…
              </div>
            ) : spacesError && !spaces.length ? (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{spacesError}</span>
              </div>
            ) : (
              <select
                value={spaceId}
                onChange={(e) => {
                  setSpaceId(e.target.value);
                  if (errors.spaceId)
                    setErrors((prev) => ({ ...prev, spaceId: "" }));
                }}
                className={`h-10 w-full rounded-xl border bg-white px-3 text-sm outline-none transition focus:ring-2 ${
                  errors.spaceId
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                    : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-100"
                }`}
              >
                <option value="">Select a space…</option>
                {spaces.map((space) => (
                  <option key={String(space._id)} value={String(space._id)}>
                    {spaceLabel(space)}
                  </option>
                ))}
              </select>
            )}

            {errors.spaceId && (
              <p className="mt-1 text-xs text-rose-500">{errors.spaceId}</p>
            )}

            {selectedSpace && (
              <p className="mt-1.5 text-[11px] text-slate-500">
                Capacity: {selectedSpace.capacity ?? "—"} · Status:{" "}
                {selectedSpace.status || "Available"}
                {selectedSpace.category
                  ? ` · ${selectedSpace.category}`
                  : ""}
              </p>
            )}
          </div>

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

              <div className="hidden items-center gap-1 sm:flex">
                <span className="mr-1 text-[11px] text-slate-400">
                  Duration:
                </span>
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
                {errors.bookingTo && (
                  <p className="mt-1 text-xs text-rose-500">{errors.bookingTo}</p>
                )}
              </div>
            </div>

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
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Booking Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      "Upcoming",
                      "Ongoing",
                      "Expired",
                      "Cancelled",
                    ] as SpaceBookingStatus[]
                  ).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                        status === s
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-400/20"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

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
                    placeholder="e.g. Projector required, arrange extra chairs..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="min-w-0 truncate text-xs text-slate-500">
            {selectedSpace
              ? `${selectedSpace.name}${selectedSpace.day ? ` · ${selectedSpace.day}` : ""}`
              : "No space selected"}{" "}
            • {formatTimeDisplay(bookingFrom)} - {formatTimeDisplay(bookingTo)}
            {!isEdit && selectedSpace && (
              <span className="ml-1 font-semibold text-slate-700">
                · ₹
                {(
                  Math.max(0, Number(selectedSpace.price || 0)) *
                  calcDurationHours(bookingFrom, bookingTo)
                ).toLocaleString("en-IN")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 sm:text-sm"
            >
              Cancel
            </button>

            <button
              type="submit"
              form={formId}
              disabled={submitting || spacesLoading || !spaces.length}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-100 transition hover:from-indigo-700 hover:to-violet-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              {isEdit ? "Save Changes" : "Proceed to Checkout"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateBookingDetailsModal;

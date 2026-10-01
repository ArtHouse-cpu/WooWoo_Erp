import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  X,
  User,
  Phone,

  Minus,
  ChevronDown,
  Camera,
  Megaphone,
  Projector,
  UserRound,
  Volume2,
  Plus,
  Calendar,
  Clock,
  Sparkles,
  FileText,
  Loader2,
  AlertCircle,
  UserPlus,
  Search,
  Check,
  Laptop,
  Building2,
  Users,
  Trash2,
  Info,
  Tag,
  ArrowRight,
  Printer,
  Archive,
  Car,
} from "lucide-react";
import Swal from "sweetalert2";
// Optional: import jsPDF from "jspdf"; // If you want PDF download
import { toast } from "react-toastify";
import { useAppSelector } from "@/store/hooks";
import { useDebounce } from "@/hooks/useDebounce";
import {
  handleGetSpaces,
  handleGetCustomers,
  handleCreateCustomer,
  handleGetMemberships,
  handleGetAdditionalServices,
  type AdditionalServiceItem,
  customerPayloadToFormData,
  type CustomerPayload,
  type SpaceBookingPayload,
  type SpaceBookingStatus,
  type SpacePayload,
  type MembershipPlanPayload,
} from "@/services/apiClient";
import { getIconComponent } from "@/features/catalogue/components/AddAdditionalServiceModal";
import CreateCustomerModal from "@/features/network/components/CreateCustomerModal";
import MembershipBadge from "@/features/sales/components/invoice/MembershipBadge";
import {
  resolveMembershipPlan,
  resolveBenefitPercents,
} from "@/features/sales/utils/membershipInvoiceUtils";
import {
  EXCLUSIVE_CATEGORIES,
  COWORKING_CATEGORIES,
} from "@/features/catalogue/components/AddSpaceModal";
import {
  CoworkingSummaryCard,
  ExclusiveSingleDateSummaryCard,
  ExclusiveMultipleDatesSummaryCard,
  type SelectedServiceItem,
} from "./summary";
import {
  useBusinessNow,
  useSpaceAvailability,
} from "../hooks/useSpaceAvailability";
import {
  BOOKING_MESSAGES,
  SLOT_OPTION_SUFFIX,
  addDaysToKey,
  findBusyOverlaps,
  getBusinessNow,
  getBusinessToday,
  getSlotAvailability,
  timeToMinutes,
  type SlotAvailability,
} from "../utils/bookingAvailability";

export type MultiDateSlot = {
  id: string;
  date: string;
  duration: number;
  timeSlot: string;
  startTime: string;
  endTime: string;
};

export type BookingFormPayload = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerId?: string | null;
  membershipType?: string | null;
  membershipPlanId?: string | null;
  spaceId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: SpaceBookingStatus;
  notes?: string;
  /** Pricing snapshot for checkout (create flow). */
  spaceName?: string;
  spaceCode?: string;
  spaceType?: "Exclusive" | "Coworking" | string;
  spaceDay?: string;
  spaceCategory?: string;
  unitPrice?: number;
  durationHours?: number;
  lineTotal?: number;
  spaceQty?: number;
  dateMode?: "single" | "multiple";
  multiDateSlots?: MultiDateSlot[];
  durationCount?: number;
  durationUnit?: string;
  packageMultiplier?: number;
  coworkingStartDate?: string;
  coworkingEndDate?: string;
  subTotal?: number;
  discountAmount?: number;
  cashbackAmount?: number;
  selectedServices?: SelectedServiceItem[];
  summarySnapshot?: any;
};

type CreateBookingDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: BookingFormPayload) => Promise<void> | void;
  onSaveDraft?: (payload: BookingFormPayload) => Promise<void> | void;
  /** When set, modal is in edit mode and fields are pre-filled. */
  initialBooking?: SpaceBookingPayload | null;
  /** Restore draft values after cancelling checkout (create flow). */
  draftValues?: BookingFormPayload | null;
  submitting?: boolean;
};

export const QUICK_DURATIONS = [
  { label: "1 hr", hours: 1 },
  { label: "2 hrs", hours: 2 },
  { label: "4 hrs", hours: 4 },
  { label: "Full Day", hours: 8 },
];

export const COWORKING_SERVICES = [
  // {
  //   key: "locker",
  //   label: "Locker",
  //   price: 500,
  //   priceLabel: "₹500 / month",
  //   icon: Lock,
  // },
  {
    key: "printing",
    label: "Printing",
    price: 50,
    priceLabel: "₹50 / 100 pages",
    icon: Printer,
  },
  {
    key: "meetingRoom",
    label: "Meeting Room",
    price: 500,
    priceLabel: "₹500 / hour",
    icon: Users,
  },
  {
    key: "storage",
    label: "Storage",
    price: 1000,
    priceLabel: "₹1,000 / month",
    icon: Archive,
  },
  {
    key: "parking",
    label: "Parking",
    price: 500,
    priceLabel: "₹500 / month",
    icon: Car,
  },
];

export const EXCLUSIVE_SERVICES = [
  {
    key: "marketingSupport",
    label: "Marketing Support",
    price: 500,
    priceLabel: "₹500 / booking",
    icon: Megaphone,
  },
  {
    key: "projector",
    label: "Projector",
    price: 800,
    priceLabel: "₹800 / booking",
    icon: Projector,
  },
  {
    key: "speakerSound",
    label: "Speaker / Sound System",
    price: 600,
    priceLabel: "₹600 / booking",
    icon: Volume2,
  },
  {
    key: "mediaShoot",
    label: "Media Shoot",
    price: 1500,
    priceLabel: "₹1,500 / booking",
    icon: Camera,
  },
  {
    key: "eventCoordinator",
    label: "Event Coordinator",
    price: 1000,
    priceLabel: "₹1,000 / booking",
    icon: UserRound,
  },
];

export const PURPOSE_OPTIONS = [
  "Meeting",
  "Workshop",
  "Conference",
  "Corporate Event",
  "Photo / Video Shoot",
  "Coworking / Work Desk",
  "Seminar / Training",
  "Social Gathering",
  "Other",
];

export type PlanDurationUnit = "day" | "week" | "month";

export interface PlanDurationInfo {
  unit: PlanDurationUnit;
  baseCount: number;
  label: string;
  unitSingular: string;
  unitPlural: string;
  priceSuffix: string;
  isDurationPlan: boolean;
}

export const parsePlanDuration = (
  name = "",
  spaceType: "coworking" | "exclusive" | string = "coworking",
): PlanDurationInfo => {
  const cleanName = (name || "")
    .replace(/\bweekdays?\b/gi, "")
    .replace(/\bweekends?\b/gi, "");

  // Check Months (e.g. "3 Months", "6 Months", "Monthly", "1 Month")
  const monthMatch = cleanName.match(/(\d+)?\s*(?:months?|monthly|mo)\b/i);
  if (monthMatch) {
    const num = monthMatch[1] ? parseInt(monthMatch[1], 10) : 1;
    const baseCount = Number.isFinite(num) && num > 0 ? num : 1;
    return {
      unit: "month",
      baseCount,
      label: "No. of Months",
      unitSingular: "Month",
      unitPlural: "Months",
      priceSuffix: baseCount > 1 ? ` / ${baseCount} months` : " / month",
      isDurationPlan: true,
    };
  }

  // Check Weeks (e.g. "Weekly", "1 Week", "2 Weeks")
  const weekMatch = cleanName.match(/(\d+)?\s*(?:weeks?|weekly|wk)\b/i);
  if (weekMatch) {
    const num = weekMatch[1] ? parseInt(weekMatch[1], 10) : 1;
    const baseCount = Number.isFinite(num) && num > 0 ? num : 1;
    return {
      unit: "week",
      baseCount,
      label: "No. of Weeks",
      unitSingular: "Week",
      unitPlural: "Weeks",
      priceSuffix: baseCount > 1 ? ` / ${baseCount} weeks` : " / week",
      isDurationPlan: true,
    };
  }

  // Check Days (e.g. "1 day", "5 days", "Daily", "Day Pass")
  const dayMatch = cleanName.match(/(\d+)?\s*(?:days?|daily|daypass|day\s*pass)\b/i);
  if (dayMatch) {
    const num = dayMatch[1] ? parseInt(dayMatch[1], 10) : 1;
    const baseCount = Number.isFinite(num) && num > 0 ? num : 1;
    return {
      unit: "day",
      baseCount,
      label: "No. of Days",
      unitSingular: "Day",
      unitPlural: "Days",
      priceSuffix: baseCount > 1 ? ` / ${baseCount} days` : " / day",
      isDurationPlan: true,
    };
  }

  const isCowork = String(spaceType).toLowerCase() === "coworking";
  if (isCowork) {
    return {
      unit: "day",
      baseCount: 1,
      label: "No. of Days",
      unitSingular: "Day",
      unitPlural: "Days",
      priceSuffix: " / day",
      isDurationPlan: true,
    };
  }

  return {
    unit: "day",
    baseCount: 1,
    label: "No. of Days",
    unitSingular: "Day",
    unitPlural: "Days",
    priceSuffix: " / hr",
    isDurationPlan: false,
  };
};

/** Calculates end date based on start date, duration unit, and count (inclusive) */
export const calculatePlanEndDate = (
  startDateStr: string,
  unit: PlanDurationUnit,
  count: number,
): string => {
  if (!startDateStr) return "";
  const [y, m, d] = startDateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return startDateStr;
  const safeCount = Math.max(1, count || 1);

  if (unit === "week") {
    date.setDate(date.getDate() + safeCount * 7 - 1);
  } else if (unit === "month") {
    const targetMonth = date.getMonth() + safeCount;
    date.setMonth(targetMonth);
    if (date.getMonth() !== ((targetMonth % 12) + 12) % 12) {
      date.setDate(0);
    }
    date.setDate(date.getDate() - 1);
  } else {
    date.setDate(date.getDate() + safeCount - 1);
  }

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/** Calculates end date from start date and number of days (inclusive) */
export const calculateEndDate = (startDateStr: string, days: number): string => {
  return calculatePlanEndDate(startDateStr, "day", days);
};

export const getTimeSlotsForDuration = (
  duration: number,
  openingHour = 9,
  closingHour = 21,
): string[] => {
  const slots: string[] = [];
  const dur = Math.max(1, Math.min(closingHour - openingHour, Math.round(duration || 1)));

  const formatTime = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${String(displayHour).padStart(2, "0")}:00 ${period}`;
  };

  for (
    let startHour = openingHour;
    startHour + dur <= closingHour;
    startHour++
  ) {
    const endHour = startHour + dur;
    slots.push(`${formatTime(startHour)} - ${formatTime(endHour)}`);
  }

  return slots;
};

/** Calendar date of a stored booking date; date-only values are stored at UTC midnight. */
const toDateInput = (value?: string | Date | null) => {
  if (!value) return getBusinessToday();
  const asStr = typeof value === "string" ? value.trim() : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(asStr)) return asStr;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    if (/^\d{4}-\d{2}-\d{2}/.test(asStr)) return asStr.slice(0, 10);
    return getBusinessToday();
  }
  if (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  ) {
    return d.toISOString().slice(0, 10);
  }
  return getBusinessNow(d).dateKey;
};

const AVAILABILITY_BADGE: Record<
  SlotAvailability | "checking",
  { label: string; className: string }
> = {
  available: {
    label: "Available",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  booked: {
    label: "Booked",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  unavailable: {
    label: "Unavailable",
    className: "border-slate-200 bg-slate-100 text-slate-500",
  },
  checking: {
    label: "Checking…",
    className: "border-indigo-200 bg-indigo-50 text-indigo-600",
  },
};

const AvailabilityBadge = ({
  status,
}: {
  status: SlotAvailability | "checking";
}) => {
  const badge = AVAILABILITY_BADGE[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badge.className}`}
    >
      {status === "checking" && <Loader2 size={10} className="animate-spin" />}
      {badge.label}
    </span>
  );
};

export const formatDateDisplay = (value?: string | Date | null) => {
  if (!value) return "—";
  const asStr = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(asStr)) {
    const [y, m, day] = asStr.slice(0, 10).split("-").map(Number);
    const parsed = new Date(y, m - 1, day);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTimeSlotDisplay = (time24: string) => {
  if (!time24) return "09:00 AM";
  const [h] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${String(displayH).padStart(2, "0")}:00 ${period}`;
};

const parseTimeSlotRange = (
  slotStr: string,
): { hours: number; startTime: string; endTime: string } => {
  if (!slotStr || !slotStr.includes("-")) {
    return { hours: 3, startTime: "09:00", endTime: "12:00" };
  }
  const [startPart, endPart] = slotStr.split("-").map((s) => s.trim());
  const parsePart = (p: string) => {
    const isPM = p.toUpperCase().includes("PM");
    const isAM = p.toUpperCase().includes("AM");
    const clean = p.replace(/(AM|PM)/gi, "").trim();
    let [h] = clean.split(":").map(Number);
    if (Number.isNaN(h)) h = 9;
    if (isPM && h !== 12) h += 12;
    if (isAM && h === 12) h = 0;
    return h;
  };

  const startH = parsePart(startPart);
  const endH = parsePart(endPart);
  const hours = Math.max(1, endH - startH);
  const startTime = `${String(startH).padStart(2, "0")}:00`;
  const endTime = `${String(endH).padStart(2, "0")}:00`;
  return { hours, startTime, endTime };
};

const calcDurationHours = (from: string, to: string) => {
  if (!from || !to) return 0;
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  return Math.max(0, (th * 60 + tm - (fh * 60 + fm)) / 60);
};

const computeBookingStatus = (
  dateStr: string,
  startTime: string,
  endTime: string,
  currentStatus?: SpaceBookingStatus,
): SpaceBookingStatus => {
  if (currentStatus === "Cancelled") return "Cancelled";
  if (currentStatus === "Draft") return "Draft";
  if (!dateStr || !startTime || !endTime) return "Upcoming";
  const now = new Date();
  const start = new Date(`${dateStr}T${startTime}:00`);
  const end = new Date(`${dateStr}T${endTime}:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Upcoming";
  }
  if (now > end) return "Expired";
  if (now >= start && now <= end) return "Ongoing";
  return "Upcoming";
};

const isCoworkingSpace = (s: SpacePayload) => {
  if (s.spaceType === "Coworking") return true;
  if (s.spaceType === "Exclusive") return false;
  return COWORKING_CATEGORIES.some(
    (c) => c.toLowerCase() === (s.category || "").toLowerCase(),
  );
};

const isExclusiveSpace = (s: SpacePayload) => {
  if (s.spaceType === "Exclusive") return true;
  if (s.spaceType === "Coworking") return false;
  return EXCLUSIVE_CATEGORIES.some(
    (c) => c.toLowerCase() === (s.category || "").toLowerCase(),
  );
};

const getSpaceCode = (space: SpacePayload) => {
  return space.spaceCode || (space as any).code || "SP-" + String(space._id).slice(-4).toUpperCase();
};

const CreateBookingDetailsModal = ({
  isOpen,
  onClose,
  onSubmit,
  onSaveDraft,
  initialBooking = null,
  draftValues = null,
  submitting = false,
}: CreateBookingDetailsModalProps) => {
  const formId = useId();
  const isEdit = Boolean(initialBooking?._id || initialBooking?.id);
  const [savingDraft, setSavingDraft] = useState(false);
  const staff = useAppSelector((state) => state.user);
  const customerSearchRef = useRef<HTMLDivElement>(null);
  const coworkingDateInputRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isPhoneAutoFetched, setIsPhoneAutoFetched] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [membershipType, setMembershipType] = useState<string>("none");
  const [membershipPlanId, setMembershipPlanId] = useState<string | null>(null);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlanPayload[]>([]);

  // Space Selection
  const [spaceId, setSpaceId] = useState("");
  const [spaceQty, setSpaceQty] = useState(1);
  const [spaces, setSpaces] = useState<SpacePayload[]>([]);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [spacesError, setSpacesError] = useState("");
  const [spaceTypeFilter, setSpaceTypeFilter] = useState<"coworking" | "exclusive">("coworking");
  const [spaceSearch, setSpaceSearch] = useState("");

  // Customer Autocomplete & Create Modal
  const [customers, setCustomers] = useState<CustomerPayload[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  // Exclusive Dates Mode
  const [dateMode, setDateMode] = useState<"single" | "multiple">("single");
  const [bookingDate, setBookingDate] = useState(() => getBusinessToday());
  const [bookingFrom, setBookingFrom] = useState("09:00");
  const [bookingTo, setBookingTo] = useState("12:00");
  const [duration, setDuration] = useState(3);
  const [timeSlot, setTimeSlot] = useState("09:00 AM - 12:00 PM");

  const [multiDateSlots, setMultiDateSlots] = useState<MultiDateSlot[]>([
    {
      id: "slot-1",
      date: getBusinessToday(),
      duration: 3,
      timeSlot: "09:00 AM - 12:00 PM",
      startTime: "09:00",
      endTime: "12:00",
    },
  ]);

  // Coworking / Duration Plans State
  const [planDurationCount, setPlanDurationCount] = useState<number>(1);
  const [coworkingStartDate, setCoworkingStartDate] = useState<string>(() =>
    getBusinessToday(),
  );

  const singleDateSlots = useMemo(() => {
    return getTimeSlotsForDuration(duration);
  }, [duration]);

  // Additional Services States
  const [coworkingServices, setCoworkingServices] = useState<Record<string, number>>({
    locker: 0,
    printing: 0,
    meetingRoom: 0,
    storage: 0,
    parking: 0,
  });

  const [exclusiveServices, setExclusiveServices] = useState<Record<string, number>>({
    marketingSupport: 0,
    projector: 0,
    speakerSound: 0,
    mediaShoot: 0,
    eventCoordinator: 0,
  });

  // Dynamic Additional Services from API / Local Store
  const [dynamicAdditionalServices, setDynamicAdditionalServices] = useState<
    AdditionalServiceItem[]
  >([]);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    handleGetAdditionalServices(controller.signal)
      .then((items) => {
        if (Array.isArray(items) && items.length > 0) {
          setDynamicAdditionalServices(items);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [isOpen]);

  const activeCoworkingServices = useMemo(() => {
    if (dynamicAdditionalServices.length === 0) return COWORKING_SERVICES;
    const filtered = dynamicAdditionalServices.filter(
      (s) => s.spaceType === "all" || s.spaceType === "coworking",
    );
    if (filtered.length === 0) return COWORKING_SERVICES;
    return filtered.map((s) => ({
      key: s.key || (s.title || "").toLowerCase().replace(/[^a-z0-9]/g, ""),
      label: s.title || s.name || "Service",
      price: Number(s.amount ?? s.price ?? 0),
      priceLabel:
        s.priceLabel ||
        `₹${Number(s.amount ?? s.price ?? 0).toLocaleString("en-IN")} / ${s.unit || "month"}`,
      icon: getIconComponent(s.icon),
    }));
  }, [dynamicAdditionalServices]);

  const activeExclusiveServices = useMemo(() => {
    if (dynamicAdditionalServices.length === 0) return EXCLUSIVE_SERVICES;
    const filtered = dynamicAdditionalServices.filter(
      (s) => s.spaceType === "all" || s.spaceType === "exclusive",
    );
    if (filtered.length === 0) return EXCLUSIVE_SERVICES;
    return filtered.map((s) => ({
      key: s.key || (s.title || "").toLowerCase().replace(/[^a-z0-9]/g, ""),
      label: s.title || s.name || "Service",
      price: Number(s.amount ?? s.price ?? 0),
      priceLabel:
        s.priceLabel ||
        `₹${Number(s.amount ?? s.price ?? 0).toLocaleString("en-IN")} / ${s.unit || "booking"}`,
      icon: getIconComponent(s.icon),
    }));
  }, [dynamicAdditionalServices]);

  // Purpose & Notes (COMMON FOR ALL)
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");

  // Status & Validation
  const [status, setStatus] = useState<SpaceBookingStatus>("Upcoming");
  const [, setManualStatusSelected] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const debouncedCustomerSearch = useDebounce(name.trim(), 250);

  // Load Memberships
  useEffect(() => {
    if (!isOpen) return;
    const ac = new AbortController();
    handleGetMemberships({ status: "Active" }, ac.signal)
      .then((res) => {
        const list = res?.memberships;
        if (Array.isArray(list)) {
          setMembershipPlans(list as MembershipPlanPayload[]);
        }
      })
      .catch(() => {});
    return () => ac.abort();
  }, [isOpen]);

  // Pre-fill or Reset on Open
  useEffect(() => {
    if (!isOpen) return;

    if (initialBooking) {
      setName(initialBooking.customerName || "");
      setPhone(initialBooking.customerPhone || "");
      setIsPhoneAutoFetched(Boolean(initialBooking.customerPhone));
      setSpaceId(String(initialBooking.spaceId || ""));
      setSpaceQty(1);
      setCustomerId(null);
      setMembershipType("none");
      setMembershipPlanId(null);

      if (initialBooking.customerPhone) {
        const cleaned = String(initialBooking.customerPhone).replace(/\D/g, "");
        if (cleaned.length === 10) {
          handleGetCustomers(cleaned, undefined, 1)
            .then((res) => {
              const list = Array.isArray(res?.customers) ? res.customers : [];
              const match =
                list.find(
                  (c: CustomerPayload) =>
                    String(c.mobile || "").replace(/\D/g, "") === cleaned,
                ) || list[0];
              if (match) {
                setCustomerId(match._id || (match as any).id || null);
                setMembershipType(match.membershipType || "none");
                setMembershipPlanId(match.membershipPlanId || null);
              }
            })
            .catch(() => undefined);
        }
      }
      const bDate = toDateInput(initialBooking.bookingDate);
      const bFrom = initialBooking.startTime || "09:00";
      const bTo = initialBooking.endTime || "12:00";
      setBookingDate(bDate);
      setBookingFrom(bFrom);
      setBookingTo(bTo);
      setCoworkingStartDate(bDate);
      const initialDur =
        initialBooking.durationHours || calcDurationHours(bFrom, bTo) || 3;
      setDuration(initialDur);
      setTimeSlot(
        `${formatTimeSlotDisplay(bFrom)} - ${formatTimeSlotDisplay(bTo)}`,
      );
      if (initialBooking.status === "Cancelled") {
        setStatus("Cancelled");
        setManualStatusSelected(true);
      } else if (initialBooking.status === "Draft") {
        setStatus("Draft");
        setManualStatusSelected(true);
      } else {
        const computed = computeBookingStatus(
          bDate,
          bFrom,
          bTo,
          initialBooking.status as SpaceBookingStatus,
        );
        setStatus(computed);
        setManualStatusSelected(false);
      }
      setNotes(initialBooking.notes || "");

      const snap = (initialBooking as any)?.summarySnapshot;
      if (snap?.spaceType) {
        setSpaceTypeFilter(snap.spaceType as "coworking" | "exclusive");
      } else if (initialBooking.spaceType) {
        setSpaceTypeFilter(
          initialBooking.spaceType.toLowerCase() === "coworking"
            ? "coworking"
            : "exclusive",
        );
      }
      if (initialBooking.spaceQty || snap?.spaceQty) {
        setSpaceQty(Number(initialBooking.spaceQty || snap?.spaceQty || 1));
      }
      if (initialBooking.durationCount || snap?.planDurationCount) {
        setPlanDurationCount(
          Number(initialBooking.durationCount || snap?.planDurationCount || 1),
        );
      }
      if (initialBooking.dateMode || snap?.dateMode) {
        setDateMode(
          (initialBooking.dateMode || snap?.dateMode) as "single" | "multiple",
        );
      }
      if (
        Array.isArray(initialBooking.multiDateSlots) &&
        initialBooking.multiDateSlots.length > 0
      ) {
        setMultiDateSlots(initialBooking.multiDateSlots);
      } else if (
        Array.isArray(snap?.multiDateSlots) &&
        snap.multiDateSlots.length > 0
      ) {
        setMultiDateSlots(snap.multiDateSlots);
      }
      if (initialBooking.coworkingStartDate || snap?.coworkingStartDate) {
        setCoworkingStartDate(
          initialBooking.coworkingStartDate || snap?.coworkingStartDate || bDate,
        );
      }
      if (snap?.coworkingServices) {
        setCoworkingServices(snap.coworkingServices);
      } else if (Array.isArray(initialBooking.selectedServices)) {
        const cw: Record<string, number> = {};
        initialBooking.selectedServices.forEach((s: any) => {
          const matched = [...activeCoworkingServices, ...COWORKING_SERVICES].find(
            (c) =>
              c.label.toLowerCase() === (s.label || s.name || "").toLowerCase() ||
              c.key.toLowerCase() === (s.key || "").toLowerCase(),
          );
          if (matched) cw[matched.key] = Number(s.qty) || 1;
        });
        if (Object.keys(cw).length > 0) {
          setCoworkingServices((prev) => ({ ...prev, ...cw }));
        }
      }
      if (snap?.exclusiveServices) {
        setExclusiveServices(snap.exclusiveServices);
      } else if (Array.isArray(initialBooking.selectedServices)) {
        const ex: Record<string, number> = {};
        initialBooking.selectedServices.forEach((s: any) => {
          const matched = [...activeExclusiveServices, ...EXCLUSIVE_SERVICES].find(
            (e) =>
              e.label.toLowerCase() === (s.label || s.name || "").toLowerCase() ||
              e.key.toLowerCase() === (s.key || "").toLowerCase(),
          );
          if (matched) ex[matched.key] = Number(s.qty) || 1;
        });
        if (Object.keys(ex).length > 0) {
          setExclusiveServices((prev) => ({ ...prev, ...ex }));
        }
      }
      if (snap?.purpose) {
        setPurpose(snap.purpose);
      } else if (initialBooking.notes?.includes("Purpose:")) {
        const m = initialBooking.notes.match(/Purpose:\s*([^\n\r]+)/);
        if (m) setPurpose(m[1].trim());
      }
    } else if (draftValues) {
      setName(draftValues.customerName || "");
      setPhone(draftValues.customerPhone || "");
      setIsPhoneAutoFetched(
        Boolean(
          draftValues.customerPhone &&
            (draftValues.customerId || draftValues.customerName),
        ),
      );
      setCustomerId(draftValues.customerId || null);
      setMembershipType(draftValues.membershipType || "none");
      setMembershipPlanId(draftValues.membershipPlanId || null);
      setSpaceId(String(draftValues.spaceId || ""));
      setSpaceQty(draftValues.spaceQty || 1);
      const bDate = toDateInput(draftValues.bookingDate);
      const bFrom = draftValues.startTime || "09:00";
      const bTo = draftValues.endTime || "12:00";
      setBookingDate(bDate);
      setBookingFrom(bFrom);
      setBookingTo(bTo);
      setCoworkingStartDate(draftValues.coworkingStartDate || bDate);
      const draftDur =
        draftValues.durationHours || calcDurationHours(bFrom, bTo) || 3;
      setDuration(draftDur);
      setTimeSlot(
        `${formatTimeSlotDisplay(bFrom)} - ${formatTimeSlotDisplay(bTo)}`,
      );
      if (draftValues.status === "Cancelled") {
        setStatus("Cancelled");
        setManualStatusSelected(true);
      } else if (draftValues.status === "Draft") {
        setStatus("Draft");
        setManualStatusSelected(true);
      } else {
        const computed = computeBookingStatus(
          bDate,
          bFrom,
          bTo,
          draftValues.status,
        );
        setStatus(computed);
        setManualStatusSelected(false);
      }
      setNotes(draftValues.notes || "");

      const snapDraft = (draftValues as any)?.summarySnapshot;
      if (snapDraft?.spaceType) {
        setSpaceTypeFilter(snapDraft.spaceType as "coworking" | "exclusive");
      } else if (draftValues.spaceType) {
        setSpaceTypeFilter(
          draftValues.spaceType.toLowerCase() === "coworking"
            ? "coworking"
            : "exclusive",
        );
      }
      if (draftValues.spaceQty || snapDraft?.spaceQty) {
        setSpaceQty(Number(draftValues.spaceQty || snapDraft?.spaceQty || 1));
      }
      if (draftValues.durationCount || snapDraft?.planDurationCount) {
        setPlanDurationCount(
          Number(draftValues.durationCount || snapDraft?.planDurationCount || 1),
        );
      }
      if (draftValues.dateMode || snapDraft?.dateMode) {
        setDateMode(
          (draftValues.dateMode || snapDraft?.dateMode) as "single" | "multiple",
        );
      }
      if (
        Array.isArray(draftValues.multiDateSlots) &&
        draftValues.multiDateSlots.length > 0
      ) {
        setMultiDateSlots(draftValues.multiDateSlots);
      } else if (
        Array.isArray(snapDraft?.multiDateSlots) &&
        snapDraft.multiDateSlots.length > 0
      ) {
        setMultiDateSlots(snapDraft.multiDateSlots);
      }
      if (draftValues.coworkingStartDate || snapDraft?.coworkingStartDate) {
        setCoworkingStartDate(
          draftValues.coworkingStartDate || snapDraft?.coworkingStartDate || bDate,
        );
      }
      if (snapDraft?.coworkingServices) {
        setCoworkingServices(snapDraft.coworkingServices);
      } else if (Array.isArray(draftValues.selectedServices)) {
        const cw: Record<string, number> = {};
        draftValues.selectedServices.forEach((s: any) => {
          const matched = [...activeCoworkingServices, ...COWORKING_SERVICES].find(
            (c) =>
              c.label.toLowerCase() === (s.label || s.name || "").toLowerCase() ||
              c.key.toLowerCase() === (s.key || "").toLowerCase(),
          );
          if (matched) cw[matched.key] = Number(s.qty) || 1;
        });
        if (Object.keys(cw).length > 0) {
          setCoworkingServices((prev) => ({ ...prev, ...cw }));
        }
      }
      if (snapDraft?.exclusiveServices) {
        setExclusiveServices(snapDraft.exclusiveServices);
      } else if (Array.isArray(draftValues.selectedServices)) {
        const ex: Record<string, number> = {};
        draftValues.selectedServices.forEach((s: any) => {
          const matched = [...activeExclusiveServices, ...EXCLUSIVE_SERVICES].find(
            (e) =>
              e.label.toLowerCase() === (s.label || s.name || "").toLowerCase() ||
              e.key.toLowerCase() === (s.key || "").toLowerCase(),
          );
          if (matched) ex[matched.key] = Number(s.qty) || 1;
        });
        if (Object.keys(ex).length > 0) {
          setExclusiveServices((prev) => ({ ...prev, ...ex }));
        }
      }
      if (snapDraft?.purpose) {
        setPurpose(snapDraft.purpose);
      } else if (draftValues.notes?.includes("Purpose:")) {
        const m = draftValues.notes.match(/Purpose:\s*([^\n\r]+)/);
        if (m) setPurpose(m[1].trim());
      }
    } else {
      setName("");
      setPhone("");
      setIsPhoneAutoFetched(false);
      setCustomerId(null);
      setMembershipType("none");
      setMembershipPlanId(null);
      setSpaceId("");
      setSpaceQty(1);
      setPurpose("");
      setNotes("");
      const todayStr = getBusinessToday();
      setBookingDate(todayStr);
      setBookingFrom("09:00");
      setBookingTo("12:00");
      setCoworkingStartDate(todayStr);
      setPlanDurationCount(1);
      setDateMode("single");
      setDuration(3);
      setTimeSlot("09:00 AM - 12:00 PM");
      setMultiDateSlots([
        {
          id: "slot-1",
          date: todayStr,
          duration: 3,
          timeSlot: "09:00 AM - 12:00 PM",
          startTime: "09:00",
          endTime: "12:00",
        },
      ]);
      setCoworkingServices({
        locker: 0,
        printing: 0,
        meetingRoom: 0,
        storage: 0,
        parking: 0,
      });
      setExclusiveServices({
        marketingSupport: 0,
        projector: 0,
        speakerSound: 0,
        mediaShoot: 0,
        eventCoordinator: 0,
      });
      setStatus("Upcoming");
      setManualStatusSelected(false);
      setErrors({});
    }
  }, [isOpen, initialBooking, draftValues]);

  // Load Spaces
  useEffect(() => {
    if (!isOpen) return;
    const ac = new AbortController();
    setSpacesLoading(true);
    setSpacesError("");
    handleGetSpaces(undefined, ac.signal)
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.spaces;
        if (Array.isArray(list)) {
          setSpaces(list);
          const targetId = spaceId || initialBooking?.spaceId || draftValues?.spaceId;
          if (targetId) {
            const current = list.find((s) => String(s._id) === String(targetId));
            if (current) {
              setSpaceId(String(current._id));
              setSpaceTypeFilter(isCoworkingSpace(current) ? "coworking" : "exclusive");
            }
          } else {
            const firstCowork = list.find(isCoworkingSpace);
            if (firstCowork) {
              setSpaceTypeFilter("coworking");
              setSpaceId(String(firstCowork._id));
            } else if (list[0]) {
              setSpaceTypeFilter("exclusive");
              setSpaceId(String(list[0]._id));
            }
          }
        }
      })
      .catch((err: unknown) => {
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code?: string }).code === "ERR_CANCELED"
        ) {
          return;
        }
        setSpacesError("Could not load spaces.");
      })
      .finally(() => setSpacesLoading(false));
    return () => ac.abort();
  }, [isOpen]);

  const handleSpaceTypeToggle = (type: "coworking" | "exclusive") => {
    setSpaceTypeFilter(type);
    if (type === "exclusive") {
      setDateMode("single");
    }
    const matching = spaces.filter(
      type === "coworking" ? isCoworkingSpace : isExclusiveSpace,
    );
    if (matching.length > 0) {
      const alreadyMatches = matching.some((s) => String(s._id) === String(spaceId));
      if (!alreadyMatches) {
        const nextSpace = matching[0];
        setSpaceId(String(nextSpace._id));
        setSpaceQty(1);
        const info = parsePlanDuration(nextSpace.name, nextSpace.spaceType || type);
        setPlanDurationCount(info.baseCount);
      }
    }
  };

  const coworkingCount = useMemo(
    () => spaces.filter(isCoworkingSpace).length,
    [spaces],
  );

  const exclusiveCount = useMemo(
    () => spaces.filter(isExclusiveSpace).length,
    [spaces],
  );

  const filteredSpaces = useMemo(() => {
    return spaces.filter((space) => {
      const matchesType =
        spaceTypeFilter === "coworking"
          ? isCoworkingSpace(space)
          : isExclusiveSpace(space);
      if (!matchesType) return false;

      const q = spaceSearch.trim().toLowerCase();
      if (!q) return true;

      const sName = String(space.name || "").toLowerCase();
      const sCode = getSpaceCode(space).toLowerCase();
      const sCat = String(space.category || "").toLowerCase();
      const sDay = String(space.day || "").toLowerCase();

      return sName.includes(q) || sCode.includes(q) || sCat.includes(q) || sDay.includes(q);
    });
  }, [spaces, spaceTypeFilter, spaceSearch]);

  const selectedSpace = useMemo(() => {
    return spaces.find((s) => String(s._id) === String(spaceId)) || filteredSpaces[0] || null;
  }, [spaces, spaceId, filteredSpaces]);

  const planDurationInfo = useMemo(() => {
    return parsePlanDuration(
      selectedSpace?.name || "",
      selectedSpace?.spaceType || spaceTypeFilter,
    );
  }, [selectedSpace, spaceTypeFilter]);

  const isDurationPlan =
    spaceTypeFilter === "coworking" || planDurationInfo.isDurationPlan;

  const packageMultiplier = useMemo(() => {
    const base = planDurationInfo.baseCount || 1;
    return Math.max(1, Math.round(planDurationCount / base));
  }, [planDurationCount, planDurationInfo.baseCount]);

  const coworkingEndDate = useMemo(() => {
    return calculatePlanEndDate(
      coworkingStartDate,
      planDurationInfo.unit,
      planDurationCount,
    );
  }, [coworkingStartDate, planDurationInfo.unit, planDurationCount]);

  const totalDaysForHours = useMemo(() => {
    if (!coworkingStartDate || !coworkingEndDate) return 1;
    const [sy, sm, sd] = coworkingStartDate.split("-").map(Number);
    const [ey, em, ed] = coworkingEndDate.split("-").map(Number);
    const sDate = new Date(sy, sm - 1, sd);
    const eDate = new Date(ey, em - 1, ed);
    const diff = Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  }, [coworkingStartDate, coworkingEndDate]);

  // Availability & date-time validation
  const businessNow = useBusinessNow(isOpen);
  const todayKey = businessNow.dateKey;
  const editingBookingId = isEdit
    ? String(initialBooking?._id || initialBooking?.id || "")
    : "";
  const availabilitySpaceId = selectedSpace?._id ? String(selectedSpace._id) : spaceId;
  const needsConflictCheck = selectedSpace ? !isCoworkingSpace(selectedSpace) : false;
  const isMultipleMode = !isDurationPlan && dateMode === "multiple";

  const availabilityRange = useMemo(() => {
    if (isDurationPlan) {
      return { from: coworkingStartDate, to: coworkingEndDate || coworkingStartDate };
    }
    if (isMultipleMode) {
      const dates = multiDateSlots.map((s) => s.date).filter(Boolean).sort();
      return { from: dates[0] || "", to: dates[dates.length - 1] || "" };
    }
    return { from: bookingDate, to: bookingDate };
  }, [
    isDurationPlan,
    isMultipleMode,
    coworkingStartDate,
    coworkingEndDate,
    multiDateSlots,
    bookingDate,
  ]);

  const availability = useSpaceAvailability({
    spaceId: availabilitySpaceId,
    from: availabilityRange.from,
    to: availabilityRange.to,
    excludeId: editingBookingId || undefined,
    enabled: isOpen && needsConflictCheck,
  });

  const busySlots = useMemo(
    () =>
      needsConflictCheck && availability.data?.conflictScoped !== false
        ? availability.data?.busy ?? []
        : [],
    [needsConflictCheck, availability.data],
  );

  /** Slots the edited booking already holds; they stay valid even if now in the past. */
  const originalSlotKeys = useMemo(() => {
    const keys = new Set<string>();
    const src = initialBooking;
    if (!src || src.status === "Draft" || src.status === "Cancelled") return keys;
    if (src.summarySnapshot?.isDurationPlan) {
      const start = toDateInput(src.coworkingStartDate || src.bookingDate);
      const end = src.coworkingEndDate ? toDateInput(src.coworkingEndDate) : start;
      for (let d = start, i = 0; d <= end && i <= 400; d = addDaysToKey(d, 1), i++) {
        keys.add(`${d}|full`);
      }
    } else if (
      src.dateMode === "multiple" &&
      Array.isArray(src.multiDateSlots) &&
      src.multiDateSlots.length > 0
    ) {
      src.multiDateSlots.forEach((s) =>
        keys.add(`${toDateInput(s.date)}|${s.startTime}|${s.endTime}`),
      );
    } else {
      keys.add(`${toDateInput(src.bookingDate)}|${src.startTime}|${src.endTime}`);
    }
    return keys;
  }, [initialBooking]);

  const getSlotStatus = useCallback(
    (date: string, startTime: string, endTime: string): SlotAvailability => {
      if (originalSlotKeys.has(`${date}|${startTime}|${endTime}`)) return "available";
      return getSlotAvailability(date, startTime, endTime, busySlots, businessNow);
    },
    [originalSlotKeys, busySlots, businessNow],
  );

  const toBadgeStatus = (status: SlotAvailability): SlotAvailability | "checking" =>
    status !== "unavailable" && needsConflictCheck && availability.loading
      ? "checking"
      : status;

  const singleSlotStatus = getSlotStatus(bookingDate, bookingFrom, bookingTo);

  const multiSlotStatuses = useMemo(
    () => multiDateSlots.map((s) => getSlotStatus(s.date, s.startTime, s.endTime)),
    [multiDateSlots, getSlotStatus],
  );

  const multiSlotOverlap = useMemo(() => {
    for (let i = 0; i < multiDateSlots.length; i++) {
      for (let j = i + 1; j < multiDateSlots.length; j++) {
        const a = multiDateSlots[i];
        const b = multiDateSlots[j];
        if (!a.date || a.date !== b.date) continue;
        const as = timeToMinutes(a.startTime);
        const ae = timeToMinutes(a.endTime);
        const bs = timeToMinutes(b.startTime);
        const be = timeToMinutes(b.endTime);
        if (as != null && ae != null && bs != null && be != null && as < be && bs < ae) {
          return { first: i + 1, second: j + 1, date: a.date };
        }
      }
    }
    return null;
  }, [multiDateSlots]);

  const durationPlanPast =
    isDurationPlan &&
    Boolean(coworkingStartDate) &&
    coworkingStartDate < todayKey &&
    !originalSlotKeys.has(`${coworkingStartDate}|full`);

  const durationPlanBookedDates = useMemo(() => {
    if (!isDurationPlan || !coworkingStartDate) return [];
    const end = coworkingEndDate || coworkingStartDate;
    const dates = new Set<string>();
    for (const b of busySlots) {
      if (b.date < coworkingStartDate || b.date > end) continue;
      if (originalSlotKeys.has(`${b.date}|full`)) continue;
      if (findBusyOverlaps(b.date, "09:00", "21:00", [b]).length > 0) dates.add(b.date);
    }
    return [...dates].sort();
  }, [isDurationPlan, coworkingStartDate, coworkingEndDate, busySlots, originalSlotKeys]);

  const durationPlanStatus: SlotAvailability = durationPlanPast
    ? "unavailable"
    : durationPlanBookedDates.length > 0
    ? "booked"
    : "available";

  const dateInputMin = (value: string) =>
    isEdit && value && value < todayKey ? undefined : todayKey;

  const renderSlotOptions = (
    slots: string[],
    date: string,
    currentValue: string,
  ) => {
    const list =
      currentValue && !slots.includes(currentValue) ? [currentValue, ...slots] : slots;
    return list.map((slot) => {
      const { startTime, endTime } = parseTimeSlotRange(slot);
      const status = getSlotStatus(date, startTime, endTime);
      return (
        <option
          key={slot}
          value={slot}
          disabled={status !== "available" && slot !== currentValue}
          className={status === "available" ? "" : "text-slate-400"}
        >
          {slot}
          {SLOT_OPTION_SUFFIX[status]}
        </option>
      );
    });
  };

  // Auto-sync plan duration count when selected space changes
  const prevSelectedSpaceIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedSpace) return;
    const sId = String(selectedSpace._id);
    if (prevSelectedSpaceIdRef.current && prevSelectedSpaceIdRef.current !== sId) {
      const info = parsePlanDuration(
        selectedSpace.name || "",
        selectedSpace.spaceType || spaceTypeFilter,
      );
      setPlanDurationCount(info.baseCount);
    }
    prevSelectedSpaceIdRef.current = sId;
  }, [selectedSpace, spaceTypeFilter]);

  // Customer Search & Dropdown
  useEffect(() => {
    if (!customerDropdownOpen) return;
    const term = debouncedCustomerSearch.trim();
    if (term.length < 2) {
      setCustomers([]);
      setLoadingCustomers(false);
      return;
    }

    const controller = new AbortController();
    const loadCustomers = async () => {
      try {
        setLoadingCustomers(true);
        const res = await handleGetCustomers(term, controller.signal, 10);
        const list = Array.isArray(res?.customers) ? res.customers : [];
        setCustomers(list);
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code?: string }).code === "ERR_CANCELED"
        ) {
          return;
        }
        setCustomers([]);
      } finally {
        setLoadingCustomers(false);
      }
    };

    void loadCustomers();
    return () => controller.abort();
  }, [debouncedCustomerSearch, customerDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        customerSearchRef.current &&
        !customerSearchRef.current.contains(event.target as Node)
      ) {
        setCustomerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Autofetch customer details by 10-digit phone
  useEffect(() => {
    const cleaned = phone.trim().replace(/\D/g, "");
    if (cleaned.length !== 10) return;
    if (name.trim()) return;

    const controller = new AbortController();
    handleGetCustomers(cleaned, controller.signal, 1)
      .then((res) => {
        const list = Array.isArray(res?.customers) ? res.customers : [];
        const match =
          list.find(
            (c: CustomerPayload) =>
              String(c.mobile || "").replace(/\D/g, "") === cleaned,
          ) || list[0];
        if (match?.name) {
          setName(match.name);
          setCustomerId(match._id || (match as any).id || null);
          setMembershipType(match.membershipType || "none");
          setMembershipPlanId(match.membershipPlanId || null);
          setErrors((prev) => ({ ...prev, name: "", phone: "" }));
          setIsPhoneAutoFetched(true);
        }
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [phone, name]);

  const handleSelectCustomer = (c: CustomerPayload) => {
    setName(c.name || "");
    const cleanedMobile = c.mobile ? String(c.mobile).replace(/\D/g, "") : "";
    setPhone(cleanedMobile);
    setIsPhoneAutoFetched(Boolean(cleanedMobile));
    setCustomerId(c._id || (c as any).id || null);
    setMembershipType(c.membershipType || "none");
    setMembershipPlanId(c.membershipPlanId || null);
    setCustomerDropdownOpen(false);
    setCustomers([]);
    setErrors((prev) => ({
      ...prev,
      name: "",
      phone: "",
    }));
  };

  const handleCreateCustomerSubmit = async (args: {
    payload: CustomerPayload;
    profileImageFile?: File | null;
  }) => {
    try {
      setCreatingCustomer(true);
      const createdBy = {
        m_staff_id: staff?.m_staff_id ?? null,
        m_staff_name: staff?.m_staff_name ?? null,
        m_staff_email: staff?.m_staff_email ?? null,
      };

      let response;
      if (args.profileImageFile) {
        const fd = customerPayloadToFormData(
          { ...args.payload, createdBy },
          args.profileImageFile,
        );
        response = await handleCreateCustomer(fd);
      } else {
        response = await handleCreateCustomer({
          ...args.payload,
          createdBy,
        });
      }

      const created = response?.customer ?? response?.data ?? response;
      const createdName = String(created?.name || args.payload.name || "").trim();
      const createdPhone = String(created?.mobile || args.payload.mobile || "").trim();
      const cleaned = createdPhone.replace(/\D/g, "");

      const createdId = created?._id || (created as any)?.id || null;
      const createdMembership =
        created?.membershipType || args.payload.membershipType || "none";
      const createdPlanId =
        created?.membershipPlanId || args.payload.membershipPlanId || null;

      if (createdName) setName(createdName);
      if (cleaned) {
        setPhone(cleaned);
        setIsPhoneAutoFetched(true);
      }
      setCustomerId(createdId);
      setMembershipType(createdMembership);
      setMembershipPlanId(createdPlanId);

      setErrors((prev) => ({
        ...prev,
        name: "",
        phone: "",
      }));

      setShowCreateCustomerModal(false);
      await Swal.fire({
        title: "Customer Added",
        text: `${createdName || "Customer"} has been created and selected.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "Create failed",
        err?.response?.data?.message ?? "Could not create customer. Try again.",
        "error",
      );
    } finally {
      setCreatingCustomer(false);
    }
  };

  // Coworking / Duration Plan Handlers
  const handleDurationChange = (delta: number) => {
    const step = planDurationInfo.baseCount || 1;
    setPlanDurationCount((prev) => Math.max(step, prev + delta * step));
  };

  // Exclusive Duration & Time Slot Handlers
  const handleApplySingleDuration = (hours: number) => {
    const safeH = Math.max(1, Math.min(12, Math.round(hours)));
    setDuration(safeH);
    let [startH] = bookingFrom.split(":").map(Number);
    if (Number.isNaN(startH) || startH < 9) startH = 9;
    if (startH + safeH > 21) {
      startH = Math.max(9, 21 - safeH);
    }
    const endH = startH + safeH;
    const newFrom = `${String(startH).padStart(2, "0")}:00`;
    const newTo = `${String(endH).padStart(2, "0")}:00`;
    setBookingFrom(newFrom);
    setBookingTo(newTo);
    setTimeSlot(`${formatTimeSlotDisplay(newFrom)} - ${formatTimeSlotDisplay(newTo)}`);
  };

  const handleSingleTimeSlotChange = (slotVal: string) => {
    setTimeSlot(slotVal);
    const { hours, startTime, endTime } = parseTimeSlotRange(slotVal);
    setDuration(hours);
    setBookingFrom(startTime);
    setBookingTo(endTime);
  };

  // Multi-Date Slots Handlers
  const handleAddSlot = () => {
    const lastDate =
      multiDateSlots[multiDateSlots.length - 1]?.date || bookingDate || getBusinessToday();
    const nextDateStr = addDaysToKey(lastDate, 1);
    const newSlot: MultiDateSlot = {
      id: `slot-${Date.now()}`,
      date: nextDateStr,
      duration: 3,
      timeSlot: "09:00 AM - 12:00 PM",
      startTime: "09:00",
      endTime: "12:00",
    };
    setMultiDateSlots((prev) => [...prev, newSlot]);
  };

  const handleRemoveSlot = (id: string) => {
    if (multiDateSlots.length <= 1) return;
    setMultiDateSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateSlotDate = (id: string, newDate: string) => {
    setMultiDateSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, date: newDate } : s)),
    );
  };

  const handleUpdateSlotDuration = (id: string, delta: number) => {
    setMultiDateSlots((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const newDur = Math.max(1, Math.min(12, s.duration + delta));
        let [startH] = (s.startTime || "09:00").split(":").map(Number);
        if (Number.isNaN(startH) || startH < 9) startH = 9;
        if (startH + newDur > 21) {
          startH = Math.max(9, 21 - newDur);
        }
        const endH = startH + newDur;
        const startTime = `${String(startH).padStart(2, "0")}:00`;
        const endTime = `${String(endH).padStart(2, "0")}:00`;
        const newSlotStr = `${formatTimeSlotDisplay(startTime)} - ${formatTimeSlotDisplay(endTime)}`;
        return {
          ...s,
          duration: newDur,
          startTime,
          endTime,
          timeSlot: newSlotStr,
        };
      }),
    );
  };

  const handleUpdateSlotTime = (id: string, newTimeSlot: string) => {
    const { hours, startTime, endTime } = parseTimeSlotRange(newTimeSlot);
    setMultiDateSlots((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              timeSlot: newTimeSlot,
              duration: hours,
              startTime,
              endTime,
            }
          : s,
      ),
    );
  };

  // Additional Services Toggle & Stepper
  const handleToggleService = (
    type: "coworking" | "exclusive",
    key: string,
    checked: boolean,
  ) => {
    if (type === "coworking") {
      setCoworkingServices((prev) => ({
        ...prev,
        [key]: checked ? 1 : 0,
      }));
    } else {
      setExclusiveServices((prev) => ({
        ...prev,
        [key]: checked ? 1 : 0,
      }));
    }
  };

  const handleServiceQtyChange = (
    type: "coworking" | "exclusive",
    key: string,
    delta: number,
  ) => {
    if (type === "coworking") {
      setCoworkingServices((prev) => ({
        ...prev,
        [key]: Math.max(0, (prev[key] || 0) + delta),
      }));
    } else {
      setExclusiveServices((prev) => ({
        ...prev,
        [key]: Math.max(0, (prev[key] || 0) + delta),
      }));
    }
  };

  // Selected Services List for Summary
  const selectedServicesList = useMemo<SelectedServiceItem[]>(() => {
    if (spaceTypeFilter === "coworking") {
      return activeCoworkingServices
        .filter((s) => (coworkingServices[s.key] || 0) > 0)
        .map((s) => ({
          label: s.label,
          price: s.price,
          qty: coworkingServices[s.key] || 0,
        }));
    }
    return activeExclusiveServices
      .filter((s) => (exclusiveServices[s.key] || 0) > 0)
      .map((s) => ({
        label: s.label,
        price: s.price,
        qty: exclusiveServices[s.key] || 0,
      }));
  }, [
    spaceTypeFilter,
    coworkingServices,
    exclusiveServices,
    activeCoworkingServices,
    activeExclusiveServices,
  ]);

  // Discount & Cashback Calculation
  const activeMembershipPlan = useMemo(() => {
    return resolveMembershipPlan(membershipPlans, membershipType, membershipPlanId);
  }, [membershipPlans, membershipType, membershipPlanId]);

  const { discountAmount, cashbackAmount } = useMemo(() => {
    const benefit = resolveBenefitPercents("space", activeMembershipPlan);
    const unitRate = Math.max(
      0,
      Number(selectedSpace?.price ?? (spaceTypeFilter === "coworking" ? 400 : 800)),
    );
    const baseSpaceTotal =
      isDurationPlan
        ? unitRate * packageMultiplier * spaceQty
        : dateMode === "multiple"
        ? multiDateSlots.reduce(
            (acc, s) => acc + unitRate * (s.duration || 1) * spaceQty,
            0,
          )
        : unitRate * (calcDurationHours(bookingFrom, bookingTo) || duration) * spaceQty;

    const servicesTotal = selectedServicesList.reduce(
      (acc, s) => acc + s.price * s.qty,
      0,
    );
    const subTotal = baseSpaceTotal + servicesTotal;

    const discPct =
      benefit.discountPercent > 0
        ? benefit.discountPercent
        : membershipType && membershipType !== "none"
        ? 10
        : 0;
    const cashPct =
      benefit.cashbackPercent > 0
        ? benefit.cashbackPercent
        : membershipType && membershipType !== "none"
        ? 5
        : 0;

    const discount = Math.round(subTotal * (discPct / 100));
    const cashback = Math.round(subTotal * (cashPct / 100));

    return { discountAmount: discount, cashbackAmount: cashback };
  }, [
    activeMembershipPlan,
    membershipType,
    selectedSpace,
    spaceTypeFilter,
    isDurationPlan,
    packageMultiplier,
    planDurationCount,
    spaceQty,
    dateMode,
    multiDateSlots,
    bookingFrom,
    bookingTo,
    duration,
    selectedServicesList,
  ]);

  const validate = () => {
    const err: Record<string, string> = {};
    if (!name.trim()) err.name = "Customer name is required.";
    if (!phone.trim()) err.phone = "Phone number is required.";
    else if (!/^\d{10}$/.test(phone.trim().replace(/\D/g, ""))) {
      err.phone = "Please enter a valid 10-digit phone number.";
    }

    if (!spaceId) err.spaceId = "Please select a space.";

    if (isDurationPlan) {
      if (!coworkingStartDate) err.coworkingStartDate = "Start date is required.";
      else if (durationPlanPast) err.coworkingStartDate = BOOKING_MESSAGES.PAST;
      else if (durationPlanBookedDates.length > 0) {
        err.coworkingStartDate = `${BOOKING_MESSAGES.ALREADY_BOOKED} (${durationPlanBookedDates
          .map((d) => formatDateDisplay(d))
          .join(", ")})`;
      }
    } else if (dateMode === "multiple" && spaceTypeFilter === "exclusive") {
      if (multiDateSlots.length === 0) {
        err.multiDates = "Please add at least one date.";
      }
      for (let i = 0; i < multiDateSlots.length; i++) {
        if (!multiDateSlots[i].date) {
          err.multiDates = `Date for row ${i + 1} is required.`;
          break;
        }
      }
      if (!err.multiDates) {
        const pastIdx = multiSlotStatuses.indexOf("unavailable");
        const bookedIdx = multiSlotStatuses.indexOf("booked");
        if (pastIdx >= 0) {
          err.multiDates = `Row ${pastIdx + 1}: ${BOOKING_MESSAGES.PAST}`;
        } else if (bookedIdx >= 0) {
          err.multiDates = `Row ${bookedIdx + 1}: ${BOOKING_MESSAGES.ALREADY_BOOKED}`;
        } else if (multiSlotOverlap) {
          err.multiDates = `Rows ${multiSlotOverlap.first} and ${multiSlotOverlap.second} overlap on ${formatDateDisplay(multiSlotOverlap.date)}.`;
        }
      }
    } else {
      if (!bookingDate) err.bookingDate = "Booking date is required.";
      if (!bookingFrom) err.bookingFrom = "Start time is required.";
      if (!bookingTo) err.bookingTo = "End time is required.";
      if (bookingFrom && bookingTo && bookingTo <= bookingFrom) {
        err.bookingTo = "End time must be after start time.";
      }
      if (!err.bookingDate && !err.bookingFrom && !err.bookingTo) {
        if (singleSlotStatus === "unavailable") err.timeSlot = BOOKING_MESSAGES.PAST;
        else if (singleSlotStatus === "booked") {
          err.timeSlot = BOOKING_MESSAGES.ALREADY_BOOKED;
        }
      }
    }

    if (!purpose.trim()) {
      err.purpose = "Purpose of booking is required.";
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (needsConflictCheck && availability.loading) {
      toast.info("Checking availability… please try again in a moment.");
      return;
    }
    if (!validate()) return;
    if (spacesLoading) {
      toast.error("Please wait for spaces to finish loading.");
      return;
    }

    const isDuration = isDurationPlan;
    const isMultiple = !isDuration && dateMode === "multiple";
    const durationHours = isDuration
      ? totalDaysForHours * 8
      : isMultiple
      ? multiDateSlots.reduce((acc, s) => acc + (s.duration || 1), 0)
      : calcDurationHours(bookingFrom, bookingTo) || duration;

    const unitPrice = Math.max(
      0,
      Number(
        selectedSpace?.price ?? (spaceTypeFilter === "coworking" ? 400 : 800),
      ),
    );
    const servicesTotal = selectedServicesList.reduce(
      (acc, s) => acc + s.price * s.qty,
      0,
    );
    const spaceCharges = isDuration
      ? unitPrice * packageMultiplier * spaceQty
      : isMultiple
      ? multiDateSlots.reduce(
          (acc, s) => acc + unitPrice * (s.duration || 1) * spaceQty,
          0,
        )
      : unitPrice * (calcDurationHours(bookingFrom, bookingTo) || duration) * spaceQty;

    const lineTotal = Math.max(0, spaceCharges + servicesTotal - discountAmount);

    if (!isEdit && lineTotal <= 0) {
      toast.error("Booking total is ₹0. Check space price and booking duration.");
      return;
    }

    const spaceType = selectedSpace
      ? selectedSpace.spaceType ||
        (isCoworkingSpace(selectedSpace) ? "Coworking" : "Exclusive")
      : undefined;
    const spaceCode = selectedSpace ? getSpaceCode(selectedSpace) : undefined;

    let finalNotes = notes.trim();
    if (purpose) {
      finalNotes = finalNotes ? `Purpose: ${purpose}\n${finalNotes}` : `Purpose: ${purpose}`;
    }
    if (isDuration) {
      const durationText = `${planDurationCount} ${
        planDurationCount === 1 ? planDurationInfo.unitSingular : planDurationInfo.unitPlural
      }`;
      const coworkSummary = `${spaceType || (spaceTypeFilter === "coworking" ? "Coworking" : "Exclusive")} Booking (${durationText}: ${formatDateDisplay(coworkingStartDate)} to ${formatDateDisplay(coworkingEndDate)})`;
      finalNotes = finalNotes ? `${finalNotes}\n${coworkSummary}` : coworkSummary;
    } else if (isMultiple && multiDateSlots.length > 0) {
      const datesSummary = multiDateSlots
        .map((s) => `${formatDateDisplay(s.date)} (${s.timeSlot}, ${s.duration}h)`)
        .join(" | ");
      finalNotes = finalNotes
        ? `${finalNotes}\nDates: ${datesSummary}`
        : `Multi-Date Booking: ${datesSummary}`;
    }

    const summarySnapshot = {
      spaceType: spaceTypeFilter,
      dateMode,
      spaceName: selectedSpace?.name || "",
      spaceCode,
      spaceImageUrl: (selectedSpace as any)?.images?.[0] || selectedSpace?.imageUrl || null,
      spaceDay: selectedSpace?.day || "",
      spaceCategory: selectedSpace?.category || "space",
      spaceQty,
      unitPrice,
      priceSuffix:
        spaceTypeFilter === "coworking"
          ? ` / ${planDurationInfo.unitSingular.toLowerCase()}`
          : " / hr",
      bookingDate: isDuration
        ? coworkingStartDate
        : isMultiple
        ? multiDateSlots[0]?.date || bookingDate
        : bookingDate,
      coworkingStartDate,
      coworkingEndDate,
      duration: durationHours,
      timeSlot,
      multiDateSlots,
      isDurationPlan: isDuration,
      planDurationCount,
      durationUnit: planDurationInfo.unit,
      durationUnitSingular: planDurationInfo.unitSingular,
      durationUnitPlural: planDurationInfo.unitPlural,
      packageMultiplier,
      selectedServices: selectedServicesList,
      coworkingServices,
      exclusiveServices,
      spaceCharges,
      servicesTotal,
      subTotal: spaceCharges + servicesTotal,
      discountAmount,
      cashbackAmount,
      grandTotal: lineTotal,
      purpose,
      notes: finalNotes,
    };

    const payload: BookingFormPayload = {
      customerName: name.trim(),
      customerPhone: phone.trim().replace(/\D/g, ""),
      customerId: customerId || undefined,
      membershipType: membershipType || undefined,
      membershipPlanId: membershipPlanId || undefined,
      spaceId: selectedSpace?._id ? String(selectedSpace._id) : spaceId,
      bookingDate: isDuration
        ? coworkingStartDate
        : isMultiple
        ? multiDateSlots[0]?.date || bookingDate
        : bookingDate,
      startTime: isDuration
        ? "09:00"
        : isMultiple
        ? multiDateSlots[0]?.startTime || bookingFrom
        : bookingFrom,
      endTime: isDuration
        ? "21:00"
        : isMultiple
        ? multiDateSlots[0]?.endTime || bookingTo
        : bookingTo,
      status,
      notes: finalNotes || undefined,
      spaceName: selectedSpace?.name || "",
      spaceCode,
      spaceType,
      spaceDay: selectedSpace?.day || "",
      spaceCategory: selectedSpace?.category || "space",
      unitPrice,
      durationHours,
      lineTotal,
      spaceQty,
      dateMode,
      multiDateSlots,
      durationCount: planDurationCount,
      durationUnit: planDurationInfo.unit,
      packageMultiplier,
      coworkingStartDate,
      coworkingEndDate,
      subTotal: spaceCharges + servicesTotal,
      discountAmount,
      cashbackAmount,
      selectedServices: selectedServicesList,
      summarySnapshot,
    };

    try {
      await onSubmit(payload);
    } catch {
      // Parent handles toast; refresh in case the slot was taken meanwhile
      availability.reload();
    }
  };

  const handleSaveDraftClick = async () => {
    const err: Record<string, string> = {};
    if (!name.trim()) err.name = "Customer name is required.";
    if (!phone.trim()) err.phone = "Phone number is required.";
    if (!spaceId) err.spaceId = "Please select a space.";

    if (Object.keys(err).length > 0) {
      setErrors((prev) => ({ ...prev, ...err }));
      toast.warning("Please provide customer name, phone, and space to save draft.");
      return;
    }

    const isDuration = isDurationPlan;
    const isMultiple = !isDuration && dateMode === "multiple";
    const durationHours = isDuration
      ? totalDaysForHours * 8
      : isMultiple
      ? multiDateSlots.reduce((acc, s) => acc + (s.duration || 1), 0)
      : calcDurationHours(bookingFrom, bookingTo) || duration;

    const unitPrice = Math.max(
      0,
      Number(
        selectedSpace?.price ?? (spaceTypeFilter === "coworking" ? 400 : 800),
      ),
    );
    const servicesTotal = selectedServicesList.reduce(
      (acc, s) => acc + s.price * s.qty,
      0,
    );
    const spaceCharges = isDuration
      ? unitPrice * packageMultiplier * spaceQty
      : isMultiple
      ? multiDateSlots.reduce(
          (acc, s) => acc + unitPrice * (s.duration || 1) * spaceQty,
          0,
        )
      : unitPrice * (calcDurationHours(bookingFrom, bookingTo) || duration) * spaceQty;

    const lineTotal = Math.max(0, spaceCharges + servicesTotal - discountAmount);

    const spaceType = selectedSpace
      ? selectedSpace.spaceType ||
        (isCoworkingSpace(selectedSpace) ? "Coworking" : "Exclusive")
      : undefined;
    const spaceCode = selectedSpace ? getSpaceCode(selectedSpace) : undefined;

    let finalNotes = notes.trim();
    if (purpose) {
      finalNotes = finalNotes ? `Purpose: ${purpose}\n${finalNotes}` : `Purpose: ${purpose}`;
    }
    if (isDuration) {
      const durationText = `${planDurationCount} ${
        planDurationCount === 1 ? planDurationInfo.unitSingular : planDurationInfo.unitPlural
      }`;
      const coworkSummary = `${spaceType || (spaceTypeFilter === "coworking" ? "Coworking" : "Exclusive")} Booking (${durationText}: ${formatDateDisplay(coworkingStartDate)} to ${formatDateDisplay(coworkingEndDate)})`;
      finalNotes = finalNotes ? `${finalNotes}\n${coworkSummary}` : coworkSummary;
    } else if (isMultiple && multiDateSlots.length > 0) {
      const datesSummary = multiDateSlots
        .map((s) => `${formatDateDisplay(s.date)} (${s.timeSlot}, ${s.duration}h)`)
        .join(" | ");
      finalNotes = finalNotes
        ? `${finalNotes}\nDates: ${datesSummary}`
        : `Multi-Date Booking: ${datesSummary}`;
    }

    const summarySnapshot = {
      spaceType: spaceTypeFilter,
      dateMode,
      spaceName: selectedSpace?.name || "",
      spaceCode,
      spaceImageUrl: (selectedSpace as any)?.images?.[0] || selectedSpace?.imageUrl || null,
      spaceDay: selectedSpace?.day || "",
      spaceCategory: selectedSpace?.category || "space",
      spaceQty,
      unitPrice,
      priceSuffix:
        spaceTypeFilter === "coworking"
          ? ` / ${planDurationInfo.unitSingular.toLowerCase()}`
          : " / hr",
      bookingDate: isDuration
        ? coworkingStartDate
        : isMultiple
        ? multiDateSlots[0]?.date || bookingDate
        : bookingDate,
      coworkingStartDate,
      coworkingEndDate,
      duration: durationHours,
      timeSlot,
      multiDateSlots,
      isDurationPlan: isDuration,
      planDurationCount,
      durationUnit: planDurationInfo.unit,
      durationUnitSingular: planDurationInfo.unitSingular,
      durationUnitPlural: planDurationInfo.unitPlural,
      packageMultiplier,
      selectedServices: selectedServicesList,
      coworkingServices,
      exclusiveServices,
      spaceCharges,
      servicesTotal,
      subTotal: spaceCharges + servicesTotal,
      discountAmount,
      cashbackAmount,
      grandTotal: lineTotal,
      purpose,
      notes: finalNotes,
    };

    const draftPayload: BookingFormPayload = {
      customerName: name.trim(),
      customerPhone: phone.trim().replace(/\D/g, ""),
      customerId: customerId || undefined,
      membershipType: membershipType || undefined,
      membershipPlanId: membershipPlanId || undefined,
      spaceId: selectedSpace?._id ? String(selectedSpace._id) : spaceId,
      bookingDate: isDuration
        ? coworkingStartDate
        : isMultiple
        ? multiDateSlots[0]?.date || bookingDate
        : bookingDate,
      startTime: isDuration
        ? "09:00"
        : isMultiple
        ? multiDateSlots[0]?.startTime || bookingFrom
        : bookingFrom,
      endTime: isDuration
        ? "21:00"
        : isMultiple
        ? multiDateSlots[0]?.endTime || bookingTo
        : bookingTo,
      status: "Draft",
      notes: finalNotes || undefined,
      spaceName: selectedSpace?.name || "",
      spaceCode,
      spaceType,
      spaceDay: selectedSpace?.day || "",
      spaceCategory: selectedSpace?.category || "space",
      unitPrice,
      durationHours,
      lineTotal,
      spaceQty,
      dateMode,
      multiDateSlots,
      durationCount: planDurationCount,
      durationUnit: planDurationInfo.unit,
      packageMultiplier,
      coworkingStartDate,
      coworkingEndDate,
      subTotal: spaceCharges + servicesTotal,
      discountAmount,
      cashbackAmount,
      selectedServices: selectedServicesList,
      summarySnapshot,
    };

    try {
      setSavingDraft(true);
      if (onSaveDraft) {
        await onSaveDraft(draftPayload);
      } else {
        await onSubmit(draftPayload);
      }
    } catch {
      // Caller handles error reporting
    } finally {
      setSavingDraft(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget && !submitting) onClose();
        }}
      >
        <div className="flex h-[92vh] max-h-[94vh] w-full max-w-[1240px] flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
          {/* Modal Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {isEdit ? "Edit Space Booking" : "New Space Booking"}
                </h2>
                <p className="text-xs text-slate-500">
                  Book a space for your event, meeting or activity
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Body - 2 Columns */}
          <div className="flex-1 min-h-0 overflow-hidden p-4 sm:p-6 bg-slate-50/40">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 h-full min-h-0">
              {/* Left Column: Form (8 cols) - Scrollable Overall Information */}
             
              <div className="lg:col-span-8 h-full min-h-0 overflow-y-auto pr-3 custom-scrollbar">
                <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-6">
                  {/* 1. Customer Information */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <User size={14} />
                      </span>
                      <h3 className="font-bold text-slate-800 text-sm">
                        Customer Information
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-start">
                      {/* Left Column: Full Name & Phone Number */}
                      <div className="space-y-3">
                        {/* Full Name */}
                        <div className="relative" ref={customerSearchRef}>
                          <div className="mb-1 flex items-center justify-between">
                            <label className="block text-xs font-semibold text-slate-600">
                              Full Name <span className="text-rose-500">*</span>
                            </label>
                            {membershipType && membershipType !== "none" && (
                              <MembershipBadge
                                membershipType={membershipType}
                                membershipPlanId={membershipPlanId}
                                membershipPlans={membershipPlans}
                                showNone={false}
                                className="shadow-xs"
                              />
                            )}
                          </div>

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
                                const val = e.target.value;
                                setName(val);
                                if (!val.trim()) {
                                  setCustomerId(null);
                                  setMembershipType("none");
                                  setMembershipPlanId(null);
                                  if (isPhoneAutoFetched) {
                                    setPhone("");
                                    setIsPhoneAutoFetched(false);
                                  }
                                } else if (customerId) {
                                  setCustomerId(null);
                                  setMembershipType("none");
                                  setMembershipPlanId(null);
                                  if (isPhoneAutoFetched) {
                                    setIsPhoneAutoFetched(false);
                                  }
                                }
                                setCustomerDropdownOpen(true);
                                if (errors.name)
                                  setErrors((prev) => ({ ...prev, name: "" }));
                              }}
                              onFocus={() => {
                                if (name.trim().length >= 2) {
                                  setCustomerDropdownOpen(true);
                                }
                              }}
                              placeholder="e.g. Khushi Sahu"
                              className={`h-10 w-full rounded-xl border pl-10 pr-16 text-sm outline-none transition focus:ring-2 ${
                                errors.name
                                  ? "border-rose-300 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-100"
                                  : "border-slate-200 bg-white focus:border-indigo-500 focus:ring-indigo-100"
                              }`}
                            />

                            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
                              {name && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setName("");
                                    setPhone("");
                                    setIsPhoneAutoFetched(false);
                                    setCustomerId(null);
                                    setMembershipType("none");
                                    setMembershipPlanId(null);
                                    setCustomerDropdownOpen(false);
                                    setCustomers([]);
                                  }}
                                  title="Clear customer"
                                  className="rounded p-0.5 text-slate-400 transition hover:text-slate-600"
                                >
                                  <X size={15} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setShowCreateCustomerModal(true)}
                                title="Add New Customer"
                                className="text-indigo-500 transition hover:text-indigo-700"
                              >
                                <UserPlus size={18} />
                              </button>
                            </div>
                          </div>

                          {/* Customer Search Dropdown */}
                          {customerDropdownOpen &&
                            (loadingCustomers || customers.length > 0) && (
                              <div className="absolute left-0 right-0 z-50 mt-1 max-h-52 overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                                {loadingCustomers ? (
                                  <div className="flex items-center gap-2 px-3.5 py-2.5 text-xs text-slate-500">
                                    <Loader2
                                      size={13}
                                      className="animate-spin text-indigo-500"
                                    />
                                    <span>Searching customers…</span>
                                  </div>
                                ) : (
                                  customers.map((c) => (
                                    <button
                                      key={c._id || `${c.name}-${c.mobile}`}
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleSelectCustomer(c);
                                      }}
                                      className="flex w-full items-center justify-between border-b border-slate-100 px-3.5 py-2.5 text-left transition hover:bg-indigo-50/50 last:border-0"
                                    >
                                      <div className="min-w-0 pr-2">
                                        <p className="truncate text-xs font-semibold text-slate-800">
                                          {c.name}
                                        </p>
                                        <p className="text-[11px] text-slate-500">
                                          {c.mobile ? `+91 ${c.mobile}` : "No phone"}
                                          {c.email ? ` · ${c.email}` : ""}
                                        </p>
                                      </div>
                                      {c.membershipType &&
                                        c.membershipType !== "none" && (
                                          <MembershipBadge
                                            membershipType={c.membershipType}
                                            membershipPlanId={c.membershipPlanId}
                                            membershipPlans={membershipPlans}
                                            showNone={false}
                                            className="shrink-0"
                                          />
                                        )}
                                    </button>
                                  ))
                                )}
                              </div>
                            )}

                          {customerDropdownOpen &&
                            debouncedCustomerSearch.trim().length >= 2 &&
                            !loadingCustomers &&
                            customers.length === 0 && (
                              <div className="absolute left-0 right-0 z-50 mt-1 rounded-xl border border-slate-200 bg-white p-3 text-center shadow-xl">
                                <p className="text-xs text-slate-500">
                                  No customer found
                                </p>
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setCustomerDropdownOpen(false);
                                    setShowCreateCustomerModal(true);
                                  }}
                                  className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-100"
                                >
                                  <UserPlus size={13} />
                                  Create customer
                                </button>
                              </div>
                            )}

                          {errors.name && (
                            <p className="mt-1 text-xs text-rose-500">{errors.name}</p>
                          )}
                        </div>

                        {/* Phone Number */}
                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <label className="block text-xs font-semibold text-slate-600">
                              Phone Number <span className="text-rose-500">*</span>
                            </label>
                          </div>

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
                                if (errors.phone) {
                                  setErrors((prev) => ({ ...prev, phone: "" }));
                                }
                              }}
                              readOnly={isPhoneAutoFetched}
                              tabIndex={isPhoneAutoFetched ? -1 : 0}
                              placeholder="9876543210"
                              title={
                                isPhoneAutoFetched
                                  ? "Phone number auto-fetched from customer details (not editable)"
                                  : undefined
                              }
                              className={`h-10 w-full rounded-xl border pl-10 ${
                                isPhoneAutoFetched
                                  ? "cursor-not-allowed border-slate-200 bg-slate-100 pr-9 text-slate-500 select-none"
                                  : "border-slate-200 bg-white pr-3 focus:border-indigo-500 focus:ring-indigo-100"
                              } text-sm outline-none transition focus:ring-2 ${
                                errors.phone
                                  ? "border-rose-300 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-100"
                                  : ""
                              }`}
                            />
                          </div>
                          {errors.phone && (
                            <p className="mt-1 text-xs text-rose-500">{errors.phone}</p>
                          )}
                        </div>
                      </div>

                      {/* Right Column: Purpose */}
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <label className="block text-xs font-semibold text-slate-600">
                            Purpose of Booking <span className="text-rose-500">*</span>
                          </label>
                        </div>

                        <div className="relative">
                          <Tag
                            size={15}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <select
                            value={purpose}
                            onChange={(e) => {
                              setPurpose(e.target.value);
                              if (errors.purpose) {
                                setErrors((prev) => ({ ...prev, purpose: "" }));
                              }
                            }}
                            className={`h-10 w-full appearance-none rounded-xl border bg-white pl-9 pr-8 text-xs font-medium outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${
                              errors.purpose
                                ? "border-rose-300 bg-rose-50/30"
                                : "border-slate-200 text-slate-700"
                            }`}
                          >
                            <option value="">Select purpose</option>
                            {PURPOSE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={15}
                            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                        </div>
                        {errors.purpose && (
                          <p className="mt-1 text-xs text-rose-500">
                            {errors.purpose}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. Select Space * */}
                  
                    <div className="flex items-center  gap-2">
                      <span className="flex h-6 w-6  items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <Building2 size={14} />
                      </span>
                      <h3 className="font-bold text-slate-800 text-sm">
                        Select Space <span className="text-rose-500">*</span>
                      </h3>
                    </div>

                    {/* Search & Tabs Row */}
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                      <div className="relative flex-1">
                        <Search
                          size={16}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          type="text"
                          value={spaceSearch}
                          onChange={(e) => setSpaceSearch(e.target.value)}
                          placeholder={
                            spaceTypeFilter === "coworking"
                              ? "Search coworking spaces by name or code (e.g. SP-001, Desk)..."
                              : "Search spaces by name or code (e.g. SP-001, Desk)..."
                          }
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400"
                        />
                        {spaceSearch && (
                          <button
                            type="button"
                            onClick={() => setSpaceSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                            title="Clear search"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Segmented Category Buttons */}
                      <div className="inline-flex self-start sm:self-auto rounded-xl bg-slate-100 p-1 border border-slate-200/80">
                        <button
                          type="button"
                          onClick={() => handleSpaceTypeToggle("coworking")}
                          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                            spaceTypeFilter === "coworking"
                              ? "bg-white text-indigo-700 shadow-xs border border-indigo-200"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <Laptop size={14} />
                          <span>Coworking</span>
                          <span
                            className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                              spaceTypeFilter === "coworking"
                                ? "bg-indigo-50 text-indigo-700"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {coworkingCount}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSpaceTypeToggle("exclusive")}
                          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                            spaceTypeFilter === "exclusive"
                              ? "bg-white text-indigo-700 shadow-xs border border-indigo-200"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <Building2 size={14} />
                          <span>Exclusive</span>
                          <span
                            className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                              spaceTypeFilter === "exclusive"
                                ? "bg-indigo-50 text-indigo-700"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {exclusiveCount}
                          </span>
                        </button>
                      </div>
                    </div>

                    {errors.spaceId && (
                      <p className="text-xs text-rose-500">{errors.spaceId}</p>
                    )}

                    {/* Space Cards Grid */}
                    <div>   
                    {spacesLoading ? (
                      <div className="flex h-36 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white text-slate-500">
                        <Loader2 size={20} className="animate-spin text-indigo-500" />
                        <span className="text-xs">Loading spaces…</span>
                      </div>
                       
                    ) : spacesError && !spaces.length ? (
                      <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                        <span>{spacesError}</span>
                      </div>
                    ) : filteredSpaces.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-200 bg-white py-8 text-center">
                        <Search size={20} className="text-slate-400" />
                        <p className="text-xs font-semibold text-slate-700">No spaces found</p>
                        <p className="text-[11px] text-slate-400 max-w-xs">
                          {spaceSearch
                            ? `No ${spaceTypeFilter} spaces matched "${spaceSearch}".`
                            : `No ${spaceTypeFilter} spaces are currently available.`}
                        </p>
                      </div>
                     
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        {filteredSpaces.map((space) => {
                          const isSelected = String(space._id) === String(spaceId);
                          const code = getSpaceCode(space);
                          const img =
                            space.imageUrl ||
                            (space as any).image ||
                            (Array.isArray((space as any).images)
                              ? (space as any).images[0]
                              : null);

                          return (
                            <div
                              key={String(space._id)}
                              onClick={() => {
                                const isNew = spaceId !== String(space._id);
                                setSpaceId(String(space._id));
                                if (isNew) {
                                  setSpaceQty(1);
                                  const info = parsePlanDuration(
                                    space.name,
                                    space.spaceType || spaceTypeFilter,
                                  );
                                  setPlanDurationCount(info.baseCount);
                                }
                                if (errors.spaceId) {
                                  setErrors((prev) => ({ ...prev, spaceId: "" }));
                                }
                              }}
                              className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border text-left transition cursor-pointer select-none ${
                                isSelected
                                  ? "border-2 border-indigo-600 bg-white shadow-sm"
                                  : "border border-slate-200/90 bg-white hover:border-slate-300"
                              }`}
                            >
                              {/* Image Box */}
                              <div className="relative h-28 w-full overflow-hidden bg-slate-100">
                                <img
                                  src={
                                    img ||
                                    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80"
                                  }
                                  alt={space.name}
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src =
                                      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80";
                                  }}
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />

                                {/* Top-Left: Code Badge */}
                                <div className="absolute left-2 top-2 z-10">
                                  <span className="inline-flex items-center rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-xs">
                                    {code}
                                  </span>
                                </div>

                                {/* Top-Right: Weekday/Weekend or Selection Checkmark */}
                                <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5">
                                  {spaceTypeFilter === "exclusive" && (
                                    <span className="inline-flex items-center rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-bold text-slate-800 shadow-xs">
                                      {space.day || "Weekday"}
                                    </span>
                                  )}
                                  {isSelected && (
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xs">
                                      <Check size={12} strokeWidth={3} />
                                    </span>
                                  )}
                                </div>

                                {/* Bottom-Right: Capacity Badge */}
                                <div className="absolute bottom-2 right-2 z-10">
                                  <span className="inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-xs">
                                    <Users size={11} />
                                    <span>{space.capacity ? space.capacity : 1}</span>
                                  </span>
                                </div>
                              </div>

                              {/* Details */}
                              <div className="p-3">
                                <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                                  {space.name}
                                </h4>
                                <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                                  {code}
                                </p>

                                {/* Price & Stepper Row */}
                                <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100">
                                  <span className="text-xs font-bold text-indigo-600">
                                    ₹
                                    {Number(
                                      space.price ||
                                        (spaceTypeFilter === "coworking" ? 400 : 800),
                                    ).toLocaleString("en-IN")}
                                    <span className="text-[11px] font-normal text-slate-400">
                                      {
                                        parsePlanDuration(
                                          space.name,
                                          space.spaceType || spaceTypeFilter,
                                        ).priceSuffix
                                      }
                                    </span>
                                  </span>

                                  {/* Stepper */}
                                  <div
                                    className="flex h-7 items-center overflow-hidden rounded-lg border border-slate-200 bg-white"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isSelected) {
                                          setSpaceQty((prev) => Math.max(1, prev - 1));
                                        }
                                      }}
                                      disabled={!isSelected || spaceQty <= 1}
                                      className="flex h-full w-7 items-center justify-center border-r border-slate-100 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 transition"
                                    >
                                      <Minus size={11} />
                                    </button>
                                    <div className="flex w-6 items-center justify-center text-xs font-semibold text-slate-700">
                                      {isSelected ? spaceQty : 0}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!isSelected) {
                                          setSpaceId(String(space._id));
                                          setSpaceQty(1);
                                          const info = parsePlanDuration(
                                            space.name,
                                            space.spaceType || spaceTypeFilter,
                                          );
                                          setPlanDurationCount(info.baseCount);
                                        } else {
                                          setSpaceQty((prev) => Math.min(10, prev + 1));
                                        }
                                      }}
                                      className="flex h-full w-7 items-center justify-center border-l border-slate-100 text-slate-600 hover:bg-slate-50 transition"
                                    >
                                      <Plus size={11} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 3. Date & Duration * (Coworking or Duration Plan) OR Date & Time * (Hourly Exclusive) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                          {isDurationPlan ? (
                            <Calendar size={14} />
                          ) : (
                            <Clock size={14} />
                          )}
                        </span>
                        <h3 className="font-bold text-slate-800 text-sm">
                          {isDurationPlan
                            ? "Date & Duration"
                            : "Date & Time"}{" "}
                          <span className="text-rose-500">*</span>
                        </h3>
                      </div>

                      {/* Exclusive Mode: Single vs Multiple Toggle (only for hourly exclusive spaces) */}
                      {!isDurationPlan && spaceTypeFilter === "exclusive" && (
                        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
                          <button
                            type="button"
                            onClick={() => setDateMode("single")}
                            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                              dateMode === "single"
                                ? "bg-white text-indigo-700 shadow-xs border border-indigo-200"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            Single Date
                          </button>
                          <button
                            type="button"
                            onClick={() => setDateMode("multiple")}
                            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                              dateMode === "multiple"
                                ? "bg-white text-indigo-700 shadow-xs border border-indigo-200"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            Multiple Dates
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Mode 1: Duration Plan View (Coworking or Exclusive with Day/Week/Month Plan) */}
                    {isDurationPlan && (
                      <div className="space-y-3">
                        {/* Start Date, Duration Stepper, End Date Row */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          {/* Start Date */}
                          <div>
                            <label className="mb-1 flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                              <span>
                                Start Date <span className="text-rose-500">*</span>
                              </span>
                              {coworkingStartDate && (
                                <AvailabilityBadge status={toBadgeStatus(durationPlanStatus)} />
                              )}
                            </label>
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                try {
                                  (coworkingDateInputRef.current as any)?.showPicker?.();
                                } catch {
                                  coworkingDateInputRef.current?.focus();
                                }
                              }}
                              className="relative flex h-10 items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 hover:border-slate-300 transition cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-2 pointer-events-none">
                                <Calendar size={15} className="text-slate-500" />
                                <span className="text-xs font-semibold text-slate-700">
                                  {formatDateDisplay(coworkingStartDate)}
                                </span>
                              </div>
                              <ChevronDown size={15} className="text-slate-400" />
                              <input
                                ref={coworkingDateInputRef}
                                type="date"
                                required
                                min={dateInputMin(coworkingStartDate)}
                                value={coworkingStartDate}
                                onChange={(e) => {
                                  setCoworkingStartDate(e.target.value);
                                  setErrors((prev) => ({ ...prev, coworkingStartDate: "" }));
                                }}
                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                              />
                            </div>
                            {errors.coworkingStartDate ? (
                              <p className="mt-1 text-xs text-rose-500">
                                {errors.coworkingStartDate}
                              </p>
                            ) : durationPlanPast ? (
                              <p className="mt-1 text-xs text-rose-500">{BOOKING_MESSAGES.PAST}</p>
                            ) : durationPlanBookedDates.length > 0 && !availability.loading ? (
                              <p className="mt-1 text-xs text-rose-500">
                                {BOOKING_MESSAGES.ALREADY_BOOKED} (
                                {durationPlanBookedDates.map((d) => formatDateDisplay(d)).join(", ")})
                              </p>
                            ) : null}
                          </div>

                          {/* Stepper: No. of Months / No. of Weeks / No. of Days */}
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                              {planDurationInfo.label}
                            </label>
                            <div className="flex h-10 items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                              <button
                                type="button"
                                onClick={() => handleDurationChange(-1)}
                                disabled={planDurationCount <= (planDurationInfo.baseCount || 1)}
                                className="flex h-full w-10 items-center justify-center border-r border-slate-100 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 transition"
                              >
                                <Minus size={14} />
                              </button>
                              <div className="flex flex-1 items-center justify-center text-xs font-bold text-slate-700">
                                {planDurationCount}{" "}
                                {planDurationCount === 1
                                  ? planDurationInfo.unitSingular
                                  : planDurationInfo.unitPlural}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDurationChange(1)}
                                className="flex h-full w-10 items-center justify-center border-l border-slate-100 text-slate-600 hover:bg-slate-50 transition"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>

                          {/* End Date (Auto-calculated) */}
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                              End Date
                            </label>
                            <div className="relative flex h-10 items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 text-slate-600 select-none">
                              <Clock size={15} className="text-slate-400" />
                              <span className="text-xs font-semibold text-slate-700">
                                {formatDateDisplay(coworkingEndDate)}
                              </span>
                            </div>
                            <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                              <Info size={11} className="shrink-0" />
                              Auto calculated based on number of {planDurationInfo.unitPlural.toLowerCase()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mode 2: Exclusive Single Date View */}
                    {!isDurationPlan && spaceTypeFilter === "exclusive" && dateMode === "single" && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {/* Date */}
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Date <span className="text-rose-500">*</span>
                          </label>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              const inputEl = e.currentTarget.querySelector(
                                "input[type='date']",
                              ) as HTMLInputElement | null;
                              try {
                                (inputEl as any)?.showPicker?.();
                              } catch {
                                inputEl?.focus();
                              }
                            }}
                            className="relative flex h-10 items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 hover:border-slate-300 transition cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-2 pointer-events-none">
                              <Calendar size={15} className="text-slate-500" />
                              <span className="text-xs font-semibold text-slate-700">
                                {formatDateDisplay(bookingDate)}
                              </span>
                            </div>
                            <ChevronDown
                              size={15}
                              className="text-slate-400 pointer-events-none"
                            />
                            <input
                              type="date"
                              required
                              min={dateInputMin(bookingDate)}
                              value={bookingDate}
                              onChange={(e) => {
                                setBookingDate(e.target.value);
                                setErrors((prev) => ({ ...prev, bookingDate: "", timeSlot: "" }));
                              }}
                              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            />
                          </div>
                          {errors.bookingDate && (
                            <p className="mt-1 text-xs text-rose-500">
                              {errors.bookingDate}
                            </p>
                          )}
                        </div>

                        {/* Duration (Hours) Stepper */}
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Duration (Hours)
                          </label>
                          <div className="flex h-10 items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                            <button
                              type="button"
                              onClick={() => handleApplySingleDuration(duration - 1)}
                              disabled={duration <= 1}
                              className="flex h-full w-10 items-center justify-center border-r border-slate-100 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 transition"
                            >
                              <Minus size={14} />
                            </button>
                            <div className="flex flex-1 items-center justify-center text-xs font-bold text-slate-700">
                              {duration} {duration === 1 ? "Hour" : "Hours"}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleApplySingleDuration(duration + 1)}
                              className="flex h-full w-10 items-center justify-center border-l border-slate-100 text-slate-600 hover:bg-slate-50 transition"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-400">
                            Minimum 1 hour
                          </p>
                        </div>

                        {/* Time Slot Select */}
                        <div>
                          <label className="mb-1 flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                            <span>Time Slot</span>
                            {bookingDate && (
                              <AvailabilityBadge status={toBadgeStatus(singleSlotStatus)} />
                            )}
                          </label>
                          <div className="relative">
                            <Clock
                              size={15}
                              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <select
                              value={timeSlot}
                              onChange={(e) => {
                                handleSingleTimeSlotChange(e.target.value);
                                setErrors((prev) => ({ ...prev, timeSlot: "" }));
                              }}
                              className={`h-10 w-full appearance-none rounded-xl border bg-white pl-9 pr-8 text-xs font-medium outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${
                                singleSlotStatus === "available" ? "border-slate-200" : "border-rose-300"
                              }`}
                            >
                              {renderSlotOptions(singleDateSlots, bookingDate, timeSlot)}
                            </select>
                            <ChevronDown
                              size={15}
                              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                          </div>
                          {errors.timeSlot ? (
                            <p className="mt-1 text-xs text-rose-500">{errors.timeSlot}</p>
                          ) : singleSlotStatus === "unavailable" ? (
                            <p className="mt-1 text-xs text-rose-500">{BOOKING_MESSAGES.PAST}</p>
                          ) : singleSlotStatus === "booked" && !availability.loading ? (
                            <p className="mt-1 text-xs text-rose-500">
                              {BOOKING_MESSAGES.ALREADY_BOOKED}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {/* Mode 3: Exclusive Multiple Dates View */}
                    {!isDurationPlan && spaceTypeFilter === "exclusive" && dateMode === "multiple" && (
                      <div className="space-y-2.5">
                        {/* Column Labels */}
                        <div className="hidden sm:grid sm:grid-cols-[1fr_140px_1fr_40px] gap-2 px-1 text-xs font-semibold text-slate-500">
                          <div>Date</div>
                          <div>Duration (Hours)</div>
                          <div>Time Slot</div>
                          <div></div>
                        </div>

                        {/* Slots Rows */}
                        {multiDateSlots.map((slot, rowIdx) => {
                          const rowSlots = getTimeSlotsForDuration(slot.duration);
                          const rowStatus = multiSlotStatuses[rowIdx] ?? "available";
                          return (
                            <div
                              key={slot.id}
                              className="grid grid-cols-1 sm:grid-cols-[1fr_140px_1fr_40px] items-center gap-2"
                            >
                              {/* Date */}
                              <div
                                onClick={(e) => {
                                  const inputEl = e.currentTarget.querySelector(
                                    "input[type='date']",
                                  ) as HTMLInputElement | null;
                                  try {
                                    (inputEl as any)?.showPicker?.();
                                  } catch {
                                    inputEl?.focus();
                                  }
                                }}
                                className="relative flex h-10 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 hover:border-slate-300 transition cursor-pointer select-none"
                              >
                                <div className="flex items-center gap-2 pointer-events-none truncate">
                                  <Calendar size={14} className="text-slate-500 shrink-0" />
                                  <span className="text-xs font-semibold text-slate-700 truncate">
                                    {formatDateDisplay(slot.date)}
                                  </span>
                                </div>
                                <ChevronDown
                                  size={14}
                                  className="text-slate-400 pointer-events-none shrink-0"
                                />
                                <input
                                  type="date"
                                  min={dateInputMin(slot.date)}
                                  value={slot.date}
                                  onChange={(e) => {
                                    handleUpdateSlotDate(slot.id, e.target.value);
                                    setErrors((prev) => ({ ...prev, multiDates: "" }));
                                  }}
                                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                />
                              </div>

                              {/* Duration */}
                              <div className="flex h-10 items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSlotDuration(slot.id, -1)}
                                  disabled={slot.duration <= 1}
                                  className="flex h-full w-9 items-center justify-center border-r border-slate-100 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 transition"
                                >
                                  <Minus size={13} />
                                </button>
                                <div className="flex flex-1 items-center justify-center text-xs font-bold text-slate-700">
                                  {slot.duration} {slot.duration === 1 ? "Hour" : "Hours"}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSlotDuration(slot.id, 1)}
                                  className="flex h-full w-9 items-center justify-center border-l border-slate-100 text-slate-600 hover:bg-slate-50 transition"
                                >
                                  <Plus size={13} />
                                </button>
                              </div>

                              {/* Time Slot */}
                              <div className="relative">
                                <Clock
                                  size={15}
                                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                                <select
                                  value={slot.timeSlot}
                                  onChange={(e) => {
                                    handleUpdateSlotTime(slot.id, e.target.value);
                                    setErrors((prev) => ({ ...prev, multiDates: "" }));
                                  }}
                                  className={`h-10 w-full appearance-none rounded-xl border bg-white pl-9 pr-8 text-xs font-medium outline-none ${
                                    rowStatus === "available" ? "border-slate-200" : "border-rose-300"
                                  }`}
                                >
                                  {renderSlotOptions(rowSlots, slot.date, slot.timeSlot)}
                                </select>
                                <ChevronDown
                                  size={15}
                                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                                {slot.date && (
                                  <span className="pointer-events-none absolute -top-2 right-2 z-10">
                                    <AvailabilityBadge status={toBadgeStatus(rowStatus)} />
                                  </span>
                                )}
                              </div>

                              {/* Delete Row Button */}
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSlot(slot.id)}
                                  disabled={multiDateSlots.length <= 1}
                                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Remove Date"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {errors.multiDates && (
                          <p className="mt-1 text-xs text-rose-500">
                            {errors.multiDates}
                          </p>
                        )}

                        {/* Add Another Date Button */}
                        <button
                          type="button"
                          onClick={handleAddSlot}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 py-2.5 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50"
                        >
                          <Plus size={15} />
                          <span>Add Another Date</span>
                        </button>
                      </div>
                    )}

                    {needsConflictCheck && availabilityRange.from && (
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        {availability.loading ? (
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <Loader2 size={12} className="animate-spin" />
                            Checking availability…
                          </span>
                        ) : availability.error ? (
                          <>
                            <span className="flex items-center gap-1.5 text-amber-600">
                              <AlertCircle size={12} />
                              {availability.error} Slots will be verified when you save.
                            </span>
                            <button
                              type="button"
                              onClick={availability.reload}
                              className="font-semibold text-indigo-600 hover:underline"
                            >
                              Retry
                            </button>
                          </>
                        ) : availability.data ? (
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <Info size={12} />
                            {busySlots.length === 0
                              ? "No existing bookings for the selected date(s)."
                              : `${busySlots.length} existing booking slot${
                                  busySlots.length === 1 ? "" : "s"
                                } for the selected date(s). Booked slots are disabled.`}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* 4. Additional Services (Optional) */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <FileText size={14} />
                      </span>
                      <h3 className="font-bold text-slate-800 text-sm">
                        Additional Services{" "}
                        <span className="font-normal text-slate-400 text-xs">
                          (Optional)
                        </span>
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                      {(spaceTypeFilter === "coworking"
                        ? activeCoworkingServices
                        : activeExclusiveServices
                      ).map((service) => {
                        const qty =
                          spaceTypeFilter === "coworking"
                            ? coworkingServices[service.key] || 0
                            : exclusiveServices[service.key] || 0;
                        const isSelected = qty > 0;
                        const Icon = service.icon;

                        return (
                          <div
                            key={service.key}
                            className={`flex flex-col justify-between rounded-2xl border p-3 transition ${
                              isSelected
                                ? "border-indigo-500 bg-indigo-50/20 shadow-xs"
                                : "border-slate-200/90 bg-white hover:border-slate-300"
                            }`}
                          >
                            {/* Top Row: Icon + Checkbox */}
                            <div className="flex items-center justify-between">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                <Icon size={16} />
                              </div>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) =>
                                  handleToggleService(
                                    spaceTypeFilter,
                                    service.key,
                                    e.target.checked,
                                  )
                                }
                                className="h-4 w-4 rounded accent-indigo-600 cursor-pointer"
                              />
                            </div>

                            {/* Middle: Title & Price */}
                            <div className="my-2 min-h-[36px]">
                              <p
                                className="text-xs font-bold text-slate-800 leading-tight truncate"
                                title={service.label}
                              >
                                {service.label}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {service.priceLabel}
                              </p>
                            </div>

                            {/* Bottom: Stepper */}
                            <div className="flex h-7 items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                              <button
                                type="button"
                                onClick={() =>
                                  handleServiceQtyChange(
                                    spaceTypeFilter,
                                    service.key,
                                    -1,
                                  )
                                }
                                disabled={qty <= 0}
                                className="flex h-full w-7 items-center justify-center border-r border-slate-100 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 transition"
                              >
                                <Minus size={12} />
                              </button>
                              <div className="flex flex-1 items-center justify-center text-xs font-semibold text-slate-700">
                                {qty}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  handleServiceQtyChange(
                                    spaceTypeFilter,
                                    service.key,
                                    1,
                                  )
                                }
                                className="flex h-full w-7 items-center justify-center border-l border-slate-100 text-slate-600 hover:bg-slate-50 transition"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 5. Additional Notes (COMMON FOR ALL) */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <FileText size={14} />
                      </span>
                      <h3 className="font-bold text-slate-800 text-sm">
                        Additional Notes
                      </h3>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-600">
                          Additional Notes{" "}
                          <span className="font-normal text-slate-400">
                            (Optional)
                          </span>
                        </label>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          maxLength={200}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder={
                            spaceTypeFilter === "coworking"
                              ? "Tell us more about your booking..."
                              : "Tell us more about your event..."
                          }
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 pr-14 text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400"
                        />
                        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
                          {notes.length}/200
                        </span>
                      </div>
                    </div>

                    {/* Status toggle for edit mode */}
                    {isEdit && (
                      <div className="pt-2 border-t border-slate-100">
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                          Booking Status
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {(
                            [
                              "Upcoming",
                              "Ongoing",
                              "Draft",
                              "Expired",
                              "Cancelled",
                            ] as SpaceBookingStatus[]
                          ).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                setStatus(s);
                                setManualStatusSelected(true);
                              }}
                              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
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
                    )}
                  </div>
                </form>
              </div>

              {/* Right Column: Refactored Booking Summary Card (4 cols) */}
              <div className="lg:col-span-4 lg:h-full lg:min-h-0 lg:overflow-y-auto custom-scrollbar">
                <div>
                  {isDurationPlan ? (
                    <CoworkingSummaryCard
                      space={selectedSpace || null}
                      spaceQty={spaceQty}
                      startDate={coworkingStartDate}
                      endDate={coworkingEndDate}
                      days={totalDaysForHours}
                      durationCount={planDurationCount}
                      durationUnit={planDurationInfo.unit}
                      durationUnitSingular={planDurationInfo.unitSingular}
                      durationUnitPlural={planDurationInfo.unitPlural}
                      priceSuffix={planDurationInfo.priceSuffix}
                      packageMultiplier={packageMultiplier}
                      unitPrice={
                        selectedSpace?.price
                          ? Number(selectedSpace.price)
                          : spaceTypeFilter === "coworking"
                          ? 400
                          : 800
                      }
                      selectedServices={selectedServicesList}
                      discountAmount={discountAmount}
                      cashbackAmount={cashbackAmount}
                      formatDateDisplay={formatDateDisplay}
                    />
                  ) : dateMode === "multiple" ? (
                    <ExclusiveMultipleDatesSummaryCard
                      space={selectedSpace || null}
                      spaceQty={spaceQty}
                      slots={multiDateSlots}
                      hourlyRate={Number(selectedSpace?.price || 800)}
                      selectedServices={selectedServicesList}
                      discountAmount={discountAmount}
                      cashbackAmount={cashbackAmount}
                      formatDateDisplay={formatDateDisplay}
                    />
                  ) : (
                    <ExclusiveSingleDateSummaryCard
                      space={selectedSpace || null}
                      spaceQty={spaceQty}
                      bookingDate={bookingDate}
                      timeSlot={timeSlot}
                      duration={duration}
                      hourlyRate={Number(selectedSpace?.price || 800)}
                      selectedServices={selectedServicesList}
                      discountAmount={discountAmount}
                      cashbackAmount={cashbackAmount}
                      formatDateDisplay={formatDateDisplay}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex shrink-0 justify-end border-t border-slate-100 bg-white px-6 py-3.5">
            {/* <a
              href="mailto:support@woowoo.in"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition"
            >
              <HelpCircle size={15} />
              <span>
                Need help? <span className="underline">Contact us</span>
              </span>
            </a> */}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-50 sm:text-sm"
              >
                Cancel
              </button>


              <button
                type="button"
                onClick={handleSaveDraftClick}
                disabled={submitting || savingDraft || spacesLoading || !spaces.length}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 disabled:opacity-50 sm:text-sm"
              >
                {savingDraft ? (
                  <Loader2 size={15} className="animate-spin text-amber-600" />
                ) : (
                  <FileText size={15} className="text-amber-600" />
                )}
                <span>Save Draft</span>
              </button>

              <button
                type="submit"
                form={formId}
                disabled={submitting || savingDraft || spacesLoading || !spaces.length}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                <span>
                  {isEdit
                    ? initialBooking?.status === "Draft"
                      ? "Proceed to Checkout"
                      : "Save Changes"
                    : "Proceed to Checkout"}
                </span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showCreateCustomerModal && (
        <div className="relative z-[60]">
          <CreateCustomerModal
            loading={creatingCustomer}
            onClose={() => setShowCreateCustomerModal(false)}
            onSubmit={handleCreateCustomerSubmit}
          />
        </div>
      )}
    </>
  );
};

export default CreateBookingDetailsModal;

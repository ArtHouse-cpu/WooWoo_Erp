import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  X,
  User,
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
  UtensilsCrossed,
  Download,
} from "lucide-react";
import Swal from "sweetalert2";
// Optional: import jsPDF from "jspdf"; // If you want PDF download
import { toast } from "react-toastify";
import { downloadInvoicePdf } from "@/utils/pdfGenerator";
import { spaceOfferFromSnapshot } from "../spaceOfferLabel";
import { useAppSelector } from "@/store/hooks";
import { useDebounce } from "@/hooks/useDebounce";
import {
  handleGetSpaces,
  handleGetCustomers,
  handleCreateCustomer,
  handleGetMemberships,
  handleGetAdditionalServices,
  handleGetFoods,
  handleGetApplicableSpaceOffer,
  type ApplicableSpaceOffer,
  type AdditionalServiceItem,
  type FoodPayload,
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
  billingMembershipFromCustomer,
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
import SpaceMediaCarousel from "./SpaceMediaCarousel";
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
import { closeIfConfirmed } from "@/utils/confirmClose";

export type MultiDateSlot = {
  id: string;
  date: string;
  duration: number;
  timeSlot: string;
  startTime: string;
  endTime: string;
  isCustom?: boolean;
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
  offerDiscount?: number;
  offerSnapshot?: ApplicableSpaceOffer | null;
  selectedServices?: SelectedServiceItem[];
  foods?: SelectedFoodItem[];
  summarySnapshot?: any;
  selectedSpaces?: Array<{
    spaceId: string;
    spaceName: string;
    spaceCode?: string;
    spaceDay?: string;
    spaceCategory?: string;
    unitPrice: number;
    lineTotal: number;
  }>;
};

export function bookingCustomerDraft(
  params: URLSearchParams,
): BookingFormPayload | null {
  const customerId = params.get("customerId")?.trim() || "";
  const customerName = params.get("customerName")?.trim() || "";
  const customerPhone = params.get("customerPhone")?.trim() || "";
  if (!customerId && !customerName && !customerPhone) return null;
  const today = new Date();
  const bookingDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return {
    customerName,
    customerPhone,
    customerEmail: params.get("customerEmail")?.trim() || "",
    customerId: customerId || null,
    membershipType: params.get("membershipType") || "none",
    spaceId: "",
    bookingDate,
    startTime: "06:00",
    endTime: "12:00",
    status: "Upcoming",
  };
}

export type SelectedFoodItem = {
  foodId: string;
  label: string;
  price: number;
  qty: number;
  unit?: string;
  applyMembershipDiscount?: boolean;
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
  /** Food catalogue is only used by All Bookings. */
  showFood?: boolean;
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

const BOOKING_OPEN_HOUR = 6;
const BOOKING_CLOSE_HOUR = 24;
const BOOKING_MAX_HOURS = BOOKING_CLOSE_HOUR - BOOKING_OPEN_HOUR;
const BOOKING_DEFAULT_HOURS = 3;

export const getTimeSlotsForDuration = (
  duration: number,
  openingHour = BOOKING_OPEN_HOUR,
  closingHour = BOOKING_CLOSE_HOUR,
): string[] => {
  const slots: string[] = [];
  const dur = Math.max(1, Math.min(closingHour - openingHour, Math.round(duration || 1)));

  const formatTime = (hour: number) => {
    const normalized = hour === 24 ? 0 : hour;
    const period = normalized >= 12 ? "PM" : "AM";
    const displayHour = normalized % 12 === 0 ? 12 : normalized % 12;
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

const bookingHoursLabel = (hours: number) => {
  const value = Math.round((Number(hours) || 0) * 100) / 100;
  const shown = Number.isInteger(value) ? String(value) : String(value);
  return `${shown} ${value === 1 ? "Hour" : "Hours"}`;
};

const bookingTimingLabel = (from: string, to: string, slot?: string) => {
  if (slot && slot.includes("-")) return slot;
  return `${formatTimeSlotDisplay(from)} - ${formatTimeSlotDisplay(to)}`;
};

const formatTimeSlotDisplay = (time24: string) => {
  if (!time24) return "06:00 AM";
  const [hStr, mStr] = time24.split(":");
  let h = Number(hStr);
  const m = Number(mStr) || 0;
  if (Number.isNaN(h)) h = 6;
  if (h === 24) h = 0;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${String(displayH).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
};

const parseTimeSlotRange = (
  slotStr: string,
): { hours: number; startTime: string; endTime: string } => {
  if (!slotStr || !slotStr.includes("-")) {
    return { hours: BOOKING_DEFAULT_HOURS, startTime: "06:00", endTime: "09:00" };
  }
  const [startPart, endPart] = slotStr.split("-").map((s) => s.trim());
  const parsePart = (p: string) => {
    const isPM = p.toUpperCase().includes("PM");
    const isAM = p.toUpperCase().includes("AM");
    const clean = p.replace(/(AM|PM)/gi, "").trim();
    let [h, m = 0] = clean.split(":").map(Number);
    if (Number.isNaN(h)) h = 9;
    if (Number.isNaN(m)) m = 0;
    if (isPM && h !== 12) h += 12;
    if (isAM && h === 12) h = 0;
    return { h, m, totalM: h * 60 + m };
  };

  const start = parsePart(startPart);
  const end = parsePart(endPart);
  if (end.totalM === 0 && start.totalM > 0) {
    end.h = 24;
    end.totalM = 24 * 60;
  }
  const diffMinutes = Math.max(0, end.totalM - start.totalM);
  const hours = Math.round((diffMinutes / 60) * 100) / 100;
  const startTime = `${String(start.h).padStart(2, "0")}:${String(start.m).padStart(2, "0")}`;
  const endTime = `${String(end.h).padStart(2, "0")}:${String(end.m).padStart(2, "0")}`;
  return { hours, startTime, endTime };
};

const calcDurationHours = (from: string, to: string) => {
  if (!from || !to) return 0;
  const [fh, fm = 0] = from.split(":").map(Number);
  let [th, tm = 0] = to.split(":").map(Number);
  const startM = fh * 60 + fm;
  let endM = th * 60 + tm;
  if (endM === 0 && startM > 0) endM = 24 * 60;
  if (th === 24) endM = 24 * 60 + tm;
  return Math.max(0, Math.round(((endM - startM) / 60) * 100) / 100);
};

const normalizeSlot = (s: MultiDateSlot): MultiDateSlot => {
  const isCustom = Boolean(
    s.isCustom ||
      (s.startTime && !s.startTime.endsWith(":00")) ||
      (s.endTime && !s.endTime.endsWith(":00")),
  );
  const startTime = s.startTime || "06:00";
  const endTime = s.endTime || "12:00";
  const dur = s.duration || calcDurationHours(startTime, endTime) || 3;
  const timeSlot =
    s.timeSlot ||
    `${formatTimeSlotDisplay(startTime)} - ${formatTimeSlotDisplay(endTime)}`;
  return {
    ...s,
    startTime,
    endTime,
    duration: dur,
    timeSlot,
    isCustom,
  };
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

type BookingSpaceCard = {
  key: string;
  spaces: SpacePayload[];
  primary: SpacePayload;
  weekday: SpacePayload | null;
  weekend: SpacePayload | null;
};

const bookingDayType = (dateStr?: string): "Weekday" | "Weekend" | null => {
  const match = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return null;
  const day = date.getDay();
  return day === 0 || day === 6 ? "Weekend" : "Weekday";
};

const isWeekendSpace = (space: SpacePayload) =>
  String(space.day || "").toLowerCase().includes("weekend");

const spaceGroupKey = (space: SpacePayload) => {
  const type = String(space.spaceType || "").trim().toLowerCase();
  const name = String(space.name || "").trim().toLowerCase();
  return `${type}|${name}`;
};

const dayRateEnabled = (space: SpacePayload | null) =>
  Boolean(space) && String(space?.status || "Available").toLowerCase() !== "maintenance";

const groupBookingSpaces = (list: SpacePayload[]): BookingSpaceCard[] => {
  const buckets = new Map<string, SpacePayload[]>();
  for (const space of list) {
    const key = spaceGroupKey(space);
    const bucket = buckets.get(key) || [];
    bucket.push(space);
    buckets.set(key, bucket);
  }
  return [...buckets.values()].map((group) => {
    const weekday = group.find((space) => !isWeekendSpace(space)) || null;
    const weekend = group.find((space) => isWeekendSpace(space)) || null;
    return {
      key: spaceGroupKey(group[0]),
      spaces: group,
      primary: weekday || weekend || group[0],
      weekday,
      weekend,
    };
  });
};

const rateForCard = (card: BookingSpaceCard, dateStr?: string) => {
  const kind = bookingDayType(dateStr);
  if (!kind) return null;
  const row = kind === "Weekend" ? card.weekend : card.weekday;
  return {
    kind,
    row,
    enabled: dayRateEnabled(row),
    price: dayRateEnabled(row) ? Math.max(0, Number(row?.price || 0)) : 0,
  };
};

const formatInr = (value: number) =>
  `₹${Math.max(0, Number(value) || 0).toLocaleString("en-IN")}`;

const CreateBookingDetailsModal = ({
  isOpen,
  onClose,
  onSubmit,
  onSaveDraft,
  initialBooking = null,
  draftValues = null,
  submitting = false,
  showFood = false,
}: CreateBookingDetailsModalProps) => {
  const formId = useId();
  const isEdit = Boolean(initialBooking?._id || initialBooking?.id);
  const [savingDraft, setSavingDraft] = useState(false);
  const [downloadingQuote, setDownloadingQuote] = useState(false);
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
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([]);
  const [spaceSectionOpen, setSpaceSectionOpen] = useState(true);
  const [servicesSectionOpen, setServicesSectionOpen] = useState(true);
  const [foodSectionOpen, setFoodSectionOpen] = useState(true);
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
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  // Exclusive Dates Mode
  const [dateMode, setDateMode] = useState<"single" | "multiple">("single");
  const [bookingDate, setBookingDate] = useState(() => getBusinessToday());
  const [bookingFrom, setBookingFrom] = useState("06:00");
  const [bookingTo, setBookingTo] = useState("09:00");
  const [duration, setDuration] = useState(BOOKING_DEFAULT_HOURS);
  const [timeSlot, setTimeSlot] = useState("06:00 AM - 09:00 AM");

  const [multiDateSlots, setMultiDateSlots] = useState<MultiDateSlot[]>([
    {
      id: "slot-1",
      date: getBusinessToday(),
      duration: BOOKING_DEFAULT_HOURS,
      timeSlot: "06:00 AM - 09:00 AM",
      startTime: "06:00",
      endTime: "09:00",
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

  const [foodCatalog, setFoodCatalog] = useState<FoodPayload[]>([]);
  const [foodQty, setFoodQty] = useState<Record<string, number>>({});
  const [foodSearch, setFoodSearch] = useState("");

  // Dynamic Additional Services from API / Local Store
  const [dynamicAdditionalServices, setDynamicAdditionalServices] = useState<
    AdditionalServiceItem[]
  >([]);

  useEffect(() => {
    if (!isOpen) setSummaryOpen(false);
  }, [isOpen]);

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

  useEffect(() => {
    if (!isOpen || !showFood) return;
    const controller = new AbortController();
    handleGetFoods({ status: "Active" }, controller.signal)
      .then((res) => {
        setFoodCatalog(Array.isArray(res?.foods) ? res.foods : []);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [isOpen, showFood]);

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

  const debouncedCustomerSearch = useDebounce(name.trim(), 500);

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
      setSelectedSpaceIds(
        initialBooking.spaceId ? [String(initialBooking.spaceId)] : [],
      );
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
              const match = list.find(
                (c: CustomerPayload) =>
                  String(c.mobile || "").replace(/\D/g, "") === cleaned,
              );
              if (match) {
                setCustomerId(match._id || (match as any).id || null);
                setMembershipType(billingMembershipFromCustomer(match));
                setMembershipPlanId(
                  match.membershipExpired ? null : match.membershipPlanId || null,
                );
              }
            })
            .catch(() => undefined);
        }
      }
      const bDate = toDateInput(initialBooking.bookingDate);
      const bFrom = initialBooking.startTime || "06:00";
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
        setMultiDateSlots(initialBooking.multiDateSlots.map(normalizeSlot));
      } else if (
        Array.isArray(snap?.multiDateSlots) &&
        snap.multiDateSlots.length > 0
      ) {
        setMultiDateSlots(snap.multiDateSlots.map(normalizeSlot));
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
      const savedFoods = Array.isArray(snap?.foods)
        ? snap.foods
        : Array.isArray((initialBooking as { foods?: SelectedFoodItem[] }).foods)
          ? (initialBooking as { foods?: SelectedFoodItem[] }).foods
          : [];
      const nextFoodQty: Record<string, number> = {};
      savedFoods.forEach((food: SelectedFoodItem) => {
        if (food?.foodId) nextFoodQty[String(food.foodId)] = Number(food.qty) || 0;
      });
      setFoodQty(nextFoodQty);
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
      setSelectedSpaceIds(
        draftValues.selectedSpaces?.length
          ? draftValues.selectedSpaces.map((space) => space.spaceId)
          : draftValues.spaceId
            ? [String(draftValues.spaceId)]
            : [],
      );
      setSpaceQty(draftValues.spaceQty || 1);
      const bDate = toDateInput(draftValues.bookingDate);
      const bFrom = draftValues.startTime || "06:00";
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
        setMultiDateSlots(draftValues.multiDateSlots.map(normalizeSlot));
      } else if (
        Array.isArray(snapDraft?.multiDateSlots) &&
        snapDraft.multiDateSlots.length > 0
      ) {
        setMultiDateSlots(snapDraft.multiDateSlots.map(normalizeSlot));
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
      const draftFoods = Array.isArray(draftValues.foods)
        ? draftValues.foods
        : Array.isArray(snapDraft?.foods)
          ? snapDraft.foods
          : [];
      const nextFoodQty: Record<string, number> = {};
      draftFoods.forEach((food: SelectedFoodItem) => {
        if (food?.foodId) nextFoodQty[String(food.foodId)] = Number(food.qty) || 0;
      });
      setFoodQty(nextFoodQty);
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
      setSelectedSpaceIds([]);
      setSpaceSectionOpen(true);
      setServicesSectionOpen(true);
      setSpaceQty(1);
      setPurpose("");
      setNotes("");
      setFoodQty({});
      setFoodSearch("");
      const todayStr = getBusinessToday();
      setBookingDate(todayStr);
      setBookingFrom("06:00");
      setBookingTo("09:00");
      setCoworkingStartDate(todayStr);
      setPlanDurationCount(1);
      setDateMode("single");
      setDuration(BOOKING_DEFAULT_HOURS);
      setTimeSlot("06:00 AM - 09:00 AM");
      setMultiDateSlots([
        {
          id: "slot-1",
          date: todayStr,
          duration: BOOKING_DEFAULT_HOURS,
          timeSlot: "06:00 AM - 09:00 AM",
          startTime: "06:00",
          endTime: "09:00",
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
              setSelectedSpaceIds((prev) =>
                prev.length ? prev : [String(current._id)],
              );
              setSpaceTypeFilter(isCoworkingSpace(current) ? "coworking" : "exclusive");
            }
          } else {
            setSpaceTypeFilter(list.some(isCoworkingSpace) ? "coworking" : "exclusive");
            setSpaceId("");
            setSelectedSpaceIds([]);
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
    const matching = groupBookingSpaces(
      spaces.filter((space) =>
        type === "coworking" ? isCoworkingSpace(space) : isExclusiveSpace(space),
      ),
    );
    const kept = selectedSpaceIds.filter((id) =>
      matching.some((card) => card.spaces.some((space) => String(space._id) === id)),
    );
    if (kept.length > 0) {
      setSelectedSpaceIds(kept);
      if (!kept.includes(String(spaceId))) setSpaceId(kept[0]);
      return;
    }
    setSelectedSpaceIds([]);
    setSpaceId("");
  };

  const spaceCards = useMemo(() => groupBookingSpaces(spaces), [spaces]);

  const coworkingCount = useMemo(
    () => spaceCards.filter((card) => isCoworkingSpace(card.primary)).length,
    [spaceCards],
  );

  const exclusiveCount = useMemo(
    () => spaceCards.filter((card) => isExclusiveSpace(card.primary)).length,
    [spaceCards],
  );

  const visibleCards = useMemo(() => {
    const q = spaceSearch.trim().toLowerCase();
    return spaceCards.filter((card) => {
      const space = card.primary;
      const matchesType =
        spaceTypeFilter === "coworking"
          ? isCoworkingSpace(space)
          : isExclusiveSpace(space);
      if (!matchesType) return false;
      if (!q) return true;
      const haystack = [
        space.name,
        getSpaceCode(space),
        space.category,
        space.spaceType,
        space.description,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [spaceCards, spaceTypeFilter, spaceSearch]);

  const selectedCard = useMemo(
    () =>
      spaceCards.find((card) =>
        card.spaces.some((space) => String(space._id) === String(spaceId)),
      ) || null,
    [spaceCards, spaceId],
  );

  const selectedSpace = selectedCard?.primary || null;

  const planDurationInfo = useMemo(() => {
    return parsePlanDuration(
      selectedSpace?.name || "",
      selectedSpace?.spaceType || spaceTypeFilter,
    );
  }, [selectedSpace, spaceTypeFilter]);

  const isDurationPlan =
    spaceTypeFilter === "coworking" || planDurationInfo.isDurationPlan;

  const pricingDate = isDurationPlan
    ? coworkingStartDate
    : dateMode === "multiple"
      ? multiDateSlots.find((slot) => slot.date)?.date || ""
      : bookingDate;
  const appliedRate = selectedCard ? rateForCard(selectedCard, pricingDate) : null;
  const quotedUnitPrice = appliedRate
    ? appliedRate.price
    : dayRateEnabled(selectedCard?.weekday || null)
      ? Number(selectedCard?.weekday?.price || 0)
      : Number(selectedCard?.weekend?.price || 0);
  const pricedSpace = appliedRate?.row || selectedSpace;

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
      if (!date || !startTime || !endTime) return "available";
      const sMin = timeToMinutes(startTime);
      const eMin = timeToMinutes(endTime);
      if (sMin == null || eMin == null || eMin <= sMin) return "unavailable";
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
      if (findBusyOverlaps(b.date, "06:00", "24:00", [b]).length > 0) dates.add(b.date);
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
        const res = await handleGetCustomers(term, controller.signal);
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

  // Autofetch customer details by 10-digit phone, and always refresh
  // membership from the server so an expired plan is not reused from a draft.
  useEffect(() => {
    const cleaned = phone.trim().replace(/\D/g, "");
    if (cleaned.length !== 10) return;

    const controller = new AbortController();
    handleGetCustomers(cleaned, controller.signal, 1)
      .then((res) => {
        const list = Array.isArray(res?.customers) ? res.customers : [];
        const match =
          list.find(
            (c: CustomerPayload) =>
              String(c.mobile || "").replace(/\D/g, "") === cleaned,
          ) || null;
        if (!match) return;
        if (!name.trim() && match.name) {
          setName(match.name);
          setErrors((prev) => ({ ...prev, name: "", phone: "" }));
          setIsPhoneAutoFetched(true);
        }
        setCustomerId(match._id || (match as any).id || null);
        setMembershipType(billingMembershipFromCustomer(match));
        setMembershipPlanId(
          match.membershipExpired ? null : match.membershipPlanId || null,
        );
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
    setMembershipType(billingMembershipFromCustomer(c));
    setMembershipPlanId(c.membershipExpired ? null : c.membershipPlanId || null);
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
    const safeH = Math.max(1, Math.min(BOOKING_MAX_HOURS, Math.round(hours)));
    setDuration(safeH);
    let [startH] = bookingFrom.split(":").map(Number);
    if (Number.isNaN(startH) || startH < BOOKING_OPEN_HOUR) startH = BOOKING_OPEN_HOUR;
    if (startH + safeH > BOOKING_CLOSE_HOUR) {
      startH = Math.max(BOOKING_OPEN_HOUR, BOOKING_CLOSE_HOUR - safeH);
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
  const handleAddSlot = (isCustom = false) => {
    const lastSlot = multiDateSlots[multiDateSlots.length - 1];
    const lastDate = lastSlot?.date || bookingDate || getBusinessToday();
    const nextDateStr = addDaysToKey(lastDate, 1);
    const startTime = "06:00";
    const endTime = "09:00";
    const newSlot: MultiDateSlot = {
      id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: nextDateStr,
      duration: BOOKING_DEFAULT_HOURS,
      timeSlot: "06:00 AM - 09:00 AM",
      startTime,
      endTime,
      isCustom,
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

  const handleToggleSlotCustom = (id: string, forceCustom?: boolean) => {
    setMultiDateSlots((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const nextCustom = forceCustom !== undefined ? forceCustom : !s.isCustom;
        if (nextCustom) {
          const startTime = s.startTime || "06:00";
          const endTime = s.endTime || "12:00";
          const dur = calcDurationHours(startTime, endTime) || s.duration || 3;
          const timeSlot = `${formatTimeSlotDisplay(startTime)} - ${formatTimeSlotDisplay(endTime)}`;
          return {
            ...s,
            isCustom: true,
            startTime,
            endTime,
            duration: dur,
            timeSlot,
          };
        } else {
          const safeDur = Math.max(1, Math.min(BOOKING_MAX_HOURS, Math.round(s.duration || BOOKING_MAX_HOURS)));
          let [sh] = (s.startTime || "06:00").split(":").map(Number);
          if (Number.isNaN(sh) || sh < BOOKING_OPEN_HOUR) sh = BOOKING_OPEN_HOUR;
          if (sh + safeDur > BOOKING_CLOSE_HOUR) sh = Math.max(BOOKING_OPEN_HOUR, BOOKING_CLOSE_HOUR - safeDur);
          const startTime = `${String(sh).padStart(2, "0")}:00`;
          const endTime = `${String(sh + safeDur).padStart(2, "0")}:00`;
          const timeSlot = `${formatTimeSlotDisplay(startTime)} - ${formatTimeSlotDisplay(endTime)}`;
          return {
            ...s,
            isCustom: false,
            duration: safeDur,
            startTime,
            endTime,
            timeSlot,
          };
        }
      }),
    );
  };

  const handleUpdateSlotCustomTimes = (
    id: string,
    startTime: string,
    endTime: string,
  ) => {
    setMultiDateSlots((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const eValid = endTime === "00:00" || endTime === "24:00"
          ? "24:00"
          : endTime ?? s.endTime ?? "09:00";
        const sValid = !startTime || startTime < "06:00" ? "06:00" : startTime;
        const dur = calcDurationHours(sValid, eValid);
        const timeSlot = `${formatTimeSlotDisplay(sValid)} - ${formatTimeSlotDisplay(eValid)}`;
        return {
          ...s,
          isCustom: true,
          startTime: sValid,
          endTime: eValid,
          duration: dur,
          timeSlot,
        };
      }),
    );
  };

  const handleUpdateSlotDuration = (id: string, delta: number) => {
    setMultiDateSlots((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        if (s.isCustom) {
          const [rawH = BOOKING_OPEN_HOUR, rawM = 0] = (s.startTime || "06:00").split(":").map(Number);
          const startMinutes = Math.min(
            BOOKING_CLOSE_HOUR * 60 - 30,
            Math.max(BOOKING_OPEN_HOUR * 60, rawH * 60 + rawM),
          );
          const sh = Math.floor(startMinutes / 60);
          const sm = startMinutes % 60;
          const currentDur = calcDurationHours(s.startTime, s.endTime) || s.duration || 1;
          const newDur = Math.max(0.5, Math.min(BOOKING_MAX_HOURS, Math.round((currentDur + delta) * 10) / 10));
          const totalEndMinutes = sh * 60 + sm + Math.round(newDur * 60);
          const clampedEndMinutes = Math.min(BOOKING_CLOSE_HOUR * 60, totalEndMinutes);
          const endH = Math.floor(clampedEndMinutes / 60);
          const endM = clampedEndMinutes % 60;
          const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
          const actualDur = calcDurationHours(s.startTime, endTime);
          const timeSlot = `${formatTimeSlotDisplay(s.startTime)} - ${formatTimeSlotDisplay(endTime)}`;
          return {
            ...s,
            startTime: `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`,
            duration: actualDur,
            endTime,
            timeSlot,
          };
        }
        const newDur = Math.max(1, Math.min(BOOKING_MAX_HOURS, s.duration + delta));
        let [startH] = (s.startTime || "06:00").split(":").map(Number);
        if (Number.isNaN(startH) || startH < BOOKING_OPEN_HOUR) startH = BOOKING_OPEN_HOUR;
        if (startH + newDur > BOOKING_CLOSE_HOUR) {
          startH = Math.max(BOOKING_OPEN_HOUR, BOOKING_CLOSE_HOUR - newDur);
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
    if (newTimeSlot === "__custom__") {
      handleToggleSlotCustom(id, true);
      return;
    }
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
              isCustom: false,
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

  const selectedFoodsList = useMemo<SelectedFoodItem[]>(() => {
    if (!showFood) return [];
    return foodCatalog
      .map((food) => ({
        foodId: String(food._id || ""),
        label: food.name,
        price: Math.max(0, Number(food.price) || 0),
        qty: foodQty[String(food._id || "")] || 0,
        unit: food.unit || "",
        applyMembershipDiscount: food.applyMembershipDiscount !== false,
      }))
      .filter((food) => food.foodId && food.qty > 0);
  }, [foodCatalog, foodQty, showFood]);

  const foodCharges = selectedFoodsList.reduce((sum, food) => sum + food.price * food.qty, 0);

  // Discount & Cashback Calculation
  const activeMembershipPlan = useMemo(() => {
    return resolveMembershipPlan(membershipPlans, membershipType, membershipPlanId);
  }, [membershipPlans, membershipType, membershipPlanId]);

  const bookedSpaces = useMemo(() => {
    const ids = selectedSpaceIds.length
      ? selectedSpaceIds
      : spaceId
        ? [spaceId]
        : [];
    const qtyEach = ids.length > 1 ? 1 : Math.max(1, spaceQty);
    const hours = calcDurationHours(bookingFrom, bookingTo) || duration;
    const seen = new Set<string>();
    return ids
      .map((id) => spaceCards.find((card) => card.spaces.some((space) => String(space._id) === String(id))))
      .filter((card): card is BookingSpaceCard => {
        if (!card || seen.has(card.key)) return false;
        seen.add(card.key);
        return true;
      })
      .map((card) => {
        const space = card.primary;
        const singleRate = rateForCard(card, isDurationPlan ? coworkingStartDate : bookingDate);
        const unitPrice = isDurationPlan || dateMode !== "multiple"
          ? singleRate?.price || 0
          : rateForCard(card, multiDateSlots.find((slot) => slot.date)?.date)?.price || 0;
        const lineTotal = isDurationPlan
          ? unitPrice * packageMultiplier * qtyEach
          : dateMode === "multiple"
            ? multiDateSlots.reduce((sum, slot) => {
                const rate = rateForCard(card, slot.date);
                return sum + (rate?.enabled ? rate.price : 0) * (slot.duration || 1) * qtyEach;
              }, 0)
            : unitPrice * hours * qtyEach;
        const priced = singleRate?.row || space;
        return {
          spaceId: String(priced._id || space._id),
          spaceName: space.name || "",
          spaceCode: getSpaceCode(space),
          spaceDay: singleRate?.kind || priced.day || "",
          spaceCategory: space.category || "space",
          unitPrice,
          lineTotal,
          qty: qtyEach,
        };
      });
  }, [
    selectedSpaceIds,
    spaceId,
    spaceCards,
    spaceQty,
    isDurationPlan,
    packageMultiplier,
    dateMode,
    multiDateSlots,
    bookingFrom,
    bookingTo,
    duration,
    bookingDate,
    coworkingStartDate,
  ]);

  const singleSlotHours =
    !isDurationPlan && dateMode !== "multiple"
      ? calcDurationHours(bookingFrom, bookingTo) || duration
      : 0;
  const [liveOffer, setLiveOffer] = useState<ApplicableSpaceOffer | null>(null);

  useEffect(() => {
    if (!(singleSlotHours > 0) || bookedSpaces.length === 0) {
      setLiveOffer(null);
      return;
    }
    const stored = (initialBooking as { offerSnapshot?: ApplicableSpaceOffer | null; offerDiscount?: number } | null)?.offerSnapshot;
    const storedHours = Number(initialBooking?.durationHours || 0);
    const sameSpace =
      String(initialBooking?.spaceId || "") === String(bookedSpaces[0]?.spaceId || "") &&
      Number(initialBooking?.spaceQty || 1) === Number(bookedSpaces[0]?.qty || 1);
    if (isEdit && sameSpace && Math.abs(singleSlotHours - storedHours) < 0.001) {
      const storedDiscount = Number(
        (initialBooking as { offerDiscount?: number } | null)?.offerDiscount ??
          stored?.discount ??
          0,
      );
      const storedUsed = Boolean(
        stored && (Number(stored.freeHours) > 0 || storedDiscount > 0 || stored.applied),
      );
      setLiveOffer(
        storedUsed && stored
          ? {
              ...stored,
              applied: true,
              discount: storedDiscount,
            }
          : null,
      );
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void handleGetApplicableSpaceOffer(
        {
          hours: singleSlotHours,
          lines: bookedSpaces.map((space) => ({
            hourlyRate: space.unitPrice,
            qty: space.qty,
          })),
        },
        controller.signal,
      )
        .then((response) => setLiveOffer(response.offer?.applied ? response.offer : null))
        .catch((error: { code?: string }) => {
          if (error?.code === "ERR_CANCELED") return;
          setLiveOffer(null);
        });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [singleSlotHours, bookedSpaces, isEdit, initialBooking]);

  const { discountAmount, cashbackAmount, pricedSubTotal } = useMemo(() => {
    const benefit = resolveBenefitPercents("space", activeMembershipPlan);
    const offerOff = !isDurationPlan && dateMode !== "multiple" ? Number(liveOffer?.discount || 0) : 0;
    const baseSpaceTotal = Math.max(
      0,
      bookedSpaces.reduce((sum, space) => sum + space.lineTotal, 0) - offerOff,
    );

    const servicesTotal = selectedServicesList.reduce(
      (acc, s) => acc + s.price * s.qty,
      0,
    );
    const foodTotal = selectedFoodsList.reduce((acc, food) => acc + food.price * food.qty, 0);
    const memberFoodTotal = selectedFoodsList.reduce(
      (acc, food) =>
        food.applyMembershipDiscount === false ? acc : acc + food.price * food.qty,
      0,
    );
    const subTotal = baseSpaceTotal + servicesTotal;
    const foodBenefit = resolveBenefitPercents("food", activeMembershipPlan);

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

    const discount = Math.round(subTotal * (discPct / 100)) + Math.round(memberFoodTotal * ((foodBenefit.discountPercent || 0) / 100));
    const cashback = Math.round(subTotal * (cashPct / 100)) + Math.round(memberFoodTotal * ((foodBenefit.cashbackPercent || 0) / 100));

    return { discountAmount: discount, cashbackAmount: cashback, pricedSubTotal: subTotal + foodTotal };
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
    bookedSpaces,
    selectedServicesList,
    selectedFoodsList,
    liveOffer,
  ]);

  const validate = () => {
    const err: Record<string, string> = {};
    if (!name.trim()) err.name = "Customer name is required.";
    if (!phone.trim()) err.phone = "Phone number is required.";
    else if (!/^\d{10}$/.test(phone.trim().replace(/\D/g, ""))) {
      err.phone = "Please enter a valid 10-digit phone number.";
    }

    if (!selectedSpaceIds.length && !spaceId) err.spaceId = "Please select a space.";
    else if (appliedRate && !appliedRate.enabled) {
      err.spaceId = `${appliedRate.kind} bookings are not available for this space.`;
    } else if (dateMode === "multiple" && selectedCard) {
      const blocked = multiDateSlots.find((slot) => {
        const rate = rateForCard(selectedCard, slot.date);
        return rate && !rate.enabled;
      });
      if (blocked) {
        const rate = rateForCard(selectedCard, blocked.date);
        err.multiDates = err.multiDates || `${rate?.kind || "That day"} is not available for this space.`;
      }
    }

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
        const s = multiDateSlots[i];
        if (!s.date) {
          err.multiDates = `Date for row ${i + 1} is required.`;
          break;
        }
        if (!s.startTime || !s.endTime) {
          err.multiDates = `Row ${i + 1}: Start and end times are required.`;
          break;
        }
        const sMin = timeToMinutes(s.startTime);
        const eMin = timeToMinutes(s.endTime);
        if (sMin == null || eMin == null || eMin <= sMin) {
          err.multiDates = `Row ${i + 1}: End time must be after start time.`;
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

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (needsConflictCheck && availability.loading) {
      toast.info("Checking availability… please try again in a moment.");
      return;
    }
    if (!validate()) {
      toast.warning("Complete the required booking fields before checkout.");
      return;
    }
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

    const unitPrice = Math.max(0, Number(quotedUnitPrice || 0));
    const servicesTotal = selectedServicesList.reduce(
      (acc, s) => acc + s.price * s.qty,
      0,
    );
    const spaceCharges =
      bookedSpaces.reduce((sum, space) => sum + space.lineTotal, 0) ||
      (isDuration
        ? unitPrice * packageMultiplier * spaceQty
        : isMultiple
          ? multiDateSlots.reduce(
              (acc, s) => acc + unitPrice * (s.duration || 1) * spaceQty,
              0,
            )
          : unitPrice * (calcDurationHours(bookingFrom, bookingTo) || duration) * spaceQty);

    const offerOff = isDuration || isMultiple ? 0 : Number(liveOffer?.discount || 0);
    const lineTotal = Math.max(0, spaceCharges + servicesTotal + foodCharges - offerOff - discountAmount);

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
      spaceName:
        bookedSpaces.map((space) => space.spaceName).filter(Boolean).join(", ") ||
        selectedSpace?.name ||
        "",
      selectedSpaces: bookedSpaces,
      spaceCode,
      spaceImageUrl: (selectedSpace as any)?.images?.[0] || selectedSpace?.imageUrl || null,
      spaceDay: appliedRate?.kind || pricedSpace?.day || "",
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
      foods: selectedFoodsList,
      foodCharges,
      coworkingServices,
      exclusiveServices,
      spaceCharges,
      servicesTotal,
      subTotal: spaceCharges + servicesTotal + foodCharges,
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
      spaceId: pricedSpace?._id ? String(pricedSpace._id) : spaceId,
      bookingDate: isDuration
        ? coworkingStartDate
        : isMultiple
        ? multiDateSlots[0]?.date || bookingDate
        : bookingDate,
      startTime: isDuration
        ? "06:00"
        : isMultiple
        ? multiDateSlots[0]?.startTime || bookingFrom
        : bookingFrom,
      endTime: isDuration
        ? "24:00"
        : isMultiple
        ? multiDateSlots[0]?.endTime || bookingTo
        : bookingTo,
      status,
      notes: finalNotes || undefined,
      spaceName:
        bookedSpaces.map((space) => space.spaceName).filter(Boolean).join(", ") ||
        selectedSpace?.name ||
        "",
      selectedSpaces: bookedSpaces,
      spaceCode,
      spaceType,
      spaceDay: appliedRate?.kind || pricedSpace?.day || "",
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
      offerDiscount: isDuration || isMultiple ? 0 : Number(liveOffer?.discount || 0),
      offerSnapshot: isDuration || isMultiple ? null : liveOffer,
      selectedServices: selectedServicesList,
      foods: selectedFoodsList,
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
    if (!selectedSpaceIds.length && !spaceId) err.spaceId = "Please select a space.";
    else if (appliedRate && !appliedRate.enabled) {
      err.spaceId = `${appliedRate.kind} bookings are not available for this space.`;
    } else if (dateMode === "multiple" && selectedCard) {
      const blocked = multiDateSlots.find((slot) => {
        const rate = rateForCard(selectedCard, slot.date);
        return rate && !rate.enabled;
      });
      if (blocked) {
        const rate = rateForCard(selectedCard, blocked.date);
        err.multiDates = err.multiDates || `${rate?.kind || "That day"} is not available for this space.`;
      }
    }

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

    const unitPrice = Math.max(0, Number(quotedUnitPrice || 0));
    const servicesTotal = selectedServicesList.reduce(
      (acc, s) => acc + s.price * s.qty,
      0,
    );
    const spaceCharges =
      bookedSpaces.reduce((sum, space) => sum + space.lineTotal, 0) ||
      (isDuration
        ? unitPrice * packageMultiplier * spaceQty
        : isMultiple
          ? multiDateSlots.reduce(
              (acc, s) => acc + unitPrice * (s.duration || 1) * spaceQty,
              0,
            )
          : unitPrice * (calcDurationHours(bookingFrom, bookingTo) || duration) * spaceQty);

    const offerOff = isDuration || isMultiple ? 0 : Number(liveOffer?.discount || 0);
    const lineTotal = Math.max(0, spaceCharges + servicesTotal + foodCharges - offerOff - discountAmount);

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
      spaceName:
        bookedSpaces.map((space) => space.spaceName).filter(Boolean).join(", ") ||
        selectedSpace?.name ||
        "",
      selectedSpaces: bookedSpaces,
      spaceCode,
      spaceImageUrl: (selectedSpace as any)?.images?.[0] || selectedSpace?.imageUrl || null,
      spaceDay: appliedRate?.kind || pricedSpace?.day || "",
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
      foods: selectedFoodsList,
      foodCharges,
      coworkingServices,
      exclusiveServices,
      spaceCharges,
      servicesTotal,
      subTotal: spaceCharges + servicesTotal + foodCharges,
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
      spaceId: pricedSpace?._id ? String(pricedSpace._id) : spaceId,
      bookingDate: isDuration
        ? coworkingStartDate
        : isMultiple
        ? multiDateSlots[0]?.date || bookingDate
        : bookingDate,
      startTime: isDuration
        ? "06:00"
        : isMultiple
        ? multiDateSlots[0]?.startTime || bookingFrom
        : bookingFrom,
      endTime: isDuration
        ? "24:00"
        : isMultiple
        ? multiDateSlots[0]?.endTime || bookingTo
        : bookingTo,
      status: "Draft",
      notes: finalNotes || undefined,
      spaceName:
        bookedSpaces.map((space) => space.spaceName).filter(Boolean).join(", ") ||
        selectedSpace?.name ||
        "",
      selectedSpaces: bookedSpaces,
      spaceCode,
      spaceType,
      spaceDay: appliedRate?.kind || pricedSpace?.day || "",
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
      offerDiscount: isDuration || isMultiple ? 0 : Number(liveOffer?.discount || 0),
      offerSnapshot: isDuration || isMultiple ? null : liveOffer,
      selectedServices: selectedServicesList,
      foods: selectedFoodsList,
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

  const bookingSummary = isDurationPlan ? (
    <CoworkingSummaryCard
      space={pricedSpace || selectedSpace || null}
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
      unitPrice={quotedUnitPrice}
      selectedServices={selectedServicesList}
      foods={selectedFoodsList}
      discountAmount={discountAmount}
      cashbackAmount={cashbackAmount}
      formatDateDisplay={formatDateDisplay}
      bookedSpaces={bookedSpaces}
    />
  ) : dateMode === "multiple" ? (
    <ExclusiveMultipleDatesSummaryCard
      space={pricedSpace || selectedSpace || null}
      spaceQty={spaceQty}
      slots={multiDateSlots}
      hourlyRate={quotedUnitPrice}
      selectedServices={selectedServicesList}
      foods={selectedFoodsList}
      discountAmount={discountAmount}
      cashbackAmount={cashbackAmount}
      formatDateDisplay={formatDateDisplay}
      bookedSpaces={bookedSpaces}
    />
  ) : (
    <ExclusiveSingleDateSummaryCard
      space={pricedSpace || selectedSpace || null}
      spaceQty={spaceQty}
      bookingDate={bookingDate}
      timeSlot={timeSlot}
      duration={duration}
      hourlyRate={quotedUnitPrice}
      selectedServices={selectedServicesList}
      foods={selectedFoodsList}
      discountAmount={discountAmount}
      cashbackAmount={cashbackAmount}
      offerFreeHours={liveOffer?.freeHours || 0}
      offerDiscount={liveOffer?.discount || 0}
      offerName={liveOffer?.offerName || ""}
      offerMinimumHours={liveOffer?.minimumHours || 0}
      offerChargeableHours={liveOffer?.chargeableHours || 0}
      formatDateDisplay={formatDateDisplay}
      bookedSpaces={bookedSpaces}
      amountLabel={status === "Draft" ? "Draft Amount" : "Grand Total"}
    />
  );

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget && !submitting) void closeIfConfirmed(onClose);
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
              onClick={() => void closeIfConfirmed(onClose)}
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
                                      {(() => {
                                        const activeType =
                                          billingMembershipFromCustomer(c);
                                        if (!activeType || activeType === "none") {
                                          return null;
                                        }
                                        return (
                                          <MembershipBadge
                                            membershipType={activeType}
                                            membershipPlanId={
                                              c.membershipExpired
                                                ? null
                                                : c.membershipPlanId
                                            }
                                            membershipPlans={membershipPlans}
                                            showNone={false}
                                            className="shrink-0"
                                          />
                                        );
                                      })()}
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

                          {phone ? (
                            <p className="mt-1.5 text-sm text-slate-600">
                              {phone.replace(/\D/g, "").length === 10
                                ? `+91 ${phone.replace(/\D/g, "")}`
                                : phone}
                            </p>
                          ) : null}
                          {errors.name && (
                            <p className="mt-1 text-xs text-rose-500">{errors.name}</p>
                          )}
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
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setSpaceSectionOpen((open) => !open)}
                      className="flex w-full items-center justify-between gap-2 text-left"
                      aria-expanded={spaceSectionOpen}
                    >
                      <span className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                          <Building2 size={14} />
                        </span>
                        <span className="font-bold text-slate-800 text-sm">
                          Select Space <span className="text-rose-500">*</span>
                          {selectedSpaceIds.length > 1 ? (
                            <span className="ml-2 text-xs font-semibold text-indigo-600">
                              {selectedSpaceIds.length} selected
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <ChevronDown
                        size={16}
                        className={`shrink-0 text-slate-500 transition ${spaceSectionOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {spaceSectionOpen ? (
                    <>

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
                    ) : visibleCards.length === 0 ? (
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
                      <div className="flex gap-3.5 overflow-x-auto pb-1">
                        {visibleCards.map((card) => {
                          const space = card.primary;
                          const cardIds = card.spaces.map((item) => String(item._id));
                          const spaceKey = String(space._id);
                          const isSelected = cardIds.some((id) => selectedSpaceIds.includes(id));
                          const code = getSpaceCode(space);
                          const priceSuffix = parsePlanDuration(
                            space.name,
                            space.spaceType || spaceTypeFilter,
                          ).priceSuffix;

                          return (
                            <div
                              key={String(space._id)}
                              onClick={() => {
                                setSelectedSpaceIds((prev) => {
                                  if (cardIds.some((id) => prev.includes(id))) {
                                    const next = prev.filter((id) => !cardIds.includes(id));
                                    if (cardIds.includes(String(spaceId))) {
                                      setSpaceId(next[0] || "");
                                    }
                                    return next;
                                  }
                                  setSpaceId(spaceKey);
                                  if (!prev.length) {
                                    setSpaceQty(1);
                                    const info = parsePlanDuration(
                                      space.name,
                                      space.spaceType || spaceTypeFilter,
                                    );
                                    setPlanDurationCount(info.baseCount);
                                  }
                                  return [...prev, spaceKey];
                                });
                                if (errors.spaceId) {
                                  setErrors((prev) => ({ ...prev, spaceId: "" }));
                                }
                              }}
                              className={`group relative flex w-[280px] shrink-0 flex-col justify-between overflow-hidden rounded-2xl border text-left transition cursor-pointer select-none ${
                                isSelected
                                  ? "border-2 border-indigo-600 bg-white shadow-sm"
                                  : "border border-slate-200/90 bg-white hover:border-slate-300"
                              }`}
                            >
                              {/* Image Box */}
                              <div className="relative h-28 w-full overflow-hidden bg-slate-100">
                                <SpaceMediaCarousel
                                  space={space}
                                  alt={space.name}
                                  className="h-28 w-full"
                                />

                                {/* Top-Left: Code Badge */}
                                <div className="absolute left-2 top-2 z-10">
                                  <span className="inline-flex items-center rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-xs">
                                    {code}
                                  </span>
                                </div>

                                {/* Top-Right: Weekday/Weekend or Selection Checkmark */}
                                <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5">
                                  <span
                                    className={`flex h-5 w-5 items-center justify-center rounded border shadow-xs ${
                                      isSelected
                                        ? "border-indigo-600 bg-indigo-600 text-white"
                                        : "border-slate-300 bg-white text-transparent"
                                    }`}
                                    aria-checked={isSelected}
                                    role="checkbox"
                                  >
                                    <Check size={12} strokeWidth={3} />
                                  </span>
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
                                <h4 className="text-sm font-bold text-slate-800 line-clamp-1">
                                  {space.name}
                                </h4>
                                <p className="mt-0.5 text-[11px] font-medium text-slate-400">{code}</p>
                                <p className="mt-1 text-[11px] text-slate-500">
                                  {space.spaceType || (spaceTypeFilter === "coworking" ? "Coworking" : "Exclusive")}
                                  {space.category ? ` · ${space.category}` : ""}
                                  {` · ${space.capacity || 1} people`}
                                </p>
                                {space.description ? (
                                  <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">
                                    {space.description}
                                  </p>
                                ) : null}

                                <div className="mt-2.5 grid grid-cols-2 gap-1.5 border-t border-slate-100 pt-2">
                                  <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                                    <p className="text-[10px] font-semibold text-slate-500">Weekday</p>
                                    <p className="text-xs font-bold text-indigo-700">
                                      {dayRateEnabled(card.weekday) ? formatInr(Number(card.weekday?.price || 0)) : "Unavailable"}
                                      <span className="font-normal text-slate-400">{priceSuffix}</span>
                                    </p>
                                    <p className="text-[10px] text-slate-400">Mon–Fri</p>
                                  </div>
                                  <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                                    <p className="text-[10px] font-semibold text-slate-500">Weekend</p>
                                    <p className="text-xs font-bold text-indigo-700">
                                      {dayRateEnabled(card.weekend) ? formatInr(Number(card.weekend?.price || 0)) : "Unavailable"}
                                      <span className="font-normal text-slate-400">{priceSuffix}</span>
                                    </p>
                                    <p className="text-[10px] text-slate-400">Sat–Sun</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                    </>
                    ) : null}
                  </div>

                  {selectedCard && appliedRate ? (
                    <div
                      className={`rounded-xl border px-3 py-2 text-xs ${
                        appliedRate.enabled
                          ? "border-indigo-100 bg-indigo-50 text-indigo-800"
                          : "border-rose-200 bg-rose-50 text-rose-700"
                      }`}
                    >
                      {appliedRate.enabled ? (
                        <span>
                          {formatDateDisplay(pricingDate)} · {appliedRate.kind} price ·{" "}
                          <span className="font-bold">{formatInr(appliedRate.price)}</span>
                          {isDurationPlan ? "" : " / hr"} is applied automatically.
                        </span>
                      ) : (
                        <span>
                          {appliedRate.kind} is turned off for {selectedCard.primary.name}. Choose another date.
                        </span>
                      )}
                    </div>
                  ) : selectedCard ? (
                    <p className="text-xs text-slate-500">
                      Choose a date and the weekday or weekend price is applied automatically.
                    </p>
                  ) : null}

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
                              disabled={duration >= BOOKING_MAX_HOURS}
                              className="flex h-full w-10 items-center justify-center border-l border-slate-100 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 transition"
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
                        <div className="hidden sm:grid sm:grid-cols-[1.1fr_130px_1.5fr_40px] gap-2 px-1 text-xs font-semibold text-slate-500">
                          <div>Date</div>
                          <div>Duration (Hours)</div>
                          <div>Time Slot / Custom Timing</div>
                          <div></div>
                        </div>

                        {/* Slots Rows */}
                        {multiDateSlots.map((slot, rowIdx) => {
                          const rowSlots = getTimeSlotsForDuration(slot.duration);
                          const rowStatus = multiSlotStatuses[rowIdx] ?? "available";
                          const isValidTimeRange =
                            slot.startTime &&
                            slot.endTime &&
                            (timeToMinutes(slot.endTime) ?? 0) > (timeToMinutes(slot.startTime) ?? 0);

                          return (
                            <div
                              key={slot.id}
                              className="rounded-2xl border border-slate-100 bg-slate-50/40 p-2.5 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:grid sm:grid-cols-[1.1fr_130px_1.5fr_40px] sm:items-center sm:gap-2 space-y-2 sm:space-y-0"
                            >
                              {/* Mobile Card Header */}
                              <div className="flex sm:hidden items-center justify-between pb-1.5 border-b border-slate-200/60">
                                <span className="text-xs font-bold text-slate-700">
                                  Slot #{rowIdx + 1}
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSlotCustom(slot.id)}
                                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition"
                                  >
                                    {slot.isCustom ? "Use Presets" : "Custom Time"}
                                  </button>
                                  {multiDateSlots.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSlot(slot.id)}
                                      className="text-rose-500 hover:text-rose-600 transition p-1"
                                      title="Remove Slot"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              </div>

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
                                  disabled={slot.isCustom ? slot.duration <= 0.5 : slot.duration <= 1}
                                  className="flex h-full w-9 items-center justify-center border-r border-slate-100 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 transition shrink-0"
                                  title="Decrease duration by 1 hour"
                                >
                                  <Minus size={13} />
                                </button>
                                <div className="flex flex-1 items-center justify-center text-xs font-bold text-slate-700 px-1 truncate">
                                  {!isValidTimeRange && slot.isCustom ? (
                                    <span className="text-[11px] font-semibold text-rose-500">Invalid</span>
                                  ) : (
                                    `${slot.duration} ${slot.duration === 1 ? "Hour" : "Hours"}`
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSlotDuration(slot.id, 1)}
                                  className="flex h-full w-9 items-center justify-center border-l border-slate-100 text-slate-600 hover:bg-slate-50 transition shrink-0"
                                  title="Increase duration by 1 hour"
                                >
                                  <Plus size={13} />
                                </button>
                              </div>

                              {/* Time Slot (Preset or Custom) */}
                              {slot.isCustom ? (
                                /* Custom Timings Mode */
                                <div className="relative">
                                  <div
                                    className={`flex h-10 items-center gap-1.5 rounded-xl border bg-white p-1 transition ${
                                      rowStatus === "available" && isValidTimeRange
                                        ? "border-indigo-300 ring-1 ring-indigo-100"
                                        : "border-rose-300"
                                    }`}
                                  >
                                    {/* Start Time Input */}
                                    <div className="relative flex-1 min-w-0">
                                      <input type="time"
                                        min="06:00"
                                        max="23:59"
                                        value={slot.startTime || "06:00"}
                                        onChange={(e) => {
                                          handleUpdateSlotCustomTimes(slot.id, e.target.value, slot.endTime);
                                          setErrors((prev) => ({ ...prev, multiDates: "" }));
                                        }}
                                        className="h-8 w-full rounded-lg bg-slate-50 px-2 text-xs font-semibold text-slate-700 outline-none hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                        title="Start Time"
                                      />
                                    </div>

                                    <span className="text-[11px] font-bold text-slate-400 shrink-0">to</span>

                                    {/* End Time Input */}
                                    <div className="relative flex-1 min-w-0">
                                      <input
                                        type="time"
                                        min="06:00"
                                        max="23:59"
                                        value={slot.endTime === "24:00" ? "00:00" : slot.endTime || "09:00"}
                                        onChange={(e) => {
                                          handleUpdateSlotCustomTimes(slot.id, slot.startTime, e.target.value);
                                          setErrors((prev) => ({ ...prev, multiDates: "" }));
                                        }}
                                        className="h-8 w-full rounded-lg bg-slate-50 px-2 text-xs font-semibold text-slate-700 outline-none hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                        title="End Time"
                                      />
                                    </div>

                                    {/* Switch back to Presets button */}
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSlotCustom(slot.id, false)}
                                      className="flex h-8 items-center gap-1 rounded-lg px-2 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 transition shrink-0"
                                      title="Switch back to preset slots"
                                    >
                                      <Clock size={11} />
                                      <span className="hidden sm:inline">Presets</span>
                                    </button>
                                  </div>

                                  {slot.date && (
                                    <span className="pointer-events-none absolute -top-2 right-2 z-10">
                                      <AvailabilityBadge status={toBadgeStatus(rowStatus)} />
                                    </span>
                                  )}
                                </div>
                              ) : (
                                /* Preset Slots Mode */
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
                                    className={`h-10 w-full appearance-none rounded-xl border bg-white pl-9 pr-16 text-xs font-medium outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${
                                      rowStatus === "available" ? "border-slate-200" : "border-rose-300"
                                    }`}
                                  >
                                    {renderSlotOptions(rowSlots, slot.date, slot.timeSlot)}
                                    <option value="__custom__">⚙ Custom Timing...</option>
                                  </select>

                                  {/* Quick Custom Switch button inside the select */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSlotCustom(slot.id, true)}
                                    className="absolute right-7 top-1/2 -translate-y-1/2 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 transition"
                                    title="Switch to custom timings"
                                  >
                                    Custom
                                  </button>

                                  <ChevronDown
                                    size={15}
                                    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                                  />
                                  {slot.date && (
                                    <span className="pointer-events-none absolute -top-2 right-2 z-10">
                                      <AvailabilityBadge status={toBadgeStatus(rowStatus)} />
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Delete Row Button (Desktop) */}
                              <div className="hidden sm:flex justify-end">
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

                        {/* Add Buttons */}
                        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleAddSlot(false)}
                            className="flex flex-1 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 py-2.5 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50"
                          >
                            <Plus size={14} />
                            <span>Add Another Date</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddSlot(true)}
                            className="flex flex-1 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-violet-300 bg-violet-50/40 py-2.5 text-xs font-bold text-violet-700 transition hover:bg-violet-50"
                          >
                            <Clock size={14} />
                            <span>Add Custom Timing</span>
                          </button>
                        </div>
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
                    <button
                      type="button"
                      onClick={() => setServicesSectionOpen((open) => !open)}
                      className="flex w-full items-center justify-between gap-2 text-left"
                      aria-expanded={servicesSectionOpen}
                    >
                      <span className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                          <FileText size={14} />
                        </span>
                        <span className="font-bold text-slate-800 text-sm">
                          Additional Services{" "}
                          <span className="font-normal text-slate-400 text-xs">
                            (Optional)
                          </span>
                        </span>
                      </span>
                      <ChevronDown
                        size={16}
                        className={`shrink-0 text-slate-500 transition ${servicesSectionOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {servicesSectionOpen ? (

                    <div className="flex w-full min-w-0 gap-2.5 overflow-x-auto pb-1">
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
                            className={`flex w-[168px] shrink-0 flex-col justify-between rounded-2xl border p-3 transition ${
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
                    ) : null}
                  </div>

                  {showFood ? (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setFoodSectionOpen((open) => !open)}
                      className="flex w-full items-center justify-between gap-2 text-left"
                      aria-expanded={foodSectionOpen}
                    >
                      <span className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                          <UtensilsCrossed size={14} />
                        </span>
                        <span className="font-bold text-slate-800 text-sm">
                          Food{" "}
                          <span className="font-normal text-slate-400 text-xs">
                            (Optional)
                          </span>
                        </span>
                      </span>
                      <ChevronDown
                        size={16}
                        className={`shrink-0 text-indigo-600 transition ${foodSectionOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {foodSectionOpen ? (
                    <>
                    <input
                      type="text"
                      value={foodSearch}
                      onChange={(event) => setFoodSearch(event.target.value)}
                      placeholder="Search food"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                    <div className="flex w-full min-w-0 gap-2.5 overflow-x-auto pb-1">
                      {foodCatalog
                        .filter((food) => {
                          const query = foodSearch.trim().toLowerCase();
                          const selected = (foodQty[String(food._id || "")] || 0) > 0;
                          if (!query) return selected || foodCatalog.indexOf(food) < 10;
                          return String(food.name || "").toLowerCase().includes(query);
                        })
                        .map((food) => {
                          const id = String(food._id || "");
                          const qty = foodQty[id] || 0;
                          return (
                            <div
                              key={id}
                              className={`flex w-[168px] shrink-0 flex-col justify-between rounded-2xl border p-3 transition ${
                                qty > 0
                                  ? "border-orange-400 bg-orange-50/40 shadow-xs"
                                  : "border-slate-200/90 bg-white hover:border-slate-300"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                                  <UtensilsCrossed size={16} />
                                </div>
                                <input
                                  type="checkbox"
                                  checked={qty > 0}
                                  onChange={(event) =>
                                    setFoodQty((prev) => ({
                                      ...prev,
                                      [id]: event.target.checked ? Math.max(1, prev[id] || 1) : 0,
                                    }))
                                  }
                                  className="h-4 w-4 rounded accent-orange-500 cursor-pointer"
                                />
                              </div>
                              <div className="my-2 min-h-[36px]">
                                <p className="text-xs font-bold text-slate-800 leading-tight truncate" title={food.name}>
                                  {food.name}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  ₹{Number(food.price || 0).toLocaleString("en-IN")}
                                  {food.unit ? ` / ${food.unit}` : ""}
                                </p>
                                {food.isPackaged ? (
                                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-orange-600">
                                    Packaged Food
                                  </p>
                                ) : null}
                              </div>
                              <div className="flex h-7 items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFoodQty((prev) => ({
                                      ...prev,
                                      [id]: Math.max(0, (prev[id] || 0) - 1),
                                    }))
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
                                    setFoodQty((prev) => ({
                                      ...prev,
                                      [id]: (prev[id] || 0) + 1,
                                    }))
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
                    </>
                    ) : null}
                  </div>
                  ) : null}

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

              {/* Right column stays beside the form on a wide screen. */}
              <div className="hidden lg:col-span-4 lg:block lg:h-full lg:min-h-0 lg:overflow-y-auto custom-scrollbar">
                {bookingSummary}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-white px-4 py-3.5 sm:px-6">
            <button
              type="button"
              onClick={() => setSummaryOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 lg:hidden"
            >
              <FileText size={15} />
              View booking summary
            </button>
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

            <div className="ml-auto flex flex-wrap justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => void closeIfConfirmed(onClose)}
                disabled={submitting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-50 sm:text-sm"
              >
                Cancel
              </button>


              <button
                type="button"
                disabled={downloadingQuote}
                onClick={() => {
                  const code = `QT-${phone.replace(/\D/g, "").slice(-4) || "BOOK"}`;
                  const spaceLines =
                    bookedSpaces.length > 0
                      ? bookedSpaces.map((space) => ({
                          productName: [
                            space.spaceName || "Space",
                            space.spaceDay ? `(${space.spaceDay})` : "",
                            space.spaceCode || "",
                          ]
                            .filter(Boolean)
                            .join(" "),
                          qty: 1,
                          unitPrice: Number(space.lineTotal) || 0,
                          discount: 0,
                          category: "space",
                        }))
                      : selectedSpace
                        ? [{
                            productName: selectedSpace.name || "Space",
                            qty: spaceQty,
                            unitPrice: Number(selectedSpace.price) || 0,
                            discount: 0,
                            category: "space",
                          }]
                        : [];
                  const items = [
                    ...spaceLines,
                    ...selectedServicesList.map((service) => ({
                      productName: service.label,
                      qty: service.qty,
                      unitPrice: service.price,
                      discount: 0,
                      category: "service",
                    })),
                    ...selectedFoodsList.map((food) => ({
                      productName: food.label,
                      qty: food.qty,
                      unitPrice: food.price,
                      discount: 0,
                      category: "food",
                    })),
                  ];
                  if (!name.trim() || items.length === 0) {
                    toast.warning("Add a customer and at least one space, service, or food item.");
                    return;
                  }
                  const offer =
                    !isDurationPlan && dateMode !== "multiple"
                      ? spaceOfferFromSnapshot(liveOffer)
                      : null;
                  const offerOff = offer?.discount || 0;
                  const lineSum = items.reduce(
                    (sum, item) => sum + Number(item.qty) * Number(item.unitPrice),
                    0,
                  );
                  const bookingDetails = isDurationPlan
                    ? [
                        {
                          label: "Booking Date",
                          value: `${formatDateDisplay(coworkingStartDate)} to ${formatDateDisplay(coworkingEndDate)}`,
                        },
                        {
                          label: "Booking Timing",
                          value: "6:00 AM - 12:00 AM",
                        },
                        {
                          label: "Booking Hours",
                          value: "18 Hours each day",
                        },
                        {
                          label: "Booking Duration",
                          value: `${planDurationCount} ${
                            planDurationCount === 1
                              ? planDurationInfo.unitSingular
                              : planDurationInfo.unitPlural
                          }`,
                        },
                      ]
                    : dateMode === "multiple"
                      ? [
                          ...multiDateSlots.flatMap((slot, index) => {
                            const prefix = multiDateSlots.length > 1 ? ` ${index + 1}` : "";
                            const hours =
                              Number(slot.duration) ||
                              calcDurationHours(slot.startTime, slot.endTime) ||
                              0;
                            return [
                              {
                                label: `Booking Date${prefix}`,
                                value: formatDateDisplay(slot.date),
                              },
                              {
                                label: `Booking Timing${prefix}`,
                                value: bookingTimingLabel(slot.startTime, slot.endTime, slot.timeSlot),
                              },
                              {
                                label: `Booking Hours${prefix}`,
                                value: bookingHoursLabel(hours),
                              },
                            ];
                          }),
                          ...(multiDateSlots.length > 1
                            ? [
                                {
                                  label: "Total Booking Hours",
                                  value: bookingHoursLabel(
                                    multiDateSlots.reduce(
                                      (sum, slot) =>
                                        sum +
                                        (Number(slot.duration) ||
                                          calcDurationHours(slot.startTime, slot.endTime) ||
                                          0),
                                      0,
                                    ),
                                  ),
                                },
                              ]
                            : []),
                        ]
                      : [
                          {
                            label: "Booking Date",
                            value: formatDateDisplay(bookingDate),
                          },
                          {
                            label: "Booking Timing",
                            value: bookingTimingLabel(bookingFrom, bookingTo, timeSlot),
                          },
                          {
                            label: "Booking Hours",
                            value: bookingHoursLabel(
                              calcDurationHours(bookingFrom, bookingTo) || duration,
                            ),
                          },
                        ];
                  setDownloadingQuote(true);
                  void downloadInvoicePdf(
                    {
                      invoiceCode: code,
                      quotationCode: code,
                      quotationDate: bookingDate,
                      invoiceDate: bookingDate,
                      customerName: name.trim(),
                      customerPhone: phone.replace(/\D/g, ""),
                      membershipType: membershipType !== "none" ? membershipType : "",
                      membershipDiscount: discountAmount,
                      cashbackTotal: cashbackAmount,
                      subTotal: lineSum,
                      discountTotal: discountAmount + offerOff,
                      grandTotal: Math.max(0, lineSum - discountAmount - offerOff),
                      items,
                      notes,
                      bookingDetails,
                      spaceOffer: offer,
                    },
                    "QUOTATION",
                  )
                    .catch((err: unknown) => {
                      toast.error(err instanceof Error ? err.message : "Could not download the quotation.");
                    })
                    .finally(() => setDownloadingQuote(false));
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50 sm:text-sm"
              >
                {downloadingQuote ? (
                  <Loader2 size={15} className="animate-spin text-indigo-600" />
                ) : (
                  <Download size={15} className="text-indigo-600" />
                )}
                <span>{downloadingQuote ? "Preparing…" : "Download Quotation"}</span>
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
                type="button"
                onClick={(event) => {
                  void handleSubmit(event);
                }}
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

      {summaryOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/60 p-3 sm:items-center lg:hidden"
          onClick={() => setSummaryOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-bold text-slate-900">Booking Summary</h3>
              <button
                type="button"
                onClick={() => setSummaryOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                title="Close summary"
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">{bookingSummary}</div>
          </div>
        </div>
      ) : null}

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

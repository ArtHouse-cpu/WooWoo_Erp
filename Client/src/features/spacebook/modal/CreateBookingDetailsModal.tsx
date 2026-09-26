import { useEffect, useId, useMemo, useRef, useState } from "react";
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
  Lock,
} from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { useAppSelector } from "@/store/hooks";
import { useDebounce } from "@/hooks/useDebounce";
import {
  handleGetSpaces,
  handleGetCustomers,
  handleCreateCustomer,
  handleGetMemberships,
  customerPayloadToFormData,
  type CustomerPayload,
  type SpaceBookingPayload,
  type SpaceBookingStatus,
  type SpacePayload,
  type MembershipPlanPayload,
} from "@/services/apiClient";
import CreateCustomerModal from "@/features/network/components/CreateCustomerModal";
import MembershipBadge from "@/features/sales/components/invoice/MembershipBadge";
import {
  resolveMembershipPlan,
  resolveBenefitPercents,
  getMembershipBadgeLabel,
} from "@/features/sales/utils/membershipInvoiceUtils";
import {
  EXCLUSIVE_CATEGORIES,
  COWORKING_CATEGORIES,
} from "@/features/catalogue/components/AddSpaceModal";

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

export const COWORKING_PLANS = [
  { id: "day", label: "One Day", days: 1 },
  { id: "week", label: "One Week", days: 7 },
  { id: "month", label: "One Month", days: 30 },
  { id: "year", label: "One Year", days: 365 },
] as const;

/** Calculates end date from start date and number of days (inclusive) */
export const calculateEndDate = (startDateStr: string, days: number): string => {
  if (!startDateStr) return "";
  const [y, m, d] = startDateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return startDateStr;
  date.setDate(date.getDate() + Math.max(1, days) - 1);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export type MultiDateSlot = {
  id: string;
  date: string;
  duration: number;
  timeSlot: string;
  startTime: string;
  endTime: string;
};

const TIME_SLOTS = [
  "09:00 AM - 12:00 PM",
  "10:00 AM - 02:00 PM",
  "01:00 PM - 03:00 PM",
  "12:00 PM - 03:00 PM",
  "03:00 PM - 06:00 PM",
  "06:00 PM - 09:00 PM",
  "09:00 AM - 05:00 PM",
];


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

const formatDateDisplay = (value?: string | Date | null) => {
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

const formatTimeDisplay = (timeStr: string) => {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  if (Number.isNaN(h)) return timeStr;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = String(m || 0).padStart(2, "0");
  return `${displayH}:${displayM} ${period}`;
};

const formatTimeSlotDisplay = (timeStr: string) => {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  if (Number.isNaN(h)) return timeStr;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = String(m || 0).padStart(2, "0");
  return `${String(displayH).padStart(2, "0")}:${displayM} ${period}`;
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

const parseTimeSlotRange = (slot: string) => {
  const parts = slot.split("-").map((s) => s.trim());
  if (parts.length !== 2) return { startTime: "09:00", endTime: "12:00", hours: 3 };

  const to24H = (tStr: string) => {
    const m = tStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return "09:00";
    let h = parseInt(m[1], 10);
    const min = m[2];
    const mer = m[3].toUpperCase();
    if (mer === "PM" && h < 12) h += 12;
    if (mer === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${min}`;
  };

  const start = to24H(parts[0]);
  const end = to24H(parts[1]);
  const hours = calcDurationHours(start, end) || 3;
  return { startTime: start, endTime: end, hours };
};




const spaceLabel = (space: SpacePayload) => {
  const day = space.day ? ` · ${space.day}` : "";
  const price =
    space.price != null
      ? ` · ₹${Number(space.price).toLocaleString("en-IN")}`
      : "";
  return `${space.name || "Unnamed"}${day}${price}`;
};

const getSpaceCode = (space: SpacePayload): string => {
  if (space.spaceCode) return space.spaceCode;
  if ((space as any).code) return String((space as any).code);
  const id = String(space._id || "");
  if (id.length >= 6) {
    return `SP-${id.slice(-5).toUpperCase()}`;
  }
  return `SP-${String(space.name || "001").slice(0, 3).toUpperCase()}`;
};

const isCoworkingSpace = (space: SpacePayload): boolean => {
  const rawType = String(space.spaceType || "").trim().toLowerCase();
  if (rawType === "coworking") return true;
  if (rawType === "exclusive") return false;

  const cat = String(space.category || "").trim();
  if (COWORKING_CATEGORIES.some((c) => c.toLowerCase() === cat.toLowerCase())) {
    return true;
  }
  if (EXCLUSIVE_CATEGORIES.some((c) => c.toLowerCase() === cat.toLowerCase())) {
    return false;
  }
  if (cat.toLowerCase() === "coworking" || cat.toLowerCase().includes("cowork")) {
    return true;
  }

  const name = String(space.name || "").trim().toLowerCase();
  if (
    name.includes("cowork") ||
    name.includes("hot desk") ||
    name.includes("desk pass") ||
    name.includes("flexi desk") ||
    name.includes("dedicated desk") ||
    name.includes("meeting pod") ||
    name.includes("open workspace")
  ) {
    return true;
  }
  return false;
};

const isExclusiveSpace = (space: SpacePayload): boolean => {
  return !isCoworkingSpace(space);
};

export const computeBookingStatus = (
  bookingDate: string | Date | null | undefined,
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  currentStatus?: SpaceBookingStatus,
  now: Date = new Date(),
): SpaceBookingStatus => {
  if (currentStatus === "Cancelled") {
    return "Cancelled";
  }

  if (!bookingDate || !startTime || !endTime) {
    return currentStatus || "Upcoming";
  }

  let year: number;
  let month: number;
  let day: number;

  if (typeof bookingDate === "string") {
    const m = bookingDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      year = Number(m[1]);
      month = Number(m[2]) - 1;
      day = Number(m[3]);
    } else {
      const d = new Date(bookingDate);
      if (Number.isNaN(d.getTime())) return currentStatus || "Upcoming";
      year = d.getFullYear();
      month = d.getMonth();
      day = d.getDate();
    }
  } else if (bookingDate instanceof Date) {
    if (Number.isNaN(bookingDate.getTime())) return currentStatus || "Upcoming";
    year = bookingDate.getFullYear();
    month = bookingDate.getMonth();
    day = bookingDate.getDate();
  } else {
    return currentStatus || "Upcoming";
  }

  const [sH, sM] = String(startTime).split(":").map(Number);
  const [eH, eM] = String(endTime).split(":").map(Number);
  if (
    Number.isNaN(sH) ||
    Number.isNaN(sM) ||
    Number.isNaN(eH) ||
    Number.isNaN(eM)
  ) {
    return currentStatus || "Upcoming";
  }

  const start = new Date(year, month, day, sH, sM, 0, 0);
  const end = new Date(year, month, day, eH, eM, 0, 0);
  const nowMs = now.getTime();

  if (nowMs < start.getTime()) return "Upcoming";
  if (nowMs < end.getTime()) return "Ongoing";
  return "Expired";
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
  const staff = useAppSelector((state) => state.user);
  const customerSearchRef = useRef<HTMLDivElement>(null);
  const coworkingDateInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
 const [isPhoneAutoFetched, setIsPhoneAutoFetched] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [membershipType, setMembershipType] = useState<string>("none");
  const [membershipPlanId, setMembershipPlanId] = useState<string | null>(null);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlanPayload[]>([]);
  const [spaceId, setSpaceId] = useState("");
  const [bookingDate, setBookingDate] = useState(() =>
    new Date().toISOString().split("T")[0],
  );
  const [bookingFrom, setBookingFrom] = useState("10:00");
  const [bookingTo, setBookingTo] = useState("12:00");
  const [status, setStatus] = useState<SpaceBookingStatus>("Upcoming");
  const [manualStatusSelected, setManualStatusSelected] = useState(false);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [spaces, setSpaces] = useState<SpacePayload[]>([]);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [spacesError, setSpacesError] = useState("");
  const [spaceTypeFilter, setSpaceTypeFilter] = useState<"coworking" | "exclusive">("coworking");
  const [spaceSearch, setSpaceSearch] = useState("");

  const [customers, setCustomers] = useState<CustomerPayload[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [dateMode, setDateMode] = useState<"single" | "multiple">("single");
  const [duration, setDuration] = useState(3);
  const [timeSlot, setTimeSlot] = useState("09:00 AM - 12:00 PM");

  // Coworking Plan & Date State
  const [coworkingPlan, setCoworkingPlan] = useState<string>("day");
  const [coworkingDays, setCoworkingDays] = useState<number>(1);
  const [coworkingStartDate, setCoworkingStartDate] = useState<string>(() =>
    new Date().toISOString().split("T")[0],
  );

  const coworkingEndDate = useMemo(() => {
    return calculateEndDate(coworkingStartDate, coworkingDays);
  }, [coworkingStartDate, coworkingDays]);

  const singleDateSlots = useMemo(() => {
    return getTimeSlotsForDuration(duration);
  }, [duration]);

  const [multiDateSlots, setMultiDateSlots] = useState<MultiDateSlot[]>([
    {
      id: "slot-1",
      date: new Date().toISOString().split("T")[0],
      duration: 3,
      timeSlot: "09:00 AM - 12:00 PM",
      startTime: "09:00",
      endTime: "12:00",
    },
  ]);
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const [additionalServices, setAdditionalServices] = useState({
  marketingSupport: 0,
  projector: 0,
  speakerSound: 0,
  mediaShoot: 0,
  eventCoordinator: 0,
});

  const debouncedCustomerSearch = useDebounce(name.trim(), 250);

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

  useEffect(() => {
    if (!isOpen) return;

    if (initialBooking) {
      setName(initialBooking.customerName || "");
      const initPhone = initialBooking.customerPhone || "";
      setPhone(initPhone);
      setIsPhoneAutoFetched(Boolean(initPhone));
     
      setSpaceId(String(initialBooking.spaceId || ""));
      setCustomerId((initialBooking as any)?.customerId || null);
      setMembershipType("none");
      setMembershipPlanId(null);

      // Lookup customer membership for prefilled booking
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
                setIsPhoneAutoFetched(true);
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
    } else if (draftValues) {
      setName(draftValues.customerName || "");
      setPhone(draftValues.customerPhone || "");
      
      setCustomerId(draftValues.customerId || null);
      setMembershipType(draftValues.membershipType || "none");
      setMembershipPlanId(draftValues.membershipPlanId || null);
      setSpaceId(String(draftValues.spaceId || ""));
      const bDate = toDateInput(draftValues.bookingDate);
      const bFrom = draftValues.startTime || "09:00";
      const bTo = draftValues.endTime || "12:00";
      setBookingDate(bDate);
      setBookingFrom(bFrom);
      setBookingTo(bTo);
      setCoworkingStartDate(bDate);
      const draftDur =
        draftValues.durationHours || calcDurationHours(bFrom, bTo) || 3;
      setDuration(draftDur);
      setTimeSlot(
        `${formatTimeSlotDisplay(bFrom)} - ${formatTimeSlotDisplay(bTo)}`,
      );
      if (draftValues.status === "Cancelled") {
        setStatus("Cancelled");
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
    } else {
      setName("");
     
    setPhone("");
setIsPhoneAutoFetched(false);
      setCustomerId(null);
      setMembershipType("none");
      setMembershipPlanId(null);
      setSpaceId("");
      const todayStr = new Date().toISOString().split("T")[0];
      setBookingDate(todayStr);
      setBookingFrom("09:00");
      setBookingTo("12:00");
      setCoworkingStartDate(todayStr);
      setCoworkingDays(1);
      setCoworkingPlan("day");
      setDuration(3);
      setTimeSlot("09:00 AM - 12:00 PM");
      const computed = computeBookingStatus(todayStr, "09:00", "12:00");
      setStatus(computed);
      setManualStatusSelected(false);
      setNotes("");
    }
    setErrors({});
    setCustomerDropdownOpen(false);
    setCustomers([]);
  }, [isOpen, initialBooking, draftValues]);

  // Automatically recalculate status whenever date, start time, or end time changes
  useEffect(() => {
    if (manualStatusSelected) return;
    const computed = computeBookingStatus(bookingDate, bookingFrom, bookingTo);
    setStatus(computed);
  }, [bookingDate, bookingFrom, bookingTo, manualStatusSelected]);

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

  useEffect(() => {
    if (!spaces.length) return;
    if (spaceId) {
      const selected = spaces.find((s) => String(s._id) === String(spaceId));
      if (selected) {
        setSpaceTypeFilter(isCoworkingSpace(selected) ? "coworking" : "exclusive");
        return;
      }
    }
    const hasCoworking = spaces.some(isCoworkingSpace);
    const hasExclusive = spaces.some(isExclusiveSpace);
    if (!hasCoworking && hasExclusive) {
      setSpaceTypeFilter("exclusive");
    } else if (hasCoworking && !hasExclusive) {
      setSpaceTypeFilter("coworking");
    }
  }, [spaces, spaceId]);

  const handleSpaceTypeToggle = (type: "coworking" | "exclusive") => {
    setSpaceTypeFilter(type);
    if (type === "exclusive") {
      setDateMode("single");
    }
    if (spaceId && spaces.length > 0) {
      const selected = spaces.find((s) => String(s._id) === String(spaceId));
      if (selected) {
        const isCowork = isCoworkingSpace(selected);
        if ((type === "coworking" && !isCowork) || (type === "exclusive" && isCowork)) {
          setSpaceId("");
        }
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

      const name = String(space.name || "").toLowerCase();
      const code = getSpaceCode(space).toLowerCase();
      const cat = String(space.category || "").toLowerCase();
      const desc = String(space.description || "").toLowerCase();
      const day = String(space.day || "").toLowerCase();

      return (
        name.includes(q) ||
        code.includes(q) ||
        cat.includes(q) ||
        desc.includes(q) ||
        day.includes(q)
      );
    });
  }, [spaces, spaceTypeFilter, spaceSearch]);

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
        }
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [phone]);

  if (!isOpen) return null;

  const handleSelectCustomer = (c: CustomerPayload) => {
    setName(c.name || "");
    setPhone(c.mobile ? String(c.mobile).replace(/\D/g, "") : "");
    
    setCustomerId(c._id || (c as any).id || null);
    setMembershipType(c.membershipType || "none");
    setMembershipPlanId(c.membershipPlanId || null);
    setCustomerDropdownOpen(false);
    setCustomers([]);
    setErrors((prev) => ({
      ...prev,
      name: "",
      phone: "",
      email: "",
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
      
      const createdId = created?._id || (created as any)?.id || null;
      const createdMembership =
        created?.membershipType || args.payload.membershipType || "none";
      const createdPlanId =
        created?.membershipPlanId || args.payload.membershipPlanId || null;

      if (createdName) setName(createdName);
      if (createdPhone) setPhone(createdPhone.replace(/\D/g, ""));
     
      setCustomerId(createdId);
      setMembershipType(createdMembership);
      setMembershipPlanId(createdPlanId);

      setErrors((prev) => ({
        ...prev,
        name: "",
        phone: "",
        email: "",
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

  const handleSingleTimeSlotChange = (newSlot: string) => {
    setTimeSlot(newSlot);
    setManualStatusSelected(false);
    const { hours, startTime, endTime } = parseTimeSlotRange(newSlot);
    setDuration(hours);
    setBookingFrom(startTime);
    setBookingTo(endTime);
  };

  const handleApplySingleDuration = (newDur: number) => {
    const dur = Math.max(1, Math.min(12, newDur));
    setDuration(dur);

    let [startH] = (bookingFrom || "09:00").split(":").map(Number);
    if (Number.isNaN(startH) || startH < 9) startH = 9;
    if (startH + dur > 21) {
      startH = Math.max(9, 21 - dur);
    }
    const endH = startH + dur;
    const startStr = `${String(startH).padStart(2, "0")}:00`;
    const endStr = `${String(endH).padStart(2, "0")}:00`;
    setBookingFrom(startStr);
    setBookingTo(endStr);
    setTimeSlot(
      `${formatTimeSlotDisplay(startStr)} - ${formatTimeSlotDisplay(endStr)}`,
    );
    setManualStatusSelected(false);
  };

  const handleSingleDurationChange = (delta: number) => {
    handleApplySingleDuration(duration + delta);
  };

  const handleSelectCoworkingPlan = (planId: string, days: number) => {
    setCoworkingPlan(planId);
    setCoworkingDays(days);
  };

  const handleCoworkingDaysChange = (delta: number) => {
    const nextDays = Math.max(1, coworkingDays + delta);
    setCoworkingDays(nextDays);
    const matchedPlan = COWORKING_PLANS.find((p) => p.days === nextDays);
    setCoworkingPlan(matchedPlan ? matchedPlan.id : "custom");
  };

  const handleAddSlot = () => {
    const lastSlot = multiDateSlots[multiDateSlots.length - 1];
    let nextDateStr = new Date().toISOString().split("T")[0];
    if (lastSlot?.date) {
      const d = new Date(lastSlot.date);
      d.setDate(d.getDate() + 1);
      if (!Number.isNaN(d.getTime())) {
        nextDateStr = d.toISOString().split("T")[0];
      }
    }
    const dur = lastSlot?.duration || 3;
    const availableSlots = getTimeSlotsForDuration(dur);
    const defaultSlot = availableSlots[0] || "09:00 AM - 12:00 PM";
    const { startTime, endTime } = parseTimeSlotRange(defaultSlot);

    const newSlot: MultiDateSlot = {
      id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      date: nextDateStr,
      duration: dur,
      timeSlot: defaultSlot,
      startTime,
      endTime,
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

  const handleQuickDuration = (hours: number) => {
    handleApplySingleDuration(hours);
  };

  const validate = () => {
    const err: Record<string, string> = {};
    if (!name.trim()) err.name = "Customer name is required.";
    if (!phone.trim()) err.phone = "Phone number is required.";
    else if (!/^\d{10}$/.test(phone.trim().replace(/\D/g, ""))) {
      err.phone = "Please enter a valid 10-digit phone number.";
    }
  
    if (!spaceId) err.spaceId = "Please select a space.";

    if (spaceTypeFilter === "coworking") {
      if (!coworkingStartDate) err.coworkingStartDate = "Start date is required.";
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
    } else {
      if (!bookingDate) err.bookingDate = "Booking date is required.";
      if (!bookingFrom) err.bookingFrom = "Start time is required.";
      if (!bookingTo) err.bookingTo = "End time is required.";
      if (bookingFrom && bookingTo && bookingTo <= bookingFrom) {
        err.bookingTo = "End time must be after start time.";
      }
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

    const isCoworking = spaceTypeFilter === "coworking";
    const isMultiple = !isCoworking && dateMode === "multiple";
    const durationHours = isCoworking
      ? coworkingDays * 8
      : isMultiple
      ? multiDateSlots.reduce((acc, s) => acc + (s.duration || 1), 0)
      : calcDurationHours(bookingFrom, bookingTo) || duration;

    const unitPrice = Math.max(0, Number(selectedSpace?.price ?? 0));
    const lineTotal = isCoworking
      ? Math.round(unitPrice * Math.max(coworkingDays, 1) * 100) / 100
      : Math.round(unitPrice * Math.max(durationHours, 0) * 100) / 100;

    if (!isEdit && lineTotal <= 0) {
      toast.error(
        "Booking total is ₹0. Check space price and booking duration.",
      );
      return;
    }

    const spaceType = selectedSpace
      ? selectedSpace.spaceType ||
        (isCoworkingSpace(selectedSpace) ? "Coworking" : "Exclusive")
      : undefined;
    const spaceCode = selectedSpace ? getSpaceCode(selectedSpace) : undefined;

    let finalNotes = notes.trim();
    if (isCoworking) {
      const planObj = COWORKING_PLANS.find((p) => p.id === coworkingPlan);
      const planName = planObj ? planObj.label : `${coworkingDays} Days`;
      const coworkSummary = `Coworking Plan: ${planName} (${coworkingDays} ${coworkingDays === 1 ? "Day" : "Days"}: ${formatDateDisplay(coworkingStartDate)} to ${formatDateDisplay(coworkingEndDate)})`;
      finalNotes = finalNotes ? `${finalNotes}\n${coworkSummary}` : coworkSummary;
    } else if (isMultiple && multiDateSlots.length > 0) {
      const datesSummary = multiDateSlots
        .map((s) => `${formatDateDisplay(s.date)} (${s.timeSlot}, ${s.duration}h)`)
        .join(" | ");
      finalNotes = finalNotes
        ? `${finalNotes}\nDates: ${datesSummary}`
        : `Multi-Date Booking: ${datesSummary}`;
    }

    const payload: BookingFormPayload = {
      customerName: name.trim(),
      customerPhone: phone.trim().replace(/\D/g, ""),
   
      customerId: customerId || undefined,
      membershipType: membershipType || undefined,
      membershipPlanId: membershipPlanId || undefined,
      spaceId,
      bookingDate: isCoworking ? coworkingStartDate : isMultiple ? (multiDateSlots[0]?.date || bookingDate) : bookingDate,
      startTime: isCoworking ? "09:00" : isMultiple ? (multiDateSlots[0]?.startTime || bookingFrom) : bookingFrom,
      endTime: isCoworking ? "21:00" : isMultiple ? (multiDateSlots[0]?.endTime || bookingTo) : bookingTo,
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
    };

    try {
      await onSubmit(payload);
    } catch {
      // Parent handles toast; keep modal open on failure.
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget && !submitting) onClose();
        }}
      >
        <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
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
                          setPhone("");
                          setIsPhoneAutoFetched(false);
                        } else if (customerId) {
                          setCustomerId(null);
                          setIsPhoneAutoFetched(false);
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
                      placeholder="e.g. Rahul Sharma"
                      className={`h-10 w-full rounded-xl border pl-10 pr-18 text-sm outline-none transition focus:ring-2 ${
                        errors.name
                          ? "border-rose-300 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-100"
                          : "border-slate-200 bg-white focus:border-indigo-500 focus:ring-indigo-100"
                      }`}
                    />

                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
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
                          className="text-slate-400 hover:text-slate-600 transition p-0.5 rounded"
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

                  {/* Membership Info Banner beneath the input */}
                  {/* {membershipType && membershipType !== "none" && (
                    <div className="mt-1.5 flex items-center justify-between rounded-lg border border-amber-200/80 bg-amber-50/80 px-2.5 py-1.5 text-xs text-amber-900 animate-in fade-in duration-150">
                      <div className="flex items-center gap-1.5 truncate">
                        <Sparkles size={13} className="shrink-0 text-amber-600" />
                        <span className="font-semibold">
                          {getMembershipBadgeLabel(membershipPlans, membershipType, membershipPlanId)} Member
                        </span>
                        {(() => {
                          const activePlan = resolveMembershipPlan(
                            membershipPlans,
                            membershipType,
                            membershipPlanId,
                          );
                          // const benefit = resolveBenefitPercents("space", activePlan);
                          // // if (benefit.discountPercent > 0) {
                          // //   return (
                          // //     <span className="rounded bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                          // //       {benefit.discountPercent}% Space Discount
                          // //     </span>
                          // //   );
                          // // }
                          // // if (benefit.cashbackPercent > 0) {
                          // //   return (
                          // //     <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          // //       {benefit.cashbackPercent}% Cashback
                          // //     </span>
                          // //   );
                          // // }
                          // return null;
                        })()}
                      </div>
                    </div>
                  )} */}

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
                    {isPhoneAutoFetched && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                        <Lock size={11} className="text-slate-400" />
                        Autofetched
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <Phone
                      size={16}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      maxLength={10}
                      value={phone}
                      onChange={(e) => {
                        if (isPhoneAutoFetched) return;
                        setPhone(e.target.value.replace(/\D/g, ""));

                        if (errors.phone) {
                          setErrors((prev) => ({ ...prev, phone: "" }));
                        }
                      }}
                      readOnly={isPhoneAutoFetched}
                      title={
                        isPhoneAutoFetched
                          ? "Phone number autofetched from customer details"
                          : undefined
                      }
                      placeholder="9876543210"
                      className={`h-10 w-full rounded-xl border pl-10 pr-9 text-sm outline-none transition focus:ring-2 ${
                        errors.phone
                          ? "border-rose-300 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-100"
                          : isPhoneAutoFetched
                            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500 select-none"
                            : "border-slate-200 bg-white focus:border-indigo-500 focus:ring-indigo-100"
                      }`}
                    />

                    {isPhoneAutoFetched && (
                      <div
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                        title="Autofetched from customer details"
                      >
                        <Lock size={15} />
                      </div>
                    )}
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-xs text-rose-500">{errors.phone}</p>
                  )}
                </div>
            </div>
          </div>

            <div className="space-y-3">
              {/* Header with Title and Coworking/Exclusive Toggle */}
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                    2
                  </span>
                  <h3 className="font-semibold text-slate-800">
                    Select Space <span className="text-rose-500">*</span>
                  </h3>
                </div>
                 
                  {/* Search by space name or space code */}
             
              <div className="relative flex-1">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={spaceSearch}
                  onChange={(e) => setSpaceSearch(e.target.value)}
                  placeholder={`Search ${spaceTypeFilter} spaces by name or code (e.g. SP-001, Desk)...`}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400"
                />
                {spaceSearch && (
                  <button
                    type="button"
                    onClick={() => setSpaceSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                    title="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

                {/* Toggle switch: Coworking vs Exclusive */}
                <div className="inline-flex self-start sm:self-auto rounded-xl bg-slate-100 p-1 border border-slate-200/80 shadow-xs">
                  <button
                    type="button"
                    onClick={() => handleSpaceTypeToggle("coworking")}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      spaceTypeFilter === "coworking"
                        ? "bg-white text-indigo-600 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Laptop size={13} />
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
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      spaceTypeFilter === "exclusive"
                        ? "bg-white text-indigo-600 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Building2 size={13} />
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

            

              {/* Space Options Boxes (Cards) */}
              {spacesLoading ? (
                <div className="flex h-36 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-slate-500">
                  <Loader2 size={20} className="animate-spin text-indigo-500" />
                  <span className="text-xs">Loading spaces…</span>
                </div>
              ) : spacesError && !spaces.length ? (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{spacesError}</span>
                </div>
              ) : filteredSpaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-7 text-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Search size={16} />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">No spaces found</p>
                  <p className="text-[11px] text-slate-400 max-w-xs">
                    {spaceSearch
                      ? `No ${spaceTypeFilter} spaces matched "${spaceSearch}".`
                      : `No ${spaceTypeFilter} spaces are currently available.`}
                  </p>
                  {spaceSearch && (
                    <button
                      type="button"
                      onClick={() => setSpaceSearch("")}
                      className="mt-1 text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 max-h-72 overflow-y-auto pr-1">
                  {filteredSpaces.map((space) => {
                    const isSelected = String(space._id) === String(spaceId);
                    const code = getSpaceCode(space);
                    const priceDisplay =
                      space.price != null
                        ? `₹${Number(space.price).toLocaleString("en-IN")}`
                        : "Free";
                    const img =
                      space.imageUrl ||
                      (space as any).image ||
                      (Array.isArray((space as any).images)
                        ? (space as any).images[0]
                        : null);

                    return (
                      <div
                        key={String(space._id)}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSpaceId(String(space._id));
                          if (errors.spaceId) {
                            setErrors((prev) => ({ ...prev, spaceId: "" }));
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSpaceId(String(space._id));
                            if (errors.spaceId) {
                              setErrors((prev) => ({ ...prev, spaceId: "" }));
                            }
                          }
                        }}
                        className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border text-left transition-all cursor-pointer select-none ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-600/30 shadow-xs"
                            : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs"
                        }`}
                      >
                        {/* Thumbnail / Header Area */}
                        <div className="relative h-24 w-full overflow-hidden bg-slate-100">
                          {img ? (
                            <img
                              src={img}
                              alt={space.name}
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                              }}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
                              {spaceTypeFilter === "coworking" ? (
                                <Laptop size={26} className="text-slate-400/80" />
                              ) : (
                                <Building2 size={26} className="text-slate-400/80" />
                              )}
                            </div>
                          )}

                          {/* Space Code Pill (Top-Left) */}
                          <div className="absolute left-2 top-2 z-10">
                            <span className="inline-flex items-center rounded-md bg-slate-900/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white shadow-xs backdrop-blur-xs">
                              {code}
                            </span>
                          </div>

                          {/* Selected Checkmark or Day Badge (Top-Right) */}
                          <div className="absolute right-2 top-2 z-10">
                            {isSelected ? (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm ring-2 ring-white">
                                <Check size={12} strokeWidth={3} />
                              </span>
                            ) : space.day ? (
                              <span className="inline-flex items-center rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 shadow-xs backdrop-blur-xs">
                                {space.day}
                              </span>
                            ) : null}
                          </div>

                          {/* Capacity Pill (Bottom-Right overlay) */}
                          {space.capacity != null && (
                            <div className="absolute bottom-1.5 right-1.5 z-10">
                              <span className="inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs">
                                <Users size={10} />
                                {space.capacity}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Content Area */}
                        <div className="flex flex-1 flex-col justify-between p-2.5">
                          <div>
                            <h4
                              className={`font-semibold text-xs leading-snug line-clamp-1 ${
                                isSelected ? "text-indigo-950" : "text-slate-800"
                              }`}
                              title={space.name}
                            >
                              {space.name}
                            </h4>
                            <p className="mt-0.5 text-[11px] text-slate-500 capitalize line-clamp-1">
                              {space.category || "Space"}
                            </p>
                          </div>

                          <div className="mt-2 flex items-baseline justify-between pt-1.5 border-t border-slate-100">
                            <span className="text-xs font-bold text-indigo-600">
                              {priceDisplay}
                              <span className="text-[10px] font-normal text-slate-400">/hr</span>
                            </span>
                            <span
                              className={`text-[10px] font-semibold ${
                                isSelected
                                  ? "text-indigo-600"
                                  : "text-slate-400 group-hover:text-indigo-600"
                              }`}
                            >
                              {isSelected ? "Selected" : "Select"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Selected space summary banner */}
              {selectedSpace && (
                <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/50 p-2.5 text-xs text-indigo-900">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                      <Check size={14} strokeWidth={2.5} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate">{selectedSpace.name}</span>
                        <span className="rounded bg-indigo-100 px-1.5 py-0.2 font-mono text-[10px] font-semibold text-indigo-700">
                          {getSpaceCode(selectedSpace)}
                        </span>
                      </div>
                      <p className="text-[11px] text-indigo-700/80 truncate">
                        {selectedSpace.category || "Space"}
                        {selectedSpace.day ? ` · ${selectedSpace.day}` : ""}
                        {selectedSpace.capacity ? ` · Capacity: ${selectedSpace.capacity}` : ""}
                        {" · "}
                        <span className="font-bold text-indigo-900">
                          ₹{Number(selectedSpace.price || 0).toLocaleString("en-IN")}/hr
                        </span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSpaceId("")}
                    className="ml-2 shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                  >
                    Change
                  </button>
                </div>
              )}

              {errors.spaceId && (
                <p className="mt-1 text-xs text-rose-500">{errors.spaceId}</p>
              )}
            </div>

            <div>
  {/* Section Header */}
  <div className="mb-3 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
        3
      </span>

      <h3 className="font-semibold text-slate-800">
        {spaceTypeFilter === "coworking" ? "Select Plan & Date" : "Date & Time"}{" "}
        <span className="text-rose-500">*</span>
      </h3>
    </div>

    {/* Single / Multiple Date: ONLY for Exclusive */}
    {spaceTypeFilter === "exclusive" && (
      <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
        <button
          type="button"
          onClick={() => setDateMode("single")}
          className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
            dateMode === "single"
              ? "border border-indigo-500 bg-indigo-50/80 text-indigo-600 shadow-xs"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          Single Date
        </button>

        <button
          type="button"
          onClick={() => setDateMode("multiple")}
          className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
            dateMode === "multiple"
              ? "border border-indigo-500 bg-indigo-50/80 text-indigo-600 shadow-xs"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          Multiple Dates
        </button>
      </div>
    )}
  </div>

  {/* 1. COWORKING PLAN VIEW (Matches uploaded design) */}
  {spaceTypeFilter === "coworking" ? (
    <div className="space-y-4">
      {/* Plan Selection Buttons */}
      <div>
        {/* <label className="mb-2 block text-xs font-semibold text-slate-700">
          Select Coworking Plan
        </label> */}
        {/* <div className="flex flex-wrap items-center gap-2.5">
          {COWORKING_PLANS.map((plan) => {
            const isSelected = coworkingPlan === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => handleSelectCoworkingPlan(plan.id, plan.days)}
                className={`rounded-xl px-5 py-2 text-xs font-semibold transition-all ${
                  isSelected
                    ? "border-2 border-indigo-500 bg-white text-indigo-600 shadow-xs"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {plan.label}
              </button>
            );
          })}
        </div> */}
      </div>

      {/* Start Date, No. of Days, End Date Row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Start Date */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Start Date <span className="text-rose-500">*</span>
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
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                try {
                  (coworkingDateInputRef.current as any)?.showPicker?.();
                } catch {
                  coworkingDateInputRef.current?.focus();
                }
              }
            }}
            className="relative flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 shadow-2xs hover:border-slate-300 transition cursor-pointer select-none"
          >
            <div className="flex items-center gap-2.5 pointer-events-none">
              <Calendar size={16} className="text-slate-600 shrink-0" />
              <span className="text-sm font-medium text-slate-700">
                {formatDateDisplay(coworkingStartDate)}
              </span>
            </div>
            <ChevronDown size={16} className="text-slate-600 shrink-0 pointer-events-none" />
            <input
              ref={coworkingDateInputRef}
              type="date"
              required
              value={coworkingStartDate}
              onChange={(e) => {
                setCoworkingStartDate(e.target.value);
                if (errors.coworkingStartDate) {
                  setErrors((prev) => ({ ...prev, coworkingStartDate: "" }));
                }
              }}
              onClick={(e) => {
                try {
                  (e.currentTarget as any)?.showPicker?.();
                } catch {}
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </div>
          {errors.coworkingStartDate && (
            <p className="mt-1 text-xs text-rose-500">{errors.coworkingStartDate}</p>
          )}
        </div>

        {/* No. of Days Stepper */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            No. of Days
          </label>
          <div className="flex h-11 items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <button
              type="button"
              onClick={() => handleCoworkingDaysChange(-1)}
              disabled={coworkingDays <= 1}
              className="flex h-full w-12 items-center justify-center border-r border-slate-100 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 transition"
            >
              <Minus size={16} />
            </button>
            <div className="flex flex-1 items-center justify-center text-sm font-semibold text-slate-700">
              {coworkingDays} {coworkingDays === 1 ? "Day" : "Days"}
            </div>
            <button
              type="button"
              onClick={() => handleCoworkingDaysChange(1)}
              className="flex h-full w-12 items-center justify-center border-l border-slate-100 text-slate-600 hover:bg-slate-50 transition"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* End Date (Auto-calculated) */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            End Date
          </label>
          <div className="relative flex h-11 items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 shadow-2xs text-slate-600 select-none">
            <Clock size={16} className="text-slate-400 shrink-0" />
            <span className="text-sm font-medium text-slate-700">
              {formatDateDisplay(coworkingEndDate)}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
            <Info size={12} className="shrink-0" />
            Auto calculated based on number of days
          </p>
        </div>
      </div>
    </div>
  ) : dateMode === "single" ? (
    /* 2. EXCLUSIVE: Single Date mode */
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* DATE */}
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
                setManualStatusSelected(false);

                if (errors.bookingDate) {
                  setErrors((prev) => ({
                    ...prev,
                    bookingDate: "",
                  }));
                }
              }}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {errors.bookingDate && (
            <p className="mt-1 text-xs text-rose-500">
              {errors.bookingDate}
            </p>
          )}
        </div>

        {/* DURATION */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Duration (Hours)
          </label>

          <div className="flex h-10 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => handleSingleDurationChange(-1)}
              disabled={duration <= 1}
              className="flex w-11 items-center justify-center border-r border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              <Minus size={16} />
            </button>

            <div className="flex flex-1 items-center justify-center text-sm font-medium text-slate-700">
              {duration} {duration === 1 ? "Hour" : "Hours"}
            </div>

            <button
              type="button"
              onClick={() => handleSingleDurationChange(1)}
              className="flex w-11 items-center justify-center border-l border-slate-200 text-slate-600 transition hover:bg-slate-50"
            >
              <Plus size={16} />
            </button>
          </div>

          <p className="mt-1 text-[11px] text-slate-400">
            Minimum 1 hour
          </p>
        </div>

        {/* TIME SLOT */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Time Slot
          </label>

          <div className="relative">
            <Clock
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <select
              required
              value={timeSlot}
              onChange={(e) => handleSingleTimeSlotChange(e.target.value)}
              className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Select Time Slot</option>
              {timeSlot && !singleDateSlots.includes(timeSlot) && (
                <option value={timeSlot}>{timeSlot}</option>
              )}
              {singleDateSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Quick Duration Buttons */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-slate-400">Duration:</span>
        {QUICK_DURATIONS.map((dur) => (
          <button
            key={dur.label}
            type="button"
            onClick={() => handleQuickDuration(dur.hours)}
            className={`rounded-lg border px-2.5 py-0.5 text-[11px] font-medium transition ${
              duration === dur.hours
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold shadow-xs"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
            }`}
          >
            {dur.label}
          </button>
        ))}
      </div>
    </div>
  ) : (
    /* Render Multiple Dates list (Exclusive mode) matching reference image */
    <div className="space-y-3">
      {/* Column Headers */}
      <div className="hidden sm:grid sm:grid-cols-[1fr_160px_1fr_42px] gap-3 px-1 text-xs font-semibold text-slate-600">
        <div>Date</div>
        <div>Duration (Hours)</div>
        <div>Time Slot</div>
        <div></div>
      </div>

      {/* Rows */}
      {multiDateSlots.map((slot) => {
        const rowSlots = getTimeSlotsForDuration(slot.duration);
        return (
          <div
            key={slot.id}
            className="grid grid-cols-1 sm:grid-cols-[1fr_160px_1fr_42px] items-center gap-2.5 sm:gap-3"
          >
            {/* Date Picker */}
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => {
                const inputEl = e.currentTarget.querySelector("input[type='date']") as HTMLInputElement | null;
                try {
                  (inputEl as any)?.showPicker?.();
                } catch {
                  inputEl?.focus();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  const inputEl = e.currentTarget.querySelector("input[type='date']") as HTMLInputElement | null;
                  try {
                    (inputEl as any)?.showPicker?.();
                  } catch {
                    inputEl?.focus();
                  }
                }
              }}
              className="relative flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 shadow-2xs hover:border-slate-300 transition cursor-pointer select-none"
            >
              <div className="flex items-center gap-2.5 overflow-hidden pointer-events-none">
                <Calendar size={16} className="text-slate-500 shrink-0" />
                <span className="truncate text-sm font-medium text-slate-700">
                  {formatDateDisplay(slot.date)}
                </span>
              </div>
              <ChevronDown size={16} className="text-slate-400 shrink-0 pointer-events-none ml-1" />
              <input
                type="date"
                required
                value={slot.date}
                onChange={(e) => handleUpdateSlotDate(slot.id, e.target.value)}
                onClick={(e) => {
                  try {
                    (e.currentTarget as any)?.showPicker?.();
                  } catch {}
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
            </div>

            {/* Duration (Hours) Stepper */}
            <div className="flex h-11 items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => handleUpdateSlotDuration(slot.id, -1)}
                disabled={slot.duration <= 1}
                className="flex h-full w-10 items-center justify-center border-r border-slate-100 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 transition"
              >
                <Minus size={15} />
              </button>
              <div className="flex flex-1 items-center justify-center px-1 text-sm font-medium text-slate-700">
                {slot.duration} {slot.duration === 1 ? "Hour" : "Hours"}
              </div>
              <button
                type="button"
                onClick={() => handleUpdateSlotDuration(slot.id, 1)}
                disabled={slot.duration >= 12}
                className="flex h-full w-10 items-center justify-center border-l border-slate-100 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 transition"
              >
                <Plus size={15} />
              </button>
            </div>

            {/* Time Slot Select */}
            <div className="relative flex h-11 items-center rounded-xl border border-slate-200 bg-white px-3.5 shadow-2xs hover:border-slate-300 transition">
              <Clock size={16} className="mr-2.5 text-slate-500 shrink-0 pointer-events-none" />
              <select
                value={slot.timeSlot}
                onChange={(e) => handleUpdateSlotTime(slot.id, e.target.value)}
                className="w-full cursor-pointer appearance-none bg-transparent pr-6 text-sm font-medium text-slate-700 outline-none"
              >
                {slot.timeSlot && !rowSlots.includes(slot.timeSlot) && (
                  <option value={slot.timeSlot}>{slot.timeSlot}</option>
                )}
                {rowSlots.map((ts) => (
                  <option key={ts} value={ts}>
                    {ts}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 text-slate-400" />
            </div>

          {/* Delete Row Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => handleRemoveSlot(slot.id)}
              disabled={multiDateSlots.length <= 1}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-2xs transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
              title="Remove Date"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      );
      })}

      {errors.multiDates && (
        <p className="mt-1 text-xs text-rose-500">{errors.multiDates}</p>
      )}

      {/* Add Another Date Button */}
      <button
        type="button"
        onClick={handleAddSlot}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 py-2.5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 shadow-2xs"
      >
        <Plus size={16} />
        <span>Add Another Date</span>
      </button>
    </div>
  )}

              {/* Automatic Status Preview Badge */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">
                    Calculated Status:
                  </span>
                  {status === "Ongoing" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 ring-2 ring-emerald-300/50" />
                      Ongoing (Active Now)
                    </span>
                  )}
                  {status === "Upcoming" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-300 bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                      <span className="h-2 w-2 rounded-full bg-blue-500 ring-2 ring-blue-300/50" />
                      Upcoming
                    </span>
                  )}
                  {status === "Expired" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                      <span className="h-2 w-2 rounded-full bg-slate-400" />
                      Expired (Past)
                    </span>
                  )}
                  {status === "Cancelled" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                      <span className="h-2 w-2 rounded-full bg-rose-400" />
                      Cancelled
                    </span>
                  )}
                </div>

                <span className="text-[11px] text-slate-400">
                  {manualStatusSelected
                    ? "Manual override active"
                    : "Automatically calculated from date & time"}
                </span>
              </div>

            </div>

            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                  4
                </span>
                <h3 className="font-semibold text-slate-800">
                  {isEdit ? "Status & Additional Notes" : "Additional Notes"}
                </h3>
              </div>

              <div className="space-y-3">
                {isEdit && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-600">
                        Booking Status
                      </label>
                      {manualStatusSelected && (
                        <button
                          type="button"
                          onClick={() => {
                            setManualStatusSelected(false);
                            setStatus(
                              computeBookingStatus(
                                bookingDate,
                                bookingFrom,
                                bookingTo,
                              ),
                            );
                          }}
                          className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          Auto-detect from date & time
                        </button>
                      )}
                    </div>
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
                          onClick={() => {
                            setStatus(s);
                            setManualStatusSelected(true);
                          }}
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
                )}


          {/* Additional Services */}
          <div className="mt-5">
            {/* Section Header */}
  <div className="mb-3 flex items-center gap-2">
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
      <FileText size={16} />
    </span>
 <h3 className="font-semibold text-slate-800">
      Additional Services{" "}
      <span className="font-normal text-slate-400">
        (Optional)
      </span>
    </h3>
  </div>
  {/* Services Grid */}
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
    {[
      {
        key: "marketingSupport" as const,
        label: "Marketing Support",
        price: "₹100/ booking",
        icon: Megaphone,
      },
      {
        key: "projector" as const,
        label: "Projector",
        price: "₹200 / booking",
        icon: Projector,
      },
      {
        key: "speakerSound" as const,
        label: "Speaker / Sound System",
        price: "₹100 / booking",
        icon: Volume2,
      },
      {
        key: "mediaShoot" as const,
        label: "Media Shoot",
        price: "₹500 / booking",
        icon: Camera,
      },
      {
        key: "eventCoordinator" as const,
        label: "Event Coordinator",
        price: "₹300/ booking",
        icon: UserRound,
      },
    ].map((service) => {
      const isSelected = additionalServices[service.key] > 0;
      const Icon = service.icon;

      return (
        <div
          key={service.key}
          className={`flex h-full flex-col justify-between rounded-xl border p-3 transition ${
            isSelected
              ? "border-indigo-400 bg-indigo-50/20 shadow-xs"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          {/* Top Row: Icon + Checkbox */}
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Icon size={18} />
            </div>

            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) =>
                setAdditionalServices((prev) => ({
                  ...prev,
                  [service.key]: e.target.checked ? 1 : 0,
                }))
              }
              className="h-4 w-4 shrink-0 cursor-pointer rounded accent-indigo-600"
            />
          </div>

          {/* Middle: Title & Price */}
          <div className="my-2.5 flex min-h-[38px] flex-col justify-start">
            <p
              className="text-xs font-semibold text-slate-700 leading-snug"
              title={service.label}
            >
              {service.label}
            </p>
            {service.price ? (
              <p className="mt-0.5 text-[11px] text-slate-400">
                {service.price}
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] text-transparent select-none">
                &nbsp;
              </p>
            )}
          </div>

          {/* Bottom: Quantity Stepper */}
          <div className="mt-auto flex h-8 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() =>
                setAdditionalServices((prev) => ({
                  ...prev,
                  [service.key]: Math.max(0, prev[service.key] - 1),
                }))
              }
              className="flex w-9 items-center justify-center border-r border-slate-200 text-slate-500 hover:bg-slate-50 transition"
            >
              <Minus size={14} />
            </button>

            <div className="flex flex-1 items-center justify-center text-xs font-semibold text-slate-700">
              {additionalServices[service.key]}
            </div>

            <button
              type="button"
              onClick={() =>
                setAdditionalServices((prev) => ({
                  ...prev,
                  [service.key]: prev[service.key] + 1,
                }))
              }
              className="flex w-9 items-center justify-center border-l border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      );
    })}
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
              •{" "}
              {spaceTypeFilter === "coworking"
                ? `${coworkingDays} ${coworkingDays === 1 ? "Day" : "Days"} (${formatDateDisplay(coworkingStartDate)} - ${formatDateDisplay(coworkingEndDate)})`
                : dateMode === "multiple" && spaceTypeFilter === "exclusive"
                ? `${multiDateSlots.length} Dates (${multiDateSlots.reduce((sum, s) => sum + (s.duration || 1), 0)} hrs)`
                : `${formatTimeDisplay(bookingFrom)} - ${formatTimeDisplay(bookingTo)}`}
              {!isEdit && selectedSpace && (
                <span className="ml-1 font-semibold text-slate-700">
                  · ₹
                  {(
                    Math.max(0, Number(selectedSpace.price || 0)) *
                    (spaceTypeFilter === "coworking"
                      ? Math.max(coworkingDays, 1)
                      : dateMode === "multiple" && spaceTypeFilter === "exclusive"
                      ? multiDateSlots.reduce((sum, s) => sum + (s.duration || 1), 0)
                      : calcDurationHours(bookingFrom, bookingTo) || duration)
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

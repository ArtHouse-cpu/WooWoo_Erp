import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  X,
  User,
  Phone,
  Lock,
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
  HelpCircle,
  ArrowRight,
  Printer,
  Archive,
  Car,
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

export const QUICK_DURATIONS = [
  { label: "1 hr", hours: 1 },
  { label: "2 hrs", hours: 2 },
  { label: "4 hrs", hours: 4 },
  { label: "Full Day", hours: 8 },
];

export const COWORKING_SERVICES = [
  {
    key: "locker",
    label: "Locker",
    price: 500,
    priceLabel: "₹500 / month",
    icon: Lock,
  },
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

const formatTimeDisplay = (timeStr?: string) => {
  if (!timeStr) return "";
  const [hourStr, minStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  const min = minStr ? parseInt(minStr, 10) : 0;
  if (Number.isNaN(hour)) return timeStr;
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(min).padStart(2, "0")} ${period}`;
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
  initialBooking = null,
  draftValues = null,
  submitting = false,
}: CreateBookingDetailsModalProps) => {
  const formId = useId();
  const isEdit = Boolean(initialBooking?._id || initialBooking?.id);
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
  const [bookingDate, setBookingDate] = useState(() =>
    new Date().toISOString().split("T")[0],
  );
  const [bookingFrom, setBookingFrom] = useState("09:00");
  const [bookingTo, setBookingTo] = useState("12:00");
  const [duration, setDuration] = useState(3);
  const [timeSlot, setTimeSlot] = useState("09:00 AM - 12:00 PM");

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

  // Coworking Plans
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

  // Purpose & Notes (COMMON FOR ALL)
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");

  // Status & Validation
  const [status, setStatus] = useState<SpaceBookingStatus>("Upcoming");
  const [manualStatusSelected, setManualStatusSelected] = useState(false);
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
      setSpaceQty(1);
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
      setSpaceQty(1);
      setPurpose("");
      setNotes("");
      const todayStr = new Date().toISOString().split("T")[0];
      setBookingDate(todayStr);
      setBookingFrom("09:00");
      setBookingTo("12:00");
      setCoworkingStartDate(todayStr);
      setCoworkingDays(1);
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
          if (spaceId) {
            const current = list.find((s) => String(s._id) === String(spaceId));
            if (current) {
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
        setSpaceId(String(matching[0]._id));
        setSpaceQty(1);
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

  // Coworking Handlers
  const handleCoworkingDaysChange = (delta: number) => {
    setCoworkingDays((prev) => Math.max(1, prev + delta));
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
    const lastDate = multiDateSlots[multiDateSlots.length - 1]?.date || bookingDate;
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split("T")[0];
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
      return COWORKING_SERVICES.filter((s) => (coworkingServices[s.key] || 0) > 0).map(
        (s) => ({
          label: s.label,
          price: s.price,
          qty: coworkingServices[s.key] || 0,
        }),
      );
    }
    return EXCLUSIVE_SERVICES.filter((s) => (exclusiveServices[s.key] || 0) > 0).map(
      (s) => ({
        label: s.label,
        price: s.price,
        qty: exclusiveServices[s.key] || 0,
      }),
    );
  }, [spaceTypeFilter, coworkingServices, exclusiveServices]);

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
      spaceTypeFilter === "coworking"
        ? unitRate * Math.max(coworkingDays, 1) * spaceQty
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
    coworkingDays,
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

    if (!purpose.trim()) {
      err.purpose = "Purpose of booking is required.";
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

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

    const unitPrice = Math.max(0, Number(selectedSpace?.price ?? (isCoworking ? 400 : 800)));
    const servicesTotal = selectedServicesList.reduce(
      (acc, s) => acc + s.price * s.qty,
      0,
    );
    const spaceCharges = isCoworking
      ? unitPrice * Math.max(coworkingDays, 1) * spaceQty
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
    if (isCoworking) {
      const coworkSummary = `Coworking Booking (${coworkingDays} ${coworkingDays === 1 ? "Day" : "Days"}: ${formatDateDisplay(coworkingStartDate)} to ${formatDateDisplay(coworkingEndDate)})`;
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
      spaceId: selectedSpace?._id ? String(selectedSpace._id) : spaceId,
      bookingDate: isCoworking
        ? coworkingStartDate
        : isMultiple
        ? multiDateSlots[0]?.date || bookingDate
        : bookingDate,
      startTime: isCoworking
        ? "09:00"
        : isMultiple
        ? multiDateSlots[0]?.startTime || bookingFrom
        : bookingFrom,
      endTime: isCoworking
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
    };

    try {
      await onSubmit(payload);
    } catch {
      // Parent handles toast
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
        <div className="flex max-h-[94vh] w-full max-w-[1240px] flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
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

          {/* Modal Body - 2 Columns Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/40">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
              {/* Left Column: Form (8 cols) */}
              <div className="lg:col-span-8">
                <form id={formId} onSubmit={handleSubmit} className="space-y-6">
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
                            placeholder="e.g. Rahul Sharma"
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
                          {isPhoneAutoFetched && (
                            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                              <Lock size={10} /> Auto-filled
                            </span>
                          )}
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

                          {isPhoneAutoFetched && (
                            <Lock
                              size={14}
                              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                          )}
                        </div>
                        {errors.phone && (
                          <p className="mt-1 text-xs text-rose-500">{errors.phone}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. Select Space * */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
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
                                setSpaceId(String(space._id));
                                if (spaceId !== String(space._id)) {
                                  setSpaceQty(1);
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
                                      {spaceTypeFilter === "coworking"
                                        ? " / day"
                                        : " / hr"}
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

                  {/* 3. Date & Duration * (Coworking) OR Date & Time * (Exclusive) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                          {spaceTypeFilter === "coworking" ? (
                            <Calendar size={14} />
                          ) : (
                            <Clock size={14} />
                          )}
                        </span>
                        <h3 className="font-bold text-slate-800 text-sm">
                          {spaceTypeFilter === "coworking"
                            ? "Date & Duration"
                            : "Date & Time"}{" "}
                          <span className="text-rose-500">*</span>
                        </h3>
                      </div>

                      {/* Exclusive Mode: Single vs Multiple Toggle */}
                      {spaceTypeFilter === "exclusive" && (
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

                    {/* Mode 1: Coworking View */}
                    {spaceTypeFilter === "coworking" && (
                      <div className="space-y-3">
                        {/* Start Date, Days Stepper, End Date Row */}
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
                                value={coworkingStartDate}
                                onChange={(e) => setCoworkingStartDate(e.target.value)}
                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                              />
                            </div>
                            {errors.coworkingStartDate && (
                              <p className="mt-1 text-xs text-rose-500">
                                {errors.coworkingStartDate}
                              </p>
                            )}
                          </div>

                          {/* No. of Days Stepper */}
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                              No. of Days
                            </label>
                            <div className="flex h-10 items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                              <button
                                type="button"
                                onClick={() => handleCoworkingDaysChange(-1)}
                                disabled={coworkingDays <= 1}
                                className="flex h-full w-10 items-center justify-center border-r border-slate-100 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 transition"
                              >
                                <Minus size={14} />
                              </button>
                              <div className="flex flex-1 items-center justify-center text-xs font-bold text-slate-700">
                                {coworkingDays}{" "}
                                {coworkingDays === 1 ? "Day" : "Days"}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCoworkingDaysChange(1)}
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
                              Auto calculated based on number of days
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mode 2: Exclusive Single Date View */}
                    {spaceTypeFilter === "exclusive" && dateMode === "single" && (
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
                              value={bookingDate}
                              onChange={(e) => setBookingDate(e.target.value)}
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
                          <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Time Slot
                          </label>
                          <div className="relative">
                            <Clock
                              size={15}
                              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <select
                              value={timeSlot}
                              onChange={(e) => handleSingleTimeSlotChange(e.target.value)}
                              className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs font-medium outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            >
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
                              size={15}
                              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mode 3: Exclusive Multiple Dates View */}
                    {spaceTypeFilter === "exclusive" && dateMode === "multiple" && (
                      <div className="space-y-2.5">
                        {/* Column Labels */}
                        <div className="hidden sm:grid sm:grid-cols-[1fr_140px_1fr_40px] gap-2 px-1 text-xs font-semibold text-slate-500">
                          <div>Date</div>
                          <div>Duration (Hours)</div>
                          <div>Time Slot</div>
                          <div></div>
                        </div>

                        {/* Slots Rows */}
                        {multiDateSlots.map((slot) => {
                          const rowSlots = getTimeSlotsForDuration(slot.duration);
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
                                  value={slot.date}
                                  onChange={(e) =>
                                    handleUpdateSlotDate(slot.id, e.target.value)
                                  }
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
                                  onChange={(e) =>
                                    handleUpdateSlotTime(slot.id, e.target.value)
                                  }
                                  className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs font-medium outline-none"
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
                                <ChevronDown
                                  size={15}
                                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                                />
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
                        ? COWORKING_SERVICES
                        : EXCLUSIVE_SERVICES
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

                  {/* 5. Purpose & Notes (COMMON FOR ALL) */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <Tag size={14} />
                      </span>
                      <h3 className="font-bold text-slate-800 text-sm">
                        Purpose & Notes
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                      {/* Purpose of Booking */}
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                          Purpose of Booking <span className="text-rose-500">*</span>
                        </label>
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

                      {/* Additional Notes (Optional) */}
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
              <div className="lg:col-span-4">
                <div className="sticky top-4">
                  {spaceTypeFilter === "coworking" ? (
                    <CoworkingSummaryCard
                      space={selectedSpace || null}
                      spaceQty={spaceQty}
                      startDate={coworkingStartDate}
                      endDate={coworkingEndDate}
                      days={coworkingDays}
                      unitPrice={Number(selectedSpace?.price || 400)}
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
          <div className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-3.5">
            <a
              href="mailto:support@woowoo.in"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition"
            >
              <HelpCircle size={15} />
              <span>
                Need help? <span className="underline">Contact us</span>
              </span>
            </a>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-50 sm:text-sm"
              >
                Cancel
              </button>

              <button
                type="submit"
                form={formId}
                disabled={submitting || spacesLoading || !spaces.length}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                <span>{isEdit ? "Save Changes" : "Proceed to Checkout"}</span>
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

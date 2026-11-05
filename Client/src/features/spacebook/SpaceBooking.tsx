import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
import {
  Eye,
  Pencil,
  Trash2,
  X,
  Plus,
  Search,
  Calendar,
  Clock,
  Phone,
  Building2,
  Layers,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  PhoneCall,
  MailCheck,
  Loader2,
  FileText,
  CreditCard,
  CalendarDays,
  MoreVertical,
  ChevronDown,
  Check,
} from "lucide-react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import CreateBookingDetailsModal, {
  bookingCustomerDraft,
  type BookingFormPayload,
  type MultiDateSlot,
} from "./modal/CreateBookingDetailsModal";
import {
  CoworkingSummaryCard,
  ExclusiveMultipleDatesSummaryCard,
  ExclusiveSingleDateSummaryCard,
  type SelectedServiceItem,
} from "./modal/summary";
import {
  getBookingConflictMessage,
  getBusinessToday,
} from "./utils/bookingAvailability";
import CheckoutModal from "@/features/sales/components/invoice/Modal/CheckoutModal";
import RescheduleBookingModal from "./modal/RescheduleBookingModal";
import {
  handleCreateInvoice,
  handleCreateSpaceBooking,
  handleDeleteSpaceBooking,
  handleGetSpaceBookings,
  handleGetBookingPaymentSettings,
  handleRescheduleSpaceBooking,
  handleUpdateSpaceBooking,
  type BookingPaymentSettings,
  type SpaceBookingPayload,
  type SpaceBookingStatus,
} from "@/services/apiClient";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";
import { useAppSelector } from "@/store/hooks";
import { printThermalReceipt } from "@/utils/printUtils";
import { roundPayable } from "@/features/sales/utils/paymentRoundOff";

type BookingStatusFilter = "All" | SpaceBookingStatus;
type DatePresetType =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "lifetime"
  | "custom";

const DATE_PRESETS: { key: DatePresetType; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "this_week", label: "This Week" },
  { key: "last_week", label: "Last Week" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "this_year", label: "This Year" },
  { key: "lifetime", label: "Lifetime" },
  { key: "custom", label: "Custom Range" },
];

const formatYmd = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const toLocalYmd = (value?: string | Date | null): string => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getRangeForPreset = (preset: DatePresetType): { from: string; to: string } => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (preset === "today") {
    const ymd = formatYmd(now);
    return { from: ymd, to: ymd };
  }
  if (preset === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const ymd = formatYmd(y);
    return { from: ymd, to: ymd };
  }
  if (preset === "this_week") {
    const day = now.getDay() || 7;
    const start = new Date(now);
    start.setDate(now.getDate() - (day - 1));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: formatYmd(start), to: formatYmd(end) };
  }
  if (preset === "last_week") {
    const day = now.getDay() || 7;
    const start = new Date(now);
    start.setDate(now.getDate() - (day - 1) - 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: formatYmd(start), to: formatYmd(end) };
  }
  if (preset === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: formatYmd(start), to: formatYmd(end) };
  }
  if (preset === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: formatYmd(start), to: formatYmd(end) };
  }
  if (preset === "this_year") {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    return { from: formatYmd(start), to: formatYmd(end) };
  }
  return { from: "", to: "" };
};


const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700 border-violet-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-rose-100 text-rose-700 border-rose-200",
];

const getInitials = (name: string) => {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const formatDateDisplay = (value?: string | Date | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const bookingId = (b: SpaceBookingPayload) =>
  String(b.id || b._id || "");

const spaceDisplayName = (b: SpaceBookingPayload) => {
  const name = b.space?.name || b.spaceName || "—";
  const day = b.space?.day ? ` · ${b.space.day}` : "";
  return `${name}${day}`;
};

const apiErrorMessage = (err: unknown, fallback: string) => {
  if (
    err &&
    typeof err === "object" &&
    "response" in err &&
    (err as { response?: { data?: { message?: string } } }).response?.data
      ?.message
  ) {
    return String(
      (err as { response: { data: { message: string } } }).response.data
        .message,
    );
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
};

const toDateInput = (value?: string | Date | null) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

const BookingSummaryRenderer = ({
  booking,
}: {
  booking: SpaceBookingPayload;
}) => {
  const snap = (booking as any)?.summarySnapshot;
  const isCoworking =
    (booking.spaceType || booking.space?.spaceType || "").toLowerCase() ===
      "coworking" ||
    snap?.spaceType === "coworking" ||
    Boolean(snap?.isDurationPlan);
  const isMultiple = (booking.dateMode || snap?.dateMode) === "multiple";

  const resolvedSpace =
    booking.space ||
    (snap
      ? {
          name: snap.spaceName || booking.spaceName || "Space",
          spaceCode: snap.spaceCode || booking.spaceCode || "",
          imageUrl: snap.spaceImageUrl || (booking.space as any)?.imageUrl || null,
          price: snap.unitPrice || booking.unitPrice || 0,
          spaceType: snap.spaceType || booking.spaceType || "",
          category: snap.spaceCategory || booking.spaceCategory || "",
          day: snap.spaceDay || booking.spaceDay || "",
        }
      : {
          name: booking.spaceName || "Space",
          spaceCode: booking.spaceCode || "",
          imageUrl: null,
          price: booking.unitPrice || 0,
          spaceType: booking.spaceType || "",
          category: booking.spaceCategory || "",
          day: booking.spaceDay || "",
        });

  const spaceQty = booking.spaceQty || snap?.spaceQty || 1;
  const selectedServices = (snap?.selectedServices ||
    booking.selectedServices ||
    []) as SelectedServiceItem[];
  const discountAmount = snap?.discountAmount ?? booking.discountAmount ?? 0;
  const cashbackAmount = snap?.cashbackAmount ?? booking.cashbackAmount ?? 0;
  const paymentView = {
    showPayment: true,
    paidAmount: Number(booking.paidAmount) || 0,
    dueAmount: booking.dueAmount,
    storedGrandTotal: Number(booking.grandTotal) || 0,
    storedSubTotal: Number(booking.subTotal) || Number(snap?.subTotal) || 0,
  };

  if (isCoworking) {
    const startDate =
      booking.coworkingStartDate ||
      snap?.coworkingStartDate ||
      toDateInput(booking.bookingDate);
    const endDate =
      booking.coworkingEndDate || snap?.coworkingEndDate || startDate;
    const durationCount = snap?.planDurationCount || booking.durationCount || 1;
    const durationUnit = snap?.durationUnit || booking.durationUnit || "day";
    const durationUnitSingular =
      snap?.durationUnitSingular || "Day";
    const durationUnitPlural =
      snap?.durationUnitPlural || "Days";
    const priceSuffix = snap?.priceSuffix || " / day";
    const packageMultiplier =
      snap?.packageMultiplier || booking.packageMultiplier || 1;
    const unitPrice =
      snap?.unitPrice ?? booking.unitPrice ?? Number(booking.space?.price || 0);

    return (
      <div className="w-full max-w-sm mx-auto text-left">
        <CoworkingSummaryCard
          space={resolvedSpace}
          spaceQty={spaceQty}
          startDate={startDate}
          endDate={endDate}
          days={durationCount}
          durationCount={durationCount}
          durationUnit={durationUnit}
          durationUnitSingular={durationUnitSingular}
          durationUnitPlural={durationUnitPlural}
          priceSuffix={priceSuffix}
          packageMultiplier={packageMultiplier}
          unitPrice={unitPrice}
          selectedServices={selectedServices}
          discountAmount={discountAmount}
          cashbackAmount={cashbackAmount}
          formatDateDisplay={formatDateDisplay}
          {...paymentView}
        />
      </div>
    );
  }

  if (isMultiple) {
    const slots = (snap?.multiDateSlots ||
      booking.multiDateSlots || [
        {
          id: "slot-1",
          date: toDateInput(booking.bookingDate),
          duration: booking.durationHours || 3,
          timeSlot:
            booking.bookingTime ||
            `${booking.startTime} - ${booking.endTime}`,
          startTime: booking.startTime,
          endTime: booking.endTime,
        },
      ]) as MultiDateSlot[];
    const hourlyRate =
      snap?.unitPrice ?? booking.unitPrice ?? Number(booking.space?.price || 800);

    return (
      <div className="w-full max-w-sm mx-auto text-left">
        <ExclusiveMultipleDatesSummaryCard
          space={resolvedSpace}
          spaceQty={spaceQty}
          slots={slots}
          hourlyRate={hourlyRate}
          selectedServices={selectedServices}
          discountAmount={discountAmount}
          cashbackAmount={cashbackAmount}
          formatDateDisplay={formatDateDisplay}
          {...paymentView}
        />
      </div>
    );
  }

  const bookingDate = snap?.bookingDate || toDateInput(booking.bookingDate);
  const timeSlot =
    snap?.timeSlot ||
    booking.bookingTime ||
    `${booking.startTime} - ${booking.endTime}`;
  const duration = snap?.duration || booking.durationHours || 1;
  const hourlyRate =
    snap?.unitPrice ?? booking.unitPrice ?? Number(booking.space?.price || 800);

  return (
    <div className="w-full max-w-sm mx-auto text-left">
      <ExclusiveSingleDateSummaryCard
        space={resolvedSpace}
        spaceQty={spaceQty}
        bookingDate={bookingDate}
        timeSlot={timeSlot}
        duration={duration}
        hourlyRate={hourlyRate}
        selectedServices={selectedServices}
        discountAmount={discountAmount}
        cashbackAmount={cashbackAmount}
        formatDateDisplay={formatDateDisplay}
        {...paymentView}
      />
    </div>
  );
};

const SpaceBook = () => {
  const staff = useAppSelector((state) => state.user);
  const [data, setData] = useState<SpaceBookingPayload[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<BookingStatusFilter>("All");
  const [spaceFilter, setSpaceFilter] = useState<string>("All");
  const [datePreset, setDatePreset] = useState<DatePresetType>("lifetime");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [actionMenuRowId, setActionMenuRowId] = useState<string | null>(null);
  const [isSpaceDropdownOpen, setIsSpaceDropdownOpen] = useState(false);

  const handlePresetSelect = (preset: DatePresetType) => {
    setDatePreset(preset);
    if (preset === "custom") {
      return;
    }
    const range = getRangeForPreset(preset);
    setFromDate(range.from);
    setToDate(range.to);
  };

  const [selectedBooking, setSelectedBooking] =
    useState<SpaceBookingPayload | null>(null);
  const [editingBooking, setEditingBooking] =
    useState<SpaceBookingPayload | null>(null);
  const [deleteBooking, setDeleteBooking] =
    useState<SpaceBookingPayload | null>(null);
  const [bookingAction, setBookingAction] = useState<{
    booking: SpaceBookingPayload;
    view: "reschedule" | "payment" | "history";
  } | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const handleOpen = () => {
      setEditingBooking(null);
      setPendingCheckout(null);
      setIsCreateModalOpen(true);
    };
    window.addEventListener("open-add-space-booking", handleOpen);
    return () => {
      window.removeEventListener("open-add-space-booking", handleOpen);
    };
  }, []);

  // Open modal if navigated from Header with ?create=true
  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setEditingBooking(null);
      setPendingCheckout(bookingCustomerDraft(searchParams));
      setIsCreateModalOpen(true);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("create");
          next.delete("customerId");
          next.delete("customerName");
          next.delete("customerPhone");
          next.delete("customerEmail");
          next.delete("membershipType");
          return next;
        },
        { replace: true }
      );
    }
  }, [searchParams, setSearchParams]);

  const [bookingsLoaded, setBookingsLoaded] = useState(false);

  /** Pending booking details waiting for CheckoutModal payment. */
  const [pendingCheckout, setPendingCheckout] =
    useState<BookingFormPayload | null>(null);
  const [openCheckout, setOpenCheckout] = useState(false);
  const [reschedulePay, setReschedulePay] = useState<{
    bookingId: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    dayType: string;
  } | null>(null);
  const [paymentRule, setPaymentRule] = useState<BookingPaymentSettings | null>(null);

  useEffect(() => {
    if (!openCheckout) return;
    let cancelled = false;
    handleGetBookingPaymentSettings()
      .then((settings) => {
        if (!cancelled) setPaymentRule(settings);
      })
      .catch(() => {
        if (!cancelled) setPaymentRule(null);
      });
    return () => {
      cancelled = true;
    };
  }, [openCheckout]);

  const fetchBookings = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const res = await handleGetSpaceBookings({}, signal);
      setData(Array.isArray(res?.bookings) ? res.bookings : []);
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: string }).code === "ERR_CANCELED"
      ) {
        return;
      }
      setData([]);
      toast.error(apiErrorMessage(err, "Failed to load space bookings."));
    } finally {
      if (!signal?.aborted) setBookingsLoaded(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchBookings(controller.signal);
    return () => controller.abort();
  }, [fetchBookings]);

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId || !bookingsLoaded || loading) return;
    const found = data.find((booking) => bookingId(booking) === editId);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("edit");
        return next;
      },
      { replace: true },
    );
    if (found) {
      setIsCreateModalOpen(false);
      setEditingBooking(found);
      return;
    }
    toast.error("That space booking could not be opened for editing.");
  }, [searchParams, bookingsLoaded, loading, data, setSearchParams]);

  const metrics = useMemo(() => {
    const total = data.length;
    const ongoing = data.filter((b) => b.status === "Ongoing").length;
    const upcoming = data.filter((b) => b.status === "Upcoming").length;
    const draft = data.filter((b) => b.status === "Draft").length;
    const expired = data.filter((b) => b.status === "Expired").length;
    const cancelled = data.filter((b) => b.status === "Cancelled").length;
    return { total, ongoing, upcoming, draft, expired, cancelled };
  }, [data]);

  const uniqueSpaces = useMemo(() => {
    const map = new Map<string, string>();
    data.forEach((b) => {
      const id = String(b.spaceId || "");
      if (!id) return;
      map.set(id, spaceDisplayName(b));
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [data]);

  const selectedSpaceLabel = useMemo(() => {
    if (spaceFilter === "All") return "All Spaces";
    return (
      uniqueSpaces.find((s) => s.id === spaceFilter)?.label || "All Spaces"
    );
  }, [spaceFilter, uniqueSpaces]);

  const filteredData = useMemo(() => {
    return data.filter((b) => {
      if (statusFilter !== "All" && b.status !== statusFilter) return false;
      if (spaceFilter !== "All" && String(b.spaceId) !== spaceFilter)
        return false;

      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchesName = (b.customerName || "")
          .toLowerCase()
          .includes(query);
        const matchesPhone = (b.customerPhone || "").includes(query);
        const matchesEmail = (b.customerEmail || "")
          .toLowerCase()
          .includes(query);
        const matchesSpace = spaceDisplayName(b).toLowerCase().includes(query);
        return (
          matchesName || matchesPhone || matchesEmail || matchesSpace
        );
      }
      return true;
    });
  }, [data, search, statusFilter, spaceFilter]);

  const hasActiveFilters =
    statusFilter !== "All" ||
    spaceFilter !== "All" ||
    Boolean(search.trim());

  const handleResetFilters = () => {
    setStatusFilter("All");
    setSpaceFilter("All");
    setSearch("");
    setIsSpaceDropdownOpen(false);
  };

  const handleCreate = async (payload: BookingFormPayload) => {
    // Open shared POS-style checkout (PIN → summary → payment / coupon).
    setPendingCheckout(payload);
    setIsCreateModalOpen(false);
    setOpenCheckout(true);
  };

  const checkoutGrandTotal = useMemo(() => {
    const raw = Math.max(0, Number(pendingCheckout?.lineTotal ?? 0));
    return roundPayable(raw).payable;
  }, [pendingCheckout]);

  const checkoutItems = useMemo(() => {
    if (!pendingCheckout) return [];
    const hours = Math.max(0, Number(pendingCheckout.durationHours ?? 0));
    const unit = Math.max(0, Number(pendingCheckout.unitPrice ?? 0));
    const spaceQty = Math.max(1, Number(pendingCheckout.spaceQty || 1));

    const services = Array.isArray(pendingCheckout.selectedServices)
      ? pendingCheckout.selectedServices
      : [];
    const servicesTotal = services.reduce(
      (sum: number, s: any) =>
        sum + (Number(s.price) || 0) * (Number(s.qty) || 1),
      0,
    );

    const spaceCharges = Math.max(
      0,
      Number(
        pendingCheckout.summarySnapshot?.spaceCharges ??
          (pendingCheckout.subTotal != null
            ? Number(pendingCheckout.subTotal) - servicesTotal
            : unit * hours * spaceQty),
      ),
    );

    const nameParts = [
      pendingCheckout.spaceName || "Space Booking",
      pendingCheckout.spaceDay ? `(${pendingCheckout.spaceDay})` : "",
      hours > 0 ? `· ${hours}h` : "",
      spaceQty > 1 ? `· ${spaceQty} spaces` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const items: Array<{
      id?: number;
      name: string;
      qty: number;
      price: number;
      discount?: number;
      category?: string;
      lineCategory?: string;
      sourceType?: string;
    }> =
      pendingCheckout.selectedSpaces && pendingCheckout.selectedSpaces.length > 1
        ? pendingCheckout.selectedSpaces.map((space, index) => ({
            id: index + 1,
            name: [space.spaceName || "Space", space.spaceDay ? `(${space.spaceDay})` : ""]
              .filter(Boolean)
              .join(" "),
            qty: 1,
            price: Math.max(0, Number(space.lineTotal) || 0),
            discount: 0,
            category: "space",
            lineCategory: "space",
            sourceType: "space",
          }))
        : [
            {
              id: 1,
              name: nameParts,
              qty: 1,
              price: spaceCharges,
              discount: 0,
              category: "space",
              lineCategory: "space",
              sourceType: "space",
            },
          ];

    services.forEach((s: any, idx: number) => {
      const sQty = Math.max(1, Number(s.qty) || 1);
      const sPrice = Math.max(0, Number(s.price) || 0);
      const sName = s.label || s.name || `Service ${idx + 1}`;
      items.push({
        id: idx + 2,
        name: sName,
        qty: sQty,
        price: sPrice,
        discount: 0,
        category: "service",
        lineCategory: "service",
        sourceType: "service",
      });
    });

    return items;
  }, [pendingCheckout]);

  const handleConfirmCheckoutPayment = async (payment: {
    mode: string;
    paymentStatus: "full" | "partial";
    paymentBreakdown: {
      cash: number;
      upi: number;
      card: number;
      wallet: number;
      paidAmount: number;
      dueAmount: number;
      changeAmount: number;
    };
    paidAmount: number;
    dueAmount: number;
    changeAmount: number;
    finalAmount: number;
    customerName: string;
    customerPhone: string;
    notes: string;
    coupon?: { code: string; discountAmount: number } | null;
    referral?: {
      code: string;
      discountAmount: number;
      inviterName?: string;
      label?: string;
    } | null;
    manualDiscount?: {
      type: "flat" | "percentage";
      value: number;
      discountAmount: number;
    } | null;
    manualDiscountAmount?: number;
    cashbackTotal: number;
    membershipDiscount: number;
    customerId?: string | null;
    invoiceBy?: {
      staffId: string;
      staffName: string;
      employeeId: string;
      email?: string;
    } | null;
    verifiedAt?: string | null;
  }) => {
    if (reschedulePay) {
      setSaving(true);
      try {
        const rawMode = String(payment.mode || "").toUpperCase();
        const mode = rawMode.includes("CASH")
          ? "Cash"
          : rawMode.includes("WALLET")
            ? "Wallet"
            : rawMode.includes("CARD")
              ? "Card"
              : "UPI";
        await handleRescheduleSpaceBooking(reschedulePay.bookingId, {
          bookingDate: reschedulePay.bookingDate,
          startTime: reschedulePay.startTime,
          endTime: reschedulePay.endTime,
          dayType: reschedulePay.dayType,
          payment: {
            mode,
            amount: Number(payment.paidAmount || payment.finalAmount || 0),
          },
        });
        toast.success("Reschedule payment received.");
        setOpenCheckout(false);
        setPendingCheckout(null);
        setReschedulePay(null);
        await fetchBookings();
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err?.response?.data?.message || "Could not collect the reschedule payment.");
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!pendingCheckout) {
      toast.error("Booking details were lost. Please try again.");
      return;
    }

    const today = getBusinessToday();
    const manualDiscountDesc = payment.manualDiscount && payment.manualDiscount.discountAmount > 0
      ? payment.manualDiscount.type === "percentage"
        ? `Manual Discount (${payment.manualDiscount.value}%): -₹${payment.manualDiscount.discountAmount}`
        : `Manual Discount (Flat): -₹${payment.manualDiscount.discountAmount}`
      : "";

    const bookingNotes = [
      pendingCheckout.notes,
      `Space booking · ${pendingCheckout.spaceName || "Space"}`,
      `${formatDateDisplay(pendingCheckout.bookingDate)} · ${pendingCheckout.startTime}-${pendingCheckout.endTime}`,
      manualDiscountDesc,
      payment.notes,
    ]
      .map((v) => String(v || "").trim())
      .filter(Boolean)
      .join(" | ");

    const lineTotal = Math.max(0, Number(pendingCheckout.lineTotal ?? 0));
    const couponDiscount = Number(payment.coupon?.discountAmount ?? 0);
    const referralDiscount = Number(payment.referral?.discountAmount ?? 0);
    const membershipDiscount = Number(payment.membershipDiscount ?? 0);
    const manualDiscount = Number(payment.manualDiscount?.discountAmount ?? payment.manualDiscountAmount ?? 0);
    const totalDiscount = couponDiscount + referralDiscount + membershipDiscount + manualDiscount;

    const existingDraftId = (pendingCheckout as any)?._originalBookingId as
      | string
      | undefined;
    const bookingData: SpaceBookingPayload = {
      customerName: payment.customerName?.trim() || pendingCheckout.customerName,
      customerPhone: payment.customerPhone?.trim() || pendingCheckout.customerPhone,
      customerEmail: pendingCheckout.customerEmail,
      spaceId: pendingCheckout.spaceId,
      bookingDate: pendingCheckout.bookingDate,
      startTime: pendingCheckout.startTime,
      endTime: pendingCheckout.endTime,
      status: (pendingCheckout.status === "Draft" ? "Upcoming" : pendingCheckout.status) as SpaceBookingStatus,
      notes: pendingCheckout.notes,
      spaceQty: pendingCheckout.spaceQty,
      dateMode: pendingCheckout.dateMode,
      multiDateSlots: pendingCheckout.multiDateSlots,
      durationCount: pendingCheckout.durationCount,
      durationUnit: pendingCheckout.durationUnit,
      packageMultiplier: pendingCheckout.packageMultiplier,
      coworkingStartDate: pendingCheckout.coworkingStartDate,
      coworkingEndDate: pendingCheckout.coworkingEndDate,
      subTotal:
        pendingCheckout.subTotal != null
          ? Number(pendingCheckout.subTotal)
          : checkoutItems.reduce((acc, it) => acc + it.price * it.qty, 0),
      discountAmount: totalDiscount,
      cashbackAmount: payment.cashbackTotal,
      selectedServices: pendingCheckout.selectedServices,
      summarySnapshot: pendingCheckout.summarySnapshot,
    };

    let reservedBookingId = existingDraftId || "";
    const reservedBookingIds: string[] = [];
    const releaseReservation = async () => {
      if (existingDraftId) {
        await handleUpdateSpaceBooking(existingDraftId, { status: "Draft" }).catch(
          () => undefined,
        );
        return;
      }
      const ids = reservedBookingIds.length
        ? reservedBookingIds
        : reservedBookingId
          ? [reservedBookingId]
          : [];
      await Promise.all(
        ids.map((id) => handleDeleteSpaceBooking(id).catch(() => undefined)),
      );
    };

    try {
      setSaving(true);

      // The booking is saved before the invoice so the server can reject a
      // taken slot before any payment is recorded.
      if (existingDraftId) {
        await handleUpdateSpaceBooking(existingDraftId, bookingData);
      } else if ((pendingCheckout.selectedSpaces?.length || 0) > 1) {
        for (const space of pendingCheckout.selectedSpaces || []) {
          const created = await handleCreateSpaceBooking({
            ...bookingData,
            spaceId: space.spaceId,
            subTotal: space.lineTotal,
            notes: [pendingCheckout.notes, space.spaceName].filter(Boolean).join(" | "),
          });
          const createdId = created?.booking ? bookingId(created.booking) : "";
          if (createdId) reservedBookingIds.push(createdId);
        }
        reservedBookingId = reservedBookingIds[0] || "";
      } else {
        const created = await handleCreateSpaceBooking(bookingData);
        reservedBookingId = created?.booking ? bookingId(created.booking) : "";
      }

      const invoiceRes = await handleCreateInvoice({
        customerName:
          payment.customerName?.trim() ||
          pendingCheckout.customerName ||
          "Walk-in Customer",
        customerPhone:
          payment.customerPhone?.trim() || pendingCheckout.customerPhone || "",
        customerId: payment.customerId || pendingCheckout.customerId || undefined,
        invoiceDate: today,
        dueDate: today,
        salesPersonName:
          payment.invoiceBy?.staffName?.trim() ||
          staff.m_staff_name ||
          "Space Booking",
        invoiceBy: payment.invoiceBy
          ? {
              staffId: payment.invoiceBy.staffId,
              staffName: payment.invoiceBy.staffName,
              employeeId: payment.invoiceBy.employeeId,
              email: payment.invoiceBy.email,
            }
          : null,
        verifiedAt: payment.verifiedAt || null,
        notes: bookingNotes || "Space Booking",
        items: checkoutItems.map((item) => ({
          productName: item.name,
          qty: item.qty,
          unitPrice: item.price,
          discount: 0,
          category: item.category || "space",
        })),
        subTotal:
          pendingCheckout.subTotal != null
            ? Number(pendingCheckout.subTotal)
            : checkoutItems.reduce((acc, it) => acc + it.price * it.qty, 0),
        discountTotal: totalDiscount,
        grandTotal: payment.finalAmount,
        coupon: payment.coupon ?? null,
        referral: payment.referral ?? null,
        manualDiscount: payment.manualDiscount ?? null,
        status: "final",
        mode: payment.mode,
        paymentStatus: payment.paymentStatus,
        paymentBreakdown: payment.paymentBreakdown,
        pendingAmount: payment.paymentBreakdown.dueAmount,
        cashbackTotal: payment.cashbackTotal,
        membershipDiscount: payment.membershipDiscount,
        membershipType: pendingCheckout.membershipType || undefined,
        activityType: "Space Booking",
        createdBy: {
          m_staff_id: staff.m_staff_id,
          m_staff_name: staff.m_staff_name,
          m_staff_email: staff.m_staff_email,
        },
      } as Parameters<typeof handleCreateInvoice>[0]).catch(async (invoiceErr: unknown) => {
        await releaseReservation();
        throw invoiceErr;
      });

      const invoice = invoiceRes?.invoice;
      const invoiceCode =
        invoice?.invoiceCode ||
        invoice?.invoiceNumber ||
        String(invoice?._id || "");
      const invoiceId = invoice?._id ? String(invoice._id) : null;

      if (reservedBookingId) {
        try {
          await handleUpdateSpaceBooking(reservedBookingId, {
            invoiceId,
            invoiceCode,
            grandTotal: payment.finalAmount,
            paidAmount: payment.paymentBreakdown.paidAmount,
            dueAmount: payment.paymentBreakdown.dueAmount,
            paymentStatus: payment.paymentStatus,
            paymentMode: payment.mode,
          });
        } catch {
          toast.warning(
            `Booking confirmed, but linking invoice ${invoiceCode} to it failed. Please update the booking manually.`,
          );
        }
      }

      const printableSubtotal =
        pendingCheckout.subTotal != null
          ? Number(pendingCheckout.subTotal)
          : checkoutItems.reduce((acc, it) => acc + it.price * it.qty, 0);

      printThermalReceipt({
        invoiceNo: invoiceCode || "SPACE",
        customerName:
          payment.customerName?.trim() || pendingCheckout.customerName,
        customerPhone:
          payment.customerPhone?.trim() || pendingCheckout.customerPhone,
        items: checkoutItems.map((item) => ({
          name: item.name,
          qty: item.qty,
          price: item.price,
          discount: 0,
        })),
        totalMRP: printableSubtotal,
        discountTotal: totalDiscount,
        finalAmount: payment.finalAmount,
        totalDue: payment.paymentBreakdown.dueAmount,
        totalQty: checkoutItems.reduce(
          (sum, item) => sum + (Number(item.qty) || 0),
          0,
        ),
      });

      setOpenCheckout(false);
      setPendingCheckout(null);
      await fetchBookings();
      await Swal.fire(
        "Success",
        `Space booking confirmed${invoiceCode ? ` · Invoice ${invoiceCode}` : ""}.`,
        "success",
      );
    } catch (err: unknown) {
      // CheckoutModal shows the error dialog using response.data.message.
      if (getBookingConflictMessage(err)) void fetchBookings();
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (payload: BookingFormPayload) => {
    if (!editingBooking) return;
    const id = bookingId(editingBooking);
    if (!id) {
      toast.error("Invalid booking id.");
      return;
    }
    // If editing a draft and user proceeds to checkout
    if (editingBooking.status === "Draft") {
      setPendingCheckout({ ...payload, _originalBookingId: id } as any);
      setEditingBooking(null);
      setOpenCheckout(true);
      return;
    }
    try {
      setSaving(true);
      await handleUpdateSpaceBooking(id, payload);
      toast.success(`Booking of ${payload.customerName} updated successfully!`);
      setEditingBooking(null);
      setSelectedBooking(null);
      await fetchBookings();
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, "Failed to update space booking."));
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async (payload: BookingFormPayload) => {
    try {
      setSaving(true);
      const isEditingExisting = editingBooking && bookingId(editingBooking);
      const existingId = isEditingExisting ? bookingId(editingBooking) : null;

      let invoiceId: string | null = null;
      let invoiceCode = "";

      const today = getBusinessToday();
      const lineTotal = Math.max(0, Number(payload.lineTotal ?? 0));
      const hours = Math.max(0, Number(payload.durationHours ?? 0));
      const nameParts = [
        payload.spaceName || "Space Booking",
        payload.spaceDay ? `(${payload.spaceDay})` : "",
        hours > 0 ? `· ${hours}h` : "",
      ]
        .filter(Boolean)
        .join(" ");

      try {
        const invoiceRes = await handleCreateInvoice({
          customerName: payload.customerName || "Walk-in Customer",
          customerPhone: payload.customerPhone || "",
          customerId: payload.customerId || undefined,
          invoiceDate: today,
          dueDate: today,
          salesPersonName: staff.m_staff_name || "Space Booking",
          notes: payload.notes || "Space Booking Draft",
          items: [
            {
              productName: nameParts,
              qty: 1,
              unitPrice: lineTotal,
              discount: payload.discountAmount || 0,
              category: "space",
            },
          ],
          subTotal: payload.subTotal || lineTotal,
          discountTotal: payload.discountAmount || 0,
          grandTotal: lineTotal,
          status: "draft",
          mode: "Draft",
          paymentStatus: "due",
          paymentBreakdown: {
            cash: 0,
            upi: 0,
            card: 0,
            wallet: 0,
            paidAmount: 0,
            dueAmount: lineTotal,
            changeAmount: 0,
          },
          pendingAmount: lineTotal,
          activityType: "Space Booking",
          createdBy: {
            m_staff_id: staff.m_staff_id,
            m_staff_name: staff.m_staff_name,
            m_staff_email: staff.m_staff_email,
          },
        } as Parameters<typeof handleCreateInvoice>[0]);

        const inv = invoiceRes?.invoice;
        invoiceId = inv?._id ? String(inv._id) : null;
        invoiceCode =
          inv?.invoiceCode ||
          inv?.invoiceNumber ||
          (invoiceId ? `DRAFT-${invoiceId.slice(-6)}` : "");
      } catch (invErr) {
        console.warn(
          "Could not create linked draft invoice; continuing with space booking draft.",
          invErr,
        );
        invoiceCode = `DRAFT-${Date.now().toString().slice(-6)}`;
      }

      const bookingData: SpaceBookingPayload = {
        ...payload,
        status: "Draft",
        invoiceId,
        invoiceCode,
        grandTotal: lineTotal,
        paidAmount: 0,
        dueAmount: lineTotal,
        paymentStatus: "" as const,
        paymentMode: "Draft",
      };

      if (isEditingExisting && existingId) {
        await handleUpdateSpaceBooking(existingId, bookingData);
        toast.success(`Booking draft for ${payload.customerName} updated!`);
      } else {
        await handleCreateSpaceBooking(bookingData);
        toast.success(`Booking draft for ${payload.customerName} saved!`);
      }

      setIsCreateModalOpen(false);
      setEditingBooking(null);
      setPendingCheckout(null);
      await fetchBookings();

      await Swal.fire(
        "Draft Saved",
        `Space booking has been saved as draft${
          invoiceCode ? ` (${invoiceCode})` : ""
        }. You can review or complete it from the Draft tab anytime.`,
        "success",
      );
    } catch (err: unknown) {
      Swal.fire(
        "Save Draft Failed",
        apiErrorMessage(err, "Could not save space booking draft."),
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteBooking) return;
    const id = bookingId(deleteBooking);
    if (!id) {
      toast.error("Invalid booking id.");
      return;
    }
    try {
      setDeleting(true);
      await handleDeleteSpaceBooking(id);
      toast.success(
        `Booking of ${deleteBooking.customerName} deleted successfully!`,
      );
      setDeleteBooking(null);
      if (selectedBooking && bookingId(selectedBooking) === id) {
        setSelectedBooking(null);
      }
      await fetchBookings();
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, "Failed to delete space booking."));
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo<MRT_ColumnDef<SpaceBookingPayload>[]>(
    () => [
      // {
      //   accessorKey: "id",
      //   header: "Booking ID",
      //   size: 110,
      //   Cell: ({ row }) => {
      //     const id = bookingId(row.original);
      //     // return (
      //     //   // <span className="inline-flex items-center justify-center rounded-md border border-slate-200/80 bg-slate-100/90 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600 shadow-2xs">
      //     //   //   #{id.slice(-6).toUpperCase() || "—"}
      //     //   // </span>
      //     // );
      //   },
      // },
      {
        id: "space",
        header: "Space",
        size: 100,
        Cell: ({ row }) => {
          const b = row.original;
          return (
            <div className="flex items-center gap-2.5">
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-slate-800 sm:text-sm">
                  {b.space?.name || b.spaceName || "—"}
                </div>
                {(b.space?.day || b.space?.category) && (
                  <div className="mt-0.5 text-[11px] font-medium text-slate-400">
                    {[b.space?.day, b.space?.category]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "customerName",
        header: "Customer",
        size: 100,
        Cell: ({ row }) => {
          const b = row.original;
          return (
            <div className="flex items-center gap-3 py-1">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-slate-800">
                  {b.customerName}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                  <Phone size={12} className="shrink-0 text-slate-400" />
                  <span className="font-mono">{b.customerPhone}</span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "bookingDate",
        header: "Date",
        size: 100,
        Cell: ({ row }) => (
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs">
           
            <span>{formatDateDisplay(row.original.bookingDate)}</span>
          </div>
        ),
      },
      {
        id: "time",
        header: "Time",
        size: 100,
        Cell: ({ row }) => (
          <div className="flex items-center gap-1.5 pl-0.5 text-xs font-medium text-slate-500">
            <Clock size={12} className="shrink-0 text-slate-400" />
            <span className="font-mono tabular-nums">
              {row.original.bookingTime ||
                `${row.original.startTime} - ${row.original.endTime}`}
            </span>
          </div>
        ),
      },
      {
        id: "amount",
        header: "Amount",
        size: 110,
        Cell: ({ row }) => {
          const b = row.original;
          const amount = Number(b.grandTotal ?? b.paidAmount ?? 0);
          const isDraft = b.status === "Draft";
          return (
            <div className="flex flex-col">
              <span className="font-semibold text-slate-800 tabular-nums">
                ₹{amount.toLocaleString("en-IN")}
              </span>
              {isDraft ? (
                <span className="inline-flex items-center text-[10px] font-semibold text-amber-600">
                  Draft Bill
                </span>
              ) : b.paymentStatus ? (
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider ${
                    (Number(b.dueAmount || 0) < 1 ? "full" : b.paymentStatus) === "full"
                      ? "text-emerald-600"
                      : b.paymentStatus === "partial"
                        ? "text-blue-600"
                        : "text-amber-600"
                  }`}
                >
                  {Number(b.dueAmount || 0) < 1 ? "full" : b.paymentStatus}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 100,
        Cell: ({ cell }) => {
          const status = cell.getValue<SpaceBookingStatus>();
          if (status === "Ongoing") {
            return (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-2xs">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 ring-2 ring-emerald-300/50" />
                Ongoing
              </span>
            );
          }
          if (status === "Upcoming") {
            return (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-300/80 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-blue-500 ring-2 ring-blue-300/50" />
                Upcoming
              </span>
            );
          }
          if (status === "Draft") {
            return (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-amber-500 ring-2 ring-amber-300/50" />
                Draft
              </span>
            );
          }
          if (status === "Cancelled") {
            return (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                Cancelled
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              Expired
            </span>
          );
        },
      },
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: filteredData,
    state: { isLoading: loading },
    enableColumnResizing: false,
    enableGlobalFilter: false,
    enableTopToolbar: false,
    enableBottomToolbar: true,
    enableColumnActions: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enableHiding: false,
    enableSorting: true,
    enableRowActions: true,
    positionActionsColumn: "last",
    displayColumnDefOptions: {
      "mrt-row-actions": {
        header: "Actions",
        size: 160,
        minSize: 140,
        muiTableHeadCellProps: { align: "center" },
        muiTableBodyCellProps: { align: "center" },
      },
    },
    renderRowActions: ({ row }) => (
      <div className="flex min-w-max items-center justify-center gap-1.5">
        {row.original.status === "Draft" && (
          <Can permission={PERMISSIONS.SPACE_BOOKING_UPDATE}>
            <button
              type="button"
              className="flex h-8 items-center gap-1 px-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 shadow-2xs transition-all hover:bg-amber-100 hover:text-amber-800 active:scale-95 text-xs font-semibold"
              title="Pay / Checkout Draft"
              onClick={() => setEditingBooking(row.original)}
            >
              <CreditCard size={13} />
              <span>Pay</span>
            </button>
          </Can>
        )}

        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-2xs transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95"
          title="View Details"
          onClick={() => setSelectedBooking(row.original)}
        >
          <Eye size={15} />
        </button>

        <Can permission={PERMISSIONS.SPACE_BOOKING_UPDATE}>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-2xs transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 active:scale-95"
            title="Edit Booking"
            onClick={() => setEditingBooking(row.original)}
          >
            <Pencil size={15} />
          </button>
          {row.original.status !== "Cancelled" && row.original.status !== "Draft" ? (
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-2xs transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95"
              title="Reschedule"
              onClick={() =>
                setBookingAction({ booking: row.original, view: "reschedule" })
              }
            >
              <Calendar size={15} />
            </button>
          ) : null}
        </Can>

        <Can permission={PERMISSIONS.SPACE_BOOKING_DELETE}>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-400 shadow-2xs transition-all hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 active:scale-95"
            title="Delete Booking"
            onClick={() => setDeleteBooking(row.original)}
          >
            <Trash2 size={15} />
          </button>
        </Can>
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
        {loading ? (
          <>
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm text-slate-500">Loading bookings…</p>
          </>
        ) : (
          <>
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-500 shadow-xs">
              <Calendar size={32} />
            </div>
            <h4 className="text-base font-bold text-slate-800">
              No bookings found
            </h4>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {hasActiveFilters
                ? "No bookings match your current search or filter criteria."
                : "No space bookings yet. Click Add Booking to create one."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
              >
                <RotateCcw size={13} />
                Reset all filters
              </button>
            )}
          </>
        )}
      </div>
    ),
    muiTableContainerProps: {
      sx: {
        maxHeight: "calc(100vh - 360px)",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      },
    },
    muiTablePaperProps: {
      elevation: 0,
      sx: {
        border: "none",
        borderRadius: "0",
        boxShadow: "none",
        backgroundColor: "transparent",
      },
    },
    muiTableHeadCellProps: {
      sx: {
        fontWeight: 700,
        fontSize: "11px",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "#475569",
        backgroundColor: "#f8fafc",
        borderBottom: "1px solid #e2e8f0",
        padding: "14px 18px",
        whiteSpace: "nowrap",
      },
    },
    muiTableBodyCellProps: {
      sx: {
        fontSize: "13px",
        color: "#1e293b",
        borderBottom: "1px solid #f1f5f9",
        padding: "13px 18px",
        verticalAlign: "middle",
        whiteSpace: "nowrap",
      },
    },
    muiTableBodyRowProps: {
      sx: {
        transition: "background-color 0.15s ease",
        "&:hover": { backgroundColor: "#f8fafc" },
      },
    },
    muiBottomToolbarProps: {
      sx: {
        backgroundColor: "#ffffff",
        borderTop: "1px solid #e2e8f0",
        minHeight: "56px",
        display: "flex",
        alignItems: "center",
      },
    },
    muiPaginationProps: {
      color: "primary",
      shape: "rounded",
      variant: "outlined",
      size: "small",
      showRowsPerPage: true,
      rowsPerPageOptions: [5, 10, 20, 50],
    },
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
      density: "comfortable",
    },
  });

  return (
    <div className="w-full space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <h1 className="text-base font-bold tracking-tight text-slate-900 sm:text-2xl truncate shrink-0">
          Space Bookings
        </h1>

        {/* Date Filter Dropdown (without icon) */}
        <select
          value={datePreset}
          onChange={(e) => handlePresetSelect(e.target.value as DatePresetType)}
          className="h-6 w-24 rounded-lg border border-slate-200 bg-white px-1  text-[10px]  font-semibold text-slate-700 shadow-2xs outline-none focus:border-indigo-500 shrink-0"
        >
          {DATE_PRESETS.map((preset) => (
            <option key={preset.key} value={preset.key}>
              {preset.label}
            </option>
          ))}
        </select>

        {/* + Add Space Button */}
        <Can permission={PERMISSIONS.SPACE_BOOKING_CREATE}>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-white shadow-md shadow-indigo-100 transition hover:from-indigo-700 hover:to-violet-700 active:scale-[0.98] shrink-0"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Add </span>
          </button>
        </Can>
      </div>

      {/* Custom Date Pickers when Custom Range is active */}
      {datePreset === "custom" && (
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 block mb-1">From Date</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 text-xs text-slate-700 outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-500 block mb-1">To Date</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 text-xs text-slate-700 outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter("All")}
          className={`flex items-start justify-between rounded-2xl border p-4 text-left transition ${
            statusFilter === "All"
              ? "border-indigo-400 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500/20"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div>
            <span className="text-xs font-medium text-slate-500">
              Total Reservations
            </span>
            <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
              {metrics.total}
            </div>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Building2 size={20} />
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("Ongoing")}
          className={`flex items-start justify-between rounded-2xl border p-4 text-left transition ${
            statusFilter === "Ongoing"
              ? "border-emerald-400 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/20"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div>
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Ongoing Now
            </span>
            <div className="mt-1 text-2xl font-bold tabular-nums text-emerald-700">
              {metrics.ongoing}
            </div>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Clock size={20} />
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("Upcoming")}
          className={`flex items-start justify-between rounded-2xl border p-4 text-left transition ${
            statusFilter === "Upcoming"
              ? "border-blue-400 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div>
            <span className="text-xs font-medium text-slate-500">Upcoming</span>
            <div className="mt-1 text-2xl font-bold tabular-nums text-blue-700">
              {metrics.upcoming}
            </div>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Calendar size={20} />
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("Draft")}
          className={`flex items-start justify-between rounded-2xl border p-4 text-left transition ${
            statusFilter === "Draft"
              ? "border-amber-400 bg-amber-50/50 shadow-sm ring-2 ring-amber-500/20"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div>
            <span className="text-xs font-medium text-slate-500">Drafts</span>
            <div className="mt-1 text-2xl font-bold tabular-nums text-amber-700">
              {metrics.draft}
            </div>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <FileText size={20} />
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("Expired")}
          className={`flex items-start justify-between rounded-2xl border p-4 text-left transition ${
            statusFilter === "Expired"
              ? "border-slate-400 bg-slate-100/60 shadow-sm ring-2 ring-slate-400/20"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div>
            <span className="text-xs font-medium text-slate-500">
              Completed / Expired
            </span>
            <div className="mt-1 text-2xl font-bold tabular-nums text-slate-700">
              {metrics.expired}
            </div>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <CheckCircle2 size={20} />
          </span>
        </button>
      </div>

      <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-3 sm:p-3.5 shadow-xs">
        {/* Row 1: Search bar and all spaces categories in one row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer or space…"
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-8 text-xs outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsSpaceDropdownOpen((prev) => !prev)}
              className="flex h-9 items-center justify-between gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 px-2.5 text-xs font-medium text-slate-700 outline-none transition hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 max-w-[130px] sm:max-w-[180px] cursor-pointer"
            >
              <span className="truncate">{selectedSpaceLabel}</span>
              <ChevronDown
                size={14}
                className={`shrink-0 text-slate-400 transition-transform ${
                  isSpaceDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isSpaceDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsSpaceDropdownOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 z-50 w-60 max-w-[calc(100vw-2.5rem)] rounded-xl border border-slate-100 bg-white py-1 shadow-xl max-h-64 overflow-y-auto text-left">
                  <button
                    type="button"
                    onClick={() => {
                      setSpaceFilter("All");
                      setIsSpaceDropdownOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-xs transition cursor-pointer ${
                      spaceFilter === "All"
                        ? "bg-indigo-50 font-semibold text-indigo-600"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>All Spaces</span>
                    {spaceFilter === "All" && (
                      <Check size={14} className="text-indigo-600 shrink-0" />
                    )}
                  </button>

                  {uniqueSpaces.map((s) => {
                    const isSelected = spaceFilter === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSpaceFilter(s.id);
                          setIsSpaceDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-xs transition cursor-pointer ${
                          isSelected
                            ? "bg-indigo-50 font-semibold text-indigo-600"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className="truncate pr-2">{s.label}</span>
                        {isSelected && (
                          <Check size={14} className="text-indigo-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset all filters"
              className="flex h-9 shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>

        {/* Row 2: Status segments / categories below */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-1 border-t border-slate-100 scrollbar-none">
          {(
            ["All", "Ongoing", "Upcoming", "Draft", "Expired", "Cancelled"] as const
          ).map((tab) => {
            const isSelected = statusFilter === tab;
            const count =
              tab === "All"
                ? metrics.total
                : tab === "Ongoing"
                  ? metrics.ongoing
                  : tab === "Upcoming"
                    ? metrics.upcoming
                    : tab === "Draft"
                      ? metrics.draft
                      : tab === "Expired"
                        ? metrics.expired
                        : metrics.cancelled;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`rounded-full px-1.5 text-[10px] ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">
              Showing {filteredData.length} of {data.length} reservations
            </span>
            {hasActiveFilters && (
              <span className="inline-flex items-center rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                Filtered Results
              </span>
            )}
          </div>
        </div>
        <MaterialReactTable table={table} />
      </div>

      {/* Mobile Card View (2-2 cards in one row) */}
      <div className="block md:hidden space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span className="font-semibold text-slate-700">
            Showing {filteredData.length} of {data.length} reservations
          </span>
          {hasActiveFilters && (
            <span className="inline-flex items-center rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
              Filtered
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <Loader2 className="mb-2 h-6 w-6 animate-spin text-indigo-500" />
            <p className="text-xs text-slate-500">Loading bookings…</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-500">
              <Calendar size={22} />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No bookings found</h4>
            <p className="mt-1 text-xs text-slate-500">
              {hasActiveFilters
                ? "No space bookings match your filters."
                : "No space bookings yet. Click Add Space to create one."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {filteredData.map((b) => {
              const id = bookingId(b);
              const isMenuOpen = actionMenuRowId === id;
              const rawB = b as SpaceBookingPayload & {
                imageUrl?: string;
                spaceImageUrl?: string;
                image?: string;
              };
              const img =
                b.space?.imageUrl ||
                rawB.imageUrl ||
                rawB.spaceImageUrl ||
                (b.space as { image?: string } | undefined)?.image;
              const isDraft = b.status === "Draft";
              const amount = Number(b.grandTotal ?? b.paidAmount ?? 0);

              return (
                <article
                  key={id}
                  className={`group relative flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white shadow-2xs transition hover:border-slate-300 hover:shadow-xs ${
                    isMenuOpen ? "z-30 ring-1 ring-indigo-200" : "z-0"
                  }`}
                >
                  {/* Image Area */}
                  <div className="relative aspect-4/3 w-full overflow-hidden rounded-t-xl bg-gradient-to-br from-indigo-50/80 via-slate-50 to-blue-50/60 border-b border-slate-100">
                    {img ? (
                      <img
                        src={img}
                        alt={spaceDisplayName(b)}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100/80 text-indigo-600 shadow-2xs">
                          <Building2 size={16} />
                        </div>
                        <span className="mt-1 line-clamp-1 text-[10px] font-semibold text-slate-700 px-1">
                          {spaceDisplayName(b)}
                        </span>
                      </div>
                    )}

                    {/* Top-Left: Booking Code */}
                    <div className="absolute top-1.5 left-1.5 z-10">
                      <span className="inline-flex items-center rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-2xs backdrop-blur-xs">
                        #{id.slice(-6).toUpperCase()}
                      </span>
                    </div>

                    {/* Top-Right: Status Badge */}
                    <div className="absolute top-1.5 right-1.5 z-10">
                      <span
                        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[8px] font-bold shadow-2xs backdrop-blur-xs ${
                          b.status === "Ongoing"
                            ? "bg-emerald-600/90 text-white"
                            : b.status === "Upcoming"
                              ? "bg-blue-600/90 text-white"
                              : b.status === "Draft"
                                ? "bg-amber-600/90 text-white"
                                : b.status === "Cancelled"
                                  ? "bg-rose-600/90 text-white"
                                  : "bg-slate-700/90 text-white"
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="flex flex-1 flex-col justify-between p-2 space-y-1.5">
                    <div className="space-y-1">
                      <h4
                        className="truncate text-xs font-bold text-slate-900 leading-snug"
                        title={b.customerName || "Walk-in Guest"}
                      >
                        {b.customerName || "Walk-in Guest"}
                      </h4>

                      <p
                        className="truncate text-[10px] font-medium text-slate-500"
                        title={spaceDisplayName(b)}
                      >
                        {spaceDisplayName(b)}
                      </p>

                      <div className="space-y-0.5 text-[10px] text-slate-500">
                        <div className="flex items-center gap-1 truncate">
                          <Calendar size={10} className="shrink-0 text-slate-400" />
                          <span className="truncate">{formatDateDisplay(b.bookingDate)}</span>
                        </div>
                        <div className="flex items-center gap-1 truncate">
                          <Clock size={10} className="shrink-0 text-slate-400" />
                          <span className="truncate">
                            {b.bookingTime || `${b.startTime || ""} - ${b.endTime || ""}`}
                          </span>
                        </div>
                      </div>

                      {/* Payment Status Badge */}
                      <div className="pt-0.5">
                        {isDraft ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                            Draft Bill
                          </span>
                        ) : b.paymentStatus ? (
                          <span
                            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                              b.paymentStatus === "full"
                                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                                : b.paymentStatus === "partial"
                                  ? "bg-blue-50 border border-blue-200 text-blue-700"
                                  : "bg-amber-50 border border-amber-200 text-amber-700"
                            }`}
                          >
                            {b.paymentStatus}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Card Footer: Amount on Left, 3 Dots Action Menu on Right Bottom Corner */}
                    <div className="flex items-end justify-between border-t border-slate-100 pt-1.5">
                      <div className="min-w-0 pr-1">
                        <span className="block text-[8px] uppercase font-semibold text-slate-400">Total</span>
                        <span className="block truncate text-xs font-bold text-slate-900 leading-tight">
                          ₹{amount.toLocaleString("en-IN")}
                        </span>
                      </div>

                      {/* 3 Dots at Right Bottom Corner */}
                      <div
                        className="relative shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setActionMenuRowId(isMenuOpen ? null : id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition active:scale-95 cursor-pointer"
                          aria-label="Actions"
                        >
                          <MoreVertical size={14} />
                        </button>

                        {isMenuOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-30"
                              onClick={() => setActionMenuRowId(null)}
                            />
                            <div className="absolute right-0 bottom-full z-40 mb-1.5 w-32 rounded-xl border border-slate-100 bg-white py-1 text-left shadow-xl animate-in fade-in zoom-in-95 duration-100">
                              <button
                                type="button"
                                onClick={() => {
                                  setActionMenuRowId(null);
                                  setSelectedBooking(b);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                <Eye size={13} className="text-slate-400" />
                                <span>View</span>
                              </button>

                              <Can permission={PERMISSIONS.SPACE_BOOKING_UPDATE}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuRowId(null);
                                    setEditingBooking(b);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 cursor-pointer"
                                >
                                  <Pencil size={13} className="text-blue-500" />
                                  <span>Edit</span>
                                </button>
                              </Can>

                              {isDraft && (
                                <Can permission={PERMISSIONS.SPACE_BOOKING_UPDATE}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActionMenuRowId(null);
                                      setEditingBooking(b);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 cursor-pointer"
                                  >
                                    <CreditCard size={13} className="text-amber-500" />
                                    <span>Pay</span>
                                  </button>
                                </Can>
                              )}

                              <Can permission={PERMISSIONS.SPACE_BOOKING_DELETE}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuRowId(null);
                                    setDeleteBooking(b);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer border-t border-slate-100"
                                >
                                  <Trash2 size={13} className="text-rose-500" />
                                  <span>Delete</span>
                                </button>
                              </Can>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {selectedBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedBooking(null);
          }}
        >
          <div className="w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Booking Details
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>
                      #{bookingId(selectedBooking).slice(-6).toUpperCase()}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-slate-600">
                      {selectedBooking.status}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto p-6 text-sm">
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl border text-sm font-bold ${getAvatarColor(
                      selectedBooking.customerName || "?",
                    )}`}
                  >
                    {getInitials(selectedBooking.customerName || "?")}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      {selectedBooking.customerName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {selectedBooking.customerEmail || "No email"}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-slate-600">
                      {selectedBooking.customerPhone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={`tel:${selectedBooking.customerPhone}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:bg-indigo-50 hover:text-indigo-600"
                    title="Call Client"
                  >
                    <PhoneCall size={14} />
                  </a>
                  {selectedBooking.customerEmail && (
                    <a
                      href={`mailto:${selectedBooking.customerEmail}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:bg-indigo-50 hover:text-indigo-600"
                      title="Send Email"
                    >
                      <MailCheck size={14} />
                    </a>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    Space
                  </span>
                  <div className="mt-1 flex items-center gap-2 font-semibold text-slate-800">
                    <Layers size={16} className="shrink-0 text-indigo-500" />
                    <span className="truncate">
                      {spaceDisplayName(selectedBooking)}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    Date
                  </span>
                  <div className="mt-1 flex items-center gap-2 font-semibold text-slate-800">
                    <Calendar size={16} className="shrink-0 text-indigo-500" />
                    <span>
                      {formatDateDisplay(selectedBooking.bookingDate)}
                    </span>
                  </div>
                </div>
                <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    Time
                  </span>
                  <div className="mt-1 flex items-center gap-2 font-semibold text-slate-800">
                    <Clock size={16} className="shrink-0 text-indigo-500" />
                    <span className="font-mono text-xs tabular-nums">
                      {selectedBooking.bookingTime ||
                        `${selectedBooking.startTime} - ${selectedBooking.endTime}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-white p-3.5 text-xs text-slate-600">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Billing
                </p>
                <p>Original amount: ₹{Number(selectedBooking.originalAmount || selectedBooking.grandTotal || 0).toLocaleString("en-IN")}</p>
                <p>Rescheduled amount: ₹{Number(selectedBooking.grandTotal || 0).toLocaleString("en-IN")}</p>
                <p>Amount paid: ₹{Number(selectedBooking.paidAmount || 0).toLocaleString("en-IN")}</p>
                <p>
                  Refund / wallet adjustment: ₹
                  {(selectedBooking.payments || [])
                    .filter((row) => row.kind === "refund")
                    .reduce((sum, row) => sum + Number(row.amount || 0), 0)
                    .toLocaleString("en-IN")}
                </p>
                <p>Pending amount: ₹{(Number(selectedBooking.dueAmount || 0) < 1 ? 0 : Number(selectedBooking.dueAmount || 0)).toLocaleString("en-IN")}</p>
                <p>
                  Payment status:{" "}
                  {Number(selectedBooking.dueAmount || 0) < 1
                    ? "Paid"
                    : Number(selectedBooking.paidAmount || 0) > 0
                      ? "Partially Paid"
                      : "Pending"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBookingAction({ booking: selectedBooking, view: "reschedule" });
                      setSelectedBooking(null);
                    }}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700"
                  >
                    Reschedule Booking
                  </button>
                  {Number(selectedBooking.dueAmount || 0) >= 1 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setBookingAction({ booking: selectedBooking, view: "payment" });
                        setSelectedBooking(null);
                      }}
                      className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800"
                    >
                      Receive Pending Payment
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setBookingAction({ booking: selectedBooking, view: "history" });
                      setSelectedBooking(null);
                    }}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700"
                  >
                    View Payment History
                  </button>
                </div>
              </div>

              {selectedBooking.notes && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    Notes
                  </span>
                  <p className="text-xs leading-relaxed text-slate-600">
                    {selectedBooking.notes}
                  </p>
                </div>
              )}

              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 flex flex-col items-center">
                <div className="mb-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Booking Summary Card
                </div>
                <BookingSummaryRenderer booking={selectedBooking} />
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50/70 px-6 py-4">
              <div className="flex items-center gap-2">
                <Can permission={PERMISSIONS.SPACE_BOOKING_UPDATE}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBooking(selectedBooking);
                      setSelectedBooking(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
                  >
                    <Pencil size={14} />
                    <span>Edit Booking</span>
                  </button>
                </Can>
                {selectedBooking.status === "Draft" && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBooking(selectedBooking);
                      setSelectedBooking(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-700 active:scale-95"
                  >
                    <CreditCard size={14} />
                    <span>Proceed to Checkout</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {bookingAction ? (
        <RescheduleBookingModal
          booking={bookingAction.booking}
          view={bookingAction.view}
          onClose={() => setBookingAction(null)}
          onSaved={() => {
            setBookingAction(null);
            void fetchBookings();
          }}
          onPay={(quote) => {
            const source = bookingAction.booking;
            setBookingAction(null);
            setReschedulePay({
              bookingId: String(source._id || source.id || ""),
              bookingDate: quote.newDate,
              startTime: quote.newStart,
              endTime: quote.newEnd,
              dayType: quote.newDay,
            });
            setPendingCheckout({
              customerName: quote.customerName || source.customerName,
              customerPhone: quote.customerPhone || source.customerPhone,
              customerEmail: source.customerEmail,
              customerId: quote.customerId || undefined,
              membershipType: quote.membershipType || undefined,
              membershipPlanId: quote.membershipPlanId || undefined,
              spaceId: quote.spaceId || String(source.spaceId),
              bookingDate: quote.newDate,
              startTime: quote.newStart,
              endTime: quote.newEnd,
              status: (source.status || "Upcoming") as SpaceBookingStatus,
              spaceName: `${source.spaceName || "Space"} reschedule`,
              spaceDay: quote.newDay,
              unitPrice: quote.additionalDue,
              durationHours: quote.hours || 1,
              lineTotal: quote.additionalDue,
              subTotal: quote.additionalDue,
              spaceQty: 1,
              selectedServices: [],
              summarySnapshot: { spaceCharges: quote.additionalDue },
              notes: `Reschedule difference · ${quote.hours}h · ${quote.newDay}${quote.membershipLabel ? ` · ${quote.membershipLabel}` : ""}`,
            });
            setOpenCheckout(true);
          }}
        />
      ) : null}

      {deleteBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting)
              setDeleteBooking(null);
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-600">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Space Booking
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Are you sure you want to delete the reservation for{" "}
                  <strong className="text-slate-700">
                    {deleteBooking.customerName}
                  </strong>{" "}
                  ({spaceDisplayName(deleteBooking)})? This cannot be undone.
                </p>
              </div>
            </div>

            <div className="my-4 space-y-1 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Space:</span>
                <span className="font-semibold text-slate-700">
                  {spaceDisplayName(deleteBooking)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Date & Time:</span>
                <span className="font-semibold text-slate-700">
                  {formatDateDisplay(deleteBooking.bookingDate)} (
                  {deleteBooking.bookingTime ||
                    `${deleteBooking.startTime} - ${deleteBooking.endTime}`}
                  )
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteBooking(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDelete()}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-rose-700 active:scale-[0.98] disabled:opacity-60"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                Delete Booking
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateBookingDetailsModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setPendingCheckout(null);
        }}
        onSubmit={handleCreate}
        onSaveDraft={handleSaveDraft}
        draftValues={pendingCheckout}
        submitting={saving}
      />

      <CreateBookingDetailsModal
        isOpen={Boolean(editingBooking)}
        onClose={() => setEditingBooking(null)}
        onSubmit={handleUpdate}
        onSaveDraft={handleSaveDraft}
        initialBooking={editingBooking}
        submitting={saving}
      />

      <CheckoutModal
        open={openCheckout}
        onClose={() => {
          if (saving) return;
          setOpenCheckout(false);
          if (reschedulePay) {
            setReschedulePay(null);
            setPendingCheckout(null);
            return;
          }
          // Return user to booking details if they cancel checkout
          if (pendingCheckout) {
            const originalDraftId = (pendingCheckout as any)?._originalBookingId;
            if (originalDraftId) {
              const orig = data.find((b) => bookingId(b) === originalDraftId);
              setEditingBooking({
                ...(orig || {}),
                ...pendingCheckout,
                _id: originalDraftId,
              } as any);
              return;
            }
            setIsCreateModalOpen(true);
          }
        }}
        grandTotal={checkoutGrandTotal}
        items={checkoutItems}
        initialCustomerName={pendingCheckout?.customerName || ""}
        initialCustomerPhone={pendingCheckout?.customerPhone || ""}
        initialCustomerId={pendingCheckout?.customerId || undefined}
        initialMembership={pendingCheckout?.membershipType || undefined}
        initialMembershipPlanId={pendingCheckout?.membershipPlanId || undefined}
        initialMembershipDiscount={pendingCheckout?.discountAmount || 0}
        initialCashbackTotal={pendingCheckout?.cashbackAmount || 0}
        lockMembershipDiscount={true}
        disableCashback={true}
        initialNotes={
          pendingCheckout
            ? [
                pendingCheckout.notes,
                `Space: ${pendingCheckout.spaceName || "—"}`,
                `${pendingCheckout.bookingDate} ${pendingCheckout.startTime}-${pendingCheckout.endTime}`,
              ]
                .filter(Boolean)
                .join(" · ")
            : ""
        }
        couponApplicableContext="space"
        minimumPaymentPercent={70}
        bookingPaymentRule={paymentRule}
        onConfirmPayment={async (payment) => {
          await handleConfirmCheckoutPayment(payment);
        }}
      />
    </div>
  );
};

export default SpaceBook;

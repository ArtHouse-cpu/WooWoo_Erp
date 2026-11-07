import { useEffect, useMemo, useRef, useState } from "react";
import { usePersistedDateFilter } from "@/utils/rememberDateFilter";
import { useSearchParams } from "react-router-dom";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  Loader2,
  MoreHorizontal,
  Package,
  PlusCircle,
  Search,
  Phone,
  ArrowUpDown,
  ShoppingCart,
  Users,
  Wallet,
  X,
  Check,
  Copy,
  CheckCircle2,
  XCircle,
  Link2,
} from "lucide-react";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";
import {
  handleEnrollCsp,
  handleGetAllCustomers,
  handleGetCspApplications,
  handleGetCspEnrollments,
  handleGetCspProducts,
  handleReviewCspApplication,
  handleUpdateCsp,
  type CspApplicationRecord,
  type CspEnrollment,
} from "@/services/apiClient";
import ApproveCSPModal from "../components/ApproveCSPModal";
import CspPartnerDetailsModal from "../components/CspPartnerDetailsModal";

type CustomerOption = {
  _id: string;
  name?: string;
  mobile?: string;
  email?: string;
  membershipType?: string;
  membershipEndDate?: string | null;
  membershipExpired?: boolean;
};

type ProductRow = {
  _id: string;
  productName?: string;
  serviceName?: string;
  type?: string;
  itemType?: string;
  category?: string;
  subCategory?: string;
  sellingPrice?: number;
  purchasePrice?: number;
  discountType?: string;
  discountValue?: number;
  stockQty?: number;
  stockStatus?: string;
  imageUrl?: string | null;
  images?: string[];
  image?: string | null;
  variants?: { name: string; sellingPrice: number; purchasePrice: number }[];
};

export type ApplicationRow = {
  id: string;
  name: string;
  email: string;
  brandName: string;
  phoneNumber: string;
  prositeUrl: string;
  status: "pending" | "approved" | "rejected";
  avatarInitials: string;
  avatarBg: string;
  avatarText: string;
  avatarBorder: string;
  sellingBefore?: string;
  sellingNote?: string;
  membershipLabel?: string;
  membershipStatus?: string;
  activatedAt?: string;
  customerSince?: string;
  submittedAt?: string;
};

const enrollmentCustomerId = (row: CspEnrollment): string => {
  if (typeof row.customerId === "string" && row.customerId.trim()) {
    return row.customerId.trim();
  }
  if (
    row.customerId &&
    typeof row.customerId === "object" &&
    row.customerId._id
  ) {
    return String(row.customerId._id).trim();
  }
  if (row.customer?._id) return String(row.customer._id).trim();
  return "";
};

const AVATAR_PALETTES = [
  { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200" },
  { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
  { bg: "bg-sky-100", text: "text-sky-700", border: "border-sky-200" },
  { bg: "bg-slate-800", text: "text-white", border: "border-slate-800" },
  { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
  { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  { bg: "bg-zinc-800", text: "text-white", border: "border-zinc-800" },
  { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-200" },
  { bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-200" },
];

function mapApplication(row: CspApplicationRecord, index: number): ApplicationRow {
  const name = row.customerName || "Applicant";
  const avatar = getAvatar(name, index);
  return {
    id: row._id,
    name,
    email: row.email || "",
    brandName: row.brandName || "",
    phoneNumber: row.mobile || "",
    prositeUrl: row.prositeUrl || "",
    status: "pending",
    avatarInitials: avatar.initials,
    avatarBg: avatar.palette.bg,
    avatarText: avatar.palette.text,
    avatarBorder: avatar.palette.border,
    sellingBefore: row.alreadySelling ? "Yes" : "No",
    sellingNote: (row.sellingPlatforms || []).join(", "),
    submittedAt: row.createdAt,
  };
}

function formatApplicantPhone(raw: string) {
  const digits = String(raw || "").replace(/\D/g, "");
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  if (local.length !== 10) return String(raw || "").trim();
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}

function getAvatar(name: string, index: number) {
  const clean = (name || "Partner").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  let initials = "P";
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length >= 2) {
    initials = parts[0].slice(0, 2).toUpperCase();
  } else {
    initials = (parts[0]?.[0] || "P").toUpperCase();
  }
  const palette = AVATAR_PALETTES[index % AVATAR_PALETTES.length];
  return { initials, palette };
}

function partnerMoney(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function partnerEarnings(row: CspEnrollment) {
  return partnerMoney(
    row.withdrawable ?? row.withdrawableBalance ?? row.affiliateBalance ?? 0,
  );
}

function partnerSales(row: CspEnrollment) {
  return partnerMoney(row.salesAmount);
}

function partnerPayouts(row: CspEnrollment) {
  return partnerMoney(row.payoutAmount);
}


const REJECTION_REASONS = [
  "Profile does not meet criteria",
  "Incomplete application details",
  "Prosite portfolio not accessible or empty",
  "Duplicate application",
  "Low product quality or relevance",
  "Business categories not supported currently",
  "Other",
];

export type MembershipExpiryBadge = {
  dateText: string;
  daysText: string;
  isExpired: boolean;
  badgeColor: string;
  pillColor: string;
};

export function formatMembershipExpiryInfo(
  endDateStr?: string | Date | null,
  isExpired?: boolean,
): MembershipExpiryBadge {
  if (!endDateStr) {
    return {
      dateText: "Lifetime",
      daysText: "No Expiry",
      isExpired: false,
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      pillColor: "text-emerald-700",
    };
  }

  const end = new Date(endDateStr);
  if (Number.isNaN(end.getTime())) {
    return {
      dateText: "N/A",
      daysText: "N/A",
      isExpired: false,
      badgeColor: "bg-slate-50 text-slate-600 border-slate-200",
      pillColor: "text-slate-500",
    };
  }

  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const formattedDate = end.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  if (diffDays < 0 || isExpired) {
    const expiredAgo = Math.abs(diffDays);
    return {
      dateText: formattedDate,
      daysText: expiredAgo === 0 ? "Expired today" : `${expiredAgo}d expired`,
      isExpired: true,
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
      pillColor: "text-rose-600 font-semibold",
    };
  }

  if (diffDays === 0) {
    return {
      dateText: formattedDate,
      daysText: "Expires today",
      isExpired: false,
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      pillColor: "text-amber-600 font-semibold",
    };
  }

  if (diffDays <= 7) {
    return {
      dateText: formattedDate,
      daysText: `${diffDays}d left`,
      isExpired: false,
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      pillColor: "text-amber-600 font-semibold",
    };
  }

  return {
    dateText: formattedDate,
    daysText: `${diffDays}d left`,
    isExpired: false,
    badgeColor: "bg-violet-50 text-violet-700 border-violet-200",
    pillColor: "text-violet-700",
  };
}

type DatePreset =
  | "today"
  | "yesterday"
  | "this-week"
  | "last-week"
  | "this-month"
  | "last-month"
  | "this-year"
  | "last-year"
  | "lifetime"
  | "custom";

const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this-week", label: "This Week" },
  { id: "last-week", label: "Last Week" },
  { id: "this-month", label: "This Month" },
  { id: "last-month", label: "Last Month" },
  { id: "this-year", label: "This Year" },
  { id: "last-year", label: "Last Year" },
  { id: "lifetime", label: "Lifetime" },
  { id: "custom", label: "Custom" },
];

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

function startOfWeek(date: Date) {
  const start = startOfDay(date);
  const mondayOffset = (date.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  return start;
}

function parseDateValue(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function objectIdDate(id?: string) {
  if (!id || !/^[a-f\d]{24}$/i.test(id)) return null;
  const seconds = Number.parseInt(id.slice(0, 8), 16);
  if (!Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000);
}

function partnerDate(row: CspEnrollment) {
  const dated = row as CspEnrollment & {
    createdAt?: string | Date;
    updatedAt?: string | Date;
  };
  return (
    parseDateValue(dated.createdAt) ||
    objectIdDate(row._id) ||
    parseDateValue(dated.updatedAt)
  );
}

function presetRange(preset: DatePreset, fromDate: string, toDate: string) {
  if (preset === "lifetime") {
    return null;
  }
  const now = new Date();
  if (preset === "today") {
    return { start: startOfDay(now), end: endOfDay(now) };
  }
  if (preset === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
  }
  if (preset === "this-week") {
    return { start: startOfWeek(now), end: endOfDay(now) };
  }
  if (preset === "last-week") {
    const thisWeek = startOfWeek(now);
    const start = new Date(thisWeek);
    start.setDate(start.getDate() - 7);
    const end = new Date(thisWeek);
    end.setDate(end.getDate() - 1);
    return { start, end: endOfDay(end) };
  }
  if (preset === "this-month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: endOfDay(now),
    };
  }
  if (preset === "last-month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
    };
  }
  if (preset === "this-year") {
    return { start: new Date(now.getFullYear(), 0, 1), end: endOfDay(now) };
  }
  if (preset === "last-year") {
    return {
      start: new Date(now.getFullYear() - 1, 0, 1),
      end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
    };
  }
  if (!fromDate && !toDate) return null;
  const start = fromDate
    ? startOfDay(new Date(`${fromDate}T00:00:00`))
    : new Date(0);
  const end = toDate
    ? endOfDay(new Date(`${toDate}T00:00:00`))
    : endOfDay(now);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (start <= end) return { start, end };
  return { start: startOfDay(end), end: endOfDay(start) };
}

function isInsideRange(
  value: Date | null,
  range: { start: Date; end: Date } | null,
) {
  if (!range) return true;
  if (!value) return false;
  return value >= range.start && value <= range.end;
}

function formatInputDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CspScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [liveRows, setLiveRows] = useState<CspEnrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});

  // Active Tab: "active" | "inactive" (Applications)
  const [activeTab, setActiveTab] = useState<"active" | "inactive">("active");

  // Applications Local State (pure frontend UI)
  const [applications, setApplications] = useState<ApplicationRow[]>([]);

  // Reject Application Modal State (pure frontend UI)
  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    app: ApplicationRow | null;
    reason: string;
    notes: string;
  }>({
    open: false,
    app: null,
    reason: "",
    notes: "",
  });

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("lifetime");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [filterBalanceOnly, setFilterBalanceOnly] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [sortBy, setSortBy] = useState<string>("default");
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Pagination for Active Partners (10 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const partnersPageSize = 10;

  // Pagination for Applications (8 per page as shown in screenshot: 1–8 of 16)
  const [currentAppPage, setCurrentAppPage] = useState(1);
  const applicationsPageSize = 8;

  // Row Action Menu
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Enroll modal states
  const [enrolling, setEnrolling] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [openApproveModal, setOpenApproveModal] = useState(false);
  const [approveTarget, setApproveTarget] = useState<ApplicationRow | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customerExpiryMap, setCustomerExpiryMap] = useState<
    Map<
      string,
      {
        membershipType?: string;
        membershipEndDate?: string | null;
        membershipExpired?: boolean;
      }
    >
  >(new Map());
  const [enrolledCustomerIds, setEnrolledCustomerIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [prositeUrl, setPrositeUrl] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const dateMenuRef = useRef<HTMLDivElement>(null);

  // Auto open enroll if query param ?enroll=1
  useEffect(() => {
    if (searchParams.get("enroll") !== "1") return;
    setShowEnroll(true);
    const next = new URLSearchParams(searchParams);
    next.delete("enroll");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Products modal state
  const [productsModal, setProductsModal] = useState<{
    open: boolean;
    csp: CspEnrollment | null;
    products: ProductRow[];
    loading: boolean;
  }>({ open: false, csp: null, products: [], loading: false });
  const [productImagePreview, setProductImagePreview] = useState<string | null>(
    null,
  );
  const [detailsPartner, setDetailsPartner] = useState<CspEnrollment | null>(
    null,
  );

  const openPartnerDetails = (row: CspEnrollment) => {
    setActionMenuId(null);
    setDetailsPartner(row);
  };

  const openProductsModal = async (csp: CspEnrollment) => {
    setActionMenuId(null);
    setProductsModal({ open: true, csp, products: [], loading: true });
    try {
      const res = await handleGetCspProducts(csp._id);
      const list: ProductRow[] = Array.isArray(res?.products)
        ? res.products
        : Array.isArray(res?.data)
          ? res.data
          : [];
      setProductsModal({ open: true, csp, products: list, loading: false });
    } catch {
      setProductsModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const closeProductsModal = () => {
    setProductImagePreview(null);
    setProductsModal({ open: false, csp: null, products: [], loading: false });
  };

  // Fetch all CSP enrollments to preserve existing data
  const fetchRows = async () => {
    try {
      setLoading(true);
      const res = await handleGetCspEnrollments({ status: "all" });
      const list = Array.isArray(res?.enrollments)
        ? res.enrollments
        : Array.isArray(res?.csps)
          ? res.csps
          : [];
      setLiveRows(list);
    } catch (error) {
      console.error("Failed to load CSP enrollments:", error);
      setLiveRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await handleGetCspApplications("under_review");
        if (cancelled) return;
        const list = Array.isArray(res.applications) ? res.applications : [];
        setApplications(list.map(mapApplication));
      } catch (error) {
        console.error("Failed to load CSP applications:", error);
        if (!cancelled) setApplications([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch product counts dynamically for live rows
  useEffect(() => {
    if (liveRows.length === 0) return;
    const loadCounts = async () => {
      const counts: Record<string, number> = {};
      await Promise.all(
        liveRows.map(async (row) => {
          try {
            const res = await handleGetCspProducts(row._id);
            const list = Array.isArray(res?.products)
              ? res.products
              : Array.isArray(res?.data)
                ? res.data
                : [];
            counts[row._id] = list.length;
          } catch {
            counts[row._id] = 0;
          }
        }),
      );
      setProductCounts((prev) => ({ ...prev, ...counts }));
    };
    loadCounts();
  }, [liveRows]);

  // Load eligible customers for enrollment
  useEffect(() => {
    if (!showEnroll) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingCustomers(true);
        const [customerRes, enrollmentRes] = await Promise.all([
          handleGetAllCustomers(),
          handleGetCspEnrollments({ status: "all" }),
        ]);

        if (cancelled) return;

        const enrollmentList = Array.isArray(enrollmentRes?.enrollments)
          ? enrollmentRes.enrollments
          : Array.isArray(enrollmentRes?.csps)
            ? enrollmentRes.csps
            : [];

        const enrolledIds = new Set(
          enrollmentList
            .map((row) => enrollmentCustomerId(row))
            .filter(Boolean),
        );
        setEnrolledCustomerIds(enrolledIds);

        const list = Array.isArray(customerRes?.customers)
          ? customerRes.customers
          : [];
        const expMap = new Map<
          string,
          {
            membershipType?: string;
            membershipEndDate?: string | null;
            membershipExpired?: boolean;
          }
        >();
        list.forEach((c: any) => {
          const item = {
            membershipType: c.membershipType,
            membershipEndDate: c.membershipEndDate || null,
            membershipExpired: Boolean(c.membershipExpired),
          };
          if (c._id) expMap.set(String(c._id), item);
          const digits = String(c.mobile || "").replace(/\D/g, "");
          const ten = digits.length >= 10 ? digits.slice(-10) : digits;
          if (ten) expMap.set(`m_${ten}`, item);
        });
        setCustomerExpiryMap(expMap);

        setCustomers(
          list
            .filter(
              (c: any) =>
                String(c.membershipType || "")
                  .trim()
                  .toLowerCase() === "premium",
            )
            .map((c: any) => ({
              _id: String(c._id),
              name: c.name,
              mobile: c.mobile,
              email: c.email,
              membershipType: c.membershipType,
              membershipEndDate: c.membershipEndDate || null,
              membershipExpired: Boolean(c.membershipExpired),
            })),
        );
      } catch (error) {
        console.error("Failed to load customers:", error);
        if (!cancelled) {
          setCustomers([]);
          setEnrolledCustomerIds(new Set());
        }
      } finally {
        if (!cancelled) setLoadingCustomers(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showEnroll]);

  // Close popovers on outer click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        searchWrapRef.current &&
        !searchWrapRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(e.target as Node)
      ) {
        setActionMenuId(null);
      }
      if (
        dateMenuRef.current &&
        !dateMenuRef.current.contains(e.target as Node)
      ) {
        setShowDateDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const availableCustomers = useMemo(
    () =>
      customers.filter((customer) => !enrolledCustomerIds.has(customer._id)),
    [customers, enrolledCustomerIds],
  );

  const filteredCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();
    if (!term) return availableCustomers;
    return availableCustomers.filter((customer) => {
      const name = String(customer.name || "").toLowerCase();
      const mobile = String(customer.mobile || "").toLowerCase();
      const email = String(customer.email || "").toLowerCase();
      return (
        name.includes(term) || mobile.includes(term) || email.includes(term)
      );
    });
  }, [availableCustomers, customerSearch]);

  const selectedCustomer = useMemo(
    () =>
      availableCustomers.find(
        (customer) => customer._id === selectedCustomerId,
      ) || null,
    [availableCustomers, selectedCustomerId],
  );

  const closeEnrollModal = () => {
    setShowEnroll(false);
    setSelectedCustomerId("");
    setCustomerSearch("");
    setPrositeUrl("");
    setDropdownOpen(false);
  };

  const handleSelectCustomer = (customer: CustomerOption) => {
    setSelectedCustomerId(customer._id);
    setCustomerSearch(
      `${customer.name || "Customer"}${
        customer.mobile ? ` (${customer.mobile})` : ""
      } · Premium`,
    );
    setDropdownOpen(false);
  };

  const clearSelectedCustomer = () => {
    setSelectedCustomerId("");
    setCustomerSearch("");
    setDropdownOpen(true);
  };

  const prosite = prositeUrl.trim().replace(/\/+$/, "");
  const prositeReady =
    /^(?:https?:\/\/)?(?:www\.)?1atives\.com\/pro\/[a-z0-9][a-z0-9_-]*$/i.test(
      prosite,
    );

  const handleEnroll = async () => {
    if (!selectedCustomerId) {
      Swal.fire("Customer required", "Select a customer to enroll.", "warning");
      return;
    }
    if (!prositeReady) {
      Swal.fire(
        "Prosite URL required",
        "Use a link like 1atives.com/pro/yourname.",
        "warning",
      );
      return;
    }
    try {
      setEnrolling(true);
      const res = await handleEnrollCsp({
        customerId: selectedCustomerId,
        prositeUrl: prosite,
      });
      if (!res?.success) {
        throw new Error(res?.message || "Enrollment failed");
      }
      Swal.fire(
        "Enrolled",
        res.message || "CSP partner enrolled (Customer + Vendor linked).",
        "success",
      );
      closeEnrollModal();
      await fetchRows();
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to enroll CSP seller.";
      Swal.fire("Error", msg, "error");
    } finally {
      setEnrolling(false);
    }
  };

  const toggleStatus = async (row: CspEnrollment) => {
    setActionMenuId(null);
    const next = row.status === "active" ? "inactive" : "active";
    try {
      await handleUpdateCsp(row._id, { status: next });
      await fetchRows();
      Swal.fire("Updated", `Partner marked as ${next}.`, "success");
    } catch (error: any) {
      Swal.fire(
        "Error",
        error?.response?.data?.message || "Failed to update status.",
        "error",
      );
    }
  };

  const getRowMembershipExpiry = (row: CspEnrollment) => {
    const cId = enrollmentCustomerId(row);
    let info = cId ? customerExpiryMap.get(cId) : null;
    if (!info) {
      const mob = String(
        row.mobile || row.customer?.mobile || row.vendor?.mobile || "",
      ).replace(/\D/g, "");
      const ten = mob.length >= 10 ? mob.slice(-10) : mob;
      if (ten) info = customerExpiryMap.get(`m_${ten}`);
    }
    const endDate =
      info?.membershipEndDate ||
      (row.customer as any)?.membershipEndDate ||
      null;
    const isExpired =
      info?.membershipExpired ??
      (row.customer as any)?.membershipExpired ??
      false;
    return formatMembershipExpiryInfo(endDate, isExpired);
  };

  const getRowMembershipLabel = (row: CspEnrollment) => {
    const cId = enrollmentCustomerId(row);
    let info = cId ? customerExpiryMap.get(cId) : null;
    if (!info) {
      const mob = String(
        row.mobile || row.customer?.mobile || row.vendor?.mobile || "",
      ).replace(/\D/g, "");
      const ten = mob.length >= 10 ? mob.slice(-10) : mob;
      if (ten) info = customerExpiryMap.get(`m_${ten}`);
    }
    const raw = String(
      info?.membershipType || row.customer?.membershipType || "Premium",
    ).trim();
    if (!raw || ["none", "guest", "new"].includes(raw.toLowerCase())) {
      return "Premium";
    }
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  };

  const sourceRows = liveRows;

  // Counts for tabs
  const activeCount = useMemo(
    () => liveRows.filter((r) => (r.status || "active") === "active").length,
    [liveRows],
  );

  const inactiveCount = applications.length;

  const totalPartnersStat = liveRows.length;

  const totalEarningsStat = useMemo(
    () => liveRows.reduce((sum, row) => sum + partnerEarnings(row), 0),
    [liveRows],
  );

  const totalDisplayedProducts = useMemo(
    () => Object.values(productCounts).reduce((sum, count) => sum + (count || 0), 0),
    [productCounts],
  );

  const activeDateRange = useMemo(
    () => presetRange(datePreset, fromDate, toDate),
    [datePreset, fromDate, toDate],
  );

  const dateFilterLabel = useMemo(() => {
    if (datePreset !== "custom") {
      return DATE_PRESETS.find((item) => item.id === datePreset)?.label || "Lifetime";
    }
    if (fromDate && toDate) {
      return `${formatInputDate(fromDate)} – ${formatInputDate(toDate)}`;
    }
    if (fromDate) return `From ${formatInputDate(fromDate)}`;
    if (toDate) return `To ${formatInputDate(toDate)}`;
    return "Custom";
  }, [datePreset, fromDate, toDate]);

  useEffect(() => {
    setCurrentPage(1);
    setCurrentAppPage(1);
  }, [datePreset, fromDate, toDate]);

  // Filtered rows for Active Partners Table
  const filteredActiveRows = useMemo(() => {
    return sourceRows.filter((row) => {
      if (!isInsideRange(partnerDate(row), activeDateRange)) return false;

      // Balance filter
      if (filterBalanceOnly) {
        const amt = Number(
          row.withdrawable ?? row.withdrawableBalance ?? 0,
        );
        if (amt <= 0) return false;
      }

      // Search term
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const pName = String(
          row.customer?.name || row.displayName || "",
        ).toLowerCase();
        const bName = String(
          row.vendor?.companyName || row.vendor?.name || row.label || "",
        ).toLowerCase();
        const mobile = String(
          row.mobile || row.customer?.mobile || row.vendor?.mobile || "",
        ).toLowerCase();
        const email = String(
          row.customer?.email || "",
        ).toLowerCase();
        if (
          !pName.includes(q) &&
          !bName.includes(q) &&
          !mobile.includes(q) &&
          !email.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [sourceRows, filterBalanceOnly, searchQuery, activeDateRange]);

  // Sorted Active rows
  const sortedActiveRows = useMemo(() => {
    const list = [...filteredActiveRows];
    if (sortBy === "name-asc") {
      list.sort((a, b) =>
        (a.customer?.name || a.displayName || "").localeCompare(
          b.customer?.name || b.displayName || "",
        ),
      );
    } else if (sortBy === "name-desc") {
      list.sort((a, b) =>
        (b.customer?.name || b.displayName || "").localeCompare(
          a.customer?.name || a.displayName || "",
        ),
      );
    } else if (sortBy === "earnings-desc") {
      list.sort((a, b) => partnerEarnings(b) - partnerEarnings(a));
    } else if (sortBy === "earnings-asc") {
      list.sort((a, b) => partnerEarnings(a) - partnerEarnings(b));
    }
    return list;
  }, [filteredActiveRows, sortBy]);

  // Paginated Active Rows
  const totalPartnerPages =
    Math.ceil(sortedActiveRows.length / partnersPageSize) || 1;
  const paginatedActiveRows = useMemo(() => {
    const start = (currentPage - 1) * partnersPageSize;
    return sortedActiveRows.slice(start, start + partnersPageSize);
  }, [sortedActiveRows, currentPage, partnersPageSize]);

  const startPartnerRecord =
    sortedActiveRows.length === 0 ? 0 : (currentPage - 1) * partnersPageSize + 1;
  const endPartnerRecord = Math.min(
    currentPage * partnersPageSize,
    sortedActiveRows.length,
  );

  // Filtered & Paginated Applications (Applications Tab)
  const filteredApplications = useMemo(() => {
    let list = [...applications];
    list = list.filter((app) =>
      isInsideRange(
        parseDateValue(app.submittedAt || app.activatedAt || app.customerSince),
        activeDateRange,
      ),
    );
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (app) =>
          app.name.toLowerCase().includes(q) ||
          app.brandName.toLowerCase().includes(q) ||
          app.phoneNumber.toLowerCase().includes(q) ||
          app.prositeUrl.toLowerCase().includes(q) ||
          app.email.toLowerCase().includes(q),
      );
    }
    if (sortBy === "name-asc") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "name-desc") {
      list.sort((a, b) => b.name.localeCompare(a.name));
    }
    return list;
  }, [applications, searchQuery, sortBy, activeDateRange]);

  const totalAppPages =
    Math.ceil(filteredApplications.length / applicationsPageSize) || 1;
  const paginatedApplications = useMemo(() => {
    const start = (currentAppPage - 1) * applicationsPageSize;
    return filteredApplications.slice(start, start + applicationsPageSize);
  }, [filteredApplications, currentAppPage, applicationsPageSize]);

  const startAppRecord =
    filteredApplications.length === 0
      ? 0
      : (currentAppPage - 1) * applicationsPageSize + 1;
  const endAppRecord = Math.min(
    currentAppPage * applicationsPageSize,
    filteredApplications.length,
  );

  const handleApproveCSP = async () => {
    if (!approveTarget) return;
    const approved = approveTarget;
    try {
      await handleReviewCspApplication(approved.id, { status: "approved" });
      setApplications((prev) => prev.filter((row) => row.id !== approved.id));
      setApproveTarget(null);
      await fetchRows();
      Swal.fire({
        icon: "success",
        title: "Application Approved!",
        text: `${approved.name} has been approved as an active partner.`,
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error: any) {
      Swal.fire(
        "Error",
        error?.response?.data?.message || "Could not approve this application.",
        "error",
      );
    }
  };

  // Open the Reject Modal on clicking Reject
  const handleOpenRejectModal = (app: ApplicationRow) => {
    setRejectModal({
      open: true,
      app,
      reason: "",
      notes: "",
    });
  };

  const handleCloseRejectModal = () => {
    setRejectModal({
      open: false,
      app: null,
      reason: "",
      notes: "",
    });
  };

  const handleConfirmReject = async () => {
    if (!rejectModal.reason) {
      Swal.fire({
        icon: "warning",
        title: "Reason Required",
        text: "Please select a reason for rejecting this application.",
        confirmButtonColor: "#ff5a36",
      });
      return;
    }

    if (rejectModal.app) {
      const targetApp = rejectModal.app;
      const rejectionReason = [rejectModal.reason, rejectModal.notes.trim()]
        .filter(Boolean)
        .join(". ");
      try {
        await handleReviewCspApplication(targetApp.id, {
          status: "rejected",
          rejectionReason,
        });
        setApplications((prev) => prev.filter((a) => a.id !== targetApp.id));
        handleCloseRejectModal();
        Swal.fire({
          icon: "info",
          title: "Application Rejected",
          text: `The application for ${targetApp.name} has been rejected.`,
          timer: 1800,
          showConfirmButton: false,
        });
      } catch (error: any) {
        Swal.fire(
          "Error",
          error?.response?.data?.message || "Could not reject this application.",
          "error",
        );
      }
    }
  };

  // Export to Excel
  const handleExport = () => {
    if (activeTab === "active") {
      const dataToExport = sortedActiveRows.map((r, idx) => {
        const partnerName = r.customer?.name || r.displayName || "—";
        const brandName =
          r.vendor?.companyName || r.vendor?.name || r.label || "—";
        const earnings = partnerEarnings(r);
        const productsCount = productCounts[r._id] ?? 0;

        return {
          "#": idx + 1,
          Partner: partnerName,
          "Brand Name": brandName,
          "Mobile Number": r.mobile || r.customer?.mobile || "—",
          "Sales (₹)": partnerSales(r),
          "Earnings (₹)": earnings,
          "Payouts (₹)": partnerPayouts(r),
          "Products (count)": productsCount,
          "Premium Expiry": (() => {
            const exp = getRowMembershipExpiry(r);
            return exp.dateText;
          })(),
          Status: r.status || "active",
        };
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "CSP Partners");
      XLSX.writeFile(
        wb,
        `CSP_Partners_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } else {
      const dataToExport = filteredApplications.map((app, idx) => ({
        "#": idx + 1,
        Name: app.name,
        Email: app.email,
        "Brand Name": app.brandName,
        "Phone Number": app.phoneNumber,
        "Prosite URL": app.prositeUrl,
        Status: app.status,
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Applications");
      XLSX.writeFile(
        wb,
        `CSP_Applications_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setActionMenuId(null);
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `${label} copied!`,
      showConfirmButton: false,
      timer: 1800,
    });
  };

          return (
    <div className="min-w-0 space-y-5 p-2 sm:p-4 md:p-6 bg-[#fcfdfe] min-h-screen text-slate-800">
      {/* ── 1. Top Header ────────────────────────────────────────── */}
      <div className="flex flex-row items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-2xl">
              CSP Partners
            </h1>
          </div>
        
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          {/* Date Range Selector */}
          <div className="relative" ref={dateMenuRef}>
            <button
              type="button"
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 focus:outline-none transition-colors sm:gap-2 sm:px-3.5 sm:text-sm"
            >
              <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
              <span>{dateFilterLabel}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition ${showDateDropdown ? "rotate-180" : ""}`}
              />
            </button>
            {showDateDropdown && (
              <div className={`absolute right-0 z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-md ${datePreset === "custom" ? "w-44" : "w-36"}`}>
                {DATE_PRESETS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setDatePreset(item.id);
                      if (item.id !== "custom") setShowDateDropdown(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 px-2.5 py-1 text-left text-[11px] leading-4 transition-colors ${
                      datePreset === item.id
                        ? "bg-orange-50 font-semibold text-orange-600"
                        : "font-medium text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    {datePreset === item.id && (
                      <Check className="h-3 w-3 shrink-0 text-orange-600" />
                    )}
                  </button>
                ))}
                {datePreset === "custom" && (
                  <div className="mt-1 space-y-1.5 border-t border-slate-100 px-2 py-1.5">
                    <label className="block text-[11px] font-medium text-slate-500">
                      From
                      <input
                        type="date"
                        value={fromDate}
                        max={toDate || undefined}
                        onChange={(event) => setFromDate(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-orange-400"
                      />
                    </label>
                    <label className="block text-[11px] font-medium text-slate-500">
                      To
                      <input
                        type="date"
                        value={toDate}
                        min={fromDate || undefined}
                        onChange={(event) => setToDate(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-orange-400"
                      />
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Add Partner Button */}
          <Can anyOf={[PERMISSIONS.CSP_WRITE, PERMISSIONS.CUSTOMER_CREATE]}>
            <button
              type="button"
              onClick={() => setShowEnroll(true)}
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-xl bg-[#ff5a36] px-2.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#ea4824] transition-all cursor-pointer active:scale-98 sm:gap-2 sm:px-4 sm:text-sm"
            >
              <PlusCircle className="h-4 w-4 shrink-0" />
              <span>Add Partner</span>
            </button>
          </Can>
        </div>
      </div>

      {/* ── 2. Top Summary KPI Cards (4 Grid) ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total CSP Partners */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
              <Users className="h-5 w-5" />
            </div>
            <div className="text-xs font-medium text-slate-500 leading-tight">
              Total<br />CSP Partners
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {totalPartnersStat}
            </div>
          </div>
        </div>

        {/* Card 2: Sales & Earnings */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-500">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div className="text-xs font-medium text-slate-500 leading-tight">
              Sales & Earnings<br />(Partners)
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              ₹0
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
              <div>
                <div className="text-sm sm:text-base font-bold text-slate-800">
                  ₹{totalEarningsStat.toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] text-slate-400">
                  Partners' Earnings
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Total Products */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Package className="h-5 w-5" />
            </div>
            <div className="text-xs font-medium text-slate-500 leading-tight">
              Total Products
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 divide-x divide-slate-100">
            <div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900">
                {totalDisplayedProducts}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">Displayed</div>
            </div>
            <div className="pl-3">
              <div className="text-xl sm:text-2xl font-bold text-slate-900">
                0
              </div>
              <div className="text-[11px] text-slate-400 font-medium">Units Sold</div>
            </div>
          </div>
        </div>

        {/* Card 4: Payouts */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="text-xs font-medium text-slate-500 leading-tight">
              Payouts
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 divide-x divide-slate-100">
            <div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900">
                ₹0
              </div>
              <div className="text-[11px] text-slate-400 font-medium">Completed</div>
            </div>
            <div className="pl-3">
              <div className="text-xl sm:text-2xl font-bold text-slate-900">
                ₹0
              </div>
              <div className="text-[11px] text-slate-400 font-medium">Pending</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Tabs Bar ───────────────────────────────────────────── */}
      <div className="flex items-center gap-6 border-b border-slate-200 pt-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab("active");
            setCurrentPage(1);
            setSearchQuery("");
          }}
          className={`relative pb-3 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === "active"
              ? "text-[#ff5a36] border-b-2 border-[#ff5a36]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Active Partners ({activeCount})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("inactive");
            setCurrentAppPage(1);
            setSearchQuery("");
          }}
          className={`relative pb-3 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === "inactive"
              ? "text-[#ff5a36] border-b-2 border-[#ff5a36]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Applications ({inactiveCount})
        </button>
      </div>

      {/* ── 4. Toolbar: Search, Filter, Sort, Export ─────────────────── */}
      <div className="flex flex-row items-center gap-2">
        {/* Dynamic Search Input based on Active Tab */}
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (activeTab === "active") setCurrentPage(1);
              else setCurrentAppPage(1);
            }}
            placeholder={
              activeTab === "active"
                ? "Search by partner name, brand name or products..."
                : "Search by name, brand name, phone number or Prosite URL..."
            }
            className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-9 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#ff5a36] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#ff5a36] md:rounded-xl md:bg-white md:py-2 md:text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Right Tools */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowFilterDropdown(!showFilterDropdown);
                setShowSortDropdown(false);
              }}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-xs transition-colors cursor-pointer md:h-auto md:w-auto md:gap-1.5 md:rounded-xl md:px-3 md:py-2 ${
                filterBalanceOnly && activeTab === "active"
                  ? "border-orange-300 bg-orange-50 text-orange-600"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Filter className="h-4 w-4 text-slate-500" />
              <span className="hidden text-sm font-medium md:inline">Filter</span>
              <ChevronDown className="hidden h-3 w-3 text-slate-400 md:block" />
            </button>

            {showFilterDropdown && (
              <div className="absolute right-0 z-40 mt-1.5 w-56 rounded-xl border border-slate-100 bg-white p-2 shadow-xl">
                <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Filter Options
                </div>
                {activeTab === "active" ? (
                  <>
                    <label className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterBalanceOnly}
                        onChange={(e) => {
                          setFilterBalanceOnly(e.target.checked);
                          setCurrentPage(1);
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span>Has Withdrawable Balance</span>
                    </label>
                    {filterBalanceOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterBalanceOnly(false);
                          setShowFilterDropdown(false);
                        }}
                        className="mt-1 w-full rounded-lg bg-slate-100 py-1.5 text-center text-xs font-medium text-slate-600 hover:bg-slate-200"
                      >
                        Reset Filter
                      </button>
                    )}
                  </>
                ) : (
                  <div className="p-2 text-xs text-slate-500">
                    All {applications.length} pending applications displayed.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowSortDropdown(!showSortDropdown);
                setShowFilterDropdown(false);
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-xs transition-colors hover:bg-slate-50 cursor-pointer md:h-auto md:w-auto md:gap-1.5 md:rounded-xl md:px-3 md:py-2"
            >
              <ArrowUpDown className="h-4 w-4 text-slate-500" />
              <span className="hidden text-sm font-medium md:inline">Sort by</span>
              <ChevronDown className="hidden h-3 w-3 text-slate-400 md:block" />
            </button>

            {showSortDropdown && (
              <div className="absolute right-0 z-40 mt-1.5 w-52 rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl">
                {(activeTab === "active"
                  ? [
                      { id: "default", label: "Default" },
                      { id: "sales-desc", label: "Sales (High to Low)" },
                      { id: "sales-asc", label: "Sales (Low to High)" },
                      { id: "earnings-desc", label: "Earnings (High to Low)" },
                      { id: "name-asc", label: "Partner Name (A–Z)" },
                      { id: "name-desc", label: "Partner Name (Z–A)" },
                    ]
                  : [
                      { id: "default", label: "Default" },
                      { id: "name-asc", label: "Name (A–Z)" },
                      { id: "name-desc", label: "Name (Z–A)" },
                    ]
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSortBy(opt.id);
                      setShowSortDropdown(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs font-medium text-left transition-colors ${
                      sortBy === opt.id
                        ? "bg-orange-50 text-orange-600 font-semibold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                    {sortBy === opt.id && (
                      <Check className="h-3.5 w-3.5 text-orange-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export Button */}
          <button
            type="button"
            onClick={handleExport}
            title="Export as Excel"
            className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-xs transition-colors hover:bg-slate-50 cursor-pointer active:scale-98 md:inline-flex"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* ── 5. Main Custom Table ────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {/* Desktop Table View - Hidden on mobile */}
        <div className="hidden md:block overflow-x-auto">
          {activeTab === "active" ? (
            /* ──── Active Partners Table ──── */
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-white text-xs font-semibold text-slate-600">
                  <th className="w-12 py-3.5 px-4 text-center text-slate-400">#</th>
                  <th className="py-3.5 px-4 font-semibold text-slate-700">Partner</th>
                  <th className="py-3.5 px-4 font-semibold text-slate-700">Brand Name</th>
                  <th className="py-3.5 px-4 font-semibold text-slate-700">Sales (₹)</th>
                  <th className="py-3.5 px-4 font-semibold text-slate-700">Earnings (₹)</th>
                  <th className="py-3.5 px-4 font-semibold text-slate-700">Payouts (₹)</th>
                  <th className="py-3.5 px-4 font-semibold text-slate-700">Premium Expiry</th>
                  <th className="w-16 py-3.5 px-4 font-semibold text-slate-700 text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-orange-500" />
                      <p className="mt-2 text-xs font-medium">Loading CSP partners…</p>
                    </td>
                  </tr>
                ) : paginatedActiveRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-slate-400">
                      <Package className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-2 text-sm font-semibold text-slate-600">
                        No CSP partners found
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {searchQuery
                          ? "Try clearing your search query."
                          : "Enroll a Premium customer to add your first partner."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedActiveRows.map((row, idx) => {
                    const globalIdx = (currentPage - 1) * partnersPageSize + idx;
                    const partnerName =
                      row.customer?.name || row.displayName || "Partner";
                    const brandName =
                      row.vendor?.companyName ||
                      row.vendor?.name ||
                      row.label ||
                      "Brand";
                    const mobile =
                      row.mobile ||
                      row.customer?.mobile ||
                      row.vendor?.mobile ||
                      "";
                    const { initials, palette } = getAvatar(partnerName, globalIdx);

                    const withdrawableAmt = partnerEarnings(row);
                    const salesAmt = partnerSales(row);
                    const payoutAmt = partnerPayouts(row);

                    const isMenuOpen = actionMenuId === row._id;

                    return (
                      <tr
                        key={row._id}
                        className="group transition-colors hover:bg-slate-50/70"
                      >
                        {/* # */}
                        <td className="py-3 px-4 text-center text-xs font-medium text-slate-400">
                          {globalIdx + 1}
                        </td>

                        {/* Partner */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${palette.bg} ${palette.text} ${palette.border}`}
                            >
                              {initials}
                            </div>
                            <div>
            <button
              type="button"
                                onClick={() => openPartnerDetails(row)}
                                className="inline-flex max-w-full items-center gap-1.5 text-left text-sm font-semibold text-slate-900 hover:text-[#ff5a36] hover:underline cursor-pointer"
            >
                                <span className="truncate">{partnerName}</span>
                                <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700 no-underline">
                                  {getRowMembershipLabel(row)}
                                </span>
            </button>
                              <div className="text-xs text-slate-400">
                                {brandName !== "—"
                                  ? brandName
                                  : mobile || "CSP Seller"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Brand Name */}
                        <td className="py-3 px-4 font-medium text-slate-700 text-sm">
                          {brandName}
                        </td>

                        {/* Sales (₹) */}
                        <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                          ₹{salesAmt.toLocaleString("en-IN")}
                        </td>

                        {/* Earnings (₹) */}
                        <td className="py-3 px-4 font-bold text-emerald-700 text-sm">
                          ₹{withdrawableAmt.toLocaleString("en-IN")}
                        </td>

                        {/* Payouts (₹) */}
                        <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                          ₹{payoutAmt.toLocaleString("en-IN")}
                        </td>

                        {/* Premium Membership Expiry */}
                        <td className="py-3 px-4 text-xs">
                          {(() => {
                            const exp = getRowMembershipExpiry(row);
                            return (
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-slate-500">Expire on</span>
                                <span className="font-medium text-slate-800">
                                  {exp.dateText}
                                </span>
                              </div>
                            );
                          })()}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center relative">
                          <button
                            type="button"
                            onClick={() =>
                              setActionMenuId(isMenuOpen ? null : row._id)
                            }
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {/* Dropdown Menu */}
                          {isMenuOpen && (
                            <div
                              ref={actionMenuRef}
                              className="absolute right-4 top-10 z-50 w-48 rounded-xl border border-slate-100 bg-white py-1.5 shadow-xl text-left"
                            >
                              <button
                                type="button"
                                onClick={() => openProductsModal(row)}
                                className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5 text-slate-400" />
                                <span>View Products</span>
                              </button>

                              <Can
                                anyOf={[
                                  PERMISSIONS.CSP_WRITE,
                                  PERMISSIONS.CUSTOMER_UPDATE,
                                ]}
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleStatus(row)}
                                  className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                                >
                                  <span
                                    className={`h-2 w-2 rounded-full ${
                                      row.status === "active"
                                        ? "bg-rose-500"
                                        : "bg-emerald-500"
                                    }`}
                                  />
                                  <span>
                                    {row.status === "active"
                                      ? "Deactivate Partner"
                                      : "Activate Partner"}
                                  </span>
              </button>
            </Can>

                              {mobile && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyToClipboard(mobile, "Mobile number")
                                  }
                                  className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                                >
                                  <Copy className="h-3.5 w-3.5 text-slate-400" />
                                  <span>Copy Mobile ({mobile})</span>
                                </button>
                              )}
          </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* ──── Applications Table (UI Only matching screenshot) ──── */
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-white text-xs font-semibold text-slate-600">
                  <th className="w-12 py-3.5 px-4 text-center text-slate-400">#</th>
                  <th className="py-3.5 px-4 font-semibold text-slate-700">Name</th>
                  <th className="py-3.5 px-4 font-semibold text-slate-700">Brand Name</th>
                  <th className="py-3.5 px-4 font-semibold text-slate-700">Phone Number</th>
                  <th className="py-3.5 px-4 font-semibold text-slate-700">Prosite URL</th>
                  <th className="py-3.5 px-4 font-semibold text-slate-700 text-right pr-6">
                    {/* Actions header space */}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedApplications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-slate-400">
                      <Users className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-2 text-sm font-semibold text-slate-600">
                        No applications found
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {searchQuery
                          ? "Try clearing your search query."
                          : "No pending partner applications."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedApplications.map((app, idx) => {
                    const globalIdx =
                      (currentAppPage - 1) * applicationsPageSize + idx;
                    return (
                      <tr
                        key={app.id}
                        className="group transition-colors hover:bg-slate-50/70"
                      >
                        {/* # */}
                        <td className="py-3.5 px-4 text-center text-xs font-medium text-slate-400">
                          {globalIdx + 1}
                        </td>

                        {/* Name with Avatar & Email */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${app.avatarBg} ${app.avatarText} ${app.avatarBorder}`}
                            >
                              {app.avatarInitials}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 text-sm">
                                {app.name}
                              </div>
                              <div className="text-xs text-slate-400">
                                {app.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Brand Name */}
                        <td className="py-3.5 px-4 text-slate-700 text-sm font-medium">
                          {app.brandName}
                        </td>

                        {/* Phone Number */}
                        <td className="py-3.5 px-4 text-slate-700 text-sm font-medium">
                          {app.phoneNumber}
                        </td>

                        {/* Prosite URL */}
                        <td className="py-3.5 px-4">
                          <a
                            href={`https://${app.prositeUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline inline-flex items-center gap-1"
                          >
                            {app.prositeUrl}
                          </a>
                        </td>

                        {/* Actions: Approve & Reject Buttons */}
                        <td className="py-3.5 px-4 text-right pr-6">
                          <div className="inline-flex items-center gap-2">
                            {/* Approve */}
                            <button
                              type="button"
                              onClick={() => {
                                setApproveTarget(app);
                                setOpenApproveModal(true);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200/50 hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs active:scale-98"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              <span>Approve</span>
                            </button>

                            {/* Reject - Opens Reject Application Modal */}
                            <button
                              type="button"
                              onClick={() => handleOpenRejectModal(app)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 border border-rose-200/50 hover:bg-rose-100 transition-colors cursor-pointer shadow-2xs active:scale-98"
                            >
                              <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile Card List View - Only on mobile */}
        <div className={activeTab === "active" ? "block space-y-3 p-3 md:hidden" : "block md:hidden"}>
          {activeTab === "active" ? (
            loading ? (
              <div className="py-12 text-center text-slate-400">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-orange-500" />
                <p className="mt-2 text-xs font-medium">Loading CSP partners…</p>
              </div>
            ) : paginatedActiveRows.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <Package className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  No CSP partners found
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {searchQuery
                    ? "Try clearing your search query."
                    : "Enroll a Premium customer to add your first partner."}
                </p>
              </div>
            ) : (
              paginatedActiveRows.map((row, idx) => {
                const globalIdx = (currentPage - 1) * partnersPageSize + idx;
                const partnerName =
                  row.customer?.name || row.displayName || "Partner";
                const brandName =
                  row.vendor?.companyName ||
                  row.vendor?.name ||
                  row.label ||
                  "Brand";
                const mobile =
                  row.mobile ||
                  row.customer?.mobile ||
                  row.vendor?.mobile ||
                  "";
                const { initials, palette } = getAvatar(partnerName, globalIdx);

                const withdrawableAmt = partnerEarnings(row);
                const salesAmt = partnerSales(row);
                const payoutAmt = partnerPayouts(row);
                const prodCount = productCounts[row._id] ?? 0;

                return (
                  <div
                    key={row._id}
                    onClick={() => openPartnerDetails(row)}
                    className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs transition hover:border-slate-300 active:bg-slate-50/70"
                  >
                    {/* Top Row: Avatar, Partner Name, Brand, Index, Status */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${palette.bg} ${palette.text} ${palette.border}`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate text-sm font-bold text-slate-900">
                              {partnerName}
                            </span>
                            <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                              {getRowMembershipLabel(row)}
                            </span>
                            <span className="shrink-0 text-[10px] font-mono text-slate-400">
                              #{globalIdx + 1}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 font-medium truncate block mt-0.5">
                            {brandName !== "—" ? brandName : "CSP Seller"}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${
                          row.status === "inactive"
                            ? "bg-rose-50 text-rose-700 ring-rose-200/60"
                            : "bg-emerald-50 text-emerald-700 ring-emerald-200/60"
                        }`}
                      >
                        {row.status === "inactive" ? "Inactive" : "Active"}
                      </span>
                    </div>

                    {/* Metrics Grid: Sales, Earnings, Payouts */}
                    <div className="mt-3.5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center text-xs">
                      <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100/80">
                        <span className="block text-[10px] uppercase font-bold text-slate-400">
                          Sales
                        </span>
                        <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                          ₹{salesAmt.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100/80">
                        <span className="block text-[10px] uppercase font-bold text-slate-400">
                          Earnings
                        </span>
                        <span className="text-xs font-bold text-emerald-700 mt-0.5 block">
                          ₹{withdrawableAmt.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100/80">
                        <span className="block text-[10px] uppercase font-bold text-slate-400">
                          Payouts
                        </span>
                        <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                          ₹{payoutAmt.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    {/* Meta Details: Mobile & Premium Membership Expiry */}
                    {(() => {
                      const exp = getRowMembershipExpiry(row);
                      return (
                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Phone size={12} className="text-slate-400 shrink-0" />
                            <span>{mobile || "No phone"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-slate-500 font-medium">Expire on</span>
                            <span className="text-slate-600 font-medium">
                              {exp.dateText}
                            </span>
                          </div>
                        </div>
                      );
                    })()} 

                    {/* Action Buttons Row */}
                    <div
                      className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openProductsModal(row)}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                        >
                          <Package size={13} />
                          <span>Products ({prodCount})</span>
                        </button>

                        {mobile && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(mobile, "Mobile number")}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                            title="Copy phone"
                          >
                            <Copy size={12} />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Can anyOf={[PERMISSIONS.CSP_WRITE, PERMISSIONS.CUSTOMER_UPDATE]}>
                          <button
                            type="button"
                            onClick={() => toggleStatus(row)}
                            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition cursor-pointer ${
                              row.status === "inactive"
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                            }`}
                          >
                            {row.status === "inactive" ? "Activate" : "Deactivate"}
                          </button>
                        </Can>

                        <button
                          type="button"
                          onClick={() => openPartnerDetails(row)}
                          className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2.5 py-1.5 text-[11px] font-semibold text-[#ff5a36] hover:bg-orange-100 transition cursor-pointer"
                          title="View details"
                        >
                          <Eye size={13} />
                          <span>Details</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            paginatedApplications.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <Package className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  No CSP applications found
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {searchQuery
                    ? "Try clearing your search query."
                    : "No pending partner applications."}
                </p>
              </div>
            ) : (
              paginatedApplications.map((app) => {
                const phone = formatApplicantPhone(app.phoneNumber);
                const site = String(app.prositeUrl || "")
                  .replace(/^https?:\/\//i, "")
                  .replace(/\/$/, "");

                return (
                  <div
                    key={app.id}
                    className="flex items-start gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0"
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold ${app.avatarBg} ${app.avatarText}`}
                    >
                      {app.avatarInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{app.name}</p>
                      {app.brandName ? (
                        <p className="truncate text-xs text-slate-500">{app.brandName}</p>
                      ) : null}
                      {phone ? (
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-600">
                          <Phone size={12} className="shrink-0 text-slate-400" />
                          <span>{phone}</span>
                        </p>
                      ) : null}
                      {site ? (
                        <a
                          href={`https://${site}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 block truncate text-xs font-medium text-blue-600"
                        >
                          {site}
                        </a>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setApproveTarget(app);
                          setOpenApproveModal(true);
                        }}
                        className="inline-flex items-center justify-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenRejectModal(app)}
                        className="inline-flex items-center justify-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-500"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>

        {/* ── 6. Pagination Bar ──────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3.5 border-t border-slate-100 text-xs text-slate-500">
          <div>
            {activeTab === "active" ? (
              <>
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {startPartnerRecord}–{endPartnerRecord}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">
                  {sortedActiveRows.length}
                </span>{" "}
                partners
              </>
            ) : (
              <>
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {startAppRecord}–{endAppRecord}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">
                  {filteredApplications.length}
                </span>{" "}
                applications
              </>
            )}
          </div>

          <div className="flex items-center gap-1 self-center sm:self-auto">
            {/* Prev */}
            <button
              type="button"
              disabled={
                activeTab === "active" ? currentPage === 1 : currentAppPage === 1
              }
              onClick={() => {
                if (activeTab === "active") {
                  setCurrentPage((p) => Math.max(p - 1, 1));
                } else {
                  setCurrentAppPage((p) => Math.max(p - 1, 1));
                }
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            {/* Page Numbers */}
            {Array.from(
              {
                length:
                  activeTab === "active" ? totalPartnerPages : totalAppPages,
              },
              (_, i) => i + 1,
            ).map((pageNum) => {
              const isActive =
                activeTab === "active"
                  ? currentPage === pageNum
                  : currentAppPage === pageNum;
  return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => {
                    if (activeTab === "active") setCurrentPage(pageNum);
                    else setCurrentAppPage(pageNum);
                  }}
                  className={`flex h-7 min-w-[28px] items-center justify-center rounded-lg px-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? "bg-orange-50 text-orange-600 border border-orange-200"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {/* Next */}
            <button
              type="button"
              disabled={
                activeTab === "active"
                  ? currentPage === totalPartnerPages
                  : currentAppPage === totalAppPages
              }
              onClick={() => {
                if (activeTab === "active") {
                  setCurrentPage((p) => Math.min(p + 1, totalPartnerPages));
                } else {
                  setCurrentAppPage((p) => Math.min(p + 1, totalAppPages));
                }
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 7. Reject Application Modal (Pure Frontend UI) ───────────── */}
      {rejectModal.open && rejectModal.app && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500 border border-rose-100">
                  <XCircle className="h-5 w-5" />
                </div>
        <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Reject Application
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Please provide a reason for rejecting this application.
          </p>
        </div>
              </div>
              <button
                type="button"
                onClick={handleCloseRejectModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Applicant Summary Card */}
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${rejectModal.app.avatarBg} ${rejectModal.app.avatarText} ${rejectModal.app.avatarBorder}`}
                >
                  {rejectModal.app.avatarInitials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 leading-tight">
                    {rejectModal.app.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {rejectModal.app.brandName}
                  </div>
                </div>
              </div>

              {/* Prosite Link Badge */}
              <a
                href={`https://${rejectModal.app.prositeUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50/80 px-2.5 py-1 text-xs font-medium text-blue-600 hover:underline hover:bg-blue-100/70 transition-colors"
              >
                <Link2 className="h-3 w-3 shrink-0" />
                <span>{rejectModal.app.prositeUrl}</span>
              </a>
            </div>

            {/* Reason for Rejection Dropdown */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Reason for Rejection <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
          <select
                  value={rejectModal.reason}
            onChange={(e) =>
                    setRejectModal((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-10 text-xs sm:text-sm text-slate-700 focus:border-[#ff5a36] focus:outline-none focus:ring-1 focus:ring-[#ff5a36] cursor-pointer"
                >
                  <option value="" disabled>
                    Select a reason
                  </option>
                  {REJECTION_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
          </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Additional Notes Textarea */}
            <div className="mt-3.5">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Additional Notes (Optional)
              </label>
              <div className="relative">
                <textarea
                  maxLength={200}
                  rows={3}
                  value={rejectModal.notes}
                  onChange={(e) =>
                    setRejectModal((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="Add any additional details..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs sm:text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#ff5a36] focus:outline-none focus:ring-1 focus:ring-[#ff5a36] resize-none"
                />
                <div className="text-right text-[11px] text-slate-400 mt-1">
                  {rejectModal.notes.length}/200
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="mt-5 flex items-center justify-end gap-2.5">
            <button
              type="button"
                onClick={handleCloseRejectModal}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
                Cancel
            </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="rounded-xl bg-[#ff3b30] hover:bg-[#e03429] px-4.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer active:scale-98"
              >
                Reject Application
              </button>
        </div>
      </div>
        </div>
      )}

      <CspPartnerDetailsModal
        partner={detailsPartner}
        onClose={() => setDetailsPartner(null)}
      />

      {/* ── 8. Assigned Products Modal ───────────────────────────────── */}
      {productsModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 backdrop-blur-xs">
          <div
            className="flex w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
            style={{ maxHeight: "88vh" }}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 px-4 py-3.5 sm:px-6 sm:py-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Assigned Products
                </h2>
                {productsModal.csp && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    CSP Partner:{" "}
                    <span className="font-semibold text-slate-800">
                      {productsModal.csp.customer?.name ||
                        productsModal.csp.displayName ||
                        "—"}
                    </span>
                    {(productsModal.csp.mobile ||
                      productsModal.csp.customer?.mobile) && (
                      <span className="ml-1 text-slate-400">
                        ({productsModal.csp.mobile ||
                          productsModal.csp.customer?.mobile})
                      </span>
                    )}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeProductsModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5 sm:px-6 sm:py-4">
              {productsModal.loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                  <p className="mt-3 text-sm">Loading products…</p>
                </div>
              ) : productsModal.products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Package className="h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-600">
                    No products added
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Products this partner adds from the customer program appear here.
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile Card List View */}
                  <div className="space-y-3 block md:hidden">
                    {productsModal.products.map((p, idx) => {
                      const name = p.productName || p.serviceName || "—";
                      const itemType = p.itemType || p.type || "product";
                      const discountLabel =
                        p.discountValue && p.discountValue > 0
                          ? p.discountType === "percentage"
                            ? `${p.discountValue}% off`
                            : `₹${p.discountValue} off`
                          : null;
                      const hasVariants =
                        Array.isArray(p.variants) && p.variants.length > 0;
                      const imgUrl =
                        (typeof p.imageUrl === "string" && p.imageUrl.trim()
                          ? p.imageUrl.trim()
                          : null) ||
                        (Array.isArray(p.images) &&
                        p.images.length > 0 &&
                        typeof p.images[0] === "string" &&
                        p.images[0].trim()
                          ? p.images[0].trim()
                          : null) ||
                        (typeof p.image === "string" && p.image.trim()
                          ? p.image.trim()
                          : null);

                      return (
                        <div
                          key={p._id || idx}
                          className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs space-y-2.5"
                        >
                          {/* Top row: Image + Info + Price */}
                          <div className="flex items-start gap-3">
                            {/* Product Image */}
                            <div
                              onClick={() => imgUrl && setProductImagePreview(imgUrl)}
                              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 flex items-center justify-center ${
                                imgUrl ? "cursor-pointer active:scale-95 transition-transform" : ""
                              }`}
                              title={imgUrl ? "Click to view full image" : undefined}
                            >
                              {imgUrl ? (
                                <>
                                  <img
                                    src={imgUrl}
                                    alt={name}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).style.display = "none";
                                      const fallback = e.currentTarget.parentElement?.querySelector(".fallback-icon");
                                      if (fallback) fallback.classList.remove("hidden");
                                    }}
                                  />
                                  <div className="fallback-icon hidden flex h-full w-full items-center justify-center text-slate-300">
                                    <Package className="h-6 w-6 stroke-[1.5]" />
                                  </div>
                                </>
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-slate-300">
                                  <Package className="h-6 w-6 stroke-[1.5]" />
                                </div>
                              )}
                              <span className="absolute top-1 left-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900/60 text-[9px] font-bold text-white backdrop-blur-xs">
                                {idx + 1}
                              </span>
                            </div>

                            {/* Info + Price */}
                            <div className="min-w-0 flex-1 flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-bold text-slate-900 truncate" title={name}>
                                  {name}
                                </h4>

                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                                      itemType === "service"
                                        ? "bg-purple-100 text-purple-700"
                                        : "bg-blue-100 text-blue-700"
                                    }`}
                                  >
                                    {itemType}
                                  </span>
                                  {p.category && (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 truncate max-w-[110px]">
                                      {p.category}
                                    </span>
                                  )}
                                  {discountLabel && (
                                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200/60">
                                      {discountLabel}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="block text-sm font-extrabold text-emerald-600">
                                  ₹{Number(p.sellingPrice ?? 0).toLocaleString("en-IN")}
                                </span>
                                {p.purchasePrice !== undefined && Number(p.purchasePrice) > 0 && (
                                  <span className="block text-[10px] text-slate-400 font-medium">
                                    Cost: ₹{Number(p.purchasePrice).toLocaleString("en-IN")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Variants Section */}
                          {hasVariants && (
                            <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  Variants ({p.variants!.length})
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {p.variants!.map((v, vi) => (
                                  <div
                                    key={vi}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2 py-1 text-xs text-slate-700 border border-slate-200/80 shadow-2xs"
                                  >
                                    <span className="font-medium text-slate-800">{v.name}</span>
                                    <span className="text-slate-300">•</span>
                                    <span className="font-bold text-emerald-600">
                                      ₹{Number(v.sellingPrice ?? 0).toLocaleString("en-IN")}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          <th className="py-2.5 px-3 w-10">#</th>
                          <th className="py-2.5 px-3 w-16">Image</th>
                          <th className="py-2.5 px-3">Product Name</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3 text-right">Selling Price</th>
                          <th className="py-2.5 px-3 text-right">Purchase Price</th>
                          <th className="py-2.5 px-3 text-right">Discount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {productsModal.products.map((p, idx) => {
                          const name = p.productName || p.serviceName || "—";
                          const itemType = p.itemType || p.type || "product";
                          const discountLabel =
                            p.discountValue && p.discountValue > 0
                              ? p.discountType === "percentage"
                                ? `${p.discountValue}%`
                                : `₹${p.discountValue}`
                              : "—";
                          const imgUrl =
                            (typeof p.imageUrl === "string" && p.imageUrl.trim()
                              ? p.imageUrl.trim()
                              : null) ||
                            (Array.isArray(p.images) &&
                            p.images.length > 0 &&
                            typeof p.images[0] === "string" &&
                            p.images[0].trim()
                              ? p.images[0].trim()
                              : null) ||
                            (typeof p.image === "string" && p.image.trim()
                              ? p.image.trim()
                              : null);

                          return (
                            <tr key={p._id || idx} className="hover:bg-slate-50/70 transition">
                              <td className="py-3 px-3 text-xs text-slate-400">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-3">
                                <div
                                  onClick={() => imgUrl && setProductImagePreview(imgUrl)}
                                  className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 flex items-center justify-center ${
                                    imgUrl ? "cursor-pointer group" : ""
                                  }`}
                                  title={imgUrl ? "Click to view full image" : undefined}
                                >
                                  {imgUrl ? (
                                    <>
                                      <img
                                        src={imgUrl}
                                        alt={name}
                                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110"
                                        onError={(e) => {
                                          (e.currentTarget as HTMLImageElement).style.display = "none";
                                          const fallback = e.currentTarget.parentElement?.querySelector(".fallback-icon");
                                          if (fallback) fallback.classList.remove("hidden");
                                        }}
                                      />
                                      <div className="fallback-icon hidden flex h-full w-full items-center justify-center text-slate-300">
                                        <Package className="h-5 w-5 stroke-[1.5]" />
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                                      <Package className="h-5 w-5 stroke-[1.5]" />
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <span className="font-semibold text-slate-900 block">{name}</span>
                                {Array.isArray(p.variants) && p.variants.length > 0 && (
                                  <div className="mt-1.5 flex flex-wrap gap-1 max-w-sm">
                                    {p.variants.map((v, vi) => (
                                      <span
                                        key={vi}
                                        className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700 border border-slate-200/60"
                                      >
                                        <span>{v.name}</span>
                                        <span className="font-bold text-emerald-600">₹{v.sellingPrice}</span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                                    itemType === "service"
                                      ? "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-200/60"
                                      : "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200/60"
                                  }`}
                                >
                                  {itemType}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-slate-600 text-xs">
                                {p.category ? (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                    {p.category}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="py-3 px-3 text-right font-bold text-emerald-600">
                                ₹{Number(p.sellingPrice ?? 0).toLocaleString("en-IN")}
                              </td>
                              <td className="py-3 px-3 text-right text-slate-500 font-medium">
                                ₹{Number(p.purchasePrice ?? 0).toLocaleString("en-IN")}
                              </td>
                              <td className="py-3 px-3 text-right text-slate-500 text-xs">
                                {discountLabel}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-6 sm:py-3 bg-slate-50/50">
              <p className="text-xs font-medium text-slate-500">
                {productsModal.products.length} product
                {productsModal.products.length !== 1 ? "s" : ""} added
              </p>
              <button
                type="button"
                onClick={closeProductsModal}
                className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for Product Image */}
      {productImagePreview && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs"
          onClick={() => setProductImagePreview(null)}
        >
          <div
            className="relative max-h-[85vh] max-w-lg overflow-hidden rounded-2xl bg-white p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setProductImagePreview(null)}
              className="absolute top-3 right-3 z-10 rounded-full bg-slate-900/60 p-1.5 text-white hover:bg-slate-900/80 transition"
              aria-label="Close image preview"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={productImagePreview}
              alt="Product preview"
              className="max-h-[80vh] w-full rounded-xl object-contain bg-slate-50"
            />
          </div>
        </div>
      )}

      {/* ── 9. Enroll CSP Partner Modal ─────────────────────────────── */}
      {showEnroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Add CSP Partner
            </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Select a{" "}
                  <span className="font-semibold text-orange-600">Premium</span>{" "}
                  customer to enroll as a CSP partner. A linked vendor account is
                  created automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEnrollModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Premium Customer *
            </label>
            <div ref={searchWrapRef} className="relative">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setDropdownOpen(true);
                    if (selectedCustomerId) setSelectedCustomerId("");
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  placeholder="Search by name, mobile, or email..."
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-16 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  autoComplete="off"
                />
                  <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  {(selectedCustomerId || customerSearch) && (
                    <button
                      type="button"
                      onClick={clearSelectedCustomer}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      title="Clear"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </div>
              </div>

              {dropdownOpen && (
                  <div className="absolute z-50 mt-1.5 max-h-56 w-full overflow-auto rounded-xl border border-slate-100 bg-white shadow-xl">
                  {loadingCustomers ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                        <Loader2 className="mx-auto h-4 w-4 animate-spin text-orange-500 mb-1" />
                      Loading Premium customers…
                    </div>
                  ) : filteredCustomers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      {availableCustomers.length === 0
                          ? "No eligible Premium customers available."
                          : "No matches found."}
                    </div>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <button
                        key={customer._id}
                        type="button"
                        onClick={() => handleSelectCustomer(customer)}
                          className={`flex w-full flex-col border-b border-slate-50 p-2.5 text-left last:border-0 hover:bg-slate-50 transition-colors ${
                          selectedCustomerId === customer._id
                              ? "bg-orange-50"
                            : ""
                        }`}
                      >
                          <span className="text-xs font-semibold text-slate-800">
                          {customer.name || "Customer"}
                        </span>
                          <span className="text-[11px] text-slate-400">
                          {customer.mobile || "No mobile"}
                            {customer.email ? ` · ${customer.email}` : ""} ·
                            Premium
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {selectedCustomer && (
                <div className="mt-2.5 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Selected: {selectedCustomer.name} (
                    {selectedCustomer.mobile || "No mobile"})
                  </span>
                </div>
              )}

              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Atives Prosite URL *
                </label>
                <input
                  type="text"
                  value={prositeUrl}
                  onChange={(e) => setPrositeUrl(e.target.value)}
                  placeholder="1atives.com/pro/yourname"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  autoComplete="off"
                />
              </div>

            {!loadingCustomers && availableCustomers.length === 0 && (
                <div className="mt-3 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-700">
                {customers.length === 0
                    ? "No Premium customers found. Upgrade customers to Premium membership to enroll them."
                    : "All Premium customers are already enrolled as CSP partners."}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={closeEnrollModal}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                disabled={enrolling}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEnroll}
                disabled={enrolling || !selectedCustomerId || !prositeReady}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#ff5a36] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#ea4824] disabled:cursor-not-allowed disabled:opacity-50 transition-all cursor-pointer"
              >
                {enrolling ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Enrolling…</span>
                  </>
                ) : (
                  <span>Add Partner</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <ApproveCSPModal
        isOpen={openApproveModal}
        application={approveTarget}
        onClose={() => {
          setOpenApproveModal(false);
          setApproveTarget(null);
        }}
        onApprove={handleApproveCSP}
        onReject={() => {
          if (approveTarget) handleOpenRejectModal(approveTarget);
        }}
      />
    </div>
  );
}

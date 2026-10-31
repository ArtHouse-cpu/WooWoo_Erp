import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import {
  Eye,
  Search,
  Edit,
  XCircle,
  Trash2,
  Download,
  Ellipsis,
  ArrowUpCircle,
  MessageCircle,
  SlidersHorizontal,
  ArrowUpDown,
  FileText,
  Home,
  FileCheck2,
  Package,
  Users,
  ChevronDown,
  X,
  CreditCard,
  ChevronRight,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  handleDeleteSubscription,
  handleGetMemberships,
  handleGetAllSubscriptions,
  handleSendMembershipRenewalWhatsApp,
  handleUpdateSubscription,
} from "@/services/apiClient";
import DuePaymentModal from "../components/invoice/Modal/DuePaymentModal";
import { downloadInvoicePdf, getInvoicePdfBlob } from "@/utils/pdfGenerator";
import {
  buildWoowooInvoiceWhatsAppMessage,
  normalizeIndianWhatsAppDigits,
  resolveHostedInvoiceLink,
} from "@/utils/whatsappInvoiceShare";
import CreateSubscriptionScreen from "./CreateSubscriptionScreen";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";
import {
  DATE_PRESET_OPTIONS,
  rangeForPreset,
  type DatePreset,
} from "@/utils/datePresets";

type SubscriptionStatus =
  | "active"
  | "completed"
  | "expired"
  | "error"
  | "cancelled"
  | "inactive";

type SubscriptionRow = {
  id: number;
  amount: number;
  dueAmount: number;
  subscriptionCode: string;
  customer: string;
  phone: string;
  period: string;
  repeatUnit: string;
  repeatEvery: string;
  invoiceCount: number;
  upcomingOn: string;
  upcomingTime: string;
  status: SubscriptionStatus;
  subscriptionType: string;
  _id: string;
  raw: any;
  lastRenewalReminderAt?: string;
  lastRenewalReminderStatus?: string;
};

function subscriptionDueAmount(raw: any): number {
  const breakdown = raw?.paymentBreakdown;
  if (breakdown && breakdown.dueAmount != null && breakdown.dueAmount !== "") {
    return Math.max(0, Number(breakdown.dueAmount) || 0);
  }
  const status = String(raw?.paymentStatus ?? "").toLowerCase();
  if (status === "partial" || status === "due") {
    const paid = Number(breakdown?.paidAmount ?? 0);
    const total = Number(raw?.grandTotal ?? raw?.amount ?? 0);
    return Math.max(0, total - paid);
  }
  return 0;
}

const formatInr = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function toDateYmd(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Prefer invoiceDate only — same field as GET /subscriptions & dashboard membership. */
function subscriptionRowDateYmd(row: SubscriptionRow): string | null {
  const raw = row.raw as Record<string, unknown> | undefined;
  const value = raw?.invoiceDate;
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (!Number.isNaN(d.getTime())) return toDateYmd(d);
  return null;
}

const RENEWAL_SOON_DAYS = 30;

function daysUntilEnd(raw: any): number | null {
  const endDateRaw = raw?.endDate ?? raw?.dueDate;
  if (!endDateRaw) return null;
  const endDate = new Date(endDateRaw);
  if (Number.isNaN(endDate.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  return Math.ceil(
    (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

/** Expired or expiring within RENEWAL_SOON_DAYS — matches backend eligibility */
function isRenewalReminderEligible(row: SubscriptionRow): boolean {
  if (row.status === "cancelled" || row.status === "error") return false;
  if (row.status === "expired") return true;
  const days = daysUntilEnd(row.raw);
  if (days == null) return false;
  return days <= RENEWAL_SOON_DAYS;
}

const tabs: Array<SubscriptionStatus | "all"> = [
  "all",
  "active",
  "inactive",
  "expired",
  "cancelled",
];

function paymentStatusForWhatsApp(
  raw: Record<string, unknown>,
  rowStatus: string,
): string {
  const paymentStatus = String(raw.paymentStatus ?? "").toLowerCase();
  if (paymentStatus === "full") return "Paid";
  if (paymentStatus === "partial") return "Partially Paid";
  return rowStatus;
}

function formatCardDateTime(raw: any, fallbackDate?: string): string {
  const dateVal = raw?.createdAt || raw?.invoiceDate || fallbackDate;
  if (!dateVal) return fallbackDate || "";
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return fallbackDate || "";

  const shortDate = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const shortTime = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${shortDate}, ${shortTime}`;
}

function formatCompactCurrency(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)}Cr`;
  }
  if (abs >= 100000) {
    return `₹${(val / 100000).toFixed(2)}L`;
  }
  return `₹${val.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function getInvoiceCategories(raw: any): string[] {
  if (!raw) return [];
  const categories = new Set<string>();

  // 1. Check notes
  const notes = String(raw.notes || "").toLowerCase();
  if (notes.includes("food bill") || notes.includes("food")) {
    categories.add("Food");
  }
  if (notes.includes("space booking") || notes.includes("space")) {
    categories.add("Space");
  }

  // 2. Check direct category fields
  const directCat = String(
    raw.invoiceCategory ||
      raw.category ||
      raw.billType ||
      raw.sourceType ||
      raw.subscriptionType ||
      raw.membershipType ||
      "",
  ).toLowerCase();
  if (directCat.includes("food")) categories.add("Food");
  if (directCat.includes("space")) categories.add("Space");
  if (directCat.includes("service")) categories.add("Service");
  if (directCat.includes("membership") || directCat.includes("subscription")) {
    categories.add("Membership");
  }

  // 3. Check items
  const items = Array.isArray(raw.items) ? raw.items : [];
  for (const item of items) {
    const cat = String(
      item.lineCategory || item.sourceType || item.category || "",
    ).toLowerCase();
    const name = String(item.productName || item.name || "").toLowerCase();
    if (cat === "food" || cat === "foods" || name.includes("food") || item.isFood) {
      categories.add("Food");
    } else if (cat === "space" || cat === "spaces" || name.includes("space") || item.isSpace) {
      categories.add("Space");
    } else if (cat === "service" || cat === "services") {
      categories.add("Service");
    } else if (/membership|subscription/.test(cat) || /membership|subscription/.test(name)) {
      categories.add("Membership");
    }
  }

  return Array.from(categories);
}

export default function SubscriptionScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SubscriptionStatus | "all">("all");
  // Mobile specific state
  const [mobileSort, setMobileSort] = useState<
    "default" | "amount_desc" | "amount_asc" | "date_desc" | "date_asc"
  >("default");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [mobilePage, setMobilePage] = useState(1);
  const [showTotalDetails, setShowTotalDetails] = useState(false);
  const [search, setSearch] = useState("");
  const [memberships, setMemberships] = useState<
    Array<{ planId: string; displayName: string; status: string }>
  >([]);
  const [subscriptionTypeFilter, setSubscriptionTypeFilter] = useState("all");
  const [expiryFilter, setExpiryFilter] = useState("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [data, setData] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedActionRow, setSelectedActionRow] =
    useState<SubscriptionRow | null>(null);
  const [dueActionRow, setDueActionRow] = useState<SubscriptionRow | null>(null);
  const [duePayRow, setDuePayRow] = useState<SubscriptionRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<
    "create" | "edit" | "view" | "upgrade" | "bulk"
  >("create");
  const [modalData, setModalData] = useState<any>(null);
  const [membershipPlans, setMembershipPlans] = useState<
    Array<{
      planId: string;
      displayName: string;
      priority: number;
      _id?: string;
    }>
  >([]);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const fetchMemberships = async () => {
      try {
        const response = await handleGetMemberships({ status: "All" });
        const list = Array.isArray(response?.memberships)
          ? response.memberships
          : [];
        setMemberships(
          list
            .map((membership: any) => ({
              planId: String(membership?.planId ?? "")
                .trim()
                .toLowerCase(),
              displayName: String(membership?.displayName ?? "").trim(),
              status: String(membership?.status ?? "Active"),
            }))
            .filter((membership: { planId: string; displayName: string }) =>
              Boolean(membership.planId && membership.displayName),
            ),
        );
        setMembershipPlans(
          list.map((membership: any) => ({
            _id: String(membership?._id ?? ""),
            planId: String(membership?.planId ?? "")
              .trim()
              .toLowerCase(),
            displayName: String(membership?.displayName ?? "").trim(),
            priority: Math.max(0, Number(membership?.priority ?? 0) || 0),
          })),
        );
      } catch {
        setMemberships([]);
        setMembershipPlans([]);
      }
    };
    void fetchMemberships();
  }, []);

  const resolveRowPriority = (raw: any): number => {
    const stored = Number(raw?.priority ?? 0);
    if (Number.isFinite(stored) && stored > 0) return stored;
    const type = String(raw?.membershipType ?? raw?.membershipPlanId ?? "")
      .trim()
      .toLowerCase();
    if (!type || type.includes("junior") || type.includes("junoir")) return 0;
    const match = membershipPlans.find(
      (p) =>
        p.planId === type ||
        p.displayName.toLowerCase().includes(type) ||
        String(raw?.membershipId ?? "") === p._id,
    );
    return Math.max(0, Number(match?.priority ?? 0) || 0);
  };

  const handleAction = async (
    action: "view" | "edit" | "delete" | "upgrade",
  ) => {
    if (!selectedActionRow) return;
    const { _id, raw } = selectedActionRow;

    if (action === "view") {
      setModalMode("view");
      setModalData(raw);
      setIsModalOpen(true);
    } else if (action === "edit") {
      setModalMode("edit");
      setModalData(raw);
      setIsModalOpen(true);
    } else if (action === "upgrade") {
      if (selectedActionRow.status === "cancelled") {
        Swal.fire(
          "Cannot upgrade",
          "Cancelled subscriptions cannot be upgraded.",
          "warning",
        );
        return;
      }
      const currentPriority = resolveRowPriority(raw);
      setModalMode("upgrade");
      setModalData({
        ...raw,
        priority: currentPriority,
      });
      setIsModalOpen(true);
    } else if (action === "delete") {
      const confirm = await Swal.fire({
        title: "Delete Subscription?",
        text: "This action cannot be undone.",
        icon: "error",
        showCancelButton: true,
        confirmButtonText: "Yes, Delete",
      });
      if (confirm.isConfirmed) {
        try {
          await handleDeleteSubscription(_id);
          Swal.fire("Deleted", "Subscription deleted successfully.", "success");
          fetchSubscriptions();
        } catch {
          Swal.fire("Error", "Could not delete subscription.", "error");
        }
      }
    }
    setSelectedActionRow(null);
  };

  const sendRenewalReminder = async (row: SubscriptionRow) => {
    if (!row._id || sendingReminderId) return;
    if (!isRenewalReminderEligible(row)) {
      await Swal.fire(
        "Not eligible",
        "Reminders are only for expired or soon-to-expire memberships.",
        "info",
      );
      return;
    }
    if (!String(row.phone || "").trim()) {
      await Swal.fire(
        "No phone number",
        "This member has no WhatsApp / mobile number on file.",
        "warning",
      );
      return;
    }

    const confirm = await Swal.fire({
      title: "Send WhatsApp reminder?",
      html: `Send <b>membershiprenewal</b> reminder to <b>${row.customer}</b> (${row.phone})?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Send reminder",
      confirmButtonColor: "#16a34a",
    });
    if (!confirm.isConfirmed) return;

    setSendingReminderId(row._id);
    Swal.fire({
      title: "Sending...",
      text: "Sending WhatsApp renewal reminder",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const res = await handleSendMembershipRenewalWhatsApp(row._id);
      await Swal.fire(
        "Sent",
        res?.message || "WhatsApp reminder sent successfully.",
        "success",
      );
      setData((prev) =>
        prev.map((r) =>
          r._id === row._id
            ? {
                ...r,
                lastRenewalReminderAt:
                  res?.reminder?.lastRenewalReminderAt ||
                  new Date().toISOString(),
                lastRenewalReminderStatus:
                  res?.reminder?.lastRenewalReminderStatus || "success",
                raw: {
                  ...r.raw,
                  lastRenewalReminderAt:
                    res?.reminder?.lastRenewalReminderAt ||
                    new Date().toISOString(),
                  lastRenewalReminderStatus:
                    res?.reminder?.lastRenewalReminderStatus || "success",
                  lastRenewalReminderMessageId:
                    res?.reminder?.messageId || null,
                },
              }
            : r,
        ),
      );
    } catch (error: any) {
      await Swal.fire(
        "Send failed",
        error?.response?.data?.message ||
          error?.message ||
          "Could not send WhatsApp reminder. Please try again.",
        "error",
      );
    } finally {
      setSendingReminderId(null);
    }
  };

  const formatDate = (value?: string | Date) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (value?: string | Date) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toStatus = (raw: unknown): SubscriptionStatus => {
    const v = String(raw ?? "").toLowerCase();
    if (v === "completed") return "completed";
    if (v === "expired") return "expired";
    if (v === "error") return "error";
    if (v === "cancelled") return "cancelled";
    return "active";
  };

  /** True when membership end date is before today (calendar day). */
  const isEndDatePassed = (raw: any): boolean => {
    const endDateRaw = raw?.endDate ?? raw?.dueDate;
    if (!endDateRaw) return false;
    const endDate = new Date(endDateRaw);
    if (Number.isNaN(endDate.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    return endDate.getTime() < today.getTime();
  };

  const resolveDisplayStatus = (
    subscription: any,
    matchedPlanStatus?: string,
  ): SubscriptionStatus => {
    let status = toStatus(subscription?.status);
    if (status === "cancelled" || status === "error") return status;
    if (matchedPlanStatus === "Inactive") return "inactive";
    // Past end date counts as expired even if DB status is still "active"
    if (status === "expired" || isEndDatePassed(subscription)) return "expired";
    return status;
  };

  const fetchSubscriptions = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const [response, membershipRes] = await Promise.all([
        handleGetAllSubscriptions(
          search.trim(),
          signal,
          2000,
          fromDate || undefined,
          toDate || undefined,
        ),
        handleGetMemberships({ status: "All" }),
      ]);

      const membershipList = Array.isArray(membershipRes?.memberships)
        ? membershipRes.memberships.map((m: any) => ({
            planId: String(m?.planId ?? "")
              .trim()
              .toLowerCase(),
            status: String(m?.status ?? "Active"),
          }))
        : [];

      const subscriptions = Array.isArray(response?.subscriptions)
        ? response.subscriptions
        : [];

      const rows: SubscriptionRow[] = subscriptions.map(
        (subscription: any, index: number) => {
          const planId = String(
            subscription?.membershipPlanId ||
              subscription?.membershipType ||
              "",
          )
            .trim()
            .toLowerCase();
          const matchedPlan = membershipList.find(
            (m: any) => m.planId === planId,
          );

          const status = resolveDisplayStatus(
            subscription,
            matchedPlan?.status,
          );

          return {
            id: index + 1,
            amount: Number(
              subscription?.grandTotal ?? subscription?.amount ?? 0,
            ),
            dueAmount: subscriptionDueAmount(subscription),
            subscriptionCode: String(
              subscription?.subscriptionCode ??
                `SUB-${subscription?.subscriptionNumber ?? index + 1001}`,
            ),
            customer: String(
              subscription?.customerName ?? subscription?.name ?? "",
            ),
            phone: String(
              subscription?.customerPhone ??
                subscription?.mobile ??
                subscription?.phone ??
                "",
            ),
            period: `${formatDate(subscription?.startDate ?? subscription?.invoiceDate ?? subscription?.createdAt)} - ${formatDate(subscription?.endDate ?? subscription?.dueDate ?? subscription?.createdAt)}`,
            repeatUnit: String(subscription?.repeatUnit ?? "1 year"),
            repeatEvery: String(subscription?.repeatEvery ?? "1"),
            invoiceCount: Number(
              subscription?.invoiceCount ?? subscription?.noOfInvoices ?? 0,
            ),
            upcomingOn: formatDate(
              subscription?.upcomingDate ??
                subscription?.nextInvoiceDate ??
                subscription?.createdAt,
            ),
            upcomingTime: formatDateTime(
              subscription?.upcomingDate ??
                subscription?.nextInvoiceDate ??
                subscription?.createdAt,
            ),
            status,
            subscriptionType: String(
              subscription?.membershipType ||
                subscription?.items?.[0]?.productName ||
                "general",
            ).toLowerCase(),
            _id: String(subscription?._id ?? ""),
            raw: subscription,
            lastRenewalReminderAt: subscription?.lastRenewalReminderAt
              ? String(subscription.lastRenewalReminderAt)
              : undefined,
            lastRenewalReminderStatus: subscription?.lastRenewalReminderStatus
              ? String(subscription.lastRenewalReminderStatus)
              : undefined,
          };
        },
      );

      // Keep newest subscriptions first by createdAt
      rows.sort((a, b) => {
        const ta = new Date(a.raw?.createdAt ?? 0).getTime();
        const tb = new Date(b.raw?.createdAt ?? 0).getTime();
        if (Number.isFinite(tb) && Number.isFinite(ta) && tb !== ta) {
          return tb - ta;
        }
        const na = Number(a.raw?.subscriptionNumber ?? 0);
        const nb = Number(b.raw?.subscriptionNumber ?? 0);
        return nb - na;
      });
      rows.forEach((row, index) => {
        row.id = index + 1;
      });

      setData(rows);
    } catch (error) {
      if (
        (error as { name?: string; code?: string })?.name === "CanceledError" ||
        (error as { name?: string; code?: string })?.code === "ERR_CANCELED"
      ) {
        return;
      }
      console.error("Error fetching subscriptions:", error);
      setData([]);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    void fetchSubscriptions(controller.signal);
    return () => controller.abort();
    // Re-fetch when date range changes so API gets fromDate/toDate
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchSubscriptions closes over search/filters
  }, [fromDate, toDate]);

  const filteredData = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((row) => {
      const statusOk = activeTab === "all" || row.status === activeTab;
      const searchOk =
        !term ||
        row.subscriptionCode.toLowerCase().includes(term) ||
        row.customer.toLowerCase().includes(term) ||
        row.phone.toLowerCase().includes(term);

      const typeOk =
        subscriptionTypeFilter === "all" ||
        row.subscriptionType === subscriptionTypeFilter;

      const expiryOk = (() => {
        if (expiryFilter === "all") return true;

        // Explicit expired filter: past end date OR status already expired
        if (expiryFilter === "expired") {
          return row.status === "expired" || isEndDatePassed(row.raw);
        }

        const endDateRaw = row.raw?.endDate ?? row.raw?.dueDate;
        if (!endDateRaw) return false;

        const endDate = new Date(endDateRaw);
        if (Number.isNaN(endDate.getTime())) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil(
          (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );

        // Upcoming-expiry filters only show memberships that are still valid
        if (diffDays < 0) return false;

        if (expiryFilter === "day") return diffDays <= 1;
        if (expiryFilter === "week") return diffDays <= 7;
        if (expiryFilter === "month") return diffDays <= 30;
        if (expiryFilter === "year") return diffDays <= 365;

        return true;
      })();

      const dateOk = (() => {
        if (!fromDate && !toDate) return true;
        const ymd = subscriptionRowDateYmd(row);
        if (!ymd) return false;
        if (fromDate && ymd < fromDate) return false;
        if (toDate && ymd > toDate) return false;
        return true;
      })();

      return statusOk && searchOk && typeOk && expiryOk && dateOk;
    });
  }, [
    activeTab,
    data,
    search,
    subscriptionTypeFilter,
    expiryFilter,
    fromDate,
    toDate,
  ]);

  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === "custom") return;
    const range = rangeForPreset(preset);
    setFromDate(range.from);
    setToDate(range.to);
  };

  const handleWhatsAppShare = async (subscription: SubscriptionRow) => {
    const raw = (subscription.raw ?? {}) as Record<string, unknown>;
    const customerName =
      String(
        subscription.customer || raw.customerName || "Customer",
      ).trim() || "Customer";

    const docCode = String(
      raw.subscriptionCode ??
        subscription.subscriptionCode ??
        subscription.id,
    );
    const docLabel = "Subscription Invoice";
    const totalVal = Number(raw.grandTotal ?? subscription.amount ?? 0);
    const totalFormatted = `₹ ${totalVal.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    const paymentStatus = paymentStatusForWhatsApp(
      raw,
      String(subscription.status),
    );
    const hostedLink = resolveHostedInvoiceLink(raw);

    const message = buildWoowooInvoiceWhatsAppMessage({
      customerName,
      docLabel,
      docCode,
      totalFormatted,
      paymentStatus,
      externalLink: hostedLink || undefined,
    });

    Swal.fire({
      title: "Preparing...",
      text: "Generating invoice PDF for WhatsApp",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    let blobPkg: { blob: Blob; filename: string } | null = null;
    try {
      blobPkg = await getInvoicePdfBlob(raw, "SUBSCRIPTION");
    } catch (error) {
      console.error(error);
    }
    Swal.close();

    const pdfFile =
      blobPkg &&
      new File([blobPkg.blob], blobPkg.filename, {
        type: "application/pdf",
      });

    const canSharePdf =
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      Boolean(pdfFile) &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [pdfFile!] });

    if (canSharePdf && pdfFile) {
      try {
        await navigator.share({
          text: message,
          files: [pdfFile],
        });
        return;
      } catch (error) {
        const aborted =
          error instanceof Error && error.name === "AbortError";
        if (aborted) return;
        console.warn(
          "Share sheet failed, opening WhatsApp Web:",
          error,
        );
      }
    }

    const digits = normalizeIndianWhatsAppDigits(
      String(subscription.phone || raw.customerPhone || ""),
    );
    const waBase = digits
      ? `https://wa.me/${digits}`
      : "https://wa.me/";
    window.open(
      `${waBase}?text=${encodeURIComponent(message)}`,
      "_blank",
    );

    if (blobPkg) {
      const url = URL.createObjectURL(blobPkg.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = blobPkg.filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  };

  const handleDownloadInvoice = async (subscription: SubscriptionRow) => {
    try {
      Swal.fire({
        title: "Generating PDF...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      await downloadInvoicePdf(subscription.raw, "SUBSCRIPTION");
      Swal.close();
    } catch {
      Swal.fire("Error", "Could not generate PDF.", "error");
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "customer",
        header: "Customer",
        Cell: ({ row }: { row: { original: SubscriptionRow } }) => (
          <div>
            <div className="font-medium text-gray-800">
              {row.original.customer}
            </div>
            <div className="text-xs text-gray-500">{row.original.phone}</div>
          </div>
        ),
        size: 180,
      },
      {
        accessorKey: "amount",
        header: "Amount",
        Cell: ({ row }: { row: { original: SubscriptionRow } }) => (
          <span className="font-semibold text-gray-800">
            {`₹ ${row.original.amount.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}`}
          </span>
        ),
        size: 120,
      },
      {
        accessorKey: "dueAmount",
        header: "Due",
        Cell: ({ row }: { row: { original: SubscriptionRow } }) => {
          const due = Number(row.original.dueAmount) || 0;
          if (due <= 0) {
            return <span className="text-xs text-slate-400">—</span>;
          }
          return (
            <button
              type="button"
              onClick={() => setDueActionRow(row.original)}
              className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 transition hover:bg-amber-100"
            >
              {formatInr(due)}
            </button>
          );
        },
        size: 120,
      },
      {
        accessorKey: "status",
        header: "Status",
        Cell: ({ cell }: { cell: { getValue: () => SubscriptionStatus } }) => {
          const value = cell.getValue();
          const badgeClass =
            value === "completed"
              ? "bg-yellow-100 text-yellow-700"
              : value === "active"
                ? "bg-green-100 text-green-700"
                : value === "inactive"
                  ? "bg-amber-100 text-amber-700 border border-amber-200"
                  : value === "expired"
                    ? "bg-slate-100 text-slate-700"
                    : value === "error"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-700";
          return (
            <span
              className={`px-2.5 py-1 text-xs font-semibold rounded-md ${badgeClass}`}
            >
              {value}
            </span>
          );
        },
        size: 120,
      },
      {
        accessorKey: "subscriptionType",
        header: "Subscription",
        Cell: ({ cell }: { cell: { getValue: () => string } }) => {
          const value = cell.getValue();

          const badgeClass =
            value === "premium"
              ? "bg-purple-100 text-purple-700"
              : value === "special"
                ? "bg-blue-100 text-blue-700"
                : value === "junior"
                  ? "bg-orange-100 text-orange-700"
                  : value === "general"
                    ? "bg-gray-100 text-gray-700"
                    : "bg-slate-100 text-slate-600";

          return (
            <span
              className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize tracking-wide ${badgeClass}`}
            >
              {value}
            </span>
          );
        },
        size: 140,
      },
      {
        accessorKey: "subscriptionCode",
        header: "Subscription Invoice",
        Cell: ({ row }: { row: { original: SubscriptionRow } }) => (
          <div>
            <div className="font-medium text-gray-800">
              {row.original.subscriptionCode}
            </div>
          </div>
        ),
        size: 160,
      },
      {
        accessorKey: "period",
        header: "Start Date - End Date",
        Cell: ({ row }: { row: { original: SubscriptionRow } }) => (
          <div>
            <div className="font-medium text-gray-800">
              {row.original.period}
            </div>
            <div className="text-xs text-gray-500">
              Repeats every {row.original.repeatEvery} {row.original.repeatUnit}
            </div>
          </div>
        ),
        size: 220,
      },
      {
        accessorKey: "actions",
        header: "Actions",
        Cell: ({ row }: { row: { original: SubscriptionRow } }) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedActionRow(row.original)}
              className="flex items-center gap-1 rounded-md bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-200"
            >
              <Ellipsis size={14} />
            </button>
          </div>
        ),
        size: 120,
      },
      {
        accessorKey: "shareInvoice",
        header: "Share Invoice PDF",
        size: 240,
        Cell: ({ row }: { row: { original: SubscriptionRow } }) => {
          const subscription = row.original;

          const handleWhatsAppShare = async () => {
            const raw = (subscription.raw ?? {}) as Record<string, unknown>;
            const customerName =
              String(
                subscription.customer || raw.customerName || "Customer",
              ).trim() || "Customer";

            const docCode = String(
              raw.subscriptionCode ??
                subscription.subscriptionCode ??
                subscription.id,
            );
            console.log("docCode", docCode);
            const docLabel = "Subscription Invoice";
            const totalVal = Number(raw.grandTotal ?? subscription.amount ?? 0);
            const totalFormatted = `₹ ${totalVal.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`;
            const paymentStatus = paymentStatusForWhatsApp(
              raw,
              String(subscription.status),
            );
            const hostedLink = resolveHostedInvoiceLink(raw);

            const message = buildWoowooInvoiceWhatsAppMessage({
              customerName,
              docLabel,
              docCode,
              totalFormatted,
              paymentStatus,
              externalLink: hostedLink || undefined,
            });

            Swal.fire({
              title: "Preparing...",
              text: "Generating invoice PDF for WhatsApp",
              allowOutsideClick: false,
              didOpen: () => Swal.showLoading(),
            });

            let blobPkg: { blob: Blob; filename: string } | null = null;
            try {
              blobPkg = await getInvoicePdfBlob(raw, "SUBSCRIPTION");
            } catch (error) {
              console.error(error);
            }
            Swal.close();

            const pdfFile =
              blobPkg &&
              new File([blobPkg.blob], blobPkg.filename, {
                type: "application/pdf",
              });

            const canSharePdf =
              typeof navigator !== "undefined" &&
              typeof navigator.share === "function" &&
              Boolean(pdfFile) &&
              typeof navigator.canShare === "function" &&
              navigator.canShare({ files: [pdfFile!] });

            if (canSharePdf && pdfFile) {
              try {
                await navigator.share({
                  text: message,
                  files: [pdfFile],
                });
                return;
              } catch (error) {
                const aborted =
                  error instanceof Error && error.name === "AbortError";
                if (aborted) return;
                console.warn(
                  "Share sheet failed, opening WhatsApp Web:",
                  error,
                );
              }
            }

            const digits = normalizeIndianWhatsAppDigits(
              String(subscription.phone || raw.customerPhone || ""),
            );
            const waBase = digits
              ? `https://wa.me/${digits}`
              : "https://wa.me/";
            window.open(
              `${waBase}?text=${encodeURIComponent(message)}`,
              "_blank",
            );

            if (blobPkg) {
              const url = URL.createObjectURL(blobPkg.blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = blobPkg.filename;
              a.rel = "noopener";
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);

              await Swal.fire({
                icon: "info",
                title: "PDF downloaded",
                text: "Attach the downloaded PDF to your WhatsApp message (WhatsApp Web cannot auto-attach files).",
              });
            } else if (!hostedLink) {
              await Swal.fire({
                icon: "warning",
                title: "PDF unavailable",
                text: "Could not generate the invoice PDF. Try Download or add a hosted link from your server.",
              });
            }
          };

          const handleDownloadInvoice = async () => {
            try {
              Swal.fire({
                title: "Generating PDF...",
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
              });
              await downloadInvoicePdf(subscription.raw, "SUBSCRIPTION");
              Swal.close();
            } catch {
              Swal.fire("Error", "Could not generate PDF.", "error");
            }
          };

          const eligible = isRenewalReminderEligible(subscription);
          const sending = sendingReminderId === subscription._id;
          const lastSent = subscription.lastRenewalReminderAt
            ? formatDate(subscription.lastRenewalReminderAt)
            : "";

          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                {eligible ? (
                  <Can permission={PERMISSIONS.SUBSCRIPTION_UPDATE}>
                    <button
                      type="button"
                      title="Send WhatsApp renewal reminder"
                      disabled={sending || Boolean(sendingReminderId)}
                      onClick={() => void sendRenewalReminder(subscription)}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <MessageCircle size={14} />
                      {sending ? "Sending..." : "Remind"}
                    </button>
                  </Can>
                ) : null}
                <button
                  onClick={handleWhatsAppShare}
                  className="flex items-center gap-1 rounded-md bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-200"
                >
                  <img
                    src="https://cdn-icons-png.flaticon.com/512/733/733585.png"
                    alt="whatsapp"
                    className="h-4 w-4"
                  />
                </button>
                <button
                  onClick={handleDownloadInvoice}
                  className="flex items-center gap-1 rounded-md bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-200"
                >
                  <Download size={14} />
                </button>
              </div>
              {lastSent ? (
                <span className="text-[10px] text-slate-400">
                  Last reminder: {lastSent}
                  {subscription.lastRenewalReminderStatus
                    ? ` · ${subscription.lastRenewalReminderStatus}`
                    : ""}
                </span>
              ) : null}
            </div>
          );
        },
      },
    ],
    [sendingReminderId, membershipPlans],
  );

  const table = useMaterialReactTable({
    columns,
    data: filteredData,
    state: {
      isLoading: loading,
    },
    enableTopToolbar: false,
    enableBottomToolbar: true,
    enablePagination: true,
    enableColumnActions: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enableHiding: false,
    paginationDisplayMode: "pages",
    positionPagination: "bottom",
    initialState: {
      pagination: { pageIndex: 0, pageSize: 25 },
      density: "compact",
    },
    muiPaginationProps: {
      rowsPerPageOptions: [10, 25, 50, 100],
      showFirstButton: true,
      showLastButton: true,
      color: "primary",
      shape: "rounded",
      variant: "outlined",
      size: "small",
    },
    muiBottomToolbarProps: {
      sx: {
        backgroundColor: "#ffffff",
        borderTop: "1px solid #e5e7eb",
        minHeight: "56px",
      },
    },
    muiTableHeadCellProps: {
      sx: {
        fontWeight: 700,
        color: "#111827",
        fontSize: "12px",
        backgroundColor: "#f9fafb",
      },
    },
    muiTableBodyCellProps: {
      sx: {
        fontSize: "13px",
      },
    },
    muiTablePaperProps: {
      elevation: 0,
      square: false,
      style: {
        boxShadow: "none",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        overflow: "hidden",
      },
    },
    muiTableContainerProps: {
      sx: {
        maxWidth: "100%",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      },
    },
  });

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: data.length,
      active: 0,
      completed: 0,
      expired: 0,
      cancelled: 0,
    };
    for (const r of data) {
      const s = String(r.status || "").toLowerCase();
      if (counts[s] !== undefined) {
        counts[s]++;
      }
    }
    return counts;
  }, [data]);

  const totalDueAmount = useMemo(() => {
    return filteredData.reduce((sum, row) => sum + (row.dueAmount || 0), 0);
  }, [filteredData]);

  const mobileDisplayData = useMemo(() => {
    let list = filteredData;
    if (mobileSort === "default") return list;
    const sorted = [...list];
    if (mobileSort === "amount_desc") {
      return sorted.sort((a, b) => b.amount - a.amount);
    }
    if (mobileSort === "amount_asc") {
      return sorted.sort((a, b) => a.amount - b.amount);
    }
    if (mobileSort === "date_desc") {
      return sorted.sort(
        (a, b) =>
          new Date(String(b.raw?.invoiceDate || b.raw?.createdAt || 0)).getTime() -
          new Date(String(a.raw?.invoiceDate || a.raw?.createdAt || 0)).getTime(),
      );
    }
    if (mobileSort === "date_asc") {
      return sorted.sort(
        (a, b) =>
          new Date(String(a.raw?.invoiceDate || a.raw?.createdAt || 0)).getTime() -
          new Date(String(b.raw?.invoiceDate || b.raw?.createdAt || 0)).getTime(),
      );
    }
    return sorted;
  }, [filteredData, mobileSort]);

  useEffect(() => {
    setMobilePage(1);
  }, [activeTab, search, datePreset, fromDate, toDate, subscriptionTypeFilter, expiryFilter, mobileSort]);

  const paginatedMobileData = useMemo(() => {
    return mobileDisplayData.slice(0, mobilePage * 20);
  }, [mobileDisplayData, mobilePage]);

  const totalAmount = filteredData.reduce((sum, row) => sum + row.amount, 0);
  const activeAmount = filteredData
    .filter((row) => row.status === "active")
    .reduce((sum, row) => sum + row.amount, 0);
  const completedAmount = filteredData
    .filter((row) => row.status === "completed")
    .reduce((sum, row) => sum + row.amount, 0);
  const paidAmount = Math.max(0, totalAmount - totalDueAmount);

  const paymentModesBreakdown = useMemo(() => {
    const modes: Record<string, number> = {
      Cash: 0,
      UPI: 0,
      Card: 0,
      Wallet: 0,
      Other: 0,
    };

    for (const row of filteredData) {
      const raw = (row.raw || {}) as any;
      const pb = raw.paymentBreakdown;

      const hasPb =
        pb &&
        (Number(pb.cash || 0) > 0 ||
          Number(pb.upi || 0) > 0 ||
          Number(pb.card || 0) > 0 ||
          Number(pb.wallet || 0) > 0);

      if (hasPb) {
        modes.Cash += Number(pb.cash || 0);
        modes.UPI += Number(pb.upi || 0);
        modes.Card += Number(pb.card || 0);
        modes.Wallet += Number(pb.wallet || 0);
      } else {
        const m = String(
          raw.mode || raw.paymentMode || row.raw?.mode || "Cash",
        ).toUpperCase();
        const amt = Number(row.amount || 0);
        if (m.includes("CASH")) {
          modes.Cash += amt;
        } else if (m.includes("UPI")) {
          modes.UPI += amt;
        } else if (m.includes("CARD")) {
          modes.Card += amt;
        } else if (m.includes("WALLET")) {
          modes.Wallet += amt;
        } else {
          modes.Other += amt;
        }
      }
    }

    return modes;
  }, [filteredData]);

  const segmentsBreakdown = useMemo(() => {
    const segments: Record<string, number> = {
      Food: 0,
      Space: 0,
      Service: 0,
      Membership: 0,
      General: 0,
    };

    for (const row of filteredData) {
      const raw = (row.raw || {}) as any;
      const items = Array.isArray(raw.items) ? raw.items : [];

      if (items.length > 0) {
        for (const item of items) {
          const itemTotal = Number(
            item.lineTotal ??
              item.totalAmount ??
              Number(item.unitPrice || item.price || 0) *
                Number(item.qty || item.quantity || 1),
          );
          const cat = String(
            item.lineCategory || item.sourceType || item.category || "",
          ).toLowerCase();
          const name = String(item.productName || item.name || "").toLowerCase();

          if (
            cat === "food" ||
            cat === "foods" ||
            name.includes("food") ||
            item.isFood
          ) {
            segments.Food += itemTotal;
          } else if (
            cat === "space" ||
            cat === "spaces" ||
            name.includes("space") ||
            item.isSpace
          ) {
            segments.Space += itemTotal;
          } else if (
            cat === "service" ||
            cat === "services" ||
            name.includes("service")
          ) {
            segments.Service += itemTotal;
          } else if (
            /membership|subscription/.test(cat) ||
            /membership|subscription/.test(name)
          ) {
            segments.Membership += itemTotal;
          } else {
            segments.General += itemTotal;
          }
        }
      } else {
        const cats = getInvoiceCategories(raw);
        const amt = Number(row.amount || 0);
        if (cats.includes("Food")) {
          segments.Food += amt;
        } else if (cats.includes("Space")) {
          segments.Space += amt;
        } else if (cats.includes("Service")) {
          segments.Service += amt;
        } else if (cats.includes("Membership")) {
          segments.Membership += amt;
        } else {
          // Subscriptions default to Membership segment
          segments.Membership += amt;
        }
      }
    }

    return segments;
  }, [filteredData]);

  return (
    <div className="min-w-0 space-y-4 p-1">
      {/* ============================================================== */}
      {/* MOBILE RESPONSIVE VIEW (screens < md)                         */}
      {/* ============================================================== */}
      <div className="block md:hidden space-y-3 pb-24">
        {/* A. Top Navigation Tabs */}
        <div className="-mx-1 border-b border-slate-200 bg-white px-2">
          <div className="hide-scrollbar flex items-center gap-6 overflow-x-auto pt-1">
            <button
              type="button"
              onClick={() => navigate("/pos")}
              className="relative shrink-0 pb-2.5 pt-1 text-sm font-medium text-slate-500 transition hover:text-slate-800"
            >
              Sales
            </button>
            <button
              type="button"
              onClick={() => navigate("/credit-notes")}
              className="relative shrink-0 pb-2.5 pt-1 text-sm font-medium text-slate-500 transition hover:text-slate-800"
            >
              Credit Notes
            </button>
            <button
              type="button"
              onClick={() => navigate("/quotations")}
              className="relative shrink-0 pb-2.5 pt-1 text-sm font-medium text-slate-500 transition hover:text-slate-800"
            >
              Quotations
            </button>
            <button
              type="button"
              className="relative shrink-0 pb-2.5 pt-1 text-sm font-bold text-blue-600 transition"
            >
              Subscriptions
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-blue-600" />
            </button>
            <button
              type="button"
              onClick={() => setMoreMenuOpen(true)}
              className="relative shrink-0 pb-2.5 pt-1 text-sm font-medium text-slate-500 transition hover:text-slate-800"
            >
              More
            </button>
          </div>
        </div>

        {/* B. Summary Card: Date filter above Total Amount & Pending Due box */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
          {/* Row 1: Total Sales (Left, prominent) & Date Filter (Right, compact) */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-1.5 text-left">
              <span className="text-xs font-semibold text-slate-500">Total Sales:</span>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                {formatCompactCurrency(totalAmount)}
              </span>
            </div>

            <div className="relative shrink-0">
              <select
                value={datePreset}
                onChange={(e) => applyDatePreset(e.target.value as DatePreset)}
                className="h-6 cursor-pointer appearance-none rounded-full border border-slate-200/90 bg-white pl-2.5 pr-6 text-[11px] font-semibold text-slate-700 shadow-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                aria-label="Date range"
              >
                {DATE_PRESET_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>

          {/* Custom Date Pickers */}
          {datePreset === "custom" && (
            <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2">
              <div className="flex-1">
                <label className="text-[9px] font-semibold uppercase text-slate-500">
                  From
                </label>
                <input
                  type="date"
                  value={fromDate}
                  max={toDate || undefined}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setDatePreset("custom");
                  }}
                  className="h-7 w-full rounded-md border border-slate-200 bg-white px-1.5 text-[11px] text-slate-700 outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-[9px] font-semibold uppercase text-slate-500">
                  To
                </label>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setDatePreset("custom");
                  }}
                  className="h-7 w-full rounded-md border border-slate-200 bg-white px-1.5 text-[11px] text-slate-700 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Row 2: Paid Amount & Pending Due Box (Below Date Filter) */}
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            <div>
              <button
                type="button"
                onClick={() => setShowTotalDetails((prev) => !prev)}
                className="group flex flex-col text-left cursor-pointer focus:outline-none"
                aria-expanded={showTotalDetails}
              >
                <div className="flex items-center gap-1 text-xs text-slate-500 group-hover:text-slate-700">
                  <span className="font-medium">Paid Amount</span>
                  <ChevronDown
                    size={13}
                    className={`text-slate-400 transition-transform duration-200 ${
                      showTotalDetails ? "rotate-180 text-blue-600" : ""
                    }`}
                  />
                </div>
                <div className="mt-0.5 text-lg font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                  {formatCompactCurrency(paidAmount)}
                </div>
              </button>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Pending Due</div>
              <div className={`mt-0.5 text-lg font-bold tracking-tight ${totalDueAmount > 0 ? "text-red-500" : "text-slate-900"}`}>
                {formatCompactCurrency(totalDueAmount)}
              </div>
            </div>
          </div>

          {/* Collapsible Total Amount Details: Payment Modes (Left) & Segments (Right) */}
          {showTotalDetails && (
            <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="grid grid-cols-2 gap-3 divide-x divide-slate-200">
                {/* Column 1: Payment Modes */}
                <div className="space-y-1.5 pr-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Payment Modes
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Cash</span>
                    <span className="font-semibold text-slate-800">
                      {formatCompactCurrency(paymentModesBreakdown.Cash)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">UPI</span>
                    <span className="font-semibold text-slate-800">
                      {formatCompactCurrency(paymentModesBreakdown.UPI)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Card</span>
                    <span className="font-semibold text-slate-800">
                      {formatCompactCurrency(paymentModesBreakdown.Card)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Wallet</span>
                    <span className="font-semibold text-slate-800">
                      {formatCompactCurrency(paymentModesBreakdown.Wallet)}
                    </span>
                  </div>
                  {paymentModesBreakdown.Other > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Other</span>
                      <span className="font-semibold text-slate-800">
                        {formatCompactCurrency(paymentModesBreakdown.Other)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Column 2: Segments */}
                <div className="space-y-1.5 pl-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Segments
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Food</span>
                    <span className="font-semibold text-slate-800">
                      {formatCompactCurrency(segmentsBreakdown.Food)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Space</span>
                    <span className="font-semibold text-slate-800">
                      {formatCompactCurrency(segmentsBreakdown.Space)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Service</span>
                    <span className="font-semibold text-slate-800">
                      {formatCompactCurrency(segmentsBreakdown.Service)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Membership</span>
                    <span className="font-semibold text-slate-800">
                      {formatCompactCurrency(segmentsBreakdown.Membership)}
                    </span>
                  </div>
                  {segmentsBreakdown.General > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">General</span>
                      <span className="font-semibold text-slate-800">
                        {formatCompactCurrency(segmentsBreakdown.General)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Row below box: Search bar with Filter and Default */}
        <div className="flex items-center gap-2">
          {/* Search Bar */}
          <div className="relative min-w-0 flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subscriptions, members..."
              className="h-10 w-full rounded-xl border border-slate-200/90 bg-white pl-8.5 pr-2.5 text-xs text-slate-800 placeholder:text-slate-400 shadow-xs focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Filter button (icon only) */}
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            aria-label="Filter"
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-xs transition active:scale-95 ${
              subscriptionTypeFilter !== "all" || expiryFilter !== "all"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal
              size={15}
              className={subscriptionTypeFilter !== "all" || expiryFilter !== "all" ? "text-blue-600" : "text-slate-500"}
            />
            {(subscriptionTypeFilter !== "all" || expiryFilter !== "all") && (
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-blue-600 ring-2 ring-white" />
            )}
          </button>

          {/* Default (Sort) Dropdown (icon only) */}
          <div
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-xs transition ${
              mobileSort !== "default"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200/90 bg-white text-slate-700"
            }`}
          >
            <ArrowUpDown
              size={15}
              className={
                mobileSort !== "default" ? "text-blue-600" : "text-slate-500"
              }
            />
            {mobileSort !== "default" && (
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-blue-600 ring-2 ring-white" />
            )}
            <select
              value={mobileSort}
              onChange={(e) => setMobileSort(e.target.value as any)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Sort subscriptions"
            >
              <option value="default">Default</option>
              <option value="amount_desc">Amount: High to Low</option>
              <option value="amount_asc">Amount: Low to High</option>
              <option value="date_desc">Date: Newest First</option>
              <option value="date_asc">Date: Oldest First</option>
            </select>
          </div>
        </div>

        {/* C. Status Tabs (Pills) */}
        <div className="hide-scrollbar -mx-1 overflow-x-auto px-1">
          <div className="flex min-w-max items-center gap-2 py-0.5">
            {(
              [
                { key: "all" as const, label: "All" },
                { key: "active" as const, label: "Active" },
                { key: "completed" as const, label: "Completed" },
                { key: "expired" as const, label: "Expired" },
                { key: "cancelled" as const, label: "Cancelled" },
              ]
            ).map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                    active
                      ? "bg-blue-600 text-white shadow-xs"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                      active
                        ? "bg-blue-700 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {statusCounts[tab.key] || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* E. Cards List */}
        <div className="space-y-2.5">
          {loading ? (
            <div className="space-y-2.5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white p-3.5"
                />
              ))}
            </div>
          ) : mobileDisplayData.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <FileText size={24} />
              </div>
              <h4 className="mt-3 text-sm font-semibold text-slate-800">
                No subscriptions found
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Try adjusting your search, filters, or date range.
              </p>
            </div>
          ) : (
            paginatedMobileData.map((row) => {
              const isActive = row.status === "active";
              const isCompleted = row.status === "completed";
              const isExpired = row.status === "expired";
              const customerName = row.customer || "Member";
              const planName = row.subscriptionType || "Membership";

              return (
                <div
                  key={row._id}
                  onClick={() => {
                    setModalMode("view");
                    setModalData(row.raw);
                    setIsModalOpen(true);
                  }}
                  className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition hover:border-slate-300 active:bg-slate-50/70"
                >
                  {/* Top Section */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="truncate text-base font-bold text-slate-900">
                          {customerName}
                        </h3>
                        <span className="inline-flex items-center rounded-md bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 ring-1 ring-inset ring-purple-200 uppercase">
                          {planName}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-500">
                          {row.subscriptionCode}
                        </span>
                        {row.phone && (
                          <span className="text-[11px] text-slate-400">
                            • {row.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end">
                      {/* Status Badge with colored dot */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                          isActive
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-600"
                            : isCompleted
                              ? "border border-amber-200 bg-amber-50 text-amber-700"
                              : isExpired
                                ? "border border-slate-200 bg-slate-100 text-slate-600"
                                : "border border-rose-200 bg-rose-50 text-rose-600"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isActive
                              ? "bg-emerald-500"
                              : isCompleted
                                ? "bg-amber-500"
                                : isExpired
                                  ? "bg-slate-400"
                                  : "bg-rose-500"
                          }`}
                        />
                        {row.status}
                      </span>
                    </div>
                  </div>

                  {/* Middle Section: Amount & Due */}
                  <div className="mt-2.5 flex items-baseline justify-between border-t border-slate-100 pt-2.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold tracking-tight text-slate-900">
                        ₹{Number(row.amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </span>
                      {Number(row.dueAmount || 0) > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDueActionRow(row);
                          }}
                          className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 transition hover:bg-amber-100"
                        >
                          Due {formatInr(row.dueAmount)}
                        </button>
                      )}
                    </div>

                    {/* Action 3-dots */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedActionRow(row);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Actions"
                    >
                      <Ellipsis size={18} />
                    </button>
                  </div>

                  {/* Bottom: Period & Upcoming */}
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span className="truncate max-w-[200px]">{row.period}</span>
                    {row.upcomingOn && (
                      <span className="shrink-0 text-[11px] text-slate-400">
                        Next: {row.upcomingOn}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Load More Pagination */}
          {!loading && mobileDisplayData.length > paginatedMobileData.length && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setMobilePage((p) => p + 1)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-[0.99]"
              >
                Load More Subscriptions ({paginatedMobileData.length} of {mobileDisplayData.length})
              </button>
            </div>
          )}
        </div>

        {/* G. Bottom Navigation Bar */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white px-2 py-1.5 shadow-lg"
          aria-label="Mobile Navigation"
        >
          <div className="flex items-center justify-around">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex flex-col items-center gap-0.5 px-3 py-1 text-slate-500 hover:text-slate-800"
            >
              <Home size={20} />
              <span className="text-[10px] font-medium">Home</span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/pos")}
              className="flex flex-col items-center gap-0.5 px-3 py-1 text-slate-500 hover:text-slate-800"
            >
              <FileCheck2 size={20} />
              <span className="text-[10px] font-medium">Bills</span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/products")}
              className="flex flex-col items-center gap-0.5 px-3 py-1 text-slate-500 hover:text-slate-800"
            >
              <Package size={20} />
              <span className="text-[10px] font-medium">Products</span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/parties")}
              className="flex flex-col items-center gap-0.5 px-3 py-1 text-slate-500 hover:text-slate-800"
            >
              <Users size={20} />
              <span className="text-[10px] font-medium">Parties</span>
            </button>
            <button
              type="button"
              onClick={() => setMoreMenuOpen(true)}
              className="flex flex-col items-center gap-0.5 px-3 py-1 text-blue-600"
            >
              <Ellipsis size={20} />
              <span className="text-[10px] font-bold">More</span>
            </button>
          </div>
        </nav>

        {/* H. Mobile Filter Sheet Modal */}
        {mobileFilterOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-xs transition"
            onClick={() => setMobileFilterOpen(false)}
          >
            <div
              className="w-full max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl animate-in slide-in-from-bottom duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Filter Subscriptions
                </h3>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {/* Subscription Plan Filter */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Membership Plan
                  </label>
                  <select
                    value={subscriptionTypeFilter}
                    onChange={(e) => setSubscriptionTypeFilter(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="all">All Subscriptions</option>
                    {memberships.map((membership) => (
                      <option key={membership.planId} value={membership.planId}>
                        {membership.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Expiry Filter */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Expiry Status
                  </label>
                  <select
                    value={expiryFilter}
                    onChange={(e) => setExpiryFilter(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="all">Any Expiry</option>
                    <option value="day">Expire in a Day</option>
                    <option value="week">Expire in a Week</option>
                    <option value="month">Expire in a Month</option>
                    <option value="year">Expire in a Year</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSubscriptionTypeFilter("all");
                    setExpiryFilter("all");
                    setMobileFilterOpen(false);
                  }}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* I. More Menu Sheet */}
        {moreMenuOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-xs transition"
            onClick={() => setMoreMenuOpen(false)}
          >
            <div
              className="w-full max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl animate-in slide-in-from-bottom duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">More Menus</h3>
                <button
                  type="button"
                  onClick={() => setMoreMenuOpen(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    navigate("/pos");
                  }}
                  className="flex items-center gap-3 rounded-xl border border-slate-200/80 p-3 text-left hover:bg-slate-50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold text-xs">
                    S
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Sales</div>
                    <div className="text-[10px] text-slate-400">POS Invoices</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    navigate("/purchase");
                  }}
                  className="flex items-center gap-3 rounded-xl border border-slate-200/80 p-3 text-left hover:bg-slate-50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 font-bold text-xs">
                    P
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Purchases</div>
                    <div className="text-[10px] text-slate-400">Bills & Vendors</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    navigate("/credit-notes");
                  }}
                  className="flex items-center gap-3 rounded-xl border border-slate-200/80 p-3 text-left hover:bg-slate-50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 font-bold text-xs">
                    CN
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Credit Notes</div>
                    <div className="text-[10px] text-slate-400">Sales Returns</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    navigate("/quotations");
                  }}
                  className="flex items-center gap-3 rounded-xl border border-slate-200/80 p-3 text-left hover:bg-slate-50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 font-bold text-xs">
                    Q
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Quotations</div>
                    <div className="text-[10px] text-slate-400">Estimates</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* DESKTOP VIEW (screens >= md)                                   */}
      {/* ============================================================== */}
      <div className="hidden md:block space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
            Subscriptions
          </h1>
          <span className="rounded-full bg-pink-100 px-2 py-0.5 text-xs font-medium text-pink-700">
            {filteredData.length}
          </span>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <Can permission={PERMISSIONS.SUBSCRIPTION_CREATE}>
            <button
              className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer sm:w-auto"
              onClick={() => {
                setModalMode("create");
                setModalData(null);
                setIsModalOpen(true);
              }}
            >
              + Create Subscription
            </button>
          </Can>
          <Can
            anyOf={[
              PERMISSIONS.SUBSCRIPTION_BULK_CREATE,
              PERMISSIONS.SUBSCRIPTION_CREATE,
            ]}
          >
            <button
              className="w-full rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 cursor-pointer sm:w-auto"
              onClick={() => {
                setModalMode("bulk");
                setModalData(null);
                setIsModalOpen(true);
              }}
            >
              + Bulk Create Subscription
            </button>
          </Can>
        </div>
      </div>

      <div className="hide-scrollbar flex items-center gap-4 overflow-x-auto border-b border-gray-200 pb-2 sm:gap-6">
        <button
          onClick={() => setActiveTab("all")}
          className={`shrink-0 text-sm font-medium ${activeTab === "all" ? "border-b-2 border-blue-600 pb-1 text-blue-700" : "text-gray-500"}`}
        >
          All{" "}
          <span className="text-xs text-gray-400">{filteredData.length}</span>
        </button>
        {tabs.map(
          (tab) =>
            tab !== "all" && (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 text-sm font-medium ${activeTab === tab ? "border-b-2 border-blue-600 pb-1 text-blue-700" : "text-gray-500"}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ),
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
        <div className="relative min-w-0 w-full flex-1 sm:min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by transaction, customer, invoice etc..."
            className="h-10 w-full rounded-md border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-blue-400"
          />
        </div>
        <select
          value={subscriptionTypeFilter}
          onChange={(e) => setSubscriptionTypeFilter(e.target.value)}
          className="h-10 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-400 bg-white text-gray-700"
        >
          <option value="all">All Subscriptions</option>
          {memberships.map((membership) => (
            <option key={membership.planId} value={membership.planId}>
              {membership.displayName}
            </option>
          ))}
        </select>
        <select
          value={expiryFilter}
          onChange={(e) => setExpiryFilter(e.target.value)}
          className="h-10 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-400 bg-white text-gray-700"
        >
          <option value="all">Any Expiry</option>
          <option value="day">Expire in a Day</option>
          <option value="week">Expire in a Week</option>
          <option value="month">Expire in a Month</option>
          <option value="year">Expire in a Year</option>
          <option value="expired">Expired</option>
        </select>

        <select
          value={datePreset}
          onChange={(e) => applyDatePreset(e.target.value as DatePreset)}
          className="h-10 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-blue-400 bg-white text-gray-700"
        >
          {DATE_PRESET_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <label className="whitespace-nowrap text-xs font-medium text-gray-500">
              From
            </label>
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => {
                setFromDate(e.target.value);
                setDatePreset("custom");
              }}
              className="h-10 rounded-md border border-gray-200 px-3 text-sm text-gray-700 outline-none focus:border-blue-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="whitespace-nowrap text-xs font-medium text-gray-500">
              To
            </label>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => {
                setToDate(e.target.value);
                setDatePreset("custom");
              }}
              className="h-10 rounded-md border border-gray-200 px-3 text-sm text-gray-700 outline-none focus:border-blue-400"
            />
          </div>
          {(fromDate || toDate || datePreset !== "all") && (
            <button
              type="button"
              onClick={() => applyDatePreset("all")}
              className="h-10 rounded-md border border-gray-200 px-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <MaterialReactTable table={table} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded bg-gray-100 px-2 py-1 text-gray-700">
            Total ₹{" "}
            {totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className="rounded bg-green-100 px-2 py-1 text-green-700">
            Active ₹{" "}
            {activeAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-700">
            Completed ₹{" "}
            {completedAmount.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>
      </div>

      {selectedActionRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Subscription Actions
              </h3>
              <button
                onClick={() => setSelectedActionRow(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle size={20} />
              </button>
            </div>
            <div className="space-y-3 p-5">
              <button
                onClick={() => handleAction("view")}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50"
              >
                <div className="rounded-full bg-violet-100 p-2 text-violet-600">
                  <Eye size={18} />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">
                    View Subscription
                  </div>
                  <div className="text-xs text-gray-500">
                    View in read-only mode
                  </div>
                </div>
              </button>
              {isRenewalReminderEligible(selectedActionRow) && (
                <Can permission={PERMISSIONS.SUBSCRIPTION_UPDATE}>
                  <button
                    type="button"
                    disabled={Boolean(sendingReminderId)}
                    onClick={() => {
                      const row = selectedActionRow;
                      setSelectedActionRow(null);
                      void sendRenewalReminder(row);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 text-left transition-colors hover:bg-emerald-50 disabled:opacity-60"
                  >
                    <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
                      <MessageCircle size={18} />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">
                        Send WhatsApp Reminder
                      </div>
                      <div className="text-xs text-gray-500">
                        Send membershiprenewal template to this member
                      </div>
                    </div>
                  </button>
                </Can>
              )}
              <Can permission={PERMISSIONS.SUBSCRIPTION_UPDATE}>
                <button
                  onClick={() => handleAction("edit")}
                  disabled={selectedActionRow.status === "cancelled"}
                  className={`flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors ${selectedActionRow.status === "cancelled" ? "cursor-not-allowed opacity-50" : "hover:bg-gray-50"}`}
                >
                  <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                    <Edit size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">
                      Edit Subscription
                    </div>
                    <div className="text-xs text-gray-500">
                      Modify subscription details
                    </div>
                  </div>
                </button>
              </Can>
              <Can permission={PERMISSIONS.SUBSCRIPTION_CREATE}>
                <button
                  onClick={() => handleAction("upgrade")}
                  disabled={selectedActionRow.status === "cancelled"}
                  className={`flex w-full items-center gap-3 rounded-lg border border-violet-100 bg-violet-50/50 p-3 text-left transition-colors ${selectedActionRow.status === "cancelled" ? "cursor-not-allowed opacity-50" : "hover:bg-violet-50"}`}
                >
                  <div className="rounded-full bg-violet-100 p-2 text-violet-600">
                    <ArrowUpCircle size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-violet-800">
                      Upgrade Subscription
                    </div>
                    <div className="text-xs text-violet-600/80">
                      Renew the same plan, or move to a higher priority
                    </div>
                  </div>
                </button>
              </Can>
              <Can permission={PERMISSIONS.SUBSCRIPTION_DELETE}>
                <button
                  onClick={() => handleAction("delete")}
                  className="flex w-full items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-3 text-left transition-colors hover:bg-red-100"
                >
                  <div className="rounded-full bg-red-200 p-2 text-red-700">
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-red-700">
                      Delete Subscription
                    </div>
                    <div className="text-xs text-red-600/70">
                      Permanently remove
                    </div>
                  </div>
                </button>
              </Can>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <CreateSubscriptionScreen
          initialMode={modalMode}
          initialData={modalData}
          onClose={() => setIsModalOpen(false)}
          onSave={() => {
            fetchSubscriptions();
          }}
        />
      )}

      {dueActionRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <button
            type="button"
            aria-label="Close due options"
            className="absolute inset-0 cursor-default"
            onClick={() => setDueActionRow(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
            <div className="mb-3">
              <p className="text-sm font-bold text-slate-900">
                {dueActionRow.customer || "Subscription"}
              </p>
              <p className="text-xs text-slate-500">
                {dueActionRow.subscriptionCode} · Due {formatInr(dueActionRow.dueAmount)}
              </p>
            </div>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => {
                  setModalMode("view");
                  setModalData(dueActionRow.raw);
                  setIsModalOpen(true);
                  setDueActionRow(null);
                }}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Invoice
                <span className="mt-0.5 block text-xs font-medium text-slate-500">
                  Open this subscription invoice
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDuePayRow(dueActionRow);
                  setDueActionRow(null);
                }}
                className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-left text-sm font-semibold text-amber-800 hover:bg-amber-100"
              >
                Pay due
                <span className="mt-0.5 block text-xs font-medium text-amber-700/80">
                  Record the remaining payment
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <DuePaymentModal
        open={Boolean(duePayRow)}
        onClose={() => setDuePayRow(null)}
        invoice={
          duePayRow
            ? {
                _id: duePayRow._id,
                bill: duePayRow.subscriptionCode,
                customer: duePayRow.customer,
                customerPhone: duePayRow.phone,
                amount: duePayRow.amount,
                dueAmount: duePayRow.dueAmount,
                raw: duePayRow.raw,
              }
            : null
        }
        onRecordPayment={async (payload) => {
          if (!duePayRow) return;
          await handleUpdateSubscription(duePayRow._id, {
            mode: payload.mode,
            paymentStatus: payload.paymentStatus,
            paymentBreakdown: payload.paymentBreakdown,
          });
        }}
        onSuccess={() => {
          setDuePayRow(null);
          void fetchSubscriptions();
        }}
      />
    </div>
  );
}

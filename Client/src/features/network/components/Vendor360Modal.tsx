import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Download,
  FilePlus2,
  FileText,
  Mail,
  MessageCircle,
  Phone,
  Receipt,
  Scale,
  Search,
  ShoppingCart,
  Trash2,
  UploadCloud,
  Wallet,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermission } from "@/hooks/usePermission";
import {
  handleGetPurchaseById,
  handleGetVendor360,
  handleRecordVendorPayment,
  handleUploadVendorPaymentDocument,
  type Vendor360Response,
  type VendorBillRow,
  type VendorPaymentRow,
  type VendorTimelineItem,
} from "@/services/apiClient";
import type { VendorDetails } from "./VendorDetailsModal";

type Tab = "overview" | "timeline" | "purchases" | "orders" | "payments";
type Period = "all" | "month" | "year";
type DateRange =
  | ""
  | "today"
  | "yesterday"
  | "month"
  | "last-month"
  | "year"
  | "last-year";
type CreatedSort = "newest" | "oldest";

type BillLine = {
  productName: string;
  qty: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
};

type BillDoc = {
  url: string;
  name: string;
};

const money = (value?: number | null) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const digits = (value?: string | null) =>
  String(value || "").replace(/\D/g, "");

const phoneLink = (value?: string | null) => {
  const raw = digits(value);
  return raw.length >= 10 ? `tel:+${raw.length === 10 ? `91${raw}` : raw}` : "";
};

const mailLink = (value?: string | null) => {
  const email = String(value || "").trim();
  return email.includes("@") ? `mailto:${email}` : "";
};

const whatsAppLink = (value?: string | null) => {
  const raw = digits(value);
  const ten = raw.length >= 10 ? raw.slice(-10) : "";
  return ten.length === 10 ? `https://wa.me/91${ten}` : "";
};

const maskAccount = (value?: string | null) => {
  const raw = digits(value);
  if (!raw) return "";
  return raw.length <= 4 ? raw : `•••• ${raw.slice(-4)}`;
};

const rangeBounds = (range: DateRange) => {
  if (!range) return null;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );
  if (range === "today") return { start, end };
  if (range === "yesterday") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
    return { start, end };
  }
  if (range === "month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }
  if (range === "last-month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
    };
  }
  if (range === "year") {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
    };
  }
  return {
    start: new Date(now.getFullYear() - 1, 0, 1),
    end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
  };
};

const createdStamp = (value?: string | null) => {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
};

const sortByCreated = <T,>(
  rows: T[],
  pick: (row: T) => string | null | undefined,
  order: CreatedSort,
) =>
  [...rows].sort((left, right) => {
    const diff = createdStamp(pick(left)) - createdStamp(pick(right));
    return order === "oldest" ? diff : -diff;
  });

const inDateRange = (value: string | null | undefined, range: DateRange) => {
  const bounds = rangeBounds(range);
  if (!bounds) return true;
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date >= bounds.start && date <= bounds.end;
};

const when = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const mergeDocs = (first: BillDoc[], second: BillDoc[]) => {
  const seen = new Set<string>();
  return [...first, ...second].filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
};

const documentKind = (url: string) => {
  const path = url.split("?")[0].toLowerCase();
  if (path.endsWith(".pdf")) return "pdf";
  if (
    /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(path) ||
    path.includes("/image/upload/")
  )
    return "image";
  return "file";
};

const tone = (status: string, overdue?: boolean) => {
  if (overdue) return "bg-rose-50 text-rose-700";
  if (status === "paid") return "bg-emerald-50 text-emerald-700";
  if (status === "partial") return "bg-amber-50 text-amber-800";
  if (status === "due" || status === "pending")
    return "bg-orange-50 text-orange-800";
  return "bg-slate-100 text-slate-600";
};

function downloadReceipt(vendorName: string, payment: VendorPaymentRow) {
  const lines = [
    "Vendor payment receipt",
    `Vendor: ${vendorName}`,
    `Receipt: ${payment.id.slice(-8).toUpperCase()}`,
    `Type: ${payment.direction}`,
    `Amount: ${money(payment.amount)}`,
    payment.appliedAmount
      ? `Applied to bill: ${money(payment.appliedAmount)}`
      : "",
    payment.advanceAmount ? `Advance: ${money(payment.advanceAmount)}` : "",
    payment.purchaseInvoice ? `Bill: ${payment.purchaseInvoice}` : "",
    payment.method ? `Method: ${payment.method}` : "",
    payment.reference ? `Reference: ${payment.reference}` : "",
    `Date: ${when(payment.paidAt)}`,
    payment.createdBy ? `Recorded by: ${payment.createdBy}` : "",
    payment.note ? `Note: ${payment.note}` : "",
  ].filter(Boolean);
  const blob = new Blob([lines.join("\n")], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `vendor-receipt-${payment.id.slice(-6)}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Vendor360Modal({
  vendor,
  onClose,
  onChanged,
}: {
  vendor: VendorDetails & { _id: string };
  onClose: () => void;
  onChanged?: () => void;
}) {
  const navigate = useNavigate();
  const { can } = usePermission();
  const canSeeBank = can(PERMISSIONS.VENDOR_UPDATE);
  const [tab, setTab] = useState<Tab>("overview");
  const [period, setPeriod] = useState<Period>("all");
  const [data, setData] = useState<Vendor360Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("");
  const [createdSort, setCreatedSort] = useState<CreatedSort>("newest");
  const [payOpen, setPayOpen] = useState(false);
  const [payDoc, setPayDoc] = useState("");
  const [bill, setBill] = useState<VendorBillRow | null>(null);
  const [billLines, setBillLines] = useState<BillLine[]>([]);
  const [billNotes, setBillNotes] = useState("");
  const [billDocs, setBillDocs] = useState<BillDoc[]>([]);
  const [docOpen, setDocOpen] = useState(false);
  const [docIndex, setDocIndex] = useState(0);
  const [billLoading, setBillLoading] = useState(false);
  const [billError, setBillError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    direction: "pay-out" as "pay-out" | "pay-in" | "adjustment",
    adjustmentEffect: "decrease" as "increase" | "decrease",
    amount: "",
    method: "Cash",
    reference: "",
    note: "",
    paidAt: new Date().toISOString().slice(0, 10),
    purchaseIds: [] as string[],
    documents: [] as {
      url: string;
      name: string;
      mimeType: string;
      size: number;
    }[],
  });

  const load = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError("");
      const now = new Date();
      const periodQuery =
        period === "month"
          ? {
              from: new Date(now.getFullYear(), now.getMonth(), 1)
                .toISOString()
                .slice(0, 10),
              to: now.toISOString().slice(0, 10),
            }
          : period === "year"
            ? {
                from: new Date(now.getFullYear(), 0, 1)
                  .toISOString()
                  .slice(0, 10),
                to: now.toISOString().slice(0, 10),
              }
            : undefined;
      const next = await handleGetVendor360(vendor._id, signal, periodQuery);
      setData(next);
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === "CanceledError") return;
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not load this vendor.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setBill(null);
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [vendor._id, period]);

  const summary = data?.summary;
  const profile = data?.vendor;
  const bills =
    tab === "orders"
      ? data?.orders || []
      : tab === "purchases"
        ? data?.purchases || []
        : [];
  const filteredBills = useMemo(() => {
    const term = search.trim().toLowerCase();
    return bills.filter((row) => {
      if (
        status &&
        row.status !== status &&
        !(status === "overdue" && row.overdue)
      )
        return false;
      if (!inDateRange(row.invoiceDate, dateRange)) return false;
      if (!term) return true;
      return row.invoiceNumber.toLowerCase().includes(term);
    });
  }, [bills, search, status, dateRange]);
  const sortedBills = useMemo(
    () => sortByCreated(filteredBills, (row) => row.createdAt || row.invoiceDate, createdSort),
    [filteredBills, createdSort],
  );
  const filteredPayments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.payments || []).filter((row) => {
      if (status && row.direction !== status) return false;
      if (!inDateRange(row.paidAt, dateRange)) return false;
      if (!term) return true;
      return `${row.reference} ${row.purchaseInvoice} ${row.note}`
        .toLowerCase()
        .includes(term);
    });
  }, [data?.payments, search, status, dateRange]);
  const sortedPayments = useMemo(
    () => sortByCreated(filteredPayments, (row) => row.createdAt || row.paidAt, createdSort),
    [filteredPayments, createdSort],
  );
  const sortedTimeline = useMemo(
    () => sortByCreated(data?.timeline || [], (row) => row.createdAt || row.at, createdSort),
    [data?.timeline, createdSort],
  );

  const openBills = (data?.purchases || []).filter((row) => row.dueAmount > 0);

  const submitPayment = async () => {
    const amount = Number(form.amount);
    if (!(amount > 0)) {
      await Swal.fire(
        "Amount required",
        "Enter an amount greater than zero.",
        "warning",
      );
      return;
    }
    if (form.direction === "pay-out" && form.purchaseIds.length === 0) {
      await Swal.fire(
        "Select a purchase",
        "Choose at least one open purchase for this payment.",
        "warning",
      );
      return;
    }
    if (form.direction === "pay-out" && amount > selectedDue + 0.5) {
      await Swal.fire(
        "Amount too high",
        `This payment cannot exceed the selected outstanding of ${money(selectedDue)}.`,
        "warning",
      );
      return;
    }
    const confirm = await Swal.fire({
      title: "Record this payment?",
      text: `${form.direction} of ${money(amount)}`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Record",
    });
    if (!confirm.isConfirmed) return;
    try {
      setSaving(true);
      await handleRecordVendorPayment(vendor._id, {
        direction: form.direction,
        adjustmentEffect:
          form.direction === "adjustment" ? form.adjustmentEffect : undefined,
        amount,
        method: form.direction === "adjustment" ? undefined : form.method,
        reference: form.reference,
        note: form.note,
        paidAt: form.paidAt,
        purchaseIds:
          form.direction === "pay-out" ? form.purchaseIds : undefined,
        documents: form.documents,
        clientKey: crypto.randomUUID(),
      });
      setPayOpen(false);
      setForm((current) => ({
        ...current,
        amount: "",
        reference: "",
        note: "",
        purchaseIds: [],
        documents: [],
      }));
      await load();
      onChanged?.();
      await Swal.fire({
        icon: "success",
        title: "Payment recorded",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not record the payment.";
      await Swal.fire("Payment failed", message, "error");
    } finally {
      setSaving(false);
    }
  };

  const selectedDue = openBills
    .filter((row) => form.purchaseIds.includes(row.id))
    .reduce((sum, row) => sum + row.dueAmount, 0);

  const openPurchase = async (row: VendorBillRow) => {
    setBill(row);
    setBillLines([]);
    setBillNotes("");
    setBillDocs(docsOnBill(row.id, row.invoiceNumber));
    setDocOpen(false);
    setDocIndex(0);
    setBillError("");
    setBillLoading(true);
    try {
      const response = await handleGetPurchaseById(row.id);
      const purchase =
        (response as { purchase?: Record<string, unknown> })?.purchase || {};
      const items = Array.isArray(purchase.items) ? purchase.items : [];
      setBillLines(
        items.map((item) => {
          const line = item as Record<string, unknown>;
          const qty = Number(line.qty) || 0;
          const unitPrice = Number(line.unitPrice) || 0;
          const discount = Number(line.discount) || 0;
          const stored = Number(line.lineTotal);
          return {
            productName: String(line.productName || "Item"),
            qty,
            unitPrice,
            discount,
            lineTotal: Number.isFinite(stored)
              ? stored
              : Math.max(0, qty * unitPrice - discount),
          };
        }),
      );
      setBillNotes(String(purchase.notes || ""));
      const attachments = Array.isArray(purchase.attachments)
        ? purchase.attachments
        : [];
      const uploaded = attachments
        .map((item, index) => {
          const url =
            typeof item === "string"
              ? item
              : String((item as { url?: string })?.url || "");
          return { url: url.trim(), name: `Uploaded file ${index + 1}` };
        })
        .filter((item) => item.url);
      setBillDocs(mergeDocs(uploaded, docsOnBill(row.id, row.invoiceNumber)));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not load the bill lines.";
      setBillError(message);
    } finally {
      setBillLoading(false);
    }
  };

  const docsOnBill = (purchaseId: string, invoiceNumber: string) => {
    const found: BillDoc[] = [];
    for (const payment of data?.payments || []) {
      const sameBill =
        payment.purchaseId === purchaseId ||
        (Boolean(invoiceNumber) && payment.purchaseInvoice === invoiceNumber) ||
        (payment.allocations || []).some(
          (item) =>
            item.purchaseId === purchaseId ||
            (Boolean(invoiceNumber) && item.purchaseInvoice === invoiceNumber),
        );
      if (!sameBill) continue;
      for (const document of payment.documents || []) {
        found.push({
          url: String(document.url || "").trim(),
          name: document.name || "Uploaded file",
        });
      }
    }
    return found.filter((item) => item.url);
  };

  const payBill = (row: VendorBillRow) => {
    if (!(row.dueAmount > 0)) return;
    setForm((current) => ({
      ...current,
      direction: "pay-out",
      amount: String(row.dueAmount),
      purchaseIds: [row.id],
    }));
    setBill(null);
    setPayOpen(true);
  };

  const uploadReceipts = async (files: File[]) => {
    const room = 5 - form.documents.length;
    const batch = files.slice(0, room);
    if (!batch.length) return;
    try {
      setUploading(true);
      for (const file of batch) {
        const result = await handleUploadVendorPaymentDocument(
          vendor._id,
          file,
        );
        setForm((current) => ({
          ...current,
          documents: [...current.documents, result.document].slice(0, 5),
        }));
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not upload the receipt.";
      await Swal.fire("Upload failed", message, "error");
    } finally {
      setUploading(false);
    }
  };

  const openWithVendor = (path: string, state?: Record<string, unknown>) => {
    onClose();
    navigate(path, { state });
  };

  const vendorState = {
    prefillVendor: {
      vendorId: vendor._id,
      name: profile?.name || vendor.name,
      mobile: profile?.mobile || vendor.mobile,
    },
  };

  const cards = [
    {
      label: "Total Purchase",
      value: money(summary?.purchaseTotal),
      hint: "Confirmed purchases",
    },
    {
      label: "Purchase Frequency",
      value: String(summary?.purchaseFrequency ?? summary?.purchaseCount ?? 0),
      hint:
        period === "all"
          ? "All confirmed bills"
          : period === "month"
            ? "This month"
            : "This year",
    },
    {
      label: "Total Paid",
      value: money(summary?.totalPaid ?? summary?.paidOnBills),
      hint: "Paid on purchase bills",
    },
    {
      label: "Outstanding Amount",
      value: money(summary?.outstanding),
      hint: "Still payable",
    },
    {
      label: "Last Purchase",
      value: when(summary?.lastPurchaseDate),
      hint: "Most recent bill",
    },
    {
      label: "Total Purchase Orders",
      value: String(summary?.orderCount || 0),
      hint: money(summary?.orderTotal),
    },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <div className="flex h-dvh w-full max-w-6xl flex-col overflow-hidden bg-[#F6F7FB] sm:h-[92vh] sm:rounded-2xl sm:shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-violet-600">
              Vendor 360
            </p>
            <h2 className="truncate text-lg font-bold text-slate-900">
              {profile?.name || vendor.name}
              {profile?.cspLabel ? (
                <span className="ml-2 align-middle rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                  {profile.cspLabel}
                </span>
              ) : null}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>
                {profile?.companyName || vendor.companyName || "No company"}
              </span>
              {phoneLink(profile?.mobile || vendor.mobile) ? (
                <a
                  href={phoneLink(profile?.mobile || vendor.mobile)}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700"
                >
                  <Phone size={12} /> Call
                </a>
              ) : null}
              {mailLink(profile?.email) ? (
                <a
                  href={mailLink(profile?.email)}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700"
                >
                  <Mail size={12} /> Email
                </a>
              ) : null}
              {whatsAppLink(profile?.whatsappNumber) ? (
                <a
                  href={whatsAppLink(profile?.whatsappNumber)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700"
                >
                  <MessageCircle size={12} /> WhatsApp
                </a>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-start gap-2">
            <div className="flex flex-wrap justify-end gap-2">
            <Can permission={PERMISSIONS.VENDOR_UPDATE}>
              <button
                type="button"
                onClick={() => setPayOpen(true)}
                className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white"
              >
                Record Payment
              </button>
            </Can>
            <button
              type="button"
              onClick={() =>
                openWithVendor(
                  `/expenses?create=1&vendorId=${vendor._id}&vendorName=${encodeURIComponent(profile?.name || vendor.name)}`,
                )
              }
              className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200"
            >
              <Receipt size={14} /> Add Expense
            </button>
            <button
              type="button"
              onClick={() => openWithVendor("/create-purchase", vendorState)}
              className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200"
            >
              <ShoppingCart size={14} /> Create Purchase
            </button>
            <button
              type="button"
              onClick={() =>
                openWithVendor("/create-purchase-order", vendorState)
              }
              className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200"
            >
              <FilePlus2 size={14} /> Create Purchase Order
            </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"
            >
              <X size={14} /> Close
            </button>
          </div>
        </header>

        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2">
          {(
            [
              ["overview", "Overview"],
              ["timeline", "Timeline"],
              ["purchases", "Purchases"],
              ["orders", "Orders"],
              ["payments", "Payments"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setSearch("");
                setStatus("");
                setDateRange("");
              }}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${
                tab === key
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading vendor…</p>
          ) : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {!loading && data && tab === "overview" ? (
            <div className="space-y-3">
              {/* <div className="flex flex-wrap items-center justify-between gap-2">
                <select
                  value={period}
                  onChange={(event) => setPeriod(event.target.value as Period)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
                >
                  <option value="all">All time</option>
                  <option value="month">This month</option>
                  <option value="year">This year</option>
                </select>
              </div> */}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {cards.map((card) => (
                  <article
                    key={card.label}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {card.label}
                    </p>
                    <p className="mt-1 text-xl font-bold text-slate-900">
                      {card.value}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{card.hint}</p>
                  </article>
                ))}
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <article className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Building2 size={16} /> Profile
                  </h3>
                  <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <Field label="Phone" value={profile?.mobile} />
                    <Field label="WhatsApp" value={profile?.whatsappNumber} />
                    <Field label="Email" value={profile?.email} />
                    <Field label="GSTIN" value={profile?.gstin} />
                    <Field label="PAN" value={profile?.panNumber} />
                    <Field label="Company" value={profile?.companyName} />
                    <Field label="MSME" value={profile?.msme} />
                    <Field label="Udyam Number" value={profile?.udyamNumber} />
                    <Field label="CIN Number" value={profile?.cinNumber} />
                    {profile?.documents?.length ? (
                      <div className="sm:col-span-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Documents
                        </p>
                        <div className="mt-1 flex flex-col gap-1">
                          {profile.documents.map((document) => (
                            <a
                              key={document.url}
                              href={document.url}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate text-sm font-medium text-blue-700 hover:underline"
                            >
                              {document.name || "Document"}
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <Field label="Bank" value={profile?.bankName} />
                    <Field
                      label="Account"
                      value={
                        canSeeBank
                          ? profile?.accountNumber
                          : maskAccount(profile?.accountNumber)
                      }
                    />
                    <Field label="IFSC" value={profile?.IFSCcode} />
                    <Field label="UPI" value={profile?.UPIID} />
                  </dl>
                  <p className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                    <Phone
                      size={14}
                      className="mt-0.5 shrink-0 text-slate-400"
                    />
                    {[
                      profile?.billingAddress1,
                      profile?.address,
                      profile?.pincode,
                    ]
                      .filter(Boolean)
                      .join(", ") || "No address"}
                  </p>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Wallet size={16} /> Balance
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    <li className="flex justify-between">
                      <span>Opening balance</span>
                      <span className="font-semibold">
                        {money(summary?.openingBalance)}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>Purchases</span>
                      <span className="font-semibold">
                        {money(summary?.purchaseTotal)}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>Returns</span>
                      <span className="font-semibold">
                        {money(summary?.returnTotal)}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>Paid on bills</span>
                      <span className="font-semibold">
                        {money(summary?.paidOnBills)}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>Advance paid</span>
                      <span className="font-semibold">
                        {money(summary?.advance)}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>Pay-in received</span>
                      <span className="font-semibold">
                        {money(summary?.payIn)}
                      </span>
                    </li>
                    <li className="flex justify-between border-t border-slate-100 pt-2  text-red-600">
                      <span className="flex items-center gap-1">
                        <Scale size={14} /> Outstanding
                      </span>
                      <span className="font-bold ">
                        {money(summary?.outstanding)}
                      </span>
                    </li>
                  </ul>
                </article>
              </div>
            </div>
          ) : null}

          {!loading && data && tab === "timeline" ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex justify-end">
                <CreatedSortSelect value={createdSort} onChange={setCreatedSort} />
              </div>
              {sortedTimeline.length === 0 ? (
                <p className="text-sm text-slate-500">No activity yet.</p>
              ) : (
                <ol className="space-y-3">
                  {sortedTimeline.map((item: VendorTimelineItem) => (
                    <li
                      key={item.id}
                      className="border-l-2 border-violet-200 pl-3"
                    >
                      <p className="text-sm font-bold text-slate-900">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {when(item.at)}
                        {item.amount ? ` · ${money(item.amount)}` : ""}
                        {item.reference ? ` · ${item.reference}` : ""}
                        {item.by ? ` · ${item.by}` : ""}
                      </p>
                      {item.detail ? (
                        <p className="text-xs text-slate-600">{item.detail}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ) : null}

          {!loading && data && (tab === "purchases" || tab === "orders") ? (
            <BillTable
              rows={sortedBills}
              search={search}
              status={status}
              dateRange={dateRange}
              onSearch={setSearch}
              onStatus={setStatus}
              onDateRange={setDateRange}
              createdSort={createdSort}
              onCreatedSort={setCreatedSort}
              onOpen={
                tab === "purchases"
                  ? (row) => void openPurchase(row)
                  : undefined
              }
              onPay={
                tab === "purchases" && can(PERMISSIONS.VENDOR_UPDATE)
                  ? payBill
                  : undefined
              }
              empty={
                tab === "orders"
                  ? "No purchase orders for this vendor."
                  : "No purchases for this vendor."
              }
            />
          ) : null}

          {!loading && data && tab === "payments" ? (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row">
                <label className="relative min-w-0 flex-1">
                  <Search
                    size={15}
                    className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search reference or bill"
                    className="w-full rounded-xl border border-slate-200 py-2 pr-3 pl-9 text-sm"
                  />
                </label>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">All types</option>
                  <option value="pay-out">Pay-out</option>
                  <option value="pay-in">Pay-in</option>
                  <option value="adjustment">Adjustment</option>
                </select>
                <DateRangeSelect value={dateRange} onChange={setDateRange} />
                <CreatedSortSelect value={createdSort} onChange={setCreatedSort} />
              </div>
              {filteredPayments.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">
                  No payments recorded yet.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {sortedPayments.map((payment) => (
                    <li
                      key={payment.id}
                      className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                          {payment.direction === "pay-in" ? (
                            <ArrowDownLeft
                              size={15}
                              className="text-emerald-600"
                            />
                          ) : (
                            <ArrowUpRight
                              size={15}
                              className="text-violet-600"
                            />
                          )}
                          {payment.direction} · {money(payment.amount)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {when(payment.paidAt)}
                          {payment.method ? ` · ${payment.method}` : ""}
                          {payment.reference ? ` · ${payment.reference}` : ""}
                          {payment.purchaseInvoice
                            ? ` · ${payment.purchaseInvoice}`
                            : ""}
                          {payment.documents?.length
                            ? ` · ${payment.documents.length} file`
                            : ""}
                          {payment.advanceAmount
                            ? ` · Advance ${money(payment.advanceAmount)}`
                            : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          downloadReceipt(profile?.name || vendor.name, payment)
                        }
                        className="inline-flex items-center gap-1 self-start rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
                      >
                        <Download size={13} /> Receipt
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>
      </div>

      {bill ? (
        <div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/30 p-3 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-violet-600">
                  Purchase bill
                </p>
                <h3 className="truncate text-lg font-bold text-slate-900">
                  {bill.invoiceNumber || "Bill"}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {when(bill.invoiceDate)}
                  {bill.dueDate ? ` · Due ${when(bill.dueDate)}` : ""}
                  {bill.paymentMode ? ` · ${bill.paymentMode}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBill(null)}
                className="rounded-full p-1 text-slate-500"
                aria-label="Close bill"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tone(bill.status, bill.overdue)}`}
              >
                {bill.overdue ? "Overdue" : bill.status || "—"}
              </span>
              <span className="text-xs text-slate-500">
                Total {money(bill.amount)}
              </span>
              <span className="text-xs text-slate-500">
                Paid {money(bill.paidAmount)}
              </span>
              <span className="text-xs font-semibold text-slate-800">
                Due {money(bill.dueAmount)}
              </span>
            </div>
            {billLoading ? (
              <p className="mt-4 text-sm text-slate-500">Loading bill lines…</p>
            ) : null}
            {billError ? (
              <p className="mt-4 text-sm text-rose-600">{billError}</p>
            ) : null}
            {!billLoading ? (
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-[520px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      {["Item", "Qty", "Price", "Discount", "Amount"].map(
                        (label) => (
                          <th key={label} className="px-3 py-2 font-semibold">
                            {label}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {billLines.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-6 text-center text-slate-500"
                        >
                          No line items on this bill.
                        </td>
                      </tr>
                    ) : (
                      billLines.map((line, index) => (
                        <tr
                          key={`${line.productName}-${index}`}
                          className="border-t border-slate-100"
                        >
                          <td className="px-3 py-2 font-semibold text-slate-800">
                            {line.productName}
                          </td>
                          <td className="px-3 py-2">{line.qty}</td>
                          <td className="px-3 py-2">{money(line.unitPrice)}</td>
                          <td className="px-3 py-2">{money(line.discount)}</td>
                          <td className="px-3 py-2">{money(line.lineTotal)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}
            {billNotes ? (
              <p className="mt-3 text-sm text-slate-600">{billNotes}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {billDocs.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setDocIndex(0);
                    setDocOpen(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white"
                >
                  <FileText size={14} />
                  {billDocs.length > 1
                    ? `View uploaded files (${billDocs.length})`
                    : "View uploaded file"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setBill(null)}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600"
              >
                Close
              </button>
              {bill.dueAmount > 0 ? (
                <Can permission={PERMISSIONS.VENDOR_UPDATE}>
                  <button
                    type="button"
                    onClick={() => payBill(bill)}
                    className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-bold text-white"
                  >
                    Select and pay {money(bill.dueAmount)}
                  </button>
                </Can>
              ) : (
                <p className="self-center text-xs font-semibold text-emerald-700">
                  This bill is fully paid.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {bill && docOpen && billDocs.length > 0 ? (
        <div className="fixed inset-0 z-[88] flex items-end justify-center bg-black/50 p-3 sm:items-center">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-violet-600">
                  Attached document
                </p>
                <h3 className="truncate text-base font-bold text-slate-900">
                  {bill.invoiceNumber || "Bill"}
                  {billDocs.length > 1
                    ? ` · ${docIndex + 1} of ${billDocs.length}`
                    : ""}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDocOpen(false)}
                className="rounded-full p-1 text-slate-500"
                aria-label="Close document"
              >
                <X size={18} />
              </button>
            </div>
            {billDocs.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-4 py-2">
                {billDocs.map((doc, index) => (
                  <button
                    key={doc.url}
                    type="button"
                    onClick={() => setDocIndex(index)}
                    className={`max-w-40 truncate shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${index === docIndex ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"}`}
                  >
                    {doc.name || `File ${index + 1}`}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="min-h-[240px] flex-1 overflow-auto bg-slate-100 p-3">
              <DocumentPreview url={(billDocs[docIndex] || billDocs[0]).url} />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <a
                href={(billDocs[docIndex] || billDocs[0]).url}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Open in new tab
              </a>
              <button
                type="button"
                onClick={() => setDocOpen(false)}
                className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {payOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/30 p-3 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Record payment</h3>
            <p className="mt-1 text-sm text-slate-500">
              {profile?.name || vendor.name}
              {profile?.cspLabel ? ` · ${profile.cspLabel}` : ""}
            </p>
            <div className="mt-4 grid gap-3">
              <div className="grid grid-cols-3 gap-2">
                {(["pay-out", "pay-in", "adjustment"] as const).map(
                  (direction) => (
                    <button
                      key={direction}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          direction,
                          purchaseIds:
                            direction === "pay-out" ? current.purchaseIds : [],
                        }))
                      }
                      className={`rounded-xl px-2 py-2 text-xs font-bold ${form.direction === direction ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"}`}
                    >
                      {direction}
                    </button>
                  ),
                )}
              </div>
              {form.direction === "adjustment" ? (
                <select
                  value={form.adjustmentEffect}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      adjustmentEffect: event.target.value as
                        | "increase"
                        | "decrease",
                    }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="decrease">Decrease outstanding</option>
                  <option value="increase">Increase outstanding</option>
                </select>
              ) : (
                <select
                  value={form.method}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      method: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  {["Cash", "UPI", "Card", "Bank", "Other"].map((method) => (
                    <option key={method}>{method}</option>
                  ))}
                </select>
              )}
              <input
                type="number"
                min={0}
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                placeholder="Amount"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={form.paidAt}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    paidAt: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              {form.direction === "pay-out" ? (
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-2">
                  {openBills.length === 0 ? (
                    <p className="text-xs text-slate-500">No open purchases.</p>
                  ) : null}
                  {openBills.map((bill) => (
                    <label
                      key={bill.id}
                      className="flex items-start gap-2 text-xs text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={form.purchaseIds.includes(bill.id)}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            purchaseIds: event.target.checked
                              ? [...current.purchaseIds, bill.id]
                              : current.purchaseIds.filter(
                                  (id) => id !== bill.id,
                                ),
                          }))
                        }
                      />
                      <span>
                        <span className="font-semibold">
                          {bill.invoiceNumber || "Bill"}
                        </span>
                        {" · "}total {money(bill.amount)} · paid{" "}
                        {money(bill.paidAmount)} · due {money(bill.dueAmount)} ·{" "}
                        {bill.status}
                      </span>
                    </label>
                  ))}
                  <p className="text-[11px] text-slate-500">
                    Selected outstanding {money(selectedDue)}. The payment
                    cannot exceed this.
                  </p>
                </div>
              ) : null}
              <PaymentDocuments
                documents={form.documents}
                uploading={uploading}
                onUpload={(files) => void uploadReceipts(files)}
                onRemove={(url) =>
                  setForm((current) => ({
                    ...current,
                    documents: current.documents.filter(
                      (item) => item.url !== url,
                    ),
                  }))
                }
                onOpen={setPayDoc}
              />
              <input
                value={form.reference}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    reference: event.target.value,
                  }))
                }
                placeholder="Transaction reference"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <textarea
                value={form.note}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                rows={2}
                placeholder="Note"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPayOpen(false);
                  setPayDoc("");
                }}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void submitPayment()}
                className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {payDoc ? (
        <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/50 p-3 sm:items-center">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <h3 className="truncate text-base font-bold text-slate-900">
                Supporting document
              </h3>
              <button
                type="button"
                onClick={() => setPayDoc("")}
                className="rounded-full p-1 text-slate-500"
                aria-label="Close document"
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-[240px] flex-1 overflow-auto bg-slate-100 p-3">
              <DocumentPreview url={payDoc} />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <a
                href={payDoc}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Open in new tab
              </a>
              <button
                type="button"
                onClick={() => setPayDoc("")}
                className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PaymentDocuments({
  documents,
  uploading,
  onUpload,
  onRemove,
  onOpen,
}: {
  documents: { url: string; name: string; mimeType: string; size: number }[];
  uploading: boolean;
  onUpload: (files: File[]) => void;
  onRemove: (url: string) => void;
  onOpen: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const full = documents.length >= 5;
  const take = (list: FileList | null) => {
    if (!list || uploading || full) return;
    onUpload(Array.from(list));
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Supporting document
        </p>
        <span className="text-[10px] font-medium text-slate-400">
          {documents.length}/5 · 5 MB
        </span>
      </div>
      <button
        type="button"
        disabled={uploading || full}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          take(event.dataTransfer.files);
        }}
        className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-violet-200 bg-white px-3 py-4 text-center transition hover:border-violet-400 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <UploadCloud size={22} className="text-violet-500" />
        <span className="mt-1 text-sm font-semibold text-slate-800">
          {uploading
            ? "Uploading…"
            : full
              ? "Five documents added"
              : "Click or drop a receipt"}
        </span>
        <span className="mt-0.5 text-[11px] text-slate-400">
          JPG, PNG, WEBP, or PDF
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        multiple
        disabled={uploading || full}
        className="hidden"
        onChange={(event) => take(event.target.files)}
      />
      {documents.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {documents.map((document) => {
            const image =
              document.mimeType.startsWith("image/") ||
              documentKind(document.url) === "image";
            return (
              <li
                key={document.url}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2"
              >
                <button
                  type="button"
                  onClick={() => onOpen(document.url)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  {image ? (
                    <img
                      src={document.url}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                      <FileText size={18} />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-800">
                      {document.name || "Document"}
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      {fileSize(document.size)} · View
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(document.url)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Remove document"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function fileSize(bytes?: number) {
  const size = Number(bytes) || 0;
  if (size <= 0) return "Uploaded";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentPreview({ url }: { url: string }) {
  const kind = documentKind(url);
  if (kind === "image") {
    return (
      <img
        src={url}
        alt="Purchase document"
        className="mx-auto max-h-[70vh] w-auto max-w-full rounded-lg bg-white object-contain"
      />
    );
  }
  if (kind === "pdf") {
    return (
      <iframe
        title="Purchase document"
        src={url}
        className="h-[70vh] w-full rounded-lg bg-white"
      />
    );
  }
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-slate-600">
      <FileText size={28} />
      <p>This file opens in a new tab.</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="font-semibold text-slate-800">{value || "—"}</dd>
    </div>
  );
}

function CreatedSortSelect({
  value,
  onChange,
}: {
  value: CreatedSort;
  onChange: (value: CreatedSort) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as CreatedSort)}
      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
      aria-label="Sort by created date"
    >
      <option value="newest">Newest created</option>
      <option value="oldest">Oldest created</option>
    </select>
  );
}

function DateRangeSelect({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (value: DateRange) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as DateRange)}
      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
    >
      <option value="">All dates</option>
      <option value="today">Today</option>
      <option value="yesterday">Yesterday</option>
      <option value="month">This month</option>
      <option value="last-month">Last month</option>
      <option value="year">This year</option>
      <option value="last-year">Last year</option>
    </select>
  );
}

function BillTable({
  rows,
  search,
  status,
  dateRange,
  onSearch,
  onStatus,
  onDateRange,
  createdSort,
  onCreatedSort,
  onOpen,
  onPay,
  empty,
}: {
  rows: VendorBillRow[];
  search: string;
  status: string;
  dateRange: DateRange;
  createdSort: CreatedSort;
  onSearch: (value: string) => void;
  onStatus: (value: string) => void;
  onDateRange: (value: DateRange) => void;
  onCreatedSort: (value: CreatedSort) => void;
  onOpen?: (row: VendorBillRow) => void;
  onPay?: (row: VendorBillRow) => void;
  empty: string;
}) {
  const columns = onPay ? 7 : 6;
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <Search
            size={15}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search invoice number"
            className="w-full rounded-xl border border-slate-200 py-2 pr-3 pl-9 text-sm"
          />
        </label>
        <select
          value={status}
          onChange={(event) => onStatus(event.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="due">Due</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
        <DateRangeSelect value={dateRange} onChange={onDateRange} />
        <CreatedSortSelect value={createdSort} onChange={onCreatedSort} />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              {["Invoice", "Date", "Total", "Paid", "Due", "Status"].map(
                (label) => (
                  <th key={label} className="px-3 py-3 font-semibold">
                    {label}
                  </th>
                ),
              )}
              {onPay ? <th className="px-3 py-3 font-semibold">Pay</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-t border-slate-100 ${onOpen ? "cursor-pointer hover:bg-violet-50/60" : ""}`}
                  onClick={onOpen ? () => onOpen(row) : undefined}
                >
                  <td
                    className={`px-3 py-3 font-semibold ${onOpen ? "text-violet-700" : ""}`}
                  >
                    {row.invoiceNumber || "—"}
                  </td>
                  <td className="px-3 py-3">{when(row.invoiceDate)}</td>
                  <td className="px-3 py-3">{money(row.amount)}</td>
                  <td className="px-3 py-3">{money(row.paidAmount)}</td>
                  <td className="px-3 py-3">{money(row.dueAmount)}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tone(row.status, row.overdue)}`}
                    >
                      {row.overdue ? "Overdue" : row.status || "—"}
                    </span>
                  </td>
                  {onPay ? (
                    <td className="px-3 py-3">
                      {row.dueAmount > 0 ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onPay(row);
                          }}
                          className="rounded-lg bg-violet-600 px-2 py-1 text-xs font-bold text-white"
                        >
                          Pay {money(row.dueAmount)}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Settled</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

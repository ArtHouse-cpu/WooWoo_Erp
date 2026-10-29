import { useEffect, useMemo, useRef, useState } from "react";
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
  Calendar,
  ChevronDown,
  Plus,
  SlidersHorizontal,
  ArrowUpDown,
  Home,
  FileText,
  Package,
  Users,
  Menu,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
  handleDeleteInvoice,
  handleGetInvoice,
  handleGetInvoices,
} from "@/services/apiClient";
import {
  SALES_DATE_PRESET_OPTIONS,
  getTodayYmd,
  rangeForPreset,
  type DatePreset,
} from "@/utils/datePresets";
import CreatePosScreen, { INVOICE_SAVED_EVENT } from "./CreatePosScreen";
import CreateInvoiceScreen from "./CreateInvoiceScreen";
import DuePaymentModal from "../components/invoice/Modal/DuePaymentModal";
import SalesReturnFlowModal from "../components/invoice/Modal/SalesReturnFlowModal";
import MobileInvoiceDetailsModal from "../components/invoice/Modal/MobileInvoiceDetailsModal";
import {
  currentInvoiceTotal,
  originalInvoiceTotal,
  returnedInvoiceTotal,
} from "../utils/salesReturn";
import { downloadInvoicePdf, getInvoicePdfBlob } from "@/utils/pdfGenerator";
import {
  buildWoowooInvoiceWhatsAppMessage,
  normalizeIndianWhatsAppDigits,
  resolveHostedInvoiceLink,
} from "@/utils/whatsappInvoiceShare";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";

type PosRow = {
  id: number;
  amount: number;
  originalAmount: number;
  returnedAmount: number;
  mode: "Cash" | "UPI" | "Card" | "Multi" | "Wallet" | "Draft";
  status: "Paid" | "Pending" | "Cancelled" | "Draft";
  bill: string;
  owner: string;
  customer: string;
  phone: string;
  date: string;
  createdTime: string;
  salesPerson: string;
  _id: string;
  raw: any;
  dueAmount: number;
};

function paymentStatusForWhatsApp(
  raw: Record<string, unknown>,
  rowStatus: PosRow["status"],
): string {
  const due = Number(
    (raw as any)?.pendingAmount ??
      (raw as any)?.paymentBreakdown?.dueAmount ??
      0,
  );
  if (due > 0.001 || rowStatus === "Pending") return "Pending";
  const ps = String(raw.paymentStatus ?? "").toLowerCase();
  if (ps === "full") return "Paid";
  if (ps === "partial" || ps === "due") return "Pending";
  return rowStatus;
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
    raw.invoiceCategory || raw.category || raw.billType || raw.sourceType || "",
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

function getCustomerMembershipLabel(raw: any): string | null {
  if (!raw) return null;
  const m =
    raw.membershipType ||
    raw.membershipPlan ||
    raw.membership ||
    raw.customerMembership ||
    raw.customer?.membershipType ||
    raw.customer?.membership;
  if (!m || String(m).toLowerCase() === "none" || String(m).toLowerCase() === "visitor") {
    return null;
  }
  return String(m);
}

function formatCardDateTime(raw: any, fallbackDate: string): string {
  const dateVal = raw?.createdAt || raw?.invoiceDate || fallbackDate;
  if (!dateVal) return fallbackDate;
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return fallbackDate;

  const shortDate = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

  const time = d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${shortDate}, ${time}`;
}

const tabs: PosRow["status"][] = ["Paid", "Pending", "Draft", "Cancelled"];

export default function PosScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<PosRow["status"] | "All">(() =>
    searchParams.get("tab")?.toLowerCase() === "draft" ? "Draft" : "All",
  );
  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [fromDate, setFromDate] = useState(getTodayYmd);
  const [toDate, setToDate] = useState(getTodayYmd);
  const [data, setData] = useState<PosRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedActionRow, setSelectedActionRow] = useState<PosRow | null>(
    null,
  );
  const [posModalOpen, setPosModalOpen] = useState(false);
  const [dueModalOpen, setDueModalOpen] = useState(false);
  const [selectedDueRow, setSelectedDueRow] = useState<PosRow | null>(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnIntent, setReturnIntent] = useState<"return" | "cancel">(
    "return",
  );
  const [returnInvoice, setReturnInvoice] = useState<any>(null);
  const [viewInvoiceOpen, setViewInvoiceOpen] = useState(false);
  const [viewInvoiceData, setViewInvoiceData] = useState<any>(null);

  // Mobile specific state
  const [mobileSort, setMobileSort] = useState<
    "default" | "amount_desc" | "amount_asc" | "date_desc" | "date_asc"
  >("default");
  const [mobileModeFilter, setMobileModeFilter] = useState<string>("All");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [mobileDetailsInvoice, setMobileDetailsInvoice] = useState<any>(null);
  const [mobileDetailsLoading, setMobileDetailsLoading] = useState(false);
  const [mobilePage, setMobilePage] = useState(1);
  const [showTotalDetails, setShowTotalDetails] = useState(false);

  const handleMobileCardClick = async (row: PosRow) => {
    setMobileDetailsInvoice(row.raw || row);
    setMobileDetailsOpen(true);
    setMobileDetailsLoading(true);
    try {
      const res = await handleGetInvoice(row._id);
      if (res?.invoice) {
        setMobileDetailsInvoice(res.invoice);
      }
    } catch (err) {
      console.error("Failed to fetch invoice details:", err);
    } finally {
      setMobileDetailsLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get("tab")?.toLowerCase() !== "draft") return;
    setActiveTab("Draft");
    const next = new URLSearchParams(searchParams);
    next.delete("tab");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleAction = async (
    action: "view" | "edit" | "cancel" | "delete" | "Credit Note",
  ) => {
    if (!selectedActionRow) return;
    const { _id, raw, status } = selectedActionRow;

    if (action === "view") {
      try {
        const res = await handleGetInvoice(_id);
        const invData = res?.invoice ?? raw;
        if (typeof window !== "undefined" && window.innerWidth < 768) {
          setMobileDetailsInvoice(invData);
          setMobileDetailsOpen(true);
        } else {
          setViewInvoiceData(invData);
          setViewInvoiceOpen(true);
        }
      } catch {
        if (typeof window !== "undefined" && window.innerWidth < 768) {
          setMobileDetailsInvoice(raw);
          setMobileDetailsOpen(true);
        } else {
          setViewInvoiceData(raw);
          setViewInvoiceOpen(true);
        }
      }
      setSelectedActionRow(null);
    } else if (action === "edit") {
      if (status === "Cancelled") {
        Swal.fire(
          "Cannot Edit",
          "Cancelled invoices cannot be edited.",
          "warning",
        );
        return;
      }
      navigate("/create-invoice", { state: { invoice: raw, mode: "edit" } });
    } else if (action === "cancel") {
      if (status === "Cancelled") {
        Swal.fire(
          "Already Cancelled",
          "This invoice is already cancelled.",
          "info",
        );
        return;
      }
      setReturnIntent("cancel");
      setReturnInvoice(raw);
      setReturnModalOpen(true);
    } else if (action === "delete") {
      const confirm = await Swal.fire({
        title: "Delete Invoice?",
        text: "This action cannot be undone.",
        icon: "error",
        showCancelButton: true,
        confirmButtonText: "Yes, Delete",
      });
      if (confirm.isConfirmed) {
        try {
          await handleDeleteInvoice(_id);
          Swal.fire("Deleted", "Invoice deleted successfully.", "success");
          fetchInvoices();
        } catch {
          Swal.fire("Error", "Could not delete invoice.", "error");
        }
      }
    } else if (action === "Credit Note") {
      if (status === "Cancelled") {
        Swal.fire(
          "Cannot return",
          "Cancelled invoices cannot be returned.",
          "info",
        );
        return;
      }
      setReturnIntent("return");
      setReturnInvoice(raw);
      setReturnModalOpen(true);
    }
    setSelectedActionRow(null);
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

  const toStatus = (
    rawStatus: unknown,
    dueAmount = 0,
    paymentStatus?: unknown,
  ): PosRow["status"] => {
    const v = String(rawStatus ?? "").toLowerCase();
    if (v === "cancelled") return "Cancelled";
    if (v === "draft") return "Draft";
    const due = Number(dueAmount) || 0;
    const ps = String(paymentStatus ?? "").toLowerCase();
    if (due > 0.001 || ps === "partial" || ps === "due" || ps === "pending") {
      return "Pending";
    }
    if (v === "pending") return "Pending";
    return "Paid";
  };

  const toMode = (raw: unknown): PosRow["mode"] => {
    const v = String(raw ?? "").toUpperCase();
    if (v === "UPI") return "UPI";
    if (v === "CARD") return "Card";
    if (v === "MULTI") return "Multi";
    if (v === "WALLET") return "Wallet";
    if (v === "DRAFT") return "Draft";
    return "Cash";
  };

  const fetchInvoices = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await handleGetInvoices(
        search,
        signal,
        3000,
        fromDate,
        toDate,
      );
      // handleGetInvoices already returns response.data
      const invoices = Array.isArray(response?.invoices)
        ? response.invoices
        : [];

      const rows: PosRow[] = invoices.map((invoice: any, index: number) => {
        const dueAmount = Number(
          invoice?.pendingAmount ?? invoice?.paymentBreakdown?.dueAmount ?? 0,
        );
        const originalAmount = originalInvoiceTotal(invoice);
        const returnedAmount = returnedInvoiceTotal(invoice);
        return {
          id: index + 1,
          amount: currentInvoiceTotal(invoice),
          originalAmount,
          returnedAmount,
          mode: toMode(invoice?.mode),
          status: toStatus(invoice?.status, dueAmount, invoice?.paymentStatus),
          bill: String(
            invoice?.invoiceCode ??
              `INVVWAH-${invoice?.invoiceNumber ?? index + 1}`,
          ),
          owner: String(
            invoice?.createdBy?.m_staff_name ||
              invoice?.salesPersonName ||
              "System",
          ),
          customer: String(invoice?.customerName),
          phone: String(invoice?.customerPhone),
          date: formatDate(invoice?.invoiceDate),
          createdTime: invoice?.createdAt
            ? new Date(invoice.createdAt).toLocaleString()
            : "",
          salesPerson: String(invoice?.salesPersonName),
          _id: invoice._id,
          raw: invoice,
          dueAmount,
        };
      });

      setData(rows);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void fetchInvoices(controller.signal);
    return () => controller.abort();
  }, [fromDate, toDate, search]);

  const fetchInvoicesRef = useRef(fetchInvoices);
  fetchInvoicesRef.current = fetchInvoices;

  useEffect(() => {
    const onSaved = () => {
      void fetchInvoicesRef.current();
    };
    window.addEventListener(INVOICE_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(INVOICE_SAVED_EVENT, onSaved);
  }, []);

  // Server already filters by fromDate/toDate — only filter status client-side.
  // Search is also sent to the API; keep a light client filter for status tabs.
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const statusOk = activeTab === "All" || row.status === activeTab;
      return statusOk;
    });
  }, [activeTab, data]);

  const mobileDisplayData = useMemo(() => {
    let list = filteredData;
    if (mobileModeFilter !== "All") {
      list = list.filter(
        (r) => r.mode.toUpperCase() === mobileModeFilter.toUpperCase(),
      );
    }
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
          new Date(b.raw?.invoiceDate || b.raw?.createdAt || 0).getTime() -
          new Date(a.raw?.invoiceDate || a.raw?.createdAt || 0).getTime(),
      );
    }
    if (mobileSort === "date_asc") {
      return sorted.sort(
        (a, b) =>
          new Date(a.raw?.invoiceDate || a.raw?.createdAt || 0).getTime() -
          new Date(b.raw?.invoiceDate || b.raw?.createdAt || 0).getTime(),
      );
    }
    return sorted;
  }, [filteredData, mobileModeFilter, mobileSort]);

  useEffect(() => {
    setMobilePage(1);
  }, [activeTab, search, datePreset, fromDate, toDate, mobileModeFilter, mobileSort]);

  const paginatedMobileData = useMemo(() => {
    return mobileDisplayData.slice(0, mobilePage * 20);
  }, [mobileDisplayData, mobilePage]);

  const ensurePosRow = (inv: any): PosRow => {
    if (inv && inv.bill && inv._id) return inv;
    const raw = inv?.raw ?? inv;
    const dueAmount = Number(
      raw?.pendingAmount ?? raw?.paymentBreakdown?.dueAmount ?? 0,
    );
    return {
      id: 1,
      amount: currentInvoiceTotal(raw) || Number(raw?.grandTotal ?? raw?.amount ?? 0),
      originalAmount: originalInvoiceTotal(raw),
      returnedAmount: returnedInvoiceTotal(raw),
      mode: toMode(raw?.mode ?? raw?.paymentMode),
      status: toStatus(raw?.status, dueAmount, raw?.paymentStatus),
      bill: String(raw?.invoiceCode ?? `INVVWAH-${raw?.invoiceNumber ?? 1}`),
      owner: String(raw?.createdBy?.m_staff_name || raw?.salesPersonName || "System"),
      customer: String(raw?.customerName ?? raw?.customer ?? ""),
      phone: String(raw?.customerPhone ?? raw?.phone ?? ""),
      date: formatDate(raw?.invoiceDate ?? raw?.createdAt),
      createdTime: raw?.createdAt ? new Date(raw.createdAt).toLocaleString() : "",
      salesPerson: String(raw?.salesPersonName ?? ""),
      _id: String(raw?._id ?? ""),
      raw,
      dueAmount,
    };
  };

  const handleWhatsAppShare = async (invoice: PosRow | any) => {
    const raw = ((invoice?.raw ?? invoice) ?? {}) as Record<string, unknown>;

    const customerName =
      String(
        invoice?.customer || raw.customerName || "Customer",
      ).trim() || "Customer";

    const docCode = String(
      raw.returnCode ?? raw.invoiceCode ?? invoice?.bill ?? invoice?.id ?? "",
    );

    const isCreditNote = Boolean(raw.returnCode);
    const docLabel = isCreditNote
      ? "Sales Return / Credit Note"
      : "Invoice";

    const totalVal = Number(
      currentInvoiceTotal(raw) || invoice?.amount || raw?.grandTotal || 0,
    );
    const totalFormatted = `₹ ${totalVal.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    const paymentStatus = paymentStatusForWhatsApp(
      raw,
      invoice?.status || (raw.status as any),
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
      title: "Preparing…",
      text: "Generating invoice PDF for WhatsApp",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    let blobPkg: { blob: Blob; filename: string } | null = null;
    try {
      blobPkg = await getInvoicePdfBlob(raw);
    } catch (e) {
      console.error(e);
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
      } catch (err) {
        const aborted =
          err instanceof Error && err.name === "AbortError";
        if (aborted) return;
        console.warn("Share sheet failed, opening WhatsApp Web:", err);
      }
    }

    const digits = normalizeIndianWhatsAppDigits(
      String(invoice?.phone || raw.customerPhone || ""),
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
        text: "Could not generate the invoice PDF. Try the Download button or add a hosted link from your server.",
      });
    }
  };

  const handleDownloadBill = async (invoice: PosRow | any) => {
    const raw = (invoice?.raw ?? invoice) ?? invoice;
    try {
      Swal.fire({
        title: "Generating PDF...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      await downloadInvoicePdf(raw);
      Swal.close();
    } catch {
      Swal.fire("Error", "Could not generate PDF.", "error");
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "amount",
        header: "Amount",
        Cell: ({ row }: { row: { original: PosRow } }) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold tabular-nums text-gray-900">
              {`₹ ${row.original.amount.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}`}
            </span>
            {row.original.returnedAmount > 0 ? (
              <span className="text-[10px] font-semibold text-rose-600">
                −₹
                {row.original.returnedAmount.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}{" "}
                returned
              </span>
            ) : null}
          </div>
        ),
        size: 120,
      },
      {
        accessorKey: "status",
        header: "Status",
        Cell: ({ cell }: { cell: { getValue: () => PosRow["status"] } }) => {
          const value = cell.getValue();
          const badgeClass =
            value === "Pending"
              ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
              : value === "Paid"
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                : value === "Draft"
                  ? "bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200"
                  : "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200";
          return (
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${badgeClass}`}
            >
              {value}
            </span>
          );
        },
        size: 110,
      },
      {
        accessorKey: "mode",
        header: "Mode",
        Cell: ({
          cell,
          row,
        }: {
          cell: { getValue: () => PosRow["mode"] };
          row: { original: PosRow };
        }) => {
          const value = cell.getValue();
          const dueAmount = Number(row.original.dueAmount ?? 0);

          if (dueAmount > 0) {
            return (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDueRow(row.original);
                  setDueModalOpen(true);
                }}
                className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 transition hover:bg-amber-100"
              >
                {`Due ₹${dueAmount.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}
              </button>
            );
          }

          const modeStyles: Record<string, string> = {
            WALLET: "bg-slate-50 text-slate-700 ring-slate-200",
            UPI: "bg-violet-50 text-violet-700 ring-violet-200",
            CARD: "bg-sky-50 text-sky-700 ring-sky-200",
            MULTI: "bg-indigo-50 text-indigo-700 ring-indigo-200",
            CASH: "bg-emerald-50 text-emerald-700 ring-emerald-200",
            DRAFT: "bg-slate-50 text-slate-600 ring-slate-200",
          };

          const className =
            modeStyles[String(value ?? "").toUpperCase()] ||
            "bg-slate-50 text-slate-700 ring-slate-200";
          return (
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${className}`}
            >
              {value}
            </span>
          );
        },
        size: 110,
      },
      {
        accessorKey: "bill",
        header: "Bill No.",
        Cell: ({ row }: { row: { original: PosRow } }) => (
          <div className="min-w-0">
            <div className="truncate font-semibold text-gray-900">
              {row.original.bill}
            </div>
            <div className="truncate text-xs text-gray-500">
              by {row.original.owner || "—"}
            </div>
          </div>
        ),
        size: 160,
      },
      {
        accessorKey: "customer",
        header: "Customer",
        Cell: ({ row }: { row: { original: PosRow } }) => (
          <div className="min-w-0">
            <div className="truncate font-medium text-gray-900">
              {row.original.customer}
            </div>
            <div className="truncate text-xs text-gray-500">
              {row.original.phone}
            </div>
          </div>
        ),
        size: 180,
      },
      {
        accessorKey: "date",
        header: "Date & Time",
        Cell: ({ row }: { row: { original: PosRow } }) => (
          <div className="min-w-0">
            <div className="font-medium text-gray-800">{row.original.date}</div>
            <div className="text-xs text-gray-500">
              {row.original.createdTime}
            </div>
          </div>
        ),
        size: 150,
      },
      // {accessorKey: "salesPerson", header: "Sales", size: 100},
      {
        accessorKey: "actions",
        header: "Actions",
        Cell: ({ row }: { row: { original: PosRow } }) => (
          <div className="flex items-center gap-2">
            <button
              onClick={(event) => {
                event.stopPropagation();
                setSelectedActionRow(row.original);
              }}
              className="flex items-center gap-1 rounded-md bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-200"
            >
              <Ellipsis size={18} />
            </button>
          </div>
        ),
        size: 170,
      },
      {
        accessorKey: "shareInvoice",
        header: "Share Invoice",
        size: 220,
        Cell: ({ row }: { row: { original: PosRow } }) => {
          return (
            <div className="flex items-center gap-2">
              {/* WhatsApp Share */}
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  void handleWhatsAppShare(row.original);
                }}
                className="flex items-center gap-1 rounded-md bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-200"
              >
                <img
                  src="https://cdn-icons-png.flaticon.com/512/733/733585.png"
                  alt="whatsapp"
                  className="h-4 w-4"
                />
              </button>

              {/* Download Bill */}
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  void handleDownloadBill(row.original);
                }}
                className="flex items-center gap-1 rounded-md bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-200"
              >
                <Download size={14} />
              </button>
            </div>
          );
        },
      },
    ],
    [],
  );

  const openInvoiceRow = async (rowData: PosRow) => {
    if (rowData.status === "Draft") {
      navigate("/create-invoice", {
        state: { invoice: rowData.raw, mode: "edit" },
      });
      return;
    }
    try {
      const res = await handleGetInvoice(rowData._id);
      setViewInvoiceData(res?.invoice ?? rowData.raw);
    } catch {
      setViewInvoiceData(rowData.raw);
    }
    setViewInvoiceOpen(true);
  };

  const table = useMaterialReactTable({
    columns,
    data: filteredData,
    state: {
      isLoading: loading,
    },
    enableTopToolbar: false,
    enablePagination: true,
    enableBottomToolbar: true,
    enableColumnActions: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enableHiding: false,
    enableStickyHeader: true,
    muiTableHeadCellProps: {
      sx: {
        fontWeight: 700,
        color: "#374151",
        fontSize: "11px",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        backgroundColor: "#f8fafc",
        borderBottom: "1px solid #e2e8f0",
        py: 1.5,
        whiteSpace: "nowrap",
      },
    },
    muiTableBodyCellProps: {
      sx: {
        fontSize: "13px",
        py: 1.75,
        borderBottom: "1px solid #f1f5f9",
        whiteSpace: "nowrap",
      },
    },
    muiTableBodyRowProps: ({ row }) => ({
      onClick: () => {
        void openInvoiceRow(row.original as PosRow);
      },
      sx: {
        cursor: "pointer",
        transition: "background-color 0.15s ease",
        "&:hover": {
          backgroundColor: "#f8fafc",
        },
      },
    }),
    muiTablePaperProps: {
      elevation: 0,
      square: false,
      sx: {
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        border: "1px solid #e2e8f0",
        borderRadius: "16px",
        overflow: "hidden",
      },
    },
    muiTableContainerProps: {
      sx: {
        maxWidth: "100%",
        maxHeight: "min(62vh, 640px)",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      },
    },
  });

  const statusCounts = useMemo(() => {
    const counts: Record<PosRow["status"] | "All", number> = {
      All: data.length,
      Paid: 0,
      Pending: 0,
      Cancelled: 0,
      Draft: 0,
    };
    for (const row of data) {
      counts[row.status] += 1;
    }
    return counts;
  }, [data]);

  const totalAmount = filteredData.reduce((sum, row) => sum + row.amount, 0);
  const paidAmount = filteredData
    .filter((row) => row.status === "Paid")
    .reduce((sum, row) => sum + row.amount, 0);
    const DueAmount = totalAmount - paidAmount;
    // .filter((row) => row.status === "Pending")
    // .reduce((sum, row) => sum + row.amount, 0);
  const returnedAmount = filteredData.reduce(
    (sum, row) => sum + Number(row.returnedAmount || 0),
    0,
  );

  const paymentModesBreakdown = useMemo(() => {
    const modes: Record<string, number> = {
      Cash: 0,
      UPI: 0,
      Card: 0,
      Wallet: 0,
      Other: 0,
    };

    for (const row of filteredData) {
      const raw = row.raw || {};
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
        const m = String(raw.mode || row.mode || "Cash").toUpperCase();
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
      const raw = row.raw || {};
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
          segments.General += amt;
        }
      }
    }

    return segments;
  }, [filteredData]);

  const controlClass =
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="min-w-0 space-y-2.5 p-1 sm:space-y-4">
      {/* ============================================================== */}
      {/* MOBILE RESPONSIVE VIEW (screens < md)                         */}
      {/* Matches user reference image: modern accounting app layout    */}
      {/* ============================================================== */}
      <div className="block md:hidden space-y-3 pb-24">
        {/* A. Top Navigation Tabs */}
        <div className="-mx-1 border-b border-slate-200 bg-white px-2">
          <div className="hide-scrollbar flex items-center gap-6 overflow-x-auto pt-1">
            <button
              type="button"
              className="relative shrink-0 pb-2.5 pt-1 text-sm font-bold text-blue-600 transition"
            >
              Sales
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-blue-600" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/purchase")}
              className="relative shrink-0 pb-2.5 pt-1 text-sm font-medium text-slate-500 transition hover:text-slate-800"
            >
              Purchases
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
              onClick={() => setMoreMenuOpen(true)}
              className="relative shrink-0 pb-2.5 pt-1 text-sm font-medium text-slate-500 transition hover:text-slate-800"
            >
              More
            </button>
          </div>
        </div>

        {/* B. Summary Card: Date filter above Total Amount & Pending box */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
          {/* Row 1: Date Filter (Above Total Amount and Pending Box) - Right aligned */}
          <div className="flex justify-end">
            <div className="relative">
              <select
                value={datePreset}
                onChange={(e) => {
                  const preset = e.target.value as DatePreset;
                  setDatePreset(preset);
                  if (preset === "custom") return;
                  const range = rangeForPreset(preset);
                  setFromDate(range.from);
                  setToDate(range.to);
                }}
                className="h-8 cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50/70 pl-2.5 pr-7 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
                aria-label="Date range"
              >
                {SALES_DATE_PRESET_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>

          {/* Custom Date Pickers if custom selected */}
          {datePreset === "custom" && (
            <div className="mt-2.5 flex items-center gap-2 border-t border-slate-100 pt-2">
              <div className="flex-1">
                <label className="text-[10px] font-semibold uppercase text-slate-500">
                  From
                </label>
                <input
                  type="date"
                  value={fromDate}
                  max={toDate || undefined}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-8 w-full rounded-lg border border-slate-200 px-2 text-xs text-slate-700"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-semibold uppercase text-slate-500">
                  To
                </label>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-8 w-full rounded-lg border border-slate-200 px-2 text-xs text-slate-700"
                />
              </div>
            </div>
          )}

          {/* Row 2: Total Amount & Pending Box (Below Date Filter) */}
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            <div>
              <button
                type="button"
                onClick={() => setShowTotalDetails((prev) => !prev)}
                className="group flex flex-col text-left cursor-pointer focus:outline-none"
                aria-expanded={showTotalDetails}
              >
                <div className="flex items-center gap-1 text-xs text-slate-500 group-hover:text-slate-700">
                  <span className="font-medium">Total Amount</span>
                  <ChevronDown
                    size={13}
                    className={`text-slate-400 transition-transform duration-200 ${
                      showTotalDetails ? "rotate-180 text-blue-600" : ""
                    }`}
                  />
                </div>
                <div className="mt-0.5 text-lg font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                  {formatCompactCurrency(totalAmount)}
                </div>
              </button>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Pending</div>
              <div className="mt-0.5 text-lg font-bold tracking-tight text-red-500">
                {formatCompactCurrency(DueAmount)}
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
          {/* Search bar */}
          <div className="relative min-w-0 flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-10 w-full rounded-xl border border-slate-200/90 bg-white pl-8.5 pr-2.5 text-xs text-slate-800 placeholder:text-slate-400 shadow-xs focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Filter button */}
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className={`flex h-10 shrink-0 items-center gap-1 rounded-xl border px-2.5 text-xs font-semibold shadow-xs transition active:scale-95 ${
              mobileModeFilter !== "All"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal
              size={13}
              className={
                mobileModeFilter !== "All" ? "text-blue-600" : "text-slate-500"
              }
            />
            <span>Filter</span>
            {mobileModeFilter !== "All" && (
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            )}
          </button>

          {/* Default (Sort) Dropdown */}
          <div className="relative flex h-10 shrink-0 items-center rounded-xl border border-slate-200/90 bg-white px-2 shadow-xs">
            <div className="pointer-events-none flex items-center gap-1 text-xs font-semibold text-slate-700">
              <ArrowUpDown size={13} className="text-slate-500" />
              <span>
                {mobileSort === "default"
                  ? "Default"
                  : mobileSort === "amount_desc"
                    ? "High"
                    : mobileSort === "amount_asc"
                      ? "Low"
                      : mobileSort === "date_desc"
                        ? "Newest"
                        : "Oldest"}
              </span>
              <ChevronDown size={12} className="text-slate-400" />
            </div>
            <select
              value={mobileSort}
              onChange={(e) => setMobileSort(e.target.value as any)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Sort transactions"
            >
              <option value="default">Default</option>
              <option value="amount_desc">Amount: High to Low</option>
              <option value="amount_asc">Amount: Low to High</option>
              <option value="date_desc">Date: Newest First</option>
              <option value="date_asc">Date: Oldest First</option>
            </select>
          </div>
        </div>

        {/* C. Transaction Status Tabs (Pills) */}
        <div className="hide-scrollbar -mx-1 overflow-x-auto px-1">
          <div className="flex min-w-max items-center gap-2 py-0.5">
            {(
              [
                { key: "All" as const, label: "All" },
                { key: "Paid" as const, label: "Paid" },
                { key: "Pending" as const, label: "Pending" },
                { key: "Draft" as const, label: "Draft" },
                { key: "Cancelled" as const, label: "Cancelled" },
              ] as { key: PosRow["status"] | "All"; label: string }[]
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
                    {statusCounts[tab.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* E. Invoice / Transaction Cards List */}
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
                No transactions found
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Try adjusting your search, filters, or date range.
              </p>
            </div>
          ) : (
            paginatedMobileData.map((row) => {
              const isPaid = row.status === "Paid";
              const isPending = row.status === "Pending";
              const isDraft = row.status === "Draft";
              const customerName =
                row.customer && row.customer !== "undefined"
                  ? row.customer
                  : "Walk-in Customer";
              const categories = getInvoiceCategories(row.raw);
              const membershipLabel = getCustomerMembershipLabel(row.raw);
              const shortDateTime = formatCardDateTime(row.raw, row.date);

              return (
                <div
                  key={row._id}
                  onClick={() => void handleMobileCardClick(row)}
                  className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition hover:border-slate-300 active:bg-slate-50/70"
                >
                  {/* Card Top Section */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {/* Customer Name + Membership Label */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="truncate text-base font-bold text-slate-900">
                          {customerName}
                        </h3>
                        {membershipLabel && (
                          <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-700 ring-1 ring-inset ring-purple-200">
                            {membershipLabel}
                          </span>
                        )}
                      </div>

                      {/* Invoice Code + Mode + Category Labels (Food, Space, etc.) */}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-500">
                          {row.bill}
                        </span>
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                          {row.mode}
                        </span>
                        {categories.map((cat) => (
                          <span
                            key={cat}
                            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                              cat === "Food"
                                ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
                                : cat === "Space"
                                  ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200"
                                  : cat === "Membership"
                                    ? "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-200"
                                    : "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200"
                            }`}
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end">
                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                          isPaid
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-600"
                            : isPending
                              ? "border border-amber-200 bg-amber-50 text-amber-600"
                              : isDraft
                                ? "border border-slate-200 bg-slate-100 text-slate-600"
                                : "border border-rose-200 bg-rose-50 text-rose-600"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isPaid
                              ? "bg-emerald-500"
                              : isPending
                                ? "bg-amber-500"
                                : isDraft
                                  ? "bg-slate-400"
                                  : "bg-rose-500"
                          }`}
                        />
                        {row.status.toLowerCase()}
                      </span>

                      {/* Amount */}
                      <div className="mt-1.5 text-right">
                        <span className="text-base font-bold text-slate-900">
                          ₹
                          {row.amount.toLocaleString("en-IN", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                        {row.dueAmount > 0 && (
                          <div className="text-[10px] font-semibold text-amber-600">
                            Due ₹{row.dueAmount.toLocaleString("en-IN")}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Subtle Horizontal Divider */}
                  <div className="my-2.5 border-t border-slate-100" />

                  {/* Card Bottom Section */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex min-w-0 items-center gap-1 truncate text-slate-400">
                      <Calendar
                        size={13}
                        className="shrink-0 text-slate-400"
                      />
                      <span className="truncate">
                        {shortDateTime} • By {row.owner || "System"}
                      </span>
                    </div>

                    <div
                      className="flex shrink-0 items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Three-dot Action Menu */}
                      <button
                        type="button"
                        onClick={() => setSelectedActionRow(row)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-95"
                        title="Invoice Actions"
                        aria-label="Invoice Actions"
                      >
                        <Ellipsis size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {mobileDisplayData.length > paginatedMobileData.length && (
            <div className="pt-2 pb-4 text-center">
              <button
                type="button"
                onClick={() => setMobilePage((p) => p + 1)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 active:scale-95 transition"
              >
                Load more ({mobileDisplayData.length - paginatedMobileData.length} remaining)
              </button>
            </div>
          )}
        </div>

        {/* F. Floating Action Button (FAB) */}
        <Can permission={PERMISSIONS.INVOICE_CREATE}>
          <button
            type="button"
            onClick={() => navigate("/create-invoice")}
            className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/35 transition hover:bg-blue-700 active:scale-95 md:hidden"
            aria-label="Create Invoice"
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        </Can>

        {/* G. Bottom Navigation Bar */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md md:hidden">
          <div className="flex h-16 items-center justify-around px-2">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex flex-col items-center gap-1 text-slate-500 transition hover:text-slate-800"
            >
              <Home size={20} />
              <span className="text-[10px] font-medium">Home</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/pos")}
              className="flex flex-col items-center gap-1 font-semibold text-blue-600"
            >
              <FileText size={20} />
              <span className="text-[10px] font-semibold">Bills</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/products")}
              className="flex flex-col items-center gap-1 text-slate-500 transition hover:text-slate-800"
            >
              <Package size={20} />
              <span className="text-[10px] font-medium">Products</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/customers")}
              className="flex flex-col items-center gap-1 text-slate-500 transition hover:text-slate-800"
            >
              <Users size={20} />
              <span className="text-[10px] font-medium">Parties</span>
            </button>

            <button
              type="button"
              onClick={() => setMoreMenuOpen(true)}
              className="flex flex-col items-center gap-1 text-slate-500 transition hover:text-slate-800"
            >
              <Menu size={20} />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </div>
        </nav>

        {/* Mobile Filter Modal */}
        {mobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4 md:hidden">
            <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Filter Transactions
                </h3>
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="space-y-4 py-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700">
                    Payment Mode
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["All", "Cash", "UPI", "Card", "Multi", "Wallet"].map(
                      (mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setMobileModeFilter(mode)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                            mobileModeFilter === mode
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {mode}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setMobileModeFilter("All");
                    setMobileFilterOpen(false);
                  }}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  Apply Filter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile More Menu Sheet */}
        {moreMenuOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4 md:hidden">
            <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  More Pages & Tools
                </h3>
                <button
                  onClick={() => setMoreMenuOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 py-4">
                <button
                  onClick={() => {
                    setMoreMenuOpen(false);
                    navigate("/purchase");
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 hover:bg-slate-100"
                >
                  <span className="text-xs font-bold text-slate-800">
                    Purchases
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Bills & Vendors
                  </span>
                </button>

                <button
                  onClick={() => {
                    setMoreMenuOpen(false);
                    navigate("/quotations");
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 hover:bg-slate-100"
                >
                  <span className="text-xs font-bold text-slate-800">
                    Quotations
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Estimates
                  </span>
                </button>

                <button
                  onClick={() => {
                    setMoreMenuOpen(false);
                    navigate("/subscriptions");
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 hover:bg-slate-100"
                >
                  <span className="text-xs font-bold text-slate-800">
                    Subscriptions
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Recurring Plans
                  </span>
                </button>

                <button
                  onClick={() => {
                    setMoreMenuOpen(false);
                    navigate("/creditnotes");
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 hover:bg-slate-100"
                >
                  <span className="text-xs font-bold text-slate-800">
                    Credit Notes
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Sales Returns
                  </span>
                </button>

                <Can permission={PERMISSIONS.INVOICE_CREATE}>
                  <button
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setPosModalOpen(true);
                    }}
                    className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-xs font-bold text-blue-700"
                  >
                    Launch POS Billing Mode
                  </button>
                </Can>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* DESKTOP VIEW (Visible only on desktop: screens >= md / 768px)  */}
      {/* 100% Original unchanged desktop layout, table, and controls   */}
      {/* ============================================================== */}
      <div className="hidden md:block space-y-2.5 sm:space-y-4">
        {/* Header — create actions stay on desktop; mobile uses a cleaner scan layout */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              Sales
            </h1>
            <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
              {statusCounts.All}
            </span>
          </div>
          <div className="hidden w-full grid-cols-2 gap-2 sm:grid sm:w-auto sm:min-w-[22rem]">
            <Can permission={PERMISSIONS.INVOICE_CREATE}>
              <button
                type="button"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={() => setPosModalOpen(true)}
              >
                POS Billing
              </button>
            </Can>
            <Can permission={PERMISSIONS.INVOICE_CREATE}>
              <button
                type="button"
                className="h-10 w-full rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                onClick={() => navigate("/create-invoice")}
              >
                + Create Invoice
              </button>
            </Can>
          </div>
        </div>

        {/* Status tabs: All → Paid → Pending → Draft → Cancelled */}
        <div className="hide-scrollbar -mx-1 overflow-x-auto px-1">
          <div className="flex min-w-max items-stretch gap-0.5 border-b border-slate-200">
            {(
              [
                { key: "All" as const, label: "All" },
                ...tabs.map((t) => ({ key: t, label: t })),
              ] as { key: PosRow["status"] | "All"; label: string }[]
            ).map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative shrink-0 px-3 pb-2 pt-1 text-sm font-medium transition sm:px-3.5 sm:pb-2.5 ${
                    active
                      ? "text-blue-700"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`ml-1.5 text-xs ${active ? "text-blue-500" : "text-slate-400"}`}
                  >
                    {statusCounts[tab.key]}
                  </span>
                  {active ? (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-blue-600" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Compact search + date filter */}
        <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-4">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice no., customer…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:h-11 sm:pl-10"
              />
            </div>
            <select
              value={datePreset}
              onChange={(e) => {
                const preset = e.target.value as DatePreset;
                setDatePreset(preset);
                if (preset === "custom") return;
                const range = rangeForPreset(preset);
                setFromDate(range.from);
                setToDate(range.to);
              }}
              className="h-10 w-[7.75rem] shrink-0 rounded-xl border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-11 sm:w-40 sm:px-3"
              aria-label="Date range"
            >
              {SALES_DATE_PRESET_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {datePreset === "custom" ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
                <label className="shrink-0 text-xs font-medium text-slate-500">
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
                  className={controlClass}
                />
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
                <label className="shrink-0 text-xs font-medium text-slate-500">
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
                  className={controlClass}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="table-scroll min-w-0 overflow-hidden rounded-2xl">
          <MaterialReactTable table={table} />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-4">
          <div className="flex min-w-max items-center gap-2 text-xs sm:text-sm">
            <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-medium text-slate-700">
              Total ₹
              {totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 font-medium text-emerald-700">
              Paid ₹
              {paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 font-medium text-amber-700">
              Pending ₹
              {DueAmount.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </span>
            {returnedAmount > 0 ? (
              <span className="rounded-lg bg-rose-50 px-2.5 py-1.5 font-medium text-rose-700">
                Returned −₹
                {returnedAmount.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {selectedActionRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Invoice Actions
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
                    View Invoice
                  </div>
                  <div className="text-xs text-gray-500">
                    View in read-only mode
                  </div>
                </div>
              </button>
              <Can permission={PERMISSIONS.INVOICE_UPDATE}>
                <button
                  onClick={() => handleAction("edit")}
                  disabled={selectedActionRow.status === "Cancelled"}
                  className={`flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors ${selectedActionRow.status === "Cancelled" ? "cursor-not-allowed opacity-50" : "hover:bg-gray-50"}`}
                >
                  <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                    <Edit size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">
                      Edit Invoice
                    </div>
                    <div className="text-xs text-gray-500">
                      Modify invoice details
                    </div>
                  </div>
                </button>
              </Can>
              <Can permission={PERMISSIONS.INVOICE_DELETE}>
                <button
                  onClick={() => handleAction("cancel")}
                  disabled={selectedActionRow.status === "Cancelled"}
                  className={`flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors ${selectedActionRow.status === "Cancelled" ? "cursor-not-allowed opacity-50" : "hover:bg-gray-50"}`}
                >
                  <div className="rounded-full bg-yellow-100 p-2 text-yellow-600">
                    <XCircle size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">
                      Cancel Invoice
                    </div>
                    <div className="text-xs text-gray-500">
                      Return remaining items and refund
                    </div>
                  </div>
                </button>
              </Can>
              <Can permission={PERMISSIONS.CREDIT_NOTE_CREATE}>
                <button
                  onClick={() => handleAction("Credit Note")}
                  disabled={selectedActionRow.status === "Cancelled"}
                  className={`flex w-full items-center gap-3 rounded-lg border border-green-100 bg-green-50 p-3 text-left transition-colors ${
                    selectedActionRow.status === "Cancelled"
                      ? "cursor-not-allowed opacity-50"
                      : "hover:bg-green-100"
                  }`}
                >
                  <div className="rounded-full bg-green-200 p-2 text-green-700">
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-green-700">
                      Sales return
                    </div>
                    <div className="text-xs text-green-600/70">
                      Partial or full item return + refund
                    </div>
                  </div>
                </button>
              </Can>
              <Can permission={PERMISSIONS.INVOICE_DELETE}>
                <button
                  onClick={() => handleAction("delete")}
                  className="flex w-full items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-3 text-left transition-colors hover:bg-red-100"
                >
                  <div className="rounded-full bg-red-200 p-2 text-red-700">
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-red-700">
                      Delete Invoice
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

      <CreatePosScreen
        open={posModalOpen}
        onClose={() => setPosModalOpen(false)}
      />

      {viewInvoiceOpen && viewInvoiceData && (
        <CreateInvoiceScreen
          initialMode="view"
          initialData={viewInvoiceData}
          onClose={() => {
            setViewInvoiceOpen(false);
            setViewInvoiceData(null);
          }}
        />
      )}

      <MobileInvoiceDetailsModal
        open={mobileDetailsOpen}
        onClose={() => {
          setMobileDetailsOpen(false);
          setMobileDetailsInvoice(null);
        }}
        invoice={mobileDetailsInvoice}
        loading={mobileDetailsLoading}
        onEdit={(inv) => {
          setMobileDetailsOpen(false);
          const raw = inv.raw ?? inv;
          if (raw.status === "Cancelled") {
            Swal.fire(
              "Cannot Edit",
              "Cancelled invoices cannot be edited.",
              "warning",
            );
            return;
          }
          navigate("/create-invoice", {
            state: { invoice: raw, mode: "edit" },
          });
        }}
        onConvert={(inv) => {
          setMobileDetailsOpen(false);
          const raw = inv.raw ?? inv;
          if (raw.status === "Cancelled") {
            Swal.fire(
              "Cannot return",
              "Cancelled invoices cannot be returned.",
              "info",
            );
            return;
          }
          setReturnIntent("return");
          setReturnInvoice(raw);
          setReturnModalOpen(true);
        }}
        onCancelInvoice={(inv) => {
          setMobileDetailsOpen(false);
          const raw = inv.raw ?? inv;
          if (raw.status === "Cancelled") {
            Swal.fire(
              "Already Cancelled",
              "This invoice is already cancelled.",
              "info",
            );
            return;
          }
          setReturnIntent("cancel");
          setReturnInvoice(raw);
          setReturnModalOpen(true);
        }}
        onDeleteInvoice={async (inv) => {
          const raw = inv.raw ?? inv;
          const invoiceId = raw._id || inv._id;
          const confirm = await Swal.fire({
            title: "Delete Invoice?",
            text: "This action cannot be undone.",
            icon: "error",
            showCancelButton: true,
            confirmButtonText: "Yes, Delete",
          });
          if (confirm.isConfirmed) {
            try {
              await handleDeleteInvoice(invoiceId);
              Swal.fire("Deleted", "Invoice deleted successfully.", "success");
              setMobileDetailsOpen(false);
              setMobileDetailsInvoice(null);
              fetchInvoices();
            } catch {
              Swal.fire("Error", "Could not delete invoice.", "error");
            }
          }
        }}
      />

      <DuePaymentModal
        open={dueModalOpen}
        onClose={() => {
          setDueModalOpen(false);
          setSelectedDueRow(null);
        }}
        invoice={selectedDueRow}
        onSuccess={fetchInvoices}
      />
      <SalesReturnFlowModal
        open={returnModalOpen}
        invoice={returnInvoice}
        intent={returnIntent}
        onClose={() => {
          setReturnModalOpen(false);
          setReturnInvoice(null);
        }}
        onSuccess={fetchInvoices}
      />
    </div>
  );
}

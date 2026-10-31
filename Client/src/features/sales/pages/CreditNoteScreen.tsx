import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import {
  Eye,
  Edit,
  XCircle,
  Trash2,
  Download,
  Search,
  ChevronDown,
  Calendar,
  Ellipsis,
  Plus,
  Home,
  FileText,
  Package,
  Users,
  Menu,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  handleGetReturnSales,
  handleDeleteReturnSale,
  handleUpdateReturnSale,
} from "@/services/apiClient";
import {
  DATE_PRESET_OPTIONS,
  getTodayYmd,
  rangeForPreset,
  type DatePreset,
} from "@/utils/datePresets";
import { downloadInvoicePdf, getInvoicePdfBlob } from "@/utils/pdfGenerator";
import {
  buildWoowooInvoiceWhatsAppMessage,
  normalizeIndianWhatsAppDigits,
  resolveHostedInvoiceLink,
} from "@/utils/whatsappInvoiceShare";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";
import CreateSalesReturnScreen from "./CreateSalesReturnScreen";

type CreditNoteStatus = "Final" | "Draft" | "Cancelled";

type CreditNoteRow = {
  id: number;
  amount: number;
  status: CreditNoteStatus;
  bill: string;
  owner: string;
  customer: string;
  phone: string;
  date: string;
  createdTime: string;
  _id: string;
  raw: Record<string, unknown>;
};

const tabs: CreditNoteStatus[] = ["Final", "Draft", "Cancelled"];

function apiStatusToRowStatus(raw: unknown): CreditNoteStatus {
  const v = String(raw ?? "").toLowerCase();
  if (v === "cancelled") return "Cancelled";
  if (v === "draft") return "Draft";
  return "Final";
}

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

function formatCardDateTime(raw: any, fallbackDate: string): string {
  const dateVal = raw?.createdAt || raw?.invoiceDate || fallbackDate;
  if (!dateVal) return fallbackDate;
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return fallbackDate;

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
    raw.invoiceCategory || raw.category || raw.billType || raw.sourceType || "",
  ).toLowerCase();
  if (directCat.includes("food")) categories.add("Food");
  if (directCat.includes("space")) categories.add("Space");
  if (directCat.includes("service")) categories.add("Service");
  if (directCat.includes("membership") || directCat.includes("subscription")) {
    categories.add("Membership");
  }

  // 3. Check items
  const items = Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(raw.returnItems)
      ? raw.returnItems
      : [];
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

export default function CreditNoteScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<CreditNoteStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [fromDate, setFromDate] = useState(getTodayYmd);
  const [toDate, setToDate] = useState(getTodayYmd);
  const [data, setData] = useState<CreditNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedActionRow, setSelectedActionRow] = useState<CreditNoteRow | null>(
    null,
  );
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState<Record<string, unknown> | null>(null);

  // Mobile specific state
  const [mobileSort, setMobileSort] = useState<
    "default" | "amount_desc" | "amount_asc" | "date_desc" | "date_asc"
  >("default");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [mobilePage, setMobilePage] = useState(1);
  const [showTotalDetails, setShowTotalDetails] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await handleGetReturnSales(
        "",
        2000,
        undefined,
        undefined,
        fromDate,
        toDate,
      );
      const list = Array.isArray(res?.returnSales) ? res.returnSales : [];
      const rows: CreditNoteRow[] = list.map((rs: Record<string, unknown>, index: number) => {
        const createdBy = rs.createdBy as
          | { m_staff_name?: string | null }
          | undefined;
        return {
          id: index + 1,
          amount: Number(rs.grandTotal ?? 0),
          status: apiStatusToRowStatus(rs.status),
          bill: String(
            rs.returnCode ??
              `RSRVWAH-${String(rs.returnNumber ?? index + 1)}`,
          ),
          owner: String(createdBy?.m_staff_name ?? ""),
          customer: String(rs.customerName ?? ""),
          phone: String(rs.customerPhone ?? ""),
          date: formatDate(
            (rs.invoiceDate as string | undefined) ??
              (rs.createdAt as string | undefined),
          ),
          createdTime: rs.createdAt
            ? new Date(String(rs.createdAt)).toLocaleString()
            : "",
          _id: String(rs._id),
          raw: rs,
        };
      });
      setData(rows);
    } catch {
      setFetchError("Could not load sales returns.");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAction = useCallback(
    async (row: CreditNoteRow, action: "view" | "edit" | "cancel" | "delete") => {
      const { _id, raw, status } = row;

      if (action === "view") {
        setViewData(raw);
        setViewOpen(true);
        setSelectedActionRow(null);
      } else if (action === "edit") {
        if (status === "Cancelled") {
          Swal.fire(
            "Cannot Edit",
            "Cancelled credit notes cannot be edited.",
            "warning",
          );
          return;
        }
        navigate("/create-sales-return", {
          state: { mode: "edit", returnSale: raw },
        });
      } else if (action === "cancel") {
        if (status === "Cancelled") {
          Swal.fire(
            "Already Cancelled",
            "This credit note is already cancelled.",
            "info",
          );
          return;
        }
        const confirm = await Swal.fire({
          title: "Cancel Credit Note?",
          text: "Are you sure you want to cancel this sales return / credit note?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Yes, Cancel",
        });
        if (confirm.isConfirmed) {
          try {
            await handleUpdateReturnSale(_id, { status: "cancelled" });
            Swal.fire(
              "Cancelled",
              "Credit note cancelled successfully.",
              "success",
            );
            void load();
          } catch {
            Swal.fire("Error", "Could not cancel credit note.", "error");
          }
        }
      } else if (action === "delete") {
        const confirm = await Swal.fire({
          title: "Delete Credit Note?",
          text: "This action cannot be undone.",
          icon: "error",
          showCancelButton: true,
          confirmButtonText: "Yes, Delete",
        });
        if (confirm.isConfirmed) {
          try {
            await handleDeleteReturnSale(_id);
            Swal.fire("Deleted", "Credit note deleted successfully.", "success");
            void load();
          } catch {
            Swal.fire("Error", "Could not delete credit note.", "error");
          }
        }
      }
      setSelectedActionRow(null);
    },
    [navigate, load],
  );

  const handleWhatsAppShare = async (cn: CreditNoteRow) => {
    const raw = cn.raw;
    const customerName =
      String(cn.customer || raw.customerName || "Customer").trim() ||
      "Customer";
    const docCode = String(raw.returnCode ?? cn.bill ?? cn._id);
    const docLabel = "Sales Return / Credit Note";
    const totalVal = Number(raw.grandTotal ?? cn.amount ?? 0);
    const totalFormatted = `₹ ${totalVal.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    const paymentStatus = cn.status;
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
      text: "Generating credit note PDF for WhatsApp",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    let blobPkg: { blob: Blob; filename: string } | null = null;
    try {
      blobPkg = await getInvoicePdfBlob(raw, "CREDIT NOTE");
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
        const aborted = err instanceof Error && err.name === "AbortError";
        if (aborted) return;
        console.warn("Share sheet failed, opening WhatsApp Web:", err);
      }
    }

    const digits = normalizeIndianWhatsAppDigits(
      String(cn.phone || raw.customerPhone || ""),
    );
    const waBase = digits ? `https://wa.me/${digits}` : "https://wa.me/";
    window.open(`${waBase}?text=${encodeURIComponent(message)}`, "_blank");

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

  const handleDownloadBill = async (cn: CreditNoteRow) => {
    try {
      Swal.fire({
        title: "Generating PDF...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      await downloadInvoicePdf(cn.raw, "CREDIT NOTE");
      Swal.close();
    } catch {
      Swal.fire("Error", "Could not generate PDF.", "error");
    }
  };

  const filteredData = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((row) => {
      const statusOk = activeTab === "All" || row.status === activeTab;
      const searchOk =
        !term ||
        row.bill.toLowerCase().includes(term) ||
        row.customer.toLowerCase().includes(term) ||
        row.phone.toLowerCase().includes(term) ||
        row.status.toLowerCase().includes(term);
      return statusOk && searchOk;
    });
  }, [activeTab, data, search]);

  const statusCounts = useMemo(() => {
    const counts: Record<CreditNoteStatus | "All", number> = {
      All: data.length,
      Final: 0,
      Draft: 0,
      Cancelled: 0,
    };
    for (const r of data) {
      if (counts[r.status] !== undefined) {
        counts[r.status]++;
      }
    }
    return counts;
  }, [data]);

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
  }, [activeTab, search, datePreset, fromDate, toDate, mobileSort]);

  const paginatedMobileData = useMemo(() => {
    return mobileDisplayData.slice(0, mobilePage * 20);
  }, [mobileDisplayData, mobilePage]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "amount",
        header: "Amount",
        Cell: ({ row }: { row: { original: CreditNoteRow } }) => (
          <span className="font-semibold text-gray-800">
            {`₹ ${row.original.amount.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}`}
          </span>
        ),
        size: 120,
      },
      {
        accessorKey: "status",
        header: "Status",
        Cell: ({
          cell,
        }: {
          cell: { getValue: () => CreditNoteStatus };
        }) => {
          const value = cell.getValue();
          const badgeClass =
            value === "Draft"
              ? "bg-slate-100 text-slate-700"
              : value === "Final"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700";
          return (
            <span
              className={`px-2.5 py-1 text-xs font-semibold rounded-md ${badgeClass}`}
            >
              {value.toLowerCase()}
            </span>
          );
        },
        size: 120,
      },
      {
        accessorKey: "bill",
        header: "Return #",
        Cell: ({ row }: { row: { original: CreditNoteRow } }) => (
          <div>
            <div className="font-medium text-gray-800">{row.original.bill}</div>
            {row.original.owner ? (
              <div className="text-xs text-gray-500">by {row.original.owner}</div>
            ) : null}
          </div>
        ),
        size: 180,
      },
      {
        accessorKey: "customer",
        header: "Customer",
        Cell: ({ row }: { row: { original: CreditNoteRow } }) => (
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
        accessorKey: "date",
        header: "Date",
        Cell: ({ row }: { row: { original: CreditNoteRow } }) => (
          <div>
            <div className="font-medium text-gray-800">{row.original.date}</div>
            <div className="text-xs text-gray-500">
              {row.original.createdTime}
            </div>
          </div>
        ),
        size: 170,
      },
      {
        accessorKey: "actions",
        header: "Actions",
        Cell: ({ row }: { row: { original: CreditNoteRow } }) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedActionRow(row.original)}
              className="flex items-center gap-1 rounded-md bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-200"
            >
             <Eye size={16} />
            </button>
          </div>
        ),
        size: 120,
      },
      {
        accessorKey: "shareInvoice",
        header: "Share Invoice",
        size: 220,
        Cell: ({ row }: { row: { original: CreditNoteRow } }) => {
          const cn = row.original;
          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleWhatsAppShare(cn)}
                className="flex items-center gap-1 rounded-md bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-200"
              >
                <img
                  src="https://cdn-icons-png.flaticon.com/512/733/733585.png"
                  alt="whatsapp"
                  className="h-4 w-4"
                />
              </button>
              <button
                type="button"
                onClick={() => void handleDownloadBill(cn)}
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

  const table = useMaterialReactTable({
    columns,
    data: filteredData,
    state: {
      isLoading: loading,
    },
    enableTopToolbar: true,
    enableBottomToolbar: true,
    enableColumnActions: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enableHiding: false,
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

  const totalAmount = filteredData.reduce((sum, row) => sum + row.amount, 0);
  const finalAmount = filteredData
    .filter((row) => row.status === "Final")
    .reduce((sum, row) => sum + row.amount, 0);
  const draftAmount = filteredData
    .filter((row) => row.status === "Draft")
    .reduce((sum, row) => sum + row.amount, 0);

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
      const pb = raw.paymentBreakdown || raw.refundBreakdown;

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
          raw.refundMode || raw.mode || raw.paymentMode || "Cash",
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
      const items = Array.isArray(raw.items)
        ? raw.items
        : Array.isArray(raw.returnItems)
          ? raw.returnItems
          : [];

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

  return (
    <>
      {/* ============================================================== */}
      {/* MOBILE RESPONSIVE VIEW (screens < md)                         */}
      {/* Matches user reference image from POS/Invoice section          */}
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
              className="relative shrink-0 pb-2.5 pt-1 text-sm font-bold text-blue-600 transition"
            >
              Credit Notes
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-blue-600" />
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
              onClick={() => navigate("/subscriptions")}
              className="relative shrink-0 pb-2.5 pt-1 text-sm font-medium text-slate-500 transition hover:text-slate-800"
            >
              Subscriptions
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

        {/* B. Summary Card: Date filter above Total Amount & Final Returns box */}
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
                onChange={(e) => {
                  const preset = e.target.value as DatePreset;
                  setDatePreset(preset);
                  if (preset === "custom") return;
                  const range = rangeForPreset(preset);
                  setFromDate(range.from);
                  setToDate(range.to);
                }}
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
                  onChange={(e) => setFromDate(e.target.value)}
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
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-7 w-full rounded-md border border-slate-200 bg-white px-1.5 text-[11px] text-slate-700 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Row 2: Paid Amount & Pending Box (Below Date Filter) */}
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
                  {formatCompactCurrency(finalAmount)}
                </div>
              </button>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Pending</div>
              <div className="mt-0.5 text-lg font-bold tracking-tight text-amber-600">
                {formatCompactCurrency(draftAmount)}
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
              placeholder="Search returns, customers..."
              className="h-10 w-full rounded-xl border border-slate-200/90 bg-white pl-8.5 pr-2.5 text-xs text-slate-800 placeholder:text-slate-400 shadow-xs focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Filter button (icon only) */}
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            aria-label="Filter"
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-xs transition active:scale-95 ${
              activeTab !== "All"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal
              size={15}
              className={activeTab !== "All" ? "text-blue-600" : "text-slate-500"}
            />
            {activeTab !== "All" && (
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
              aria-label="Sort credit notes"
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
                { key: "All" as const, label: "All" },
                { key: "Final" as const, label: "Final" },
                { key: "Draft" as const, label: "Draft" },
                { key: "Cancelled" as const, label: "Cancelled" },
              ] as { key: CreditNoteStatus | "All"; label: string }[]
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
                No credit notes found
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Try adjusting your search, filters, or date range.
              </p>
            </div>
          ) : (
            paginatedMobileData.map((row) => {
              const isFinal = row.status === "Final";
              const isDraft = row.status === "Draft";
              const isCancelled = row.status === "Cancelled";
              const customerName = row.customer || "Walk-in Customer";
              const shortDateTime = formatCardDateTime(row.raw, row.date);

              return (
                <div
                  key={row._id}
                  onClick={() => handleAction(row, "view")}
                  className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition hover:border-slate-300 active:bg-slate-50/70"
                >
                  {/* Top Section */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="truncate text-base font-bold text-slate-900">
                          {customerName}
                        </h3>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-500">
                          {row.bill}
                        </span>
                        {row.phone && (
                          <span className="text-[11px] text-slate-400">
                            • {row.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end">
                      {/* Status Badge with dot */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                          isFinal
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-600"
                            : isDraft
                              ? "border border-slate-200 bg-slate-100 text-slate-600"
                              : "border border-rose-200 bg-rose-50 text-rose-600"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isFinal
                              ? "bg-emerald-500"
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
                          ₹{row.amount.toLocaleString("en-IN", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Divider */}
                  <div className="my-2.5 border-t border-slate-100" />

                  {/* Bottom Section */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex min-w-0 items-center gap-1 truncate text-slate-400">
                      <Calendar size={13} className="shrink-0 text-slate-400" />
                      <span className="truncate">
                        {shortDateTime} • By {row.owner || "System"}
                      </span>
                    </div>

                    <div
                      className="flex shrink-0 items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedActionRow(row)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-95"
                        title="Credit Note Actions"
                        aria-label="Credit Note Actions"
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
        <Can permission={PERMISSIONS.CREDIT_NOTE_CREATE}>
          <button
            type="button"
            onClick={() => navigate("/create-sales-return")}
            className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/35 transition hover:bg-blue-700 active:scale-95 md:hidden"
            aria-label="Create Credit Note"
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
              className="flex flex-col items-center gap-1 text-slate-500 transition hover:text-slate-800"
            >
              <FileText size={20} />
              <span className="text-[10px] font-medium">Bills</span>
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
              className="flex flex-col items-center gap-1 font-semibold text-blue-600"
            >
              <Menu size={20} />
              <span className="text-[10px] font-semibold">More</span>
            </button>
          </div>
        </nav>

        {/* Mobile Filter Modal */}
        {mobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4 md:hidden">
            <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Filter Credit Notes
                </h3>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="space-y-4 py-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700">
                    Status
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["All", "Final", "Draft", "Cancelled"].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setActiveTab(status as any)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          activeTab === status
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("All");
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
                  Apply
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
                  type="button"
                  onClick={() => setMoreMenuOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    navigate("/pos");
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 hover:bg-slate-100"
                >
                  <span className="text-xs font-bold text-slate-800">
                    Sales / Invoices
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Bills & POS
                  </span>
                </button>

                <button
                  type="button"
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
                  type="button"
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
                    Recurring plans
                  </span>
                </button>

                <button
                  type="button"
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
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* DESKTOP VIEW (screens >= md)                                   */}
      {/* 100% UNTOUCHED original layout and functionality               */}
      {/* ============================================================== */}
      <div className="hidden md:block min-w-0 space-y-4 p-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
              Sales Returns / Credit Notes
            </h1>
            <span className="rounded-full bg-pink-100 px-2 py-0.5 text-xs font-medium text-pink-700">
              {filteredData.length}
            </span>
          </div>
          <Can permission={PERMISSIONS.CREDIT_NOTE_CREATE}>
            <button
              type="button"
              className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white sm:w-auto"
              onClick={() => navigate("/create-sales-return")}
            >
              + Create Sales Return / Credit Note
            </button>
          </Can>
        </div>

        <div className="hide-scrollbar flex items-center gap-4 overflow-x-auto border-b border-gray-200 pb-2 sm:gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("All")}
            className={`shrink-0 text-sm font-medium ${activeTab === "All" ? "border-b-2 border-blue-600 pb-1 text-blue-700" : "text-gray-500"}`}
          >
            All{" "}
            <span className="text-xs text-gray-400">{filteredData.length}</span>
          </button>
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 text-sm font-medium ${activeTab === tab ? "border-b-2 border-blue-600 pb-1 text-blue-700" : "text-gray-500"}`}
            >
              {tab}
            </button>
          ))}
        </div>  
        {fetchError && (
          <p className="text-sm text-red-600">{fetchError}</p>
        )}

        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
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
              className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-blue-400"
            >
              {DATE_PRESET_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
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
                onClick={() => {
                  setDatePreset("all");
                  setFromDate("");
                  setToDate("");
                }}
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
              Final ₹{" "}
              {finalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">
              Draft ₹{" "}
              {draftAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Action Dialog / Bottom Sheet (usable on both desktop & mobile) */}
      {selectedActionRow && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                Credit Note Actions
              </h3>
              <button
                type="button"
                onClick={() => setSelectedActionRow(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle size={20} />
              </button>
            </div>
            <div className="space-y-2.5 p-4 sm:p-5 max-h-[80vh] overflow-y-auto">
              <button
                type="button"
                onClick={() => handleAction(selectedActionRow, "view")}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-3 text-left transition hover:bg-gray-50 active:bg-gray-100"
              >
                <div className="rounded-full bg-violet-100 p-2 text-violet-600">
                  <Eye size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">
                    View Credit Note
                  </div>
                  <div className="text-xs text-gray-500">
                    View in read-only mode
                  </div>
                </div>
              </button>

              <Can permission={PERMISSIONS.CREDIT_NOTE_CREATE}>
                <button
                  type="button"
                  onClick={() => handleAction(selectedActionRow, "edit")}
                  disabled={selectedActionRow.status === "Cancelled"}
                  className={`flex w-full items-center gap-3 rounded-xl border border-gray-200 p-3 text-left transition ${selectedActionRow.status === "Cancelled" ? "cursor-not-allowed opacity-50" : "hover:bg-gray-50 active:bg-gray-100"}`}
                >
                  <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                    <Edit size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">
                      Edit Credit Note
                    </div>
                    <div className="text-xs text-gray-500">
                      Modify return details
                    </div>
                  </div>
                </button>
              </Can>

              <button
                type="button"
                onClick={() => {
                  const row = selectedActionRow;
                  setSelectedActionRow(null);
                  void handleWhatsAppShare(row);
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-3 text-left transition hover:bg-gray-50 active:bg-gray-100"
              >
                <div className="rounded-full bg-emerald-100 p-2 text-emerald-600">
                  <img
                    src="https://cdn-icons-png.flaticon.com/512/733/733585.png"
                    alt="whatsapp"
                    className="h-4 w-4"
                  />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">
                    Share on WhatsApp
                  </div>
                  <div className="text-xs text-gray-500">
                    Send PDF to customer
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  const row = selectedActionRow;
                  setSelectedActionRow(null);
                  void handleDownloadBill(row);
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-3 text-left transition hover:bg-gray-50 active:bg-gray-100"
              >
                <div className="rounded-full bg-sky-100 p-2 text-sky-600">
                  <Download size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">
                    Download PDF
                  </div>
                  <div className="text-xs text-gray-500">
                    Save offline copy
                  </div>
                </div>
              </button>

              <Can permission={PERMISSIONS.CREDIT_NOTE_CREATE}>
                <button
                  type="button"
                  onClick={() => handleAction(selectedActionRow, "cancel")}
                  disabled={selectedActionRow.status === "Cancelled"}
                  className={`flex w-full items-center gap-3 rounded-xl border border-gray-200 p-3 text-left transition ${selectedActionRow.status === "Cancelled" ? "cursor-not-allowed opacity-50" : "hover:bg-gray-50 active:bg-gray-100"}`}
                >
                  <div className="rounded-full bg-yellow-100 p-2 text-yellow-600">
                    <XCircle size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">
                      Cancel Credit Note
                    </div>
                    <div className="text-xs text-gray-500">
                      Mark status as cancelled
                    </div>
                  </div>
                </button>
              </Can>

              <Can permission={PERMISSIONS.CREDIT_NOTE_CREATE}>
                <button
                  type="button"
                  onClick={() => handleAction(selectedActionRow, "delete")}
                  className="flex w-full items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-3 text-left transition hover:bg-red-100 active:bg-red-200"
                >
                  <div className="rounded-full bg-red-200 p-2 text-red-700">
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-red-700">
                      Delete Credit Note
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

      {viewOpen && viewData && (
        <CreateSalesReturnScreen
          initialMode="view"
          initialData={viewData}
          onClose={() => {
            setViewOpen(false);
            setViewData(null);
          }}
        />
      )}
    </>
  );
}

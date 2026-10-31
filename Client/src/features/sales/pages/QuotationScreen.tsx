import { useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import {
  Eye,
  Edit,
  Trash2,
  Download,
  XCircle,
  Ellipsis,
  Search,
  ChevronDown,
  Calendar,
  Plus,
  Home,
  FileText,
  Package,
  Users,
  Menu,
  SlidersHorizontal,
  ArrowUpDown,
  CheckCircle,
  FileCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { handleGetQuotations, handleDeleteQuotation, handleUpdateQuotationStatus } from "@/services/apiClient";
import {
  DATE_PRESET_OPTIONS,
  getTodayYmd,
  rangeForPreset,
  type DatePreset,
} from "@/utils/datePresets";
import { downloadInvoicePdf, getInvoicePdfBlob } from "@/utils/pdfGenerator";
import {
  toQuotationPdfRecord,
} from "@/features/sales/utils/quotationPrintMapper";
import {
  buildWoowooInvoiceWhatsAppMessage,
  normalizeIndianWhatsAppDigits,
  resolveHostedInvoiceLink,
} from "@/utils/whatsappInvoiceShare";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";
import CreateQuotationScreen from "./CreateQuotationScreen";

type QuotationRow = {
  id: number;
  amount: number;
  status: "draft" | "sent" | "accepted" | "rejected";
  quotationCode: string;
  customer: string;
  phone: string;
  date: string;
  salesPerson: string;
  _id: string;
  raw: any;
};

function formatCardDateTime(raw: any, fallbackDate: string): string {
  const dateVal = raw?.createdAt || raw?.quotationDate || fallbackDate;
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

export default function QuotationScreen() {
  const navigate = useNavigate();
  const [data, setData] = useState<QuotationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [fromDate, setFromDate] = useState(getTodayYmd);
  const [toDate, setToDate] = useState(getTodayYmd);
  const [selectedActionRow, setSelectedActionRow] = useState<QuotationRow | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState<any>(null);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"All" | "draft" | "sent" | "accepted" | "rejected">("All");
  const [mobileSort, setMobileSort] = useState<
    "default" | "amount_desc" | "amount_asc" | "date_desc" | "date_asc"
  >("default");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [mobilePage, setMobilePage] = useState(1);
  const [showTotalDetails, setShowTotalDetails] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await handleGetQuotations("", undefined, fromDate, toDate);
     const formatted = (Array.isArray(res?.quotations) ? res.quotations : []).map((q: any, i: number) => ({
          id: i + 1,
          amount: q.grandTotal ?? 0,
          status: q.status || "draft",
          quotationCode: q.quotationCode || `QUOT-${q.quotationNumber}`,
          customer: q.customerName || "Unknown",
          phone: q.customerPhone || "",
          date: q.quotationDate ? new Date(q.quotationDate).toLocaleDateString() : "",
          salesPerson: q.salesPersonName || "Unknown",
          _id: q._id,
          raw: q,
        }));
        setData(formatted);
    } catch (error) {
      console.error("Error fetching data:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [fromDate, toDate]);

  const handleAction = async (
    action: "view" | "edit" | "delete" | "reject" | "accept" | "convert",
    targetRow?: QuotationRow | null,
  ) => {
    const row = targetRow || selectedActionRow;
    if (!row) return;
    const { _id, raw, status } = row;

    if (action === "view") {
      setViewData(raw);
      setViewOpen(true);
      setSelectedActionRow(null);
    } else if (action === "edit") {
      if (status === "rejected") {
        Swal.fire("Cannot Edit", "Rejected quotations cannot be edited.", "warning");
        return;
      }
      navigate("/create-quotation", { state: { quotation: raw, mode: "edit" } });
    } else if (action === "delete") {
      const confirm = await Swal.fire({
        title: "Delete Quotation?",
        text: "This action cannot be undone.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, Delete",
      });
      if (confirm.isConfirmed) {
        try {
          await handleDeleteQuotation(_id);
          Swal.fire("Deleted", "Quotation deleted successfully.", "success");
          void fetchData();
        } catch {
          Swal.fire("Error", "Failed to delete quotation.", "error");
        }
      }
    } else if (action === "reject") {
      if (status === "rejected") return;
      const confirm = await Swal.fire({
        title: "Reject Quotation?",
        text: "Mark this quotation as rejected?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, Reject",
      });
      if (confirm.isConfirmed) {
        try {
          await handleUpdateQuotationStatus(_id, "rejected");
          Swal.fire("Rejected", "Quotation marked as rejected.", "success");
          void fetchData();
        } catch {
          Swal.fire("Error", "Failed to reject quotation.", "error");
        }
      }
    } else if (action === "accept") {
      if (status === "accepted") return;
      const confirm = await Swal.fire({
        title: "Accept Quotation?",
        text: "Mark this quotation as accepted?",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Yes, Accept",
      });
      if (confirm.isConfirmed) {
        try {
          await handleUpdateQuotationStatus(_id, "accepted");
          Swal.fire("Accepted", "Quotation marked as accepted.", "success");
          void fetchData();
        } catch {
          Swal.fire("Error", "Failed to accept quotation.", "error");
        }
      }
    } else if (action === "convert") {
      navigate("/create-invoice", {
        state: {
          invoice: raw,
          mode: "create",
        },
      });
    }

    setSelectedActionRow(null);
  };

  const downloadPdf = (row: QuotationRow) => {
    downloadInvoicePdf(toQuotationPdfRecord(row.raw), "QUOTATION");
  };

  const shareOnWhatsApp = async (row: QuotationRow) => {
    try {
      const number = normalizeIndianWhatsAppDigits(row.phone);
      if (!number) {
        Swal.fire("Invalid Phone", "Customer phone number is invalid.", "error");
        return;
      }
      const pdfBlob = await getInvoicePdfBlob(
        toQuotationPdfRecord(row.raw),
        "QUOTATION",
      );

      const file = new File([pdfBlob.blob], `${row.quotationCode}.pdf`, { type: "application/pdf" });
      const publicLink = resolveHostedInvoiceLink(row.raw);
      const msg = buildWoowooInvoiceWhatsAppMessage({
        customerName: row.customer,
        docLabel: "Quotation",
        docCode: row.quotationCode,
        totalFormatted: `₹${row.amount.toLocaleString()}`,
        paymentStatus: row.status,
        externalLink: publicLink,
      });

      const waUrl = `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, "_blank");
      await handleUpdateQuotationStatus(row._id, "sent");
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Could not share via WhatsApp.", "error");
    }
  };

  const filteredData = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((row) => {
      const statusOk = activeTab === "All" || row.status === activeTab;
      const searchOk =
        !term ||
        row.quotationCode.toLowerCase().includes(term) ||
        row.customer.toLowerCase().includes(term) ||
        row.phone.toLowerCase().includes(term) ||
        row.salesPerson.toLowerCase().includes(term) ||
        row.status.toLowerCase().includes(term);
      return statusOk && searchOk;
    });
  }, [activeTab, data, search]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: data.length,
      draft: 0,
      sent: 0,
      accepted: 0,
      rejected: 0,
    };
    for (const r of data) {
      const s = String(r.status || "").toLowerCase();
      if (counts[s] !== undefined) {
        counts[s]++;
      }
    }
    return counts;
  }, [data]);

  const totalAmount = useMemo(
    () => filteredData.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [filteredData],
  );
  const acceptedAmount = useMemo(
    () =>
      filteredData
        .filter((row) => row.status === "accepted")
        .reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [filteredData],
  );
  const pendingAmount = Math.max(0, totalAmount - acceptedAmount);

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
          raw.mode || raw.paymentMode || row.raw?.mode || "Other",
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
          segments.General += amt;
        }
      }
    }

    return segments;
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
          new Date(String(b.raw?.quotationDate || b.raw?.createdAt || 0)).getTime() -
          new Date(String(a.raw?.quotationDate || a.raw?.createdAt || 0)).getTime(),
      );
    }
    if (mobileSort === "date_asc") {
      return sorted.sort(
        (a, b) =>
          new Date(String(a.raw?.quotationDate || a.raw?.createdAt || 0)).getTime() -
          new Date(String(b.raw?.quotationDate || b.raw?.createdAt || 0)).getTime(),
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
      { accessorKey: "id", header: "SN", size: 60 },
      { accessorKey: "quotationCode", header: "Quotation No", size: 140 },
      { accessorKey: "customer", header: "Customer", size: 150 },
      { accessorKey: "phone", header: "Phone", size: 120 },
      { accessorKey: "date", header: "Date", size: 100 },
      {
        accessorKey: "amount",
        header: "Total",
        size: 100,
        Cell: ({ cell }: any) => `₹${cell.getValue()}`,
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 120,
        Cell: ({ cell }: any) => {
          const val = cell.getValue();
          let cls = "bg-gray-100 text-gray-700";
          if (val === "draft") cls = "bg-gray-100 text-gray-700";
          if (val === "sent") cls = "bg-blue-100 text-blue-700";
          if (val === "accepted") cls = "bg-green-100 text-green-700";
          if (val === "rejected") cls = "bg-red-100 text-red-700";
          return (
            <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${cls}`}>
              {val}
            </span>
          );
        },
      },
      {
        accessorKey: "actions",
        header: "Actions",
        Cell: ({ row }: any) => (
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
        size: 100,
      },
      {
        accessorKey: "shareInvoice",
        header: "Share Quotation",
        size: 220,
        Cell: ({ row }: any) => {
          return (
            <div className="flex items-center gap-2">
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  shareOnWhatsApp(row.original);
                }}
                className="flex items-center gap-1 rounded-md bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-200"
              >
                <img
                  src="https://cdn-icons-png.flaticon.com/512/733/733585.png"
                  alt="whatsapp"
                  className="h-4 w-4"
                />
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  downloadPdf(row.original);
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
    [selectedActionRow],
  );

  const table = useMaterialReactTable({
    columns,
    data,
    state: { isLoading: loading },
    muiTablePaperProps: {
      elevation: 0,
      style: { boxShadow: "none", border: "1px solid #e5e7eb" },
    },
    muiTableContainerProps: {
      sx: {
        maxWidth: "100%",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      },
    },
  });

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
              onClick={() => navigate("/creditnotes")}
              className="relative shrink-0 pb-2.5 pt-1 text-sm font-medium text-slate-500 transition hover:text-slate-800"
            >
              Credit Notes
            </button>
            <button
              type="button"
              className="relative shrink-0 pb-2.5 pt-1 text-sm font-bold text-blue-600 transition"
            >
              Quotations
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-blue-600" />
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

        {/* B. Summary Card: Date filter above Total Quotation & Accepted box */}
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
                  {formatCompactCurrency(acceptedAmount)}
                </div>
              </button>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Pending</div>
              <div className="mt-0.5 text-lg font-bold tracking-tight text-amber-600">
                {formatCompactCurrency(pendingAmount)}
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
              placeholder="Search quotations, customers..."
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
              aria-label="Sort quotations"
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
                { key: "All", label: "All" },
                { key: "draft", label: "Draft" },
                { key: "sent", label: "Sent" },
                { key: "accepted", label: "Accepted" },
                { key: "rejected", label: "Rejected" },
              ] as { key: "All" | QuotationRow["status"]; label: string }[]
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
                No quotations found
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Try adjusting your search, filters, or date range.
              </p>
            </div>
          ) : (
            paginatedMobileData.map((row) => {
              const isAccepted = row.status === "accepted";
              const isSent = row.status === "sent";
              const isDraft = row.status === "draft";
              const isRejected = row.status === "rejected";
              const customerName = row.customer || "Walk-in Customer";
              const shortDateTime = formatCardDateTime(row.raw, row.date);

              return (
                <div
                  key={row._id}
                  onClick={() => void handleAction("view", row)}
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
                          {row.quotationCode}
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
                          isAccepted
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-600"
                            : isSent
                              ? "border border-blue-200 bg-blue-50 text-blue-600"
                              : isRejected
                                ? "border border-rose-200 bg-rose-50 text-rose-600"
                                : "border border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isAccepted
                              ? "bg-emerald-500"
                              : isSent
                                ? "bg-blue-500"
                                : isRejected
                                  ? "bg-rose-500"
                                  : "bg-slate-400"
                          }`}
                        />
                        {row.status}
                      </span>

                      {/* Amount */}
                      <div className="mt-1.5 text-right">
                        <span className="text-base font-bold text-slate-900">
                          ₹{Number(row.amount || 0).toLocaleString("en-IN", {
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
                        {shortDateTime} • By {row.salesPerson || "System"}
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
                        title="Quotation Actions"
                        aria-label="Quotation Actions"
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
        <Can permission={PERMISSIONS.QUOTATION_CREATE}>
          <button
            type="button"
            onClick={() => navigate("/create-quotation")}
            className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/35 transition hover:bg-blue-700 active:scale-95 md:hidden"
            aria-label="Create Quotation"
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
                  Filter Quotations
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
                    {["All", "draft", "sent", "accepted", "rejected"].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setActiveTab(status as any)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
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
                    navigate("/creditnotes");
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 hover:bg-slate-100"
                >
                  <span className="text-xs font-bold text-slate-800">
                    Credit Notes
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Returns & refunds
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
      <div className="hidden md:block min-w-0 p-1 sm:p-4">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-gray-800 sm:text-2xl">Quotations</h1>
          <div className="flex gap-3">
            <Can permission={PERMISSIONS.QUOTATION_CREATE}>
              <button
                onClick={() => navigate("/create-quotation")}
                className="w-full rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 sm:w-auto"
              >
                Create Quotation
              </button>
            </Can>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row sm:flex-wrap sm:items-center">
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
      </div>

      {/* Action Dialog / Bottom Sheet (usable on both desktop & mobile) */}
      {selectedActionRow && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                Quotation Actions
              </h3>
              <button
                onClick={() => setSelectedActionRow(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle size={20} />
              </button>
            </div>
            <div className="space-y-2.5 p-4 sm:p-5 max-h-[80vh] overflow-y-auto">
              <button
                onClick={() => void handleAction("view", selectedActionRow)}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-3 text-left transition hover:bg-gray-50 active:bg-gray-100"
              >
                <div className="rounded-full bg-violet-100 p-2 text-violet-600">
                  <Eye size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">
                    View Quotation
                  </div>
                  <div className="text-xs text-gray-500">
                    View in read-only mode
                  </div>
                </div>
              </button>

              <Can permission={PERMISSIONS.QUOTATION_UPDATE}>
                <button
                  onClick={() => void handleAction("edit", selectedActionRow)}
                  disabled={selectedActionRow.status === "rejected"}
                  className={`flex w-full items-center gap-3 rounded-xl border border-gray-200 p-3 text-left transition ${selectedActionRow.status === "rejected" ? "cursor-not-allowed opacity-50" : "hover:bg-gray-50 active:bg-gray-100"}`}
                >
                  <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                    <Edit size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">
                      Edit Quotation
                    </div>
                    <div className="text-xs text-gray-500">
                      Modify quotation details
                    </div>
                  </div>
                </button>
              </Can>

              <Can permission={PERMISSIONS.INVOICE_CREATE}>
                <button
                  onClick={() => void handleAction("convert", selectedActionRow)}
                  className="flex w-full items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-left transition hover:bg-indigo-100 active:bg-indigo-200"
                >
                  <div className="rounded-full bg-indigo-200 p-2 text-indigo-700">
                    <FileCheck size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-indigo-700">
                      Convert to Invoice
                    </div>
                    <div className="text-xs text-indigo-600/70">
                      Generate sales invoice
                    </div>
                  </div>
                </button>
              </Can>

              <button
                type="button"
                onClick={() => {
                  const row = selectedActionRow;
                  setSelectedActionRow(null);
                  void shareOnWhatsApp(row);
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
                    Send quotation to customer
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  const row = selectedActionRow;
                  setSelectedActionRow(null);
                  downloadPdf(row);
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

              {selectedActionRow.status !== "accepted" && (
                <button
                  type="button"
                  onClick={() => void handleAction("accept", selectedActionRow)}
                  className="flex w-full items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-left transition hover:bg-emerald-100 active:bg-emerald-200"
                >
                  <div className="rounded-full bg-emerald-200 p-2 text-emerald-700">
                    <CheckCircle size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-emerald-800">
                      Accept Quotation
                    </div>
                    <div className="text-xs text-emerald-600/80">
                      Mark as accepted by customer
                    </div>
                  </div>
                </button>
              )}

              {selectedActionRow.status !== "rejected" && (
                <button
                  type="button"
                  onClick={() => void handleAction("reject", selectedActionRow)}
                  className="flex w-full items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-left transition hover:bg-amber-100 active:bg-amber-200"
                >
                  <div className="rounded-full bg-amber-200 p-2 text-amber-700">
                    <XCircle size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-amber-800">
                      Reject Quotation
                    </div>
                    <div className="text-xs text-amber-600/80">
                      Mark as rejected
                    </div>
                  </div>
                </button>
              )}

              <Can permission={PERMISSIONS.QUOTATION_DELETE}>
                <button
                  onClick={() => void handleAction("delete", selectedActionRow)}
                  className="flex w-full items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-3 text-left transition hover:bg-red-100 active:bg-red-200"
                >
                  <div className="rounded-full bg-red-200 p-2 text-red-700">
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-red-700">
                      Delete Quotation
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
        <CreateQuotationScreen
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

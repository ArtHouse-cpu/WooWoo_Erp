import { useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_Cell,
} from "material-react-table";
import {
  Download,
  Edit,
  MoreHorizontal,
  SendHorizontal,
  XCircle,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronDown,
  Plus,
  Menu,
  Package,
  Users,
  Home,
  Calendar,
  Ellipsis,
  FileText,
  Trash2,
} from "lucide-react";
import MobilePurchaseDetailsModal from "../components/MobilePurchaseDetailsModal";
import { useNavigate } from "react-router-dom";
import { handleGetPurchaseReturns } from "@/services/apiClient";
import {
  DATE_PRESET_OPTIONS,
  getTodayYmd,
  rangeForPreset,
  type DatePreset,
} from "@/utils/datePresets";
import Swal from "sweetalert2";
import { downloadInvoicePdf, getInvoicePdfBlob } from "@/utils/pdfGenerator";
import {
  buildWoowooInvoiceWhatsAppMessage,
  normalizeIndianWhatsAppDigits,
  resolveHostedInvoiceLink,
} from "@/utils/whatsappInvoiceShare";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";
import CreatePurchaseReturnScreen from "./CreatePurchaseReturnScreen";
import {
  displayPaymentMode,
  displayPaymentStatus,
  displayPurchaseType,
} from "@/features/purchase/utils/purchasePaymentDisplay";

type DebitNoteRow = {
  id: string;
  purchaser: string;
  account: string;
  status: string;
  mode: string;
  purchaseType: string;
  amount: number;
  bill: string;
  invoiceNumber: string;
  vendor: string;
  phone: string;
  date: string;
  raw: Record<string, unknown>;
};

type PurchaseReturnApiItem = {
  _id?: string;
  invoiceNumber?: string;
  supplierName?: string;
  phoneNumber?: string;
  vendorPhone?: string;
  mobile?: string;
  purchaser?: string;
  status?: string;
  paymentMode?: string;
  purchaseType?: string;
  amount?: number;
  invoiceDate?: string;
};

const formatCompactCurrency = (value: number) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
  return `₹${value.toLocaleString("en-IN")}`;
};

function formatCardDateTime(raw?: any, dateStr?: string): string {
  const dVal = raw?.invoiceDate || raw?.createdAt || raw?.date || dateStr;
  if (!dVal) return dateStr || "";
  const d = new Date(dVal);
  if (Number.isNaN(d.getTime())) return dateStr || "";
  const formattedDate = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  const formattedTime = d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${formattedDate}, ${formattedTime}`;
}

export default function DebitNoteScreen() {
  const navigate = useNavigate();
  const [data, setData] = useState<DebitNoteRow[]>([]);
  const [activeTab, setActiveTab] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [fromDate, setFromDate] = useState(getTodayYmd);
  const [toDate, setToDate] = useState(getTodayYmd);
  const [selectedActionRow, setSelectedActionRow] = useState<DebitNoteRow | null>(
    null,
  );
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState<any>(null);

  // Mobile specific state
  const [mobileSort, setMobileSort] = useState<
    "default" | "amount_desc" | "amount_asc" | "date_desc" | "date_asc"
  >("default");
  const [mobileModeFilter, setMobileModeFilter] = useState<string>("All");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [mobileDetailsDoc, setMobileDetailsDoc] = useState<any>(null);
  const [mobilePage, setMobilePage] = useState(1);
  const [showTotalDetails, setShowTotalDetails] = useState(false);

  const docForPdf = (raw: Record<string, unknown>): Record<string, unknown> => {
    const amt = Number(raw.amount ?? raw.grandTotal ?? 0);
    return {
      ...raw,
      customerName: String(raw.supplierName ?? raw.customerName ?? "Vendor"),
      customerPhone: String(
        raw.phoneNumber ??
          raw.vendorPhone ??
          raw.mobile ??
          raw.customerPhone ??
          "",
      ),
      invoiceDate: String(raw.invoiceDate ?? raw.createdAt ?? ""),
      dueDate: String(raw.vendorDate ?? raw.dueDate ?? raw.invoiceDate ?? ""),
      grandTotal: Number(raw.grandTotal ?? amt) || amt,
      subTotal:
        typeof raw.subTotal === "number" && !Number.isNaN(raw.subTotal)
          ? raw.subTotal
          : amt,
      discountTotal: Number(raw.discountTotal ?? 0),
      invoiceCode: String(raw.invoiceCode ?? raw.invoiceNumber ?? "—"),
      mode: String(raw.paymentMode ?? raw.mode ?? "—"),
    };
  };

  const columns = useMemo(
    () => [
      { accessorKey: "id", header: "ID", size: 70 },
      {
        accessorKey: "status",
        header: "Status",
        Cell: ({ cell }: { cell: MRT_Cell<DebitNoteRow> }) => {
          const value = String(cell.getValue() ?? "");
          const v = value.toLowerCase();

          const badgeClass =
            v === "due"
              ? "bg-amber-100 text-amber-800"
              : v === "pending" || v === "partial"
              ? "bg-yellow-100 text-yellow-700"
              : v === "paid"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700";

          return (
            <span
              className={`px-3 py-1 text-xs font-medium rounded-full ${badgeClass}`}
            >
              {value || "N/A"}
            </span>
          );
        },
      },
      { accessorKey: "mode", header: "Payment Mode" },
      { accessorKey: "purchaseType", header: "Purchase Type" },
      { accessorKey: "bill", header: "Amount" },
      { accessorKey: "invoiceNumber", header: "Invoice Number" },
      // { accessorKey: "purchaser", header: "Purchaser" },
      {
        accessorKey: "vendor",
        header: "Vendor",
        Cell: ({ row }: { row: { original: DebitNoteRow } }) => {
          const { vendor, purchaser } = row.original;

          return (
            <div className="flex flex-col leading-tight">
              <span className="font-medium text-gray-900">{vendor || "-"}</span>
              <span className="text-xs text-gray-500">
                {purchaser ? `By: ${purchaser}` : ""}
              </span>
            </div>
          );
        },
      },
      { accessorKey: "date", header: "Date" },
      {
        header: "Actions",
        accessorKey: "actions",
        Cell: ({ row }: { row: { original: DebitNoteRow } }) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedActionRow(row.original)}
              className="flex items-center gap-1 rounded-md bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-200"
            >
              Actions
            </button>
          </div>
        ),
      },
      {
        accessorKey: "shareInvoice",
        header: "Share Invoice",
        Cell: ({ row }: { row: { original: DebitNoteRow } }) => {
          const pr = row.original;
          const pdfInput = docForPdf(pr.raw);

          const handleWhatsAppShare = async () => {
            const customerName =
              String(pr.vendor || pdfInput.customerName || "Vendor").trim() ||
              "Vendor";
            const docCode = String(pdfInput.invoiceCode ?? pr.bill ?? pr.id);
            const docLabel = "Purchase Return";
            const totalVal = Number(pdfInput.grandTotal ?? pr.amount ?? 0);
            const totalFormatted = `₹ ${totalVal.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`;
            const hostedLink = resolveHostedInvoiceLink(pdfInput);

            const message = buildWoowooInvoiceWhatsAppMessage({
              customerName,
              docLabel,
              docCode,
              totalFormatted,
              paymentStatus: String(pr.status || "pending"),
              externalLink: hostedLink || undefined,
            });

            Swal.fire({
              title: "Preparing…",
              text: "Generating purchase return PDF for WhatsApp",
              allowOutsideClick: false,
              didOpen: () => Swal.showLoading(),
            });

            let blobPkg: { blob: Blob; filename: string } | null = null;
            try {
              blobPkg = await getInvoicePdfBlob(pdfInput, "DEBIT NOTE");
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
                await navigator.share({ text: message, files: [pdfFile] });
                return;
              } catch (err) {
                const aborted = err instanceof Error && err.name === "AbortError";
                if (aborted) return;
                console.warn("Share sheet failed, opening WhatsApp Web:", err);
              }
            }

            const digits = normalizeIndianWhatsAppDigits(
              String(pr.phone || pdfInput.customerPhone || ""),
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
              await Swal.fire({
                icon: "info",
                title: "PDF downloaded",
                text: "Attach the downloaded PDF to your WhatsApp message (WhatsApp Web cannot auto-attach files).",
              });
            }
          };

          const handleDownloadBill = async () => {
            try {
              Swal.fire({
                title: "Generating PDF...",
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
              });
              await downloadInvoicePdf(pdfInput, "DEBIT NOTE");
              Swal.close();
            } catch {
              Swal.fire("Error", "Could not generate PDF.", "error");
            }
          };

          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleWhatsAppShare()}
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
                onClick={() => void handleDownloadBill()}
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

  useEffect(() => {
    const controller = new AbortController();

    const fetchPurchaseReturns = async () => {
      try {
        setLoading(true);
        const response = await handleGetPurchaseReturns(
          controller.signal,
          fromDate,
          toDate,
        );
        const purchaseReturns = Array.isArray(response?.purchaseReturns)
          ? response.purchaseReturns
          : [];

        const mappedRows = purchaseReturns.map(
          (item: PurchaseReturnApiItem, index: number) => ({
            id: item.invoiceNumber || item._id || String(index + 1),
            purchaser: item.purchaser || "-",
            account: item.supplierName || "-",
            status: displayPaymentStatus({
              status: item.status,
              purchaseType: item.purchaseType,
              paymentMode: item.paymentMode,
            }),
            mode: displayPaymentMode({
              status: item.status,
              purchaseType: item.purchaseType,
              paymentMode: item.paymentMode,
            }),
            purchaseType: displayPurchaseType({
              status: item.status,
              purchaseType: item.purchaseType,
              paymentMode: item.paymentMode,
            }),
            amount: Number(item.amount ?? 0),
            invoiceNumber: item.invoiceNumber || "-",
            bill: `₹${Number(item.amount ?? 0).toLocaleString("en-IN")}`,
            vendor: item.supplierName || "-",
            phone: item.phoneNumber || item.vendorPhone || item.mobile || "",
            date: item.invoiceDate
              ? new Date(item.invoiceDate).toISOString().split("T")[0]
              : "-",
            raw: item as Record<string, unknown>,
          }),
        );

        setData(mappedRows);
      } catch (error) {
        if ((error as { name?: string })?.name === "CanceledError") return;
        if ((error as { code?: string })?.code === "ERR_CANCELED") return;
        console.log("Error fetching purchase returns:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchPurchaseReturns();

    return () => {
      controller.abort();
    };
  }, [fromDate, toDate]);

  const onWhatsAppShare = async (rawOrRow: any) => {
    const pr = rawOrRow?.raw ?? rawOrRow;
    const pdfInput = docForPdf(pr);
    const customerName =
      String(pr.vendor || pr.supplierName || pdfInput.customerName || "Vendor").trim() ||
      "Vendor";
    const docCode = String(
      pdfInput.invoiceCode ?? pr.bill ?? pr.invoiceNumber ?? pr._id,
    );
    const docLabel = "Debit Note";
    const totalVal = Number(pdfInput.grandTotal ?? pr.amount ?? 0);
    const totalFormatted = `₹ ${totalVal.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    const paymentStatus = pr.statusRaw || pr.status;
    const hostedLink = resolveHostedInvoiceLink(pdfInput);

    const message = buildWoowooInvoiceWhatsAppMessage({
      customerName,
      docLabel,
      docCode,
      totalFormatted,
      paymentStatus: String(paymentStatus),
      externalLink: hostedLink || undefined,
    });

    Swal.fire({
      title: "Preparing…",
      text: "Generating debit note PDF for WhatsApp",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    let blobPkg: { blob: Blob; filename: string } | null = null;
    try {
      blobPkg = await getInvoicePdfBlob(pdfInput, "DEBIT NOTE");
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
        await navigator.share({ text: message, files: [pdfFile] });
        return;
      } catch (err) {
        const aborted =
          err instanceof Error && err.name === "AbortError";
        if (aborted) return;
      }
    }

    const digits = normalizeIndianWhatsAppDigits(
      String(pr.phone || pr.vendorPhone || pr.supplierPhone || ""),
    );
    const waBase = digits ? `https://wa.me/${digits}` : "https://wa.me/";
    window.open(`${waBase}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const onDownloadPdf = async (rawOrRow: any) => {
    const pr = rawOrRow?.raw ?? rawOrRow;
    const pdfInput = docForPdf(pr);
    try {
      Swal.fire({
        title: "Generating PDF...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      await downloadInvoicePdf(pdfInput, "DEBIT NOTE");
      Swal.close();
    } catch {
      Swal.fire("Error", "Could not generate PDF.", "error");
    }
  };

  const filteredData = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((row) => {
      const statusOk =
        activeTab === "All" ||
        row.status.toLowerCase() === activeTab.toLowerCase();
      const searchOk =
        !term ||
        row.bill.toLowerCase().includes(term) ||
        row.vendor.toLowerCase().includes(term) ||
        row.phone.toLowerCase().includes(term) ||
        row.mode.toLowerCase().includes(term) ||
        row.status.toLowerCase().includes(term) ||
        row.invoiceNumber.toLowerCase().includes(term);
      return statusOk && searchOk;
    });
  }, [activeTab, data, search]);

  const totalAmount = filteredData.reduce((s, r) => s + r.amount, 0);
  const paidAmount = filteredData
    .filter((r) => r.status.toLowerCase() === "paid")
    .reduce((s, r) => s + r.amount, 0);
  const pendingAmount = filteredData
    .filter(
      (r) =>
        r.status.toLowerCase() === "pending" ||
        r.status.toLowerCase() === "due" ||
        r.status.toLowerCase() === "partial",
    )
    .reduce((s, r) => s + r.amount, 0);

  const paymentModesBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {
      Cash: 0,
      UPI: 0,
      Card: 0,
      Other: 0,
    };
    for (const r of filteredData) {
      const m = (r.mode || "").toUpperCase();
      if (m === "CASH") breakdown.Cash += r.amount;
      else if (m === "UPI") breakdown.UPI += r.amount;
      else if (m === "CARD") breakdown.Card += r.amount;
      else breakdown.Other += r.amount;
    }
    return breakdown;
  }, [filteredData]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: data.length,
      Paid: 0,
      Due: 0,
      Pending: 0,
      Draft: 0,
      Cancelled: 0,
    };
    for (const r of data) {
      const s = r.status.toLowerCase();
      if (s === "paid") counts.Paid++;
      else if (s === "due") counts.Due++;
      else if (s === "pending" || s === "partial") counts.Pending++;
      else if (s === "draft") counts.Draft++;
      else if (s === "cancelled" || s === "canceled") counts.Cancelled++;
    }
    return counts;
  }, [data]);

  const mobileDisplayData = useMemo(() => {
    let list = [...filteredData];
    if (mobileModeFilter !== "All") {
      list = list.filter(
        (r) => (r.mode || "").toLowerCase() === mobileModeFilter.toLowerCase(),
      );
    }
    if (mobileSort === "amount_desc") {
      list.sort((a, b) => b.amount - a.amount);
    } else if (mobileSort === "amount_asc") {
      list.sort((a, b) => a.amount - b.amount);
    } else if (mobileSort === "date_desc") {
      list.sort(
        (a, b) =>
          new Date(
            (b.raw.invoiceDate as string) || (b.raw.createdAt as string) || 0,
          ).getTime() -
          new Date(
            (a.raw.invoiceDate as string) || (a.raw.createdAt as string) || 0,
          ).getTime(),
      );
    } else if (mobileSort === "date_asc") {
      list.sort(
        (a, b) =>
          new Date(
            (a.raw.invoiceDate as string) || (a.raw.createdAt as string) || 0,
          ).getTime() -
          new Date(
            (b.raw.invoiceDate as string) || (b.raw.createdAt as string) || 0,
          ).getTime(),
      );
    }
    return list;
  }, [filteredData, mobileModeFilter, mobileSort]);

  const paginatedMobileData = useMemo(() => {
    return mobileDisplayData.slice(0, mobilePage * 15);
  }, [mobileDisplayData, mobilePage]);

  const table = useMaterialReactTable({
    columns,
    data,
    muiTablePaperProps: {
      elevation: 0,
      style: {
        boxShadow: "none",
        border: "1px solid #e5e7eb",
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
  return (
    <div className="min-w-0 space-y-2.5 p-1 sm:space-y-4">
      {/* ============================================================== */}
      {/* MOBILE RESPONSIVE VIEW (screens < md / 768px)                  */}
      {/* Matches user reference Invoice screen layout                   */}
      {/* ============================================================== */}
      <div className="block md:hidden space-y-3 pb-24">
        {/* A. Top Navigation Tabs */}
        <div className="-mx-1 border-b border-slate-200 bg-white px-2">
          <div className="hide-scrollbar flex items-center gap-6 overflow-x-auto pt-1">
            <button
              type="button"
              onClick={() => navigate("/purchase")}
              className="relative shrink-0 pb-2.5 pt-1 text-sm font-medium text-slate-500 transition hover:text-slate-800"
            >
              Purchases
            </button>
            <button
              type="button"
              onClick={() => navigate("/purchase-orders")}
              className="relative shrink-0 pb-2.5 pt-1 text-sm font-medium text-slate-500 transition hover:text-slate-800"
            >
              Orders
            </button>
            <button
              type="button"
              className="relative shrink-0 pb-2.5 pt-1 text-sm font-bold text-blue-600 transition"
            >
              Debit Notes
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

        {/* B. Summary Card: Date filter above Total Amount & Pending box */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
          {/* Row 1: Total Returns (Left, prominent) & Date Filter (Right, compact micro-pill) */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-1.5 text-left">
              <span className="text-xs font-semibold text-slate-500">Total Returns:</span>
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

          {/* Custom Date Pickers if custom selected */}
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
                  className="h-7 w-full rounded-md border border-slate-200 px-1.5 text-[11px] text-slate-700"
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
                  className="h-7 w-full rounded-md border border-slate-200 px-1.5 text-[11px] text-slate-700"
                />
              </div>
            </div>
          )}

          {/* Row 2: Paid Amount & Pending Due Box */}
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
              <div className="mt-0.5 text-lg font-bold tracking-tight text-amber-600">
                {formatCompactCurrency(pendingAmount)}
              </div>
            </div>
          </div>

          {/* Collapsible Total Amount Details: Payment Modes */}
          {showTotalDetails && (
            <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Payment Modes Breakdown
                </div>
                <div className="grid grid-cols-2 gap-2">
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
                  {paymentModesBreakdown.Other > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Other</span>
                      <span className="font-semibold text-slate-800">
                        {formatCompactCurrency(paymentModesBreakdown.Other)}
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
              placeholder="Search debit notes..."
              className="h-10 w-full rounded-xl border border-slate-200/90 bg-white pl-8.5 pr-2.5 text-xs text-slate-800 placeholder:text-slate-400 shadow-xs focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Filter button (icon only) */}
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            aria-label="Filter"
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-xs transition active:scale-95 ${
              mobileModeFilter !== "All"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal size={15} />
            {mobileModeFilter !== "All" && (
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-blue-600" />
            )}
          </button>

          {/* Default/Sort button (icon only) */}
          <div
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-xs transition active:scale-95 ${
              mobileSort !== "default"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50"
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
              aria-label="Sort returns"
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
            {[
              { key: "All", label: "All" },
              { key: "Paid", label: "Paid" },
              { key: "Due", label: "Due" },
              { key: "Pending", label: "Pending" },
              { key: "Draft", label: "Draft" },
              { key: "Cancelled", label: "Cancelled" },
            ].map((tab) => {
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

        {/* E. Debit Note Cards List (One Box Per Record) */}
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
                No debit notes found
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Try adjusting your search, filters, or date range.
              </p>
            </div>
          ) : (
            paginatedMobileData.map((row) => {
              const isPaid = row.status.toLowerCase() === "paid";
              const isDue = row.status.toLowerCase() === "due";
              const isDraft = row.status.toLowerCase() === "draft";
              const isCancelled =
                row.status.toLowerCase() === "cancelled" ||
                row.status.toLowerCase() === "canceled";
              const vendorName = row.vendor || "Vendor";
              const shortDateTime = formatCardDateTime(row.raw, row.date);

              return (
                <div
                  key={row.id}
                  onClick={() => {
                    setMobileDetailsDoc(row);
                    setMobileDetailsOpen(true);
                  }}
                  className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition hover:border-slate-300 active:bg-slate-50/70"
                >
                  {/* Card Top Section */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="truncate text-base font-bold text-slate-900">
                          {vendorName}
                        </h3>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-500">
                          {row.id}
                        </span>
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                          {row.mode}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end">
                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                          isPaid
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-600"
                            : isDue
                              ? "border border-amber-200 bg-amber-50 text-amber-600"
                              : isDraft
                                ? "border border-slate-200 bg-slate-100 text-slate-600"
                                : isCancelled
                                  ? "border border-rose-200 bg-rose-50 text-rose-600"
                                  : "border border-amber-200 bg-amber-50 text-amber-600"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isPaid
                              ? "bg-emerald-500"
                              : isDue
                                ? "bg-amber-500"
                                : isDraft
                                  ? "bg-slate-400"
                                  : isCancelled
                                    ? "bg-rose-500"
                                    : "bg-amber-500"
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
                      </div>
                    </div>
                  </div>

                  {/* Subtle Horizontal Divider */}
                  <div className="my-2.5 border-t border-slate-100" />

                  {/* Card Bottom Section */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex min-w-0 items-center gap-1 truncate text-slate-400">
                      <Calendar size={13} className="shrink-0 text-slate-400" />
                      <span className="truncate">
                        {shortDateTime} • By {row.purchaser || "System"}
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
                        title="Debit Note Actions"
                        aria-label="Debit Note Actions"
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
        <Can permission={PERMISSIONS.DEBIT_NOTE_CREATE}>
          <button
            type="button"
            onClick={() => navigate("/create-purchase-return")}
            className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/35 transition hover:bg-blue-700 active:scale-95 md:hidden"
            aria-label="Create Debit Note"
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
              onClick={() => navigate("/purchase")}
              className="flex flex-col items-center gap-1 font-semibold text-blue-600"
            >
              <Package size={20} />
              <span className="text-[10px] font-semibold">Purchases</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/vendors")}
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
                  Filter Debit Notes
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
                    {["All", "Cash", "UPI", "Card", "Credit"].map(
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
                    Direct Invoices
                  </span>
                </button>

                <button
                  onClick={() => {
                    setMoreMenuOpen(false);
                    navigate("/purchase-orders");
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 hover:bg-slate-100"
                >
                  <span className="text-xs font-bold text-slate-800">
                    Purchase Orders
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Manage Orders
                  </span>
                </button>

                <button
                  onClick={() => {
                    setMoreMenuOpen(false);
                    navigate("/vendors");
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 hover:bg-slate-100"
                >
                  <span className="text-xs font-bold text-slate-800">
                    Vendors
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Suppliers Directory
                  </span>
                </button>

                <button
                  onClick={() => {
                    setMoreMenuOpen(false);
                    navigate("/pos");
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 hover:bg-slate-100"
                >
                  <span className="text-xs font-bold text-slate-800">
                    Sales & POS
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Customer Invoices
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* DESKTOP VIEW (Visible only on desktop: screens >= md / 768px)  */}
      {/* 100% Original unchanged desktop layout, table, and controls   */}
      {/* ============================================================== */}
      <div className="hidden md:block space-y-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">
          Purchase Returns / Debit Notes
        </h1>
        <div className="flex gap-3">
          <Can permission={PERMISSIONS.DEBIT_NOTE_CREATE}>
            <button
              type="button"
              onClick={() => navigate("/create-purchase-return")}
              className="w-full rounded bg-black px-3 py-2 text-center text-[14px] font-semibold text-white transition cursor-pointer sm:w-auto"
            >
              Create Purchase Return/Debit Note
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

      {selectedActionRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Debit Note Actions
              </h3>
              <button
                type="button"
                onClick={() => setSelectedActionRow(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle size={20} />
              </button>
            </div>
            <div className="space-y-3 p-5">
              <Can permission={PERMISSIONS.DEBIT_NOTE_CREATE}>
                <button
                  type="button"
                  onClick={() => {
                    navigate("/create-purchase-return", {
                      state: { purchase: selectedActionRow.raw, mode: "edit" },
                    });
                    setSelectedActionRow(null);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50"
                >
                  <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                    <Edit size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">Edit Debit Note</div>
                    <div className="text-xs text-gray-500">Update return details</div>
                  </div>
                </button>
              </Can>
              <button
                type="button"
                onClick={() => {
                  setViewData(selectedActionRow.raw);
                  setViewOpen(true);
                  setSelectedActionRow(null);
                }}
                className="flex w-full items-center gap-3 rounded-lg border border-green-100 bg-green-50 p-3 text-left transition-colors hover:bg-green-100"
              >
                <div className="rounded-full bg-green-200 p-2 text-green-700">
                  <SendHorizontal size={18} />
                </div>
                <div>
                  <div className="font-semibold text-green-800">View Debit Note</div>
                  <div className="text-xs text-green-600/80">
                    Open purchase return in read only mode
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSelectedActionRow(null)}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100"
              >
                <div className="rounded-full bg-gray-200 p-2 text-gray-700">
                  <MoreHorizontal size={18} />
                </div>
                <div>
                  <div className="font-semibold text-gray-700">Close</div>
                  <div className="text-xs text-gray-600/70">Dismiss actions</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {viewOpen && viewData && (
        <CreatePurchaseReturnScreen
          initialMode="view"
          initialData={viewData}
          onClose={() => {
            setViewOpen(false);
            setViewData(null);
          }}
        />
      )}

      <MobilePurchaseDetailsModal
        isOpen={mobileDetailsOpen}
        onClose={() => {
          setMobileDetailsOpen(false);
          setMobileDetailsDoc(null);
        }}
        document={mobileDetailsDoc}
        docType="debit_note"
        onEdit={(doc) => {
          setMobileDetailsOpen(false);
          navigate("/create-purchase-return", {
            state: { purchase: doc.raw ?? doc, mode: "edit" },
          });
        }}
        onWhatsAppShare={(doc) => onWhatsAppShare(doc)}
        onDownloadPdf={(doc) => onDownloadPdf(doc)}
      />
    </div>
  );
}

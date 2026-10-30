import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import {
  Edit,
  XCircle,
  Trash2,
  ArrowRightLeft,
  Eye,
  Download,
  FileText,
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
} from "lucide-react";
import MobilePurchaseDetailsModal from "../components/MobilePurchaseDetailsModal";
import LedgerModal from "@/features/network/components/LedgerModal";
import Swal from "sweetalert2";
import {
  handleDeletePurchaseOrder,
  handleGetPurchasesOrder,
  handleCreatePurchase,
  type PurchasePayload,
} from "@/services/apiClient";
import {
  DATE_PRESET_OPTIONS,
  getTodayYmd,
  rangeForPreset,
  type DatePreset,
} from "@/utils/datePresets";
import { useNavigate } from "react-router-dom";
import { downloadInvoicePdf, getInvoicePdfBlob } from "@/utils/pdfGenerator";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";
import {
  buildWoowooInvoiceWhatsAppMessage,
  normalizeIndianWhatsAppDigits,
  resolveHostedInvoiceLink,
} from "@/utils/whatsappInvoiceShare";
import CreatePurchaseOrderScreen from "./CreatePurchaseOrderScreen";
import {
  displayPaymentMode,
  displayPaymentStatus,
  displayPurchaseType,
  resolvePaidDueAmounts,
} from "@/features/purchase/utils/purchasePaymentDisplay";

type POTabStatus = "Paid" | "Due" | "Pending" | "Draft" | "Cancelled";

type PurchaseOrderListRow = {
  id: number;
  amount: number;
  status: POTabStatus;
  statusRaw: string;
  bill: string;
  owner: string;
  vendor: string;
  phone: string;
  mode: string;
  purchaseType: string;
  paidAmount: number;
  dueAmount: number;
  orderDate: string;
  deliveryDate: string;
  createdTime: string;
  _id: string;
  raw: Record<string, unknown>;
};

const tabs: POTabStatus[] = ["Paid", "Due", "Pending", "Draft", "Cancelled"];

function statusForTab(
  raw: unknown,
  purchaseType?: unknown,
  paymentMode?: unknown,
): POTabStatus {
  const v = String(raw ?? "").toLowerCase();
  const type = String(purchaseType ?? "").toLowerCase();
  const mode = String(paymentMode ?? "").toLowerCase();
  if (v === "due" || type === "credit" || mode === "credit") return "Due";
  if (v === "cancelled" || v === "canceled") return "Cancelled";
  if (v === "draft") return "Draft";
  if (v === "pending" || v === "partial") return "Pending";
  if (v === "paid" || v === "completed") return "Paid";
  return "Pending";
}

function axiosErrMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (
    data &&
    typeof data === "object" &&
    "message" in data &&
    typeof (data as { message: unknown }).message === "string"
  ) {
    return (data as { message: string }).message;
  }
  return fallback;
}

function coercePaymentMode(
  v: unknown,
): NonNullable<PurchasePayload["paymentMode"]> {
  const s = String(v ?? "Cash").trim();
  const allowed = ["Cash", "UPI", "Card", "Bank", "Credit", "Other"] as const;
  const hit = allowed.find((a) => a.toLowerCase() === s.toLowerCase());
  return hit ?? "Other";
}

function formatIn(value?: string | Date) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function docForPdf(raw: Record<string, unknown>): Record<string, unknown> {
  // `A4InvoiceTemplate` expects: customerPhone, invoiceDate, salesPersonName, etc.
  const createdBy = raw.createdBy as { m_staff_name?: unknown } | undefined;
  const amt = Number(raw.amount ?? raw.grandTotal ?? 0);

  return {
    ...raw,
    customerName: String(raw.supplierName ?? raw.customerName ?? "Vendor"),
    customerPhone: String(
      raw.vendorPhone ??
        raw.mobile ??
        raw.supplierContact ??
        raw.supplierPhone ??
        raw.customerPhone ??
        "",
    ),
    salesPersonName: String(
      createdBy?.m_staff_name ?? raw.purchaser ?? raw.salesPersonName ?? "",
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
}

const formatCompactCurrency = (value: number) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
  return `₹${value.toLocaleString("en-IN")}`;
};

function formatCardDateTime(raw?: any, dateStr?: string): string {
  const dVal = raw?.invoiceDate || raw?.createdAt || raw?.vendorDate || dateStr;
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

export default function PurchaseOrderScreen() {
  const [openLedgerModal, setOpenLedgerModal] = useState(false);
  const [activeTab, setActiveTab] = useState<POTabStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [fromDate, setFromDate] = useState(getTodayYmd);
  const [toDate, setToDate] = useState(getTodayYmd);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PurchaseOrderListRow[]>([]);
  const [selectedActionRow, setSelectedActionRow] =
    useState<PurchaseOrderListRow | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState<any>(null);
  const navigate = useNavigate();

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

  const fetchPurchasesOrder = useCallback(async () => {
    try {
      setLoading(true);
      const response = await handleGetPurchasesOrder(
        undefined,
        fromDate,
        toDate,
      );
      const list = Array.isArray(response?.purchaseOrders)
        ? response.purchaseOrders
        : [];
      const rows: PurchaseOrderListRow[] = (
        list as Record<string, unknown>[]
      ).map((p, index) => {
        const createdBy = p.createdBy as
          | { m_staff_name?: string | null }
          | undefined;
        const statusRaw = displayPaymentStatus({
          status: p.status,
          purchaseType: p.purchaseType,
          paymentMode: p.paymentMode,
        });
        return {
          id: index + 1,
          _id: String(p._id),
          amount: Number(p.amount ?? 0),
          status: statusForTab(p.status, p.purchaseType, p.paymentMode),
          statusRaw,
          bill: String(p.invoiceNumber ?? `PO-${index + 1}`),
          owner: String(createdBy?.m_staff_name ?? ""),
          vendor: String(p.supplierName ?? "—"),
          phone: String(
            p.vendorPhone ?? p.supplierPhone ?? p.customerPhone ?? "",
          ),
          mode: displayPaymentMode({
            status: p.status,
            purchaseType: p.purchaseType,
            paymentMode: p.paymentMode,
          }),
          purchaseType: displayPurchaseType({
            status: p.status,
            purchaseType: p.purchaseType,
            paymentMode: p.paymentMode,
          }),
          ...(() => {
            const amounts = resolvePaidDueAmounts({
              amount: p.amount,
              paidAmount: p.paidAmount,
              dueAmount: p.dueAmount,
              status: p.status,
              purchaseType: p.purchaseType,
              paymentMode: p.paymentMode,
            });
            return amounts;
          })(),
          orderDate: formatIn(p.invoiceDate as string | undefined),
          deliveryDate: formatIn(p.vendorDate as string | undefined),
          createdTime: p.createdAt
            ? new Date(String(p.createdAt)).toLocaleString()
            : "",
          raw: p,
        };
      });
      setData(rows);
    } catch (error: unknown) {
      Swal.fire(
        "Error",
        axiosErrMessage(error, "Failed to fetch purchase orders."),
        "error",
      );
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    void fetchPurchasesOrder();
  }, [fetchPurchasesOrder]);

  const handleAction = useCallback(
    async (
      row: PurchaseOrderListRow,
      action: "view" | "edit" | "delete" | "convertPurchase",
    ) => {
      const r = row.raw;
      const id = row._id;

      if (action === "view") {
        setViewData(r);
        setViewOpen(true);
        setSelectedActionRow(null);
      } else if (action === "edit") {
        navigate("/create-purchase-order", {
          state: { purchase: r, mode: "edit" },
        });
      } else if (action === "delete") {
        const result = await Swal.fire({
          title: "Delete purchase order?",
          text: "This action cannot be undone.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Delete",
        });
        if (!result.isConfirmed) return;
        try {
          await handleDeletePurchaseOrder(id);
          await fetchPurchasesOrder();
          Swal.fire("Deleted", "Purchase Order deleted successfully.", "success");
        } catch (error: unknown) {
          Swal.fire(
            "Error",
            axiosErrMessage(error, "Failed to delete purchase order."),
            "error",
          );
        }
      } else if (action === "convertPurchase") {
        const confirm = await Swal.fire({
          title: "Convert to Purchase?",
          text: "This will create a Purchase and remove this order.",
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Convert",
        });
        if (!confirm.isConfirmed) return;
        try {
          const isCredit =
            String(r.purchaseType ?? "").toLowerCase() === "credit" ||
            String(r.paymentMode ?? "").toLowerCase() === "credit" ||
            String(r.status ?? "").toLowerCase() === "due";
          const amount = Number(r.amount ?? 0);
          const payload: PurchasePayload = {
            invoiceNumber: String(r.invoiceNumber ?? ""),
            invoiceDate: String(
              r.invoiceDate ?? new Date().toISOString().split("T")[0],
            ),
            supplierName: String(r.supplierName ?? ""),
            vendorDate: String(
              r.vendorDate ?? new Date().toISOString().split("T")[0],
            ),
            amount,
            purchaseType: isCredit ? "credit" : "cash",
            paymentMode: isCredit ? "Credit" : coercePaymentMode(r.paymentMode),
            status: isCredit ? "due" : "paid",
            paidAmount: isCredit ? 0 : amount,
            dueAmount: isCredit ? amount : 0,
            items: Array.isArray(r.items) ? r.items : [],
            notes: String(r.notes || ""),
          };
          await handleCreatePurchase(payload);
          await handleDeletePurchaseOrder(id);
          await fetchPurchasesOrder();
          Swal.fire({
            title: "Success",
            text: "Purchase created. It appears in the Purchases list.",
            icon: "success",
          });
        } catch (error: unknown) {
          console.error(error);
          Swal.fire({
            title: "Error",
            text: axiosErrMessage(error, "Failed to create purchase."),
            icon: "error",
          });
        }
      }
      setSelectedActionRow(null);
    },
    [navigate, fetchPurchasesOrder],
  );

  const filteredData = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((row) => {
      const statusOk = activeTab === "All" || row.status === activeTab;
      const searchOk =
        !term ||
        row.bill.toLowerCase().includes(term) ||
        row.vendor.toLowerCase().includes(term) ||
        row.phone.toLowerCase().includes(term) ||
        row.mode.toLowerCase().includes(term) ||
        row.statusRaw.toLowerCase().includes(term);
      return statusOk && searchOk;
    });
  }, [activeTab, data, search]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "amount",
        header: "Amount",
        Cell: ({ row }: { row: { original: PurchaseOrderListRow } }) => (
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
        Cell: ({ row }: { row: { original: PurchaseOrderListRow } }) => {
          const value = row.original.statusRaw || row.original.status;
          const v = String(value).toLowerCase();
          const badgeClass =
            v === "due" || v === "credit"
              ? "bg-amber-100 text-amber-800"
              : v === "pending" || v === "partial"
              ? "bg-amber-100 text-amber-800"
              : v === "paid" || v === "completed"
                ? "bg-emerald-100 text-emerald-800"
                : v === "draft"
                  ? "bg-slate-100 text-slate-800"
                  : v === "cancelled" || v === "canceled"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-gray-100 text-gray-700";
          return (
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${badgeClass}`}
            >
              {String(value || "—")}
            </span>
          );
        },
        size: 120,
      },
      {
        accessorKey: "mode",
        header: "Payment Mode",
        Cell: ({ row }: { row: { original: PurchaseOrderListRow } }) => {
          const value = row.original.mode;
          const key = String(value ?? "").toUpperCase();
          const modeStyles: Record<string, string> = {
            UPI: "bg-indigo-100 text-indigo-700",
            CARD: "bg-sky-100 text-sky-700",
            CASH: "bg-green-100 text-green-700",
            BANK: "bg-purple-100 text-purple-700",
            PAID: "bg-green-100 text-green-700",
            DUE: "bg-amber-100 text-amber-800",
            CREDIT: "bg-amber-100 text-amber-800",
          };
          const className = modeStyles[key] || "bg-gray-100 text-gray-700";
          return (
            <span
              className={`px-2.5 py-1 text-xs font-semibold rounded-md ${className}`}
            >
              {value}
            </span>
          );
        },
        size: 110,
      },
      {
        accessorKey: "purchaseType",
        header: "Purchase Type",
        Cell: ({ row }: { row: { original: PurchaseOrderListRow } }) => {
          const value = row.original.purchaseType;
          const isCredit = String(value).toLowerCase() === "credit";
          return (
            <span
              className={`px-2.5 py-1 text-xs font-semibold rounded-md ${
                isCredit
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {value}
            </span>
          );
        },
        size: 120,
      },
      {
        accessorKey: "paidAmount",
        header: "Paid Amount",
        Cell: ({ row }: { row: { original: PurchaseOrderListRow } }) => (
          <span className="tabular-nums text-slate-700">
            ₹{" "}
            {Number(row.original.paidAmount || 0).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}
          </span>
        ),
        size: 120,
      },
      {
        accessorKey: "dueAmount",
        header: "Due Amount",
        Cell: ({ row }: { row: { original: PurchaseOrderListRow } }) => {
          const due = Number(row.original.dueAmount || 0);
          return (
            <span
              className={`tabular-nums font-medium ${
                due > 0 ? "text-amber-700" : "text-slate-700"
              }`}
            >
              ₹{" "}
              {due.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </span>
          );
        },
        size: 120,
      },
      {
        accessorKey: "bill",
        header: "Purchase Order No.",
        Cell: ({ row }: { row: { original: PurchaseOrderListRow } }) => (
          <div>
            <div className="font-medium text-gray-800">{row.original.bill}</div>
            {row.original.owner ? (
              <div className="text-xs text-gray-500">by {row.original.owner}</div>
            ) : null}
          </div>
        ),
        size: 170,
      },
      {
        accessorKey: "vendor",
        header: "Vendor",
        Cell: ({ row }: { row: { original: PurchaseOrderListRow } }) => (
          <div>
            <div className="font-medium text-gray-800">{row.original.vendor}</div>
            {row.original.phone ? (
              <div className="text-xs text-gray-500">{row.original.phone}</div>
            ) : null}
          </div>
        ),
        size: 180,
      },
      {
        accessorKey: "orderDate",
        header: "Order Date",
        Cell: ({ row }: { row: { original: PurchaseOrderListRow } }) => (
          <div>
            <div className="font-medium text-gray-800">
              {row.original.orderDate}
            </div>
            <div className="text-xs text-gray-500">
              {row.original.createdTime}
            </div>
          </div>
        ),
        size: 150,
      },
      {
        accessorKey: "deliveryDate",
        header: "Delivery Date",
        Cell: ({ row }: { row: { original: PurchaseOrderListRow } }) => (
          <span className="font-medium text-gray-800">
            {row.original.deliveryDate}
          </span>
        ),
        size: 120,
      },
      {
        header: "View Ledger",
        accessorKey: "ledger",
        size: 100,
        Cell: () => (
          <button
            type="button"
            onClick={() => setOpenLedgerModal(true)}
            title="View Purchase Order Ledger"
            className="rounded-md bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-200"
          >
            <Eye className="inline" size={16} />
          </button>
        ),
      },
      {
        accessorKey: "actions",
        header: "Actions",
        Cell: ({ row }: { row: { original: PurchaseOrderListRow } }) => (
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
        size: 120,
      },
      {
        accessorKey: "attachments",
        header: "Attachment",
        enableSorting: false,
        enableHiding: false,
        Cell: ({ row }: { row: { original: PurchaseOrderListRow } }) => {
          const attachments = (row.original.raw.attachments as string[]) || [];
          if (attachments.length === 0) return <span className="text-xs text-gray-400">No docs</span>;

          return (
            <div className="flex items-center gap-1.5">
              {attachments.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-600 shadow-sm transition-all hover:bg-blue-600 hover:text-white"
                  title={`View Document ${idx + 1}`}
                >
                  <FileText size={16} />
                </a>
              ))}
            </div>
          );
        },
        size: 120,
      },
      {
        accessorKey: "shareInvoice",
        header: "Share Invoice",
        size: 220,
        Cell: ({ row }: { row: { original: PurchaseOrderListRow } }) => {
          const pr = row.original;
          const pdfInput = docForPdf(pr.raw);

          const handleWhatsAppShare = async () => {
            const customerName =
              String(pr.vendor || pdfInput.customerName || "Vendor").trim() ||
              "Vendor";
            const docCode = String(
              pdfInput.invoiceCode ?? pr.bill ?? pr._id,
            );
            const docLabel = "Purchase Order";
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
              text: "Generating purchase order PDF for WhatsApp",
              allowOutsideClick: false,
              didOpen: () => Swal.showLoading(),
            });

            let blobPkg: { blob: Blob; filename: string } | null = null;
            try {
              blobPkg = await getInvoicePdfBlob(pdfInput, "PURCHASE ORDER");
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
                console.warn("Share sheet failed, opening WhatsApp Web:", err);
              }
            }

            const digits = normalizeIndianWhatsAppDigits(
              String(pr.phone || pdfInput.customerPhone || ""),
            );
            const waBase = digits ? `https://wa.me/${digits}` : "https://wa.me/";
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
                text: "Could not generate the PDF. Try Download or add a hosted link from your server.",
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
              await downloadInvoicePdf(pdfInput, "PURCHASE ORDER");
              Swal.close();
            } catch {
              Swal.fire("Error", "Could not generate PDF.", "error");
            }
          };

          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
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
                type="button"
                onClick={handleDownloadBill}
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
    state: { isLoading: loading },
    enableTopToolbar: true,
    enableBottomToolbar: true,
    enablePagination: true,
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
    muiTableBodyCellProps: { sx: { fontSize: "13px" } },
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

  const totalAmount = filteredData.reduce((s, r) => s + r.amount, 0);
  const paidAmount = filteredData
    .filter((r) => r.status === "Paid")
    .reduce((s, r) => s + r.amount, 0);
  const pendingAmount = filteredData
    .filter((r) => r.status === "Pending")
    .reduce((s, r) => s + r.amount, 0);

  const onWhatsAppShare = async (rawOrRow: any) => {
    const pr = rawOrRow?.raw ?? rawOrRow;
    const pdfInput = docForPdf(pr);
    const customerName =
      String(pr.vendor || pr.supplierName || pdfInput.customerName || "Vendor").trim() ||
      "Vendor";
    const docCode = String(
      pdfInput.invoiceCode ?? pr.bill ?? pr.invoiceNumber ?? pr._id,
    );
    const docLabel = "Purchase Order";
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
      text: "Generating purchase order PDF for WhatsApp",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    let blobPkg: { blob: Blob; filename: string } | null = null;
    try {
      blobPkg = await getInvoicePdfBlob(pdfInput, "PURCHASE ORDER");
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
      await downloadInvoicePdf(pdfInput, "PURCHASE ORDER");
      Swal.close();
    } catch {
      Swal.fire("Error", "Could not generate PDF.", "error");
    }
  };

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
      if (counts[r.status] !== undefined) {
        counts[r.status]++;
      }
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
              className="relative shrink-0 pb-2.5 pt-1 text-sm font-bold text-blue-600 transition"
            >
              Orders
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-blue-600" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/debit-notes")}
              className="relative shrink-0 pb-2.5 pt-1 text-sm font-medium text-slate-500 transition hover:text-slate-800"
            >
              Debit Notes
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
          {/* Row 1: Total Orders (Left, prominent) & Date Filter (Right, compact micro-pill) */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-1.5 text-left">
              <span className="text-xs font-semibold text-slate-500">Total Orders:</span>
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
                className="h-5 max-w-[95px] cursor-pointer appearance-none truncate rounded-full border border-slate-200/90 bg-slate-50 pl-2 pr-3.5 text-[9.5px] font-semibold text-slate-600 outline-none transition focus:border-blue-500 focus:bg-white"
                aria-label="Date range"
              >
                {DATE_PRESET_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={8}
                className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-slate-400"
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
              placeholder="Search purchase orders..."
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
              aria-label="Sort orders"
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
                { key: "Paid" as const, label: "Paid" },
                { key: "Due" as const, label: "Due" },
                { key: "Pending" as const, label: "Pending" },
                { key: "Draft" as const, label: "Draft" },
                { key: "Cancelled" as const, label: "Cancelled" },
              ] as { key: POTabStatus | "All"; label: string }[]
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

        {/* E. Purchase Order Cards List (One Box Per Record) */}
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
                No purchase orders found
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Try adjusting your search, filters, or date range.
              </p>
            </div>
          ) : (
            paginatedMobileData.map((row) => {
              const isPaid = row.status === "Paid";
              const isDue = row.status === "Due";
              const isDraft = row.status === "Draft";
              const isCancelled = row.status === "Cancelled";
              const vendorName = row.vendor || "Vendor";
              const shortDateTime = formatCardDateTime(row.raw, row.orderDate);

              return (
                <div
                  key={row._id}
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
                          {row.bill}
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
                        title="Purchase Order Actions"
                        aria-label="Purchase Order Actions"
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
        <Can permission={PERMISSIONS.PURCHASE_ORDER_CREATE}>
          <button
            type="button"
            onClick={() => navigate("/create-purchase-order")}
            className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/35 transition hover:bg-blue-700 active:scale-95 md:hidden"
            aria-label="Create Order"
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
                  Filter Orders
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
                    navigate("/debit-notes");
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 hover:bg-slate-100"
                >
                  <span className="text-xs font-bold text-slate-800">
                    Debit Notes
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Purchase Returns
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
          <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
            Purchase Order List
          </h1>
          <span className="rounded-full bg-pink-100 px-2 py-0.5 text-xs font-medium text-pink-700">
            {filteredData.length}
          </span>
        </div>
        <Can permission={PERMISSIONS.PURCHASE_ORDER_CREATE}>
          <button
            type="button"
            className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white sm:w-auto"
            onClick={() => navigate("/create-purchase-order")}
          >
            + Create Order
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
            Paid ₹{" "}
            {paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-700">
            Pending ₹{" "}
            {pendingAmount.toLocaleString("en-IN", {
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
                Purchase Order Actions
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
              <button
                type="button"
                onClick={() => handleAction(selectedActionRow, "view")}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50"
              >
                <div className="rounded-full bg-violet-100 p-2 text-violet-600">
                  <Eye size={18} />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">
                    View Purchase Order
                  </div>
                  <div className="text-xs text-gray-500">
                    View in read-only mode
                  </div>
                </div>
              </button>
              <Can permission={PERMISSIONS.PURCHASE_ORDER_UPDATE}>
                <button
                  type="button"
                  onClick={() => handleAction(selectedActionRow, "edit")}
                  className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50"
                >
                  <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                    <Edit size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">
                      Edit Purchase Order
                    </div>
                    <div className="text-xs text-gray-500">
                      Update order details
                    </div>
                  </div>
                </button>
              </Can>
              <Can permission={PERMISSIONS.PURCHASE_CREATE}>
                <button
                  type="button"
                  onClick={() =>
                    handleAction(selectedActionRow, "convertPurchase")
                  }
                  className="flex w-full items-center gap-3 rounded-lg border border-green-100 bg-green-50 p-3 text-left transition-colors hover:bg-green-100"
                >
                  <div className="rounded-full bg-green-200 p-2 text-green-700">
                    <ArrowRightLeft size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-green-800">
                      Convert to Purchase
                    </div>
                    <div className="text-xs text-green-600/80">
                      Creates a purchase and removes this order
                    </div>
                  </div>
                </button>
              </Can>
              <Can permission={PERMISSIONS.PURCHASE_ORDER_DELETE}>
                <button
                  type="button"
                  onClick={() => handleAction(selectedActionRow, "delete")}
                  className="flex w-full items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-3 text-left transition-colors hover:bg-red-100"
                >
                  <div className="rounded-full bg-red-200 p-2 text-red-700">
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-red-700">
                      Delete Purchase Order
                    </div>
                    <div className="text-xs text-red-600/70">Permanently remove</div>
                  </div>
                </button>
              </Can>
            </div>
          </div>
        </div>
      )}

      {openLedgerModal && (
        <LedgerModal onClose={() => setOpenLedgerModal(false)} />
      )}

      {viewOpen && viewData && (
        <CreatePurchaseOrderScreen
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
        docType="purchase_order"
        onEdit={(doc) => {
          setMobileDetailsOpen(false);
          handleAction(doc, "edit");
        }}
        onDelete={(doc) => {
          setMobileDetailsOpen(false);
          handleAction(doc, "delete");
        }}
        onConvert={(doc) => {
          setMobileDetailsOpen(false);
          handleAction(doc, "convertPurchase");
        }}
        onWhatsAppShare={(doc) => onWhatsAppShare(doc)}
        onDownloadPdf={(doc) => onDownloadPdf(doc)}
      />
    </div>
  );
}

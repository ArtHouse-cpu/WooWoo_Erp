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
  Ellipsis,
  FileText
} from "lucide-react";
import LedgerModal from "@/features/network/components/LedgerModal";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  handleGetPurchases,
  handleDeletePurchase,
  handleCreatePurchaseReturn,
  type PurchaseReturnPayload,
} from "@/services/apiClient";
import { useAppSelector } from "@/store/hooks";
import { downloadInvoicePdf, getInvoicePdfBlob } from "@/utils/pdfGenerator";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";
import {
  buildWoowooInvoiceWhatsAppMessage,
  normalizeIndianWhatsAppDigits,
  resolveHostedInvoiceLink,
} from "@/utils/whatsappInvoiceShare";
import CreatePurchaseScreen from "./CreatePurchaseScreen";
import {
  displayPaymentMode,
  displayPaymentStatus,
  displayPurchaseType,
  resolvePaidDueAmounts,
} from "@/features/purchase/utils/purchasePaymentDisplay";

type PurchaseTabStatus = "Paid" | "Due" | "Pending" | "Draft" | "Cancelled";

type PurchaseListRow = {
  id: number;
  amount: number;
  status: PurchaseTabStatus;
  statusRaw: string;
  bill: string;
  owner: string;
  vendor: string;
  phone: string;
  mode: string;
  purchaseType: string;
  paidAmount: number;
  dueAmount: number;
  date: string;
  createdTime: string;
  _id: string;
  raw: Record<string, unknown>;
};

const tabs: PurchaseTabStatus[] = [
  "Paid",
  "Due",
  "Pending",
  "Draft",
  "Cancelled",
];

function statusForTab(
  raw: unknown,
  purchaseType?: unknown,
  paymentMode?: unknown,
): PurchaseTabStatus {
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

function formatDate(value?: string | Date) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Map purchase / PO API shape so A4 PDF template gets customer + totals */
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
): NonNullable<PurchaseReturnPayload["paymentMode"]> {
  const s = String(v ?? "Cash").trim();
  const allowed = ["Cash", "UPI", "Card", "Bank", "Credit", "Other"] as const;
  const hit = allowed.find((a) => a.toLowerCase() === s.toLowerCase());
  return hit ?? "Other";
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

export default function PurchaseScreen() {
  const navigate = useNavigate();
  const [openLedgerModal, setOpenLedgerModal] = useState(false);
  const [activeTab, setActiveTab] = useState<PurchaseTabStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PurchaseListRow[]>([]);
  const [selectedActionRow, setSelectedActionRow] =
    useState<PurchaseListRow | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState<any>(null);
  const staffName = useAppSelector((state) => state.user.m_staff_name);
  const purchaser = staffName ?? "Not Assigned";

  const fetchPurchases = useCallback(async () => {
    try {
      setLoading(true);
      const { purchases = [] } = await handleGetPurchases();
      const rows: PurchaseListRow[] = (purchases as Record<string, unknown>[]).map(
        (p, i) => {
          const createdBy = p.createdBy as
            | { m_staff_name?: string | null }
            | undefined;
          const statusRaw = displayPaymentStatus({
            status: p.status,
            purchaseType: p.purchaseType,
            paymentMode: p.paymentMode,
          });
          return {
            id: i + 1,
            _id: String(p._id),
            amount: Number(p.amount ?? 0),
            status: statusForTab(p.status, p.purchaseType, p.paymentMode),
            statusRaw,
            bill: String(p.invoiceNumber ?? `PUR-${i + 1}`),
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
            ...resolvePaidDueAmounts({
              amount: p.amount,
              paidAmount: p.paidAmount,
              dueAmount: p.dueAmount,
              status: p.status,
              purchaseType: p.purchaseType,
              paymentMode: p.paymentMode,
            }),
            date: formatDate(
              (p.invoiceDate as string | undefined) ??
                (p.createdAt as string | undefined),
            ),
            createdTime: p.createdAt
              ? new Date(String(p.createdAt)).toLocaleString()
              : "",
            raw: p,
          };
        },
      );
      setData(rows);
    } catch (err: unknown) {
      Swal.fire(
        "Fetch failed",
        axiosErrMessage(err, "Failed to load purchases."),
        "error",
      );
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPurchases();
  }, [fetchPurchases]);

  const handleAction = useCallback(
    async (
      row: PurchaseListRow,
      action: "view" | "edit" | "delete" | "convertReturn",
    ) => {
      const raw = row.raw;
      const id = row._id;

      if (action === "view") {
        setViewData(raw);
        setViewOpen(true);
        setSelectedActionRow(null);
      } else if (action === "edit") {
        navigate("/create-purchase", {
          state: { purchase: raw, mode: "edit" },
        });
      } else if (action === "delete") {
        const result = await Swal.fire({
          title: "Delete purchase?",
          text: "This action cannot be undone.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Delete",
        });
        if (!result.isConfirmed) return;
        try {
          await handleDeletePurchase(id);
          await fetchPurchases();
          Swal.fire("Deleted", "Purchase deleted successfully.", "success");
        } catch (error: unknown) {
          Swal.fire(
            "Error",
            axiosErrMessage(error, "Failed to delete purchase."),
            "error",
          );
        }
      } else if (action === "convertReturn") {
        const confirm = await Swal.fire({
          title: "Convert to Purchase Return?",
          text: "This will create a Purchase Return and remove this purchase.",
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Convert",
        });
        if (!confirm.isConfirmed) return;
        try {
          const p = raw;
          const payload: PurchaseReturnPayload = {
            invoiceNumber: String(p.invoiceNumber ?? ""),
            invoiceDate: String(
              p.invoiceDate ?? new Date().toISOString().split("T")[0],
            ),
            supplierName: String(p.supplierName ?? ""),
            vendorDate: String(
              p.vendorDate ??
                p.invoiceDate ??
                new Date().toISOString().split("T")[0],
            ),
            amount: Number(p.amount ?? 0),
            paymentMode: coercePaymentMode(p.paymentMode),
            status: "pending",
            items: Array.isArray(p.items) ? p.items : [],
            notes: String(p.notes || ""),
            purchaser,
          };
          await handleCreatePurchaseReturn(payload);
          await handleDeletePurchase(id);
          await fetchPurchases();
          Swal.fire({
            title: "Success",
            text: "Purchase Return created. It appears in the Purchase Returns list.",
            icon: "success",
          });
        } catch (error: unknown) {
          console.error(error);
          Swal.fire({
            title: "Error",
            text: axiosErrMessage(
              error,
              "Failed to create purchase return.",
            ),
            icon: "error",
          });
        }
      }
      setSelectedActionRow(null);
    },
    [navigate, fetchPurchases, purchaser],
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
        Cell: ({ row }: { row: { original: PurchaseListRow } }) => (
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
        Cell: ({ row }: { row: { original: PurchaseListRow } }) => {
          const value = row.original.statusRaw || row.original.status;
          const v = String(value).toLowerCase();
          const badgeClass =
            v === "due" || v === "credit"
              ? "bg-amber-100 text-amber-800"
              : v === "pending" || v === "partial"
              ? "bg-yellow-100 text-yellow-700"
              : v === "paid" || v === "completed"
                ? "bg-green-100 text-green-700"
                : v === "draft"
                  ? "bg-slate-100 text-slate-700"
                  : v === "cancelled" || v === "canceled"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-700";
          return (
            <span
              className={`px-2.5 py-1 text-xs font-semibold rounded-md ${badgeClass}`}
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
        Cell: ({ row }: { row: { original: PurchaseListRow } }) => {
          const value = row.original.mode;
          const modeStyles: Record<string, string> = {
            UPI: "bg-indigo-100 text-indigo-700",
            CARD: "bg-sky-100 text-sky-700",
            CASH: "bg-green-100 text-green-700",
            BANK: "bg-purple-100 text-purple-700",
            PAID: "bg-green-100 text-green-700",
            DUE: "bg-amber-100 text-amber-800",
            CREDIT: "bg-amber-100 text-amber-800",
          };
          const key = String(value ?? "").toUpperCase();
          const className =
            modeStyles[key] || "bg-gray-100 text-gray-700";
          return (
            <span
              className={`px-2.5 py-1 text-xs font-semibold rounded-md ${className}`}
            >
              {value}
            </span>
          );
        },
        size: 120,
      },
      {
        accessorKey: "purchaseType",
        header: "Purchase Type",
        Cell: ({ row }: { row: { original: PurchaseListRow } }) => {
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
        Cell: ({ row }: { row: { original: PurchaseListRow } }) => (
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
        Cell: ({ row }: { row: { original: PurchaseListRow } }) => {
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
        header: "Purchase No",
        Cell: ({ row }: { row: { original: PurchaseListRow } }) => (
          <div>
            <div className="font-medium text-gray-800">{row.original.bill}</div>
            {row.original.owner ? (
              <div className="text-xs text-gray-500">by {row.original.owner}</div>
            ) : null}
          </div>
        ),
        size: 160,
      },
      {
        accessorKey: "vendor",
        header: "Vendor",
        Cell: ({ row }: { row: { original: PurchaseListRow } }) => (
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
        accessorKey: "date",
        header: "Date",
        Cell: ({ row }: { row: { original: PurchaseListRow } }) => (
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
        header: "View Ledger",
        accessorKey: "ledger",
        size: 100,
        Cell: () => (
          <button
            type="button"
            onClick={() => setOpenLedgerModal(true)}
            title="View Ledger"
            className="rounded-md bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-200"
          >
            <Eye className="inline" size={16} />
          </button>
        ),
      },
      {
        accessorKey: "actions",
        header: "Actions",
        Cell: ({ row }: { row: { original: PurchaseListRow } }) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedActionRow(row.original)}
              className="flex items-center gap-1 rounded-md bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-200"
            >
               <Ellipsis size={18} />
            </button>
          </div>
        ),
        size: 120,
      },
      {
        accessorKey: "shareInvoice",
        header: "Share Invoice",
        size: 220,
        Cell: ({ row }: { row: { original: PurchaseListRow } }) => {
          const pr = row.original;
          const pdfInput = docForPdf(pr.raw);

          const handleWhatsAppShare = async () => {
            const customerName =
              String(pr.vendor || pdfInput.customerName || "Vendor").trim() ||
              "Vendor";
            const docCode = String(
              pdfInput.invoiceCode ?? pr.bill ?? pr._id,
            );
            const docLabel = "Purchase";
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
              text: "Generating purchase PDF for WhatsApp",
              allowOutsideClick: false,
              didOpen: () => Swal.showLoading(),
            });

            let blobPkg: { blob: Blob; filename: string } | null = null;
            try {
              blobPkg = await getInvoicePdfBlob(pdfInput, "PURCHASE");
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
              await downloadInvoicePdf(pdfInput, "PURCHASE");
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
      {
        accessorKey: "attachments",
        header: "Attachment",
        enableSorting: false,
        enableHiding: false,
        Cell: ({ row }: { row: { original: PurchaseListRow } }) => {
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
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: filteredData,
    state: { isLoading: loading },
    enableTopToolbar: true,
    enablePagination: true,
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

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-gray-900">Purchases</h1>
          <span className="rounded-full bg-pink-100 px-2 py-0.5 text-xs font-medium text-pink-700">
            {filteredData.length}
          </span>
        </div>
        <Can permission={PERMISSIONS.PURCHASE_CREATE}>
          <button
            type="button"
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
            onClick={() => navigate("/create-purchase")}
          >
            + Create Purchase
          </button>
        </Can>
      </div>

      <div className="flex items-center gap-6 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("All")}
          className={`text-sm font-medium ${activeTab === "All" ? "border-b-2 border-blue-600 pb-1 text-blue-700" : "text-gray-500"}`}
        >
          All{" "}
          <span className="text-xs text-gray-400">{filteredData.length}</span>
        </button>
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-sm font-medium ${activeTab === tab ? "border-b-2 border-blue-600 pb-1 text-blue-700" : "text-gray-500"}`}
          >
            {tab}
          </button>
        ))}
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

      {selectedActionRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Purchase Actions
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
                  <div className="font-semibold text-gray-800">View Purchase</div>
                  <div className="text-xs text-gray-500">
                    View in read-only mode
                  </div>
                </div>
              </button>
              <Can permission={PERMISSIONS.PURCHASE_UPDATE}>
                <button
                  type="button"
                  onClick={() => handleAction(selectedActionRow, "edit")}
                  className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50"
                >
                  <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                    <Edit size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">Edit Purchase</div>
                    <div className="text-xs text-gray-500">
                      Update purchase details
                    </div>
                  </div>
                </button>
              </Can>
              <Can permission={PERMISSIONS.DEBIT_NOTE_CREATE}>
                <button
                  type="button"
                  onClick={() => handleAction(selectedActionRow, "convertReturn")}
                  className="flex w-full items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-left transition-colors hover:bg-blue-100"
                >
                  <div className="rounded-full bg-blue-200 p-2 text-blue-700">
                    <ArrowRightLeft size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-blue-800">
                      Convert to Purchase Return
                    </div>
                    <div className="text-xs text-blue-600/80">
                      Creates a return and removes this purchase
                    </div>
                  </div>
                </button>
              </Can>
              <Can permission={PERMISSIONS.PURCHASE_DELETE}>
                <button
                  type="button"
                  onClick={() => handleAction(selectedActionRow, "delete")}
                  className="flex w-full items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-3 text-left transition-colors hover:bg-red-100"
                >
                  <div className="rounded-full bg-red-200 p-2 text-red-700">
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-red-700">Delete Purchase</div>
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
        <CreatePurchaseScreen
          initialMode="view"
          initialData={viewData}
          onClose={() => {
            setViewOpen(false);
            setViewData(null);
          }}
        />
      )}
    </div>
  );
}

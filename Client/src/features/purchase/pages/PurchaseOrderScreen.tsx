import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Edit,
  XCircle,
  Trash2,
  ArrowRightLeft,
  Eye,
} from "lucide-react";
import LedgerModal from "@/features/network/components/LedgerModal";
import Swal from "sweetalert2";
import {
  handleDeletePurchaseOrder,
  handleGetPurchasesOrder,
  handleCreatePurchase,
  type PurchasePayload,
} from "@/services/apiClient";
import { useNavigate } from "react-router-dom";
import { downloadInvoicePdf, getInvoicePdfBlob } from "@/utils/pdfGenerator";
import {
  buildWoowooInvoiceWhatsAppMessage,
  normalizeIndianWhatsAppDigits,
  resolveHostedInvoiceLink,
} from "@/utils/whatsappInvoiceShare";

type POTabStatus = "Paid" | "Pending" | "Draft" | "Cancelled";

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
  orderDate: string;
  deliveryDate: string;
  createdTime: string;
  _id: string;
  raw: Record<string, unknown>;
};

const tabs: POTabStatus[] = ["Paid", "Pending", "Draft", "Cancelled"];

function statusForTab(raw: unknown): POTabStatus {
  const v = String(raw ?? "").toLowerCase();
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

export default function PurchaseOrderScreen() {
  const [openLedgerModal, setOpenLedgerModal] = useState(false);
  const [activeTab, setActiveTab] = useState<POTabStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PurchaseOrderListRow[]>([]);
  const [selectedActionRow, setSelectedActionRow] =
    useState<PurchaseOrderListRow | null>(null);
  const navigate = useNavigate();

  const fetchPurchasesOrder = useCallback(async () => {
    try {
      setLoading(true);
      const response = await handleGetPurchasesOrder();
      const list = Array.isArray(response?.purchaseOrders)
        ? response.purchaseOrders
        : [];
      const rows: PurchaseOrderListRow[] = (
        list as Record<string, unknown>[]
      ).map((p, index) => {
        const createdBy = p.createdBy as
          | { m_staff_name?: string | null }
          | undefined;
        const statusRaw = String(p.status ?? "");
        return {
          id: index + 1,
          _id: String(p._id),
          amount: Number(p.amount ?? 0),
          status: statusForTab(p.status),
          statusRaw,
          bill: String(p.invoiceNumber ?? `PO-${index + 1}`),
          owner: String(createdBy?.m_staff_name ?? ""),
          vendor: String(p.supplierName ?? "—"),
          phone: String(
            p.vendorPhone ?? p.supplierPhone ?? p.customerPhone ?? "",
          ),
          mode: String(p.paymentMode ?? "—"),
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
  }, []);

  useEffect(() => {
    void fetchPurchasesOrder();
  }, [fetchPurchasesOrder]);

  const handleAction = useCallback(
    async (
      row: PurchaseOrderListRow,
      action: "edit" | "delete" | "convertPurchase",
    ) => {
      const r = row.raw;
      const id = row._id;

      if (action === "edit") {
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
          const payload: PurchasePayload = {
            invoiceNumber: String(r.invoiceNumber ?? ""),
            invoiceDate: String(
              r.invoiceDate ?? new Date().toISOString().split("T")[0],
            ),
            supplierName: String(r.supplierName ?? ""),
            vendorDate: String(
              r.vendorDate ?? new Date().toISOString().split("T")[0],
            ),
            amount: Number(r.amount ?? 0),
            paymentMode: coercePaymentMode(r.paymentMode),
            status: "paid",
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
            v === "pending" || v === "partial"
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
              {String(value || "—").toLowerCase()}
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
              blobPkg = await getInvoicePdfBlob(pdfInput);
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
              await downloadInvoicePdf(pdfInput);
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
                WhatsApp
              </button>
              <button
                type="button"
                onClick={handleDownloadBill}
                className="flex items-center gap-1 rounded-md bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-200"
              >
                Download
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
    enableTopToolbar: false,
    enableBottomToolbar: false,
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
          <h1 className="text-2xl font-semibold text-gray-900">
            Purchase Order List
          </h1>
          <span className="rounded-full bg-pink-100 px-2 py-0.5 text-xs font-medium text-pink-700">
            {filteredData.length}
          </span>
        </div>
        <button
          type="button"
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
          onClick={() => navigate("/create-purchase-order")}
        >
          + Create Order
        </button>
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

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
        <div className="relative min-w-[280px] flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order no., vendor, phone…"
            className="h-10 w-full rounded-md border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-blue-400"
          />
        </div>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-200 px-3 text-sm text-gray-700"
        >
          This Year <ChevronDown size={14} />
        </button>
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
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>1 / 1</span>
          <button
            type="button"
            className="rounded border border-gray-200 p-1.5"
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            className="rounded border border-gray-200 p-1.5"
            aria-label="Next page"
          >
            <ChevronRight size={14} />
          </button>
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
            </div>
          </div>
        </div>
      )}

      {openLedgerModal && (
        <LedgerModal onClose={() => setOpenLedgerModal(false)} />
      )}
    </div>
  );
}

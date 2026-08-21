import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import CreatePosScreen from "./CreatePosScreen";
import CreateInvoiceScreen from "./CreateInvoiceScreen";
import DuePaymentModal from "../components/invoice/Modal/DuePaymentModal";
import SalesReturnFlowModal from "../components/invoice/Modal/SalesReturnFlowModal";
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

const tabs: PosRow["status"][] = ["Paid", "Pending", "Cancelled", "Draft"];

export default function PosScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<PosRow["status"] | "All">("All");
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

  const handleAction = async (
    action: "view" | "edit" | "cancel" | "delete" | "Credit Note",
  ) => {
    if (!selectedActionRow) return;
    const { _id, raw, status } = selectedActionRow;

    if (action === "view") {
      try {
        const res = await handleGetInvoice(_id);
        setViewInvoiceData(res?.invoice ?? raw);
      } catch {
        setViewInvoiceData(raw);
      }
      setViewInvoiceOpen(true);
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

  // Server already filters by fromDate/toDate — only filter status client-side.
  // Search is also sent to the API; keep a light client filter for status tabs.
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const statusOk = activeTab === "All" || row.status === activeTab;
      return statusOk;
    });
  }, [activeTab, data]);

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
          const invoice = row.original;

          const handleWhatsAppShare = async () => {
            const raw = (invoice.raw ?? {}) as Record<string, unknown>;

            const customerName =
              String(
                invoice.customer || raw.customerName || "Customer",
              ).trim() || "Customer";

            const docCode = String(
              raw.returnCode ?? raw.invoiceCode ?? invoice.bill ?? invoice.id,
            );

            const isCreditNote = Boolean(raw.returnCode);
            const docLabel = isCreditNote
              ? "Sales Return / Credit Note"
              : "Invoice";

            const totalVal = Number(
              currentInvoiceTotal(raw) || invoice.amount || 0,
            );
            const totalFormatted = `₹ ${totalVal.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`;

            const paymentStatus = paymentStatusForWhatsApp(raw, invoice.status);

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
              String(invoice.phone || raw.customerPhone || ""),
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

          const handleDownloadBill = async () => {
            try {
              Swal.fire({
                title: "Generating PDF...",
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
              });
              await downloadInvoicePdf(invoice.raw);
              Swal.close();
            } catch {
              Swal.fire("Error", "Could not generate PDF.", "error");
            }
          };

          return (
            <div className="flex items-center gap-2">
              {/* WhatsApp Share */}
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  void handleWhatsAppShare();
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
                  void handleDownloadBill();
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
  const pendingAmount = filteredData
    .filter((row) => row.status === "Pending")
    .reduce((sum, row) => sum + row.amount, 0);
  const returnedAmount = filteredData.reduce(
    (sum, row) => sum + Number(row.returnedAmount || 0),
    0,
  );

  const controlClass =
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="min-w-0 space-y-3 p-1 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Sales
          </h1>
          <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
            {statusCounts.All}
          </span>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-[22rem]">
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

      {/* Status tabs */}
      <div className="hide-scrollbar -mx-1 overflow-x-auto px-1">
        <div className="flex min-w-max items-stretch gap-1 border-b border-slate-200">
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
                className={`relative shrink-0 px-3.5 pb-2.5 pt-1 text-sm font-medium transition ${
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

      {/* Compact filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice no., customer or mobile"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <select
            value={activeTab}
            onChange={(e) =>
              setActiveTab(e.target.value as PosRow["status"] | "All")
            }
            className="h-11 w-[7.5rem] shrink-0 rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-40 sm:px-3"
            aria-label="Payment status"
          >
            <option value="All">All statuses</option>
            {tabs.map((tab) => (
              <option key={tab} value={tab}>
                {tab}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
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
            className={`${controlClass} min-w-0 flex-1 sm:max-w-[11rem] sm:flex-none`}
          >
            {SALES_DATE_PRESET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setActiveTab("All");
              setDatePreset("today");
              const range = rangeForPreset("today");
              setFromDate(range.from);
              setToDate(range.to);
            }}
            className="h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Clear
          </button>

          {datePreset === "custom" ? (
            <>
              <div className="flex w-full items-center gap-2 sm:w-auto">
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
              <div className="flex w-full items-center gap-2 sm:w-auto">
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
            </>
          ) : null}
        </div>
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
            {pendingAmount.toLocaleString("en-IN", {
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

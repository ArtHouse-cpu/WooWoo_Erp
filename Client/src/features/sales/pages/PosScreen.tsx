import { useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import {
  ChevronDown,
  Eye,
  Search,
  Edit,
  XCircle,
  Trash2,
  Download,
  Ellipsis,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "@/services/axiosInstance";
import Swal from "sweetalert2";
import { handleCancelInvoice, handleDeleteInvoice } from "@/services/apiClient";
import CreatePosScreen from "./CreatePosScreen";
import CreateInvoiceScreen from "./CreateInvoiceScreen";
import DuePaymentModal from "../components/invoice/Modal/DuePaymentModal";
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

type DateFilter = "today" | "yesterday" | "week" | "month" | "year";

const dateFilterOptions: { value: DateFilter; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
];

function getFilterDateRange(filter: DateFilter): { from: string; to: string } {
  const toYmd = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const now = startOfDay(new Date());

  if (filter === "today") {
    return { from: toYmd(now), to: toYmd(now) };
  }

  if (filter === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { from: toYmd(y), to: toYmd(y) };
  }

  if (filter === "week") {
    // Calendar week Monday → today
    const day = now.getDay(); // 0 Sun .. 6 Sat
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const from = new Date(now);
    from.setDate(now.getDate() + mondayOffset);
    return { from: toYmd(from), to: toYmd(now) };
  }

  if (filter === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toYmd(from), to: toYmd(now) };
  }

  // this year
  const from = new Date(now.getFullYear(), 0, 1);
  return { from: toYmd(from), to: toYmd(now) };
}

function toLocalYmd(value: unknown): string {
  const d = new Date(String(value ?? ""));
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
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
  const [data, setData] = useState<PosRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedActionRow, setSelectedActionRow] = useState<PosRow | null>(
    null,
  );
  const [posModalOpen, setPosModalOpen] = useState(false);
  const [dueModalOpen, setDueModalOpen] = useState(false);
  const [selectedDueRow, setSelectedDueRow] = useState<PosRow | null>(null);
  const [viewInvoiceOpen, setViewInvoiceOpen] = useState(false);
  const [viewInvoiceData, setViewInvoiceData] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>("year");
  const [dateMenuOpen, setDateMenuOpen] = useState(false);

  const selectedLabel =
    dateFilterOptions.find((o) => o.value === dateFilter)?.label ?? "This Year";
  const { from, to } = getFilterDateRange(dateFilter);

  const handleAction = async (
    action: "view" | "edit" | "cancel" | "delete" | "Credit Note",
  ) => {
    if (!selectedActionRow) return;
    const { _id, raw, status } = selectedActionRow;

    if (action === "view") {
      setViewInvoiceData(raw);
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
      const confirm = await Swal.fire({
        title: "Cancel Invoice?",
        text: "Are you sure you want to cancel this invoice?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, Cancel",
      });
      if (confirm.isConfirmed) {
        try {
          await handleCancelInvoice(_id);
          Swal.fire("Cancelled", "Invoice cancelled successfully.", "success");
          fetchInvoices();
        } catch {
          Swal.fire("Error", "Could not cancel invoice.", "error");
        }
      }
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
      navigate("/create-sales-return", {
        state: {
          invoice: {
            ...raw,
            notes: raw?.notes
              ? `${raw.notes}\nReturn against invoice ${raw?.invoiceCode ?? ""}`.trim()
              : `Return against invoice ${raw?.invoiceCode ?? ""}`.trim(),
          },
          mode: "create",
        },
      });
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

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/invoice");
      const invoices = Array.isArray(response.data?.invoices)
        ? response.data.invoices
        : [];

            const rows: PosRow[] = invoices.map((invoice: any, index: number) => {
              const dueAmount = Number(
                invoice?.pendingAmount ?? invoice?.paymentBreakdown?.dueAmount ?? 0,
              );
              return {
              id: index + 1,
            amount: Math.round(Number(invoice?.grandTotal ?? 0)),
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
    fetchInvoices();
  }, []);

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

      const ymd = toLocalYmd(row.raw?.invoiceDate ?? row.raw?.createdAt);
      const dateOk = !!ymd && ymd >= from && ymd <= to;

      return statusOk && searchOk && dateOk;
    });
  }, [activeTab, data, search, from, to]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "amount",
        header: "Amount",
        Cell: ({ row }: { row: { original: PosRow } }) => (
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
        Cell: ({ cell }: { cell: { getValue: () => PosRow["status"] } }) => {
          const value = cell.getValue();
          const badgeClass =
            value === "Pending"
              ? "bg-yellow-100 text-yellow-700"
              : value === "Paid"
                ? "bg-green-100 text-green-700"
                : value === "Draft"
                  ? "bg-slate-100 text-slate-700"
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
                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
              >
                {`Due ₹ ${dueAmount.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}
              </button>
            );
          }

          const modeStyles: Record<string, string> = {
            WALLET: "bg-gray-100 text-gray-700",
            UPI: "bg-indigo-100 text-indigo-700",
            CARD: "bg-sky-100 text-sky-700",
            MULTI: "bg-purple-100 text-purple-700",
            CASH: "bg-green-100 text-green-700",
            DRAFT: "bg-slate-100 text-slate-700",
          };

          const className =
            modeStyles[String(value ?? "").toUpperCase()] ||
            "bg-gray-100 text-gray-700";
          return (
            <span
              className={`px-2.5 py-1 text-xs font-semibold rounded-md ${className}`}
            >
              {value}
            </span>
          );
        },
        size: 100,
      },
      {
        accessorKey: "bill",
        header: "Bill #",
        Cell: ({ row }: { row: { original: PosRow } }) => (
          <div>
            <div className="font-medium text-gray-800">{row.original.bill}</div>
            <div className="text-xs text-gray-500">by {row.original.owner}</div>
          </div>
        ),
        size: 180,
      },
      {
        accessorKey: "customer",
        header: "Customer",
        Cell: ({ row }: { row: { original: PosRow } }) => (
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
        Cell: ({ row }: { row: { original: PosRow } }) => (
          <div>
            <div className="font-medium text-gray-800">{row.original.date}</div>
            <div className="text-xs text-gray-500">
              {row.original.createdTime}
            </div>
          </div>
        ),
        size: 170,
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

            const totalVal = Number(raw.grandTotal ?? invoice.amount ?? 0);
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

  const table = useMaterialReactTable({
    columns,
    data: filteredData,
    state: {
      isLoading: loading,
    },
    enableTopToolbar: false,
    enablePagination:true,
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
    muiTableBodyRowProps: ({ row }) => ({
      onClick: () => {
        const rowData = row.original as PosRow;
        if (rowData.status !== "Draft") return;
        navigate("/create-invoice", {
          state: { invoice: rowData.raw, mode: "edit" },
        });
      },
      sx: {
        cursor:
          (row.original as PosRow).status === "Draft" ? "pointer" : "default",
      },
    }),
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
  const paidAmount = filteredData
    .filter((row) => row.status === "Paid")
    .reduce((sum, row) => sum + row.amount, 0);
  const pendingAmount = filteredData
    .filter((row) => row.status === "Pending")
    .reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="min-w-0 space-y-4 p-1">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
            Sales
          </h1>
          <span className="rounded-full bg-pink-100 px-2 py-0.5 text-xs font-medium text-pink-700">
            {filteredData.length}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Can permission={PERMISSIONS.INVOICE_CREATE}>
            <button
              className="rounded-md bg-violet-100 px-3 py-2 text-sm font-semibold text-violet-700"
              onClick={() => setPosModalOpen(true)}
            >
              POS Billing
            </button>
          </Can>
          <Can permission={PERMISSIONS.INVOICE_CREATE}>
            <button
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
              onClick={() => navigate("/create-invoice")}
            >
              + Create Invoice
            </button>
          </Can>
        </div>
      </div>

      <div className="hide-scrollbar flex items-center gap-4 overflow-x-auto border-b border-gray-200 pb-2 sm:gap-6">
        <button
          onClick={() => setActiveTab("All")}
          className={`shrink-0 text-sm font-medium ${activeTab === "All" ? "border-b-2 border-blue-600 pb-1 text-blue-700" : "text-gray-500"}`}
        >
          All{" "}
          <span className="text-xs text-gray-400">{filteredData.length}</span>
        </button>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 text-sm font-medium ${activeTab === tab ? "border-b-2 border-blue-600 pb-1 text-blue-700" : "text-gray-500"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 w-full flex-1 sm:min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoices..."
            className="h-10 w-full rounded-md border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-blue-400"
          />
        </div>

        {/* Date range filter */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setDateMenuOpen((v) => !v)}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-200 px-3 text-sm text-gray-700"
          >
            {selectedLabel} <ChevronDown size={14} />
          </button>

          {dateMenuOpen && (
            <>
              {/* click-outside overlay */}
              <button
                type="button"
                className="fixed inset-0 z-10 cursor-default"
                aria-label="Close date filter"
                onClick={() => setDateMenuOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                {dateFilterOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setDateFilter(opt.value);
                      setDateMenuOpen(false);
                    }}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                      dateFilter === opt.value
                        ? "bg-blue-50 font-semibold text-blue-700"
                        : "text-gray-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="table-scroll min-w-0">
        <MaterialReactTable table={table} />
      </div>

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
                      Mark status as cancelled
                    </div>
                  </div>
                </button>
              </Can>
              <Can permission={PERMISSIONS.CREDIT_NOTE_CREATE}>
                <button
                  onClick={() => handleAction("Credit Note")}
                  className="flex w-full items-center gap-3 rounded-lg border border-green-100 bg-green-50 p-3 text-left transition-colors hover:bg-green-100"
                >
                  <div className="rounded-full bg-green-200 p-2 text-green-700">
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-green-700">
                      Sales return
                    </div>
                    <div className="text-xs text-green-600/70">
                      Convert to Sale return
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
    </div>
  );
}

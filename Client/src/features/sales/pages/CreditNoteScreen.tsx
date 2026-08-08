import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
  Edit,
  XCircle,
  Trash2,
  Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  handleGetReturnSales,
  handleDeleteReturnSale,
  handleUpdateReturnSale,
} from "@/services/apiClient";
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

export default function CreditNoteScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<CreditNoteStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<CreditNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedActionRow, setSelectedActionRow] = useState<CreditNoteRow | null>(
    null,
  );
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await handleGetReturnSales("", 100);
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
  }, []);

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

          const handleWhatsAppShare = async () => {
            const raw = cn.raw;

            const customerName =
              String(cn.customer || raw.customerName || "Customer").trim() ||
              "Customer";

            const docCode = String(
              raw.returnCode ?? cn.bill ?? cn._id,
            );

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
              String(cn.phone || raw.customerPhone || ""),
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
              await downloadInvoicePdf(cn.raw);
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
    state: {
      isLoading: loading,
    },
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

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-gray-900">
            Sales Returns / Credit Notes
          </h1>
          <span className="rounded-full bg-pink-100 px-2 py-0.5 text-xs font-medium text-pink-700">
            {filteredData.length}
          </span>
        </div>
        <Can permission={PERMISSIONS.CREDIT_NOTE_CREATE}>
          <button
            type="button"
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
            onClick={() => navigate("/create-sales-return")}
          >
            + Create Sales Return / Credit Note
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
            placeholder="Search by return #, customer, phone…"
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

      {fetchError && (
        <p className="text-sm text-red-600">{fetchError}</p>
      )}

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
                  className={`flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors ${selectedActionRow.status === "Cancelled" ? "cursor-not-allowed opacity-50" : "hover:bg-gray-50"}`}
                >
                  <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                    <Edit size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">
                      Edit Credit Note
                    </div>
                    <div className="text-xs text-gray-500">
                      Modify return details
                    </div>
                  </div>
                </button>
              </Can>
              <Can permission={PERMISSIONS.CREDIT_NOTE_CREATE}>
                <button
                  type="button"
                  onClick={() => handleAction(selectedActionRow, "cancel")}
                  disabled={selectedActionRow.status === "Cancelled"}
                  className={`flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors ${selectedActionRow.status === "Cancelled" ? "cursor-not-allowed opacity-50" : "hover:bg-gray-50"}`}
                >
                  <div className="rounded-full bg-yellow-100 p-2 text-yellow-600">
                    <XCircle size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">
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
                  className="flex w-full items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-3 text-left transition-colors hover:bg-red-100"
                >
                  <div className="rounded-full bg-red-200 p-2 text-red-700">
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-red-700">
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
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_Cell,
} from "material-react-table";
import { Download, Edit, MoreHorizontal, SendHorizontal, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { handleGetPurchaseReturns } from "@/services/apiClient";
import Swal from "sweetalert2";
import { downloadInvoicePdf, getInvoicePdfBlob } from "@/utils/pdfGenerator";
import {
  buildWoowooInvoiceWhatsAppMessage,
  normalizeIndianWhatsAppDigits,
  resolveHostedInvoiceLink,
} from "@/utils/whatsappInvoiceShare";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";

type DebitNoteRow = {
  id: string;
  purchaser: string;
  account: string;
  status: string;
  mode: string;
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
  amount?: number;
  invoiceDate?: string;
};

export default function DebitNoteScreen() {
  const navigate = useNavigate();
  const [data, setData] = useState<DebitNoteRow[]>([]);
  const [selectedActionRow, setSelectedActionRow] = useState<DebitNoteRow | null>(
    null,
  );

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

          const badgeClass =
            value === "pending"
              ? "bg-yellow-100 text-yellow-700"
              : value === "paid"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700";

          return (
            <span
              className={`px-3 py-1 text-xs font-medium rounded-full ${badgeClass}`}
            >
              {value ? value.charAt(0).toUpperCase() + value.slice(1) : "N/A"}
            </span>
          );
        },
      },
      { accessorKey: "mode", header: "Mode" },
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
        const response = await handleGetPurchaseReturns(controller.signal);
        const purchaseReturns = Array.isArray(response?.purchaseReturns)
          ? response.purchaseReturns
          : [];

        const mappedRows = purchaseReturns.map(
          (item: PurchaseReturnApiItem, index: number) => ({
            id: item.invoiceNumber || item._id || String(index + 1),
            purchaser: item.purchaser || "-",
            account: item.supplierName || "-",
            status: String(item.status || "pending"),
            mode: item.paymentMode || "-",
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
        console.log("Error fetching purchase returns:", error);
        setData([]);
      }
    };

    fetchPurchaseReturns();

    return () => {
      controller.abort();
    };
  }, []);

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
  });
  return (
    <div className="p-1">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold ">
          Purchase Returns / Debit Notes
        </h1>
        <div className="flex gap-3">
          <Can permission={PERMISSIONS.DEBIT_NOTE_CREATE}>
            <button
              type="button"
              onClick={() => navigate("/create-purchase-return")}
              className="w-[260px] bg-black text-white py-2 px-1 rounded text-[14px] font-semibold transition text-center cursor-pointer"
            >
              Create Purchase Return/Debit Note
            </button>
          </Can>
        </div>
      </div>

      <MaterialReactTable table={table} />

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
                  navigate("/create-purchase-return", {
                    state: { purchase: selectedActionRow.raw, mode: "view" },
                  });
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
    </div>
  );
}

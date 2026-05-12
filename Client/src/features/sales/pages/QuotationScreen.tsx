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
  Search,
  XCircle,
  Ellipsis,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { handleGetQuotations, handleDeleteQuotation, handleUpdateQuotationStatus } from "@/services/apiClient";
import { downloadInvoicePdf, getInvoicePdfBlob } from "@/utils/pdfGenerator";
import {
  buildWoowooInvoiceWhatsAppMessage,
  normalizeIndianWhatsAppDigits,
  resolveHostedInvoiceLink,
} from "@/utils/whatsappInvoiceShare";

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

export default function QuotationScreen() {
  const navigate = useNavigate();
  const [data, setData] = useState<QuotationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedActionRow, setSelectedActionRow] = useState<QuotationRow | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await handleGetQuotations();
     const formatted = res.quotations.map((q: any, i: number) => ({
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (action: "view" | "edit" | "delete" | "reject" | "accept" | "convert") => {
    if (!selectedActionRow) return;
    const { _id, raw, status } = selectedActionRow;

    if (action === "view") {
      navigate("/create-quotation", { state: { quotation: raw, mode: "view" } });
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
    downloadInvoicePdf({
      invoiceNo: row.quotationCode,
      customerName: row.customer,
      customerPhone: row.phone,
      items: row.raw.items.map((it: any) => ({
        name: it.productName,
        qty: it.qty,
        price: it.unitPrice,
        discount: it.discount,
      })),
      totalMRP: row.raw.subTotal,
      discountTotal: row.raw.discountTotal,
      finalAmount: row.amount,
      totalDue: row.amount,
      totalQty: row.raw.items.reduce((s: number, i: any) => s + i.qty, 0),
    }, "QUOTATION");
  };

  const shareOnWhatsApp = async (row: QuotationRow) => {
    try {
      const number = normalizeIndianWhatsAppDigits(row.phone);
      if (!number) {
        Swal.fire("Invalid Phone", "Customer phone number is invalid.", "error");
        return;
      }
      const pdfBlob = await getInvoicePdfBlob({
        invoiceNo: row.quotationCode,
        customerName: row.customer,
        customerPhone: row.phone,
        items: row.raw.items.map((it: any) => ({
          name: it.productName,
          qty: it.qty,
          price: it.unitPrice,
          discount: it.discount,
        })),
        totalMRP: row.raw.subTotal,
        discountTotal: row.raw.discountTotal,
        finalAmount: row.amount,
        totalDue: row.amount,
        totalQty: row.raw.items.reduce((s: number, i: any) => s + i.qty, 0),
      }, "QUOTATION");

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
  });

  return (
    <div className="p-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quotations</h1>
        <div className="flex gap-3 mt-4 sm:mt-0">
          <button
            onClick={() => navigate("/create-quotation")}
            className="bg-black text-white py-2 px-4 rounded-full text-sm font-semibold hover:bg-gray-800 transition"
          >
            Create Quotation
          </button>
        </div>
      </div>
      <MaterialReactTable table={table} />

      {selectedActionRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Quotation Actions
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
                    View Quotation
                  </div>
                  <div className="text-xs text-gray-500">
                    View in read-only mode
                  </div>
                </div>
              </button>
              <button
                onClick={() => handleAction("edit")}
                disabled={selectedActionRow.status === "rejected"}
                className={`flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors ${selectedActionRow.status === "rejected" ? "cursor-not-allowed opacity-50" : "hover:bg-gray-50"}`}
              >
                <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                  <Edit size={18} />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">
                    Edit Quotation
                  </div>
                  <div className="text-xs text-gray-500">
                    Modify quotation details
                  </div>
                </div>
              </button>
              <button
                onClick={() => handleAction("convert")}
                className="flex w-full items-center gap-3 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-left transition-colors hover:bg-indigo-100"
              >
                <div className="rounded-full bg-indigo-200 p-2 text-indigo-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>
                </div>
                <div>
                  <div className="font-semibold text-indigo-700">
                    Convert to Invoice
                  </div>
                  <div className="text-xs text-indigo-600/70">
                    Create a sales invoice
                  </div>
                </div>
              </button>
              <button
                onClick={() => handleAction("accept")}
                disabled={selectedActionRow.status === "accepted"}
                className={`flex w-full items-center gap-3 rounded-lg border border-green-100 bg-green-50 p-3 text-left transition-colors ${selectedActionRow.status === "accepted" ? "cursor-not-allowed opacity-50" : "hover:bg-green-100"}`}
              >
                <div className="rounded-full bg-green-200 p-2 text-green-700">
                  <Eye size={18} />
                </div>
                <div>
                  <div className="font-semibold text-green-700">
                    Accept
                  </div>
                  <div className="text-xs text-green-600/70">
                    Mark as accepted
                  </div>
                </div>
              </button>
              <button
                onClick={() => handleAction("reject")}
                disabled={selectedActionRow.status === "rejected"}
                className={`flex w-full items-center gap-3 rounded-lg border border-orange-100 bg-orange-50 p-3 text-left transition-colors ${selectedActionRow.status === "rejected" ? "cursor-not-allowed opacity-50" : "hover:bg-orange-100"}`}
              >
                <div className="rounded-full bg-orange-200 p-2 text-orange-700">
                  <XCircle size={18} />
                </div>
                <div>
                  <div className="font-semibold text-orange-700">
                    Reject
                  </div>
                  <div className="text-xs text-orange-600/70">
                    Mark as rejected
                  </div>
                </div>
              </button>
              <button
                onClick={() => handleAction("delete")}
                className="flex w-full items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-3 text-left transition-colors hover:bg-red-100"
              >
                <div className="rounded-full bg-red-200 p-2 text-red-700">
                  <Trash2 size={18} />
                </div>
                <div>
                  <div className="font-semibold text-red-700">
                    Delete Quotation
                  </div>
                  <div className="text-xs text-red-600/70">
                    Permanently remove
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

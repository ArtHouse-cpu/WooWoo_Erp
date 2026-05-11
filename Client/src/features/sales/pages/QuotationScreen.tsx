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
  const [search, setSearch] = useState("");
  const [data, setData] = useState<QuotationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedActionRow, setSelectedActionRow] = useState<QuotationRow | null>(null);

  const fetchQuotations = async (searchTerm = "") => {
    try {
      setLoading(true);
      const res = await handleGetQuotations(searchTerm);
      if (res?.success && Array.isArray(res.quotations)) {
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
      } else {
        setData([]);
      }
    } catch (error) {
      console.error("Fetch error", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations(search);
  }, [search]);

  const handleAction = async (action: "view" | "edit" | "delete" | "reject" | "accept") => {
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
          fetchQuotations(search);
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
          fetchQuotations(search);
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
          fetchQuotations(search);
        } catch {
          Swal.fire("Error", "Failed to accept quotation.", "error");
        }
      }
    }
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

      const file = new File([pdfBlob], `${row.quotationCode}.pdf`, { type: "application/pdf" });
      const publicLink = await resolveHostedInvoiceLink(file);
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
      fetchQuotations(search);
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
        id: "actions",
        header: "Actions",
        size: 100,
        Cell: ({ row }: any) => {
          const r = row.original;
          return (
            <div className="relative inline-block text-left group">
              <button
                type="button"
                className="p-1 rounded hover:bg-gray-200"
                onClick={() => setSelectedActionRow(r)}
              >
                <Ellipsis size={20} />
              </button>
              {selectedActionRow?._id === r._id && (
                <div
                  className="absolute right-0 z-50 mt-1 w-48 bg-white border border-gray-200 rounded shadow-lg overflow-hidden"
                  onMouseLeave={() => setSelectedActionRow(null)}
                >
                  <button
                    onClick={() => { handleAction("view"); setSelectedActionRow(null); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    <Eye size={16} /> View
                  </button>
                  <button
                    onClick={() => { handleAction("edit"); setSelectedActionRow(null); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    <Edit size={16} /> Edit
                  </button>
                  <button
                    onClick={() => { handleAction("accept"); setSelectedActionRow(null); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-gray-100"
                  >
                    <Eye size={16} /> Accept
                  </button>
                  <button
                    onClick={() => { handleAction("reject"); setSelectedActionRow(null); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-gray-100"
                  >
                    <XCircle size={16} /> Reject
                  </button>
                  <button
                    onClick={() => { downloadPdf(r); setSelectedActionRow(null); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    <Download size={16} /> Download PDF
                  </button>
                  <button
                    onClick={() => { shareOnWhatsApp(r); setSelectedActionRow(null); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-gray-100"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                    </svg>
                    WhatsApp
                  </button>
                  <button
                    onClick={() => { handleAction("delete"); setSelectedActionRow(null); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              )}
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
          <div className="relative">
            <input
              type="text"
              placeholder="Search Quotation..."
              className="pl-10 pr-4 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
          <button
            onClick={() => navigate("/create-quotation")}
            className="bg-black text-white py-2 px-4 rounded-full text-sm font-semibold hover:bg-gray-800 transition"
          >
            Create Quotation
          </button>
        </div>
      </div>
      <MaterialReactTable table={table} />
    </div>
  );
}

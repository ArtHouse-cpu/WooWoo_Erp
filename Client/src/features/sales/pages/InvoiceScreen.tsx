import React, { useMemo } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { Eye, IndianRupee, MoreHorizontal, SendHorizontal, Plus, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function InvoiceScreen() {
  const navigate = useNavigate();
  
  const columns = useMemo(
    () => [
      { accessorKey: "id", header: "SN", size: 70 },
      { accessorKey: "amount", header: "Amount", size: 100 },
      { accessorKey: "mode", header: "Mode", size: 100 },
      {
        accessorKey: "status",
        header: "Status",
        Cell: ({ cell }) => {
          const value = cell.getValue() as string;

          let badgeClass = "bg-slate-100 text-slate-700 ring-slate-600/20";
          if (value === "Pending") badgeClass = "bg-amber-50 text-amber-700 ring-amber-600/20";
          if (value === "Paid") badgeClass = "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
          if (value === "Cancelled") badgeClass = "bg-red-50 text-red-700 ring-red-600/10";

          return (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeClass}`}>
              {value}
            </span>
          );
        },
        size: 110,
      },

      { accessorKey: "bill", header: "Bill", size: 120 },
      { accessorKey: "customer", header: "Customer", size: 150 },
      { accessorKey: "date", header: "Date", size: 120 },

      {
        accessorKey: "actions",
        header: "Action",
        size: 240,
        enableSorting: false,
        enableColumnActions: false,
        Cell: () => (
          <div className="flex items-center gap-2">
            <button
              className="group flex h-8 items-center justify-center gap-1.5 rounded-md bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-yellow-50 hover:text-yellow-700 hover:ring-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              title="Add Payment"
            >
              <IndianRupee size={14} className="text-yellow-500 group-hover:text-yellow-600" />
            </button>

            <button
              className="group flex h-8 items-center justify-center gap-1.5 rounded-md bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-purple-50 hover:text-purple-700 hover:ring-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              title="View Invoice"
            >
              <Eye size={14} className="text-purple-500 group-hover:text-purple-600" /> 
              <span className="hidden sm:inline">View</span>
            </button>

            <button
              className="group flex h-8 items-center justify-center gap-1.5 rounded-md bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-emerald-50 hover:text-emerald-700 hover:ring-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              title="Send Invoice"
            >
              <SendHorizontal size={14} className="text-emerald-500 group-hover:text-emerald-600" />
              <span className="hidden lg:inline">Send</span>
            </button>

            <button
              className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500"
              title="More Actions"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const data = useMemo(
    () => [
      {
        id: 1,
        amount: "₹ 1,200",
        mode: " Cash",
        status: "Pending",
        bill: "BILL-1023",
        customer: "Rahul Sharma",
        date: "2025-01-10",
      },
      {
        id: 2,
        amount: "₹ 950",
        mode: " Cash",
        status: "Paid",
        bill: "BILL-2041",
        customer: "Neha Verma",
        date: "2025-01-11",
      },
      {
        id: 3,
        amount: "₹ 2,500",
        mode: " Cash",
        status: "Cancelled",
        bill: "BILL-3344",
        customer: "Amit Kumar",
        date: "2025-01-12",
      },
      {
        id: 4,
        amount: "₹ 780",
        mode: " Cash",
        status: "Pending",
        bill: "BILL-5567",
        customer: "Priya Singh",
        date: "2025-01-13",
      },
      {
        id: 5,
        amount: "₹ 3,100",
        mode: " Cash",
        status: "Paid",
        bill: "BILL-8899",
        customer: "Saurabh Patil",
        date: "2025-01-14",
      },
      {
        id: 6,
        amount: "₹ 1,850",
        mode: " Cash",
        status: "Cancelled",
        bill: "BILL-6732",
        customer: "Manoj Yadav",
        date: "2025-01-15",
      },
      {
        id: 7,
        amount: "₹ 420",
        mode: " Cash",
        status: "Paid",
        bill: "BILL-2921",
        customer: "Anita Desai",
        date: "2025-01-16",
      },
      {
        id: 8,
        amount: "₹ 5,200",
        mode: " Cash",
        status: "Pending",
        bill: "BILL-4820",
        customer: "Rakesh Rao",
        date: "2025-01-17",
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns,
    data,
    enableColumnOrdering: true,
    muiTablePaperProps: {
      elevation: 0,
      sx: {
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
      },
    },
    muiTableHeadCellProps: {
      sx: {
        backgroundColor: "#f8fafc",
        color: "#475569",
        fontWeight: 600,
        fontSize: "0.875rem",
        borderBottom: "1px solid #e2e8f0",
      },
    },
    muiTableBodyCellProps: {
      sx: {
        fontSize: "0.875rem",
        color: "#334155",
        borderBottom: "1px solid #f1f5f9",
      },
    },
    muiTopToolbarProps: {
      sx: {
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        borderRadius: "12px 12px 0 0",
      },
    },
    muiBottomToolbarProps: {
      sx: {
        backgroundColor: "#ffffff",
        borderTop: "1px solid #e2e8f0",
        borderRadius: "0 0 12px 12px",
      },
    },
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <FileText size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Invoices</h1>
              <p className="text-sm text-slate-500">Manage your invoices, view status, and create new bills.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/create-invoice")}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            >
              <Plus size={18} />
              Create Invoice
            </button>
          </div>
        </div>
        
        <div className="w-full overflow-hidden">
          <MaterialReactTable table={table} />
        </div>
      </div>
    </div>
  );
}

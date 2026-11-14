import { useMemo } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { Eye, IndianRupee, MoreHorizontal, SendHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Can from "@/components/rbac/Can";
import { cvpMaterialTableProps, cvpActionButtonClass, cvpWebPageClass, cvpPrimaryButtonClass, cvpTitleClass } from "@/components/tables/cvpTableTheme";
import { PERMISSIONS } from "@/constants/permissions";

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
        Cell: ({ cell }: { cell: any }) => {
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
              className={cvpActionButtonClass}
              title="Add Payment"
            >
              <IndianRupee size={14} className="text-yellow-500 group-hover:text-yellow-600" />
            </button>

            <button
              className={cvpActionButtonClass}
              title="View Invoice"
            >
              <Eye size={14} className="text-purple-500 group-hover:text-purple-600" /> 
              <span className="hidden sm:inline">View</span>
            </button>

            <button
              className={cvpActionButtonClass}
              title="Send Invoice"
            >
              <SendHorizontal size={14} className="text-emerald-500 group-hover:text-emerald-600" />
              <span className="hidden lg:inline">Send</span>
            </button>

            <button
              className={cvpActionButtonClass}
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
    muiTableContainerProps: {
      sx: {
        maxWidth: "100%",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
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
    ...cvpMaterialTableProps,
  });

  return (
    <div className={cvpWebPageClass}>
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className={cvpTitleClass}>Invoices</h1>
            <p className="mt-1 text-sm text-slate-500">Manage your invoices, view status, and create new bills.</p>
          </div>
          <div className="flex items-center gap-3">
            <Can permission={PERMISSIONS.INVOICE_CREATE}>
              <button
                onClick={() => navigate("/create-invoice")}
                className={cvpPrimaryButtonClass}
              >
                Create Invoice
              </button>
            </Can>
          </div>
        </div>
        
        <div className="mt-4 w-full overflow-hidden">
          <MaterialReactTable table={table} />
        </div>
      </div>
    </div>
  );
}

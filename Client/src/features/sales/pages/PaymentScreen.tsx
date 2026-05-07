import React, { useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { Eye, IndianRupee, MoreHorizontal, SendHorizontal } from "lucide-react";

export default function PaymentScreen() {
  const columns = useMemo(
    () => [
      { accessorKey: "id", header: "ID", size: 70 },
      { accessorKey: "account", header: "Account" },
      {
        accessorKey: "status",
        header: "Status",
        Cell: ({ cell }) => {
          const value = cell.getValue();

          const badgeClass =
            value === "Pending"
              ? "bg-yellow-100 text-yellow-700"
              : value === "Paid"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700";

          return (
            <span
              className={`px-3 py-1 text-xs font-medium rounded-full ${badgeClass}`}
            >
              {value}
            </span>
          );
        },
      },
      { accessorKey: "mode", header: "Mode" },
      { accessorKey: "bill", header: "Bill" },
      { accessorKey: "vendor", header: "Vendor" },
      { accessorKey: "date", header: "Date" },

      {
        header: "Actions",
        accessorKey: "actions",
        Cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {/* ₹ Button */}
            <button className="px-2 py-1 rounded bg-yellow-100 hover:bg-yellow-200">
              <IndianRupee size={16} />
            </button>

            {/* View */}
            <button className="flex items-center gap-1 px-3 py-1 rounded bg-purple-100 hover:bg-purple-200">
              <Eye size={16} /> <span className="text-sm">View</span>
            </button>

            {/* Send */}
            <button className="flex items-center gap-1 px-3 py-1 rounded bg-green-100 hover:bg-green-200">
              <SendHorizontal size={16} /> <span className="text-sm">Send</span>
            </button>

            {/* More */}
            <button className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200">
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
        account: "HDFC Bank",
        status: "Pending",
        mode: "UPI",
        bill: "₹1,200",
        vendor: "Amazon",
        date: "2025-01-12",
      },
      {
        id: 2,
        account: "ICICI",
        status: "Paid",
        mode: "Cash",
        bill: "₹800",
        vendor: "Reliance Mart",
        date: "2025-01-10",
      },
      {
        id: 3,
        account: "SBI",
        status: "Failed",
        mode: "Card",
        bill: "₹2,500",
        vendor: "Flipkart",
        date: "2025-01-08",
      },
      {
        id: 4,
        account: "HDFC Bank",
        status: "Pending",
        mode: "UPI",
        bill: "₹1,200",
        vendor: "Amazon",
        date: "2025-01-12",
      },
      {
        id: 5,
        account: "ICICI",
        status: "Paid",
        mode: "Cash",
        bill: "₹800",
        vendor: "Reliance Mart",
        date: "2025-01-10",
      },
      {
        id: 6,
        account: "SBI",
        status: "Failed",
        mode: "Card",
        bill: "₹2,500",
        vendor: "Flipkart",
        date: "2025-01-08",
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns,
    data,
    muiPaperProps: {
      elevation: 0,
      square: true,
      style: {
        boxShadow: "none",
        border: "1px solid #e5e7eb",
      },
    },
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
        <h1 className="text-xl font-semibold ">Payments Timeline</h1>
      </div>
      <MaterialReactTable table={table} />
    </div>
  );
}

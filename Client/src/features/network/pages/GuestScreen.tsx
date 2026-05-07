import React, { useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { Link } from "react-router-dom";
import { Eye, SquarePen, Trash2 } from "lucide-react";
import LedgerModal from "@/features/network/components/LedgerModal";
import CreateGuestModal from "@/features/network/components/CreateGuestModal";
export default function GuestScreen() {
  const [openCreateGuestModal, setOpenCreateGuestModal] = useState(false);
  const [openLedgerModal, setOpenLedgerModal] = useState(false);
  const data = useMemo(
    () => [
      {
        id: 1,
        name: "Rajesh Kumar",
        mobile: "9876543210",
        email: "rajesh.kumar@example.com",
        address: "Bhilai, Chhattisgarh",
      },
      {
        id: 2,
        name: "Anita Sharma",
        mobile: "9123456780",
        email: "anita.sharma@example.com",
        address: "Durg, Chhattisgarh",
      },
      {
        id: 3,
        name: "Vikram Singh",
        mobile: "9988776655",
        email: "vikram.singh@example.com",
        address: "Bhilai, Chhattisgarh",
      },
      {
        id: 4,
        name: "Sunita Patel",
        mobile: "9876543210",
        email: "sunita.patel@example.com",
        address: "Bhilai, Chhattisgarh",
      },
      {
        id: 5,
        name: "Ram Kumar",
        mobile: "9876543210",
        email: "ram.kumar@example.com",
        address: "Durg, Chhattisgarh",
      },
      {
        id: 6,
        name: "Sita Devi",
        mobile: "9876543210",
        email: "sita.devi@example.com",
        address: "Bhilai, Chhattisgarh",
      },
      {
        id: 7,
        name: "Sunil Joshi",
        mobile: "9876543210",
        email: "sunil.joshi@example.com",
        address: "Durg, Chhattisgarh",
      },
    ],
    []
  );

  const columns = useMemo(
    () => [
      { accessorKey: "id", header: "ID", size: 90 },
      { accessorKey: "name", header: "Guest Name" },
      { accessorKey: "mobile", header: "Mobile" },
      { accessorKey: "email", header: "Email" },
      { accessorKey: "address", header: "Address" },
      {
        header: "Ledger",
        accessorKey: "ledger",
        size: 40,
        Cell: ({ row }) => (
          <button
            onClick={() => setOpenLedgerModal(true)}
            title="View Ledger"
            className="px-3 py-2 text-sm bg-indigo-100 rounded hover:bg-indigo-200 cursor-pointer"
          >
            <Eye color="indigo" size={18} />
          </button>
        ),
      },

      {
        header: "Actions",
        accessorKey: "actions",
        Cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => console.log("Edit:", row.original)}
              className="px-3 py-2 text-sm bg-green-100 rounded hover:bg-green-200 cursor-pointer"
            >
              <SquarePen color="green" size={18} />
            </button>
            <button
              onClick={() => console.log("Delete:", row.original)}
              className="px-3 py-2 text-sm bg-red-100 rounded hover:bg-red-200 cursor-pointer"
            >
              <Trash2 color="red" size={18} />
            </button>
          </div>
        ),
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
        <h1 className="text-xl font-semibold ">Guests List</h1>
        <div className="flex gap-3">
          <div
            className="w-[150px] bg-black text-white py-2 px-1 rounded  text-[14px] font-semibold transition text-center border-radius-[50px] cursor-pointer"
            onClick={() => setOpenCreateGuestModal(true)}
          >
            Create New Guest
          </div>
          {openCreateGuestModal && (
            <CreateGuestModal onClose={() => setOpenCreateGuestModal(false)} />
          )}
        </div>
      </div>

      <MaterialReactTable table={table} />

      {openLedgerModal && (
        <LedgerModal onClose={() => setOpenLedgerModal(false)} />
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { Eye, SquarePen, Trash2 } from "lucide-react";
import LedgerModal from "@/features/network/components/LedgerModal";
import CreatePartnerModal from "@/features/network/components/CreatePartnerModal";

export default function PartnerScreen() {
  const [openCreatePartnerModal, setOpenCreatePartnerModal] = useState(false);
  const [openLedgerModal, setOpenLedgerModal] = useState(false);
  const data = useMemo(
    () => [
      {
        id: 1,
        name: "Rajesh Kumar",
        company: "Kumar Traders Pvt. Ltd.",
        category: "Art Supplies Distributor",
        mobile: "9876543210",
        email: "rajesh.kumar@example.com",
        gstin: "22AAAAA0000A1Z5",
      },
      {
        id: 2,
        name: "Suresh Singh",
        company: "Singh & Sons",
        category: "Canvas Manufacturer",
        mobile: "9123456789",
        email: "suresh.singh@example.com",
        gstin: "22BBBBB0000B1Z5",
      },
      {
        id: 3,
        name: "Anita Verma",
        company: "Verma Art Gallery",
        category: "Retail Partner",
        mobile: "9988776655",
        email: "anita.verma@example.com",
        gstin: "22CCCCC0000C1Z5",
      },
    ],
    []
  );

  const columns = useMemo(
    () => [
      { accessorKey: "id", header: "ID", size: 50 },
      { accessorKey: "name", header: "Partner Name", size: 150 },
      { accessorKey: "company", header: "Company", size: 200 },
      { accessorKey: "category", header: "Category", size: 150 },
      { accessorKey: "mobile", header: "Mobile", size: 120 },
      { accessorKey: "email", header: "Email", size: 180 },
      { accessorKey: "gstin", header: "GSTIN", size: 150 },

      {
        header: "Ledger",
        accessorKey: "ledger",
        size: 40,
        Cell: ({ row: _row }: { row: any }) => (
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
        Cell: ({ row }: { row: any }) => (
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
    muiTablePaperProps: {
      elevation: 0,
      style: {
        boxShadow: "none",
        border: "1px solid #e5e7eb",
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

  return (
    <div className="p-1">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Partners List</h1>
        <button
          className="w-[150px] bg-black text-white py-2 px-3 rounded text-[14px] font-semibold transition text-center cursor-pointer"
          onClick={() => setOpenCreatePartnerModal(true)}
        >
          Create Partner
        </button>
      </div>

      <MaterialReactTable table={table} />

      {openCreatePartnerModal && (
        <CreatePartnerModal onClose={() => setOpenCreatePartnerModal(false)} />
      )}
      {openLedgerModal && (
        <LedgerModal onClose={() => setOpenLedgerModal(false)} />
      )}
    </div>
  );
}

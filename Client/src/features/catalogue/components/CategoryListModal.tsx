import { SquarePen, Trash2, X } from "lucide-react";
import React, { useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";

export default function CategoryListModal({ onClose }: any) {
  const [onlineStatus, setOnlineStatus] = useState<{ [key: number]: boolean }>(
    {}
  );

  const handleToggle = (id: number) => {
    setOnlineStatus((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // -------------------------
  // Columns
  // -------------------------
  const columns = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        size: 40,
      },

      {
        accessorKey: "image",
        header: "Image",
        size: 80,
        Cell: ({ row }) => (
          <img
            src={row.original.image}
            alt="category"
            className="w-12 h-12 rounded-lg object-cover"
          />
        ),
      },

      {
        accessorKey: "name",
        header: "Category Name",
        size: 160,
        Cell: ({ cell }) => (
          <span className="font-semibold text-gray-800">{cell.getValue()}</span>
        ),
      },

      {
        accessorKey: "description",
        header: "Description",
        size: 200,
      },

      {
        accessorKey: "online",
        header: "Online",
        size: 70,
        Cell: ({ row }) => (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={onlineStatus[row.original.id] || false}
              onChange={() => handleToggle(row.original.id)}
              className="sr-only peer"
            />

            <div className="w-10 h-5 bg-gray-300 rounded-full peer-checked:bg-blue-500 transition-all"></div>

            <div className="absolute left-[2px] top-[2px] w-4 h-4 bg-white rounded-full shadow transition-all peer-checked:translate-x-5"></div>
          </label>
        ),
      },

      {
        header: "Actions",
        size: 90,
        Cell: ({ row }) => (
          <div className="flex justify-center gap-2">
            <button
              onClick={() => console.log("Edit:", row.original)}
              className="p-2 bg-green-100 rounded hover:bg-green-200"
            >
              <SquarePen size={18} className="text-green-600" />
            </button>

            <button
              onClick={() => console.log("Delete:", row.original)}
              className="p-2 bg-red-100 rounded hover:bg-red-200"
            >
              <Trash2 size={18} className="text-red-600" />
            </button>
          </div>
        ),
      },
    ],
    [onlineStatus]
  );

  // -------------------------
  // Dummy Data
  // -------------------------
  const data = useMemo(
    () => [
      {
        id: 1,
        name: "Electronics",
        description: "All electronic gadgets",
        image: "https://source.unsplash.com/random/300x300?electronics",
      },
      {
        id: 2,
        name: "Clothing",
        description: "Men & Women clothes",
        image: "https://source.unsplash.com/random/300x300?clothes",
      },
      {
        id: 3,
        name: "Footwear",
        description: "Shoes & Sandals",
        image: "https://source.unsplash.com/random/300x300?shoes",
      },
      {
        id: 4,
        name: "Mobile",
        description: "Smartphones Collection",
        image: "https://source.unsplash.com/random/300x300?mobile",
      },
      {
        id: 5,
        name: "Accessories",
        description: "Belts, Watches, Bags",
        image: "https://source.unsplash.com/random/300x300?accessories",
      },
    ],
    []
  );

  // -------------------------
  // Table instance
  // -------------------------
  const table = useMaterialReactTable({
    columns,
    data,
    enableSorting: false,
    enableColumnOrdering: false,
    enableDensityToggle: false,
    enableHiding: false,
    initialState: { pagination: { pageSize: 5 } },
    muiTablePaperProps: {
      elevation: 0,
      sx: { border: "1px solid #e5e7eb" },
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-auto max-w-[90%] p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100"
        >
          <X size={22} />
        </button>

        <h2 className="text-lg font-semibold mb-4">Category List</h2>

        <MaterialReactTable table={table} />
      </div>
    </div>
  );
}

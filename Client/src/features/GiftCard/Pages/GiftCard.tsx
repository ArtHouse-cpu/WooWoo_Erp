import { useMemo, useState } from "react";

import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";

import { Eye, Pencil, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import { useAuthStore } from "@/store/authStore";
import { useAppSelector } from "@/store/hooks";
import CreateGiftCardModal, {
  resolveStaffName,
  type GiftCardFormData,
} from "../components/CreateGiftCardModal";

// Gift Card Type - strictly matches the MRT table parameters
export type GiftCardData = {
  _id: string;
  code: string;
  name: string;
  initialAmount: number;
  currentBalance: number;
  createdBy: string;
  expiryDate: string;
  status: "Active" | "Used" | "Expired" | "Cancelled";
  createdAt?: string;
};

// Initial Sample Data
const initialGiftCards: GiftCardData[] = [
  {
    _id: "1",
    code: "GC-2026-001",
    name: "Birthday Gift Card",
    initialAmount: 2000,
    currentBalance: 1200,
    createdBy: "Rahul Sharma",
    expiryDate: "2026-12-31",
    status: "Active",
  },
  {
    _id: "2",
    code: "GC-2026-002",
    name: "Festival Gift Card",
    initialAmount: 1000,
    currentBalance: 0,
    createdBy: "Priya Singh",
    expiryDate: "2026-11-30",
    status: "Used",
  },
  {
    _id: "3",
    code: "GC-2026-003",
    name: "Welcome Gift Card",
    initialAmount: 500,
    currentBalance: 500,
    createdBy: "Aman Verma",
    expiryDate: "2027-01-15",
    status: "Active",
  },
];

const LOCAL_STORAGE_KEY = "woowoo_gift_cards";

const loadGiftCards = (): GiftCardData[] => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load gift cards from localStorage", e);
  }
  return initialGiftCards;
};

const GiftCard = () => {
  const [cards, setCards] = useState<GiftCardData[]>(loadGiftCards);
  const [showModal, setShowModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<GiftCardData | null>(null);

  const authUser = useAuthStore((state) => state.user);
  const reduxStaffName = useAppSelector((state) => state.user.m_staff_name);

  const staffName = useMemo(() => {
    const authName =
      authUser?.fullName ||
      (authUser as any)?.name ||
      (authUser as any)?.m_staff_name ||
      null;
    return resolveStaffName(reduxStaffName, authName, "Staff");
  }, [reduxStaffName, authUser]);

  const saveCards = (updated: GiftCardData[]) => {
    setCards(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save gift cards to localStorage", e);
    }
  };

  const handleCreateOrUpdate = (formData: GiftCardFormData) => {
    if (formData._id) {
      // Update existing
      const updated = cards.map((c) =>
        c._id === formData._id
          ? ({ ...c, ...formData, _id: formData._id } as GiftCardData)
          : c,
      );
      saveCards(updated);
      Swal.fire({
        icon: "success",
        title: "Updated!",
        text: `Gift card ${formData.code} has been updated successfully.`,
        timer: 2000,
        showConfirmButton: false,
      });
    } else {
      // Check for duplicate code
      const isDuplicate = cards.some(
        (c) => c.code.trim().toLowerCase() === formData.code.trim().toLowerCase(),
      );
      if (isDuplicate) {
        Swal.fire({
          icon: "error",
          title: "Duplicate Code",
          text: `A gift card with code "${formData.code}" already exists!`,
        });
        return;
      }

      // Create new
      const newCard: GiftCardData = {
        _id: Date.now().toString(),
        code: formData.code,
        name: formData.name,
        initialAmount: formData.initialAmount,
        currentBalance: formData.currentBalance,
        createdBy: formData.createdBy || staffName,
        expiryDate: formData.expiryDate,
        status: formData.status,
        createdAt: new Date().toISOString(),
      };
      const updated = [newCard, ...cards];
      saveCards(updated);
      Swal.fire({
        icon: "success",
        title: "Created!",
        text: `Gift card ${formData.code} created successfully.`,
        timer: 2000,
        showConfirmButton: false,
      });
    }
  };

  const handleDelete = (id: string) => {
    const cardToDelete = cards.find((c) => c._id === id);
    Swal.fire({
      title: "Delete Gift Card?",
      text: `Are you sure you want to delete "${cardToDelete?.name || cardToDelete?.code}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        const updated = cards.filter((c) => c._id !== id);
        saveCards(updated);
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "The gift card has been deleted.",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    });
  };

  const handleView = (card: GiftCardData) => {
    Swal.fire({
      title: `<strong>${card.name}</strong>`,
      html: `
        <div style="text-align: left; font-size: 14px; line-height: 1.8; padding: 8px 16px;">
          <p><strong>Code:</strong> <span style="font-family: monospace; background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${card.code}</span></p>
          <p><strong>Initial Amount:</strong> ₹${card.initialAmount.toLocaleString("en-IN")}</p>
          <p><strong>Current Balance:</strong> ₹${card.currentBalance.toLocaleString("en-IN")}</p>
          <p><strong>Created By:</strong> ${card.createdBy}</p>
          ${
            card.createdAt
              ? `<p><strong>Created At:</strong> ${new Date(card.createdAt).toLocaleDateString("en-IN")}</p>`
              : ""
          }
          <p><strong>Expiry Date:</strong> ${new Date(card.expiryDate).toLocaleDateString("en-IN")}</p>
          <p><strong>Status:</strong> ${card.status}</p>
        </div>
      `,
      icon: "info",
      confirmButtonText: "Close",
      confirmButtonColor: "#000",
    });
  };

  // Table Columns
  const columns = useMemo<MRT_ColumnDef<GiftCardData>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Gift Card Code",
        size: 160,
      },

      {
        accessorKey: "name",
        header: "Name",
        size: 200,
      },

      {
        accessorKey: "initialAmount",
        header: "Amount",
        size: 120,

        Cell: ({ cell }) => (
          <span className="font-medium text-gray-800">
            ₹{cell.getValue<number>().toLocaleString("en-IN")}
          </span>
        ),
      },

      {
        accessorKey: "currentBalance",
        header: "Balance",
        size: 120,

        Cell: ({ cell }) => (
          <span className="font-medium text-gray-800">
            ₹{cell.getValue<number>().toLocaleString("en-IN")}
          </span>
        ),
      },

      {
        accessorKey: "createdBy",
        header: "Created By",
        size: 160,
      },

      {
        accessorKey: "expiryDate",
        header: "Expiry Date",
        size: 140,

        Cell: ({ cell }) => {
          const date = cell.getValue<string>();
          if (!date) return "-";
          try {
            return new Date(date).toLocaleDateString("en-IN");
          } catch {
            return date;
          }
        },
      },

      {
        accessorKey: "status",
        header: "Status",
        size: 120,

        Cell: ({ cell }) => {
          const status = cell.getValue<GiftCardData["status"]>();

          return (
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                status === "Active"
                  ? "bg-green-100 text-green-700"
                  : status === "Used"
                    ? "bg-blue-100 text-blue-700"
                    : status === "Expired"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-700"
              }`}
            >
              {status}
            </span>
          );
        },
      },

      // Actions
      {
        id: "actions",
        header: "Actions",
        size: 150,

        Cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {/* View */}
            <button
              type="button"
              onClick={() => handleView(row.original)}
              className="cursor-pointer rounded p-2 text-blue-600 transition hover:bg-blue-50"
              title="View"
            >
              <Eye size={18} />
            </button>

            {/* Edit */}
            <button
              type="button"
              onClick={() => {
                setSelectedCard(row.original);
                setShowModal(true);
              }}
              className="cursor-pointer rounded p-2 text-green-600 transition hover:bg-green-50"
              title="Edit"
            >
              <Pencil size={18} />
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={() => handleDelete(row.original._id)}
              className="cursor-pointer rounded p-2 text-red-600 transition hover:bg-red-50"
              title="Delete"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ),
      },
    ],
    [cards],
  );

  // MRT Table
  const table = useMaterialReactTable({
    columns,
    data: cards,

    enableColumnActions: false,
    enableColumnFilters: true,
    enableSorting: true,
    enablePagination: true,

    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
    },

    muiTableHeadCellProps: {
      sx: {
        fontWeight: 600,
      },
    },
  });

  return (
    <div className="min-w-0 p-1">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Gift Cards</h1>

        <button
          type="button"
          onClick={() => {
            setSelectedCard(null);
            setShowModal(true);
          }}
          className="cursor-pointer rounded bg-black px-4 py-2 text-[14px] font-semibold text-white transition hover:bg-gray-800"
        >
          + Create Gift Card
        </button>
      </div>

      {/* MRT Table */}
      <MaterialReactTable table={table} />

      {/* Create / Edit Modal */}
      <CreateGiftCardModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedCard(null);
        }}
        onSubmit={handleCreateOrUpdate}
        initialData={selectedCard}
        existingCards={cards}
        defaultCreatedBy={staffName}
      />
    </div>
  );
};

export default GiftCard;
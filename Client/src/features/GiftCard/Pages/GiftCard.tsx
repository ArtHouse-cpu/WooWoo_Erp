import { useCallback, useEffect, useMemo, useState } from "react";

import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";

import { Eye, Pencil, RefreshCw, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { useAuthStore } from "@/store/authStore";
import { useAppSelector } from "@/store/hooks";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import {
  handleCreateGiftCard,
  handleDeleteGiftCard,
  handleGetGiftCardById,
  handleGetGiftCards,
  handleUpdateGiftCard,
  type GiftCardRecord,
  type GiftCardTransaction,
} from "@/services/apiClient";
import CreateGiftCardModal, {
  resolveStaffName,
  type GiftCardFormData,
} from "../components/CreateGiftCardModal";
import ViewGiftCardModal from "../components/viewGiftCardModal";

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
  transactions?: GiftCardTransaction[];
};

const toGiftCardData = (record: GiftCardRecord): GiftCardData => ({
  _id: record._id,
  code: record.code,
  name: record.name,
  initialAmount: Number(record.initialAmount || 0),
  currentBalance: Number(record.currentBalance || 0),
  createdBy: record.createdBy || "",
  expiryDate: record.expiryDate || "",
  status: record.status,
  createdAt: record.createdAt,
  transactions: record.transactions,
});

const getErrorMessage = (error: unknown, fallback: string) => {
  const err = error as { response?: { data?: { message?: string } } };
  return err?.response?.data?.message || fallback;
};

const GiftCard = () => {
  const [cards, setCards] = useState<GiftCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<GiftCardData | null>(null);
  const [viewCard, setViewCard] = useState<GiftCardData | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const { can } = usePermission();
  const canCreate = can(PERMISSIONS.GIFT_CARD_CREATE);
  const canUpdate = can(PERMISSIONS.GIFT_CARD_UPDATE);
  const canDelete = can(PERMISSIONS.GIFT_CARD_DELETE);

  const authUser = useAuthStore((state) => state.user);
  const reduxStaffName = useAppSelector((state) => state.user.m_staff_name);

  const staffName = useMemo(() => {
    const authUserRecord = authUser as
      | { fullName?: string; name?: string; m_staff_name?: string }
      | null;
    const authName =
      authUserRecord?.fullName ||
      authUserRecord?.name ||
      authUserRecord?.m_staff_name ||
      null;
    return resolveStaffName(reduxStaffName, authName, "Staff");
  }, [reduxStaffName, authUser]);

  const loadCards = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const data = await handleGetGiftCards(undefined, signal);
      setCards((data.giftCards || []).map(toGiftCardData));
    } catch (error) {
      if ((error as { code?: string })?.code === "ERR_CANCELED") return;
      toast.error(getErrorMessage(error, "Failed to load gift cards."));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadCards(controller.signal);
    return () => controller.abort();
  }, [loadCards]);

  const upsertLocal = (card: GiftCardData) => {
    setCards((prev) => {
      const exists = prev.some((c) => c._id === card._id);
      return exists
        ? prev.map((c) => (c._id === card._id ? card : c))
        : [card, ...prev];
    });
  };

  /** Resolves true when saved, so the form knows whether to close. */
  const handleCreateOrUpdate = async (
    formData: GiftCardFormData,
  ): Promise<boolean> => {
    const payload = {
      code: formData.code.trim(),
      name: formData.name.trim(),
      initialAmount: formData.initialAmount,
      currentBalance: formData.currentBalance,
      createdBy: formData.createdBy || staffName,
      expiryDate: formData.expiryDate,
      status: formData.status,
    };

    try {
      const data = formData._id
        ? await handleUpdateGiftCard(formData._id, payload)
        : await handleCreateGiftCard(payload);
      const saved = toGiftCardData(data.giftCard);
      upsertLocal(saved);
      Swal.fire({
        icon: "success",
        title: formData._id ? "Updated!" : "Created!",
        text:
          data.message ||
          `Gift card ${saved.code} ${formData._id ? "updated" : "created"} successfully.`,
        timer: 2000,
        showConfirmButton: false,
      });
      if (saved.status !== formData.status) {
        toast.info(`Status set to "${saved.status}" based on balance and expiry.`);
      }
      return true;
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: formData._id ? "Update failed" : "Create failed",
        text: getErrorMessage(error, "Could not save the gift card. Try again."),
      });
      return false;
    }
  };

  const handleDelete = (card: GiftCardData) => {
    Swal.fire({
      title: "Delete Gift Card?",
      text: `Are you sure you want to delete "${card.name || card.code}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      preConfirm: async () => {
        try {
          await handleDeleteGiftCard(card._id);
          return true;
        } catch (error) {
          Swal.showValidationMessage(
            getErrorMessage(error, "Could not delete the gift card."),
          );
          return false;
        }
      },
    }).then((result) => {
      if (!result.isConfirmed) return;
      setCards((prev) => prev.filter((c) => c._id !== card._id));
      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "The gift card has been deleted.",
        timer: 1500,
        showConfirmButton: false,
      });
    });
  };

  const handleView = async (card: GiftCardData) => {
    setViewCard(card);
    setViewLoading(true);
    try {
      const data = await handleGetGiftCardById(card._id);
      const fresh = toGiftCardData(data.giftCard);
      setViewCard((current) => (current?._id === fresh._id ? fresh : current));
      upsertLocal({ ...fresh, transactions: undefined });
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load gift card history."));
    } finally {
      setViewLoading(false);
    }
  };

  const openEdit = (card: GiftCardData) => {
    setSelectedCard(card);
    setShowModal(true);
  };

  const handleEditFromView = (card: GiftCardData) => {
    setViewCard(null);
    openEdit(card);
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
          const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
          return m ? `${m[3]}/${m[2]}/${m[1]}` : date;
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
        enableSorting: false,
        enableColumnFilter: false,

        Cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleView(row.original)}
              className="cursor-pointer rounded p-2 text-blue-600 transition hover:bg-blue-50"
              title="View"
            >
              <Eye size={18} />
            </button>

            {canUpdate && (
              <button
                type="button"
                onClick={() => openEdit(row.original)}
                className="cursor-pointer rounded p-2 text-green-600 transition hover:bg-green-50"
                title="Edit"
              >
                <Pencil size={18} />
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={() => handleDelete(row.original)}
                className="cursor-pointer rounded p-2 text-red-600 transition hover:bg-red-50"
                title="Delete"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canUpdate, canDelete],
  );

  // MRT Table
  const table = useMaterialReactTable({
    columns,
    data: cards,
    getRowId: (row) => row._id,

    enableColumnActions: false,
    enableColumnFilters: true,
    enableSorting: true,
    enablePagination: true,

    state: {
      isLoading: loading && cards.length === 0,
      showProgressBars: loading,
    },

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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadCards()}
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-gray-300 px-3 py-2 text-[14px] font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          {canCreate && (
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
          )}
        </div>
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
      <ViewGiftCardModal
        open={Boolean(viewCard)}
        card={viewCard}
        loadingHistory={viewLoading}
        onClose={() => setViewCard(null)}
        onEdit={canUpdate ? handleEditFromView : undefined}
      />
    </div>
  );
};

export default GiftCard;

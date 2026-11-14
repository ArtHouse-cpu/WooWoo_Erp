import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ShareGiftCardModal from "../components/ShareGiftCardModal";

import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";

import {
  Check,
  Copy,
  CreditCard,
  Eye,
  Gift,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
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
  isShared?: boolean;
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
  isShared: Boolean(record.isShared),
});

const getErrorMessage = (error: unknown, fallback: string) => {
  const err = error as { response?: { data?: { message?: string } } };
  return err?.response?.data?.message || fallback;
};

function formatExpiryDate(dateStr?: string): string {
  if (!dateStr) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : dateStr;
}

const GiftCard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cards, setCards] = useState<GiftCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<GiftCardData | null>(null);
  const [viewCard, setViewCard] = useState<GiftCardData | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [shareCard, setShareCard] = useState<GiftCardData | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { can } = usePermission();
  const canCreate = can(PERMISSIONS.GIFT_CARD_CREATE);
  const canUpdate = can(PERMISSIONS.GIFT_CARD_UPDATE);
  const canDelete = can(PERMISSIONS.GIFT_CARD_DELETE);

  const stats = useMemo(() => {
    const total = cards.length;
    const active = cards.filter((c) => c.status === "Active").length;
    const used = cards.filter((c) => c.status === "Used").length;
    const activeAmount = cards.reduce(
      (sum, c) =>
        sum + (c.status === "Active" ? Number(c.initialAmount) || 0 : 0),
      0,
    );
    return { total, active, used, activeAmount };
  }, [cards]);

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards.filter((card) => {
      if (statusFilter !== "All" && card.status !== statusFilter) return false;
      if (!q) return true;
      return (
        card.code.toLowerCase().includes(q) ||
        card.name.toLowerCase().includes(q) ||
        card.createdBy.toLowerCase().includes(q)
      );
    });
  }, [cards, search, statusFilter]);

  const handleCopyCode = async (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`Copied ${code}`);
      setTimeout(() => setCopiedCode(null), 1500);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  useEffect(() => {
    if (searchParams.get("create") !== "1") return;
    setSelectedCard(null);
    setShowModal(true);
    const next = new URLSearchParams(searchParams);
    next.delete("create");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const authUser = useAuthStore((state) => state.user);
  const reduxStaffName = useAppSelector((state) => state.user.m_staff_name);

  const staffName = useMemo(() => {
    const authUserRecord = authUser as {
      fullName?: string;
      name?: string;
      m_staff_name?: string;
    } | null;
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
        toast.info(
          `Status set to "${saved.status}" based on expiry.`,
        );
      }
      return true;
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: formData._id ? "Update failed" : "Create failed",
        text: getErrorMessage(
          error,
          "Could not save the gift card. Try again.",
        ),
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

  const handleShareChange = useCallback((cardId: string, isShared: boolean) => {
    setCards((prev) =>
      prev.map((c) => (c._id === cardId ? { ...c, isShared } : c)),
    );
  }, []);

  const handleShareFromView = (card: GiftCardData) => {
    setShareCard(card);
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
    data: filteredCards,
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
    <div className="min-w-0 space-y-3.5 p-1 sm:p-2">
      {/* Header: Title on left, + Create button parallel in the same line on right */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900">
          Gift Cards
        </h1>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void loadCards()}
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            title="Refresh"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-violet-600" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {canCreate && (
            <button
              type="button"
              onClick={() => {
                setSelectedCard(null);
                setShowModal(true);
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 active:scale-95"
            >
              <Plus size={15} />
              <span>Create</span>
            </button>
          )}
        </div>
      </div>

      {/* Colorful Top KPI Stat Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        {/* Total Gift Cards */}
        <div className="relative min-w-0 overflow-hidden rounded-2xl border border-violet-100/90 bg-violet-50/60 p-2.5 sm:p-3.5 shadow-2xs transition duration-300 hover:shadow-md hover:border-violet-200">
          <Gift className="absolute -right-2 -bottom-2 sm:-right-3 sm:-bottom-3 h-14 w-14 sm:h-20 sm:w-20 stroke-[1.2] pointer-events-none text-violet-200/50" />
          <div className="relative z-10 flex items-center gap-2 sm:gap-2.5">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-xs shadow-violet-500/20">
              <Gift className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-[10px] sm:text-xs font-bold text-slate-800" title="Total Cards">
                Total Cards
              </span>
              <div className="mt-0.5 text-lg sm:text-2xl font-extrabold tabular-nums text-slate-900">
                {stats.total}
              </div>
            </div>
          </div>
        </div>

        {/* Active Cards */}
        <div className="relative min-w-0 overflow-hidden rounded-2xl border border-emerald-100/90 bg-emerald-50/60 p-2.5 sm:p-3.5 shadow-2xs transition duration-300 hover:shadow-md hover:border-emerald-200">
          <Wallet className="absolute -right-2 -bottom-2 sm:-right-3 sm:-bottom-3 h-14 w-14 sm:h-20 sm:w-20 stroke-[1.2] pointer-events-none text-emerald-200/50" />
          <div className="relative z-10 flex items-center gap-2 sm:gap-2.5">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs shadow-emerald-500/20">
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-[10px] sm:text-xs font-bold text-slate-800" title="Active Cards">
                Active Cards
              </span>
              <div className="mt-0.5 text-lg sm:text-2xl font-extrabold tabular-nums text-slate-900">
                {stats.active}
              </div>
            </div>
          </div>
        </div>

        {/* Active gift card amount */}
        <div className="relative min-w-0 overflow-hidden rounded-2xl border border-blue-100/90 bg-blue-50/60 p-2.5 sm:p-3.5 shadow-2xs transition duration-300 hover:shadow-md hover:border-blue-200">
          <CreditCard className="absolute -right-2 -bottom-2 sm:-right-3 sm:-bottom-3 h-14 w-14 sm:h-20 sm:w-20 stroke-[1.2] pointer-events-none text-blue-200/50" />
          <div className="relative z-10 flex items-center gap-2 sm:gap-2.5">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs shadow-blue-500/20">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-[10px] sm:text-xs font-bold text-slate-800" title="Active amount">
                Active amount
              </span>
              <div className="mt-0.5 text-lg sm:text-2xl font-extrabold tabular-nums text-slate-900">
                ₹{stats.activeAmount.toLocaleString("en-IN")}
              </div>
            </div>
          </div>
        </div>

        {/* Fully Redeemed */}
        <div className="relative min-w-0 overflow-hidden rounded-2xl border border-amber-100/90 bg-amber-50/60 p-2.5 sm:p-3.5 shadow-2xs transition duration-300 hover:shadow-md hover:border-amber-200">
          <RefreshCw className="absolute -right-2 -bottom-2 sm:-right-3 sm:-bottom-3 h-14 w-14 sm:h-20 sm:w-20 stroke-[1.2] pointer-events-none text-amber-200/50" />
          <div className="relative z-10 flex items-center gap-2 sm:gap-2.5">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs shadow-amber-500/20">
              <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-[10px] sm:text-xs font-bold text-slate-800" title="Redeemed Cards">
                Redeemed Cards
              </span>
              <div className="mt-0.5 text-lg sm:text-2xl font-extrabold tabular-nums text-slate-900">
                {stats.used}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Status Filter in one row */}
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code, recipient name, or creator..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-400 cursor-pointer hover:bg-slate-50 shrink-0"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Used">Used</option>
          <option value="Expired">Expired</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Desktop View: Table Form only */}
      <div className="hidden md:block">
        <MaterialReactTable table={table} />
      </div>

      {/* Mobile View: Light, Clean & Compact Card Form only */}
      <div className="block md:hidden space-y-2.5">
        {loading && cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
            <p className="mt-2 text-xs font-semibold">Loading gift cards...</p>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <Gift className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-xs font-semibold text-slate-700">No gift cards found</p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {search || statusFilter !== "All"
                ? "Try adjusting your search or status filter"
                : "Create your first gift card to get started"}
            </p>
          </div>
        ) : (
          filteredCards.map((card) => {
            const initial = Math.max(0, Number(card.initialAmount || 0));
            const isCopied = copiedCode === card.code;
            return (
              <div
                key={card._id}
                onClick={() => void handleView(card)}
                className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-3 shadow-2xs space-y-2 transition hover:border-slate-300 cursor-pointer"
              >
                {/* Top Row: Code chip + Status + Action buttons */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    {/* Monospace Code Pill */}
                    <button
                      type="button"
                      onClick={(e) => void handleCopyCode(card.code, e)}
                      className="inline-flex items-center gap-1 rounded-lg border border-dashed border-violet-300 bg-violet-50/70 px-2 py-0.5 font-mono text-[11px] font-bold text-violet-800 hover:bg-violet-100 transition active:scale-95"
                      title="Copy code"
                    >
                      <span>{card.code}</span>
                      {isCopied ? (
                        <Check size={11} className="text-emerald-600" />
                      ) : (
                        <Copy size={11} className="text-violet-500" />
                      )}
                    </button>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        card.status === "Active"
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                          : card.status === "Used"
                          ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20"
                          : card.status === "Expired"
                          ? "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20"
                          : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-600/20"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          card.status === "Active"
                            ? "bg-emerald-500"
                            : card.status === "Used"
                            ? "bg-blue-500"
                            : card.status === "Expired"
                            ? "bg-rose-500"
                            : "bg-slate-400"
                        }`}
                      />
                      {card.status}
                    </span>

                    {card.isShared && (
                      <span
                        className="inline-flex items-center rounded-full bg-slate-100 p-0.5 text-slate-500"
                        title="Shared"
                      >
                        <Share2 size={11} />
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-0.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => void handleView(card)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                      title="View Details"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShareCard(card)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                      title="Share"
                    >
                      <Share2 size={15} />
                    </button>
                    {canUpdate && (
                      <button
                        type="button"
                        onClick={() => openEdit(card)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(card)}
                        className="rounded-lg p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Recipient / Name */}
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug truncate">
                    {card.name || "Gift Card"}
                  </h3>
                </div>

                <div className="rounded-xl bg-slate-50/80 p-2 border border-slate-100 text-xs">
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-slate-600 block">
                        Amount
                      </span>
                      <span className="text-base sm:text-lg font-extrabold text-slate-900 tabular-nums">
                        ₹{initial.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold uppercase text-slate-500">
                      One-time use
                    </span>
                  </div>
                </div>

                {/* Footer: Created By & Expiry */}
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-600 pt-0.5">
                  <span className="truncate max-w-[140px]">
                    {card.createdBy ? `By: ${card.createdBy}` : "—"}
                  </span>
                  <span className="font-medium shrink-0">
                    Exp: {formatExpiryDate(card.expiryDate)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

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
        onShare={canUpdate ? handleShareFromView : undefined}
      />
      <ShareGiftCardModal
        open={Boolean(shareCard)}
        card={shareCard}
        onClose={() => setShareCard(null)}
        onShareChange={handleShareChange}
      />
    </div>
  );
};

export default GiftCard;

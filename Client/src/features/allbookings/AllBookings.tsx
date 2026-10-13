import { useEffect, useMemo, useRef, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
import {
  ClipboardList,
  Clock,
  Eye,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";
import CheckoutModal from "@/features/sales/components/invoice/Modal/CheckoutModal";
import StaffVerifyModal from "@/features/sales/components/invoice/Modal/StaffVerifyModal";
import { roundPayable } from "@/features/sales/utils/paymentRoundOff";
import CreateBookingDetailsModal, {
  type BookingFormPayload,
} from "@/features/spacebook/modal/CreateBookingDetailsModal";
import {
  handleCreateAllBooking,
  handleDeleteAllBooking,
  handleGetAllBookings,
  handleUpdateAllBooking,
  type AllBookingRow,
  type SpaceBookingPayload,
  type SpaceBookingStatus,
  type VerifiedStaff,
} from "@/services/apiClient";

type IncludesFilter = "All" | "Space" | "Services" | "Food";

const STATUS_OPTIONS = [
  "All",
  "Upcoming",
  "Ongoing",
  "Draft",
  "Expired",
  "Cancelled",
] as const;

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const apiErrorMessage = (err: unknown, fallback: string) => {
  if (
    err &&
    typeof err === "object" &&
    "response" in err &&
    (err as { response?: { data?: { message?: string } } }).response?.data
      ?.message
  ) {
    return String(
      (err as { response: { data: { message: string } } }).response.data.message,
    );
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
};

const statusBadge = (status?: string) => {
  const value = status || "—";
  const styles: Record<string, string> = {
    Ongoing: "border-emerald-300/80 bg-emerald-50 text-emerald-800",
    Upcoming: "border-blue-300/80 bg-blue-50 text-blue-800",
    Draft: "border-amber-300/80 bg-amber-50 text-amber-800",
    Final: "border-emerald-300/80 bg-emerald-50 text-emerald-800",
    Expired: "border-slate-300 bg-slate-100 text-slate-600",
    Cancelled: "border-rose-300/80 bg-rose-50 text-rose-700",
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
        styles[value] || "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {value}
    </span>
  );
};

function toInitialBooking(row: AllBookingRow): SpaceBookingPayload {
  return {
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    spaceId: row.spaceId || "",
    bookingDate: row.bookingDate || "",
    startTime: row.startTime || "09:00",
    endTime: row.endTime || "12:00",
    status: (row.status as SpaceBookingStatus) || "Draft",
    notes: row.notes || "",
    spaceQty: row.spaceQty,
    spaceName: row.spaceName,
    selectedServices: (row.services || []).map((service) => ({
      label: service.label,
      price: service.price,
      qty: service.qty,
    })),
    summarySnapshot: {
      foods: (row.foods || []).map((food) => ({
        foodId: food.refId,
        label: food.label,
        price: food.price,
        qty: food.qty,
        unit: food.unit,
      })),
    },
  } as SpaceBookingPayload;
}

const paymentLabel = (status?: string) => {
  if (!status) return "—";
  if (status === "full") return "Paid";
  if (status === "partial") return "Partial";
  if (status === "due") return "Due";
  return status;
};

const DetailLine = ({ label, value }: { label: string; value?: string }) => {
  if (!value) return null;
  return (
    <div className="text-left">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
};

export default function AllBookings() {
  const [rows, setRows] = useState<AllBookingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AllBookingRow | null>(null);
  const [editor, setEditor] = useState<AllBookingRow | null | undefined>(undefined);
  const [savingBooking, setSavingBooking] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState<BookingFormPayload | null>(null);
  const [openPin, setOpenPin] = useState(false);
  const [openCheckout, setOpenCheckout] = useState(false);
  const [checkoutSourceId, setCheckoutSourceId] = useState<string | null>(null);
  const [verifiedStaff, setVerifiedStaff] = useState<VerifiedStaff | null>(null);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [includesFilter, setIncludesFilter] = useState<IncludesFilter>("All");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [reloadKey, setReloadKey] = useState(0);
  const searchRef = useRef("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchInput.trim();
      if (next === searchRef.current) return;
      searchRef.current = next;
      setSearch(next);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    handleGetAllBookings(
      {
        search,
        includes: includesFilter,
        status: statusFilter,
        fromDate,
        toDate,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      },
      controller.signal,
    )
      .then((res) => {
        setRows(Array.isArray(res?.bookings) ? res.bookings : []);
        setTotal(Number(res?.pagination?.total) || 0);
      })
      .catch((err: unknown) => {
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code?: string }).code === "ERR_CANCELED"
        ) {
          return;
        }
        setRows([]);
        setTotal(0);
        setError(apiErrorMessage(err, "Could not load bookings."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    search,
    includesFilter,
    statusFilter,
    fromDate,
    toDate,
    pagination.pageIndex,
    pagination.pageSize,
    reloadKey,
  ]);

  const resetPage = () => setPagination((prev) => ({ ...prev, pageIndex: 0 }));

  const persistBooking = async (
    payload: BookingFormPayload,
    status: string,
    sourceId?: string | null,
    paymentStatus?: string,
  ) => {
    const body = {
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      customerId: payload.customerId,
      spaceId: payload.spaceId,
      bookingDate: payload.bookingDate,
      startTime: payload.startTime,
      endTime: payload.endTime,
      spaceQty: payload.spaceQty,
      services: (payload.selectedServices || []).map((service) => ({
        label: service.label,
        qty: service.qty,
      })),
      foods: (payload.foods || []).map((food) => ({
        foodId: food.foodId,
        qty: food.qty,
      })),
      notes: payload.notes,
      status,
      ...(paymentStatus ? { paymentStatus } : {}),
    };
    if (sourceId) await handleUpdateAllBooking(sourceId, body);
    else await handleCreateAllBooking(body);
  };

  const saveBooking = async (
    payload: BookingFormPayload,
    status: string,
    sourceId?: string | null,
  ) => {
    setSavingBooking(true);
    try {
      await persistBooking(payload, status, sourceId);
      toast.success(status === "Draft" ? "Draft saved." : "Booking saved.");
      setEditor(undefined);
      setPendingCheckout(null);
      setCheckoutSourceId(null);
      setReloadKey((key) => key + 1);
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, "Could not save the booking."));
    } finally {
      setSavingBooking(false);
    }
  };

  const beginCheckout = (payload: BookingFormPayload) => {
    setCheckoutSourceId(editor?.sourceId || checkoutSourceId);
    setPendingCheckout(payload);
    setVerifiedStaff(null);
    setVerifiedAt(null);
    setOpenCheckout(false);
    setEditor(undefined);
    setOpenPin(true);
  };

  const checkoutGrandTotal = useMemo(() => {
    const raw = Math.max(0, Number(pendingCheckout?.lineTotal ?? 0));
    return roundPayable(raw).payable;
  }, [pendingCheckout]);

  const checkoutItems = useMemo(() => {
    if (!pendingCheckout) return [];
    const services = pendingCheckout.selectedServices || [];
    const foods = pendingCheckout.foods || [];
    const servicesTotal = services.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0),
      0,
    );
    const snapshotCharges = Number(pendingCheckout.summarySnapshot?.spaceCharges);
    const spaceCharges = Number.isFinite(snapshotCharges)
      ? Math.max(0, snapshotCharges)
      : Math.max(0, Number(pendingCheckout.subTotal ?? 0) - servicesTotal);
    const items: Array<{
      id: number;
      name: string;
      qty: number;
      price: number;
      discount: number;
      category: string;
      lineCategory: string;
      sourceType: string;
    }> = [];
    if (pendingCheckout.spaceId || spaceCharges > 0) {
      const hours = Math.max(0, Number(pendingCheckout.durationHours ?? 0));
      items.push({
        id: 1,
        name: [
          pendingCheckout.spaceName || "Space",
          hours > 0 ? `· ${hours}h` : "",
        ]
          .filter(Boolean)
          .join(" "),
        qty: 1,
        price: spaceCharges,
        discount: 0,
        category: "space",
        lineCategory: "space",
        sourceType: "space",
      });
    }
    services.forEach((service, index) => {
      items.push({
        id: index + 2,
        name: service.label,
        qty: Math.max(1, Number(service.qty) || 1),
        price: Math.max(0, Number(service.price) || 0),
        discount: 0,
        category: "service",
        lineCategory: "service",
        sourceType: "service",
      });
    });
    foods.forEach((food, index) => {
      items.push({
        id: services.length + index + 2,
        name: food.label,
        qty: Math.max(1, Number(food.qty) || 1),
        price: Math.max(0, Number(food.price) || 0),
        discount: 0,
        category: "food",
        lineCategory: "food",
        sourceType: "food",
      });
    });
    return items;
  }, [pendingCheckout]);

  const confirmCheckout = async (payment: {
    paymentStatus: string;
    customerName: string;
    customerPhone: string;
    notes: string;
    customerId?: string | null;
  }) => {
    if (!pendingCheckout) {
      toast.error("Booking details were lost. Please try again.");
      return;
    }
    const status =
      !pendingCheckout.status || pendingCheckout.status === "Draft"
        ? "Upcoming"
        : pendingCheckout.status;
    const notes = [pendingCheckout.notes, payment.notes]
      .map((value) => String(value || "").trim())
      .filter((value, index, list) => value && list.indexOf(value) === index)
      .join("\n");
    setSavingBooking(true);
    try {
      await persistBooking(
        {
          ...pendingCheckout,
          customerName: payment.customerName?.trim() || pendingCheckout.customerName,
          customerPhone:
            payment.customerPhone?.trim() || pendingCheckout.customerPhone,
          customerId: payment.customerId || pendingCheckout.customerId,
          notes,
        },
        status,
        checkoutSourceId,
        payment.paymentStatus,
      );
    } finally {
      setSavingBooking(false);
    }
    setOpenCheckout(false);
    setPendingCheckout(null);
    setCheckoutSourceId(null);
    setEditor(undefined);
    setReloadKey((key) => key + 1);
    await Swal.fire("Success", "Booking saved.", "success");
  };

  const onDelete = async (row: AllBookingRow) => {
    const result = await Swal.fire({
      title: "Delete this booking?",
      text: `${row.customerName || "This customer"} · ${row.bookingCode}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      confirmButtonText: "Delete",
    });
    if (!result.isConfirmed) return;
    try {
      await handleDeleteAllBooking(row.sourceId);
      toast.success("Booking deleted.");
      if (selected?.id === row.id) setSelected(null);
      setReloadKey((key) => key + 1);
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, "Failed to delete space booking."));
    }
  };

  const columns = useMemo<MRT_ColumnDef<AllBookingRow>[]>(
    () => [
      {
        accessorKey: "bookingCode",
        header: "Booking ID",
        size: 120,
        Cell: ({ cell }) => (
          <span className="font-mono text-xs font-bold text-slate-700">
            {cell.getValue<string>() || "—"}
          </span>
        ),
      },
      {
        accessorKey: "customerName",
        header: "Customer",
        size: 180,
        Cell: ({ row }) => (
          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-semibold text-slate-800">
              {row.original.customerName || "—"}
            </p>
            {row.original.customer?.membershipType ? (
              <p className="text-[11px] font-medium text-slate-400">
                {row.original.customer.membershipType}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "contact",
        header: "Contact",
        size: 170,
        Cell: ({ row }) => (
          <div className="text-left text-xs text-slate-600">
            <p className="flex items-center gap-1 font-semibold">
              <Phone size={12} className="text-slate-400" />
              {row.original.customerPhone || "—"}
            </p>
            {row.original.customerEmail ? (
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                {row.original.customerEmail}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "spaceDetails",
        header: "Space",
        size: 200,
        Cell: ({ row }) => (
          <span className="block max-w-[220px] truncate text-left text-xs font-medium text-slate-700">
            {row.original.spaceDetails || "—"}
          </span>
        ),
      },
      {
        id: "serviceDetails",
        header: "Services",
        size: 180,
        Cell: ({ row }) => (
          <span className="block max-w-[200px] truncate text-left text-xs font-medium text-slate-700">
            {row.original.serviceDetails || "—"}
          </span>
        ),
      },
      {
        id: "foodDetails",
        header: "Food",
        size: 220,
        Cell: ({ row }) => (
          <span className="block max-w-[240px] truncate text-left text-xs font-medium text-slate-700">
            {row.original.foodDetails || "—"}
          </span>
        ),
      },
      {
        id: "bookingDate",
        header: "Booking Date",
        size: 130,
        Cell: ({ row }) => (
          <span className="text-xs font-semibold text-slate-700">
            {formatDate(row.original.bookingDate)}
          </span>
        ),
      },
      {
        id: "time",
        header: "Time",
        size: 160,
        Cell: ({ row }) =>
          row.original.timeLabel ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
              <Clock size={12} className="text-slate-400" />
              {row.original.timeLabel}
            </span>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          ),
      },
      {
        id: "quantity",
        header: "Qty / Guests",
        size: 120,
        Cell: ({ row }) => (
          <span className="text-xs font-semibold text-slate-700">
            {[
              row.original.spaceDetails ? `Space × ${row.original.spaceQty || 1}` : "",
              row.original.serviceDetails ? "Services" : "",
              row.original.foodDetails ? "Food" : "",
            ].filter(Boolean).join(" · ") || "—"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 120,
        Cell: ({ cell }) => statusBadge(cell.getValue<string>()),
      },
      {
        id: "payment",
        header: "Payment",
        size: 110,
        Cell: ({ row }) => (
          <span className="text-xs font-semibold text-slate-700">
            {paymentLabel(row.original.paymentStatus)}
          </span>
        ),
      },
      {
        id: "createdAt",
        header: "Created At",
        size: 160,
        Cell: ({ row }) => (
          <span className="text-xs text-slate-600">
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: rows,
    manualPagination: true,
    rowCount: total,
    onPaginationChange: setPagination,
    state: { isLoading: loading, pagination },
    enableGlobalFilter: false,
    enableTopToolbar: false,
    enableBottomToolbar: true,
    enableColumnActions: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enableHiding: false,
    enableSorting: false,
    enableRowActions: true,
    positionActionsColumn: "last",
    displayColumnDefOptions: {
      "mrt-row-actions": {
        header: "Actions",
        size: 120,
        muiTableHeadCellProps: { align: "center" },
        muiTableBodyCellProps: { align: "center" },
      },
    },
    renderRowActions: ({ row }) => {
      const booking = row.original;
      return (
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            title="View details"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
            onClick={() => setSelected(booking)}
          >
            <Eye size={15} />
          </button>
          <Can permission={PERMISSIONS.SPACE_BOOKING_UPDATE}>
            <button
              type="button"
              title="Edit booking"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
              onClick={() => {
                setPendingCheckout(null);
                setCheckoutSourceId(null);
                setEditor(booking);
              }}
            >
              <Pencil size={15} />
            </button>
          </Can>
          <Can permission={PERMISSIONS.SPACE_BOOKING_DELETE}>
            <button
              type="button"
              title="Delete booking"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
              onClick={() => void onDelete(booking)}
            >
              <Trash2 size={15} />
            </button>
          </Can>
        </div>
      );
    },
    renderEmptyRowsFallback: () => (
      <div className="px-4 py-16 text-center text-sm font-medium text-slate-500">
        {loading ? "Loading bookings…" : error || "No bookings match these filters."}
      </div>
    ),
    muiTablePaperProps: {
      sx: { border: "none", boxShadow: "none", backgroundColor: "transparent" },
    },
    muiTableHeadCellProps: {
      sx: {
        fontWeight: 700,
        fontSize: "11px",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "#475569",
        backgroundColor: "#f8fafc",
        borderBottom: "1px solid #e2e8f0",
        whiteSpace: "nowrap",
      },
    },
    muiTableBodyCellProps: {
      sx: {
        fontSize: "13px",
        color: "#1e293b",
        borderBottom: "1px solid #f1f5f9",
        whiteSpace: "nowrap",
      },
    },
    muiPaginationProps: {
      color: "primary",
      shape: "rounded",
      variant: "outlined",
      size: "small",
      showRowsPerPage: true,
      rowsPerPageOptions: [10, 20, 50],
    },
  });

  return (
    <div className="w-full space-y-5 p-4 sm:p-6 lg:p-8">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
          <ClipboardList size={14} />
          <span>Booking</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            All Bookings
          </h1>
          <span className="rounded-full border border-indigo-200/60 bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
            {total} Total
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          Combined bookings. Space, services, and food can each be left out.
        </p>
      </div>
      <div className="flex justify-end">
        <Can permission={PERMISSIONS.SPACE_BOOKING_CREATE}>
          <button
            type="button"
            onClick={() => {
              setPendingCheckout(null);
              setCheckoutSourceId(null);
              setEditor(null);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
          >
            <Plus size={16} />
            Create Bookings
          </button>
        </Can>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search customer, phone, space, or food"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {(["All", "Space", "Services", "Food"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setIncludesFilter(type);
                  resetPage();
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                  includesFilter === type
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="text-left text-xs font-semibold text-slate-500">
            Status
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as (typeof STATUS_OPTIONS)[number]);
                resetPage();
              }}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 sm:w-44"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="text-left text-xs font-semibold text-slate-500">
            From
            <input
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value);
                resetPage();
              }}
              className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 sm:w-40"
            />
          </label>
          <label className="text-left text-xs font-semibold text-slate-500">
            To
            <input
              type="date"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value);
                resetPage();
              }}
              className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 sm:w-40"
            />
          </label>
        </div>
        {error ? (
          <p className="text-left text-sm font-semibold text-rose-600">{error}</p>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <MaterialReactTable table={table} />
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Close booking details"
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelected(null)}
          />
          <div className="relative z-10 max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="text-left">
                <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                  Combined booking
                </p>
                <h2 className="text-xl font-bold text-slate-900">{selected.bookingCode}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailLine label="Customer" value={selected.customerName} />
              <DetailLine label="Phone" value={selected.customerPhone} />
              <DetailLine label="Email" value={selected.customerEmail} />
              <DetailLine
                label="Membership"
                value={selected.customer?.membershipType}
              />
              <DetailLine label="Space" value={selected.spaceDetails} />
              <DetailLine label="Services" value={selected.serviceDetails} />
              <DetailLine label="Food" value={selected.foodDetails} />
              <DetailLine label="Date" value={formatDate(selected.bookingDate)} />
              <DetailLine label="Time" value={selected.timeLabel} />
              <DetailLine
                label="Membership discount"
                value={
                  selected.membershipDiscount
                    ? `₹${Number(selected.membershipDiscount).toLocaleString("en-IN")}`
                    : ""
                }
              />
              <DetailLine label="Status" value={selected.status} />
              <DetailLine label="Payment" value={paymentLabel(selected.paymentStatus)} />
              <DetailLine
                label="Amount"
                value={
                  selected.grandTotal
                    ? `₹${Number(selected.grandTotal).toLocaleString("en-IN")}`
                    : ""
                }
              />
              <DetailLine label="Created" value={formatDateTime(selected.createdAt)} />
            </div>
            {selected.notes ? (
              <p className="mt-4 text-left text-sm text-slate-600">{selected.notes}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <CreateBookingDetailsModal
        isOpen={editor !== undefined}
        initialBooking={editor ? toInitialBooking(editor) : null}
        draftValues={editor === null ? pendingCheckout : null}
        submitting={savingBooking}
        showFood
        onClose={() => {
          if (openPin || openCheckout) return;
          setEditor(undefined);
          setPendingCheckout(null);
          setCheckoutSourceId(null);
        }}
        onSaveDraft={(payload) =>
          saveBooking(payload, "Draft", editor?.sourceId || checkoutSourceId)
        }
        onSubmit={(payload) => {
          const checkingOut = !editor || editor.status === "Draft";
          if (checkingOut) {
            beginCheckout(payload);
            return;
          }
          void saveBooking(payload, payload.status || "Upcoming", editor.sourceId);
        }}
      />

      <StaffVerifyModal
        open={openPin}
        onClose={() => {
          setOpenPin(false);
          if (pendingCheckout) setEditor(null);
        }}
        onVerified={({ staff, verifiedAt: at }) => {
          setVerifiedStaff(staff);
          setVerifiedAt(at);
          setOpenPin(false);
          setEditor(undefined);
          setOpenCheckout(true);
        }}
      />

      <CheckoutModal
        open={openCheckout}
        onClose={() => {
          if (savingBooking) return;
          setOpenCheckout(false);
          setVerifiedStaff(null);
          setVerifiedAt(null);
          if (pendingCheckout) setEditor(null);
        }}
        initialVerifiedStaff={verifiedStaff}
        initialVerifiedAt={verifiedAt}
        grandTotal={checkoutGrandTotal}
        items={checkoutItems}
        initialCustomerName={pendingCheckout?.customerName || ""}
        initialCustomerPhone={pendingCheckout?.customerPhone || ""}
        initialCustomerId={pendingCheckout?.customerId || undefined}
        initialMembership={pendingCheckout?.membershipType || undefined}
        initialMembershipPlanId={pendingCheckout?.membershipPlanId || undefined}
        initialMembershipDiscount={pendingCheckout?.discountAmount || 0}
        initialCashbackTotal={pendingCheckout?.cashbackAmount || 0}
        lockMembershipDiscount
        disableCashback
        couponApplicableContext="all"
        initialNotes={
          pendingCheckout
            ? [
                pendingCheckout.notes,
                pendingCheckout.spaceName ? `Space: ${pendingCheckout.spaceName}` : "",
                pendingCheckout.bookingDate
                  ? `${pendingCheckout.bookingDate} ${pendingCheckout.startTime}-${pendingCheckout.endTime}`
                  : "",
              ]
                .filter(Boolean)
                .join(" · ")
            : ""
        }
        onConfirmPayment={confirmCheckout}
      />
    </div>
  );
}

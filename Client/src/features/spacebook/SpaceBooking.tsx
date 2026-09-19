import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
import {
  Eye,
  Pencil,
  Trash2,
  X,
  Plus,
  Search,
  Calendar,
  Clock,
  Phone,
  Building2,
  Layers,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  PhoneCall,
  MailCheck,
  Loader2,
} from "lucide-react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import CreateBookingDetailsModal, {
  type BookingFormPayload,
} from "./modal/CreateBookingDetailsModal";
import CheckoutModal from "@/features/sales/components/invoice/Modal/CheckoutModal";
import {
  handleCreateInvoice,
  handleCreateSpaceBooking,
  handleDeleteSpaceBooking,
  handleGetSpaceBookings,
  handleUpdateSpaceBooking,
  type SpaceBookingPayload,
  type SpaceBookingStatus,
} from "@/services/apiClient";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";
import { useAppSelector } from "@/store/hooks";
import { printThermalReceipt } from "@/utils/printUtils";
import { roundPayable } from "@/features/sales/utils/paymentRoundOff";

type BookingStatusFilter = "All" | SpaceBookingStatus;

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700 border-violet-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-rose-100 text-rose-700 border-rose-200",
];

const getInitials = (name: string) => {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const formatDateDisplay = (value?: string | Date | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const bookingId = (b: SpaceBookingPayload) =>
  String(b.id || b._id || "");

const spaceDisplayName = (b: SpaceBookingPayload) => {
  const name = b.space?.name || b.spaceName || "—";
  const day = b.space?.day ? ` · ${b.space.day}` : "";
  return `${name}${day}`;
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
      (err as { response: { data: { message: string } } }).response.data
        .message,
    );
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
};

const SpaceBook = () => {
  const staff = useAppSelector((state) => state.user);
  const [data, setData] = useState<SpaceBookingPayload[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<BookingStatusFilter>("All");
  const [spaceFilter, setSpaceFilter] = useState<string>("All");

  const [selectedBooking, setSelectedBooking] =
    useState<SpaceBookingPayload | null>(null);
  const [editingBooking, setEditingBooking] =
    useState<SpaceBookingPayload | null>(null);
  const [deleteBooking, setDeleteBooking] =
    useState<SpaceBookingPayload | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  /** Pending booking details waiting for CheckoutModal payment. */
  const [pendingCheckout, setPendingCheckout] =
    useState<BookingFormPayload | null>(null);
  const [openCheckout, setOpenCheckout] = useState(false);

  const fetchBookings = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const res = await handleGetSpaceBookings({}, signal);
      setData(Array.isArray(res?.bookings) ? res.bookings : []);
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: string }).code === "ERR_CANCELED"
      ) {
        return;
      }
      setData([]);
      toast.error(apiErrorMessage(err, "Failed to load space bookings."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchBookings(controller.signal);

    // Periodically sync statuses with current time every 30 seconds
    const interval = setInterval(() => {
      void fetchBookings();
    }, 30000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [fetchBookings]);

  const metrics = useMemo(() => {
    const total = data.length;
    const ongoing = data.filter((b) => b.status === "Ongoing").length;
    const upcoming = data.filter((b) => b.status === "Upcoming").length;
    const expired = data.filter((b) => b.status === "Expired").length;
    const cancelled = data.filter((b) => b.status === "Cancelled").length;
    return { total, ongoing, upcoming, expired, cancelled };
  }, [data]);

  const uniqueSpaces = useMemo(() => {
    const map = new Map<string, string>();
    data.forEach((b) => {
      const id = String(b.spaceId || "");
      if (!id) return;
      map.set(id, spaceDisplayName(b));
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((b) => {
      if (statusFilter !== "All" && b.status !== statusFilter) return false;
      if (spaceFilter !== "All" && String(b.spaceId) !== spaceFilter)
        return false;

      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchesName = (b.customerName || "")
          .toLowerCase()
          .includes(query);
        const matchesPhone = (b.customerPhone || "").includes(query);
        const matchesEmail = (b.customerEmail || "")
          .toLowerCase()
          .includes(query);
        const matchesSpace = spaceDisplayName(b).toLowerCase().includes(query);
        return (
          matchesName || matchesPhone || matchesEmail || matchesSpace
        );
      }
      return true;
    });
  }, [data, search, statusFilter, spaceFilter]);

  const hasActiveFilters =
    statusFilter !== "All" ||
    spaceFilter !== "All" ||
    Boolean(search.trim());

  const handleResetFilters = () => {
    setStatusFilter("All");
    setSpaceFilter("All");
    setSearch("");
  };

  const handleCreate = async (payload: BookingFormPayload) => {
    // Open shared POS-style checkout (PIN → summary → payment / coupon).
    setPendingCheckout(payload);
    setIsCreateModalOpen(false);
    setOpenCheckout(true);
  };

  const checkoutGrandTotal = useMemo(() => {
    const raw = Math.max(0, Number(pendingCheckout?.lineTotal ?? 0));
    return roundPayable(raw).payable;
  }, [pendingCheckout]);

  const checkoutItems = useMemo(() => {
    if (!pendingCheckout) return [];
    const hours = Math.max(0, Number(pendingCheckout.durationHours ?? 0));
    const unit = Math.max(0, Number(pendingCheckout.unitPrice ?? 0));
    const nameParts = [
      pendingCheckout.spaceName || "Space Booking",
      pendingCheckout.spaceDay ? `(${pendingCheckout.spaceDay})` : "",
      hours > 0 ? `· ${hours}h` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return [
      {
        id: 1,
        name: nameParts,
        qty: 1,
        price: Math.max(0, Number(pendingCheckout.lineTotal ?? unit * hours)),
        discount: 0,
        category: "space",
        lineCategory: "space",
        sourceType: "space",
      },
    ];
  }, [pendingCheckout]);

  const handleConfirmCheckoutPayment = async (payment: {
    mode: string;
    paymentStatus: "full" | "partial";
    paymentBreakdown: {
      cash: number;
      upi: number;
      card: number;
      wallet: number;
      paidAmount: number;
      dueAmount: number;
      changeAmount: number;
    };
    paidAmount: number;
    dueAmount: number;
    changeAmount: number;
    finalAmount: number;
    customerName: string;
    customerPhone: string;
    notes: string;
    coupon?: { code: string; discountAmount: number } | null;
    referral?: {
      code: string;
      discountAmount: number;
      inviterName?: string;
      label?: string;
    } | null;
    cashbackTotal: number;
    membershipDiscount: number;
    customerId?: string | null;
    invoiceBy?: {
      staffId: string;
      staffName: string;
      employeeId: string;
      email?: string;
    } | null;
    verifiedAt?: string | null;
  }) => {
    if (!pendingCheckout) {
      toast.error("Booking details were lost. Please try again.");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const bookingNotes = [
      pendingCheckout.notes,
      `Space booking · ${pendingCheckout.spaceName || "Space"}`,
      `${formatDateDisplay(pendingCheckout.bookingDate)} · ${pendingCheckout.startTime}-${pendingCheckout.endTime}`,
      payment.notes,
    ]
      .map((v) => String(v || "").trim())
      .filter(Boolean)
      .join(" | ");

    const lineTotal = Math.max(0, Number(pendingCheckout.lineTotal ?? 0));
    const couponDiscount = Number(payment.coupon?.discountAmount ?? 0);
    const referralDiscount = Number(payment.referral?.discountAmount ?? 0);
    const membershipDiscount = Number(payment.membershipDiscount ?? 0);
    const totalDiscount = couponDiscount + referralDiscount + membershipDiscount;

    try {
      setSaving(true);

      const invoiceRes = await handleCreateInvoice({
        customerName:
          payment.customerName?.trim() ||
          pendingCheckout.customerName ||
          "Walk-in Customer",
        customerPhone:
          payment.customerPhone?.trim() || pendingCheckout.customerPhone || "",
        customerId: payment.customerId || pendingCheckout.customerId || undefined,
        invoiceDate: today,
        dueDate: today,
        salesPersonName:
          payment.invoiceBy?.staffName?.trim() ||
          staff.m_staff_name ||
          "Space Booking",
        invoiceBy: payment.invoiceBy
          ? {
              staffId: payment.invoiceBy.staffId,
              staffName: payment.invoiceBy.staffName,
              employeeId: payment.invoiceBy.employeeId,
              email: payment.invoiceBy.email,
            }
          : null,
        verifiedAt: payment.verifiedAt || null,
        notes: bookingNotes || "Space Booking",
        items: [
          {
            productName: checkoutItems[0]?.name || "Space Booking",
            qty: 1,
            unitPrice: lineTotal,
            discount: membershipDiscount,
            category: "space",
          },
        ],
        subTotal: lineTotal,
        discountTotal: totalDiscount,
        grandTotal: payment.finalAmount,
        coupon: payment.coupon ?? null,
        referral: payment.referral ?? null,
        status: "final",
        mode: payment.mode,
        paymentStatus: payment.paymentStatus,
        paymentBreakdown: payment.paymentBreakdown,
        pendingAmount: payment.paymentBreakdown.dueAmount,
        cashbackTotal: payment.cashbackTotal,
        membershipDiscount: payment.membershipDiscount,
        membershipType: pendingCheckout.membershipType || undefined,
        activityType: "Space Booking",
        createdBy: {
          m_staff_id: staff.m_staff_id,
          m_staff_name: staff.m_staff_name,
          m_staff_email: staff.m_staff_email,
        },
      } as Parameters<typeof handleCreateInvoice>[0]);

      const invoice = invoiceRes?.invoice;
      const invoiceCode =
        invoice?.invoiceCode ||
        invoice?.invoiceNumber ||
        String(invoice?._id || "");
      const invoiceId = invoice?._id ? String(invoice._id) : null;

      await handleCreateSpaceBooking({
        customerName: payment.customerName?.trim() || pendingCheckout.customerName,
        customerPhone: payment.customerPhone?.trim() || pendingCheckout.customerPhone,
        customerEmail: pendingCheckout.customerEmail,
        spaceId: pendingCheckout.spaceId,
        bookingDate: pendingCheckout.bookingDate,
        startTime: pendingCheckout.startTime,
        endTime: pendingCheckout.endTime,
        status: pendingCheckout.status,
        notes: pendingCheckout.notes,
        invoiceId,
        invoiceCode,
        grandTotal: payment.finalAmount,
        paidAmount: payment.paymentBreakdown.paidAmount,
        dueAmount: payment.paymentBreakdown.dueAmount,
        paymentStatus: payment.paymentStatus,
        paymentMode: payment.mode,
      });

      printThermalReceipt({
        invoiceNo: invoiceCode || "SPACE",
        customerName:
          payment.customerName?.trim() || pendingCheckout.customerName,
        customerPhone:
          payment.customerPhone?.trim() || pendingCheckout.customerPhone,
        items: [
          {
            name: checkoutItems[0]?.name || "Space Booking",
            qty: 1,
            price: lineTotal,
            discount: totalDiscount,
          },
        ],
        totalMRP: lineTotal,
        discountTotal: totalDiscount,
        finalAmount: payment.finalAmount,
        totalDue: payment.paymentBreakdown.dueAmount,
        totalQty: 1,
      });

      setOpenCheckout(false);
      setPendingCheckout(null);
      await fetchBookings();
      await Swal.fire(
        "Success",
        `Space booking confirmed${invoiceCode ? ` · Invoice ${invoiceCode}` : ""}.`,
        "success",
      );
    } catch (err: unknown) {
      Swal.fire(
        "Checkout failed",
        apiErrorMessage(err, "Could not complete space booking checkout."),
        "error",
      );
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (payload: BookingFormPayload) => {
    if (!editingBooking) return;
    const id = bookingId(editingBooking);
    if (!id) {
      toast.error("Invalid booking id.");
      return;
    }
    try {
      setSaving(true);
      await handleUpdateSpaceBooking(id, payload);
      toast.success(`Booking of ${payload.customerName} updated successfully!`);
      setEditingBooking(null);
      setSelectedBooking(null);
      await fetchBookings();
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, "Failed to update space booking."));
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteBooking) return;
    const id = bookingId(deleteBooking);
    if (!id) {
      toast.error("Invalid booking id.");
      return;
    }
    try {
      setDeleting(true);
      await handleDeleteSpaceBooking(id);
      toast.success(
        `Booking of ${deleteBooking.customerName} deleted successfully!`,
      );
      setDeleteBooking(null);
      if (selectedBooking && bookingId(selectedBooking) === id) {
        setSelectedBooking(null);
      }
      await fetchBookings();
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, "Failed to delete space booking."));
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo<MRT_ColumnDef<SpaceBookingPayload>[]>(
    () => [
      // {
      //   accessorKey: "id",
      //   header: "Booking ID",
      //   size: 110,
      //   Cell: ({ row }) => {
      //     const id = bookingId(row.original);
      //     // return (
      //     //   // <span className="inline-flex items-center justify-center rounded-md border border-slate-200/80 bg-slate-100/90 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600 shadow-2xs">
      //     //   //   #{id.slice(-6).toUpperCase() || "—"}
      //     //   // </span>
      //     // );
      //   },
      // },
      {
        id: "space",
        header: "Space",
        size: 100,
        Cell: ({ row }) => {
          const b = row.original;
          return (
            <div className="flex items-center gap-2.5">
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-slate-800 sm:text-sm">
                  {b.space?.name || b.spaceName || "—"}
                </div>
                {(b.space?.day || b.space?.category) && (
                  <div className="mt-0.5 text-[11px] font-medium text-slate-400">
                    {[b.space?.day, b.space?.category]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "customerName",
        header: "Customer",
        size: 100,
        Cell: ({ row }) => {
          const b = row.original;
          return (
            <div className="flex items-center gap-3 py-1">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-slate-800">
                  {b.customerName}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                  <Phone size={12} className="shrink-0 text-slate-400" />
                  <span className="font-mono">{b.customerPhone}</span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "bookingDate",
        header: "Date",
        size: 100,
        Cell: ({ row }) => (
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs">
           
            <span>{formatDateDisplay(row.original.bookingDate)}</span>
          </div>
        ),
      },
      {
        id: "time",
        header: "Time",
        size: 100,
        Cell: ({ row }) => (
          <div className="flex items-center gap-1.5 pl-0.5 text-xs font-medium text-slate-500">
            <Clock size={12} className="shrink-0 text-slate-400" />
            <span className="font-mono tabular-nums">
              {row.original.bookingTime ||
                `${row.original.startTime} - ${row.original.endTime}`}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 100,
        Cell: ({ cell }) => {
          const status = cell.getValue<SpaceBookingStatus>();
          if (status === "Ongoing") {
            return (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-2xs">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 ring-2 ring-emerald-300/50" />
                Ongoing
              </span>
            );
          }
          if (status === "Upcoming") {
            return (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-300/80 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-blue-500 ring-2 ring-blue-300/50" />
                Upcoming
              </span>
            );
          }
          if (status === "Cancelled") {
            return (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                Cancelled
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              Expired
            </span>
          );
        },
      },
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: filteredData,
    state: { isLoading: loading },
    enableColumnResizing: false,
    enableGlobalFilter: false,
    enableTopToolbar: false,
    enableBottomToolbar: true,
    enableColumnActions: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enableHiding: false,
    enableSorting: true,
    enableRowActions: true,
    positionActionsColumn: "last",
    displayColumnDefOptions: {
      "mrt-row-actions": {
        header: "Actions",
        size: 130,
        minSize: 120,
        muiTableHeadCellProps: { align: "center" },
        muiTableBodyCellProps: { align: "center" },
      },
    },
    renderRowActions: ({ row }) => (
      <div className="flex min-w-max items-center justify-center gap-1.5">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-2xs transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95"
          title="View Details"
          onClick={() => setSelectedBooking(row.original)}
        >
          <Eye size={15} />
        </button>

        <Can permission={PERMISSIONS.SPACE_BOOKING_UPDATE}>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-2xs transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 active:scale-95"
            title="Edit Booking"
            onClick={() => setEditingBooking(row.original)}
          >
            <Pencil size={15} />
          </button>
        </Can>

        <Can permission={PERMISSIONS.SPACE_BOOKING_DELETE}>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-400 shadow-2xs transition-all hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 active:scale-95"
            title="Delete Booking"
            onClick={() => setDeleteBooking(row.original)}
          >
            <Trash2 size={15} />
          </button>
        </Can>
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
        {loading ? (
          <>
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm text-slate-500">Loading bookings…</p>
          </>
        ) : (
          <>
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-500 shadow-xs">
              <Calendar size={32} />
            </div>
            <h4 className="text-base font-bold text-slate-800">
              No bookings found
            </h4>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {hasActiveFilters
                ? "No bookings match your current search or filter criteria."
                : "No space bookings yet. Click Add Booking to create one."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
              >
                <RotateCcw size={13} />
                Reset all filters
              </button>
            )}
          </>
        )}
      </div>
    ),
    muiTableContainerProps: {
      sx: {
        maxHeight: "calc(100vh - 360px)",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      },
    },
    muiTablePaperProps: {
      elevation: 0,
      sx: {
        border: "none",
        borderRadius: "0",
        boxShadow: "none",
        backgroundColor: "transparent",
      },
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
        padding: "14px 18px",
        whiteSpace: "nowrap",
      },
    },
    muiTableBodyCellProps: {
      sx: {
        fontSize: "13px",
        color: "#1e293b",
        borderBottom: "1px solid #f1f5f9",
        padding: "13px 18px",
        verticalAlign: "middle",
        whiteSpace: "nowrap",
      },
    },
    muiTableBodyRowProps: {
      sx: {
        transition: "background-color 0.15s ease",
        "&:hover": { backgroundColor: "#f8fafc" },
      },
    },
    muiBottomToolbarProps: {
      sx: {
        backgroundColor: "#ffffff",
        borderTop: "1px solid #e2e8f0",
        minHeight: "56px",
        display: "flex",
        alignItems: "center",
      },
    },
    muiPaginationProps: {
      color: "primary",
      shape: "rounded",
      variant: "outlined",
      size: "small",
      showRowsPerPage: true,
      rowsPerPageOptions: [5, 10, 20, 50],
    },
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
      density: "comfortable",
    },
  });

  return (
    <div className="w-full space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
            <Building2 size={14} />
            <span>Workspace & Facility Management</span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Space Bookings
            </h1>
            <span className="rounded-full border border-indigo-200/60 bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
              {data.length} Total
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Manage reservations linked directly to catalogue spaces.
          </p>
        </div>

        <Can permission={PERMISSIONS.SPACE_BOOKING_CREATE}>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-100 transition hover:from-indigo-700 hover:to-violet-700 active:scale-[0.98] sm:self-center"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Add Booking</span>
          </button>
        </Can>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter("All")}
          className={`flex items-start justify-between rounded-2xl border p-4 text-left transition ${
            statusFilter === "All"
              ? "border-indigo-400 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500/20"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div>
            <span className="text-xs font-medium text-slate-500">
              Total Reservations
            </span>
            <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
              {metrics.total}
            </div>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Building2 size={20} />
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("Ongoing")}
          className={`flex items-start justify-between rounded-2xl border p-4 text-left transition ${
            statusFilter === "Ongoing"
              ? "border-emerald-400 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/20"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div>
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Ongoing Now
            </span>
            <div className="mt-1 text-2xl font-bold tabular-nums text-emerald-700">
              {metrics.ongoing}
            </div>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Clock size={20} />
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("Upcoming")}
          className={`flex items-start justify-between rounded-2xl border p-4 text-left transition ${
            statusFilter === "Upcoming"
              ? "border-blue-400 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div>
            <span className="text-xs font-medium text-slate-500">Upcoming</span>
            <div className="mt-1 text-2xl font-bold tabular-nums text-blue-700">
              {metrics.upcoming}
            </div>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Calendar size={20} />
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("Expired")}
          className={`flex items-start justify-between rounded-2xl border p-4 text-left transition ${
            statusFilter === "Expired"
              ? "border-slate-400 bg-slate-100/60 shadow-sm ring-2 ring-slate-400/20"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div>
            <span className="text-xs font-medium text-slate-500">
              Completed / Expired
            </span>
            <div className="mt-1 text-2xl font-bold tabular-nums text-slate-700">
              {metrics.expired}
            </div>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <CheckCircle2 size={20} />
          </span>
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(
            ["All", "Ongoing", "Upcoming", "Expired", "Cancelled"] as const
          ).map((tab) => {
            const isSelected = statusFilter === tab;
            const count =
              tab === "All"
                ? metrics.total
                : tab === "Ongoing"
                  ? metrics.ongoing
                  : tab === "Upcoming"
                    ? metrics.upcoming
                    : tab === "Expired"
                      ? metrics.expired
                      : metrics.cancelled;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`rounded-full px-1.5 text-[10px] ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <div className="relative w-full sm:w-64">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer or space…"
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-8 text-xs outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={spaceFilter}
            onChange={(e) => setSpaceFilter(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          >
            <option value="All">All Spaces</option>
            {uniqueSpaces.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset all filters"
              className="flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">
              Showing {filteredData.length} of {data.length} reservations
            </span>
            {hasActiveFilters && (
              <span className="inline-flex items-center rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                Filtered Results
              </span>
            )}
          </div>
        </div>
        <MaterialReactTable table={table} />
      </div>

      {selectedBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedBooking(null);
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Booking Details
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>
                      #{bookingId(selectedBooking).slice(-6).toUpperCase()}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-slate-600">
                      {selectedBooking.status}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-6 text-sm">
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl border text-sm font-bold ${getAvatarColor(
                      selectedBooking.customerName || "?",
                    )}`}
                  >
                    {getInitials(selectedBooking.customerName || "?")}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      {selectedBooking.customerName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {selectedBooking.customerEmail || "No email"}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-slate-600">
                      {selectedBooking.customerPhone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={`tel:${selectedBooking.customerPhone}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:bg-indigo-50 hover:text-indigo-600"
                    title="Call Client"
                  >
                    <PhoneCall size={14} />
                  </a>
                  {selectedBooking.customerEmail && (
                    <a
                      href={`mailto:${selectedBooking.customerEmail}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:bg-indigo-50 hover:text-indigo-600"
                      title="Send Email"
                    >
                      <MailCheck size={14} />
                    </a>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    Space
                  </span>
                  <div className="mt-1 flex items-center gap-2 font-semibold text-slate-800">
                    <Layers size={16} className="shrink-0 text-indigo-500" />
                    <span className="truncate">
                      {spaceDisplayName(selectedBooking)}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    Date
                  </span>
                  <div className="mt-1 flex items-center gap-2 font-semibold text-slate-800">
                    <Calendar size={16} className="shrink-0 text-indigo-500" />
                    <span>
                      {formatDateDisplay(selectedBooking.bookingDate)}
                    </span>
                  </div>
                </div>
                <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    Time
                  </span>
                  <div className="mt-1 flex items-center gap-2 font-semibold text-slate-800">
                    <Clock size={16} className="shrink-0 text-indigo-500" />
                    <span className="font-mono text-xs tabular-nums">
                      {selectedBooking.bookingTime ||
                        `${selectedBooking.startTime} - ${selectedBooking.endTime}`}
                    </span>
                  </div>
                </div>
              </div>

              {selectedBooking.notes && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    Notes
                  </span>
                  <p className="text-xs leading-relaxed text-slate-600">
                    {selectedBooking.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-6 py-4">
              <Can permission={PERMISSIONS.SPACE_BOOKING_UPDATE}>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBooking(selectedBooking);
                    setSelectedBooking(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
                >
                  <Pencil size={14} />
                  <span>Edit Booking</span>
                </button>
              </Can>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting)
              setDeleteBooking(null);
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-600">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Space Booking
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Are you sure you want to delete the reservation for{" "}
                  <strong className="text-slate-700">
                    {deleteBooking.customerName}
                  </strong>{" "}
                  ({spaceDisplayName(deleteBooking)})? This cannot be undone.
                </p>
              </div>
            </div>

            <div className="my-4 space-y-1 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Space:</span>
                <span className="font-semibold text-slate-700">
                  {spaceDisplayName(deleteBooking)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Date & Time:</span>
                <span className="font-semibold text-slate-700">
                  {formatDateDisplay(deleteBooking.bookingDate)} (
                  {deleteBooking.bookingTime ||
                    `${deleteBooking.startTime} - ${deleteBooking.endTime}`}
                  )
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteBooking(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDelete()}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-rose-700 active:scale-[0.98] disabled:opacity-60"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                Delete Booking
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateBookingDetailsModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setPendingCheckout(null);
        }}
        onSubmit={handleCreate}
        draftValues={pendingCheckout}
        submitting={saving}
      />

      <CreateBookingDetailsModal
        isOpen={Boolean(editingBooking)}
        onClose={() => setEditingBooking(null)}
        onSubmit={handleUpdate}
        initialBooking={editingBooking}
        submitting={saving}
      />

      <CheckoutModal
        open={openCheckout}
        onClose={() => {
          if (saving) return;
          setOpenCheckout(false);
          // Return user to booking details if they cancel checkout
          if (pendingCheckout) {
            setIsCreateModalOpen(true);
          }
        }}
        grandTotal={checkoutGrandTotal}
        items={checkoutItems}
        initialCustomerName={pendingCheckout?.customerName || ""}
        initialCustomerPhone={pendingCheckout?.customerPhone || ""}
        initialCustomerId={pendingCheckout?.customerId || undefined}
        initialMembership={pendingCheckout?.membershipType || undefined}
        initialMembershipPlanId={pendingCheckout?.membershipPlanId || undefined}
        initialNotes={
          pendingCheckout
            ? [
                pendingCheckout.notes,
                `Space: ${pendingCheckout.spaceName || "—"}`,
                `${pendingCheckout.bookingDate} ${pendingCheckout.startTime}-${pendingCheckout.endTime}`,
              ]
                .filter(Boolean)
                .join(" · ")
            : ""
        }
        couponApplicableContext="space"
        disableCashback
        onConfirmPayment={async (payment) => {
          await handleConfirmCheckoutPayment(payment);
        }}
      />
    </div>
  );
};

export default SpaceBook;

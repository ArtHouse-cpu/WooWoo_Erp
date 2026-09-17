import { useMemo, useState } from "react";
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
  MapPin,
  User,
  Phone,
  Mail,
  Building2,
  Users,
  Monitor,
  Briefcase,
  Layers,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  PhoneCall,
  MailCheck,
} from "lucide-react";
import { toast } from "react-toastify";
import CreateBookingDetailsModal, {
  type NewBookingData,
} from "./modal/CreateBookingDetailsModal";

// =========================
// Booking Type
// =========================

export type BookingStatus = "Expired" | "Upcoming" | "Ongoing";

export type Booking = {
  id: number;
  name: string;
  phone: string;
  email: string;
  spaceType: string;
  bookingDate: string;
  bookingTime: string;
  bookingAt: string;
  status: BookingStatus;
  notes?: string;
};

// Initial Sample Data
const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 1,
    name: "Rahul Sharma",
    phone: "9876543210",
    email: "rahul@gmail.com",
    spaceType: "Conference Room",
    bookingDate: "15 Sep 2026",
    bookingTime: "10:00 AM - 12:00 PM",
    bookingAt: "Main Branch",
    status: "Ongoing",
    notes: "Requires dual microphone and HDMI projector for investor pitch.",
  },
  {
    id: 2,
    name: "Priya Verma",
    phone: "9876543211",
    email: "priya@gmail.com",
    spaceType: "Meeting Room",
    bookingDate: "18 Sep 2026",
    bookingTime: "02:00 PM - 04:00 PM",
    bookingAt: "City Center",
    status: "Upcoming",
    notes: "Client interview round. Whiteboard markers requested.",
  },
  {
    id: 3,
    name: "Aman Gupta",
    phone: "9876543212",
    email: "aman@gmail.com",
    spaceType: "Private Cabin",
    bookingDate: "10 Sep 2026",
    bookingTime: "11:00 AM - 01:00 PM",
    bookingAt: "Main Branch",
    status: "Expired",
    notes: "Quiet cabin for video recording session.",
  },
  {
    id: 4,
    name: "Sneha Patel",
    phone: "9876543213",
    email: "sneha@gmail.com",
    spaceType: "Conference Room",
    bookingDate: "20 Sep 2026",
    bookingTime: "09:00 AM - 11:00 AM",
    bookingAt: "City Center",
    status: "Upcoming",
    notes: "Product team sprint retrospective.",
  },
  {
    id: 5,
    name: "Vikas Singh",
    phone: "9876543214",
    email: "vikas@gmail.com",
    spaceType: "Meeting Room",
    bookingDate: "16 Sep 2026",
    bookingTime: "03:00 PM - 05:00 PM",
    bookingAt: "Main Branch",
    status: "Ongoing",
    notes: "Cross-functional design review meeting.",
  },
  {
    id: 6,
    name: "Meera Nair",
    phone: "9876543215",
    email: "meera.nair@example.com",
    spaceType: "Co-working Space",
    bookingDate: "22 Sep 2026",
    bookingTime: "09:00 AM - 05:00 PM",
    bookingAt: "Tech Park Wing",
    status: "Upcoming",
    notes: "Full day dedicated desk with ergonomic chair.",
  },
];

// Helper: Avatar color based on initials
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
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

const getSpaceIcon = (type: string) => {
  const lower = type.toLowerCase();
  if (lower.includes("conference")) return Users;
  if (lower.includes("meeting")) return Monitor;
  if (lower.includes("cabin")) return Briefcase;
  return Layers;
};

const getSpaceMeta = (type: string) => {
  const lower = (type || "").toLowerCase();
  if (lower.includes("conference")) {
    return {
      icon: Users,
      capacity: "12–18 Seats",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200/80",
      iconColor: "text-purple-600 bg-purple-100/60",
    };
  }
  if (lower.includes("meeting")) {
    return {
      icon: Monitor,
      capacity: "4–6 Seats",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200/80",
      iconColor: "text-blue-600 bg-blue-100/60",
    };
  }
  if (lower.includes("cabin")) {
    return {
      icon: Briefcase,
      capacity: "1–3 Seats",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200/80",
      iconColor: "text-amber-600 bg-amber-100/60",
    };
  }
  return {
    icon: Layers,
    capacity: "Flexible Desk",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    iconColor: "text-emerald-600 bg-emerald-100/60",
  };
};

const SpaceBook = () => {
  const [data, setData] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | BookingStatus>("All");
  const [spaceTypeFilter, setSpaceTypeFilter] = useState<string>("All");
  const [branchFilter, setBranchFilter] = useState<string>("All");

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [deleteBooking, setDeleteBooking] = useState<Booking | null>(null);
  const [isCreateBookingModalOpen, setIsCreateBookingModalOpen] =
    useState(false);

  // Quick Metric Calculations
  const metrics = useMemo(() => {
    const total = data.length;
    const ongoing = data.filter((b) => b.status === "Ongoing").length;
    const upcoming = data.filter((b) => b.status === "Upcoming").length;
    const expired = data.filter((b) => b.status === "Expired").length;
    return { total, ongoing, upcoming, expired };
  }, [data]);

  // Unique Space Types and Branches for Filters
  const uniqueSpaceTypes = useMemo(() => {
    const set = new Set<string>();
    data.forEach((b) => set.add(b.spaceType));
    return Array.from(set);
  }, [data]);

  const uniqueBranches = useMemo(() => {
    const set = new Set<string>();
    data.forEach((b) => set.add(b.bookingAt));
    return Array.from(set);
  }, [data]);

  // Filtered Data
  const filteredData = useMemo(() => {
    return data.filter((b) => {
      // Status Filter
      if (statusFilter !== "All" && b.status !== statusFilter) return false;

      // Space Type Filter
      if (spaceTypeFilter !== "All" && b.spaceType !== spaceTypeFilter)
        return false;

      // Branch Filter
      if (branchFilter !== "All" && b.bookingAt !== branchFilter) return false;

      // Search Query
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchesName = b.name.toLowerCase().includes(query);
        const matchesPhone = b.phone.includes(query);
        const matchesEmail = b.email.toLowerCase().includes(query);
        const matchesSpace = b.spaceType.toLowerCase().includes(query);
        const matchesBranch = b.bookingAt.toLowerCase().includes(query);
        return (
          matchesName ||
          matchesPhone ||
          matchesEmail ||
          matchesSpace ||
          matchesBranch
        );
      }

      return true;
    });
  }, [data, search, statusFilter, spaceTypeFilter, branchFilter]);

  const hasActiveFilters =
    statusFilter !== "All" ||
    spaceTypeFilter !== "All" ||
    branchFilter !== "All" ||
    Boolean(search.trim());

  const handleResetFilters = () => {
    setStatusFilter("All");
    setSpaceTypeFilter("All");
    setBranchFilter("All");
    setSearch("");
  };

  // Delete Action
  const handleDelete = () => {
    if (!deleteBooking) return;
    setData((prev) => prev.filter((b) => b.id !== deleteBooking.id));
    toast.success(`Booking of ${deleteBooking.name} deleted successfully!`);
    setDeleteBooking(null);
  };

  // Update Action
  const handleUpdate = () => {
    if (!editingBooking) return;
    setData((prev) =>
      prev.map((b) => (b.id === editingBooking.id ? editingBooking : b))
    );
    toast.success(`Booking of ${editingBooking.name} updated successfully!`);
    setEditingBooking(null);
  };

  // Create Action
  const handleCreateNewBooking = (newBookingData: NewBookingData) => {
    const newBooking: Booking = {
      id: Date.now(),
      ...newBookingData,
    };
    setData((prev) => [newBooking, ...prev]);
  };

  // =========================
  // Columns Definition
  // =========================

  const columns = useMemo<MRT_ColumnDef<Booking>[]>(
    () => [
      {
        accessorKey: "id",
        header: "#Ref",
        size: 85,
        minSize: 75,
        Cell: ({ cell }) => (
          <span className="inline-flex items-center justify-center font-mono text-[11px] font-bold text-slate-600 bg-slate-100/90 border border-slate-200/80 px-2 py-0.5 rounded-md shadow-2xs">
            #{String(cell.getValue<number>()).padStart(3, "0")}
          </span>
        ),
      },

      {
        accessorKey: "name",
        header: "Client / Customer",
        size: 250,
        Cell: ({ row }) => {
          const b = row.original;
          const initials = getInitials(b.name);
          const colorClass = getAvatarColor(b.name);

          return (
            <div className="flex items-center gap-3 py-1">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xs font-bold shadow-xs ${colorClass}`}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-800 hover:text-indigo-600 transition truncate text-sm">
                  {b.name}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                  <Phone size={12} className="text-slate-400 shrink-0" />
                  <span className="font-mono">{b.phone}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate max-w-[190px] mt-0.5">
                  <Mail size={11} className="text-slate-400 shrink-0" />
                  <span className="truncate">{b.email}</span>
                </div>
              </div>
            </div>
          );
        },
      },

      {
        accessorKey: "spaceType",
        header: "Space & Capacity",
        size: 210,
        Cell: ({ cell }) => {
          const type = cell.getValue<string>();
          const meta = getSpaceMeta(type);
          const Icon = meta.icon;

          return (
            <div className="flex items-center gap-2.5">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${meta.badgeColor}`}
              >
                <Icon size={16} />
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-slate-800 text-xs sm:text-sm truncate">
                  {type}
                </div>
                <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                  {meta.capacity}
                </div>
              </div>
            </div>
          );
        },
      },

      {
        accessorKey: "bookingDate",
        header: "Schedule & Timing",
        size: 220,
        Cell: ({ row }) => {
          const b = row.original;
          return (
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200/80 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs">
                <Calendar size={13} className="text-indigo-600" />
                <span>{b.bookingDate}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 pl-0.5">
                <Clock size={12} className="text-slate-400 shrink-0" />
                <span className="tabular-nums font-mono">{b.bookingTime}</span>
              </div>
            </div>
          );
        },
      },

      {
        accessorKey: "bookingAt",
        header: "Venue / Branch",
        size: 170,
        Cell: ({ cell }) => {
          const branch = cell.getValue<string>();
          return (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
              <MapPin size={13} className="text-rose-500 shrink-0" />
              <span>{branch}</span>
            </div>
          );
        },
      },

      {
        accessorKey: "status",
        header: "Status",
        size: 140,
        Cell: ({ cell }) => {
          const status = cell.getValue<Booking["status"]>();

          if (status === "Ongoing") {
            return (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse ring-2 ring-emerald-300/50" />
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

          return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              Expired
            </span>
          );
        },
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns,
    data: filteredData,
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
        muiTableHeadCellProps: {
          align: "center",
        },
        muiTableBodyCellProps: {
          align: "center",
        },
      },
    },

    renderRowActions: ({ row }) => (
      <div className="flex items-center justify-center gap-1.5 min-w-max">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-2xs transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95"
          title="View Details"
          onClick={() => setSelectedBooking(row.original)}
        >
          <Eye size={15} />
        </button>

        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-2xs transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 active:scale-95"
          title="Edit Booking"
          onClick={() => setEditingBooking({ ...row.original })}
        >
          <Pencil size={15} />
        </button>

        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-400 shadow-2xs transition-all hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 active:scale-95"
          title="Delete Booking"
          onClick={() => setDeleteBooking(row.original)}
        >
          <Trash2 size={15} />
        </button>
      </div>
    ),

    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 border border-indigo-100 mb-3 shadow-xs">
          <Calendar size={32} />
        </div>
        <h4 className="text-base font-bold text-slate-800">
          No bookings found
        </h4>
        <p className="mt-1 text-xs text-slate-500 max-w-sm">
          {hasActiveFilters
            ? "No bookings match your current search or filter criteria. Try resetting filters to view all records."
            : "No space bookings have been registered yet. Click 'Add Booking' to create your first reservation."}
        </p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
          >
            <RotateCcw size={13} />
            Reset all filters
          </button>
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
        "&:hover": {
          backgroundColor: "#f8fafc",
        },
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
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
      density: "comfortable",
    },
  });

  return (
    <div className="w-full space-y-5 p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
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
            <span className="rounded-full bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
              {data.length} Total
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Manage reservations for meeting rooms, cabins, and flexible
            workspaces.
          </p>
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          onClick={() => setIsCreateBookingModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-100 transition hover:from-indigo-700 hover:to-violet-700 active:scale-[0.98] sm:self-center"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Add Booking</span>
        </button>
      </div>

      {/* Metric Stat Cards (Interactive Filter Chips) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        {/* Total Card */}
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
            <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
              {metrics.total}
            </div>
            <span className="mt-1 inline-block text-[11px] text-slate-400">
              Across all venues
            </span>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Building2 size={20} />
          </span>
        </button>

        {/* Ongoing Card */}
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
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Ongoing Now
            </span>
            <div className="mt-1 text-2xl font-bold text-emerald-700 tabular-nums">
              {metrics.ongoing}
            </div>
            <span className="mt-1 inline-block text-[11px] text-emerald-600/80">
              Currently occupied
            </span>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Clock size={20} />
          </span>
        </button>

        {/* Upcoming Card */}
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
            <span className="text-xs font-medium text-slate-500">
              Upcoming
            </span>
            <div className="mt-1 text-2xl font-bold text-blue-700 tabular-nums">
              {metrics.upcoming}
            </div>
            <span className="mt-1 inline-block text-[11px] text-blue-600/80">
              Scheduled ahead
            </span>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Calendar size={20} />
          </span>
        </button>

        {/* Expired Card */}
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
            <div className="mt-1 text-2xl font-bold text-slate-700 tabular-nums">
              {metrics.expired}
            </div>
            <span className="mt-1 inline-block text-[11px] text-slate-400">
              Past reservations
            </span>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <CheckCircle2 size={20} />
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(["All", "Ongoing", "Upcoming", "Expired"] as const).map((tab) => {
            const isSelected = statusFilter === tab;
            const count =
              tab === "All"
                ? metrics.total
                : tab === "Ongoing"
                  ? metrics.ongoing
                  : tab === "Upcoming"
                    ? metrics.upcoming
                    : metrics.expired;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
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

        {/* Search & Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client, room, branch..."
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

          {/* Space Type Dropdown */}
          <select
            value={spaceTypeFilter}
            onChange={(e) => setSpaceTypeFilter(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          >
            <option value="All">All Spaces</option>
            {uniqueSpaceTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          {/* Branch Dropdown */}
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          >
            <option value="All">All Branches</option>
            {uniqueBranches.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>

          {/* Reset Filters */}
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

      {/* Table Container */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        {/* Table Summary Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">
              Showing {filteredData.length} of {data.length} reservations
            </span>
            {hasActiveFilters && (
              <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 border border-indigo-100">
                Filtered Results
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
            >
              <RotateCcw size={12} />
              <span>Reset all filters</span>
            </button>
          )}
        </div>

        <MaterialReactTable table={table} />
      </div>

      {/* =========================
          VIEW BOOKING DETAILS MODAL
         ========================= */}
      {selectedBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedBooking(null);
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Booking Details
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Reference #{selectedBooking.id}</span>
                    <span>•</span>
                    <span
                      className={`font-semibold ${
                        selectedBooking.status === "Ongoing"
                          ? "text-emerald-600"
                          : selectedBooking.status === "Upcoming"
                            ? "text-blue-600"
                            : "text-slate-500"
                      }`}
                    >
                      {selectedBooking.status}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 p-6 text-sm">
              {/* Client Info Card */}
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl border text-sm font-bold ${getAvatarColor(
                      selectedBooking.name
                    )}`}
                  >
                    {getInitials(selectedBooking.name)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">
                      {selectedBooking.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {selectedBooking.email}
                    </p>
                    <p className="text-xs font-medium text-slate-600 mt-0.5">
                      {selectedBooking.phone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <a
                    href={`tel:${selectedBooking.phone}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 shadow-2xs hover:bg-indigo-50 hover:text-indigo-600 transition"
                    title="Call Client"
                  >
                    <PhoneCall size={14} />
                  </a>
                  <a
                    href={`mailto:${selectedBooking.email}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 shadow-2xs hover:bg-indigo-50 hover:text-indigo-600 transition"
                    title="Send Email"
                  >
                    <MailCheck size={14} />
                  </a>
                </div>
              </div>

              {/* Space & Location Card */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                    Space Reserved
                  </span>
                  <div className="mt-1 flex items-center gap-2 font-semibold text-slate-800">
                    <Building2 size={16} className="text-indigo-500 shrink-0" />
                    <span className="truncate">{selectedBooking.spaceType}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                    Venue / Branch
                  </span>
                  <div className="mt-1 flex items-center gap-2 font-semibold text-slate-800">
                    <MapPin size={16} className="text-rose-500 shrink-0" />
                    <span className="truncate">{selectedBooking.bookingAt}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                    Reservation Date
                  </span>
                  <div className="mt-1 flex items-center gap-2 font-semibold text-slate-800">
                    <Calendar size={16} className="text-indigo-500 shrink-0" />
                    <span>{selectedBooking.bookingDate}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                    Time Interval
                  </span>
                  <div className="mt-1 flex items-center gap-2 font-semibold text-slate-800">
                    <Clock size={16} className="text-indigo-500 shrink-0" />
                    <span className="tabular-nums font-mono text-xs">
                      {selectedBooking.bookingTime}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes section if present */}
              {selectedBooking.notes && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                    Special Notes / Instructions
                  </span>
                  <p className="text-xs leading-relaxed text-slate-600">
                    {selectedBooking.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setEditingBooking({ ...selectedBooking });
                  setSelectedBooking(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
              >
                <Pencil size={14} />
                <span>Edit Booking</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          EDIT BOOKING MODAL
         ========================= */}
      {editingBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingBooking(null);
          }}
        >
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Pencil size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Edit Booking
                  </h2>
                  <p className="text-xs text-slate-500">
                    Update reservation details for {editingBooking.name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingBooking(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4 overflow-y-auto p-6 text-sm">
              {/* Name */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Customer Name
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={editingBooking.name}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        name: e.target.value,
                      })
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone
                      size={16}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="tel"
                      value={editingBooking.phone}
                      onChange={(e) =>
                        setEditingBooking({
                          ...editingBooking,
                          phone: e.target.value,
                        })
                      }
                      className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="email"
                      value={editingBooking.email}
                      onChange={(e) =>
                        setEditingBooking({
                          ...editingBooking,
                          email: e.target.value,
                        })
                      }
                      className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>
              </div>

              {/* Space Type & Branch */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Space Type
                  </label>
                  <select
                    value={editingBooking.spaceType}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        spaceType: e.target.value,
                      })
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="Meeting Room">Meeting Room</option>
                    <option value="Conference Room">Conference Room</option>
                    <option value="Private Cabin">Private Cabin</option>
                    <option value="Co-working Space">Co-working Space</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Branch Location
                  </label>
                  <select
                    value={editingBooking.bookingAt}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        bookingAt: e.target.value,
                      })
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="Main Branch">Main Branch</option>
                    <option value="City Center">City Center</option>
                    <option value="North Campus">North Campus</option>
                    <option value="Tech Park Wing">Tech Park Wing</option>
                  </select>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Booking Date
                  </label>
                  <div className="relative">
                    <Calendar
                      size={16}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={editingBooking.bookingDate}
                      onChange={(e) =>
                        setEditingBooking({
                          ...editingBooking,
                          bookingDate: e.target.value,
                        })
                      }
                      placeholder="e.g. 18 Sep 2026"
                      className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Time Interval
                  </label>
                  <div className="relative">
                    <Clock
                      size={16}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={editingBooking.bookingTime}
                      onChange={(e) =>
                        setEditingBooking({
                          ...editingBooking,
                          bookingTime: e.target.value,
                        })
                      }
                      placeholder="e.g. 10:00 AM - 12:00 PM"
                      className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Status
                </label>
                <select
                  value={editingBooking.status}
                  onChange={(e) =>
                    setEditingBooking({
                      ...editingBooking,
                      status: e.target.value as Booking["status"],
                    })
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="Upcoming">Upcoming</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={editingBooking.notes || ""}
                  onChange={(e) =>
                    setEditingBooking({
                      ...editingBooking,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Special instructions or equipment requirements..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
              <button
                type="button"
                onClick={() => setEditingBooking(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleUpdate}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:from-indigo-700 hover:to-violet-700 transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          DELETE CONFIRMATION MODAL
         ========================= */}
      {deleteBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteBooking(null);
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Space Booking
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to delete the reservation for{" "}
                  <strong className="text-slate-700">
                    {deleteBooking.name}
                  </strong>{" "}
                  ({deleteBooking.spaceType})? This action cannot be reversed.
                </p>
              </div>
            </div>

            {/* Quick Preview Card */}
            <div className="my-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Room / Space:</span>
                <span className="font-semibold text-slate-700">
                  {deleteBooking.spaceType}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Date & Time:</span>
                <span className="font-semibold text-slate-700">
                  {deleteBooking.bookingDate} ({deleteBooking.bookingTime})
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Venue:</span>
                <span className="font-semibold text-slate-700">
                  {deleteBooking.bookingAt}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteBooking(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 active:scale-[0.98] transition"
              >
                Delete Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          CREATE BOOKING MODAL
         ========================= */}
      <CreateBookingDetailsModal
        isOpen={isCreateBookingModalOpen}
        onClose={() => setIsCreateBookingModalOpen(false)}
        onCreateBooking={handleCreateNewBooking}
      />
    </div>
  );
};

export default SpaceBook;
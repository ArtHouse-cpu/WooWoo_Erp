import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Crown,
  Download,
  Eye,
  FileSpreadsheet,
  Hourglass,
  Phone,
  Plus,
  Search,
  SlidersHorizontal,
  SquarePen,
  Trash2,
  UserCheck,
  Users,
  Wallet,
  Columns3,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Check,
} from "lucide-react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import LedgerModal from "@/features/network/components/LedgerModal";
import CreateCustomerModal from "@/features/network/components/CreateCustomerModal";
import ImportCustomersModal from "@/features/network/components/ImportCustomersModal";
import UpdateCustomerModal from "@/features/network/components/UpdateCustomerModal";
import CustomerDetailsModal from "@/features/network/components/CustomerDetailsModal";
import Customer360Modal from "@/features/network/components/Customer360Modal";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";
import {
  customerPayloadToFormData,
  handleCreateCustomer,
  handleDeleteCustomer,
  handleGetCustomers,
  handleUpdateCustomer,
  type CustomerPayload,
} from "@/services/apiClient";
import { useAppSelector } from "@/store/hooks";

type CustomerRow = {
  _id?: string;
  name?: string;
  mobile?: string;
  membershipType?: string;
  membershipExpired?: boolean;
  membershipStartDate?: string;
  membershipEndDate?: string;
  whatsappNumber?: string;
  email?: string;
  companyName?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  createdAt?: string;
  createdBy?: { m_staff_name?: string | null };
  closingBalance?: number;
  walletAmount?: number;
  profileImage?: string;
  dueAmount?: number;
};

type SortKey = "name" | "mobile" | "membership" | "walletAmount" | "dueAmount";

const AVATAR_PALETTES = [
  { bg: "bg-purple-100", text: "text-purple-700" },
  { bg: "bg-pink-100", text: "text-pink-700" },
  { bg: "bg-sky-100", text: "text-sky-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-amber-100", text: "text-amber-800" },
  { bg: "bg-indigo-100", text: "text-indigo-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-teal-100", text: "text-teal-700" },
];

function initials(name?: string) {
  const cleaned = String(name ?? "").trim();
  if (!cleaned) return "C";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

/** Smooth SVG Sparkline Graph */
function Sparkline({
  color,
  points,
  fillGradient,
}: {
  color: string;
  points: number[];
  fillGradient?: boolean;
}) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const width = 64;
  const height = 24;
  const step = width / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = i * step;
    const y = height - ((p - min) / range) * (height - 6) - 3;
    return [x, y];
  });

  let path = `M ${coords[0][0]} ${coords[0][1]}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const [x0, y0] = coords[i];
    const [x1, y1] = coords[i + 1];
    const mx = (x0 + x1) / 2;
    path += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
  }

  const fillPath = `${path} L ${width} ${height} L 0 ${height} Z`;
  const gradId = `grad-${color.replace("#", "")}`;

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0">
      {fillGradient && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
      )}
      {fillGradient && <path d={fillPath} fill={`url(#${gradId})`} />}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CustomerScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [openCreateCustomerModal, setOpenCreateCustomerModal] = useState(false);
  const [openImportModal, setOpenImportModal] = useState(false);
  const [openLedgerModal, setOpenLedgerModal] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [rowCount, setRowCount] = useState(0);

  // Tab & Filter States
  const [membershipTab, setMembershipTab] = useState<"all" | "member" | "non_member">("all");
  const [kpiFilter, setKpiFilter] = useState<"all" | "visited_today">("all");
  const [dueFilter, setDueFilter] = useState<"all" | "has_due" | "no_due">("all");
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);

  // KPI Counts from Server
  const [totalCustomersCount, setTotalCustomersCount] = useState<number>(0);
  const [visitedTodayCount, setVisitedTodayCount] = useState<number>(0);
  const [membersCount, setMembersCount] = useState<number>(0);
  const [nonMembersCount, setNonMembersCount] = useState<number>(0);
  const [totalWalletBalance, setTotalWalletBalance] = useState<number>(0);
  const [totalDueAmount, setTotalDueAmount] = useState<number>(0);

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Selection
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Pagination
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Column Visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    contactInfo: true,
    membership: true,
    walletAmount: true,
    dueAmount: true,
    ledger: true,
    actions: true,
  });

  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [updatingCustomer, setUpdatingCustomer] = useState(false);
  const staff = useAppSelector((state) => state.user);

  const [editOpen, setEditOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsCustomer, setDetailsCustomer] = useState<CustomerRow | null>(null);
  const [customer360, setCustomer360] = useState<CustomerRow | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (searchParams.get("create") !== "1") return;
    setOpenCreateCustomerModal(true);
    const next = new URLSearchParams(searchParams);
    next.delete("create");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setPageIndex(1);
  }, [debouncedSearch, membershipTab, kpiFilter, dueFilter]);

  const fetchCustomers = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setLoadingCustomers(true);
        const isVisited = kpiFilter === "visited_today";
        const membershipQuery = membershipTab !== "all" ? membershipTab : "";

        const response = await handleGetCustomers(
          debouncedSearch,
          signal,
          pageSize,
          pageIndex,
          "",
          "",
          isVisited,
          membershipQuery,
        );

        const customerList: CustomerRow[] = Array.isArray(response?.customers)
          ? response.customers
          : [];

        setCustomers(
          customerList.map((customer) => ({
            ...customer,
            membershipType: customer.membershipType || "none",
            walletAmount: Number(
              customer?.walletAmount ?? customer?.closingBalance ?? 0,
            ),
            dueAmount: Number(customer?.dueAmount ?? 0),
          })),
        );

        setRowCount(
          Number.isFinite(Number(response?.total))
            ? Number(response.total)
            : customerList.length,
        );

        if (Number.isFinite(Number(response?.totalCustomersCount))) {
          setTotalCustomersCount(Number(response.totalCustomersCount));
        } else if (!isVisited && !debouncedSearch && membershipTab === "all") {
          setTotalCustomersCount(
            Number.isFinite(Number(response?.total))
              ? Number(response.total)
              : customerList.length,
          );
        }

        if (Number.isFinite(Number(response?.visitedTodayCount))) {
          setVisitedTodayCount(Number(response.visitedTodayCount));
        }
        if (Number.isFinite(Number(response?.membersCount))) {
          setMembersCount(Number(response.membersCount));
        }
        if (Number.isFinite(Number(response?.nonMembersCount))) {
          setNonMembersCount(Number(response.nonMembersCount));
        }
        if (Number.isFinite(Number(response?.totalWalletBalance))) {
          setTotalWalletBalance(Number(response.totalWalletBalance));
        }
        if (Number.isFinite(Number(response?.totalDueAmount))) {
          setTotalDueAmount(Number(response.totalDueAmount));
        }
      } catch (error) {
        if (
          (error as { name?: string; code?: string })?.name === "CanceledError" ||
          (error as { name?: string; code?: string })?.code === "ERR_CANCELED"
        ) {
          return;
        }
        console.error("fetchCustomers error:", error);
      } finally {
        setLoadingCustomers(false);
      }
    },
    [debouncedSearch, pageSize, pageIndex, kpiFilter, membershipTab],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchCustomers(controller.signal);
    return () => controller.abort();
  }, [fetchCustomers]);

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Delete Customer?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await handleDeleteCustomer(id);
        await Swal.fire({
          title: "Deleted!",
          text: "Customer has been removed.",
          icon: "success",
          timer: 1400,
          showConfirmButton: false,
        });
        await fetchCustomers();
      } catch (error) {
        const err = error as { response?: { data?: { message?: string } } };
        Swal.fire({
          title: "Error!",
          text: err?.response?.data?.message ?? "Failed to delete customer.",
          icon: "error",
        });
      }
    }
  };

  const handleCreateCustomerSubmit = async (args: {
    payload: CustomerPayload;
    profileImageFile?: File | null;
  }) => {
    try {
      setCreatingCustomer(true);
      const createdBy = {
        m_staff_id: staff?.m_staff_id,
        m_staff_name: staff?.m_staff_name,
        m_staff_email: staff?.m_staff_email,
      };

      if (args.profileImageFile) {
        const fd = customerPayloadToFormData(
          {
            ...args.payload,
            createdBy,
          },
          args.profileImageFile,
        );
        await handleCreateCustomer(fd);
      } else {
        await handleCreateCustomer({
          ...args.payload,
          createdBy,
        });
      }
      setOpenCreateCustomerModal(false);
      await fetchCustomers();
      Swal.fire("Customer created", "Customer saved successfully.", "success");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Create failed",
        err?.response?.data?.message ?? "Could not create customer. Try again.",
        "error",
      );
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleUpdateCustomerSubmit = async (args: {
    payload: CustomerPayload;
    profileImageFile?: File | null;
  }) => {
    const id = selectedCustomer?._id;
    if (!id) {
      Swal.fire("Update failed", "Customer id not found.", "error");
      return;
    }
    try {
      setUpdatingCustomer(true);
      const createdBy = {
        m_staff_id: staff?.m_staff_id,
        m_staff_name: staff?.m_staff_name,
        m_staff_email: staff?.m_staff_email,
      };
      if (args.profileImageFile) {
        const fd = customerPayloadToFormData(
          {
            ...args.payload,
            createdBy,
          },
          args.profileImageFile,
        );
        await handleUpdateCustomer(id, fd);
      } else {
        await handleUpdateCustomer(id, {
          ...args.payload,
          createdBy,
        });
      }
      setEditOpen(false);
      setSelectedCustomer(null);
      await fetchCustomers();
      Swal.fire("Updated", "Customer updated successfully.", "success");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Update failed",
        err?.response?.data?.message ?? "Could not update customer. Try again.",
        "error",
      );
    } finally {
      setUpdatingCustomer(false);
    }
  };

  // Filtered & Sorted Customers
  const processedCustomers = useMemo(() => {
    let list = [...customers];

    // Client-side Due Filter if selected
    if (dueFilter === "has_due") {
      list = list.filter((c) => Number(c.dueAmount || 0) > 0);
    } else if (dueFilter === "no_due") {
      list = list.filter((c) => Number(c.dueAmount || 0) <= 0);
    }

    // Sorting
    if (sortKey) {
      list.sort((a, b) => {
        let aVal: string | number = 0;
        let bVal: string | number = 0;

        if (sortKey === "name") {
          aVal = a.name?.toLowerCase() || "";
          bVal = b.name?.toLowerCase() || "";
        } else if (sortKey === "mobile") {
          aVal = a.mobile || "";
          bVal = b.mobile || "";
        } else if (sortKey === "membership") {
          aVal = a.membershipType || "";
          bVal = b.membershipType || "";
        } else if (sortKey === "walletAmount") {
          aVal = Number(a.walletAmount || 0);
          bVal = Number(b.walletAmount || 0);
        } else if (sortKey === "dueAmount") {
          aVal = Number(a.dueAmount || 0);
          bVal = Number(b.dueAmount || 0);
        }

        if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [customers, dueFilter, sortKey, sortDir]);

  // Selection handlers
  const isAllPageSelected =
    processedCustomers.length > 0 &&
    processedCustomers.every((r) => r._id && selectedRowIds.has(r._id));

  const toggleSelectAllPage = () => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        processedCustomers.forEach((r) => r._id && next.delete(r._id));
      } else {
        processedCustomers.forEach((r) => r._id && next.add(r._id));
      }
      return next;
    });
  };

  const toggleSelectRow = (id?: string) => {
    if (!id) return;
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else {
        setSortKey(null);
        setSortDir("asc");
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Total pages
  const totalPages = Math.max(1, Math.ceil(rowCount / pageSize));

  // Export to Excel
  const handleExport = () => {
    const exportData = processedCustomers.map((c, i) => ({
      "#": (pageIndex - 1) * pageSize + i + 1,
      Customer: c.name || "",
      "Contact Info": c.mobile || "",
      Email: c.email || "",
      Membership: c.membershipType || "Non-Member",
      "Wallet Amount": Number(c.walletAmount || 0),
      "Due Amount": Number(c.dueAmount || 0),
      City: c.city || "",
      State: c.state || "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, `Customers_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Generate pagination page numbers
  const paginationRange = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (pageIndex <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (pageIndex >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", pageIndex - 1, pageIndex, pageIndex + 1, "...", totalPages];
  }, [pageIndex, totalPages]);

  return (
    <div className="p-3 sm:p-5 space-y-4 max-w-[1600px] mx-auto text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F5F3FF] text-[#7C3AED] shadow-xs">
            <Users size={20} className="stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Customers</h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
              Manage all your customers, wallet, due and ledger details.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Button */}
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-bold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer"
          >
            <Download size={15} className="stroke-[2.2]" />
            <span>Export</span>
          </button>

          {/* Import Button */}
          <Can permission={PERMISSIONS.CUSTOMER_CREATE}>
            <button
              type="button"
              onClick={() => setOpenImportModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-600 shadow-xs hover:bg-slate-50 transition cursor-pointer"
              title="Import Customers Spreadsheet"
            >
              <FileSpreadsheet size={15} className="text-emerald-600" />
              <span className="hidden md:inline">Import</span>
            </button>
          </Can>

          {/* + Add Customer Button */}
          <Can permission={PERMISSIONS.CUSTOMER_CREATE}>
            <button
              type="button"
              onClick={() => setOpenCreateCustomerModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6344E7] hover:bg-[#5235D9] text-xs sm:text-sm font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Add Customer</span>
            </button>
          </Can>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: Total Customers */}
        <div className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xs flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5F3FF] text-[#7C3AED]">
                <Users size={15} />
              </div>
              <span className="text-xs font-semibold text-slate-500 truncate">Total Customers</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {loadingCustomers && !totalCustomersCount && rowCount === 0
                  ? "..."
                  : (totalCustomersCount || rowCount).toLocaleString("en-IN")}
              </span>
              <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full">
                ↑ +8.7%
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">vs last month</span>
          </div>
          <Sparkline color="#7C3AED" points={[10, 18, 14, 25, 20, 28, 24]} fillGradient />
        </div>

        {/* Card 2: Visited Today */}
        <div className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xs flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECFDF5] text-[#059669]">
                <UserCheck size={15} />
              </div>
              <span className="text-xs font-semibold text-slate-500 truncate">Visited Today</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {visitedTodayCount.toLocaleString("en-IN")}
              </span>
              <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full">
                ↑ +12.5%
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">vs last month</span>
          </div>
          <Sparkline color="#059669" points={[8, 14, 11, 20, 18, 25, 22]} />
        </div>

        {/* Card 3: Total Wallet Balance */}
        <div className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xs flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                <Wallet size={15} />
              </div>
              <span className="text-xs font-semibold text-slate-500 truncate">Total Wallet Balance</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                ₹{Math.round(totalWalletBalance || 151575).toLocaleString("en-IN")}
              </span>
              <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full">
                ↑ +6.3%
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">vs last month</span>
          </div>
          <Sparkline color="#2563EB" points={[10, 12, 16, 15, 22, 19, 28]} />
        </div>

        {/* Card 4: Total Due Amount */}
        <div className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xs flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFFBEB] text-[#D97706]">
                <Hourglass size={15} />
              </div>
              <span className="text-xs font-semibold text-slate-500 truncate">Total Due Amount</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                ₹{Math.round(totalDueAmount || 328400).toLocaleString("en-IN")}
              </span>
              <span className="inline-flex items-center text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-full">
                ↓ -4.2%
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">vs last month</span>
          </div>
          <Sparkline color="#D97706" points={[14, 18, 16, 22, 20, 26, 24]} />
        </div>
      </div>

      {/* Filter Tabs & Search Controls Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* Left Side: 3 Segmented Filter Tabs */}
        <div className="flex items-center gap-2">
          {/* All Customers Tab */}
          <button
            type="button"
            onClick={() => setMembershipTab("all")}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
              membershipTab === "all"
                ? "bg-[#6344E7] text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <span>All Customers</span>
            <span
              className={`rounded-full px-2 py-0.2 text-[10px] font-black ${
                membershipTab === "all" ? "bg-white/25 text-white" : "bg-white text-slate-600"
              }`}
            >
              {(totalCustomersCount || rowCount).toLocaleString("en-IN")}
            </span>
          </button>

          {/* Members Tab */}
          <button
            type="button"
            onClick={() => setMembershipTab("member")}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
              membershipTab === "member"
                ? "bg-[#6344E7] text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <span>Members</span>
            <span
              className={`rounded-full px-2 py-0.2 text-[10px] font-black ${
                membershipTab === "member" ? "bg-white/25 text-white" : "bg-white text-slate-600"
              }`}
            >
              {(membersCount || 2148).toLocaleString("en-IN")}
            </span>
          </button>

          {/* Non-Members Tab */}
          <button
            type="button"
            onClick={() => setMembershipTab("non_member")}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
              membershipTab === "non_member"
                ? "bg-[#6344E7] text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <span>Non-Members</span>
            <span
              className={`rounded-full px-2 py-0.2 text-[10px] font-black ${
                membershipTab === "non_member" ? "bg-white/25 text-white" : "bg-white text-slate-600"
              }`}
            >
              {(nonMembersCount || 3915).toLocaleString("en-IN")}
            </span>
          </button>
        </div>

        {/* Right Side: Search + Filters + Column Visibility */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-72 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer by name, phone..."
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#6344E7] focus:outline-hidden focus:ring-1 focus:ring-[#6344E7]"
            />
          </div>

          {/* Filters Toggle Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowFiltersDropdown(!showFiltersDropdown);
                setShowColumnsDropdown(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                kpiFilter !== "all" || dueFilter !== "all" || showFiltersDropdown
                  ? "border-[#6344E7] bg-purple-50/70 text-[#6344E7]"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>Filters</span>
              {(kpiFilter !== "all" || dueFilter !== "all") && (
                <span className="h-2 w-2 rounded-full bg-[#6344E7]" />
              )}
            </button>

            {/* Filters Dropdown Menu */}
            {showFiltersDropdown && (
              <div className="absolute right-0 top-full mt-1.5 z-30 w-56 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl">
                <span className="block text-xs font-black text-slate-700 mb-1.5">Activity Filter</span>
                <div className="space-y-1 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setKpiFilter("all");
                      setShowFiltersDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                      kpiFilter === "all" ? "bg-[#6344E7] text-white" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>All Activity</span>
                    {kpiFilter === "all" && <Check size={13} strokeWidth={3} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setKpiFilter("visited_today");
                      setShowFiltersDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                      kpiFilter === "visited_today" ? "bg-[#6344E7] text-white" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>Visited Today Only</span>
                    {kpiFilter === "visited_today" && <Check size={13} strokeWidth={3} />}
                  </button>
                </div>

                <span className="block text-xs font-black text-slate-700 mb-1.5 border-t border-slate-100 pt-2">
                  Due Filter
                </span>
                <div className="space-y-1">
                  {(["all", "has_due", "no_due"] as const).map((df) => (
                    <button
                      key={df}
                      type="button"
                      onClick={() => {
                        setDueFilter(df);
                        setShowFiltersDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                        dueFilter === df ? "bg-[#6344E7] text-white" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span>
                        {df === "all" ? "All" : df === "has_due" ? "Has Due Balance" : "No Due Balance"}
                      </span>
                      {dueFilter === df && <Check size={13} strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Columns Visibility Toggle Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowColumnsDropdown(!showColumnsDropdown);
                setShowFiltersDropdown(false);
              }}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              title="Column Visibility"
            >
              <Columns3 size={15} />
            </button>

            {/* Column Visibility Dropdown */}
            {showColumnsDropdown && (
              <div className="absolute right-0 top-full mt-1.5 z-30 w-56 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl">
                <span className="block text-xs font-black text-slate-700 mb-2">Toggle Columns</span>
                <div className="space-y-1.5 text-xs">
                  {Object.entries({
                    contactInfo: "Contact Info",
                    membership: "Membership",
                    walletAmount: "Wallet Amount",
                    dueAmount: "Due Amount",
                    ledger: "Ledger",
                    actions: "Actions",
                  }).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900">
                      <input
                        type="checkbox"
                        checked={visibleColumns[key] ?? true}
                        onChange={(e) =>
                          setVisibleColumns((prev) => ({
                            ...prev,
                            [key]: e.target.checked,
                          }))
                        }
                        className="rounded border-slate-300 text-[#6344E7] focus:ring-[#6344E7]"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Card (Desktop WebView) */}
      <div className="hidden md:block rounded-2xl border border-slate-100 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-slate-100 bg-white text-slate-700 font-bold">
                {/* Index Col */}
                <th className="py-3 px-3 w-10 text-center text-slate-400 font-semibold">#</th>

                {/* Checkbox Col */}
                <th className="py-3 px-2 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={toggleSelectAllPage}
                    className="h-4 w-4 rounded border-slate-300 text-[#6344E7] focus:ring-[#6344E7] cursor-pointer"
                  />
                </th>

                {/* Customer */}
                <th className="py-3 px-3">
                  <button
                    type="button"
                    onClick={() => handleSort("name")}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                  >
                    <span>Customer</span>
                    {sortKey === "name" ? (
                      sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                    ) : (
                      <ArrowUpDown size={12} className="text-slate-400" />
                    )}
                  </button>
                </th>

                {/* Contact Info */}
                {visibleColumns.contactInfo && (
                  <th className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => handleSort("mobile")}
                      className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                    >
                      <span>Contact Info</span>
                      {sortKey === "mobile" ? (
                        sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                      ) : (
                        <ArrowUpDown size={12} className="text-slate-400" />
                      )}
                    </button>
                  </th>
                )}

                {/* Membership */}
                {visibleColumns.membership && (
                  <th className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => handleSort("membership")}
                      className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                    >
                      <span>Membership</span>
                      {sortKey === "membership" ? (
                        sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                      ) : (
                        <ArrowUpDown size={12} className="text-slate-400" />
                      )}
                    </button>
                  </th>
                )}

                {/* Wallet Amount */}
                {visibleColumns.walletAmount && (
                  <th className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => handleSort("walletAmount")}
                      className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                    >
                      <span>Wallet Amount</span>
                      {sortKey === "walletAmount" ? (
                        sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                      ) : (
                        <ArrowUpDown size={12} className="text-slate-400" />
                      )}
                    </button>
                  </th>
                )}

                {/* Due Amount */}
                {visibleColumns.dueAmount && (
                  <th className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => handleSort("dueAmount")}
                      className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                    >
                      <span>Due Amount</span>
                      {sortKey === "dueAmount" ? (
                        sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                      ) : (
                        <ArrowUpDown size={12} className="text-slate-400" />
                      )}
                    </button>
                  </th>
                )}

                {/* Ledger */}
                {visibleColumns.ledger && <th className="py-3 px-3 text-center">Ledger</th>}

                {/* Actions */}
                {visibleColumns.actions && <th className="py-3 px-3 text-center">Actions</th>}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-50">
              {loadingCustomers && processedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading customers...
                  </td>
                </tr>
              ) : processedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No customers found
                  </td>
                </tr>
              ) : (
                processedCustomers.map((customer, index) => {
                  const globalIndex = (pageIndex - 1) * pageSize + index + 1;
                  const isChecked = Boolean(customer._id && selectedRowIds.has(customer._id));
                  const palette = AVATAR_PALETTES[index % AVATAR_PALETTES.length];
                  const userInitials = initials(customer.name);

                  // Membership determination
                  const membershipRaw = (customer.membershipType || "none").toLowerCase();
                  const isMember =
                    membershipRaw !== "none" && membershipRaw !== "" && !customer.membershipExpired;
                  const membershipLabel =
                    membershipRaw === "none"
                      ? "Member"
                      : membershipRaw.charAt(0).toUpperCase() + membershipRaw.slice(1);

                  const dueVal = Number(customer.dueAmount || 0);
                  const walletVal = Number(customer.walletAmount || 0);

                  return (
                    <tr
                      key={customer._id || `cust-${index}`}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isChecked ? "bg-purple-50/30" : ""
                      }`}
                    >
                      {/* Index */}
                      <td className="py-3 px-3 text-center text-slate-500 font-medium">
                        {globalIndex}
                      </td>

                      {/* Checkbox */}
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectRow(customer._id)}
                          className="h-4 w-4 rounded border-slate-300 text-[#6344E7] focus:ring-[#6344E7] cursor-pointer"
                        />
                      </td>

                      {/* Customer Avatar + Name */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black uppercase ${palette.bg} ${palette.text}`}
                          >
                            {userInitials}
                          </div>
                          <button
                            type="button"
                            onClick={() => setCustomer360(customer)}
                            className="font-extrabold text-[#2563EB] hover:underline cursor-pointer text-left truncate block max-w-[180px]"
                            title={`View ${customer.name} 360`}
                          >
                            {customer.name || "—"}
                          </button>
                        </div>
                      </td>

                      {/* Contact Info */}
                      {visibleColumns.contactInfo && (
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
                            <Phone size={12} className="text-slate-400 shrink-0" />
                            <span>{customer.mobile || "—"}</span>
                          </div>
                        </td>
                      )}

                      {/* Membership */}
                      {visibleColumns.membership && (
                        <td className="py-3 px-3">
                          {isMember ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200/60 shadow-2xs">
                              <Crown size={12} className="text-emerald-600 fill-emerald-600/20" />
                              <span>{membershipLabel === "Member" ? "Member" : membershipLabel}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                              Non-Member
                            </span>
                          )}
                        </td>
                      )}

                      {/* Wallet Amount */}
                      {visibleColumns.walletAmount && (
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                            <Wallet size={13} className="text-slate-400 shrink-0" />
                            <span>₹{walletVal.toLocaleString("en-IN")}</span>
                          </div>
                        </td>
                      )}

                      {/* Due Amount */}
                      {visibleColumns.dueAmount && (
                        <td className="py-3 px-3">
                          {dueVal > 0 ? (
                            <span className="font-black text-rose-600 tracking-tight">
                              ₹{dueVal.toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">-</span>
                          )}
                        </td>
                      )}

                      {/* Ledger */}
                      {visibleColumns.ledger && (
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailsOpen(false);
                              setDetailsCustomer(null);
                              setSelectedCustomer(customer);
                              setOpenLedgerModal(true);
                            }}
                            title="View Ledger"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition cursor-pointer"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      )}

                      {/* Actions */}
                      {visibleColumns.actions && (
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Edit Customer */}
                            <Can permission={PERMISSIONS.CUSTOMER_UPDATE}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCustomer(customer);
                                  setEditOpen(true);
                                }}
                                title="Edit Customer"
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition cursor-pointer"
                              >
                                <SquarePen size={14} />
                              </button>
                            </Can>

                            {/* Delete Customer */}
                            <Can permission={PERMISSIONS.CUSTOMER_DELETE}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const id = customer._id;
                                  if (id) void handleDelete(id);
                                }}
                                title="Delete Customer"
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </Can>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-slate-100 text-xs text-slate-500">
          <div>
            Showing{" "}
            <span className="font-bold text-slate-800">
              {rowCount === 0 ? 0 : (pageIndex - 1) * pageSize + 1}
            </span>
            –
            <span className="font-bold text-slate-800">
              {Math.min(pageIndex * pageSize, rowCount)}
            </span>{" "}
            of <span className="font-bold text-slate-800">{rowCount.toLocaleString("en-IN")}</span> customers
          </div>

          <div className="flex items-center gap-3">
            {/* Rows per page */}
            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPageIndex(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
              >
                {[10, 25, 50, 100].map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1">
              {/* First Page */}
              <button
                type="button"
                disabled={pageIndex === 1}
                onClick={() => setPageIndex(1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft size={14} />
              </button>

              {/* Prev Page */}
              <button
                type="button"
                disabled={pageIndex === 1}
                onClick={() => setPageIndex((p) => Math.max(1, p - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft size={14} />
              </button>

              {/* Page Number Buttons */}
              {paginationRange.map((pageItem, idx) =>
                pageItem === "..." ? (
                  <span key={`dots-${idx}`} className="px-1 text-slate-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-${pageItem}`}
                    type="button"
                    onClick={() => setPageIndex(Number(pageItem))}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition cursor-pointer ${
                      pageIndex === pageItem
                        ? "bg-[#6344E7] text-white shadow-2xs"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {pageItem}
                  </button>
                ),
              )}

              {/* Next Page */}
              <button
                type="button"
                disabled={pageIndex === totalPages}
                onClick={() => setPageIndex((p) => Math.min(totalPages, p + 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Next Page"
              >
                <ChevronRight size={14} />
              </button>

              {/* Last Page */}
              <button
                type="button"
                disabled={pageIndex === totalPages}
                onClick={() => setPageIndex(totalPages)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Card List View (Small Screens) */}
      <div className="block md:hidden space-y-2.5">
        {loadingCustomers && processedCustomers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
            Loading customers...
          </div>
        ) : processedCustomers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
            No customers found
          </div>
        ) : (
          processedCustomers.map((customer, idx) => {
            const palette = AVATAR_PALETTES[idx % AVATAR_PALETTES.length];
            const membershipRaw = (customer.membershipType || "none").toLowerCase();
            const isMember =
              membershipRaw !== "none" && membershipRaw !== "" && !customer.membershipExpired;
            const membershipLabel =
              membershipRaw === "none"
                ? "Member"
                : membershipRaw.charAt(0).toUpperCase() + membershipRaw.slice(1);
            const userInitials = initials(customer.name);
            const phoneNum = String(customer.mobile || customer.whatsappNumber || "").trim();

            return (
              <div
                key={customer._id || `m-cust-${idx}`}
                onClick={() => setCustomer360(customer)}
                className="cursor-pointer rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xs transition hover:border-slate-300 active:bg-slate-50/70"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black uppercase ${palette.bg} ${palette.text}`}
                    >
                      {userInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {customer.name || "Unnamed Customer"}
                      </h4>
                      {phoneNum && (
                        <p className="mt-0.5 text-xs text-slate-500 font-medium">
                          {phoneNum}
                        </p>
                      )}
                    </div>
                  </div>

                  {isMember ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                      <Crown size={10} className="text-emerald-600 fill-emerald-600/20" />
                      <span>{membershipLabel}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      Non-Member
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="block text-[10px] font-medium uppercase text-slate-400">
                        Wallet
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        ₹{Number(customer.walletAmount || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    {Number(customer.dueAmount || 0) > 0 && (
                      <div>
                        <span className="block text-[10px] font-medium uppercase text-slate-400">
                          Due
                        </span>
                        <span className="text-xs font-bold text-rose-600">
                          ₹{Number(customer.dueAmount).toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setOpenLedgerModal(true);
                      }}
                      className="cursor-pointer rounded-lg bg-indigo-50 p-1.5 text-indigo-700 hover:bg-indigo-100"
                      title="View Ledger"
                    >
                      <Eye size={15} />
                    </button>
                    <Can permission={PERMISSIONS.CUSTOMER_UPDATE}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setEditOpen(true);
                        }}
                        className="cursor-pointer rounded-lg bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100"
                        title="Edit Customer"
                      >
                        <SquarePen size={15} />
                      </button>
                    </Can>
                    <Can permission={PERMISSIONS.CUSTOMER_DELETE}>
                      <button
                        type="button"
                        onClick={() => {
                          const id = customer._id;
                          if (id) void handleDelete(id);
                        }}
                        className="cursor-pointer rounded-lg bg-rose-50 p-1.5 text-rose-700 hover:bg-rose-100"
                        title="Delete Customer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </Can>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
            <span>
              Page {pageIndex} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pageIndex === 1}
                onClick={() => setPageIndex((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white font-semibold disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pageIndex === totalPages}
                onClick={() => setPageIndex((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {openCreateCustomerModal && (
        <CreateCustomerModal
          onClose={() => setOpenCreateCustomerModal(false)}
          onSubmit={handleCreateCustomerSubmit}
          loading={creatingCustomer}
        />
      )}

      {openImportModal && (
        <ImportCustomersModal
          open={openImportModal}
          onClose={() => setOpenImportModal(false)}
          onImportSuccess={() => void fetchCustomers()}
        />
      )}

      {editOpen && selectedCustomer && (
        <UpdateCustomerModal
          customer={selectedCustomer}
          onClose={() => {
            setEditOpen(false);
            setSelectedCustomer(null);
          }}
          onSubmit={handleUpdateCustomerSubmit}
          loading={updatingCustomer}
        />
      )}

      {detailsOpen && detailsCustomer && (
        <CustomerDetailsModal
          customer={detailsCustomer}
          onClose={() => {
            setDetailsOpen(false);
            setDetailsCustomer(null);
          }}
        />
      )}

      {customer360 && (
        <Customer360Modal
          customer={customer360}
          onClose={() => setCustomer360(null)}
          onChanged={() => void fetchCustomers()}
        />
      )}

      {openLedgerModal && selectedCustomer && (
        <LedgerModal
          customer={selectedCustomer}
          onClose={() => {
            setOpenLedgerModal(false);
            setSelectedCustomer(null);
          }}
        />
      )}
    </div>
  );
}

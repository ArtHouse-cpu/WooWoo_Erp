import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Copy,
  Crown,
  Filter,
  LayoutGrid,
  MapPin,
  MoreVertical,
  Package,
  Pencil,
  PlayCircle,
  Plus,
  Power,
  RotateCcw,
  Search,
  Tag,
  TicketPercent,
  Trash2,
  Type,
  Users,
  Utensils,
  X,
  type LucideIcon,
} from "lucide-react";
import Swal from "sweetalert2";
import { closeIfConfirmed } from "@/utils/confirmClose";
import {
  handleActivateCoupon,
  handleCreateCoupon,
  handleDeactivateCoupon,
  handleDeleteCoupon,
  handleGetCoupons,
  handleUpdateCoupon,
  type CouponApplicableOn,
  type CouponPayload,
} from "@/services/apiClient";
import { useAppSelector } from "@/store/hooks";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";

type CouponRow = CouponPayload & {
  _id: string;
  usedCount?: number;
};

type StatusFilter = "all" | "active" | "inactive";
type CouponTab = "all" | "store" | "space" | "food" | "membership";

const COUPON_TABS: {
  id: CouponTab;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "all", label: "All", icon: LayoutGrid },
  { id: "store", label: "Store", icon: Package },
  { id: "space", label: "Space", icon: MapPin },
  { id: "food", label: "Food", icon: Utensils },
  { id: "membership", label: "Membership", icon: Crown },
];

const APPLICABLE_OPTIONS: {
  value: CouponApplicableOn;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "all", label: "All", icon: LayoutGrid },
  { value: "store", label: "Store", icon: Package },
  { value: "space", label: "Space", icon: MapPin },
  { value: "service", label: "Service", icon: Briefcase },
  { value: "food", label: "Food", icon: Utensils },
  { value: "membership", label: "Membership", icon: Crown },
];

function defaultExpiryYmd() {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  end.setMonth(end.getMonth() + 1);
  const y = end.getFullYear();
  const m = String(end.getMonth() + 1).padStart(2, "0");
  const d = String(end.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const initialForm = (): CouponPayload => ({
  code: "",
  title: "",
  description: "",
  discountType: "percentage",
  discountValue: 10,
  minOrderAmount: 0,
  maxDiscountAmount: null,
  startsAt: null,
  expiresAt: defaultExpiryYmd(),
  usageLimit: null,
  perCustomerLimit: null,
  applicableOn: ["all"],
  isActive: true,
});

function toggleApplicableOn(
  current: CouponApplicableOn[],
  next: CouponApplicableOn,
): CouponApplicableOn[] {
  if (next === "all") return ["all"];
  const withoutAll = current.filter((v) => v !== "all");
  if (withoutAll.includes(next)) {
    const removed = withoutAll.filter((v) => v !== next);
    return removed.length ? removed : ["all"];
  }
  return [...withoutAll, next];
}

function FieldLabel({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1.5 block text-sm font-semibold text-slate-800">
      {children}
      {required ? <span className="text-red-500"> *</span> : null}
    </label>
  );
}

function IconInput({
  icon: Icon,
  suffix,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  icon: LucideIcon;
  suffix?: string;
}) {
  return (
    <div className="relative">
      <Icon
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-violet-600"
      />
      <input
        {...props}
        className={`h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 ${
          suffix ? "pr-12" : "pr-3"
        } ${className}`}
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-1.5 top-1/2 flex h-8 min-w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-violet-100 px-2 text-sm font-semibold text-violet-700">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

function formatExpiry(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDiscount(row: CouponRow): string {
  const value = Number(row.discountValue) || 0;
  if (row.discountType === "percentage") return `${value}%`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function toDateInput(value: unknown): string {
  if (!value) return "";
  return String(value).slice(0, 10);
}



export default function CouponsScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryTab, setCategoryTab] = useState<CouponTab>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [actionMenu, setActionMenu] = useState<{
    anchorEl: HTMLElement;
    coupon: CouponRow;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponPayload>(() => initialForm());
  const [limitPerCustomer, setLimitPerCustomer] = useState(false);
  const staff = useAppSelector((state) => state.user);

  // Top KPI calculations
  const activeCouponsCount = useMemo(() => {
    return coupons.filter((c) => Boolean(c.isActive)).length;
  }, [coupons]);

  const totalUsageCount = useMemo(() => {
    return coupons.reduce((sum, c) => sum + (Number(c.usedCount) || 0), 0);
  }, [coupons]);

  // Tab counts for (All, Store, Space, Food, Membership)
  const tabCounts = useMemo(() => {
    const counts: Record<CouponTab, number> = {
      all: coupons.length,
      store: 0,
      space: 0,
      food: 0,
      membership: 0,
    };
    for (const c of coupons) {
      const applicable =
        Array.isArray(c.applicableOn) && c.applicableOn.length
          ? c.applicableOn
          : ["all"];
      if (applicable.includes("store")) counts.store += 1;
      if (applicable.includes("space")) counts.space += 1;
      if (applicable.includes("food")) counts.food += 1;
      if (applicable.includes("membership")) counts.membership += 1;
    }
    return counts;
  }, [coupons]);

  useEffect(() => {
    if (searchParams.get("create") !== "1") return;
    setForm(initialForm());
    setEditingId(null);
    setModalOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("create");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  const filtersRef = useRef<HTMLDivElement>(null);

  const closeActionMenu = () => setActionMenu(null);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await handleGetCoupons({ search: "" });
      setCoupons(Array.isArray(response?.coupons) ? response.coupons : []);
    } catch {
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCoupons();
  }, []);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (filtersRef.current && !filtersRef.current.contains(target)) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return coupons.filter((c) => {
      // Filter by category tab (All, Store, Space, Food, Membership)
      if (categoryTab !== "all") {
        const applicable =
          Array.isArray(c.applicableOn) && c.applicableOn.length
            ? c.applicableOn
            : ["all"];
        if (!applicable.includes(categoryTab)) return false;
      }
      if (statusFilter === "active" && !c.isActive) return false;
      if (statusFilter === "inactive" && c.isActive) return false;
      if (!q) return true;
      return (
        String(c.code ?? "")
          .toLowerCase()
          .includes(q) ||
        String(c.title ?? "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [coupons, search, statusFilter, categoryTab]);

  const resetForm = () => {
    setForm(initialForm());
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    if (categoryTab !== "all") {
      setForm((prev) => ({
        ...prev,
        applicableOn: [categoryTab],
      }));
    }
    setModalOpen(true);
  };




  const openEdit = (coupon: CouponRow) => {
    setEditingId(coupon._id);
    setForm({
      code: coupon.code,
      title: coupon.title,
      description: coupon.description ?? "",
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount ?? 0,
      maxDiscountAmount: coupon.maxDiscountAmount ?? null,
      startsAt: coupon.startsAt ? String(coupon.startsAt).slice(0, 10) : null,
      expiresAt: coupon.expiresAt ? String(coupon.expiresAt).slice(0, 10) : "",
      usageLimit: coupon.usageLimit ?? null,
      perCustomerLimit: coupon.perCustomerLimit ?? null,
      applicableOn:
        Array.isArray(coupon.applicableOn) && coupon.applicableOn.length
          ? coupon.applicableOn
          : ["all"],
      isActive: Boolean(coupon.isActive),
    });
    closeActionMenu();
    setLimitPerCustomer(Number(coupon.perCustomerLimit) > 0);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };
  const requestCloseModal = () => {
    void closeIfConfirmed(closeModal);
  };

  const submit = async () => {
    if (!form.code.trim() || !form.title.trim() || !form.expiresAt) {
      Swal.fire(
        "Missing fields",
        "Code, title and expiry are required.",
        "warning",
      );
      return;
    }
    if (limitPerCustomer && !(Number(form.perCustomerLimit) > 0)) {
      Swal.fire(
        "Missing limit",
        "Enter how many times each customer can use this coupon.",
        "warning",
      );
      return;
    }
    try {
      setSaving(true);
      const payload: CouponPayload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        title: form.title.trim(),
        maxDiscountAmount:
          form.maxDiscountAmount && Number(form.maxDiscountAmount) > 0
            ? Number(form.maxDiscountAmount)
            : null,
        usageLimit:
          form.usageLimit && Number(form.usageLimit) > 0
            ? Number(form.usageLimit)
            : null,
        perCustomerLimit:
          limitPerCustomer && Number(form.perCustomerLimit) > 0
            ? Math.floor(Number(form.perCustomerLimit))
            : null,
        applicableOn: form.applicableOn?.length
          ? form.applicableOn
          : ["all"],
        createdBy: {
          m_staff_id: staff.m_staff_id,
          m_staff_name: staff.m_staff_name,
          m_staff_email: staff.m_staff_email,
        },
      };
      if (editingId) {
        await handleUpdateCoupon(editingId, payload);
      } else {
        await handleCreateCoupon(payload);
      }
      await fetchCoupons();
      closeModal();
      Swal.fire("Saved", "Coupon saved successfully.", "success");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Save failed",
        err?.response?.data?.message ?? "Could not save coupon.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon: CouponRow) => {
    closeActionMenu();
    try {
      if (coupon.isActive) await handleDeactivateCoupon(coupon._id);
      else await handleActivateCoupon(coupon._id);
      await fetchCoupons();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Update failed",
        err?.response?.data?.message ?? "Could not update status.",
        "error",
      );
    }
  };

  const duplicateCoupon = (coupon: CouponRow) => {
    closeActionMenu();
    setEditingId(null);
    setForm({
      code: `${String(coupon.code || "COUPON").slice(0, 12)}COPY`,
      title: `${coupon.title || "Coupon"} (Copy)`,
      description: coupon.description ?? "",
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount ?? 0,
      maxDiscountAmount: coupon.maxDiscountAmount ?? null,
      startsAt: null,
      expiresAt: coupon.expiresAt
        ? String(coupon.expiresAt).slice(0, 10)
        : defaultExpiryYmd(),
      usageLimit: coupon.usageLimit ?? null,
      perCustomerLimit: coupon.perCustomerLimit ?? null,
      applicableOn:
        Array.isArray(coupon.applicableOn) && coupon.applicableOn.length
          ? coupon.applicableOn
          : ["all"],
      isActive: true,
    });
    setModalOpen(true);
    setLimitPerCustomer(Number(coupon.perCustomerLimit) > 0);
  };

  const removeCoupon = async (coupon: CouponRow) => {
    closeActionMenu();
    const result = await Swal.fire({
      title: "Delete coupon?",
      text: `${coupon.code} will be removed permanently.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#7c3aed",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Delete",
    });
    if (!result.isConfirmed) return;
    try {
      await handleDeleteCoupon(coupon._id);
      await fetchCoupons();
      Swal.fire({
        title: "Deleted",
        icon: "success",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Delete failed",
        err?.response?.data?.message ?? "Could not delete coupon.",
        "error",
      );
    }
  };

  const columns = useMemo<MRT_ColumnDef<CouponRow>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Code",
        size: 120,
        Cell: ({ cell }) => (
          <span className="font-bold uppercase tracking-wide text-slate-900">
            {String(cell.getValue() ?? "")}
          </span>
        ),
      },
      {
        accessorKey: "title",
        header: "Title",
        size: 180,
        Cell: ({ cell }) => (
          <span className="text-slate-800">{String(cell.getValue() ?? "")}</span>
        ),
      },
      {
        id: "discount",
        header: "Discount",
        size: 110,
        accessorFn: (row) => formatDiscount(row),
        Cell: ({ row }) => (
          <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
            {formatDiscount(row.original)}
          </span>
        ),
      },
      {
        id: "minOrder",
        header: "Min Order",
        size: 110,
        accessorFn: (row) => Number(row.minOrderAmount ?? 0),
        Cell: ({ cell }) => (
          <span className="tabular-nums text-slate-700">
            ₹{Number(cell.getValue() ?? 0).toLocaleString("en-IN")}
          </span>
        ),
      },
      {
        id: "expiry",
        header: "Expires On",
        size: 120,
        accessorFn: (row) => row.expiresAt ?? "",
        Cell: ({ row }) => (
          <span className="text-slate-700">
            {formatExpiry(row.original.expiresAt)}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        size: 110,
        accessorFn: (row) => (row.isActive ? "Active" : "Inactive"),
        Cell: ({ row }) => {
          const active = Boolean(row.original.isActive);
          return (
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                active
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-600"
              }`}
            >
              {active ? "Active" : "Inactive"}
            </span>
          );
        },
      },
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: filtered,
    state: { isLoading: loading },
    enableRowActions: true,
    positionActionsColumn: "last",
    displayColumnDefOptions: {
      "mrt-row-actions": {
        header: "Action",
        size: 88,
      },
    },
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
    },
    muiTablePaperProps: {
      elevation: 0,
      style: { boxShadow: "none", border: "1px solid #e5e7eb" },
    },
    muiTableContainerProps: {
      sx: {
        maxWidth: "100%",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      },
    },
    muiTableBodyRowProps: ({ row }) => ({
      sx: {
        backgroundColor:
          actionMenu?.coupon._id === row.original._id
            ? "#f5f3ff"
            : undefined,
      },
    }),
    renderRowActions: ({ row }) => (
      <Can anyOf={[PERMISSIONS.COUPON_MANAGE, PERMISSIONS.COUPON_READ]}>
        <IconButton
          size="small"
          aria-label="Coupon actions"
          onClick={(event) => {
            event.stopPropagation();
            setActionMenu({
              anchorEl: event.currentTarget,
              coupon: row.original,
            });
          }}
          sx={{
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            width: 36,
            height: 36,
            color: "#64748b",
            backgroundColor: "#fff",
            "&:hover": { backgroundColor: "#f8fafc", color: "#0f172a" },
          }}
        >
          <MoreVertical size={16} />
        </IconButton>
      </Can>
    ),
  });

  const discountSuffix = form.discountType === "percentage" ? "%" : "₹";

  return (
    <div className="min-w-0 space-y-4 p-1 sm:p-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
         
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Coupons
          </h1>
        </div>
        <Can permission={PERMISSIONS.COUPON_MANAGE}>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
          >
            <Plus size={16} />
            Create 
          </button>
        </Can>
      </div>

      {/* KPI Cards above search bar: Active Coupons & Usage Count */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        {/* Active Coupons Card */}
        <div className="relative min-w-0 overflow-hidden rounded-2xl border border-emerald-100/90 bg-emerald-50/60 p-2.5 sm:p-3.5 shadow-2xs transition duration-300 hover:shadow-md hover:border-emerald-200">
          <TicketPercent
            className="absolute -right-2 -bottom-2 sm:-right-3 sm:-bottom-3 h-14 w-14 sm:h-20 sm:w-20 stroke-[1.2] pointer-events-none text-emerald-200/50 transition-transform duration-300"
          />
          <div className="relative z-10 flex items-center gap-2 sm:gap-2.5">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs shadow-emerald-500/20">
              <TicketPercent className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span
                className="block truncate text-[10px] sm:text-xs font-bold text-slate-800"
                title="Active Coupons"
              >
                Active Coupons
              </span>
              <div className="mt-0.5 text-lg sm:text-2xl font-extrabold tabular-nums text-slate-900">
                {activeCouponsCount}
              </div>
            </div>
          </div>
        </div>

        {/* Usage Count Card */}
        <div className="relative min-w-0 overflow-hidden rounded-2xl border border-violet-100/90 bg-violet-50/60 p-2.5 sm:p-3.5 shadow-2xs transition duration-300 hover:shadow-md hover:border-violet-200">
          <Users
            className="absolute -right-2 -bottom-2 sm:-right-3 sm:-bottom-3 h-14 w-14 sm:h-20 sm:w-20 stroke-[1.2] pointer-events-none text-violet-200/50 transition-transform duration-300"
          />
          <div className="relative z-10 flex items-center gap-2 sm:gap-2.5">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-xs shadow-violet-500/20">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span
                className="block truncate text-[10px] sm:text-xs font-bold text-slate-800"
                title="Usage Count"
              >
                Usage Count
              </span>
              <div className="mt-0.5 text-lg sm:text-2xl font-extrabold tabular-nums text-slate-900">
                {totalUsageCount.toLocaleString("en-IN")}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code or title..."
            className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </div>
        <div className="relative shrink-0" ref={filtersRef}>
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className={`inline-flex h-10 sm:h-11 items-center justify-center gap-1.5 sm:gap-2 rounded-xl border bg-white px-3 sm:px-4 text-xs sm:text-sm font-medium transition shrink-0 ${
              statusFilter !== "all"
                ? "border-violet-300 text-violet-700 bg-violet-50/50"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Filter size={15} />
            <span>Filters</span>
            {statusFilter !== "all" ? (
              <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />
            ) : null}
          </button>
          {filtersOpen ? (
            <div className="absolute right-0 z-20 mt-1.5 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              {(
                [
                  ["all", "All statuses"],
                  ["active", "Active only"],
                  ["inactive", "Inactive only"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(value);
                    setFiltersOpen(false);
                  }}
                  className={`flex w-full px-3 py-2 text-left text-xs sm:text-sm ${
                    statusFilter === value
                      ? "bg-violet-50 font-semibold text-violet-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Tabs below search bar: All, Store, Space, Food, Membership */}
      <div className="overflow-x-auto scrollbar-none -mx-1 px-1 sm:mx-0 sm:px-0">
        <div className="inline-flex min-w-full sm:min-w-0 items-center gap-1.5 rounded-2xl border border-violet-100/80 bg-violet-50/20 p-1 shadow-2xs">
          {COUPON_TABS.map((tab) => {
            const isActive = categoryTab === tab.id;
            const Icon = tab.icon;
            const count = tabCounts[tab.id];

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryTab(tab.id)}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl py-2 px-3 sm:px-4 text-xs sm:text-sm font-bold whitespace-nowrap transition duration-200 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20"
                    : "bg-white/90 text-slate-700 hover:bg-white hover:text-slate-900 border border-slate-200/50"
                }`}
              >
                <Icon
                  size={15}
                  className={isActive ? "text-white" : "text-slate-500"}
                />
                <span>{tab.label}</span>
                <span
                  className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    isActive
                      ? "bg-white text-violet-700 shadow-2xs"
                      : "bg-violet-100/70 text-violet-800"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <MaterialReactTable table={table} />
      </div>

      {/* Mobile Card Form View */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
            <p className="mt-2 text-xs">Loading coupons...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <TicketPercent className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-xs font-semibold text-slate-700">No coupons found</p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {search || statusFilter !== "all" || categoryTab !== "all"
                ? "Try adjusting your search, filters, or category tab"
                : "Create your first coupon to get started"}
            </p>
          </div>
        ) : (
          filtered.map((coupon) => (
            <div
              key={coupon._id}
              className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs space-y-2.5 transition hover:border-slate-300"
            >
              {/* Top Row: Coupon Code + Status + Action Menu */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-violet-300 bg-violet-50/70 px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wider text-violet-800">
                    <Tag size={12} className="text-violet-600" />
                    <span>{coupon.code}</span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      coupon.isActive
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                        : "bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-600/20"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        coupon.isActive ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />
                    {coupon.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Actions button */}
                <Can anyOf={[PERMISSIONS.COUPON_MANAGE, PERMISSIONS.COUPON_READ]}>
                  <button
                    type="button"
                    aria-label="Coupon actions"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActionMenu({
                        anchorEl: e.currentTarget,
                        coupon,
                      });
                    }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                  >
                    <MoreVertical size={16} />
                  </button>
                </Can>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {coupon.title}
                </h3>
                {coupon.description ? (
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                    {coupon.description}
                  </p>
                ) : null}
              </div>

              {/* Key Metrics Grid: Discount, Min Order */}
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 border border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-600 block">
                    Discount
                  </span>
                  <span className="font-extrabold text-violet-700 text-sm">
                    {formatDiscount(coupon)}
                    {coupon.maxDiscountAmount ? (
                      <span className="text-[10px] font-normal text-slate-500 ml-1">
                        (max ₹{Number(coupon.maxDiscountAmount).toLocaleString("en-IN")})
                      </span>
                    ) : null}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-600 block">
                    Min Order
                  </span>
                  <span className="font-bold text-slate-800 text-sm">
                    ₹{Number(coupon.minOrderAmount ?? 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Extra Details: Expiry, Usage & Applicable On */}
              <div className="space-y-1.5 pt-0.5 text-xs text-slate-600 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                    <Calendar size={13} className="text-slate-600 shrink-0" />
                    <span>Expires:</span>
                  </span>
                  <span className="font-semibold text-slate-700 text-[11px]">
                    {formatExpiry(coupon.expiresAt)}
                  </span>
                </div>

                {(coupon.usageLimit !== null && coupon.usageLimit !== undefined) ||
                (coupon.usedCount !== undefined && coupon.usedCount > 0) ? (
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                      <Users size={13} className="text-slate-600 shrink-0" />
                      <span>Usage:</span>
                    </span>
                    <span className="font-semibold text-slate-700 text-[11px]">
                      {coupon.usedCount ?? 0}
                      {coupon.usageLimit ? ` / ${coupon.usageLimit}` : " used"}
                    </span>
                  </div>
                ) : null}

                {Array.isArray(coupon.applicableOn) && coupon.applicableOn.length > 0 ? (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[10px] font-semibold text-slate-600 uppercase shrink-0">
                      Applies to:
                    </span>
                    <div className="flex flex-wrap justify-end gap-1">
                      {coupon.applicableOn.map((opt) => (
                        <span
                          key={opt}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 capitalize"
                        >
                          {opt}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      <Menu
        anchorEl={actionMenu?.anchorEl ?? null}
        open={Boolean(actionMenu)}
        onClose={closeActionMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              minWidth: 180,
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
              py: 0.5,
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            if (!actionMenu) return;
            openEdit(actionMenu.coupon);
          }}
          sx={{ py: 1.25, px: 1.5, gap: 0.5 }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            <Pencil size={16} color="#3b82f6" />
          </ListItemIcon>
          <ListItemText
            primary="Edit"
            primaryTypographyProps={{ fontSize: 14, color: "#334155" }}
          />
        </MenuItem>
        <Can permission={PERMISSIONS.COUPON_MANAGE}>
          <MenuItem
            onClick={() => {
              if (!actionMenu) return;
              duplicateCoupon(actionMenu.coupon);
            }}
            sx={{ py: 1.25, px: 1.5, gap: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Copy size={16} color="#64748b" />
            </ListItemIcon>
            <ListItemText
              primary="Duplicate"
              primaryTypographyProps={{ fontSize: 14, color: "#334155" }}
            />
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (!actionMenu) return;
              void toggleActive(actionMenu.coupon);
            }}
            sx={{ py: 1.25, px: 1.5, gap: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              {actionMenu?.coupon.isActive ? (
                <Power size={16} color="#64748b" />
              ) : (
                <PlayCircle size={16} color="#64748b" />
              )}
            </ListItemIcon>
            <ListItemText
              primary={
                actionMenu?.coupon.isActive ? "Deactivate" : "Activate"
              }
              primaryTypographyProps={{ fontSize: 14, color: "#334155" }}
            />
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (!actionMenu) return;
              void removeCoupon(actionMenu.coupon);
            }}
            sx={{ py: 1.25, px: 1.5, gap: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Trash2 size={16} color="#e11d48" />
            </ListItemIcon>
            <ListItemText
              primary="Delete"
              primaryTypographyProps={{
                fontSize: 14,
                fontWeight: 500,
                color: "#e11d48",
              }}
            />
          </MenuItem>
        </Can>
      </Menu>

      {modalOpen
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-4">
              <button
                type="button"
                aria-label="Close overlay"
                className="absolute inset-0 cursor-default"
                onClick={requestCloseModal}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="coupon-modal-title"
                className="relative z-[1] flex max-h-[min(94vh,100dvh)] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl"
              >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <button
                      type="button"
                      onClick={requestCloseModal}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 sm:hidden"
                      aria-label="Back"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                      <TicketPercent size={18} />
                    </span>
                    <h2
                      id="coupon-modal-title"
                      className="text-lg font-bold text-slate-900"
                    >
                      {editingId ? "Edit Coupon" : "Create Coupon"}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={requestCloseModal}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="min-h-0 flex-1 space-y-4 sm:space-y-5 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5">
                  {/* Row 1: Coupon Code & Title (Two in one row) */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <FieldLabel required>Coupon Code</FieldLabel>
                      <IconInput
                        icon={Tag}
                        placeholder="E.g. SAVE10"
                        value={form.code}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            code: e.target.value.toUpperCase(),
                          }))
                        }
                        className="uppercase"
                      />
                    </div>
                    <div>
                      <FieldLabel required>Title</FieldLabel>
                      <IconInput
                        icon={Type}
                        placeholder="E.g. Weekend Offer"
                        value={form.title}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  {/* Row 2: Discount Type & Discount Value (Two in one row) */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <FieldLabel required>Discount Type</FieldLabel>
                      <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              discountType: "percentage",
                            }))
                          }
                          className={`inline-flex h-11 items-center justify-center gap-1 rounded-xl border text-xs sm:text-sm font-semibold transition px-1 ${
                            form.discountType === "percentage"
                              ? "border-violet-600 bg-violet-600 text-white shadow-2xs"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span className="text-sm sm:text-base font-bold">%</span>
                          <span>Percent</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              discountType: "flat",
                            }))
                          }
                          className={`inline-flex h-11 items-center justify-center gap-1 rounded-xl border text-xs sm:text-sm font-semibold transition px-1 ${
                            form.discountType === "flat"
                              ? "border-violet-600 bg-violet-600 text-white shadow-2xs"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span className="text-sm sm:text-base font-bold">₹</span>
                          <span>Fixed</span>
                        </button>
                      </div>
                    </div>
                    <div>
                      <FieldLabel required>Discount Value</FieldLabel>
                      <IconInput
                        icon={Tag}
                        type="number"
                        min={0}
                        value={form.discountValue}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            discountValue: Number(e.target.value) || 0,
                          }))
                        }
                        suffix={discountSuffix}
                      />
                    </div>
                  </div>

                  {/* Row 3: Applicable On */}
                  <div>
                    <FieldLabel required>Applicable On</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {APPLICABLE_OPTIONS.map(({ value, label, icon: Icon }) => {
                        const selected = (form.applicableOn ?? ["all"]).includes(
                          value,
                        );
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                applicableOn: toggleApplicableOn(
                                  prev.applicableOn ?? ["all"],
                                  value,
                                ),
                              }))
                            }
                            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs sm:text-sm font-medium transition cursor-pointer ${
                              selected
                                ? "border-violet-400 bg-violet-50 text-violet-700 font-semibold"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <Icon
                              size={14}
                              className={
                                selected ? "text-violet-600" : "text-slate-500"
                              }
                            />
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Row 4: Minimum Order (INR) & Expiry Date (Two in one row) */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <FieldLabel>Minimum Order (INR)</FieldLabel>
                      <IconInput
                        icon={Tag}
                        type="number"
                        min={0}
                        placeholder="E.g. 500"
                        value={form.minOrderAmount || ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            minOrderAmount: Number(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <FieldLabel required>Expiry Date</FieldLabel>
                      <IconInput
                        icon={Calendar}
                        type="date"
                        value={toDateInput(form.expiresAt)}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            expiresAt: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  {/* Row 5: Max Usage & Uses Per Customer (Two in one row) */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 items-start">
                    <div>
                      <FieldLabel>Max Usage</FieldLabel>
                      <IconInput
                        icon={Users}
                        type="number"
                        min={0}
                        placeholder="E.g. 100"
                        value={form.usageLimit ?? ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            usageLimit: e.target.value
                              ? Number(e.target.value) || null
                              : null,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <FieldLabel>Uses Per Customer</FieldLabel>
                        <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600">
                          <input
                            type="checkbox"
                            checked={limitPerCustomer}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setLimitPerCustomer(checked);
                              if (!checked) {
                                setForm((prev) => ({ ...prev, perCustomerLimit: null }));
                              } else if (!form.perCustomerLimit) {
                                setForm((prev) => ({ ...prev, perCustomerLimit: 1 }));
                              }
                            }}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                          />
                          <span className="text-[11px]">Limit</span>
                        </label>
                      </div>
                      {limitPerCustomer ? (
                        <div>
                          <IconInput
                            icon={Users}
                            type="number"
                            min={1}
                            step={1}
                            placeholder="E.g. 1"
                            value={form.perCustomerLimit ?? ""}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                perCustomerLimit: e.target.value
                                  ? Math.max(1, Math.floor(Number(e.target.value) || 0))
                                  : null,
                              }))
                            }
                          />
                          {Number(form.perCustomerLimit) > 0 && (
                            <p className="mt-1 text-[11px] text-slate-500 truncate">
                              {Math.floor(Number(form.perCustomerLimit))} use(s) per customer
                            </p>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setLimitPerCustomer(true);
                            setForm((prev) => ({ ...prev, perCustomerLimit: 1 }));
                          }}
                          className="flex h-11 w-full items-center justify-between rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-3 text-xs text-slate-500 hover:border-violet-300 hover:bg-violet-50/50 hover:text-violet-700 transition cursor-pointer"
                        >
                          <span>Unlimited</span>
                          <span className="text-[10px] text-violet-600 font-semibold underline">Set limit</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2 border-t border-slate-100 bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
                  <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={saving}
                    className="inline-flex h-11 flex-[1.4] items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60"
                  >
                    <Tag size={16} />
                    {saving
                      ? "Saving..."
                      : editingId
                        ? "Update Coupon"
                        : "Create Coupon"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm(initialForm());
                      setLimitPerCustomer(false);
                    }}
                  >
                    <RotateCcw size={16} />
                    Reset
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
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
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
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
  const staff = useAppSelector((state) => state.user);
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
  }, [coupons, search, statusFilter]);

  const resetForm = () => {
    setForm(initialForm());
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
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
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
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
          form.perCustomerLimit && Number(form.perCustomerLimit) > 0
            ? Number(form.perCustomerLimit)
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
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
            <TicketPercent size={18} />
          </span>
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
            Create Coupon
          </button>
        </Can>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code or title..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </div>
        <div className="relative shrink-0" ref={filtersRef}>
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border bg-white px-4 text-sm font-medium transition sm:w-auto ${
              statusFilter !== "all"
                ? "border-violet-300 text-violet-700"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Filter size={16} />
            Filters
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
                  className={`flex w-full px-3 py-2 text-left text-sm ${
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

      <MaterialReactTable table={table} />

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
                onClick={closeModal}
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
                      onClick={closeModal}
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
                    onClick={closeModal}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel required>Discount Type</FieldLabel>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              discountType: "percentage",
                            }))
                          }
                          className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold transition ${
                            form.discountType === "percentage"
                              ? "border-violet-600 bg-violet-600 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span className="text-base">%</span> Percentage
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              discountType: "flat",
                            }))
                          }
                          className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold transition ${
                            form.discountType === "flat"
                              ? "border-violet-600 bg-violet-600 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span className="text-base">₹</span> Fixed Amount
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
                            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                              selected
                                ? "border-violet-400 bg-violet-50 text-violet-700"
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

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                    onClick={() => setForm(initialForm())}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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

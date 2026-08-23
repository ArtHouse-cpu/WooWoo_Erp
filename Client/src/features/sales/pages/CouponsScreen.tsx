import { useEffect, useMemo, useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
import {
  Briefcase,
  Calendar,
  Filter,
  LayoutGrid,
  MapPin,
  Package,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  Search,
  ShoppingBag,
  Tag,
  TicketPercent,
  Trash2,
  Type,
  User,
  Utensils,
  Crown,
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

function defaultDateRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  const ymd = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  return { startsAt: ymd(start), expiresAt: ymd(end) };
}

const initialForm = (): CouponPayload => {
  const range = defaultDateRange();
  return {
    code: "",
    title: "",
    description: "",
    discountType: "percentage",
    discountValue: 10,
    minOrderAmount: 0,
    maxDiscountAmount: 0,
    startsAt: range.startsAt,
    expiresAt: range.expiresAt,
    usageLimit: 0,
    perCustomerLimit: 0,
    applicableOn: ["all"],
    isActive: true,
  };
};

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
    <label className="mb-1.5 block text-sm font-medium text-slate-700">
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
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        {...props}
        className={`h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 ${
          suffix ? "pr-10" : "pr-3"
        } ${className}`}
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponPayload>(() => initialForm());
  const staff = useAppSelector((state) => state.user);
  const filtersRef = useRef<HTMLDivElement>(null);

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
      maxDiscountAmount: coupon.maxDiscountAmount ?? 0,
      startsAt: coupon.startsAt ? String(coupon.startsAt).slice(0, 10) : null,
      expiresAt: coupon.expiresAt ? String(coupon.expiresAt).slice(0, 10) : "",
      usageLimit: coupon.usageLimit ?? 0,
      perCustomerLimit: coupon.perCustomerLimit ?? 0,
      applicableOn:
        Array.isArray(coupon.applicableOn) && coupon.applicableOn.length
          ? coupon.applicableOn
          : ["all"],
      isActive: Boolean(coupon.isActive),
    });
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
        applicableOn:
          form.applicableOn?.length ? form.applicableOn : ["all"],
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

  const removeCoupon = async (coupon: CouponRow) => {
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
        size: 130,
        Cell: ({ cell }) => (
          <span className="font-semibold uppercase tracking-wide text-slate-900">
            {String(cell.getValue() ?? "")}
          </span>
        ),
      },
      {
        accessorKey: "title",
        header: "Title",
        size: 160,
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
          <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
            {formatDiscount(row.original)}
          </span>
        ),
      },
      {
        id: "minOrder",
        header: "Min. Order",
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
        header: "Expiry",
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
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {active ? "Active" : "Inactive"}
            </span>
          );
        },
      },
      {
        id: "applicableOn",
        header: "Applies To",
        size: 180,
        enableSorting: false,
        accessorFn: (row) =>
          Array.isArray(row.applicableOn) && row.applicableOn.length
            ? row.applicableOn.join(", ")
            : "all",
        Cell: ({ row }) => {
          const scopes =
            Array.isArray(row.original.applicableOn) &&
            row.original.applicableOn.length
              ? row.original.applicableOn
              : ["all"];
          return (
            <div className="flex flex-wrap gap-1">
              {scopes.map((scope) => (
                <span
                  key={scope}
                  className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600"
                >
                  {scope}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        size: 140,
        minSize: 130,
        enableSorting: false,
        enableColumnFilter: false,
        Cell: ({ row }) => {
          const coupon = row.original;
          return (
            <Can
              anyOf={[PERMISSIONS.COUPON_MANAGE, PERMISSIONS.COUPON_READ]}
            >
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  title="Edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(coupon);
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
                >
                  <Pencil size={15} />
                </button>
                <Can permission={PERMISSIONS.COUPON_MANAGE}>
                  <button
                    type="button"
                    title={coupon.isActive ? "Deactivate" : "Activate"}
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleActive(coupon);
                    }}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                      coupon.isActive
                        ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                        : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
                    }`}
                  >
                    <Power size={15} />
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      void removeCoupon(coupon);
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
                  >
                    <Trash2 size={15} />
                  </button>
                </Can>
              </div>
            </Can>
          );
        },
      },
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: filtered,
    state: { isLoading: loading, globalFilter: search },
    enableGlobalFilter: false,
    enableColumnFilters: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enableHiding: false,
    enableColumnActions: false,
    enableColumnPinning: true,
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
      density: "comfortable",
      columnPinning: { right: ["actions"] },
    },
    muiTablePaperProps: {
      elevation: 0,
      sx: {
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        boxShadow: "none",
        overflow: "hidden",
      },
    },
    muiTableContainerProps: {
      sx: {
        maxWidth: "100%",
        overflowX: "auto",
      },
    },
    muiTableHeadCellProps: {
      sx: {
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "#64748b",
        backgroundColor: "#f8fafc",
        borderBottom: "1px solid #e2e8f0",
      },
    },
    muiTableBodyRowProps: {
      sx: {
        "&:nth-of-type(even)": { backgroundColor: "#fafafa" },
        "&:hover": { backgroundColor: "#f1f5f9" },
      },
    },
    muiTableBodyCellProps: ({ column }) =>
      column.id === "actions"
        ? {
            sx: {
              backgroundColor: "#fff",
              boxShadow: "-4px 0 8px -4px rgba(15, 23, 42, 0.12)",
            },
          }
        : {},
    muiPaginationProps: {
      rowsPerPageOptions: [10, 25, 50],
      showFirstButton: false,
      showLastButton: false,
    },
    paginationDisplayMode: "pages",
  });

  return (
    <div className="min-w-0 space-y-4 p-1 sm:p-2">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <TicketPercent size={20} />
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

      {/* Search + Filters */}
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
            {statusFilter !== "all" ? (
              <span className="rounded-full bg-violet-100 px-1.5 text-[10px] font-bold text-violet-700">
                1
              </span>
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

      {/* Create / Edit modal — portaled above app header so X + actions stay visible */}
      {modalOpen
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
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
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-4 sm:px-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                      <TicketPercent size={20} />
                    </span>
                    <h2
                      id="coupon-modal-title"
                      className="text-lg font-bold text-slate-900 sm:text-xl"
                    >
                      {editingId ? "Edit Coupon" : "Create Coupon"}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                    aria-label="Close"
                  >
                    <X size={20} strokeWidth={2.25} />
                  </button>
                </div>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
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
                      <FieldLabel>Discount Type</FieldLabel>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              discountType: "percentage",
                            }))
                          }
                          className={`flex h-11 items-center justify-center rounded-xl border text-lg font-semibold transition ${
                            form.discountType === "percentage"
                              ? "border-violet-300 bg-violet-50 text-violet-700"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              discountType: "flat",
                            }))
                          }
                          className={`flex h-11 items-center justify-center rounded-xl border text-lg font-semibold transition ${
                            form.discountType === "flat"
                              ? "border-violet-300 bg-violet-50 text-violet-700"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          ₹
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
                        suffix={
                          form.discountType === "percentage" ? "%" : "₹"
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel required>Applicable On</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {APPLICABLE_OPTIONS.map(
                        ({ value, label, icon: Icon }) => {
                          const selected = (
                            form.applicableOn ?? ["all"]
                          ).includes(value);
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
                                  ? "border-violet-300 bg-violet-50 text-violet-700"
                                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              <Icon size={14} />
                              {label}
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <FieldLabel>Minimum Order (INR)</FieldLabel>
                      <IconInput
                        icon={Tag}
                        type="number"
                        min={0}
                        value={form.minOrderAmount ?? 0}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            minOrderAmount: Number(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <FieldLabel>Max Discount Cap (INR)</FieldLabel>
                      <IconInput
                        icon={Tag}
                        type="number"
                        min={0}
                        value={form.maxDiscountAmount ?? 0}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            maxDiscountAmount: Number(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <FieldLabel>Total Usage Limit</FieldLabel>
                      <IconInput
                        icon={ShoppingBag}
                        type="number"
                        min={0}
                        value={form.usageLimit ?? 0}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            usageLimit: Number(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <FieldLabel>Per Customer Limit</FieldLabel>
                      <IconInput
                        icon={User}
                        type="number"
                        min={0}
                        value={form.perCustomerLimit ?? 0}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            perCustomerLimit: Number(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <FieldLabel>Start Date</FieldLabel>
                      <IconInput
                        icon={Calendar}
                        type="date"
                        value={toDateInput(form.startsAt)}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            startsAt: e.target.value || null,
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
                        min={toDateInput(form.startsAt) || undefined}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            expiresAt: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <button
                    type="button"
                    onClick={() => setForm(initialForm())}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <RotateCcw size={16} />
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={saving}
                    className="inline-flex h-11 w-full flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60 sm:max-w-md"
                  >
                    <Tag size={16} />
                    {saving
                      ? "Saving..."
                      : editingId
                        ? "Update Coupon"
                        : "Create Coupon"}
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

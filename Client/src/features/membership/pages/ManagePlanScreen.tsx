import { useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
} from "material-react-table";
import {
  Pencil,
  Power,
  Plus,
  Search,
  Trash2,
  X,
  Package,
  CheckCircle2,
  Crown,
  Briefcase,
  User,
  Sparkles,
  Layers,
} from "lucide-react";
import Swal from "sweetalert2";
import AddnewPlansModal from "@/features/membership/components/AddnewPlansModal";
import {
  clearMembershipCache,
  handleCreateMembership,
  handleDeleteMembership,
  handleGetMemberships,
  handleUpdateMembership,
  type MembershipPlanPayload,
} from "@/services/apiClient";
import { useAppSelector } from "@/store/hooks";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";

type PlanRow = MembershipPlanPayload & {
  _id: string;
  createdAt?: string;
};

const planTypes = ["All", "Professional", "Business", "Personal"] as const;
const statuses = ["All", "Active", "Inactive"] as const;

function StatusPill({ status }: { status?: string }) {
  const active = String(status ?? "Active") === "Active";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
        active
          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
          : "bg-slate-50 text-slate-600 ring-slate-200"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          active ? "bg-emerald-500" : "bg-slate-400"
        }`}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function TypePill({ type }: { type?: string }) {
  const val = String(type ?? "Professional");
  const style =
    val === "Business"
      ? "bg-purple-50 text-purple-700 ring-purple-100"
      : val === "Personal"
        ? "bg-sky-50 text-sky-700 ring-sky-100"
        : "bg-indigo-50 text-indigo-700 ring-indigo-100";
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${style}`}
    >
      {val}
    </span>
  );
}

function getPlanTheme(plan: PlanRow) {
  const type = String(plan.planType || "").toLowerCase();
  const name = String(plan.displayName || "").toLowerCase();

  if (name.includes("premium") || name.includes("gold") || type === "business") {
    return {
      cardBg: "bg-gradient-to-br from-amber-50/70 via-white to-orange-50/30 border-amber-200/90 hover:border-amber-300",
      iconBg: "bg-amber-500 text-white shadow-xs shadow-amber-500/20",
      priceText: "text-amber-600",
      Icon: Crown,
    };
  }
  if (name.includes("special") || type === "professional") {
    return {
      cardBg: "bg-gradient-to-br from-purple-50/70 via-white to-indigo-50/30 border-purple-200/90 hover:border-purple-300",
      iconBg: "bg-purple-500 text-white shadow-xs shadow-purple-500/20",
      priceText: "text-purple-600",
      Icon: Sparkles,
    };
  }
  if (name.includes("junior") || type === "personal") {
    return {
      cardBg: "bg-gradient-to-br from-sky-50/70 via-white to-blue-50/30 border-sky-200/90 hover:border-sky-300",
      iconBg: "bg-sky-500 text-white shadow-xs shadow-sky-500/20",
      priceText: "text-sky-600",
      Icon: User,
    };
  }
  return {
    cardBg: "bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/30 border-indigo-200/90 hover:border-indigo-300",
    iconBg: "bg-indigo-500 text-white shadow-xs shadow-indigo-500/20",
    priceText: "text-emerald-600",
    Icon: Layers,
  };
}

export default function ManagePlanScreen() {
  const staff = useAppSelector((s) => s.user);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [viewPlan, setViewPlan] = useState<PlanRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [planType, setPlanType] = useState<(typeof planTypes)[number]>("All");
  const [status, setStatus] = useState<(typeof statuses)[number]>("All");

  const [allPlans, setAllPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      clearMembershipCache();
      const res = await handleGetMemberships({ search: "", planType: "All", status: "All" });
      const list = Array.isArray(res?.memberships) ? res.memberships : [];
      setAllPlans(list);
    } catch {
      setAllPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPlans();
  }, []);

  const filteredPlans = useMemo(() => {
    return allPlans.filter((plan) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = (plan.displayName || "").toLowerCase().includes(q);
        const matchesId = (plan.planId || "").toLowerCase().includes(q);
        if (!matchesName && !matchesId) return false;
      }
      if (planType !== "All") {
        if (plan.planType !== planType) return false;
      }
      if (status !== "All") {
        if (plan.status !== status) return false;
      }
      return true;
    });
  }, [allPlans, search, planType, status]);

  const openCreate = () => {
    setEditing(null);
    setOpenModal(true);
  };

  const openEdit = (row: PlanRow) => {
    setEditing(row);
    setOpenModal(true);
  };

  const submit = async (payload: MembershipPlanPayload) => {
    try {
      setSaving(true);
      const createdBy = {
        m_staff_id: staff.m_staff_id,
        m_staff_name: staff.m_staff_name,
        m_staff_email: staff.m_staff_email,
      };

      if (editing?._id) {
        await handleUpdateMembership(editing._id, { ...payload, createdBy });
        Swal.fire("Updated", "Plan updated successfully.", "success");
      } else {
        await handleCreateMembership({ ...payload, createdBy });
        Swal.fire("Created", "Plan created successfully.", "success");
      }

      setOpenModal(false);
      setEditing(null);
      clearMembershipCache();
      await fetchPlans();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Save failed",
        err?.response?.data?.message ?? "Could not save plan. Try again.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Delete plan?",
      text: "This cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;

    try {
      clearMembershipCache();
      await handleDeleteMembership(id);
      Swal.fire("Deleted", "Plan deleted.", "success");
      await fetchPlans();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Delete failed",
        err?.response?.data?.message ?? "Could not delete plan.",
        "error",
      );
    }
  };

  const toggleStatus = async (row: PlanRow) => {
    try {
      const next = row.status === "Active" ? "Inactive" : "Active";
      // Optimistic update so UI reflects immediately
      setAllPlans((prev) =>
        prev.map((p) => (p._id === row._id ? { ...p, status: next } : p))
      );
      clearMembershipCache();
      await handleUpdateMembership(row._id, { status: next });
      await fetchPlans();
    } catch (error: unknown) {
      await fetchPlans();
      const err = error as { response?: { data?: { message?: string } } };
      Swal.fire(
        "Update failed",
        err?.response?.data?.message ?? "Could not update status.",
        "error",
      );
    }
  };

  const columns = useMemo<MRT_ColumnDef<PlanRow>[]>(
    () => [
      {
        header: "Display Name",
        accessorKey: "displayName",
        size: 240,
        Cell: ({ row }: { row: MRT_Row<PlanRow> }) => {
          const theme = getPlanTheme(row.original);
          const IconComp = theme.Icon;
          return (
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${theme.iconBg}`}
              >
                <IconComp size={16} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-slate-900 truncate">
                  {row.original.displayName}
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  {row.original.planId}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        header: "Type",
        accessorKey: "planType",
        size: 120,
        Cell: ({ row }: { row: MRT_Row<PlanRow> }) => (
          <TypePill type={row.original.planType} />
        ),
      },
      {
        header: "Selling Price",
        id: "price",
        accessorFn: (r) => Number(r.pricing?.amount ?? 0),
        size: 130,
        Cell: ({ row, cell }) => {
          const selling = Number(cell.getValue() ?? 0);
          const gross = Number(row.original.pricing?.grossAmount ?? 0);
          return (
            <div className="flex flex-col">
              <span className="font-bold tabular-nums text-emerald-600">
                ₹ {selling.toLocaleString("en-IN")}
              </span>
              {gross > selling ? (
                <span className="text-[11px] tabular-nums text-slate-400 line-through">
                  ₹ {gross.toLocaleString("en-IN")}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        header: "Status",
        accessorKey: "status",
        size: 140,
        Cell: ({ row }: { row: MRT_Row<PlanRow> }) => (
          <StatusPill status={row.original.status} />
        ),
      },
      {
        header: "Period",
        accessorFn: (r) => r.pricing?.period ?? "-",
        id: "period",
        size: 90,

        Cell: ({ row }: { row: MRT_Row<PlanRow> }) => (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900">
              {row.original.pricing?.period ?? "-"}
            </span>
          </div>
        ),
      },
      {
        header: "Actions",
        accessorKey: "actions",
        size: 140,
        Cell: ({ row }: { row: MRT_Row<PlanRow> }) => (
          <div className="flex items-center gap-2">
            <Can permission={PERMISSIONS.MEMBERSHIP_PLAN_MANAGE}>
              <button
                type="button"
                onClick={() => openEdit(row.original)}
                className="rounded-lg bg-blue-50 p-2 text-blue-700 hover:bg-blue-100"
                title="Edit"
              >
                <Pencil size={16} />
              </button>
            </Can>
            <Can permission={PERMISSIONS.MEMBERSHIP_PLAN_MANAGE}>
              <button
                type="button"
                onClick={() => toggleStatus(row.original)}
                className="rounded-lg bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100"
                title="Toggle status"
              >
                <Power size={16} />
              </button>
            </Can>
            <Can permission={PERMISSIONS.MEMBERSHIP_PLAN_MANAGE}>
              <button
                type="button"
                onClick={() => confirmDelete(row.original._id)}
                className="rounded-lg bg-rose-50 p-2 text-rose-700 hover:bg-rose-100"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </Can>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredPlans],
  );

  const cards = useMemo(
    () => [
      {
        title: "Total Plans",
        value: allPlans.length,
        Icon: Package,
        bgClass: "bg-blue-50/80 border-blue-200/80 hover:border-blue-300",
        iconWrapClass: "bg-blue-500 text-white shadow-xs shadow-blue-500/20",
        titleClass: "text-blue-900",
        valueClass: "text-blue-950",
      },
      {
        title: "Active Plans",
        value: allPlans.filter((p) => p.status === "Active").length,
        Icon: CheckCircle2,
        bgClass: "bg-emerald-50/80 border-emerald-200/80 hover:border-emerald-300",
        iconWrapClass: "bg-emerald-500 text-white shadow-xs shadow-emerald-500/20",
        titleClass: "text-emerald-900",
        valueClass: "text-emerald-950",
      },
      {
        title: "Professional",
        value: allPlans.filter((p) => p.planType === "Professional").length,
        Icon: Crown,
        bgClass: "bg-purple-50/80 border-purple-200/80 hover:border-purple-300",
        iconWrapClass: "bg-purple-500 text-white shadow-xs shadow-purple-500/20",
        titleClass: "text-purple-900",
        valueClass: "text-purple-950",
      },
      {
        title: "Business",
        value: allPlans.filter((p) => p.planType === "Business").length,
        Icon: Briefcase,
        bgClass: "bg-amber-50/80 border-amber-200/80 hover:border-amber-300",
        iconWrapClass: "bg-amber-500 text-white shadow-xs shadow-amber-500/20",
        titleClass: "text-amber-900",
        valueClass: "text-amber-950",
      },
      {
        title: "Personal",
        value: allPlans.filter((p) => p.planType === "Personal").length,
        Icon: User,
        bgClass: "bg-sky-50/80 border-sky-200/80 hover:border-sky-300",
        iconWrapClass: "bg-sky-500 text-white shadow-xs shadow-sky-500/20",
        titleClass: "text-sky-900",
        valueClass: "text-sky-950",
      },
    ],
    [allPlans],
  );

  const table = useMaterialReactTable<PlanRow>({
    columns,
    data: filteredPlans,
    state: { isLoading: loading },
    enablePagination: false,
    enableTopToolbar: false,
    enableBottomToolbar: false,
    enableDensityToggle: false,
    initialState: { density: "compact" },
    muiTablePaperProps: {
      elevation: 0,
      style: {
        boxShadow: "none",
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        overflow: "hidden",
      },
    },
    muiTableContainerProps: {
      sx: {
        maxWidth: "100%",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      },
    },
  });

  return (
    <div className="p-3">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          
          <div>
            <div className="text-lg sm:text-xl font-semibold text-slate-900">
              Manage Plans
            </div>
          </div>
        </div>
        <Can permission={PERMISSIONS.MEMBERSHIP_PLAN_MANAGE}>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-xs sm:px-4 sm:py-2.5 sm:text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700"
          >
            <Plus size={16} />
            Add
          </button>
        </Can>
      </div>

      {/* Top Colorful Stat Cards */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5">
        {cards.map((item, index) => (
          <div
            key={item.title || index}
            className={`min-w-0 rounded-2xl border p-2.5 sm:p-4 shadow-xs transition duration-300 hover:shadow-md ${item.bgClass} ${
              index === 4 ? "col-span-2 sm:col-span-1" : ""
            }`}
          >
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              <div
                className={`flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl shadow-xs ${item.iconWrapClass}`}
              >
                <item.Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <span
                className={`min-w-0 truncate text-xs font-semibold sm:text-sm ${item.titleClass}`}
              >
                {item.title}
              </span>
            </div>
            <div
              className={`mt-1.5 text-lg font-bold sm:mt-3 sm:text-2xl ${item.valueClass}`}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Row 1: Search Bar (on its own row) */}
      <div className="mb-2.5">
        <div className="relative w-full">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plans by name or ID..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs sm:text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400 shadow-2xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Two Filters Below Search Bar */}
      <div className="mb-4 flex items-center gap-2 sm:gap-3">
        {/* Plan Type Filter */}
        <div className="relative flex-1 sm:flex-initial sm:w-48">
          <select
            value={planType}
            onChange={(e) =>
              setPlanType(e.target.value as (typeof planTypes)[number])
            }
            aria-label="Filter by plan type"
            className="w-full h-[36px] sm:h-[38px] rounded-xl border border-slate-200 bg-white px-2.5 sm:px-3 text-xs sm:text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 shadow-2xs cursor-pointer hover:bg-slate-50"
          >
            {planTypes.map((t) => (
              <option key={t} value={t}>
                {t === "All" ? "All Plan Types" : t}
              </option>
            ))}
          </select>
        </div>

        {/* All Status Filter */}
        <div className="relative flex-1 sm:flex-initial sm:w-48">
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as (typeof statuses)[number])
            }
            aria-label="Filter by status"
            className="w-full h-[36px] sm:h-[38px] rounded-xl border border-slate-200 bg-white px-2.5 sm:px-3 text-xs sm:text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 shadow-2xs cursor-pointer hover:bg-slate-50"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "All Statuses" : s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <MaterialReactTable table={table} />
      </div>

      {/* Mobile Card List View */}
      <div className="block md:hidden space-y-2.5">
        {loading && allPlans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
            Loading plans...
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
            No plans found
          </div>
        ) : (
          filteredPlans.map((plan, idx) => {
            const selling = Number(plan.pricing?.amount ?? 0);
            const gross = Number(plan.pricing?.grossAmount ?? 0);
            const theme = getPlanTheme(plan);
            const PlanIcon = theme.Icon;

            return (
              <div
                key={plan._id || idx}
                onClick={() => setViewPlan(plan)}
                className={`cursor-pointer rounded-2xl border p-3.5 shadow-xs transition duration-200 hover:shadow-md active:scale-[0.99] ${theme.cardBg}`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${theme.iconBg}`}
                    >
                      <PlanIcon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-bold text-slate-900">
                          {plan.displayName}
                        </span>
                        <TypePill type={plan.planType} />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center rounded-md bg-white/80 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600 border border-slate-200/60">
                          {plan.planId}
                        </span>
                        {plan.pricing?.period && (
                          <span className="inline-flex items-center rounded-md bg-white/80 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200/60">
                            {plan.pricing.period}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <StatusPill status={plan.status} />
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2.5">
                  <div className="flex flex-col">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Selling Price
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-extrabold text-emerald-600">
                        ₹ {selling.toLocaleString("en-IN")}
                      </span>
                      {gross > selling && (
                        <span className="text-xs text-slate-400 line-through">
                          ₹ {gross.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Can permission={PERMISSIONS.MEMBERSHIP_PLAN_MANAGE}>
                      <button
                        type="button"
                        onClick={() => openEdit(plan)}
                        className="cursor-pointer rounded-lg bg-blue-50 p-1.5 text-blue-700 hover:bg-blue-100 transition shadow-2xs"
                        title="Edit plan"
                      >
                        <Pencil size={15} />
                      </button>
                    </Can>
                    <Can permission={PERMISSIONS.MEMBERSHIP_PLAN_MANAGE}>
                      <button
                        type="button"
                        onClick={() => void toggleStatus(plan)}
                        className="cursor-pointer rounded-lg bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100 transition shadow-2xs"
                        title="Toggle status"
                      >
                        <Power size={15} />
                      </button>
                    </Can>
                    <Can permission={PERMISSIONS.MEMBERSHIP_PLAN_MANAGE}>
                      <button
                        type="button"
                        onClick={() => void confirmDelete(plan._id)}
                        className="cursor-pointer rounded-lg bg-rose-50 p-1.5 text-rose-700 hover:bg-rose-100 transition shadow-2xs"
                        title="Delete plan"
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
      </div>
      {/* Plan View Details Modal */}
      {viewPlan && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setViewPlan(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Membership Plan Details
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {viewPlan.planId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewPlan(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4">
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Plan Name
                    </span>
                    <h4 className="text-lg font-bold text-slate-900 mt-0.5 truncate">
                      {viewPlan.displayName}
                    </h4>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusPill status={viewPlan.status} />
                    <TypePill type={viewPlan.planType} />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/60 pt-3 text-center">
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Selling Price
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      ₹ {Number(viewPlan.pricing?.amount ?? 0).toLocaleString("en-IN")}
                    </span>
                    {Number(viewPlan.pricing?.grossAmount ?? 0) > Number(viewPlan.pricing?.amount ?? 0) && (
                      <span className="text-[10px] text-slate-400 line-through block mt-0.5">
                        ₹ {Number(viewPlan.pricing?.grossAmount ?? 0).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Period / Cycle
                    </span>
                    <span className="text-sm font-semibold text-slate-700">
                      {viewPlan.pricing?.period || "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Plan Identifier</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {viewPlan.planId}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Plan Type</span>
                  <span className="font-semibold text-slate-800">
                    {viewPlan.planType}
                  </span>
                </div>
                {viewPlan.description && (
                  <div className="pt-1">
                    <span className="text-slate-500 block mb-1">Description</span>
                    <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {viewPlan.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setViewPlan(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Close
              </button>
              <Can permission={PERMISSIONS.MEMBERSHIP_PLAN_MANAGE}>
                <button
                  type="button"
                  onClick={() => {
                    const pl = viewPlan;
                    setViewPlan(null);
                    openEdit(pl);
                  }}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
                >
                  Edit Plan
                </button>
              </Can>
            </div>
          </div>
        </div>
      )}


      <AddnewPlansModal
        open={openModal}
        onClose={() => {
          setOpenModal(false);
          setEditing(null);
        }}
        onSubmit={submit}
        loading={saving}
        initialPlan={editing ?? undefined}
      />
    </div>
  );
}

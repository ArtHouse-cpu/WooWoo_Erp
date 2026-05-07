import { useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
} from "material-react-table";
import { Pencil, Power, Plus, Search, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import AddnewPlansModal from "@/features/membership/components/AddnewPlansModal";
import { useDebounce } from "@/hooks/useDebounce";
import {
  handleCreateMembership,
  handleDeleteMembership,
  handleGetMemberships,
  handleUpdateMembership,
  type MembershipPlanPayload,
} from "@/services/apiClient";
import { useAppSelector } from "@/store/hooks";

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

export default function ManagePlanScreen() {
  const staff = useAppSelector((s) => s.user);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 250);
  const [planType, setPlanType] = useState<(typeof planTypes)[number]>("All");
  const [status, setStatus] = useState<(typeof statuses)[number]>("All");

  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPlans = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const res = await handleGetMemberships(
        { search: debouncedSearch, planType, status },
        signal,
      );
      setPlans(Array.isArray(res?.memberships) ? res.memberships : []);
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void fetchPlans(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, planType, status]);

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
      await handleUpdateMembership(row._id, { status: next });
      await fetchPlans();
    } catch (error: unknown) {
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
        size: 220,
        Cell: ({ row }: { row: MRT_Row<PlanRow> }) => (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900">
              {row.original.displayName}
            </span>
            <span className="text-xs text-slate-500">
              {row.original.planId}
            </span>
          </div>
        ),
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
        header: "Price",
        id: "price",
        accessorFn: (r) => Number(r.pricing?.amount ?? 0),
        size: 120,
        Cell: ({ cell }) => (
          <span className="font-semibold tabular-nums text-slate-900">
            ₹ {Number(cell.getValue() ?? 0).toLocaleString("en-IN")}
          </span>
        ),
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
            <button
              type="button"
              onClick={() => openEdit(row.original)}
              className="rounded-lg bg-blue-50 p-2 text-blue-700 hover:bg-blue-100"
              title="Edit"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={() => toggleStatus(row.original)}
              className="rounded-lg bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100"
              title="Toggle status"
            >
              <Power size={16} />
            </button>
            <button
              type="button"
              onClick={() => confirmDelete(row.original._id)}
              className="rounded-lg bg-rose-50 p-2 text-rose-700 hover:bg-rose-100"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plans],
  );

  const table = useMaterialReactTable<PlanRow>({
    columns,
    data: plans,
    state: { isLoading: loading },
    muiTablePaperProps: {
      elevation: 0,
      style: {
        boxShadow: "none",
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        overflow: "hidden",
      },
    },
  });

  return (
    <div className="p-3">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
            <Plus size={18} />
          </div>
          <div>
            <div className="text-xl font-semibold text-slate-900">
              Manage Plans
            </div>
            <div className="text-sm text-slate-500">
              Create and manage membership plans
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus size={16} />
          Add New Plan
        </button>
      </div>

      <div className="mb-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Search size={16} className="text-slate-400" />
          Filters
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-500">
              Search
            </div>
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search plans..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                <Search size={16} />
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-slate-500">
              Plan Type
            </div>
            <select
              value={planType}
              onChange={(e) =>
                setPlanType(e.target.value as (typeof planTypes)[number])
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            >
              {planTypes.map((t) => (
                <option key={t} value={t}>
                  {t === "All" ? "All Types" : t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-slate-500">
              Status
            </div>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as (typeof statuses)[number])
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s === "All" ? "All Status" : s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mb-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-100">
              <Plus size={16} />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Membership Plans
              </div>
              <div className="text-xs text-slate-500">
                {loading ? "Loading..." : `${plans.length} plans found`}
              </div>
            </div>
          </div>
        </div>
      </div>

      <MaterialReactTable table={table} />

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

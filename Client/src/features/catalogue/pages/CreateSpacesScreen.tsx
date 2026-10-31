import { useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import {
  ArrowDownCircle,
  Boxes,
  Building2,
  Search,
  LayoutList,
  Loader2,
  SquarePen,
  Trash2,
  X,
  Users,
} from "lucide-react";
import Swal from "sweetalert2";
import AddSpaceModal, {
  type SpaceFormPayload,
  COWORKING_CATEGORIES,
} from "@/features/catalogue/components/AddSpaceModal";
import {
  handleCreateSpace,
  handleDeleteSpace,
  handleGetSpaces,
  handleUpdateSpace,
  spacePayloadToFormData,
  type SpacePayload,
} from "@/services/apiClient";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";

type SpaceRow = SpacePayload & { _id: string };

const statusClass = (status?: string) => {
  if (status === "Available") return "bg-emerald-100 text-emerald-700";
  if (status === "Booked") return "bg-blue-100 text-blue-700";
  return "bg-amber-100 text-amber-700";
};

export default function CreateSpacesScreen() {
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<SpaceRow | null>(null);
  const [viewSpace, setViewSpace] = useState<SpaceRow | null>(null);
  const [spaces, setSpaces] = useState<SpaceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSpaces = useMemo(() => {
    if (!searchQuery.trim()) return spaces;
    const q = searchQuery.toLowerCase();
    return spaces.filter(
      (s) =>
        (s.name || "").toLowerCase().includes(q) ||
        (s.spaceCode || "").toLowerCase().includes(q) ||
        (s.category || "").toLowerCase().includes(q) ||
        (s.spaceType || "").toLowerCase().includes(q) ||
        (s.status || "").toLowerCase().includes(q),
    );
  }, [spaces, searchQuery]);

  const fetchSpaces = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const res = await handleGetSpaces({}, signal);
      const rows = Array.isArray(res?.spaces) ? res.spaces : [];
      setSpaces(rows);
      setRowSelection((current) => {
        const ids = new Set(rows.map((space: SpaceRow) => space._id));
        return Object.fromEntries(
          Object.entries(current).filter(([id, selected]) => selected && ids.has(id)),
        );
      });
    } catch {
      setSpaces([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void fetchSpaces(controller.signal);
    return () => controller.abort();
  }, []);

  const columns = useMemo(
    () => [
      {
        id: "rowIndex",
        header: "ID",
        size: 50,
        Cell: ({ row }: { row: { index: number } }) => row.index + 1,
      },
      {
        accessorKey: "spaceCode",
        header: "Space Code",
        size: 110,
        Cell: ({ row }: { row: { original: SpaceRow } }) => (
          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 border border-slate-200">
            {row.original.spaceCode ||
              `SP-${String(row.original._id || "").slice(-5).toUpperCase()}`}
          </span>
        ),
      },
      { accessorKey: "name", header: "Space Name", size: 200 },
      {
        accessorKey: "spaceType",
        header: "Type",
        size: 110,
        Cell: ({ row }: { row: { original: SpaceRow } }) => {
          const raw = String(row.original.spaceType || "").toLowerCase();
          const cat = String(row.original.category || "").toLowerCase();
          const isCoworking =
            raw === "coworking" ||
            (raw !== "exclusive" &&
              (COWORKING_CATEGORIES.some((c) => c.toLowerCase() === cat) ||
                cat.includes("cowork")));
          return (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                isCoworking
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {isCoworking ? "Coworking" : "Exclusive"}
            </span>
          );
        },
      },
      { accessorKey: "category", header: "Category" },
      {
        accessorKey: "day",
        header: "Day",
        Cell: ({ row }: { row: { original: SpaceRow } }) => {
          const day = String(row.original.day || "").trim();
          const isWeekend = day.toLowerCase() === "weekend";
          const label = isWeekend
            ? "Weekend"
            : day.toLowerCase() === "weekday"
              ? "Weekday"
              : day || "—";
          return (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                isWeekend
                  ? "bg-violet-100 text-violet-700"
                  : day
                    ? "bg-sky-100 text-sky-700"
                    : "bg-gray-100 text-gray-500"
              }`}
            >
              {label}
            </span>
          );
        },
      },
      {
        accessorKey: "price",
        header: "Price",
        Cell: ({ row }: { row: { original: SpaceRow } }) => (
          <span className="font-semibold text-gray-900">
            ₹{Number(row.original.price || 0).toLocaleString("en-IN")}
          </span>
        ),
      },
      {
        accessorKey: "capacity",
        header: "Capacity",
        Cell: ({ cell }: { cell: { getValue: () => unknown } }) =>
          `${Number(cell.getValue() || 0)} people`,
      },
      {
        accessorKey: "status",
        header: "Status",
        Cell: ({ cell }: { cell: { getValue: () => unknown } }) => {
          const status = String(cell.getValue() || "Available");
          return (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(status)}`}
            >
              {status}
            </span>
          );
        },
      },
      {
        header: "Actions",
        accessorKey: "actions",
        enableSorting: false,
        Cell: ({ row }: { row: { original: SpaceRow } }) => (
          <div className="flex items-center gap-2">
            <Can permission={PERMISSIONS.SPACE_UPDATE}>
              <button
                type="button"
                onClick={() => {
                  setEditing(row.original);
                  setOpenModal(true);
                }}
                className="cursor-pointer rounded bg-green-100 px-3 py-2 text-sm hover:bg-green-200"
              >
                <SquarePen color="green" size={18} />
              </button>
            </Can>
            <Can permission={PERMISSIONS.SPACE_DELETE}>
              <button
                type="button"
                onClick={() => void handleDelete(row.original)}
                className="cursor-pointer rounded bg-red-100 px-3 py-2 text-sm hover:bg-red-200"
              >
                <Trash2 color="red" size={18} />
              </button>
            </Can>
          </div>
        ),
      },
    ],
    [],
  );

  const selectedSpaces = useMemo(
    () => spaces.filter((space) => rowSelection[space._id]),
    [spaces, rowSelection],
  );

  const handleDeleteMany = async () => {
    const targets = selectedSpaces.filter((space) => space._id);
    if (!targets.length) return;
    const result = await Swal.fire({
      title: `Delete ${targets.length} space${targets.length === 1 ? "" : "s"}?`,
      text: targets.map((space) => space.name).join(", "),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      confirmButtonColor: "#111111",
    });
    if (!result.isConfirmed) return;

    const failed: string[] = [];
    for (const space of targets) {
      try {
        await handleDeleteSpace(space._id);
      } catch {
        failed.push(space.name || space._id);
      }
    }
    setRowSelection({});
    await fetchSpaces();
    if (failed.length) {
      await Swal.fire(
        "Some spaces were not deleted",
        failed.join(", "),
        "error",
      );
      return;
    }
    await Swal.fire({
      icon: "success",
      title: "Deleted",
      timer: 1400,
      showConfirmButton: false,
    });
  };

  const table = useMaterialReactTable({
    columns,
    data: spaces,
    getRowId: (row) => row._id,
    enableRowSelection: true,
    enableMultiRowSelection: true,
    onRowSelectionChange: setRowSelection,
    state: { isLoading: loading, rowSelection },
    renderTopToolbarCustomActions: () =>
      selectedSpaces.length > 0 ? (
        <Can permission={PERMISSIONS.SPACE_DELETE}>
          <button
            type="button"
            onClick={() => void handleDeleteMany()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            <Trash2 size={15} />
            Delete selected ({selectedSpaces.length})
          </button>
        </Can>
      ) : null,
    muiTablePaperProps: {
      elevation: 0,
      style: {
        boxShadow: "none",
        border: "1px solid #e5e7eb",
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

  const cards = [
    {
      title: "Total Spaces",
      value: spaces.length,
      icon: <Building2 size={22} className="text-gray-500" />,
    },
    {
      title: "Available",
      value: spaces.filter((s) => s.status === "Available").length,
      icon: <Boxes size={22} className="text-gray-500" />,
    },
    {
      title: "Space Categories",
      value: new Set(spaces.map((s) => s.category || "")).size,
      icon: <LayoutList size={22} className="text-gray-500" />,
    },
    {
      title: "Booked",
      value: spaces.filter((s) => s.status === "Booked").length,
      icon: <ArrowDownCircle size={22} className="text-gray-500" />,
    },
    {
      title: "Total Capacity",
      value: spaces.reduce((sum, s) => sum + Number(s.capacity || 0), 0),
      icon: <Users size={22} className="text-gray-500" />,
    },
  ];

  const handleDelete = async (space: SpaceRow) => {
    const result = await Swal.fire({
      title: "Delete space?",
      text: `Remove "${space.name}" from catalogue?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      confirmButtonColor: "#111111",
    });
    if (!result.isConfirmed || !space._id) return;

    try {
      await handleDeleteSpace(space._id);
      await Swal.fire({
        icon: "success",
        title: "Deleted",
        timer: 1400,
        showConfirmButton: false,
      });
      await fetchSpaces();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "Delete failed",
        err?.response?.data?.message || "Could not delete space.",
        "error",
      );
    }
  };

  const handleSubmit = async (payload: SpaceFormPayload, imageFile: File | null) => {
    try {
      setSaving(true);
      const formData = spacePayloadToFormData(payload, imageFile);

      if (editing?._id) {
        await handleUpdateSpace(editing._id, formData);
        await Swal.fire({
          icon: "success",
          title: "Space updated",
          timer: 1400,
          showConfirmButton: false,
        });
      } else {
        const res = await handleCreateSpace(formData);

        // Fallback assurance: If both days were requested but only 1 doc was returned
        if (payload.createBothDays && (!res?.spaces || res.spaces.length < 2)) {
          const createdWeekday = res?.space;
          const weekendFormData = spacePayloadToFormData(
            {
              name: payload.name,
              spaceCode: payload.spaceCode,
              spaceType: payload.spaceType,
              category: payload.category,
              day: "Weekend",
              price: payload.weekendPrice ?? 0,
              status: payload.weekendStatus ?? "Available",
              capacity: payload.capacity,
              description: payload.description,
              imageUrl: createdWeekday?.imageUrl || null,
            },
            null,
          );
          await handleCreateSpace(weekendFormData);
        }

        await Swal.fire({
          icon: "success",
          title: payload.createBothDays ? "Spaces created" : "Space created",
          text: payload.createBothDays
            ? "Weekday and Weekend spaces added successfully."
            : undefined,
          timer: 1500,
          showConfirmButton: false,
        });
      }

      setOpenModal(false);
      setEditing(null);
      await fetchSpaces();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "Save failed",
        err?.response?.data?.message || "Could not save space.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 p-1">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Spaces List</h1>
        <div className="flex gap-3">
          <Can permission={PERMISSIONS.SPACE_CREATE}>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setOpenModal(true);
              }}
              className="w-full cursor-pointer rounded bg-black px-4 py-2 text-[14px] font-semibold text-white transition hover:bg-gray-900 sm:w-auto"
            >
              Add Space
            </button>
          </Can>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((item, index) => (
          <div
            key={index}
            className={`cursor-pointer rounded-xl border border-gray-200 bg-white p-2.5 sm:p-4 transition duration-300 hover:shadow-sm ${
              index === 4 ? "col-span-2 sm:col-span-1" : ""
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600">
              {item.icon}
              <span className="text-xs font-medium sm:text-sm truncate">{item.title}</span>
            </div>
            <div className="mt-1 text-base sm:mt-3 sm:text-2xl font-semibold">
              {loading ? <Loader2 size={22} className="animate-spin text-gray-400" /> : item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <MaterialReactTable table={table} />
      </div>

      {/* Mobile Card List View */}
      <div className="block md:hidden space-y-2.5">
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search spaces..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-slate-400"
          />
        </div>

        {loading && spaces.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
            Loading spaces...
          </div>
        ) : filteredSpaces.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
            No spaces found
          </div>
        ) : (
          filteredSpaces.map((space, idx) => {
            const raw = String(space.spaceType || "").toLowerCase();
            const cat = String(space.category || "").toLowerCase();
            const isCoworking =
              raw === "coworking" ||
              (raw !== "exclusive" &&
                (COWORKING_CATEGORIES.some((c) => c.toLowerCase() === cat) ||
                  cat.includes("cowork")));

            return (
              <div
                key={space._id || idx}
                onClick={() => setViewSpace(space)}
                className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition hover:border-slate-300 active:bg-slate-50/70"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-bold text-slate-900">
                        {space.name}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700 border border-slate-200">
                        {space.spaceCode ||
                          `SP-${String(space._id || "").slice(-5).toUpperCase()}`}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-600">
                        {space.category || "General"}
                      </span>
                      <span>•</span>
                      <span
                        className={`rounded-full px-2 py-0.2 text-[10px] font-semibold ${
                          isCoworking
                            ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/50"
                            : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/50"
                        }`}
                      >
                        {isCoworking ? "Coworking" : "Exclusive"}
                      </span>
                      {space.day && (
                        <>
                          <span>•</span>
                          <span className="font-medium text-slate-500">
                            {space.day}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusClass(
                      space.status,
                    )}`}
                  >
                    {space.status || "Available"}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="block text-[10px] font-medium uppercase text-slate-400">
                        Rate
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        ₹{Number(space.price || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-medium uppercase text-slate-400">
                        Capacity
                      </span>
                      <span className="text-xs font-medium text-slate-700">
                        {Number(space.capacity || 0)} people
                      </span>
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Can permission={PERMISSIONS.SPACE_UPDATE}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(space);
                          setOpenModal(true);
                        }}
                        className="cursor-pointer rounded-lg bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100"
                        title="Edit space"
                      >
                        <SquarePen size={15} />
                      </button>
                    </Can>
                    <Can permission={PERMISSIONS.SPACE_DELETE}>
                      <button
                        type="button"
                        onClick={() => void handleDelete(space)}
                        className="cursor-pointer rounded-lg bg-rose-50 p-1.5 text-rose-700 hover:bg-rose-100"
                        title="Delete space"
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
      {/* Space View Details Modal */}
      {viewSpace && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setViewSpace(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Space Details
                  </h3>
                  <p className="text-xs text-slate-400">
                    {viewSpace.category || "General"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewSpace(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-5 space-y-4">
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Space Name
                    </span>
                    <h4 className="text-lg font-bold text-slate-900 mt-0.5 truncate">
                      {viewSpace.name}
                    </h4>
                    <span className="inline-block mt-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-700 border border-slate-200">
                      {viewSpace.spaceCode || `SP-${String(viewSpace._id || "").slice(-5).toUpperCase()}`}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${statusClass(viewSpace.status)}`}>
                      {viewSpace.status || "Available"}
                    </span>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                      {String(viewSpace.spaceType || "").toLowerCase() === "coworking" ? "Coworking" : "Exclusive"}
                    </span>
                  </div>
                </div>

                {/* Metric Tiles */}
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200/60 pt-3 text-center">
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Rate / Price
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      ₹{Number(viewSpace.price || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Capacity
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {Number(viewSpace.capacity || 0)} people
                    </span>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Day
                    </span>
                    <span className="text-sm font-semibold text-slate-700">
                      {viewSpace.day || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Specs List */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Category</span>
                  <span className="font-semibold text-slate-800">
                    {viewSpace.category || "—"}
                  </span>
                </div>
                {viewSpace.description && (
                  <div className="pt-1">
                    <span className="text-slate-500 block mb-1">Description</span>
                    <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {viewSpace.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setViewSpace(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Close
              </button>
              <Can permission={PERMISSIONS.SPACE_UPDATE}>
                <button
                  type="button"
                  onClick={() => {
                    const sp = viewSpace;
                    setViewSpace(null);
                    setEditing(sp);
                    setOpenModal(true);
                  }}
                  className="rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-black/90 transition"
                >
                  Edit Space
                </button>
              </Can>
            </div>
          </div>
        </div>
      )}


      <AddSpaceModal
        open={openModal}
        onClose={() => {
          if (saving) return;
          setOpenModal(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        loading={saving}
        initialSpace={editing}
        existingSpaces={spaces}
      />
    </div>
  );
}

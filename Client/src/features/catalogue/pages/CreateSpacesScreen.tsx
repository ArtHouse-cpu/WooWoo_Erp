import { useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import {
  ArrowDownCircle,
  Boxes,
  Building2,
  LayoutList,
  Loader2,
  SquarePen,
  Trash2,
  Users,
} from "lucide-react";
import Swal from "sweetalert2";
import AddSpaceModal, {
  type SpaceFormPayload,
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
  const [spaces, setSpaces] = useState<SpaceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSpaces = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const res = await handleGetSpaces({}, signal);
      setSpaces(Array.isArray(res?.spaces) ? res.spaces : []);
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
      { accessorKey: "name", header: "Space Name", size: 200 },
      { accessorKey: "category", header: "Category" },
      {
        accessorKey: "price",
        header: "Price / Hr",
        Cell: ({ cell }: { cell: { getValue: () => unknown } }) =>
          `₹ ${Number(cell.getValue() || 0).toLocaleString("en-IN")}`,
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

  const table = useMaterialReactTable({
    columns,
    data: spaces,
    state: { isLoading: loading },
    muiTablePaperProps: {
      elevation: 0,
      style: {
        boxShadow: "none",
        border: "1px solid #e5e7eb",
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
        await handleCreateSpace(formData);
        await Swal.fire({
          icon: "success",
          title: "Space created",
          timer: 1400,
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
    <div className="p-1">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Spaces List</h1>
        <div className="flex gap-3">
          <Can permission={PERMISSIONS.SPACE_CREATE}>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setOpenModal(true);
              }}
              className="cursor-pointer rounded bg-black px-4 py-2 text-[14px] font-semibold text-white transition hover:bg-gray-900"
            >
              Add Space
            </button>
          </Can>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((item, index) => (
          <div
            key={index}
            className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 transition duration-300 hover:shadow-sm"
          >
            <div className="flex items-center gap-2 text-gray-600">
              {item.icon}
              <span className="font-medium">{item.title}</span>
            </div>
            <div className="mt-3 text-2xl font-semibold">
              {loading ? <Loader2 size={22} className="animate-spin text-gray-400" /> : item.value}
            </div>
          </div>
        ))}
      </div>

      <MaterialReactTable table={table} />

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
      />
    </div>
  );
}

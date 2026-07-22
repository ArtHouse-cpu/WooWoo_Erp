import { useEffect, useMemo, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import {
  ArrowDownCircle,
  Boxes,
  LayoutList,
  Loader2,
  ShoppingBasket,
  SquarePen,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import Swal from "sweetalert2";
import AddFoodModal, {
  type FoodFormPayload,
} from "@/features/catalogue/components/AddFoodModal";
import {
  foodPayloadToFormData,
  handleCreateFood,
  handleDeleteFood,
  handleGetFoods,
  handleUpdateFood,
  type FoodPayload,
} from "@/services/apiClient";
import Can from "@/components/rbac/Can";
import { PERMISSIONS } from "@/constants/permissions";

type FoodRow = FoodPayload & { _id: string };

export default function CreateFoodScreen() {
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<FoodRow | null>(null);
  const [foods, setFoods] = useState<FoodRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchFoods = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const res = await handleGetFoods({}, signal);
      setFoods(Array.isArray(res?.foods) ? res.foods : []);
    } catch {
      setFoods([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void fetchFoods(controller.signal);
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
      { accessorKey: "name", header: "Food Name", size: 200 },
      { accessorKey: "category", header: "Category" },
      {
        accessorKey: "price",
        header: "Price",
        Cell: ({ cell }: { cell: { getValue: () => unknown } }) =>
          `₹ ${Number(cell.getValue() || 0).toLocaleString("en-IN")}`,
      },
     
      { accessorKey: "unit", header: "Unit" },
       {
        accessorKey: "status",
        header: "Availability",
        Cell: ({ cell }: { cell: { getValue: () => unknown } }) => {
          const available = String(cell.getValue() || "Active") !== "Inactive";
          return (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                available
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              {available ? "Available" : "Not Available"}
            </span>
          );
        },
      },
      {
        accessorKey: "isVeg",
        header: "Type",
        Cell: ({ cell }: { cell: { getValue: () => unknown } }) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              cell.getValue()
                ? "bg-emerald-100 text-emerald-700"
                : "bg-orange-100 text-orange-700"
            }`}
          >
            {cell.getValue() ? "Veg" : "Non-Veg"}
          </span>
        ),
      },
      {
        header: "Actions",
        accessorKey: "actions",
        enableSorting: false,
        Cell: ({ row }: { row: { original: FoodRow } }) => (
          <div className="flex items-center gap-2">
            <Can permission={PERMISSIONS.FOOD_UPDATE}>
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
            <Can permission={PERMISSIONS.FOOD_DELETE}>
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
    data: foods,
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
      title: "Total Foods",
      value: foods.length,
      icon: <ShoppingBasket size={22} className="text-gray-500" />,
    },
    {
      title: "Available",
      value: foods.filter((f) => f.status !== "Inactive").length,
      icon: <Boxes size={22} className="text-gray-500" />,
    },
    {
      title: "Food Categories",
      value: new Set(foods.map((f) => f.category || "")).size,
      icon: <LayoutList size={22} className="text-gray-500" />,
    },
    {
      title: "Not Available",
      value: foods.filter((f) => f.status === "Inactive").length,
      icon: <ArrowDownCircle size={22} className="text-gray-500" />,
    },
    {
      title: "Veg Items",
      value: foods.filter((f) => f.isVeg !== false).length,
      icon: <UtensilsCrossed size={22} className="text-gray-500" />,
    },
  ];

  const handleDelete = async (food: FoodRow) => {
    const result = await Swal.fire({
      title: "Delete food?",
      text: `Remove "${food.name}" from catalogue?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      confirmButtonColor: "#111111",
    });
    if (!result.isConfirmed || !food._id) return;

    try {
      await handleDeleteFood(food._id);
      await Swal.fire({
        icon: "success",
        title: "Deleted",
        timer: 1400,
        showConfirmButton: false,
      });
      await fetchFoods();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "Delete failed",
        err?.response?.data?.message || "Could not delete food.",
        "error",
      );
    }
  };

  const handleSubmit = async (
    payload: FoodFormPayload,
    imageFile: File | null,
  ) => {
    try {
      setSaving(true);
      const formData = foodPayloadToFormData(payload, imageFile);

      if (editing?._id) {
        await handleUpdateFood(editing._id, formData);
        await Swal.fire({
          icon: "success",
          title: "Food updated",
          timer: 1400,
          showConfirmButton: false,
        });
      } else {
        await handleCreateFood(formData);
        await Swal.fire({
          icon: "success",
          title: "Food created",
          timer: 1400,
          showConfirmButton: false,
        });
      }

      setOpenModal(false);
      setEditing(null);
      await fetchFoods();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      await Swal.fire(
        "Save failed",
        err?.response?.data?.message || "Could not save food.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-1">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Foods List</h1>
        <div className="flex gap-3">
          <Can permission={PERMISSIONS.FOOD_CREATE}>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setOpenModal(true);
              }}
              className="cursor-pointer rounded bg-black px-4 py-2 text-[14px] font-semibold text-white transition hover:bg-gray-900"
            >
              Add Food
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
              {loading ? (
                <Loader2 size={22} className="animate-spin text-gray-400" />
              ) : (
                item.value
              )}
            </div>
          </div>
        ))}
      </div>

      <MaterialReactTable table={table} />

      <AddFoodModal
        open={openModal}
        onClose={() => {
          if (saving) return;
          setOpenModal(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        loading={saving}
        initialFood={editing}
      />
    </div>
  );
}

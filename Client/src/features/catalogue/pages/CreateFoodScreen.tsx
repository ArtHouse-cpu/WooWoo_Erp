import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import {
  ArrowDownCircle,
  Boxes,
  Search,
  LayoutList,
  Loader2,
  ShoppingBasket,
  SquarePen,
  Trash2,
  X,
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<FoodRow | null>(null);
  const [viewFood, setViewFood] = useState<FoodRow | null>(null);
  const [foods, setFoods] = useState<FoodRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFoods = useMemo(() => {
    if (!searchQuery.trim()) return foods;
    const q = searchQuery.toLowerCase();
    return foods.filter(
      (f) =>
        (f.name || "").toLowerCase().includes(q) ||
        (f.category || "").toLowerCase().includes(q),
    );
  }, [foods, searchQuery]);

  useEffect(() => {
    if (searchParams.get("create") !== "1") return;
    setEditing(null);
    setOpenModal(true);
    const next = new URLSearchParams(searchParams);
    next.delete("create");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

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
        accessorKey: "isPackaged",
        header: "Label",
        Cell: ({ cell }: { cell: { getValue: () => unknown } }) => {
          const packaged = cell.getValue() === true;
          return (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                packaged
                  ? "bg-orange-100 text-orange-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {packaged ? "Packaged Food" : "Food"}
            </span>
          );
        },
      },
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
    <div className="min-w-0 p-1">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Foods List</h1>
        <div className="flex gap-3">
          <Can permission={PERMISSIONS.FOOD_CREATE}>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setOpenModal(true);
              }}
              className="w-full cursor-pointer rounded bg-black px-4 py-2 text-[14px] font-semibold text-white transition hover:bg-gray-900 sm:w-auto"
            >
              Add Food
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
              {loading ? (
                <Loader2 size={22} className="animate-spin text-gray-400" />
              ) : (
                item.value
              )}
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
            placeholder="Search foods..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-slate-400"
          />
        </div>

        {loading && foods.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
            Loading foods...
          </div>
        ) : filteredFoods.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
            No foods found
          </div>
        ) : (
          filteredFoods.map((food, idx) => {
            const available = String(food.status || "Active") !== "Inactive";

            return (
              <div
                key={food._id || idx}
                onClick={() => setViewFood(food)}
                className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition hover:border-slate-300 active:bg-slate-50/70"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-bold text-slate-900">
                        {food.name}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.2 text-[10px] font-semibold ${
                          food.isVeg !== false
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60"
                            : "bg-orange-50 text-orange-700 ring-1 ring-orange-200/60"
                        }`}
                      >
                        {food.isVeg !== false ? "Veg" : "Non-Veg"}
                      </span>
                      {food.isPackaged && (
                        <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.2 text-[10px] font-semibold text-orange-700">
                          Packaged
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-600">
                        {food.category || "General"}
                      </span>
                      {food.unit && (
                        <>
                          <span>•</span>
                          <span>Unit: {food.unit}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      available
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {available ? "Available" : "Not Available"}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <div>
                    <span className="block text-[10px] font-medium uppercase text-slate-400">
                      Price
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      ₹{Number(food.price || 0).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div
                    className="flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Can permission={PERMISSIONS.FOOD_UPDATE}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(food);
                          setOpenModal(true);
                        }}
                        className="cursor-pointer rounded-lg bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100"
                        title="Edit food"
                      >
                        <SquarePen size={15} />
                      </button>
                    </Can>
                    <Can permission={PERMISSIONS.FOOD_DELETE}>
                      <button
                        type="button"
                        onClick={() => void handleDelete(food)}
                        className="cursor-pointer rounded-lg bg-rose-50 p-1.5 text-rose-700 hover:bg-rose-100"
                        title="Delete food"
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
      {/* Food View Details Modal */}
      {viewFood && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setViewFood(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <ShoppingBasket size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Food Item Details
                  </h3>
                  <p className="text-xs text-slate-400">
                    {viewFood.category || "General"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewFood(null)}
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
                      Food Name
                    </span>
                    <h4 className="text-lg font-bold text-slate-900 mt-0.5 truncate">
                      {viewFood.name}
                    </h4>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        viewFood.status !== "Inactive"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {viewFood.status !== "Inactive" ? "Available" : "Not Available"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.2 text-[10px] font-semibold ${
                        viewFood.isVeg !== false
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60"
                          : "bg-orange-50 text-orange-700 ring-1 ring-orange-200/60"
                      }`}
                    >
                      {viewFood.isVeg !== false ? "Veg" : "Non-Veg"}
                    </span>
                  </div>
                </div>

                {/* Metric Tiles */}
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200/60 pt-3 text-center">
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Price
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      ₹{Number(viewFood.price || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Unit
                    </span>
                    <span className="text-sm font-semibold text-slate-700">
                      {viewFood.unit || "—"}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Type
                    </span>
                    <span className="text-sm font-semibold text-slate-700">
                      {viewFood.isPackaged ? "Packaged" : "Fresh"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Specs List */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Category</span>
                  <span className="font-semibold text-slate-800">
                    {viewFood.category || "—"}
                  </span>
                </div>
                {viewFood.description && (
                  <div className="pt-1">
                    <span className="text-slate-500 block mb-1">Description</span>
                    <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {viewFood.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setViewFood(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Close
              </button>
              <Can permission={PERMISSIONS.FOOD_UPDATE}>
                <button
                  type="button"
                  onClick={() => {
                    const fd = viewFood;
                    setViewFood(null);
                    setEditing(fd);
                    setOpenModal(true);
                  }}
                  className="rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-black/90 transition"
                >
                  Edit Food
                </button>
              </Can>
            </div>
          </div>
        </div>
      )}


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

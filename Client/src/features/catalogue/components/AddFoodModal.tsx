import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import type { FoodPayload } from "@/services/apiClient";

export type FoodFormPayload = {
  name: string;
  category: string;
  price: number;
  unit: string;
  description: string;
  isVeg: boolean;
  /** Available = Active, Not Available = Inactive */
  status: "Active" | "Inactive";
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: FoodFormPayload, imageFile: File | null) => Promise<void>;
  loading?: boolean;
  initialFood?: FoodPayload | null;
};

const FOOD_CATEGORIES = [
  "Beverages",
  "Snacks",
  "Meals",
  "Desserts",
  "Combos",
];

const UNITS = ["Plate", "Cup", "Glass", "Piece", "Pack", "Bowl"];

const emptyForm: FoodFormPayload = {
  name: "",
  category: "Snacks",
  price: 0,
  unit: "Plate",
  description: "",
  isVeg: true,
  status: "Active",
};

export default function AddFoodModal({
  open,
  onClose,
  onSubmit,
  loading = false,
  initialFood = null,
}: Props) {
  const [form, setForm] = useState<FoodFormPayload>(emptyForm);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initialFood) {
      setForm({
        name: String(initialFood.name || ""),
        category: String(initialFood.category || "Snacks"),
        price: Number(initialFood.price || 0),
        unit: String(initialFood.unit || "Plate"),
        description: String(initialFood.description || ""),
        isVeg: initialFood.isVeg !== false,
        status: initialFood.status === "Inactive" ? "Inactive" : "Active",
      });
      setPreview(initialFood.imageUrl || null);
      setImageFile(null);
    } else {
      setForm(emptyForm);
      setPreview(null);
      setImageFile(null);
    }
  }, [open, initialFood]);

  if (!open) return null;

  const isEdit = Boolean(initialFood?._id);

  const handleImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || loading) return;
    await onSubmit(
      {
        ...form,
        name: form.name.trim(),
        price: Number(form.price || 0),
        status: form.status,
      },
      imageFile,
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target && !loading) onClose();
      }}
    >
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-xl font-semibold text-gray-800">
          {isEdit ? "Update Food Item" : "Add Food Item"}
        </h2>
        <p className="mb-5 text-sm text-gray-500">
          {isEdit
            ? "Edit food item details."
            : "Create a new food item for the catalogue."}
        </p>

        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-full p-2 transition hover:bg-gray-100 disabled:opacity-50"
          aria-label="Close"
        >
          <X size={22} />
        </button>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Food Name <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Masala Dosa"
                required
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 p-3 outline-none transition focus:ring-2 focus:ring-black disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 p-3 outline-none transition focus:ring-2 focus:ring-black disabled:opacity-60"
              >
                {FOOD_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Unit
              </label>
              <select
                value={form.unit}
                onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 p-3 outline-none transition focus:ring-2 focus:ring-black disabled:opacity-60"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Price (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">₹</span>
                <input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, price: Number(e.target.value || 0) }))
                  }
                  required
                  disabled={loading}
                  className="w-full rounded-lg border border-gray-300 p-3 pl-8 outline-none transition focus:ring-2 focus:ring-black disabled:opacity-60"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Availability
              </label>
              <select
                value={form.status === "Inactive" ? "Inactive" : "Active"}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    status: e.target.value === "Inactive" ? "Inactive" : "Active",
                  }))
                }
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 p-3 outline-none transition focus:ring-2 focus:ring-black disabled:opacity-60"
              >
                <option value="Active">Available</option>
                <option value="Inactive">Not Available</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                disabled={loading}
                placeholder="Short description of the food item"
                className="w-full resize-none rounded-lg border border-gray-300 p-3 outline-none transition focus:ring-2 focus:ring-black disabled:opacity-60"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 md:col-span-2">
              <div>
                <p className="text-sm font-medium text-gray-800">Vegetarian</p>
                <p className="text-xs text-gray-500">Mark if this item is veg</p>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => setForm((p) => ({ ...p, isVeg: !p.isVeg }))}
                className={`relative h-8 w-14 rounded-full transition ${
                  form.isVeg ? "bg-emerald-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                    form.isVeg ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Food Image
              </label>
              <label
                htmlFor="food-image"
                className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-400 p-4 transition hover:bg-gray-50"
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="Food preview"
                    className="h-28 w-28 rounded-lg object-cover"
                  />
                ) : (
                  <>
                    <ImagePlus size={36} className="mb-2 text-gray-500" />
                    <p className="text-sm text-gray-500">Click to upload food image</p>
                  </>
                )}
                <input
                  id="food-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImage}
                  disabled={loading}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!form.name.trim() || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {isEdit ? "Update Food" : "Add Food"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

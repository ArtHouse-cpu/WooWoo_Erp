import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import type { FoodPayload } from "@/services/apiClient";
import { closeIfConfirmed } from "@/utils/confirmClose";

export type FoodFormPayload = {
  name: string;
  category: string;
  price: number;
  unit: string;
  isPackaged: boolean;
  manageInventory: boolean;
  lowStockAlertLevel: number | null;
  applyMembershipDiscount: boolean;
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
  "Drinks",
  "Healthy",
  "Starters",
  "Main Course",
  "Combos",
  "Desserts",
  "Extras",
  "Snacks",
];

const UNITS = ["Plate", "Cup", "Per Head", "Glass", "Piece", "Pack", "Bowl"];
const fieldClass =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:opacity-60";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

const emptyForm: FoodFormPayload = {
  name: "",
  category: "Snacks",
  price: 0,
  unit: "Plate",
  isPackaged: false,
  manageInventory: false,
  lowStockAlertLevel: null,
  applyMembershipDiscount: true,
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
        isPackaged: initialFood.isPackaged === true,
        manageInventory: initialFood.manageInventory === true,
        lowStockAlertLevel:
          initialFood.lowStockAlertLevel == null
            ? null
            : Math.max(0, Number(initialFood.lowStockAlertLevel) || 0),
        applyMembershipDiscount: initialFood.applyMembershipDiscount !== false,
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target && !loading) void closeIfConfirmed(onClose);
      }}
    >
      <div className="flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-white shadow-xl sm:h-auto sm:max-h-[min(92dvh,760px)] sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">
              {isEdit ? "Update Food Item" : "Add Food Item"}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {isEdit
                ? "Edit food item details."
                : "Create a new food item for the catalogue."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void closeIfConfirmed(onClose)}
            disabled={loading}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>
                Food Name <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Masala Dosa"
                required
                disabled={loading}
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                disabled={loading}
                className={fieldClass}
              >
                {FOOD_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Unit
              </label>
              <select
                value={form.unit}
                onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                disabled={loading}
                className={fieldClass}
              >
                {(UNITS.includes(form.unit) ? UNITS : [form.unit, ...UNITS]).map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Price (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">₹</span>
                <input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, price: Number(e.target.value || 0) }))
                  }
                  required
                  disabled={loading}
                  className={`${fieldClass} pl-8`}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>
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
                className={fieldClass}
              >
                <option value="Active">Available</option>
                <option value="Inactive">Not Available</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>
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
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">Manage Inventory</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {form.manageInventory
                        ? "Stock is tracked. Sell this food only after a purchase adds quantity."
                        : "No stock tracking. This food can be sold as it is today."}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    aria-pressed={form.manageInventory}
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        manageInventory: !p.manageInventory,
                        lowStockAlertLevel: p.manageInventory ? null : p.lowStockAlertLevel,
                      }))
                    }
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                      form.manageInventory ? "bg-slate-900" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                        form.manageInventory ? "left-5" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
                {form.manageInventory ? (
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <label className={labelClass}>Stock level</label>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={form.lowStockAlertLevel ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setForm((p) => ({
                          ...p,
                          lowStockAlertLevel: raw === "" ? null : Math.max(0, Number(raw) || 0),
                        }));
                      }}
                      disabled={loading}
                      placeholder="Set the low-stock level"
                      className={fieldClass}
                    />
                    <p className="mt-1.5 text-xs text-slate-500">
                      Alert when available stock is at or below this number.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="flex h-fit items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">Membership Benefits</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {form.applyMembershipDiscount
                      ? "The customer's membership discount applies at checkout."
                      : "Checkout charges the full price for this food."}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  aria-pressed={form.applyMembershipDiscount}
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      applyMembershipDiscount: !p.applyMembershipDiscount,
                    }))
                  }
                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                    form.applyMembershipDiscount ? "bg-blue-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                      form.applyMembershipDiscount ? "left-5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">Packaged Food</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {form.isPackaged ? "This item is sold as packaged food." : "This item is sold as prepared food."}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  aria-pressed={form.isPackaged}
                  onClick={() => setForm((p) => ({ ...p, isPackaged: !p.isPackaged }))}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                    form.isPackaged ? "bg-orange-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                      form.isPackaged ? "left-5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Food Image</label>
              <label
                htmlFor="food-image"
                className="flex min-h-28 w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-slate-400 hover:bg-white"
              >
                {preview ? (
                  <img src={preview} alt="Food preview" className="h-24 w-24 rounded-lg object-cover" />
                ) : (
                  <>
                    <ImagePlus size={28} className="mb-2 text-slate-400" />
                    <p className="text-sm text-slate-500">Click to upload a food image</p>
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
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
            <button
              type="button"
              onClick={() => void closeIfConfirmed(onClose)}
              disabled={loading}
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!form.name.trim() || loading}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
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

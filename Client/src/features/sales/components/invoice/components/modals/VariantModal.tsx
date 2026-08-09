import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { X } from "lucide-react";

export type VariantInput = {
  name: string;
  sellingPrice: number;
  purchasePrice: number;
  barcode: string;
};

type Props = {
  onClose: () => void;
  onSave: (variant: VariantInput) => void;
  initialValue?: VariantInput | null;
};

const emptyVariant: VariantInput = {
  name: "",
  sellingPrice: 0,
  purchasePrice: 0,
  barcode: "",
};

/**
 * Rendered via portal (outside the product <form>) and without a nested <form>.
 * Nested forms caused Save Variant to native-GET navigate to
 * /products?name=...&sellingPrice=...&purchasePrice=...&barcode=...
 */
export default function VariantModal({ onClose, onSave, initialValue }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VariantInput>({
    defaultValues: initialValue ?? emptyVariant,
  });

  useEffect(() => {
    reset(
      initialValue
        ? {
            name: String(initialValue.name || ""),
            sellingPrice: Number(initialValue.sellingPrice) || 0,
            purchasePrice: Number(initialValue.purchasePrice) || 0,
            barcode: String(initialValue.barcode || ""),
          }
        : emptyVariant,
    );
  }, [initialValue, reset]);

  const saveVariant = handleSubmit((value) => {
    const sellingPrice = Number(value.sellingPrice);
    const purchasePrice = Number(value.purchasePrice);
    if (!String(value.name || "").trim()) return;
    if (!(sellingPrice > 0)) return;
    onSave({
      name: String(value.name || "").trim(),
      sellingPrice,
      purchasePrice: Number.isFinite(purchasePrice)
        ? Math.max(0, purchasePrice)
        : 0,
      barcode: String(value.barcode || "").trim(),
    });
  });

  const modal = (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={initialValue ? "Edit Variant" : "Add Variant"}
      onMouseDown={(e) => {
        // Click outside panel closes; don't let events hit the product form.
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-xl rounded-xl bg-white p-5 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        // Block submit events from bubbling to the parent product form (React tree).
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <h3 className="text-lg font-semibold">
          {initialValue ? "Edit Variant" : "Add Variant"}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-2 hover:bg-gray-100"
        >
          <X size={18} />
        </button>

        {/* Intentionally NOT a <form> — avoids nested-form GET navigation. */}
        <div
          className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2"
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            // Allow Enter in textarea later; for inputs, save instead of submit parent.
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === "TEXTAREA") return;
            e.preventDefault();
            e.stopPropagation();
            void saveVariant();
          }}
        >
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Variant name <span className="text-red-500">*</span>
            </label>
            <input
              {...register("name", { required: "Variant name is required" })}
              placeholder="e.g. Size M / Red"
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
              autoFocus
            />
            {errors.name ? (
              <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Selling price <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              {...register("sellingPrice", {
                valueAsNumber: true,
                required: "Selling price is required",
                validate: (v) =>
                  Number(v) > 0 || "Selling price must be greater than 0",
              })}
              placeholder="0.00"
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
            />
            {errors.sellingPrice ? (
              <p className="mt-1 text-xs text-red-500">
                {String(errors.sellingPrice.message || "Invalid price")}
              </p>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Purchase price
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              {...register("purchasePrice", { valueAsNumber: true, min: 0 })}
              placeholder="0.00"
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Barcode
            </label>
            <input
              {...register("barcode")}
              placeholder="Optional barcode"
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 md:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void saveVariant();
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              Save Variant
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

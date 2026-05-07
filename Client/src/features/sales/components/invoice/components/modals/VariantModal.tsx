import { useEffect } from "react";
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

export default function VariantModal({ onClose, onSave, initialValue }: Props) {
  const { register, handleSubmit, reset } = useForm<VariantInput>({
    defaultValues: initialValue ?? {
      name: "",
      sellingPrice: 0,
      purchasePrice: 0,
      barcode: "",
    },
  });

  useEffect(() => {
    if (initialValue) reset(initialValue);
  }, [initialValue, reset]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold">{initialValue ? "Edit Variant" : "Add Variant"}</h3>
        <button onClick={onClose} className="absolute right-3 top-3 rounded-full p-2 hover:bg-gray-100">
          <X size={18} />
        </button>

        <form
          className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2"
          onSubmit={handleSubmit((value) => {
            onSave({
              ...value,
              sellingPrice: Number(value.sellingPrice),
              purchasePrice: Number(value.purchasePrice),
            });
            onClose();
          })}
        >
          <input
            {...register("name", { required: true })}
            placeholder="Variant name"
            className="rounded-lg border border-gray-300 p-2.5 text-sm md:col-span-2"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            {...register("sellingPrice", { valueAsNumber: true, min: 0 })}
            placeholder="Selling price"
            className="rounded-lg border border-gray-300 p-2.5 text-sm"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            {...register("purchasePrice", { valueAsNumber: true, min: 0 })}
            placeholder="Purchase price"
            className="rounded-lg border border-gray-300 p-2.5 text-sm"
          />
          <input
            {...register("barcode")}
            placeholder="Barcode"
            className="rounded-lg border border-gray-300 p-2.5 text-sm md:col-span-2"
          />
          <div className="flex justify-end gap-2 md:col-span-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
              Save Variant
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

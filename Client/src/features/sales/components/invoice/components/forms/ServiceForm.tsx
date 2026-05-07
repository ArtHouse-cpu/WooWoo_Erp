import { useFormContext } from "react-hook-form";
import { Wand2 } from "lucide-react";
import DiscountInput from "../shared/DiscountInput";
import ImageUploader from "../shared/ImageUploader";
import type { AddItemFormValues } from "../modals/AddItemModal";

const barcodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const generateBarcode = () =>
  `BC-${Array.from({ length: 8 }, () => barcodeChars[Math.floor(Math.random() * barcodeChars.length)]).join("")}`;

export default function ServiceForm() {
  const { register, watch, setValue } = useFormContext<AddItemFormValues>();
  const images = watch("images");
  const discountType = watch("discountType");
  const discountValue = watch("discountValue");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Service Name *</label>
          <input {...register("serviceName")} className="w-full rounded-lg border border-gray-300 p-2.5 text-sm" autoFocus />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Selling Price (INR) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g. 499.00"
            {...register("sellingPrice", { valueAsNumber: true })}
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Primary Unit</label>
          <input
            placeholder="e.g. Hour, Session, Visit"
            {...register("primaryUnit")}
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Item Code / SKU</label>
          <input
            placeholder="e.g. SRV-001"
            {...register("itemCode")}
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Barcode</label>
        <div className="flex gap-2">
          <input {...register("barcode")} className="flex-1 rounded-lg border border-gray-300 p-2.5 text-sm" />
          <button type="button" onClick={() => setValue("barcode", generateBarcode())} className="rounded-lg border border-gray-300 px-3 text-gray-600">
            <Wand2 size={16} />
          </button>
        </div>
      </div>

      <DiscountInput
        valueType={discountType}
        valueAmount={discountValue}
        onTypeChange={(type) => setValue("discountType", type)}
        onValueChange={(value) => setValue("discountValue", value)}
      />

      <textarea {...register("description")} rows={3} placeholder="Description" className="w-full rounded-lg border border-gray-300 p-2.5 text-sm" />

      <ImageUploader files={images} onFilesChange={(next) => setValue("images", next)} />
    </div>
  );
}

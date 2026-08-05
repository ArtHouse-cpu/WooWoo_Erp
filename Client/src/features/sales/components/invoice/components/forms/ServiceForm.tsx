import { useFormContext } from "react-hook-form";
import { Wand2 } from "lucide-react";
import DiscountInput from "../shared/DiscountInput";
import ImageUploader from "../shared/ImageUploader";
import CategorySelect from "../shared/CategorySelect";
import type { AddItemFormValues } from "../modals/AddItemModal";

const barcodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const generateBarcode = () =>
  `BC-${Array.from({ length: 8 }, () => barcodeChars[Math.floor(Math.random() * barcodeChars.length)]).join("")}`;

export default function ServiceForm() {
  const { register, watch, setValue } = useFormContext<AddItemFormValues>();
  const images = watch("images");
  const discountType = watch("discountType");
  const discountValue = watch("discountValue");
  const categoryId = watch("categoryId");
  const categoryName = watch("category");

  return (
    <div className="space-y-5 p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Service Name <span className="text-red-500">*</span>
          </label>
          <input
            {...register("serviceName")}
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
            placeholder="e.g. Home Consultation"
            autoFocus
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Selling Price (INR) <span className="text-red-500">*</span>
          </label>
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
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Costing / Purchase Price (INR)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g. 200.00"
            {...register("purchasePrice", { valueAsNumber: true })}
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Primary Unit
          </label>
          <input
            placeholder="e.g. Hour, Session, Visit"
            {...register("primaryUnit")}
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Item Code / SKU
          </label>
          <input
            placeholder="e.g. SRV-001"
            {...register("itemCode")}
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Barcode
          </label>
          <div className="flex gap-2">
            <input
              {...register("barcode")}
              className="flex-1 rounded-lg border border-gray-300 p-2.5 text-sm"
              placeholder="Scan or generate"
            />
            <button
              type="button"
              onClick={() => setValue("barcode", generateBarcode(), { shouldDirty: true })}
              className="rounded-lg border border-gray-300 px-3 text-gray-600 hover:bg-gray-50"
              title="Generate barcode"
            >
              <Wand2 size={16} />
            </button>
          </div>
        </div>
      </div>

      <CategorySelect
        categoryValue={categoryId || ""}
        categoryName={categoryName || ""}
        categoryLabel="Services Category"
        hideSubCategory
        onCategoryChange={(id, name) => {
          setValue("categoryId", id, { shouldDirty: true });
          setValue("category", name, { shouldDirty: true });
        }}
      />

      <DiscountInput
        valueType={discountType}
        valueAmount={discountValue}
        onTypeChange={(type) => setValue("discountType", type)}
        onValueChange={(value) => setValue("discountValue", value)}
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          {...register("description")}
          rows={3}
          placeholder="Describe this service..."
          className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
        />
      </div>

      <ImageUploader
        label="Service image"
        files={images}
        onFilesChange={(next) => setValue("images", next)}
      />
    </div>
  );
}

import { useEffect, useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Pencil, Plus, Trash2, Wand2 } from "lucide-react";
import CategorySelect from "../shared/CategorySelect";
import DiscountInput from "../shared/DiscountInput";
import ImageUploader from "../shared/ImageUploader";
import type { AddItemFormValues } from "../modals/AddItemModal";
import type { VariantInput } from "../modals/VariantModal";
import {
  handleGetCspEnrollments,
  type CspEnrollment,
} from "@/services/apiClient";

type Props = {
  onAddVariant: () => void;
  onEditVariant: (index: number) => void;
};

const barcodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const generateBarcode = () =>
  `BC-${Array.from({ length: 8 }, () => barcodeChars[Math.floor(Math.random() * barcodeChars.length)]).join("")}`;

export default function ProductForm({ onAddVariant, onEditVariant }: Props) {
  const { register, watch, setValue, control } = useFormContext<AddItemFormValues>();
  const { fields, remove } = useFieldArray({ control, name: "variants" });
  const [cspOptions, setCspOptions] = useState<CspEnrollment[]>([]);
  const [loadingCsp, setLoadingCsp] = useState(false);

  const images = watch("images");
  const discountType = watch("discountType");
  const discountValue = watch("discountValue");
  const stockStatus = watch("stockStatus");
  const isCsp = watch("isCsp");
  const categoryId = watch("categoryId");
  const categoryName = watch("category");
  const subCategoryId = watch("subCategoryId");
  const subCategoryName = watch("subCategory");
  const cspEnrollmentId = watch("cspEnrollmentId");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingCsp(true);
        // Include inactive so edit can still show the saved sailor
        const res = await handleGetCspEnrollments({ status: "all" });
        if (cancelled) return;
        const rows = Array.isArray(res?.enrollments)
          ? res.enrollments
          : Array.isArray(res?.csps)
            ? res.csps
            : [];
        setCspOptions(rows);
      } catch (error) {
        console.error("Failed to load CSP sailors:", error);
        if (!cancelled) setCspOptions([]);
      } finally {
        if (!cancelled) setLoadingCsp(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep CSP select value aligned after options load (ObjectId → string)
  useEffect(() => {
    if (!cspEnrollmentId || !cspOptions.length) return;
    const match = cspOptions.find(
      (row) => String(row._id) === String(cspEnrollmentId),
    );
    if (match) {
      const normalized = String(match._id);
      if (normalized !== cspEnrollmentId) {
        setValue("cspEnrollmentId", normalized, { shouldValidate: true });
      }
    }
  }, [cspOptions, cspEnrollmentId, setValue]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Product Name *</label>
          <input {...register("productName")} className="w-full rounded-lg border border-gray-300 p-2.5 text-sm" autoFocus />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Brand Name</label>
          <input {...register("brandName")} placeholder="e.g. Nike, Apple" className="w-full rounded-lg border border-gray-300 p-2.5 text-sm" />
        </div>
        <CategorySelect
          categoryValue={categoryId || ""}
          categoryName={categoryName || ""}
          onCategoryChange={(id, name) => {
            setValue("categoryId", id, { shouldDirty: true });
            setValue("category", name, { shouldDirty: true });
          }}
          subCategoryValue={subCategoryId || ""}
          subCategoryName={subCategoryName || ""}
          onSubCategoryChange={(id, name) => {
            setValue("subCategoryId", id, { shouldDirty: true });
            setValue("subCategory", name, { shouldDirty: true });
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">CSP (Customer Sailor Program)</label>
          <select
            value={isCsp || "no"}
            onChange={(e) => {
              const next = e.target.value as "yes" | "no";
              setValue("isCsp", next, { shouldValidate: true });
              if (next === "no") setValue("cspEnrollmentId", "");
            }}
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
        {isCsp === "yes" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">CSP Sailor *</label>
            <select
              value={String(cspEnrollmentId || "")}
              onChange={(e) =>
                setValue("cspEnrollmentId", e.target.value, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
              disabled={loadingCsp}
            >
              <option value="">{loadingCsp ? "Loading sailors…" : "Select CSP sailor"}</option>
              {cspOptions.map((row) => (
                <option key={row._id} value={String(row._id)}>
                  {row.label ||
                    `CSP · ${
                      row.displayName ||
                      row.customer?.name ||
                      (typeof row.customerId === "object"
                        ? row.customerId?.name
                        : "") ||
                      "Sailor"
                    }`}
                  {row.mobile
                    ? ` (${row.mobile})`
                    : typeof row.customerId === "object" && row.customerId?.mobile
                      ? ` (${row.customerId.mobile})`
                      : ""}
                </option>
              ))}
            </select>
            {!loadingCsp && cspOptions.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                No CSP sailors found. Enroll one under Network → CSP.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Selling Price (INR) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g. 999.00"
            {...register("sellingPrice", { valueAsNumber: true })}
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Purchase Price (INR)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g. 750.00"
            {...register("purchasePrice", { valueAsNumber: true })}
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Stock Quantity</label>
          <input
            type="number"
            min="0"
            placeholder="e.g. 10"
            {...register("stockQty", { valueAsNumber: true })}
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Item Code / SKU</label>
          <input
            placeholder="e.g. SKU-12345"
            {...register("itemCode")}
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Barcode</label>
          <div className="flex gap-2">
            <input {...register("barcode")} className="flex-1 rounded-lg border border-gray-300 p-2.5 text-sm" />
            <button type="button" onClick={() => setValue("barcode", generateBarcode())} className="rounded-lg border border-gray-300 px-3 text-gray-600">
              <Wand2 size={16} />
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Stock Status</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setValue("stockStatus", "in_stock")} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${stockStatus === "in_stock" ? "bg-green-600 text-white" : "bg-green-50 text-green-700"}`}>
              In Stock
            </button>
            <button type="button" onClick={() => setValue("stockStatus", "out_of_stock")} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${stockStatus === "out_of_stock" ? "bg-red-600 text-white" : "bg-red-50 text-red-700"}`}>
              Out of Stock
            </button>
          </div>
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

      <div className="space-y-2 rounded-lg border border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-800">Variants</h4>
          <button type="button" onClick={onAddVariant} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white">
            <Plus size={14} /> Add Variant
          </button>
        </div>
        {fields.length === 0 ? (
          <p className="text-xs text-gray-500">No variants added.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-2 py-2 text-left">Name</th>
                  <th className="px-2 py-2 text-right">Selling Price</th>
                  <th className="px-2 py-2 text-right">Purchase Price</th>
                  <th className="px-2 py-2 text-left">Barcode</th>
                  <th className="px-2 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, idx) => {
                  const variant = field as unknown as VariantInput;
                  return (
                    <tr key={field.id} className="border-t">
                      <td className="px-2 py-2">{variant.name}</td>
                      <td className="px-2 py-2 text-right">{variant.sellingPrice}</td>
                      <td className="px-2 py-2 text-right">{variant.purchasePrice}</td>
                      <td className="px-2 py-2">{variant.barcode}</td>
                      <td className="px-2 py-2">
                        <div className="flex justify-center gap-1">
                          <button type="button" onClick={() => onEditVariant(idx)} className="rounded bg-gray-100 p-1">
                            <Pencil size={12} />
                          </button>
                          <button type="button" onClick={() => remove(idx)} className="rounded bg-red-50 p-1 text-red-600">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

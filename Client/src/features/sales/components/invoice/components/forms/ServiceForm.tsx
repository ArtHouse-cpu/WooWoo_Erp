import { type ReactNode } from "react";
import { useFormContext } from "react-hook-form";
import { Wand2 } from "lucide-react";
import DiscountInput from "../shared/DiscountInput";
import ImageUploader from "../shared/ImageUploader";
import CategorySelect from "../shared/CategorySelect";
import type { AddItemFormValues } from "../modals/AddItemModal";

const barcodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const generateBarcode = () =>
  `BC-${Array.from({ length: 8 }, () => barcodeChars[Math.floor(Math.random() * barcodeChars.length)]).join("")}`;

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";
const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 border-b border-slate-100 pb-3">
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        {description ? (
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function ServiceForm() {
  const { register, watch, setValue } = useFormContext<AddItemFormValues>();
  const images = watch("images");
  const discountType = watch("discountType");
  const discountValue = watch("discountValue");
  const categoryId = watch("categoryId");
  const categoryName = watch("category");

  return (
    <div className="space-y-4">
      <Section
        title="Basic details"
        description="Name, pricing, and category for this service."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelClass}>
              Service Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register("serviceName")}
              className={inputClass}
              placeholder="e.g. Home Consultation"
              autoFocus
            />
          </div>
          <div>
            <label className={labelClass}>
              Selling Price (INR) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 499.00"
              {...register("sellingPrice", { valueAsNumber: true })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Costing / Purchase Price (INR)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 200.00"
              {...register("purchasePrice", { valueAsNumber: true })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Barcode</label>
            <div className="flex gap-2">
              <input
                {...register("barcode")}
                className={`${inputClass} flex-1`}
                placeholder="Scan or generate"
              />
              <button
                type="button"
                onClick={() =>
                  setValue("barcode", generateBarcode(), { shouldDirty: true })
                }
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                title="Generate barcode"
              >
                <Wand2 size={16} />
              </button>
            </div>
          </div>
          <div>
            <label className={labelClass}>Item Code / SKU</label>
            <input
              placeholder="e.g. SRV-001"
              {...register("itemCode")}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Primary Unit</label>
            <input
              placeholder="e.g. Hour, Session, Visit"
              {...register("primaryUnit")}
              className={inputClass}
            />
          </div>
          <div className="[&_label]:mb-1.5 [&_label]:block [&_label]:text-xs [&_label]:font-semibold [&_label]:uppercase [&_label]:tracking-wide [&_label]:text-slate-500 [&_button.flex]:h-10 [&_button.flex]:rounded-lg [&_button.flex]:border-slate-200 [&>div]:space-y-0">
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
          </div>
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Discount" description="Optional catalogue discount.">
          <DiscountInput
            valueType={discountType}
            valueAmount={discountValue}
            onTypeChange={(type) => setValue("discountType", type)}
            onValueChange={(value) => setValue("discountValue", value)}
          />
        </Section>

        <Section title="Description" description="Optional product notes.">
          <label className={labelClass}>Description</label>
          <textarea
            {...register("description")}
            rows={4}
            placeholder="Short description for this product…"
            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </Section>
      </div>

      <Section title="Images" description="Upload product photos.">
        <ImageUploader
          files={images}
          onFilesChange={(next) => setValue("images", next)}
          label=""
        />
      </Section>
    </div>
  );
}

import { useEffect, useState, type ReactNode } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Pencil, Plus, Trash2, Wand2 } from "lucide-react";
import CategorySelect from "../shared/CategorySelect";
import DiscountInput from "../shared/DiscountInput";
import ImageUploader from "../shared/ImageUploader";
import type { AddItemFormValues } from "../modals/AddItemModal";
import VariantModal, { type VariantInput } from "../modals/VariantModal";
import {
  handleGetCspEnrollments,
  type CspEnrollment,
} from "@/services/apiClient";

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

export default function ProductForm() {
  const { register, watch, setValue, control } =
    useFormContext<AddItemFormValues>();
  const { fields, append, update, remove } = useFieldArray({
    control,
    name: "variants",
  });
  const [cspOptions, setCspOptions] = useState<CspEnrollment[]>([]);
  const [loadingCsp, setLoadingCsp] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [editVariantIndex, setEditVariantIndex] = useState<number | null>(null);

  const images = watch("images");
  const discountType = watch("discountType");
  const discountValue = watch("discountValue");
  const isCsp = watch("isCsp");
  const categoryId = watch("categoryId");
  const categoryName = watch("category");
  const subCategoryId = watch("subCategoryId");
  const subCategoryName = watch("subCategory");
  const cspEnrollmentId = watch("cspEnrollmentId");
  // Live variant values (source of truth for table prices)
  const watchedVariants =
    useWatch({ control, name: "variants" }) ?? ([] as VariantInput[]);
  const hasVariants = fields.length > 0;
  const variantInitial =
    editVariantIndex !== null
      ? (watchedVariants[editVariantIndex] as VariantInput | undefined) ?? null
      : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingCsp(true);
        const res = await handleGetCspEnrollments({ status: "all" });
        if (cancelled) return;
        const rows = Array.isArray(res?.enrollments)
          ? res.enrollments
          : Array.isArray(res?.csps)
            ? res.csps
            : [];
        setCspOptions(rows);
      } catch (error) {
        console.error("Failed to load CSP sellers:", error);
        if (!cancelled) setCspOptions([]);
      } finally {
        if (!cancelled) setLoadingCsp(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    <div className="space-y-4">
      <Section
        title="Basic details"
        description="Name, brand, and how this product is classified."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelClass}>
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register("productName")}
              placeholder="e.g. Canvas Tote Bag"
              className={inputClass}
              autoFocus
            />
          </div>
          <div>
            <label className={labelClass}>Brand Name</label>
            <input
              {...register("brandName")}
              placeholder="e.g. Nike, Apple"
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:[&>div]:grid md:[&>div]:grid-cols-2 md:[&>div]:gap-4 md:[&>div]:space-y-0 [&_label]:mb-1.5 [&_label]:block [&_label]:text-xs [&_label]:font-semibold [&_label]:uppercase [&_label]:tracking-wide [&_label]:text-slate-500 [&_button.flex]:h-10 [&_button.flex]:rounded-lg [&_button.flex]:border-slate-200">
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
          </div>
        </div>
      </Section>

      <Section
        title="Pricing"
        description={
          hasVariants
            ? "Optional parent prices. Variant prices below are used for each option."
            : "Selling and purchase amounts in INR. Optional if you add variants with their own prices."
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Selling Price (INR)</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("sellingPrice", { valueAsNumber: true })}
                className={`${inputClass} pl-7`}
              />
            </div>
            {hasVariants ? (
              <p className="mt-1 text-[11px] text-slate-400">
                Optional — each variant uses its own selling price.
              </p>
            ) : null}
          </div>
          <div>
            <label className={labelClass}>Purchase Price (INR)</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("purchasePrice", { valueAsNumber: true })}
                className={`${inputClass} pl-7`}
              />
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Identifiers"
        description="SKU and barcode used for inventory and billing."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Item Code / SKU</label>
            <input
              placeholder="e.g. SKU-12345"
              {...register("itemCode")}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Barcode</label>
            <div className="flex gap-2">
              <input
                {...register("barcode")}
                placeholder="Scan or generate"
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                title="Generate barcode"
                onClick={() => setValue("barcode", generateBarcode())}
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <Wand2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </Section>

      <Section title="CSP" description="Customer Seller Program settings.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>CSP (Customer Seller Program)</label>
            <select
              value={isCsp || "no"}
              onChange={(e) => {
                const next = e.target.value as "yes" | "no";
                setValue("isCsp", next, { shouldValidate: true });
                if (next === "no") setValue("cspEnrollmentId", "");
              }}
              className={inputClass}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          {isCsp === "yes" ? (
            <div>
              <label className={labelClass}>
                CSP Seller <span className="text-red-500">*</span>
              </label>
              <select
                value={String(cspEnrollmentId || "")}
                onChange={(e) =>
                  setValue("cspEnrollmentId", e.target.value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                className={inputClass}
                disabled={loadingCsp}
              >
                <option value="">
                  {loadingCsp ? "Loading sellers…" : "Select CSP seller"}
                </option>
                {cspOptions.map((row) => (
                  <option key={row._id} value={String(row._id)}>
                    {row.label ||
                      `CSP · ${
                        row.displayName ||
                        row.customer?.name ||
                        (typeof row.customerId === "object"
                          ? row.customerId?.name
                          : "") ||
                        "Seller"
                      }`}
                    {row.mobile
                      ? ` (${row.mobile})`
                      : typeof row.customerId === "object" &&
                          row.customerId?.mobile
                        ? ` (${row.customerId.mobile})`
                        : ""}
                  </option>
                ))}
              </select>
              {!loadingCsp && cspOptions.length === 0 ? (
                <p className="mt-1.5 text-xs text-amber-600">
                  No CSP sellers found. Enroll one under Network → CSP.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="hidden sm:block" aria-hidden />
          )}
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

      <Section
        title="Variants"
        description="Optional size/color options with their own prices (source of truth when present)."
      >
        <div className="mb-3 flex items-center justify-end">
          <button
            type="button"
            onClick={() => {
              setEditVariantIndex(null);
              setShowVariantModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={14} /> Add Variant
          </button>
        </div>
        {fields.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
            <p className="text-sm text-slate-600">No variants added yet.</p>
            <p className="mt-1 text-xs text-slate-400">
              Add variants if this product has sizes, colors, or packs.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-semibold">
                      Variant
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Selling Price
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Purchase Price
                    </th>
                    <th className="px-3 py-2.5 text-left font-semibold">
                      Barcode
                    </th>
                    <th className="px-3 py-2.5 text-center font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {fields.map((field, idx) => {
                    const live = watchedVariants[idx] as
                      | VariantInput
                      | undefined;
                    const name = String(live?.name ?? field.name ?? "").trim();
                    const selling = Number(
                      live?.sellingPrice ?? field.sellingPrice ?? 0,
                    );
                    const purchase = Number(
                      live?.purchasePrice ?? field.purchasePrice ?? 0,
                    );
                    const barcode = String(
                      live?.barcode ?? field.barcode ?? "",
                    ).trim();
                    return (
                      <tr key={field.id} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2.5 font-medium text-slate-800">
                          {name || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                          ₹
                          {selling.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                          ₹
                          {purchase.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {barcode || "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditVariantIndex(idx);
                                setShowVariantModal(true);
                              }}
                              className="rounded-md bg-slate-100 p-1.5 text-slate-600 transition hover:bg-slate-200"
                              title="Edit variant"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(idx)}
                              className="rounded-md bg-red-50 p-1.5 text-red-600 transition hover:bg-red-100"
                              title="Remove variant"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>

      {showVariantModal ? (
        <VariantModal
          onClose={() => {
            setShowVariantModal(false);
            setEditVariantIndex(null);
          }}
          initialValue={variantInitial}
          onSave={(variant) => {
            const next: VariantInput = {
              name: String(variant.name || "").trim(),
              sellingPrice: Number(variant.sellingPrice) || 0,
              purchasePrice: Number(variant.purchasePrice) || 0,
              barcode: String(variant.barcode || "").trim(),
            };
            if (editVariantIndex === null) {
              append(next);
            } else {
              update(editVariantIndex, next);
            }
            setShowVariantModal(false);
            setEditVariantIndex(null);
          }}
        />
      ) : null}
    </div>
  );
}

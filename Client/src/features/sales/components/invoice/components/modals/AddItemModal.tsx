import { useEffect, useState } from "react";
import { X, Loader2, Package, Briefcase, AlertCircle } from "lucide-react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Swal from "sweetalert2";
import ProductForm from "../forms/ProductForm";
import ServiceForm from "../forms/ServiceForm";
import VariantModal, { type VariantInput } from "./VariantModal";

const variantSchema = z.object({
  name: z.string().min(1, "Variant name is required"),
  sellingPrice: z.number().min(0, "Selling price must be >= 0"),
  purchasePrice: z.number().min(0, "Purchase price must be >= 0"),
  barcode: z.string().optional().default(""),
});

const baseSchema = z.object({
  type: z.enum(["product", "service"]),
  productName: z.string().optional().default(""),
  brandName: z.string().optional().default(""),
  serviceName: z.string().optional().default(""),
  sellingPrice: z.number().gt(0, "Selling price must be greater than 0"),
  purchasePrice: z.number().min(0).default(0),
  stockQty: z.number().min(0).default(0),
  stockStatus: z.enum(["in_stock", "out_of_stock"]).default("in_stock"),
  primaryUnit: z.string().optional().default(""),
  itemCode: z.string().optional().default(""),
  barcode: z.string().optional().default(""),
  category: z.string().optional().default(""),
  categoryId: z.string().optional().default(""),
  subCategory: z.string().optional().default(""),
  subCategoryId: z.string().optional().default(""),
  description: z.string().optional().default(""),
  discountType: z.enum(["flat", "percentage"]).default("flat"),
  discountValue: z.number().min(0).default(0),
  variants: z.array(variantSchema).default([]),
  images: z.array(z.instanceof(File)).default([]),
  isCsp: z.enum(["yes", "no"]).default("no"),
  cspEnrollmentId: z.string().optional().default(""),
});

const schema = baseSchema.superRefine((value, ctx) => {
  const name = value.type === "product" ? value.productName : value.serviceName;
  if (!name?.trim()) {
    ctx.addIssue({ code: "custom", message: "Name is required", path: [value.type === "product" ? "productName" : "serviceName"] });
  }

  if (value.discountType === "flat" && value.discountValue > value.sellingPrice) {
    ctx.addIssue({
      code: "custom",
      message: "Flat discount cannot exceed selling price",
      path: ["discountValue"],
    });
  }
  if (value.discountType === "percentage" && value.discountValue > 100) {
    ctx.addIssue({
      code: "custom",
      message: "Percentage discount cannot exceed 100",
      path: ["discountValue"],
    });
  }

  if (value.type === "product" && value.isCsp === "yes" && !String(value.cspEnrollmentId || "").trim()) {
    ctx.addIssue({
      code: "custom",
      message: "Select a CSP seller when CSP is Yes",
      path: ["cspEnrollmentId"],
    });
  }
});

export type AddItemFormValues = z.infer<typeof baseSchema>;

type Props = {
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  loading: boolean;
  initialData?: Partial<AddItemFormValues>;
};

const buildDefaultValues = (
  initialData?: Partial<AddItemFormValues>,
): AddItemFormValues => {
  const rawCspId = (initialData as any)?.cspEnrollmentId;
  const cspEnrollmentId =
    rawCspId && typeof rawCspId === "object"
      ? String(rawCspId._id || rawCspId.id || "")
      : String(rawCspId || "");

  return {
    type: initialData?.type || "product",
    productName: initialData?.productName || "",
    brandName: (initialData as any)?.brandName || "",
    serviceName: initialData?.serviceName || "",
    sellingPrice: Number(initialData?.sellingPrice || 0),
    purchasePrice: Number(initialData?.purchasePrice || 0),
    stockQty: Number(initialData?.stockQty || 0),
    stockStatus: initialData?.stockStatus || "in_stock",
    primaryUnit: initialData?.primaryUnit || "",
    itemCode: initialData?.itemCode || "",
    barcode: initialData?.barcode || "",
    category: initialData?.category || "",
    categoryId: String((initialData as any)?.categoryId || ""),
    subCategory: initialData?.subCategory || "",
    subCategoryId: String((initialData as any)?.subCategoryId || ""),
    description: initialData?.description || "",
    discountType: initialData?.discountType || "flat",
    discountValue: Number(initialData?.discountValue || 0),
    variants: initialData?.variants || [],
    images: initialData?.images || [],
    isCsp:
      (initialData as any)?.isCsp === "yes" ||
      (initialData as any)?.isCsp === true
        ? "yes"
        : "no",
    cspEnrollmentId,
  };
};

export default function AddItemModal({ onClose, onSubmit, loading, initialData }: Props) {
  const methods = useForm<AddItemFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: buildDefaultValues(initialData),
  });

  const { handleSubmit, watch, formState, reset, setFocus, control } = methods;
  const { append, update } = useFieldArray({ control, name: "variants" });

  const itemType = watch("type");
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [editVariantIndex, setEditVariantIndex] = useState<number | null>(null);

  // Re-apply saved product values when opening edit modal
  useEffect(() => {
    if (!initialData) return;
    reset(buildDefaultValues(initialData));
  }, [initialData, reset]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFocus(itemType === "product" ? "productName" : "serviceName");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [itemType, setFocus]);

  const variantInitial = editVariantIndex !== null ? watch("variants")[editVariantIndex] : null;

  const submit = handleSubmit(async (values) => {
    if (loading) return;
    const payload = new FormData();
    payload.append("type", values.type);
    payload.append("productName", values.type === "product" ? values.productName : values.serviceName);
    payload.append("brandName", values.brandName || "");
    payload.append("serviceName", values.serviceName);
    payload.append("sellingPrice", String(values.sellingPrice));
    payload.append("purchasePrice", String(values.purchasePrice));
    payload.append("stockQty", String(values.type === "product" ? values.stockQty : 0));
    payload.append("stockStatus", values.stockStatus);
    payload.append("primaryUnit", values.primaryUnit);
    payload.append("itemCode", values.itemCode);
    payload.append("barCode", values.barcode);
    payload.append("category", values.category);
    payload.append("subCategory", values.subCategory);
    payload.append("description", values.description);
    payload.append("discountType", values.discountType);
    payload.append("discountValue", String(values.discountValue));
    payload.append("variants", JSON.stringify(values.variants));
    payload.append("isCsp", values.type === "product" && values.isCsp === "yes" ? "true" : "false");
    payload.append(
      "cspEnrollmentId",
      values.type === "product" && values.isCsp === "yes"
        ? String(values.cspEnrollmentId || "")
        : "",
    );
    values.images.forEach((image: File) => payload.append("images", image));
    await onSubmit(payload);
    reset();
    onClose();
    Swal.fire("Saved", "Item created successfully.", "success");
  });
  console.log("formState", formState);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 sm:p-6 backdrop-blur-sm transition-opacity">
      <div className="relative flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5">
        
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${itemType === "product" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
              {itemType === "product" ? <Package size={24} /> : <Briefcase size={24} />}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {initialData ? (itemType === "product" ? "Edit Product" : "Edit Service") : (itemType === "product" ? "Add New Product" : "Add New Service")}
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {itemType === "product" ? "Manage tangible product details for your inventory." : "Manage service offering or digital product details."}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="rounded-full p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Wrapper */}
        <FormProvider {...methods}>
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
              <div className="space-y-8">
                
                {/* Type Selector */}
                <div>
                  <label className="mb-3 block text-sm font-medium text-slate-700">Item Type</label>
                  <div className="inline-flex w-full rounded-xl bg-slate-100/80 p-1 ring-1 ring-slate-200/50 sm:w-auto">
                    <button
                      type="button"
                      onClick={() => methods.setValue("type", "product")}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-all sm:flex-none ${
                        itemType === "product"
                          ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200"
                          : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                      }`}
                    >
                      <Package size={16} className={itemType === "product" ? "text-blue-600" : "text-slate-400"} />
                      Physical Product
                    </button>
                    <button
                      type="button"
                      onClick={() => methods.setValue("type", "service")}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-all sm:flex-none ${
                        itemType === "service"
                          ? "bg-white text-purple-700 shadow-sm ring-1 ring-slate-200"
                          : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                      }`}
                    >
                      <Briefcase size={16} className={itemType === "service" ? "text-purple-600" : "text-slate-400"} />
                      Service Offering
                    </button>
                  </div>
                </div>

                {/* Dynamic Form Content */}
                <div className="rounded-2xl border border-slate-100 bg-white/50">
                  {itemType === "product" ? (
                    <ProductForm
                      onAddVariant={() => {
                        setEditVariantIndex(null);
                        setShowVariantModal(true);
                      }}
                      onEditVariant={(index) => {
                        setEditVariantIndex(index);
                        setShowVariantModal(true);
                      }}
                    />
                  ) : (
                    <ServiceForm />
                  )}
                </div>

                {/* Form Errors */}
                {Object.values(formState.errors).length > 0 && (
                  <div className="flex animate-in fade-in slide-in-from-bottom-2 items-start rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Please review the errors below</h3>
                      <div className="mt-1 text-sm text-red-700">
                        <p>{Object.values(formState.errors)[0]?.message as string}</p>
                      </div>
                    </div>
                  </div>
                )}
                
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-4 backdrop-blur-sm">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || formState.isSubmitting}
                className={`flex items-center justify-center rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  itemType === "product"
                    ? "bg-blue-600 hover:bg-blue-700 focus:ring-blue-600"
                    : "bg-purple-600 hover:bg-purple-700 focus:ring-purple-600"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : itemType === "product" ? (
                  "Save Product"
                ) : (
                  "Save Service"
                )}
              </button>
            </div>
            
          </form>
        </FormProvider>
      </div>

      {showVariantModal && (
        <VariantModal
          onClose={() => setShowVariantModal(false)}
          initialValue={variantInitial as VariantInput | null}
          onSave={(variant) => {
            if (editVariantIndex === null) append(variant);
            else update(editVariantIndex, variant);
          }}
        />
      )}
    </div>
  );
}

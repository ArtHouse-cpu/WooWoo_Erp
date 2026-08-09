import { useEffect } from "react";
import { X, Loader2, Package, Briefcase, AlertCircle } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Swal from "sweetalert2";
import ProductForm from "../forms/ProductForm";
import ServiceForm from "../forms/ServiceForm";

const variantSchema = z.object({
  name: z.string().min(1, "Variant name is required"),
  sellingPrice: z.number().gt(0, "Variant selling price must be greater than 0"),
  purchasePrice: z.number().min(0, "Purchase price must be >= 0"),
  barcode: z.string().optional().default(""),
});

const baseSchema = z.object({
  type: z.enum(["product", "service"]),
  productName: z.string().optional().default(""),
  brandName: z.string().optional().default(""),
  serviceName: z.string().optional().default(""),
  /** Parent price is optional when variants exist; variant prices are source of truth */
  sellingPrice: z.number().min(0).default(0),
  purchasePrice: z.number().min(0).default(0),
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
    ctx.addIssue({
      code: "custom",
      message: "Name is required",
      path: [value.type === "product" ? "productName" : "serviceName"],
    });
  }

  const hasVariants =
    value.type === "product" &&
    Array.isArray(value.variants) &&
    value.variants.length > 0;

  // Services (and products without variants) still need a parent selling price
  if (value.type === "service" && !(value.sellingPrice > 0)) {
    ctx.addIssue({
      code: "custom",
      message: "Selling price must be greater than 0",
      path: ["sellingPrice"],
    });
  }
  if (value.type === "product" && !hasVariants && !(value.sellingPrice > 0)) {
    ctx.addIssue({
      code: "custom",
      message:
        "Enter a selling price, or add at least one variant with its own price",
      path: ["sellingPrice"],
    });
  }

  if (hasVariants) {
    value.variants.forEach((variant, index) => {
      if (!String(variant?.name || "").trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Variant name is required",
          path: ["variants", index, "name"],
        });
      }
      if (!(Number(variant?.sellingPrice) > 0)) {
        ctx.addIssue({
          code: "custom",
          message: "Variant selling price must be greater than 0",
          path: ["variants", index, "sellingPrice"],
        });
      }
    });
  }

  const priceForDiscount = hasVariants
    ? Math.max(
        0,
        ...value.variants.map((v) => Number(v.sellingPrice) || 0),
        Number(value.sellingPrice) || 0,
      )
    : Number(value.sellingPrice) || 0;

  if (value.discountType === "flat" && value.discountValue > priceForDiscount) {
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

  if (
    value.type === "product" &&
    value.isCsp === "yes" &&
    !String(value.cspEnrollmentId || "").trim()
  ) {
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
  /** Lock item type and hide the Product/Service toggle */
  lockType?: "product" | "service";
  /** Explicit create vs edit — controls modal title (preferred over inferring from initialData) */
  mode?: "create" | "edit";
};

const buildDefaultValues = (
  initialData?: Partial<AddItemFormValues>,
  lockType?: "product" | "service",
): AddItemFormValues => {
  const rawCspId = (initialData as any)?.cspEnrollmentId;
  const cspEnrollmentId =
    rawCspId && typeof rawCspId === "object"
      ? String(rawCspId._id || rawCspId.id || "")
      : String(rawCspId || "");

  return {
    type: lockType || initialData?.type || "product",
    productName: initialData?.productName || "",
    brandName: (initialData as any)?.brandName || "",
    serviceName:
      initialData?.serviceName ||
      (lockType === "service" ? initialData?.productName || "" : "") ||
      "",
    sellingPrice: Number(initialData?.sellingPrice || 0),
    purchasePrice: Number(initialData?.purchasePrice || 0),
    primaryUnit: initialData?.primaryUnit || "",
    itemCode: initialData?.itemCode || "",
    barcode:
      initialData?.barcode ||
      String((initialData as any)?.barCode || "") ||
      "",
    category: initialData?.category || "",
    categoryId: String((initialData as any)?.categoryId || ""),
    subCategory: initialData?.subCategory || "",
    subCategoryId: String((initialData as any)?.subCategoryId || ""),
    description: initialData?.description || "",
    discountType: initialData?.discountType || "flat",
    discountValue: Number(initialData?.discountValue || 0),
    variants: Array.isArray(initialData?.variants)
      ? initialData.variants.map((v: any) => ({
          name: String(v?.name ?? "").trim(),
          sellingPrice: Number(v?.sellingPrice ?? 0) || 0,
          purchasePrice: Number(v?.purchasePrice ?? 0) || 0,
          barcode: String(v?.barcode ?? v?.barCode ?? "").trim(),
        }))
      : [],
    images: initialData?.images || [],
    isCsp:
      (initialData as any)?.isCsp === "yes" ||
      (initialData as any)?.isCsp === true
        ? "yes"
        : "no",
    cspEnrollmentId,
  };
};

export default function AddItemModal({
  onClose,
  onSubmit,
  loading,
  initialData,
  lockType,
  mode,
}: Props) {
  const isEditMode =
    mode === "edit" ||
    (mode !== "create" &&
      Boolean(
        initialData &&
          ((initialData as { _id?: string })._id ||
            (initialData.productName && initialData.productName.trim()) ||
            (initialData.serviceName && initialData.serviceName.trim())),
      ));
  const methods = useForm<AddItemFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: buildDefaultValues(initialData, lockType),
  });

  const { handleSubmit, watch, formState, reset, setFocus } = methods;

  const itemType = watch("type");

  // Re-apply saved product values when opening edit modal
  useEffect(() => {
    if (!initialData && !lockType) return;
    reset(buildDefaultValues(initialData, lockType));
  }, [initialData, lockType, reset]);

  useEffect(() => {
    if (lockType && itemType !== lockType) {
      methods.setValue("type", lockType);
    }
  }, [lockType, itemType, methods]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFocus(itemType === "product" ? "productName" : "serviceName");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [itemType, setFocus]);

  const modalTitle =
    itemType === "service"
      ? isEditMode
        ? "Edit Services"
        : "Create Services"
      : isEditMode
        ? "Edit Product"
        : "Add New Product";

  const modalSubtitle =
    itemType === "service"
      ? isEditMode
        ? "Update service details and save changes."
        : "Add a new service offering to your catalogue."
      : isEditMode
        ? "Update product details for your catalogue."
        : "Add product details to your catalogue.";

  const submit = handleSubmit(async (values) => {
    if (loading) return;
    const resolvedType = lockType || values.type;
    const normalizedVariants =
      resolvedType === "product" && Array.isArray(values.variants)
        ? values.variants
            .map((v) => ({
              name: String(v?.name ?? "").trim(),
              sellingPrice: Number(v?.sellingPrice) || 0,
              purchasePrice: Number(v?.purchasePrice) || 0,
              barcode: String(v?.barcode ?? "").trim(),
            }))
            .filter((v) => v.name)
        : [];

    // When variants exist, their prices are source of truth.
    // Parent price stays optional; if empty, use first variant for catalogue defaults.
    let sellingPrice = Number(values.sellingPrice) || 0;
    let purchasePrice = Number(values.purchasePrice) || 0;
    if (normalizedVariants.length > 0) {
      if (!(sellingPrice > 0)) {
        sellingPrice = Number(normalizedVariants[0].sellingPrice) || 0;
      }
      if (!(purchasePrice > 0)) {
        purchasePrice = Number(normalizedVariants[0].purchasePrice) || 0;
      }
    }

    const payload = new FormData();
    payload.append("type", resolvedType);
    payload.append(
      "productName",
      resolvedType === "product" ? values.productName : values.serviceName,
    );
    payload.append("brandName", values.brandName || "");
    payload.append("serviceName", values.serviceName || values.productName || "");
    payload.append("sellingPrice", String(sellingPrice));
    payload.append("purchasePrice", String(purchasePrice));
    payload.append("primaryUnit", values.primaryUnit);
    payload.append("itemCode", values.itemCode);
    payload.append("barCode", values.barcode);
    payload.append("category", values.category);
    payload.append("subCategory", values.subCategory);
    payload.append("description", values.description);
    payload.append("discountType", values.discountType);
    payload.append("discountValue", String(values.discountValue));
    payload.append("variants", JSON.stringify(normalizedVariants));
    payload.append(
      "isCsp",
      resolvedType === "product" && values.isCsp === "yes" ? "true" : "false",
    );
    payload.append(
      "cspEnrollmentId",
      resolvedType === "product" && values.isCsp === "yes"
        ? String(values.cspEnrollmentId || "")
        : "",
    );
    values.images.forEach((image: File) => payload.append("images", image));
    await onSubmit(payload);
    reset();
    onClose();
    Swal.fire(
      "Saved",
      resolvedType === "service"
        ? isEditMode
          ? "Service updated successfully."
          : "Service created successfully."
        : isEditMode
          ? "Product updated successfully."
          : "Product created successfully.",
      "success",
    );
  });

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
                {modalTitle}
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {modalSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Wrapper */}
        <FormProvider {...methods}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit(e);
            }}
            method="post"
            className="flex min-h-0 flex-1 flex-col"
          >
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
              <div className="space-y-8">
                
                {/* Type Selector */}
                {!lockType && (
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
                )}

                {/* Dynamic Form Content */}
                <div className="min-w-0">
                  {itemType === "product" ? (
                    <ProductForm />
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                      <ServiceForm />
                    </div>
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
                  isEditMode ? "Update Product" : "Save Product"
                ) : isEditMode ? (
                  "Update Services"
                ) : (
                  "Create Services"
                )}
              </button>
            </div>
            
          </form>
        </FormProvider>
      </div>
    </div>
  );
}

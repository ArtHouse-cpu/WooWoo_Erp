import { useEffect, useState } from "react";
import { X, Loader2, Package, Briefcase, AlertCircle } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Swal from "sweetalert2";
import ProductForm from "../forms/ProductForm";
import ServiceForm from "../forms/ServiceForm";
import { closeIfConfirmed } from "@/utils/confirmClose";

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
  segment: z.string().optional().default(""),
  segmentId: z.string().optional().default(""),
  segments: z
    .array(
      z.object({
        id: z.string().optional().default(""),
        name: z.string().optional().default(""),
      }),
    )
    .default([]),
  subCategory: z.string().optional().default(""),
  subCategoryId: z.string().optional().default(""),
  description: z.string().optional().default(""),
  discountType: z.enum(["flat", "percentage"]).default("flat"),
  discountValue: z.number().min(0).default(0),
  variants: z.array(variantSchema).default([]),
  images: z.array(z.instanceof(File)).default([]),
  isCsp: z.enum(["yes", "no"]).default("no"),
  applyMembershipDiscount: z.boolean().default(true),
  lowStockAlertLevel: z.number().min(0, "Low stock alert cannot be negative").nullable().default(null),
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

function readApiError(error: unknown) {
  const err = error as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  const message = String(err?.response?.data?.message || "").trim();
  if (message) return message;
  return "Could not save. Please try again.";
}

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

function readInitialSegments(initialData?: Partial<AddItemFormValues>) {
  const raw = (initialData as { segments?: unknown })?.segments;
  if (Array.isArray(raw)) {
    const rows = raw
      .map((row) => {
        const item = row as { segmentId?: unknown; id?: unknown; _id?: unknown; name?: unknown; segment?: unknown };
        return {
          id: String(item?.segmentId || item?.id || item?._id || ""),
          name: String(item?.name || item?.segment || "").trim(),
        };
      })
      .filter((row) => row.id || row.name);
    if (rows.length) return rows;
  }
  const source = initialData as { segmentId?: unknown; segment?: unknown } | undefined;
  const rawId = source?.segmentId as { _id?: string } | string | undefined;
  const id = String(
    rawId && typeof rawId === "object" ? rawId._id || "" : rawId || "",
  );
  const name = String(source?.segment || "").trim();
  if (!id && !name) return [];
  return [{ id, name }];
}

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
    segment: String((initialData as any)?.segment || ""),
    segmentId: String(
      (initialData as any)?.segmentId?._id ||
        (initialData as any)?.segmentId ||
        "",
    ),
    segments: readInitialSegments(initialData),
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
    applyMembershipDiscount:
      (initialData as any)?.applyMembershipDiscount === false ||
      (initialData as any)?.applyMembershipDiscount === "false"
        ? false
        : true,
    lowStockAlertLevel:
      (initialData as any)?.lowStockAlertLevel == null ||
      (initialData as any)?.lowStockAlertLevel === ""
        ? null
        : Number((initialData as any).lowStockAlertLevel),
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

  const { handleSubmit, watch, formState, reset, setFocus, getValues } = methods;
  const [submitError, setSubmitError] = useState("");
  const [step, setStep] = useState(0);
  const productSteps = [
    "Basic Details",
    "Pricing & Discount",
    "Inventory & Variants",
    "Media",
    "Review",
  ];

  const itemType = watch("type");

  // Re-apply saved product values when opening edit modal.
  // Compare contents so a parent re-render does not flip the toggle back on.
  const initialDataKey = JSON.stringify(initialData ?? null);
  useEffect(() => {
    if (!initialData && !lockType) return;
    reset(buildDefaultValues(initialData, lockType));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDataKey, lockType, reset]);

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
    setSubmitError("");
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
    const selectedSegments =
      resolvedType === "product"
        ? (values.segments || [])
            .map((row) => ({
              segmentId: String(row?.id || "").trim(),
              name: String(row?.name || "").trim(),
            }))
            .filter((row) => row.segmentId || row.name)
        : [];
    payload.append("segments", JSON.stringify(selectedSegments));
    payload.append(
      "segment",
      selectedSegments.map((row) => row.name).filter(Boolean).join(", "),
    );
    payload.append("segmentId", selectedSegments[0]?.segmentId || "");
    payload.append("description", values.description);
    payload.append("discountType", values.discountType);
    payload.append("discountValue", String(values.discountValue));
    payload.append("variants", JSON.stringify(normalizedVariants));
    payload.append(
      "lowStockAlertLevel",
      resolvedType === "product" &&
        values.lowStockAlertLevel != null &&
        !Number.isNaN(values.lowStockAlertLevel)
        ? String(values.lowStockAlertLevel)
        : "",
    );
    payload.append(
      "applyMembershipDiscount",
      resolvedType === "product" && values.applyMembershipDiscount === false
        ? "false"
        : "true",
    );
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
    try {
      await onSubmit(payload);
    } catch (error) {
      const message = readApiError(error);
      setSubmitError(message);
      await Swal.fire("Could not save", message, "error");
      return;
    }
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-6">
      <div className="relative flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl ring-1 ring-slate-900/5 sm:h-auto sm:max-h-[min(92dvh,880px)] sm:rounded-2xl">
        
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${itemType === "product" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
              {itemType === "product" ? <Package size={20} /> : <Briefcase size={20} />}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-slate-900 sm:text-xl">
                {modalTitle}
              </h2>
              <p className="mt-0.5 truncate text-xs text-slate-500 sm:text-sm">
                {modalSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void closeIfConfirmed(onClose)}
            className="rounded-full p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <X size={20} />
          </button>
        </div>
        {itemType === "product" ? (
          <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-slate-100 px-4 py-3 sm:px-6">
            {productSteps.map((label, index) => {
              const active = index === step;
              const done = index < step;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setStep(index)}
                  className="flex shrink-0 items-center gap-2 text-left"
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                      active
                        ? "bg-violet-600 text-white"
                        : done
                          ? "bg-violet-100 text-violet-700"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className={`hidden text-xs font-semibold sm:inline ${active ? "text-violet-700" : "text-slate-500"}`}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

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
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-6 sm:py-6">
              <div className="space-y-4 sm:space-y-6">
                
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
                    <ProductForm step={step} />
                  ) : (
                    <ServiceForm />
                  )}
                </div>

                {/* Form Errors */}
                {(submitError || Object.keys(formState.errors).length > 0) && (
                  <div className="flex animate-in fade-in slide-in-from-bottom-2 items-start rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        {submitError ? "Could not save" : "Please review the errors below"}
                      </h3>
                      <div className="mt-1 text-sm text-red-700">
                        <p>
                          {submitError ||
                            (Object.values(formState.errors)[0]?.message as string)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-shrink-0 items-center gap-2 border-t border-slate-100 bg-slate-50/80 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:justify-end sm:gap-3 sm:px-6 sm:py-4">
              <button
                type="button"
                onClick={() => void closeIfConfirmed(onClose)}
                disabled={loading}
                className="h-10 flex-1 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50 sm:flex-none sm:px-5"
              >
                Cancel
              </button>
              {itemType === "product" && step > 0 ? (
                <button
                  type="button"
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                  className="h-10 flex-1 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 sm:flex-none"
                >
                  Back
                </button>
              ) : null}
              {itemType === "product" && step < productSteps.length - 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 0 && !String(getValues("productName") || "").trim()) {
                      setSubmitError("Product name is required");
                      setFocus("productName");
                      return;
                    }
                    setSubmitError("");
                    setStep((current) => current + 1);
                  }}
                  className="flex h-10 flex-1 items-center justify-center rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white sm:flex-none sm:px-6"
                >
                  {`Next: ${productSteps[step + 1]}`}
                </button>
              ) : (
              <button
                type="submit"
                disabled={loading || formState.isSubmitting}
                className={`flex h-10 flex-1 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-6 ${
                  itemType === "product"
                    ? "bg-violet-600 hover:bg-violet-700 focus:ring-violet-600"
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
              )}
            </div>
            
          </form>
        </FormProvider>
      </div>
    </div>
  );
}

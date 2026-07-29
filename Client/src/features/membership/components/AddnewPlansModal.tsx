import { useEffect, useMemo, useState, type HTMLInputTypeAttribute } from "react";
import {
  BadgePercent,
  Boxes,
  ClipboardList,
  DollarSign,
  Layers3,
  Plus,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import { handleGetCategories, type MembershipPlanPayload } from "@/services/apiClient";

type UsageLimits = Record<string, { discount: number; cashback: number }>;

type PlanFormState = Required<
  Pick<
    MembershipPlanPayload,
    | "planId"
    | "displayName"
    | "priority"
    | "planType"
    | "description"
    | "insightsLevel"
    | "status"
    | "internalNotes"
  >
> & {
  pricing: Required<
    NonNullable<MembershipPlanPayload["pricing"]>
  >;
  usageLimits: UsageLimits;
  customerDisplay: {
    showInApp: boolean;
    badgeLabel: string;
    themeKey: "blue" | "purple" | "green" | "orange";
    iconKey: "user" | "star" | "graduation" | "crown";
    cashbackPercent: number;
    storeDiscountPercent: number;
    spaceDiscountPercent: number;
    foodDiscountPercent: number;
    features: Array<{ label: string; was: number }>;
  };
  walletCashback: {
    amount: number;
  };
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: MembershipPlanPayload) => Promise<void>;
  loading: boolean;
  initialPlan?: Partial<MembershipPlanPayload> & { _id?: string };
};

type InputFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  required?: boolean;
  rightElement?: React.ReactNode;
};

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  rightElement,
}: InputFieldProps) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={type}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        />
        {rightElement ? (
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
            {rightElement}
          </div>
        ) : null}
      </div>
    </div>
  );
}



const initialState: PlanFormState = {
  planId: "",
  displayName: "",
  priority: 0,
  planType: "Professional",
  description: "",
  pricing: {
    period: "Monthly",
    // Original selling / list price (before plan discount)
    grossAmount: 0,
    amount: 0,
    taxPercent: 0,
    discountType: "Percentage",
    discountPercent: 0,
  },
  usageLimits: {},
  customerDisplay: {
    showInApp: true,
    badgeLabel: "",
    themeKey: "blue",
    iconKey: "user",
    cashbackPercent: 0,
    storeDiscountPercent: 0,
    spaceDiscountPercent: 0,
    foodDiscountPercent: 0,
    features: [{ label: "", was: 0 }],
  },
  walletCashback: {
    amount: 0,
  },
  insightsLevel: "Basic",
  status: "Active",
  internalNotes: "",
};


const periods = ["Monthly", "Yearly", "Lifetime", "Till School Life"] as const;
const themeKeys = ["blue", "purple", "green", "orange"] as const;
const iconKeys = ["user", "star", "graduation", "crown"] as const;
const discountTypes = ["Percentage", "Flat"] as const;


/** Always available for membership discounts (catalogue line types + food/space) */
const FIXED_USAGE_CATEGORIES = [
  { _id: "fixed-food", name: "Food" },
  { _id: "fixed-space", name: "Space" },
  { _id: "fixed-products", name: "Products" },
  { _id: "fixed-services", name: "Services" },
] as const;

export default function AddnewPlansModal({
  open,
  onClose,
  onSubmit,
  loading,
  initialPlan,
}: Props) {
  const [form, setForm] = useState<PlanFormState>(initialState);
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>(
    [...FIXED_USAGE_CATEGORIES],
  );

  /** Food / Space / Products / Services first, then other catalogue categories */
  const usageLimitCategories = useMemo(() => {
    const seen = new Set<string>();
    const merged: { _id: string; name: string }[] = [];
    const skipCatalogueDuplicates = new Set([
      "food",
      "foods",
      "space",
      "spaces",
      "product",
      "products",
      "service",
      "services",
    ]);
    for (const cat of [...FIXED_USAGE_CATEGORIES, ...categories]) {
      const name = String(cat.name || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      // Avoid duplicate cards when catalogue already has Product/Service names
      if (
        !FIXED_USAGE_CATEGORIES.some((f) => f.name.toLowerCase() === key) &&
        skipCatalogueDuplicates.has(key)
      ) {
        continue;
      }
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push({ _id: String(cat._id || key), name });
    }
    return merged;
  }, [categories]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    handleGetCategories(controller.signal)
      .then((res) => {
        if (res && Array.isArray(res.categories)) {
          setCategories(res.categories);
        }
      })
      .catch((err) => console.log("Error fetching categories:", err));
    return () => controller.abort();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (initialPlan) {
      setForm((prev) => ({
        ...prev,
        planId: String(initialPlan.planId ?? prev.planId),
        displayName: String(initialPlan.displayName ?? prev.displayName),
        priority: Number(initialPlan.priority ?? prev.priority),
        planType: String(initialPlan.planType ?? prev.planType),
        description: String(initialPlan.description ?? prev.description),
        insightsLevel: String(initialPlan.insightsLevel ?? prev.insightsLevel),
        status: (initialPlan.status ?? prev.status) as "Active" | "Inactive",
        internalNotes: String(initialPlan.internalNotes ?? prev.internalNotes),
        pricing: (() => {
          // grossAmount = original list; amount = selling price after discount
          const storedGross = Number(initialPlan.pricing?.grossAmount ?? 0);
          const storedAmount = Number(initialPlan.pricing?.amount ?? 0);
          const originalList =
            storedGross > 0
              ? storedGross
              : storedAmount; // legacy plans only had amount as list price
          return {
            ...prev.pricing,
            ...(initialPlan.pricing ?? {}),
            period: String(
              initialPlan.pricing?.period ?? prev.pricing.period,
            ),
            grossAmount: originalList,
            amount: storedGross > 0 ? storedAmount : originalList,
            taxPercent: Number(
              initialPlan.pricing?.taxPercent ?? prev.pricing.taxPercent,
            ),
            discountType: String(
              initialPlan.pricing?.discountType ?? prev.pricing.discountType,
            ),
            discountPercent: Number(
              initialPlan.pricing?.discountPercent ??
                prev.pricing.discountPercent,
            ),
          };
        })(),
        usageLimits: (() => {
          const merged: UsageLimits = {
            ...prev.usageLimits,
            ...(initialPlan.usageLimits as UsageLimits | undefined),
          };
          // Normalize Food / Space keys for the Usage Limits cards
          for (const fixed of FIXED_USAGE_CATEGORIES) {
            const hit = Object.entries(merged).find(([k]) =>
              k.toLowerCase().includes(fixed.name.toLowerCase()),
            );
            if (hit && !merged[fixed.name]) {
              merged[fixed.name] = hit[1];
            }
            if (!merged[fixed.name]) {
              merged[fixed.name] = { discount: 0, cashback: 0 };
            }
          }
          return merged;
        })(),
        customerDisplay: {
          ...prev.customerDisplay,
          ...(initialPlan.customerDisplay ?? {}),
          showInApp: initialPlan.customerDisplay?.showInApp !== false,
          badgeLabel: String(initialPlan.customerDisplay?.badgeLabel ?? prev.customerDisplay.badgeLabel),
          themeKey: (initialPlan.customerDisplay?.themeKey ?? prev.customerDisplay.themeKey) as PlanFormState["customerDisplay"]["themeKey"],
          iconKey: (initialPlan.customerDisplay?.iconKey ?? prev.customerDisplay.iconKey) as PlanFormState["customerDisplay"]["iconKey"],
          cashbackPercent: Number(initialPlan.customerDisplay?.cashbackPercent ?? prev.customerDisplay.cashbackPercent),
          storeDiscountPercent: Number(initialPlan.customerDisplay?.storeDiscountPercent ?? prev.customerDisplay.storeDiscountPercent),
          spaceDiscountPercent: Number(
            initialPlan.customerDisplay?.spaceDiscountPercent ??
              (initialPlan.usageLimits as UsageLimits | undefined)?.Space
                ?.discount ??
              prev.customerDisplay.spaceDiscountPercent,
          ),
          foodDiscountPercent: Number(
            initialPlan.customerDisplay?.foodDiscountPercent ??
              (initialPlan.usageLimits as UsageLimits | undefined)?.Food
                ?.discount ??
              prev.customerDisplay.foodDiscountPercent,
          ),
          features:
            Array.isArray(initialPlan.customerDisplay?.features) &&
            initialPlan.customerDisplay.features.length > 0
              ? initialPlan.customerDisplay.features.map((item) => ({
                  label: String(item.label ?? ""),
                  was: Number(item.was ?? 0),
                }))
              : prev.customerDisplay.features,
        },
        walletCashback: {
          amount: Number(
            initialPlan.walletCashback?.amount ??
              (initialPlan.walletCashback as { percent?: number } | undefined)
                ?.percent ??
              prev.walletCashback.amount,
          ),
        },
      }));
    } else {
      setForm(initialState);
    }
  }, [open, initialPlan]);

  const computed = useMemo(() => {
    // grossAmount = original list / MRP; netAmount = selling price after discount
    const grossAmount = Math.max(0, Number(form.pricing.grossAmount || 0));
    const taxPercent = Number(form.pricing.taxPercent || 0);
    const discountType = form.pricing.discountType;
    const discountValue = Number(form.pricing.discountPercent || 0);

    const discountAmount =
      discountType === "Percentage" || discountType === "percentage"
        ? (grossAmount * discountValue) / 100
        : discountValue;

    const sellingPrice = Math.max(0, grossAmount - discountAmount);
    // Tax breakdown on the selling price (what customer pays)
    const base = sellingPrice / (1 + taxPercent / 100);
    const taxAmount = sellingPrice - base;
    return {
      baseAmount: base,
      taxAmount,
      discountAmount,
      grossAmount,
      sellingPrice,
      netAmount: sellingPrice,
    };
  }, [
    form.pricing.grossAmount,
    form.pricing.taxPercent,
    form.pricing.discountType,
    form.pricing.discountPercent,
  ]);

  const setUsage = (key: string, field: "discount" | "cashback", value: number) => {
    const next = Math.max(0, value);
    setForm((prev) => {
      const usageLimits = {
        ...prev.usageLimits,
        [key]: {
          ...(prev.usageLimits[key] || { discount: 0, cashback: 0 }),
          [field]: next,
        },
      };
      const customerDisplay = { ...prev.customerDisplay };
      // Keep display badges aligned with Food / Space / Products usage cards
      if (field === "discount") {
        if (key.toLowerCase() === "food") {
          customerDisplay.foodDiscountPercent = next;
        }
        if (key.toLowerCase() === "space") {
          customerDisplay.spaceDiscountPercent = next;
        }
        if (key.toLowerCase() === "products" || key.toLowerCase() === "product") {
          customerDisplay.storeDiscountPercent = next;
        }
      }
      if (field === "cashback" && key.toLowerCase() === "food") {
        customerDisplay.cashbackPercent = next;
      }
      return { ...prev, usageLimits, customerDisplay };
    });
  };

  const setFeature = (
    index: number,
    field: "label" | "was",
    value: string,
  ) => {
    setForm((prev) => {
      const features = [...prev.customerDisplay.features];
      const current = features[index] || { label: "", was: 0 };
      features[index] = {
        ...current,
        [field]: field === "was" ? Number(value || 0) : value,
      };
      return {
        ...prev,
        customerDisplay: { ...prev.customerDisplay, features },
      };
    });
  };

  const addFeature = () => {
    setForm((prev) => ({
      ...prev,
      customerDisplay: {
        ...prev.customerDisplay,
        features: [...prev.customerDisplay.features, { label: "", was: 0 }],
      },
    }));
  };

  const removeFeature = (index: number) => {
    setForm((prev) => ({
      ...prev,
      customerDisplay: {
        ...prev.customerDisplay,
        features: prev.customerDisplay.features.filter((_, i) => i !== index),
      },
    }));
  };

  const submit = async () => {
    if (!form.planId.trim() || !form.displayName.trim()) return;

    // Ensure Food / Space / Products / Services keys exist for catalogue + food bill
    const usageLimits: UsageLimits = { ...form.usageLimits };
    for (const fixed of FIXED_USAGE_CATEGORIES) {
      if (!usageLimits[fixed.name]) {
        // keep case-insensitive match if already saved under different casing
        const existingKey = Object.keys(usageLimits).find(
          (k) => k.toLowerCase() === fixed.name.toLowerCase(),
        );
        if (existingKey) {
          usageLimits[fixed.name] = usageLimits[existingKey];
        } else {
          usageLimits[fixed.name] = { discount: 0, cashback: 0 };
        }
      }
    }
    // Fixed ₹ wallet cashback is stored separately; category cashback % stays in Usage Limits

    const foodLimit =
      usageLimits.Food ||
      usageLimits.food ||
      Object.entries(usageLimits).find(([k]) =>
        k.toLowerCase().includes("food"),
      )?.[1];
    const spaceLimit =
      usageLimits.Space ||
      usageLimits.space ||
      Object.entries(usageLimits).find(([k]) =>
        k.toLowerCase().includes("space"),
      )?.[1];
    const productsLimit =
      usageLimits.Products ||
      usageLimits.Product ||
      usageLimits.products ||
      Object.entries(usageLimits).find(([k]) => {
        const n = k.toLowerCase();
        return n === "product" || n === "products" || n.includes("store");
      })?.[1];
    const servicesLimit =
      usageLimits.Services ||
      usageLimits.Service ||
      usageLimits.services ||
      Object.entries(usageLimits).find(([k]) =>
        k.toLowerCase().includes("service"),
      )?.[1];

    await onSubmit({
      planId: form.planId.trim(),
      displayName: form.displayName.trim(),
      priority: Number(form.priority || 0),
      planType: form.planType,
      description: form.description.trim(),
      pricing: {
        period: form.pricing.period,
        // Original list / MRP
        grossAmount: Number(form.pricing.grossAmount || 0),
        // Selling price = net after discount (what customer pays)
        amount: Number(computed.netAmount || 0),
        taxPercent: Number(form.pricing.taxPercent || 0),
        discountType: form.pricing.discountType,
        discountPercent: Number(form.pricing.discountPercent || 0),
      },
      usageLimits,
      walletCashback: {
        amount: Number(form.walletCashback.amount || 0),
      },
      customerDisplay: {
        ...form.customerDisplay,
        // Keep app display badges in sync with usage-limit cards when set
        spaceDiscountPercent:
          Number(spaceLimit?.discount ?? form.customerDisplay.spaceDiscountPercent) ||
          0,
        foodDiscountPercent:
          Number(foodLimit?.discount ?? form.customerDisplay.foodDiscountPercent) ||
          0,
        storeDiscountPercent:
          Number(
            productsLimit?.discount ?? form.customerDisplay.storeDiscountPercent,
          ) || 0,
        cashbackPercent:
          Number(
            foodLimit?.cashback ??
              productsLimit?.cashback ??
              servicesLimit?.cashback ??
              form.customerDisplay.cashbackPercent,
          ) || 0,
        badgeLabel:
          form.customerDisplay.badgeLabel.trim() ||
          form.pricing.period,
        features: form.customerDisplay.features.filter((item) => item.label.trim()),
      },
      insightsLevel: form.insightsLevel,
      status: form.status,
      internalNotes: form.internalNotes.trim(),
    });
  };

  if (!open) return null;

  const isEdit = Boolean(initialPlan?._id);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Plus size={18} />
            </div>
            <div>
              <div className="text-xl font-semibold text-slate-900">
                {isEdit ? "Update Plan" : "Create New Plan"}
              </div>
              <div className="text-sm text-slate-500">
                {isEdit
                  ? "Edit membership plan details."
                  : "Create a new membership plan."}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="contents"
        >
          <div className="max-h-[calc(92vh-150px)] overflow-y-auto px-6 py-6">
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Layers3 size={18} className="text-slate-400" />
                  <div className="text-base font-semibold text-slate-900">
                    Basic Information
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <InputField
                    label="Plan ID"
                    value={form.planId}
                    onChange={(v) => setForm((p) => ({ ...p, planId: v }))}
                    placeholder="e.g., professional-basic"
                    required
                  />
                  <InputField
                    label="Display Name"
                    value={form.displayName}
                    onChange={(v) =>
                      setForm((p) => ({ ...p, displayName: v }))
                    }
                    placeholder="e.g., Professional Basic"
                    required
                  />
                  <InputField
                    label="Priority"
                    value={String(form.priority)}
                    onChange={(v) =>
                      setForm((p) => ({ ...p, priority: Number(v || 0) }))
                    }
                    type="number"
                    placeholder="0"
                  />
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          Plan Status
                        </div>
                        <div className="text-xs text-slate-500">
                          Enable or disable this membership plan
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div
                          className={
                            form.status === "Active"
                              ? "text-sm font-semibold text-emerald-700"
                              : "text-sm font-semibold text-slate-500"
                          }
                        >
                          {form.status}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setForm((p) => ({
                              ...p,
                              status: p.status === "Active" ? "Inactive" : "Active",
                            }))
                          }
                          className={`relative h-8 w-14 rounded-full transition ${
                            form.status === "Active"
                              ? "bg-emerald-500"
                              : "bg-slate-300"
                          }`}
                          aria-label="Toggle status"
                        >
                          <span
                            className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                              form.status === "Active" ? "left-7" : "left-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
              <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <DollarSign size={18} className="text-slate-400" />
                  <div className="text-base font-semibold text-slate-900">
                    Pricing Details
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Period
                    </label>
                    <select
                      value={form.pricing.period}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          pricing: { ...p.pricing, period: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    >
                      {periods.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <InputField
                    label="Gross Amount (Original)"
                    value={String(form.pricing.grossAmount)}
                    onChange={(v) => {
                      const next = Number(v || 0);
                      setForm((p) => ({
                        ...p,
                        pricing: {
                          ...p.pricing,
                          grossAmount: next,
                        },
                      }));
                    }}
                    type="number"
                    placeholder="0"
                    rightElement={<span className="text-xs">₹</span>}
                  />
                  <InputField
                    label="Tax (%)"
                    value={String(form.pricing.taxPercent)}
                    onChange={(v) =>
                      setForm((p) => ({
                        ...p,
                        pricing: { ...p.pricing, taxPercent: Number(v || 0) },
                      }))
                    }
                    type="number"
                    placeholder="0"
                    rightElement={<span className="text-xs">%</span>}
                  />
                </div>

                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-slate-700">
                  <span className="font-semibold">Calculated:</span>{" "}
                  <span className="text-slate-600">
                    Base Amount (Excl. GST): ₹{computed.baseAmount.toFixed(2)} | GST Portion: ₹
                    {computed.taxAmount.toFixed(2)}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Discount Type
                    </label>
                    <select
                      value={form.pricing.discountType}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          pricing: {
                            ...p.pricing,
                            discountType: e.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    >
                      {discountTypes.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <InputField
                    label={form.pricing.discountType === "Percentage" ? "Discount (%)" : "Discount (₹)"}
                    value={String(form.pricing.discountPercent)}
                    onChange={(v) =>
                      setForm((p) => ({
                        ...p,
                        pricing: {
                          ...p.pricing,
                          discountPercent: Number(v || 0),
                        },
                      }))
                    }
                    type="number"
                    placeholder="0"
                    rightElement={
                      form.pricing.discountType === "Percentage" ? (
                        <BadgePercent size={16} />
                      ) : (
                        <span className="text-xs">₹</span>
                      )
                    }
                  />
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm">
                    <div className="text-emerald-700/80">Selling Price</div>
                    <div className="mt-1 text-lg font-semibold text-emerald-800 tabular-nums">
                      ₹{computed.sellingPrice.toLocaleString("en-IN")}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Gross (original): ₹
                      {computed.grossAmount.toLocaleString("en-IN")}
                      {computed.discountAmount > 0
                        ? ` − discount ₹${computed.discountAmount.toLocaleString("en-IN")}`
                        : ""}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-orange-100 bg-orange-50/40 p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Boxes size={18} className="text-orange-500" />
                  <div className="text-base font-semibold text-slate-900">
                    Usage Limits
                  </div>
                </div>

                <p className="mb-4 text-xs text-slate-500">
                  Set member Discount % and Cashback % per category.{" "}
                  <span className="font-semibold text-orange-700">Food</span>,{" "}
                  <span className="font-semibold text-orange-700">Space</span>,{" "}
                  <span className="font-semibold text-orange-700">Products</span>{" "}
                  and{" "}
                  <span className="font-semibold text-orange-700">Services</span>{" "}
                  apply on food bills, space bookings, and catalogue sales.
                </p>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {usageLimitCategories.map((category) => {
                    const key = category.name; // Use name as key to match usage check
                    const title = category.name;
                    const short = title.substring(0, 1).toUpperCase();
                    const limit =
                      form.usageLimits[key] ||
                      Object.entries(form.usageLimits).find(
                        ([k]) => k.toLowerCase() === key.toLowerCase(),
                      )?.[1] ||
                      { discount: 0, cashback: 0 };

                    return (
                      <div
                        key={key}
                        className="rounded-2xl border border-orange-200 bg-orange-50 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700 font-semibold">
                            {short}
                          </div>
                          <div className="text-sm font-semibold text-slate-900">
                            {title}
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-slate-500">Discount (%)</div>
                            <input
                              type="number"
                              value={limit.discount || 0}
                              onChange={(e) =>
                                setUsage(
                                  key,
                                  "discount",
                                  Number(e.target.value || 0),
                                )
                              }
                              className="mt-1 w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-orange-200/50"
                            />
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">Cashback (%)</div>
                            <input
                              type="number"
                              value={limit.cashback || 0}
                              onChange={(e) =>
                                setUsage(
                                  key,
                                  "cashback",
                                  Number(e.target.value || 0),
                                )
                              }
                              className="mt-1 w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-orange-200/50"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Wallet size={18} className="text-emerald-600" />
                  <div className="text-base font-semibold text-slate-900">
                    Wallet Cashback on Purchase
                  </div>
                </div>
              
                <div className="max-w-sm">
                  <InputField
                    label="Cashback Amount"
                    value={String(form.walletCashback.amount)}
                    onChange={(v) =>
                      setForm((p) => ({
                        ...p,
                        walletCashback: {
                          amount: Math.max(0, Number(v || 0)),
                        },
                      }))
                    }
                    type="number"
                    placeholder="e.g. 50"
                    rightElement={<span className="text-xs">₹</span>}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-violet-100 bg-violet-50/40 p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-violet-500" />
                  <div className="text-base font-semibold text-slate-900">
                    Customer App Display
                  </div>
                </div>
                <p className="mb-4 text-xs text-slate-500">
                  These fields control what customers see on the Membership onboarding screen. Plan ID should match values like general, special, junior, premium.
                </p>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <InputField
                    label="Badge Label"
                    value={form.customerDisplay.badgeLabel}
                    onChange={(v) =>
                      setForm((p) => ({
                        ...p,
                        customerDisplay: { ...p.customerDisplay, badgeLabel: v },
                      }))
                    }
                    placeholder={form.pricing.period || "Lifetime"}
                  />
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Theme Color</label>
                    <select
                      value={form.customerDisplay.themeKey}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          customerDisplay: {
                            ...p.customerDisplay,
                            themeKey: e.target.value as PlanFormState["customerDisplay"]["themeKey"],
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    >
                      {themeKeys.map((key) => (
                        <option key={key} value={key}>{key}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Card Icon</label>
                    <select
                      value={form.customerDisplay.iconKey}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          customerDisplay: {
                            ...p.customerDisplay,
                            iconKey: e.target.value as PlanFormState["customerDisplay"]["iconKey"],
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    >
                      {iconKeys.map((key) => (
                        <option key={key} value={key}>{key}</option>
                      ))}
                    </select>
                  </div>
                  <InputField
                    label="Store / Products Discount (%)"
                    value={String(form.customerDisplay.storeDiscountPercent)}
                    onChange={(v) =>
                      setForm((p) => ({
                        ...p,
                        customerDisplay: {
                          ...p.customerDisplay,
                          storeDiscountPercent: Number(v || 0),
                        },
                        usageLimits: {
                          ...p.usageLimits,
                          Products: {
                            ...(p.usageLimits.Products || {
                              discount: 0,
                              cashback: 0,
                            }),
                            discount: Number(v || 0),
                          },
                        },
                      }))
                    }
                    type="number"
                    placeholder="5"
                  />
                  <InputField
                    label="Food Discount (%)"
                    value={String(form.customerDisplay.foodDiscountPercent)}
                    onChange={(v) =>
                      setForm((p) => ({
                        ...p,
                        customerDisplay: {
                          ...p.customerDisplay,
                          foodDiscountPercent: Number(v || 0),
                        },
                        usageLimits: {
                          ...p.usageLimits,
                          Food: {
                            ...(p.usageLimits.Food || {
                              discount: 0,
                              cashback: 0,
                            }),
                            discount: Number(v || 0),
                          },
                        },
                      }))
                    }
                    type="number"
                    placeholder="10"
                  />
                  <InputField
                    label="Space Discount (%)"
                    value={String(form.customerDisplay.spaceDiscountPercent)}
                    onChange={(v) =>
                      setForm((p) => ({
                        ...p,
                        customerDisplay: {
                          ...p.customerDisplay,
                          spaceDiscountPercent: Number(v || 0),
                        },
                        usageLimits: {
                          ...p.usageLimits,
                          Space: {
                            ...(p.usageLimits.Space || {
                              discount: 0,
                              cashback: 0,
                            }),
                            discount: Number(v || 0),
                          },
                        },
                      }))
                    }
                    type="number"
                    placeholder="10"
                  />
                  <InputField
                    label="Cashback (%) — display badge"
                    value={String(form.customerDisplay.cashbackPercent)}
                    onChange={(v) =>
                      setForm((p) => ({
                        ...p,
                        customerDisplay: {
                          ...p.customerDisplay,
                          cashbackPercent: Math.max(0, Number(v || 0)),
                        },
                      }))
                    }
                    type="number"
                    placeholder="1"
                  />
                </div>

                <div className="mt-5 rounded-2xl border border-violet-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">Feature Bullets</div>
                    <button
                      type="button"
                      onClick={addFeature}
                      className="rounded-lg border border-violet-200 px-3 py-1.5 text-xs font-semibold text-violet-700"
                    >
                      Add Feature
                    </button>
                  </div>
                  <div className="space-y-3">
                    {form.customerDisplay.features.map((feature, index) => (
                      <div key={index} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px_auto]">
                        <input
                          value={feature.label}
                          onChange={(e) => setFeature(index, "label", e.target.value)}
                          placeholder="Feature description"
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                        />
                        <input
                          value={String(feature.was || 0)}
                          onChange={(e) => setFeature(index, "was", e.target.value)}
                          type="number"
                          placeholder="Was price"
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeFeature(index)}
                          className="rounded-xl border border-red-200 px-3 py-3 text-sm text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Show in Customer App</div>
                      <div className="text-xs text-slate-500">Display this plan on the customer membership screen</div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          customerDisplay: {
                            ...p.customerDisplay,
                            showInApp: !p.customerDisplay.showInApp,
                          },
                        }))
                      }
                      className={`relative h-8 w-14 rounded-full transition ${
                        form.customerDisplay.showInApp ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                          form.customerDisplay.showInApp ? "left-7" : "left-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </section>
              <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <ClipboardList size={18} className="text-slate-400" />
                  <div className="text-base font-semibold text-slate-900">
                    Admin Notes
                  </div>
                </div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Internal Notes
                </label>
                <textarea
                  value={form.internalNotes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, internalNotes: e.target.value }))
                  }
                  placeholder="Add internal notes, reminders, or special instructions for this plan..."
                  className="min-h-[90px] w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </section>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.planId.trim() || !form.displayName.trim()}
              className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (isEdit ? "Updating..." : "Creating...") : isEdit ? "Update Plan" : "Create Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


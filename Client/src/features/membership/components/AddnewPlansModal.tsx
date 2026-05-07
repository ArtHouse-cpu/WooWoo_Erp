import { useEffect, useMemo, useState, type HTMLInputTypeAttribute } from "react";
import {
  BadgePercent,
  Boxes,
  ClipboardList,
  DollarSign,
  Layers3,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import type { MembershipPlanPayload } from "@/services/apiClient";

type UsageKey =
  | "links"
  | "galleryMedia"
  | "services"
  | "store"
  | "academy"
  | "work"
  | "events";

type UsageLimits = Record<UsageKey, { min: number; max: number }>;

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

const usageLabels: Record<UsageKey, { title: string; short: string }> = {
  links: { title: "Links", short: "L" },
  galleryMedia: { title: "Gallery Media", short: "G" },
  services: { title: "Services", short: "S" },
  store: { title: "Store", short: "S" },
  academy: { title: "Academy", short: "A" },
  work: { title: "Work", short: "W" },
  events: { title: "Events", short: "E" },
};

const defaultUsageLimits: UsageLimits = {
  links: { min: 0, max: 9999 },
  galleryMedia: { min: 0, max: 9999 },
  services: { min: 0, max: 9999 },
  store: { min: 0, max: 9999 },
  academy: { min: 0, max: 9999 },
  work: { min: 0, max: 9999 },
  events: { min: 0, max: 9999 },
};

const initialState: PlanFormState = {
  planId: "",
  displayName: "",
  priority: 0,
  planType: "Professional",
  description: "",
  pricing: {
    period: "Monthly",
    amount: 0,
    taxPercent: 0,
    discountType: "Percentage",
    discountPercent: 0,
  },
  usageLimits: defaultUsageLimits,
  insightsLevel: "Basic",
  status: "Active",
  internalNotes: "",
};

const planTypes = ["Professional", "Business", "Personal"] as const;
const periods = ["Monthly", "Yearly", "Lifetime"] as const;
const discountTypes = ["Percentage", "Flat"] as const;
const insightLevels = ["Basic", "Advanced"] as const;

export default function AddnewPlansModal({
  open,
  onClose,
  onSubmit,
  loading,
  initialPlan,
}: Props) {
  const [form, setForm] = useState<PlanFormState>(initialState);

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
        pricing: {
          ...prev.pricing,
          ...(initialPlan.pricing ?? {}),
          amount: Number(initialPlan.pricing?.amount ?? prev.pricing.amount),
          taxPercent: Number(
            initialPlan.pricing?.taxPercent ?? prev.pricing.taxPercent,
          ),
          discountPercent: Number(
            initialPlan.pricing?.discountPercent ?? prev.pricing.discountPercent,
          ),
        },
        usageLimits: {
          ...prev.usageLimits,
          ...(initialPlan.usageLimits as UsageLimits | undefined),
        },
      }));
    } else {
      setForm(initialState);
    }
  }, [open, initialPlan]);

  const computed = useMemo(() => {
    const amount = Number(form.pricing.amount || 0);
    const taxPercent = Number(form.pricing.taxPercent || 0);
    const discountType = form.pricing.discountType;
    const discountValue = Number(form.pricing.discountPercent || 0);

    const discountAmount =
      discountType === "Percentage"
        ? (amount * discountValue) / 100
        : discountValue;

    const taxAmount = (amount * taxPercent) / 100;
    const base = amount;
    return {
      baseAmount: base,
      taxAmount,
      discountAmount,
      grossAmount: Math.max(0, base + taxAmount - discountAmount),
    };
  }, [
    form.pricing.amount,
    form.pricing.taxPercent,
    form.pricing.discountType,
    form.pricing.discountPercent,
  ]);

  const setUsage = (key: UsageKey, field: "min" | "max", value: number) => {
    setForm((prev) => ({
      ...prev,
      usageLimits: {
        ...prev.usageLimits,
        [key]: {
          ...prev.usageLimits[key],
          [field]: Math.max(0, value),
        },
      },
    }));
  };

  const submit = async () => {
    if (!form.planId.trim() || !form.displayName.trim()) return;

    await onSubmit({
      planId: form.planId.trim(),
      displayName: form.displayName.trim(),
      priority: Number(form.priority || 0),
      planType: form.planType,
      description: form.description.trim(),
      pricing: {
        period: form.pricing.period,
        amount: Number(form.pricing.amount || 0),
        taxPercent: Number(form.pricing.taxPercent || 0),
        discountType: form.pricing.discountType,
        discountPercent: Number(form.pricing.discountPercent || 0),
      },
      usageLimits: form.usageLimits,
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
                </div>
              </section>

              <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <ClipboardList size={18} className="text-slate-400" />
                  <div className="text-base font-semibold text-slate-900">
                    Additional Details
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Plan Type
                    </label>
                    <select
                      value={form.planType}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, planType: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    >
                      {planTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Description
                    </label>
                    <input
                      value={form.description}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, description: e.target.value }))
                      }
                      placeholder="Plan description..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
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
                    label="Amount"
                    value={String(form.pricing.amount)}
                    onChange={(v) =>
                      setForm((p) => ({
                        ...p,
                        pricing: { ...p.pricing, amount: Number(v || 0) },
                      }))
                    }
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
                    Base Amount: ₹{computed.baseAmount.toFixed(2)} | Tax Amount: ₹
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
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                    <div className="text-slate-500">Gross Amount</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">
                      ₹{computed.grossAmount.toLocaleString("en-IN")}
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

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {(Object.keys(usageLabels) as UsageKey[]).map((key) => (
                    <div
                      key={key}
                      className="rounded-2xl border border-orange-200 bg-orange-50 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700 font-semibold">
                          {usageLabels[key].short}
                        </div>
                        <div className="text-sm font-semibold text-slate-900">
                          {usageLabels[key].title}
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-slate-500">Min</div>
                          <input
                            type="number"
                            value={form.usageLimits[key].min}
                            onChange={(e) =>
                              setUsage(
                                key,
                                "min",
                                Number(e.target.value || 0),
                              )
                            }
                            className="mt-1 w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-orange-200/50"
                          />
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Max</div>
                          <input
                            type="number"
                            value={form.usageLimits[key].max}
                            onChange={(e) =>
                              setUsage(
                                key,
                                "max",
                                Number(e.target.value || 0),
                              )
                            }
                            className="mt-1 w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-orange-200/50"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-slate-400" />
                  <div className="text-base font-semibold text-slate-900">
                    Features & Status
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Insights Level
                    </label>
                    <select
                      value={form.insightsLevel}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          insightsLevel: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    >
                      {insightLevels.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>

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


import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronRight,
  Clock,
  Crown,
  FileText,
  GraduationCap,
  IndianRupee,
  Pencil,
  Percent,
  Star,
  User,
  X,
} from "lucide-react";
import {
  handleUpdateMembership,
  type MembershipPlanPayload,
} from "@/services/apiClient";
import AddnewPlansModal from "@/features/membership/components/AddnewPlansModal";
import { toast } from "react-toastify";

type Theme = {
  borderSelected: string;
  title: string;
  iconText: string;
  badgeBg: string;
  badgeText: string;
  radio: string;
  iconBg: string;
};

const THEMES: Record<string, Theme> = {
  blue: {
    borderSelected: "border-[#3B82F6]",
    title: "text-[#2563EB]",
    iconText: "text-[#2563EB]",
    badgeBg: "bg-[#DBEAFE]",
    badgeText: "text-[#2563EB]",
    radio: "border-[#3B82F6] text-[#3B82F6]",
    iconBg: "bg-[#DBEAFE]",
  },
  purple: {
    borderSelected: "border-[#A855F7]",
    title: "text-[#9333EA]",
    iconText: "text-[#9333EA]",
    badgeBg: "bg-[#F3E8FF]",
    badgeText: "text-[#9333EA]",
    radio: "border-[#A855F7] text-[#A855F7]",
    iconBg: "bg-[#F3E8FF]",
  },
  green: {
    borderSelected: "border-[#22C55E]",
    title: "text-[#16A34A]",
    iconText: "text-[#16A34A]",
    badgeBg: "bg-[#DCFCE7]",
    badgeText: "text-[#16A34A]",
    radio: "border-[#22C55E] text-[#22C55E]",
    iconBg: "bg-[#DCFCE7]",
  },
  orange: {
    borderSelected: "border-[#F97316]",
    title: "text-[#EA580C]",
    iconText: "text-[#EA580C]",
    badgeBg: "bg-[#FFEDD5]",
    badgeText: "text-[#EA580C]",
    radio: "border-[#F97316] text-[#F97316]",
    iconBg: "bg-[#FFEDD5]",
  },
};

const THEME_BY_PLAN: Record<string, string> = {
  general: "blue",
  special: "purple",
  junior: "green",
  premium: "orange",
  pro: "orange",
};

const ICON_BY_PLAN: Record<string, "user" | "star" | "graduation" | "crown"> = {
  general: "user",
  special: "star",
  junior: "graduation",
  premium: "crown",
  pro: "crown",
};

const CATEGORY_STYLES: Record<string, { card: string; icon: string; accent: string; letter: string }> = {
  food: { card: "bg-[#FFF9F5]", icon: "bg-[#FFF0E8] text-[#F97316]", accent: "text-[#F97316]", letter: "F" },
  space: { card: "bg-[#F6FBF8]", icon: "bg-[#E8F5EC] text-[#16A34A]", accent: "text-[#16A34A]", letter: "S" },
  products: { card: "bg-[#FAF8FF]", icon: "bg-[#F0E9FF] text-[#8B5CF6]", accent: "text-[#8B5CF6]", letter: "P" },
  services: { card: "bg-[#F7F9FF]", icon: "bg-[#E9EEFF] text-[#4F6FF5]", accent: "text-[#4F6FF5]", letter: "S" },
};

function planKey(plan: MembershipPlanPayload) {
  return `${plan.planId || ""} ${plan.displayName || ""}`.trim().toLowerCase();
}

function knownKey(plan: MembershipPlanPayload) {
  const text = planKey(plan);
  return Object.keys(THEME_BY_PLAN).find((key) => text.includes(key)) || "";
}

function themeFor(plan: MembershipPlanPayload): Theme {
  const stored = String(plan.customerDisplay?.themeKey || "").trim();
  const fallback = THEME_BY_PLAN[knownKey(plan)] || "blue";
  const key = stored && stored !== "blue" ? stored : fallback;
  return THEMES[key] || THEMES[fallback] || THEMES.blue;
}

function iconFor(plan: MembershipPlanPayload) {
  const stored = plan.customerDisplay?.iconKey;
  const fallback = ICON_BY_PLAN[knownKey(plan)] || "user";
  const key = stored && stored !== "user" ? stored : fallback;
  if (key === "star") return Star;
  if (key === "graduation") return GraduationCap;
  if (key === "crown") return Crown;
  return User;
}

function usageNumber(
  limits: MembershipPlanPayload["usageLimits"],
  matchers: string[],
  field: "discount" | "cashback",
) {
  if (!limits) return 0;
  for (const [name, row] of Object.entries(limits)) {
    const key = name.trim().toLowerCase();
    if (!matchers.some((item) => key === item || key.includes(item))) continue;
    const value = Number(row?.[field] ?? 0);
    if (value > 0) return value;
  }
  return 0;
}

function percentOr(display: number | undefined, limits: MembershipPlanPayload["usageLimits"], matchers: string[], field: "discount" | "cashback") {
  const shown = Number(display ?? 0);
  if (shown > 0) return shown;
  return usageNumber(limits, matchers, field);
}

function planStats(plan: MembershipPlanPayload) {
  const display = plan.customerDisplay;
  const limits = plan.usageLimits;
  const categories = [
    {
      key: "food",
      label: "Food",
      discount: percentOr(display?.foodDiscountPercent, limits, ["food"], "discount"),
      cashback: usageNumber(limits, ["food"], "cashback"),
    },
    {
      key: "space",
      label: "Space",
      discount: percentOr(display?.spaceDiscountPercent, limits, ["space", "spaces"], "discount"),
      cashback: usageNumber(limits, ["space", "spaces"], "cashback"),
    },
    {
      key: "products",
      label: "Products",
      discount: percentOr(display?.storeDiscountPercent, limits, ["product", "store", "supply"], "discount"),
      cashback: percentOr(display?.storeCashbackPercent, limits, ["product", "store", "supply"], "cashback"),
    },
    {
      key: "services",
      label: "Services",
      discount: percentOr(display?.serviceDiscountPercent, limits, ["service"], "discount"),
      cashback: usageNumber(limits, ["service"], "cashback"),
    },
  ];
  const discount = Math.max(0, ...categories.map((item) => item.discount));
  const cashback = Math.max(
    Number(display?.cashbackPercent ?? 0) || 0,
    ...categories.map((item) => item.cashback),
  );
  const premium = knownKey(plan) === "premium" || knownKey(plan) === "pro";
  return {
    categories,
    discount,
    cashback,
    programs: [
      { key: "CSP", label: "CSP", subtitle: "Sell Products", eligible: premium },
      { key: "HAP", label: "HAP", subtitle: "Refer & Earn", eligible: true },
      { key: "CVP", label: "CVP", subtitle: "Event Volunteering", eligible: true },
    ],
    badge: String(display?.badgeLabel || plan.pricing?.period || "Yearly").trim() || "Yearly",
  };
}

function upto(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return `Upto ${rounded}%`;
}

export default function DashboardMembershipCards({
  plans,
  loading,
  onPlanUpdated,
}: {
  plans: MembershipPlanPayload[];
  loading: boolean;
  onPlanUpdated?: () => void;
}) {
  const ordered = useMemo(
    () =>
      [...plans].sort(
        (a, b) =>
          Number(a.priority ?? 0) - Number(b.priority ?? 0) ||
          String(a.displayName || "").localeCompare(String(b.displayName || "")),
      ),
    [plans],
  );
  const [selectedId, setSelectedId] = useState("");
  const [benefits, setBenefits] = useState<MembershipPlanPayload | null>(null);
  const [editingPlan, setEditingPlan] = useState<MembershipPlanPayload | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);

  const activeId = ordered.some((plan) => String(plan._id || plan.planId) === selectedId)
    ? selectedId
    : String(ordered[0]?._id || ordered[0]?.planId || "");

  const handleSavePlan = async (payload: MembershipPlanPayload) => {
    if (!editingPlan?._id) return;
    try {
      setSavingPlan(true);
      await handleUpdateMembership(editingPlan._id, payload);
      toast.success("Membership plan updated successfully");
      setEditingPlan(null);
      onPlanUpdated?.();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to update membership plan";
      toast.error(message);
    } finally {
      setSavingPlan(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-64 animate-pulse rounded-[22px] border border-slate-200 bg-slate-50" />
        ))}
      </div>
    );
  }

  if (!ordered.length) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">No memberships found.</div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:gap-4 sm:p-4">
        {ordered.map((plan) => {
          const id = String(plan._id || plan.planId);
          const selected = id === activeId;
          const theme = themeFor(plan);
          const Icon = iconFor(plan);
          const stats = planStats(plan);
          const selling = Number(plan.pricing?.amount ?? 0);
          const gross = Number(plan.pricing?.grossAmount ?? 0);
          const period = plan.pricing?.period || "";

          return (
            <div
              key={id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedId(id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedId(id);
                }
              }}
              className={`flex min-h-[250px] cursor-pointer flex-col rounded-[22px] border-2 bg-white p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md sm:p-5 ${
                selected ? theme.borderSelected : "border-[#E8EEF5]"
              }`}
            >
              {/* Header: Icon + Title + Badge + Edit Button + Radio */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Icon className={`h-5 w-5 shrink-0 ${theme.iconText}`} strokeWidth={2.2} />
                  <h3 className={`truncate text-[18px] font-extrabold ${theme.title}`}>
                    {plan.displayName || plan.planId}
                  </h3>
                  <span className="shrink-0 rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#334155]">
                    {stats.badge}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setEditingPlan(plan)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
                    title="Edit plan"
                    aria-label="Edit plan"
                  >
                    <Pencil size={13} />
                  </button>
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                      selected ? theme.radio : "border-slate-300 text-transparent"
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${selected ? "bg-current" : ""}`} />
                  </span>
                </div>
              </div>

              {/* Price & Plan Duration (Visible and clear on mobile and desktop) */}
              <div className="mt-3 flex items-baseline justify-between gap-2 border-b border-[#E8EEF5] pb-3">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Price
                  </span>
                  <div className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="text-xl font-extrabold text-[#0F172A] sm:text-2xl">
                      ₹{selling.toLocaleString("en-IN")}
                    </span>
                    {gross > selling && (
                      <span className="text-xs font-semibold text-slate-400 line-through">
                        ₹{gross.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>

                {period && (
                  <div className="text-right">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Duration
                    </span>
                    <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                      <Clock size={11} className="text-slate-400" />
                      <span>{period}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Discounts & Cashback */}
              <div className="mt-3.5 grid grid-cols-2 divide-x divide-[#E8EEF5]">
                <div className="pr-3">
                  <div className="flex items-center gap-1 text-[12px] font-semibold text-[#64748B]">
                    <Percent className={`h-4 w-4 ${theme.iconText}`} strokeWidth={2.4} />
                    Discounts
                  </div>
                  <p className="mt-1 text-[18px] font-extrabold text-[#0F172A]">{upto(stats.discount)}</p>
                </div>
                <div className="pl-3">
                  <div className="flex items-center gap-1 text-[12px] font-semibold text-[#64748B]">
                    <IndianRupee className={`h-4 w-4 ${theme.iconText}`} strokeWidth={2.4} />
                    Cashback
                  </div>
                  <p className="mt-1 text-[18px] font-extrabold text-[#0F172A]">{upto(stats.cashback)}</p>
                </div>
              </div>

              {/* Programs */}
              <div className="mt-4">
                <p className="text-[12px] font-semibold text-[#64748B]">Programs</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {stats.programs.map((program) => (
                    <span
                      key={program.key}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                        program.eligible
                          ? `${theme.badgeBg} ${theme.badgeText}`
                          : "bg-[#F1F5F9] text-[#94A3B8] line-through"
                      }`}
                    >
                      {program.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer: Benefits */}
              <div className="mt-auto flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setBenefits(plan);
                  }}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#64748B] hover:text-slate-900 transition"
                >
                  <FileText className="h-4 w-4" />
                  See all benefits
                </button>
                <button
                  type="button"
                  aria-label={`View ${plan.displayName || "plan"} benefits`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setBenefits(plan);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-slate-50 transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {benefits
        ? createPortal(
            <BenefitsDialog
              plan={benefits}
              onClose={() => setBenefits(null)}
              onEdit={(p) => setEditingPlan(p)}
            />,
            document.body,
          )
        : null}

      {editingPlan && (
        <AddnewPlansModal
          open={Boolean(editingPlan)}
          onClose={() => setEditingPlan(null)}
          onSubmit={handleSavePlan}
          loading={savingPlan}
          initialPlan={editingPlan}
        />
      )}
    </>
  );
}

function BenefitsDialog({
  plan,
  onClose,
  onEdit,
}: {
  plan: MembershipPlanPayload;
  onClose: () => void;
  onEdit: (plan: MembershipPlanPayload) => void;
}) {
  const theme = themeFor(plan);
  const Icon = iconFor(plan);
  const stats = planStats(plan);
  const features = plan.customerDisplay?.features || [];
  const selling = Number(plan.pricing?.amount ?? 0);
  const gross = Number(plan.pricing?.grossAmount ?? 0);
  const period = plan.pricing?.period || "";

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" onClick={onClose}>
      <div
        className="relative flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:mx-4 sm:rounded-[28px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <div className={`flex h-10 w-10 items-center justify-center rounded-[12px] ${theme.iconBg} ${theme.iconText}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h2 className={`text-[18px] font-extrabold ${theme.title}`}>
                    {plan.displayName || plan.planId}
                  </h2>
                  <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-bold uppercase text-[#334155]">
                    {stats.badge}
                  </span>
                </div>
                {plan.description ? (
                  <p className="mt-0.5 text-[12px] text-[#6B7280]">{plan.description}</p>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(plan);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                title="Edit Plan"
              >
                <Pencil size={12} />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6] text-[#4B5563]"
                aria-label="Close benefits"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Price & Duration banner in Dialog */}
          <div className="mt-4 flex items-baseline justify-between rounded-xl bg-slate-50 p-3">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Price</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg font-extrabold text-slate-900">₹{selling.toLocaleString("en-IN")}</span>
                {gross > selling && (
                  <span className="text-xs text-slate-400 line-through">₹{gross.toLocaleString("en-IN")}</span>
                )}
              </div>
            </div>
            {period && (
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-slate-400">Duration</span>
                <span className="block mt-0.5 text-xs font-bold text-slate-700">{period}</span>
              </div>
            )}
          </div>

          <h3 className="mt-5 text-sm font-bold text-[#0F172A]">Discount & Cashback</h3>
          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {stats.categories.map((category) => {
              const style = CATEGORY_STYLES[category.key];
              return (
                <div key={category.key} className={`rounded-[14px] border border-[#E8EEF5] p-3 ${style.card}`}>
                  <div className="flex items-center gap-2">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold ${style.icon}`}>
                      {style.letter}
                    </div>
                    <p className="truncate text-[11px] font-semibold text-[#1E293B]">{category.label}</p>
                  </div>
                  <div className="mt-3 flex">
                    <div className="min-w-0 flex-1">
                      <p className="text-[8px] text-[#64748B]">Discount</p>
                      <p className={`mt-1 text-[13px] font-bold ${style.accent}`}>{upto(category.discount)}</p>
                    </div>
                    <div className="mx-2 w-px bg-[#E2E8F0]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[8px] text-[#64748B]">Cashback</p>
                      <p className={`mt-1 text-[13px] font-bold ${style.accent}`}>{upto(category.cashback)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <h3 className="mt-5 text-[13px] font-bold text-[#0F172A]">Programs Eligibility</h3>
          <div className="mt-2 grid grid-cols-3 overflow-hidden rounded-[12px] border border-[#E8EEF5]">
            {stats.programs.map((program) => (
              <div key={program.key} className="border-r border-[#E8EEF5] px-2 py-3 text-center last:border-r-0">
                <p className="text-[13px] font-bold text-[#0F172A]">{program.label}</p>
                <p className="mt-1 text-[9px] font-medium text-[#475569]">{program.subtitle}</p>
                <p className={`mt-2 text-[11px] font-semibold ${program.eligible ? "text-[#16A34A]" : "text-[#64748B]"}`}>
                  {program.eligible ? "Yes" : "No"}
                </p>
              </div>
            ))}
          </div>

          {features.length ? (
            <ul className="mt-4 space-y-1.5 text-[12px] text-[#475569]">
              {features.map((feature) => (
                <li key={feature.label}>{feature.label}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

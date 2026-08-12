import type { MembershipPlanPayload } from "@/services/apiClient";
import {
  membershipBucketForLineType,
  normalizeLineType,
} from "./itemClassification";

export type UsageLimit = { discount?: number; cashback?: number };

export function toMembershipPlanId(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "object" && raw !== null && "_id" in (raw as object)) {
    const id = (raw as { _id?: unknown })._id;
    const s = String(id ?? "").trim();
    return s || null;
  }
  const s = String(raw).trim();
  return s || null;
}

/** Convert Map / plain / nested API shapes into a plain Record */
export function normalizeUsageLimits(
  usageLimits: unknown,
): Record<string, UsageLimit> {
  if (!usageLimits) return {};

  if (typeof Map !== "undefined" && usageLimits instanceof Map) {
    return Object.fromEntries(
      [...usageLimits.entries()].map(([k, v]) => [
        String(k),
        {
          discount: Number((v as UsageLimit)?.discount ?? 0) || 0,
          cashback: Number((v as UsageLimit)?.cashback ?? 0) || 0,
        },
      ]),
    );
  }

  if (typeof usageLimits !== "object") return {};

  const out: Record<string, UsageLimit> = {};
  for (const [k, v] of Object.entries(usageLimits as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const row = v as UsageLimit;
    out[String(k)] = {
      discount: Number(row.discount ?? 0) || 0,
      cashback: Number(row.cashback ?? 0) || 0,
    };
  }
  return out;
}

export function resolveMembershipPlan(
  plans: MembershipPlanPayload[],
  membershipType: string,
  membershipPlanId?: unknown,
): MembershipPlanPayload | undefined {
  const list = Array.isArray(plans) ? plans : [];
  const mId = toMembershipPlanId(membershipPlanId);
  const mType = String(membershipType ?? "none").trim().toLowerCase();
  if (!mId && (mType === "none" || mType === "")) return undefined;

  if (mId) {
    const byId = list.find((p) => p._id && String(p._id) === String(mId));
    if (byId) return byId;
  }

  // Exact match on planId / planType / displayName
  const exact = list.find((p) => {
    const planId = String(p.planId ?? "").trim().toLowerCase();
    const planType = String(p.planType ?? "").trim().toLowerCase();
    const display = String(p.displayName ?? "").trim().toLowerCase();
    return planId === mType || planType === mType || display === mType;
  });
  if (exact) return exact;

  // Fuzzy: "premium" matches displayName "Premium Membership", planId "prem", etc.
  const fuzzy = list.find((p) => {
    const planId = String(p.planId ?? "").trim().toLowerCase();
    const planType = String(p.planType ?? "").trim().toLowerCase();
    const display = String(p.displayName ?? "").trim().toLowerCase();
    const badge = String(p.customerDisplay?.badgeLabel ?? "")
      .trim()
      .toLowerCase();
    return (
      (planId && (planId.includes(mType) || mType.includes(planId))) ||
      (display && (display.includes(mType) || mType.includes(display))) ||
      (planType && (planType.includes(mType) || mType.includes(planType))) ||
      (badge && badge.includes(mType))
    );
  });
  return fuzzy;
}

/**
 * Map a line-item category to the membership usageLimits bucket.
 * Only explicit line types (product/service/space/food) map to their buckets.
 * Catalogue labels (Snacks, Studio, Electronics) → Products — never cross-apply
 * Space/Services/Food discounts.
 */
export function canonicalBenefitCategory(category: string): string {
  return membershipBucketForLineType(category);
}

export function getUsageLimitForCategory(
  usageLimits:
    | Record<string, UsageLimit>
    | undefined
    | unknown,
  category: string,
): UsageLimit | undefined {
  const limits = normalizeUsageLimits(usageLimits);
  if (!Object.keys(limits).length) return undefined;

  // Strict: only the matching membership bucket for this line type
  const cat = canonicalBenefitCategory(category);
  if (limits[cat]) return limits[cat];

  const lower = cat.toLowerCase();
  const exact = Object.keys(limits).find((k) => k.toLowerCase() === lower);
  if (exact) return limits[exact];

  // Singular/plural only within the same bucket (Products↔product, Services↔service)
  const sameBucketAliases: Record<string, string[]> = {
    food: ["food", "foods"],
    space: ["space", "spaces"],
    products: ["product", "products", "store"],
    services: ["service", "services"],
  };
  const aliases = sameBucketAliases[lower] || [lower];
  const match = Object.keys(limits).find((k) => {
    const nk = k.toLowerCase();
    return aliases.some((a) => nk === a);
  });
  return match ? limits[match] : undefined;
}

function findLimitRow(
  limits: Record<string, UsageLimit>,
  matchers: string[],
): UsageLimit | undefined {
  const exact = Object.entries(limits).find(([k]) =>
    matchers.some((m) => k.toLowerCase() === m),
  );
  if (exact) return exact[1];
  const fuzzy = Object.entries(limits).find(([k]) =>
    matchers.some((m) => k.toLowerCase().includes(m)),
  );
  return fuzzy?.[1];
}

/**
 * Resolve discount % and cashback % for a line from the subscribed membership plan.
 * Category usageLimits (Food / Space / Products / Services) are the source of truth.
 * customerDisplay.cashbackPercent is the Food badge; storeCashbackPercent is Products.
 */
export function resolveBenefitPercents(
  category: string,
  plan: MembershipPlanPayload | undefined,
): { discountPercent: number; cashbackPercent: number } {
  if (!plan) return { discountPercent: 0, cashbackPercent: 0 };

  const benefitCategory = canonicalBenefitCategory(category);
  const limit = getUsageLimitForCategory(plan.usageLimits, benefitCategory);
  let discountPercent = Number(limit?.discount ?? 0) || 0;
  let cashbackPercent = Number(limit?.cashback ?? 0) || 0;

  // Prefer canonical usageLimits rows when category match was weak / incomplete
  if (discountPercent <= 0 || cashbackPercent <= 0) {
    const limits = normalizeUsageLimits(plan.usageLimits);
    let row: UsageLimit | undefined;
    if (benefitCategory === "Food") {
      row = findLimitRow(limits, ["food", "foods"]);
    } else if (benefitCategory === "Space") {
      row = findLimitRow(limits, ["space", "spaces"]);
    } else if (benefitCategory === "Services") {
      row = findLimitRow(limits, ["services", "service"]);
    } else {
      row = findLimitRow(limits, ["products", "product", "store"]);
    }
    if (row) {
      if (discountPercent <= 0) {
        discountPercent = Number(row.discount ?? 0) || 0;
      }
      if (cashbackPercent <= 0) {
        cashbackPercent = Number(row.cashback ?? 0) || 0;
      }
    }
  }

  const display = plan.customerDisplay as
    | (NonNullable<MembershipPlanPayload["customerDisplay"]> & {
        storeCashbackPercent?: number;
      })
    | undefined;
  if (display) {
    if (discountPercent <= 0) {
      if (benefitCategory === "Food") {
        discountPercent = Number(display.foodDiscountPercent ?? 0) || 0;
      } else if (benefitCategory === "Space") {
        discountPercent = Number(display.spaceDiscountPercent ?? 0) || 0;
      } else if (benefitCategory === "Products") {
        discountPercent = Number(display.storeDiscountPercent ?? 0) || 0;
      }
    }
    if (cashbackPercent <= 0) {
      if (benefitCategory === "Food") {
        cashbackPercent = Number(display.cashbackPercent ?? 0) || 0;
      } else if (benefitCategory === "Products") {
        // Mirror of storeDiscountPercent — Products cashback display fallback
        cashbackPercent = Number(display.storeCashbackPercent ?? 0) || 0;
      }
    }
  }

  return { discountPercent, cashbackPercent };
}

/** Catalogue product discount from discountType / discountValue (always applies, including CSP). */
export function calcCatalogueProductDiscount(
  unitPrice: number,
  qty: number,
  discountType?: string | null,
  discountValue?: number | null,
): number {
  const price = Number(unitPrice) || 0;
  const quantity = Number(qty) || 0;
  const dValue = Number(discountValue ?? 0) || 0;
  if (price <= 0 || quantity <= 0 || dValue <= 0) return 0;

  const dType = String(discountType ?? "flat").trim().toLowerCase();
  const lineTotal = price * quantity;
  if (dType === "percentage") {
    return Math.min(lineTotal, (lineTotal * dValue) / 100);
  }
  // flat = amount off per unit
  return Math.min(lineTotal, dValue * quantity);
}

export function membershipBenefitsForLine(
  unitPrice: number,
  qty: number,
  category: string,
  plan: MembershipPlanPayload | undefined,
  options?: { isCsp?: boolean },
): { discount: number; cashback: number } {
  // CSP products: no membership discount / cashback (product catalogue discount is separate)
  if (options?.isCsp) {
    return { discount: 0, cashback: 0 };
  }
  if (!plan) return { discount: 0, cashback: 0 };

  const { discountPercent, cashbackPercent } = resolveBenefitPercents(
    category,
    plan,
  );
  const lineTotal = Number(unitPrice) * Number(qty);
  if (!Number.isFinite(lineTotal) || lineTotal <= 0) {
    return { discount: 0, cashback: 0 };
  }

  const discount =
    discountPercent > 0 ? (lineTotal * discountPercent) / 100 : 0;
  const cashback =
    cashbackPercent > 0 ? (lineTotal * cashbackPercent) / 100 : 0;
  return { discount, cashback };
}

/**
 * Stack catalogue product discount + membership category discount on one line.
 * Both can apply; total is capped at line total.
 */
export function calcStackedLineBenefits(params: {
  unitPrice: number;
  qty: number;
  category: string;
  plan?: MembershipPlanPayload;
  discountType?: string | null;
  discountValue?: number | null;
  isCsp?: boolean;
}): {
  productDiscount: number;
  membershipDiscount: number;
  discount: number;
  cashback: number;
} {
  const unitPrice = Number(params.unitPrice) || 0;
  const qty = Number(params.qty) || 0;
  const lineTotal = unitPrice * qty;
  const productDiscount = calcCatalogueProductDiscount(
    unitPrice,
    qty,
    params.discountType,
    params.discountValue,
  );

  if (params.isCsp) {
    return {
      productDiscount,
      membershipDiscount: 0,
      discount: Math.min(lineTotal, productDiscount),
      cashback: 0,
    };
  }

  const membership = membershipBenefitsForLine(
    unitPrice,
    qty,
    params.category,
    params.plan,
    { isCsp: false },
  );

  const membershipDiscount = Number(membership.discount) || 0;
  const cashback = Number(membership.cashback) || 0;
  const discount = Math.min(
    lineTotal,
    Math.max(0, productDiscount) + Math.max(0, membershipDiscount),
  );

  return {
    productDiscount: Math.max(0, productDiscount),
    membershipDiscount: Math.max(0, membershipDiscount),
    discount,
    cashback,
  };
}

export function summarizeMembershipForCart(
  plans: MembershipPlanPayload[],
  membershipType: string,
  membershipPlanId: unknown,
  items: Array<{
    price: number;
    qty: number;
    category?: string;
    discount?: number;
    cashback?: number;
    isCsp?: boolean;
  }>,
) {
  const plan = resolveMembershipPlan(plans, membershipType, membershipPlanId);
  let membershipDiscount = 0;
  let cashbackTotal = 0;
  for (const item of items) {
    if (item.isCsp) continue;
    const cat = item.category || "General";
    const fromPlan = membershipBenefitsForLine(
      item.price,
      item.qty,
      cat,
      plan,
    );
    membershipDiscount += fromPlan.discount;
    cashbackTotal += fromPlan.cashback;
  }
  return { membershipDiscount, cashbackTotal, plan };
}

/** Persistable membership type key for a plan (planId preferred). */
export function getCustomerMembershipTypeFromPlan(
  plan?: Pick<MembershipPlanPayload, "planId" | "displayName"> | null,
): string {
  const planId = String(plan?.planId ?? "").trim();
  if (planId) return planId.toLowerCase();
  const display = String(plan?.displayName ?? "").trim();
  if (!display) return "none";
  return display
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isEmptyMembership(membershipType?: string | null): boolean {
  const t = String(membershipType ?? "")
    .trim()
    .toLowerCase();
  return !t || t === "none" || t === "-" || t === "n/a";
}

/** Billing period strings that must not be shown as membership-type badges. */
const PERIOD_LIKE_LABELS = new Set([
  "yearly",
  "year",
  "annual",
  "annually",
  "monthly",
  "month",
  "weekly",
  "week",
  "daily",
  "day",
  "lifetime",
  "quarterly",
  "quarter",
  "till school life",
  "school life",
  "one time",
  "onetime",
  "one-time",
]);

function isPeriodLikeLabel(label: string): boolean {
  const n = String(label ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!n) return false;
  if (PERIOD_LIKE_LABELS.has(n)) return true;
  // e.g. "Yearly Plan", "Monthly Membership period"
  return [...PERIOD_LIKE_LABELS].some(
    (p) => n === p || n.startsWith(`${p} `) || n.endsWith(` ${p}`),
  );
}

/**
 * Human label for invoice / POS badges = membership TYPE (General, Premium, Lifetime…),
 * never billing/repeat period (Yearly, Monthly…).
 */
export function getMembershipBadgeLabel(
  plans: MembershipPlanPayload[],
  membershipType?: string | null,
  membershipPlanId?: unknown,
): string {
  if (isEmptyMembership(membershipType) && !toMembershipPlanId(membershipPlanId)) {
    return "NONE";
  }
  const plan = resolveMembershipPlan(
    plans,
    String(membershipType ?? ""),
    membershipPlanId,
  );
  if (plan) {
    const badge = String(plan.customerDisplay?.badgeLabel ?? "").trim();
    const display = String(plan.displayName ?? "").trim();
    const planId = String(plan.planId ?? "").trim();
    // Custom badge only if it is a membership name, not a period like "Yearly"
    if (badge && !isPeriodLikeLabel(badge)) return badge;
    if (display) return display;
    if (planId) return planId;
    const rawType = String(membershipType ?? "").trim();
    if (rawType && !isPeriodLikeLabel(rawType)) return rawType;
    return display || planId || "NONE";
  }
  const raw = String(membershipType ?? "").trim();
  if (!raw || isPeriodLikeLabel(raw)) return "NONE";
  return raw;
}

const THEME_CLASS: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  green: "bg-green-100 text-green-700",
  orange: "bg-orange-100 text-orange-700",
  yellow: "bg-yellow-100 text-yellow-700",
  violet: "bg-violet-100 text-violet-700",
  emerald: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
  slate: "bg-slate-100 text-slate-700",
  gray: "bg-gray-100 text-gray-700",
  amber: "bg-amber-100 text-amber-800",
  teal: "bg-teal-100 text-teal-700",
  indigo: "bg-indigo-100 text-indigo-700",
  rose: "bg-rose-100 text-rose-700",
};

/** Stable fallback themes for classic planIds + hash for any new plan. */
const KNOWN_PLAN_THEME: Record<string, keyof typeof THEME_CLASS> = {
  none: "gray",
  general: "gray",
  premium: "purple",
  pro: "blue",
  special: "green",
  junior: "yellow",
  elite: "violet",
  lifetime: "emerald",
};

const THEME_PALETTE = Object.keys(THEME_CLASS) as Array<keyof typeof THEME_CLASS>;

function hashThemeKey(seed: string): keyof typeof THEME_CLASS {
  let hash = 0;
  const s = seed.toLowerCase();
  for (let i = 0; i < s.length; i += 1) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  return THEME_PALETTE[Math.abs(hash) % THEME_PALETTE.length];
}

export function getMembershipBadgeClassName(
  plans: MembershipPlanPayload[],
  membershipType?: string | null,
  membershipPlanId?: unknown,
): string {
  if (isEmptyMembership(membershipType) && !toMembershipPlanId(membershipPlanId)) {
    return THEME_CLASS.gray;
  }

  const plan = resolveMembershipPlan(
    plans,
    String(membershipType ?? ""),
    membershipPlanId,
  );
  const themeFromPlan = String(plan?.customerDisplay?.themeKey ?? "")
    .trim()
    .toLowerCase();
  if (themeFromPlan && THEME_CLASS[themeFromPlan]) {
    return THEME_CLASS[themeFromPlan];
  }

  const planId = String(plan?.planId ?? membershipType ?? "")
    .trim()
    .toLowerCase();
  if (KNOWN_PLAN_THEME[planId]) {
    return THEME_CLASS[KNOWN_PLAN_THEME[planId]];
  }

  // New Manage Plans entries (e.g. Lifetime) get a stable color from planId/name
  const seed =
    planId ||
    String(plan?.displayName ?? membershipType ?? "membership").trim();
  return THEME_CLASS[hashThemeKey(seed)];
}

import type { MembershipPlanPayload } from "@/services/apiClient";

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

export function getUsageLimitForCategory(
  usageLimits:
    | Record<string, UsageLimit>
    | undefined
    | unknown,
  category: string,
): UsageLimit | undefined {
  const limits = normalizeUsageLimits(usageLimits);
  if (!Object.keys(limits).length) return undefined;

  const cat = String(category ?? "General").trim();
  if (limits[cat]) return limits[cat];

  const lower = cat.toLowerCase();
  const exact = Object.keys(limits).find((k) => k.toLowerCase() === lower);
  if (exact) return limits[exact];

  // Fuzzy match: Food / Space / Products / Services / Store line categories
  const aliasGroups: string[][] = [
    ["food", "foods", "meal", "restaurant", "canteen"],
    ["space", "spaces", "booking", "room"],
    ["product", "products", "store", "supply", "sheets", "stationary", "stationery"],
    ["service", "services"],
  ];
  for (const group of aliasGroups) {
    if (!group.some((g) => lower === g || lower.includes(g))) continue;
    // Prefer canonical keys first (Products / Services / Food / Space)
    const preferred = Object.keys(limits).find((k) => {
      const nk = k.toLowerCase();
      return group.some((g) => nk === g || nk === `${g}s`);
    });
    if (preferred) return limits[preferred];
    const key = Object.keys(limits).find((k) => {
      const nk = k.toLowerCase();
      return group.some((g) => nk.includes(g));
    });
    if (key) return limits[key];
  }

  if (limits.General) return limits.General;
  if (limits.general) return limits.general;
  return undefined;
}

function isFoodCategory(category: string) {
  const lower = String(category || "").trim().toLowerCase();
  return ["food", "foods", "meal", "restaurant", "canteen"].some((g) =>
    lower.includes(g),
  );
}

function isSpaceCategory(category: string) {
  const lower = String(category || "").trim().toLowerCase();
  return ["space", "spaces", "booking", "room"].some((g) => lower.includes(g));
}

function isProductCategory(category: string) {
  const lower = String(category || "").trim().toLowerCase();
  return [
    "product",
    "products",
    "store",
    "supply",
    "sheets",
    "stationary",
    "stationery",
  ].some((g) => lower === g || lower.includes(g));
}

function isServiceCategory(category: string) {
  const lower = String(category || "").trim().toLowerCase();
  return ["service", "services"].some((g) => lower === g || lower.includes(g));
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
 * Resolve discount % and cashback % for a line.
 * Prefers usageLimits[category], then customerDisplay food/space/store badges.
 */
export function resolveBenefitPercents(
  category: string,
  plan: MembershipPlanPayload | undefined,
): { discountPercent: number; cashbackPercent: number } {
  if (!plan) return { discountPercent: 0, cashbackPercent: 0 };

  const limit = getUsageLimitForCategory(plan.usageLimits, category);
  let discountPercent = Number(limit?.discount ?? 0) || 0;
  let cashbackPercent = Number(limit?.cashback ?? 0) || 0;

  const display = plan.customerDisplay;
  if (display) {
    if (discountPercent <= 0) {
      if (isFoodCategory(category)) {
        discountPercent = Number(display.foodDiscountPercent ?? 0) || 0;
      } else if (isSpaceCategory(category)) {
        discountPercent = Number(display.spaceDiscountPercent ?? 0) || 0;
      } else if (isProductCategory(category)) {
        discountPercent = Number(display.storeDiscountPercent ?? 0) || 0;
      }
    }
    if (cashbackPercent <= 0) {
      cashbackPercent = Number(display.cashbackPercent ?? 0) || 0;
    }
  }

  // Last resort: canonical usageLimits rows (Food / Space / Products / Services)
  if (discountPercent <= 0 || cashbackPercent <= 0) {
    const limits = normalizeUsageLimits(plan.usageLimits);
    let row: UsageLimit | undefined;
    if (isFoodCategory(category)) {
      row = findLimitRow(limits, ["food", "foods"]);
    } else if (isSpaceCategory(category)) {
      row = findLimitRow(limits, ["space", "spaces"]);
    } else if (isServiceCategory(category)) {
      row = findLimitRow(limits, ["services", "service"]);
    } else if (isProductCategory(category)) {
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

  return { discountPercent, cashbackPercent };
}

export function membershipBenefitsForLine(
  unitPrice: number,
  qty: number,
  category: string,
  plan: MembershipPlanPayload | undefined,
): { discount: number; cashback: number } {
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
  }>,
) {
  const plan = resolveMembershipPlan(plans, membershipType, membershipPlanId);
  let membershipDiscount = 0;
  let cashbackTotal = 0;
  for (const item of items) {
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

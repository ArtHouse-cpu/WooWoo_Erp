import type { MembershipPlanPayload } from "@/services/apiClient";

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

export function resolveMembershipPlan(
  plans: MembershipPlanPayload[],
  membershipType: string,
  membershipPlanId?: unknown,
): MembershipPlanPayload | undefined {
  const mId = toMembershipPlanId(membershipPlanId);
  const mType = String(membershipType ?? "none").trim().toLowerCase();
  if (!mId && (mType === "none" || mType === "")) return undefined;

  if (mId) {
    const byId = plans.find((p) => p._id && String(p._id) === String(mId));
    if (byId) return byId;
  }

  return plans.find(
    (p) =>
      String(p.planId ?? "").trim().toLowerCase() === mType ||
      String(p.planType ?? "").trim().toLowerCase() === mType ||
      String(p.displayName ?? "").trim().toLowerCase() === mType,
  );
}

export function getUsageLimitForCategory(
  usageLimits:
    | Record<string, { discount?: number; cashback?: number }>
    | undefined,
  category: string,
): { discount?: number; cashback?: number } | undefined {
  if (!usageLimits || typeof usageLimits !== "object") return undefined;
  const cat = String(category ?? "General").trim();
  if (usageLimits[cat]) return usageLimits[cat];

  const lower = cat.toLowerCase();
  const exact = Object.keys(usageLimits).find((k) => k.toLowerCase() === lower);
  if (exact) return usageLimits[exact];

  // Fuzzy match: Food / Space / Store / Service line categories
  const aliasGroups: string[][] = [
    ["food", "foods", "meal", "restaurant", "canteen"],
    ["space", "spaces", "booking", "room"],
    ["store", "product", "products", "supply", "sheets", "stationary", "stationery"],
    ["service", "services"],
  ];
  for (const group of aliasGroups) {
    if (!group.some((g) => lower.includes(g))) continue;
    const key = Object.keys(usageLimits).find((k) => {
      const nk = k.toLowerCase();
      return group.some((g) => nk.includes(g));
    });
    if (key) return usageLimits[key];
  }

  if (usageLimits.General) return usageLimits.General;
  if (usageLimits.general) return usageLimits.general;
  return undefined;
}

export function membershipBenefitsForLine(
  unitPrice: number,
  qty: number,
  category: string,
  plan: MembershipPlanPayload | undefined,
): { discount: number; cashback: number } {
  if (!plan?.usageLimits) return { discount: 0, cashback: 0 };
  const limit = getUsageLimitForCategory(
    plan.usageLimits as Record<string, { discount?: number; cashback?: number }>,
    category,
  );
  if (!limit) return { discount: 0, cashback: 0 };
  const discount = limit.discount
    ? (Number(unitPrice) * Number(qty) * Number(limit.discount)) / 100
    : 0;
  const cashback = limit.cashback
    ? (Number(unitPrice) * Number(qty) * Number(limit.cashback)) / 100
    : 0;
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

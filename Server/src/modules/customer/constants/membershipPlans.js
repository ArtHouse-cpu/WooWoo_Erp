/**
 * Canonical membership plan prices used for coupon validation & checkout totals.
 * Keep in sync with Customer/src/data/membershipPlans.ts
 */
export const MEMBERSHIP_PLAN_PRICES = {
  general: 249,
  special: 399,
  junior: 199,
  premium: 999,
  pro: 999,
};

export const getMembershipOrderAmount = membershipType => {
  const key = String(membershipType || '').toLowerCase();
  const price = MEMBERSHIP_PLAN_PRICES[key];
  return Number.isFinite(price) ? price : null;
};

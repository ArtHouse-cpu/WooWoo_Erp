import Membership from '../models/membership.model.js';

const DEFAULT_THEME_BY_PLAN_ID = {
  general: 'blue',
  special: 'purple',
  junior: 'green',
  premium: 'orange',
  pro: 'orange',
};

const DEFAULT_ICON_BY_PLAN_ID = {
  general: 'user',
  special: 'star',
  junior: 'graduation',
  premium: 'crown',
  pro: 'crown',
};

const toPlainUsageLimits = usageLimits => {
  if (!usageLimits) return {};
  if (usageLimits instanceof Map) {
    return Object.fromEntries(usageLimits.entries());
  }
  if (typeof usageLimits === 'object') return usageLimits;
  return {};
};

const findUsageLimitValue = (usageLimits, matchers, field) => {
  const entries = Object.entries(toPlainUsageLimits(usageLimits));
  for (const [key, value] of entries) {
    const normalized = String(key || '').trim().toLowerCase();
    if (matchers.some(m => normalized.includes(m))) {
      return Number(value?.[field] ?? 0);
    }
  }
  return 0;
};

export const getListedPlanPrice = membership => {
  const amount = Number(membership?.pricing?.amount ?? 0);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return amount;
};

export const getMembershipPlanByPlanId = async planId => {
  const normalized = String(planId || '').trim().toLowerCase();
  if (!normalized) return null;
  return Membership.findOne({
    planId: normalized,
    status: 'Active',
  }).lean();
};

export const getMembershipOrderAmount = async planId => {
  const plan = await getMembershipPlanByPlanId(planId);
  if (!plan) return null;
  return getListedPlanPrice(plan);
};

export const assertActiveMembershipPlan = async planId => {
  const plan = await getMembershipPlanByPlanId(planId);
  if (!plan) {
    const error = new Error('Select a valid membership plan');
    error.status = 400;
    throw error;
  }
  return plan;
};

export const resolvePlanMeta = membership => {
  const planId = String(membership?.planId || '').toLowerCase();
  const display = membership?.customerDisplay || {};
  return {
    label: `${membership?.displayName || planId} Membership`,
    validity:
      String(display.badgeLabel || membership?.pricing?.period || 'Yearly').trim() ||
      'Yearly',
    planId,
    membershipPlanId: membership?._id || null,
  };
};

export const formatCustomerMembershipPlan = membership => {
  const planId = String(membership.planId || '').trim().toLowerCase();
  const display = membership.customerDisplay || {};
  const usageLimits = toPlainUsageLimits(membership.usageLimits);
  const price = getListedPlanPrice(membership);

  const storeDiscount =
    Number(display.storeDiscountPercent ?? 0) ||
    findUsageLimitValue(usageLimits, ['store', 'product', 'general', 'supply'], 'discount');

  const spaceDiscount =
    Number(display.spaceDiscountPercent ?? 0) ||
    findUsageLimitValue(usageLimits, ['space', 'booking'], 'discount');

  const cashbackPercent =
    Number(display.cashbackPercent ?? 0) ||
    findUsageLimitValue(usageLimits, ['store', 'product', 'general', 'space'], 'cashback');

  const features = Array.isArray(display.features) && display.features.length
    ? display.features.map(item => ({
        label: String(item.label || '').trim(),
        was: Number(item.was ?? 0) || undefined,
      })).filter(item => item.label)
    : membership.description
      ? [{label: String(membership.description).trim(), was: price > 0 ? price * 4 : undefined}]
      : [];

  const themeKey =
    String(display.themeKey || DEFAULT_THEME_BY_PLAN_ID[planId] || 'blue').trim() || 'blue';
  const iconKey =
    String(display.iconKey || DEFAULT_ICON_BY_PLAN_ID[planId] || 'user').trim() || 'user';

  return {
    id: planId,
    planId,
    _id: membership._id,
    title: membership.displayName,
    badge:
      String(display.badgeLabel || membership.pricing?.period || 'Yearly').trim() || 'Yearly',
    price,
    description: String(membership.description || '').trim(),
    themeKey,
    iconKey,
    features,
    discounts: [
      ...(storeDiscount > 0
        ? [{icon: 'store', label: `Store ${storeDiscount}%`}]
        : []),
      ...(spaceDiscount > 0
        ? [{icon: 'space', label: `Space ${spaceDiscount}%`}]
        : []),
    ],
    cashback: `${cashbackPercent || 0}%`,
    priority: Number(membership.priority ?? 0),
  };
};

export const getActiveCustomerMembershipPlans = async () => {
  const memberships = await Membership.find({status: 'Active'})
    .sort({priority: 1, createdAt: 1})
    .lean();

  return memberships
    .filter(plan => plan.customerDisplay?.showInApp === true)
    .map(formatCustomerMembershipPlan);
};

export type MembershipPlanId = string;

export type MembershipPlan = {
  id: MembershipPlanId;
  title: string;
  badge: string;
  price: number;
  theme: {
    border: string;
    borderSelected: string;
    title: string;
    iconBg: string;
    iconText: string;
    check: string;
    badgeBg: string;
    badgeText: string;
    radio: string;
  };
  features: Array<{label: string; was?: number}>;
  discounts: Array<{icon: 'store' | 'space'; label: string}>;
  cashback: string;
  description: string;
  iconKey?: 'user' | 'star' | 'graduation' | 'crown';
};

export type ApiMembershipPlan = {
  id: string;
  planId: string;
  title: string;
  badge: string;
  price: number;
  description: string;
  themeKey?: string;
  iconKey?: 'user' | 'star' | 'graduation' | 'crown';
  features?: Array<{label: string; was?: number}>;
  discounts?: Array<{icon: 'store' | 'space'; label: string}>;
  cashback?: string;
};

const THEME_BY_KEY: Record<string, MembershipPlan['theme']> = {
  blue: {
    border: 'border-[#BFDBFE]',
    borderSelected: 'border-[#3B82F6]',
    title: 'text-[#2563EB]',
    iconBg: 'bg-[#DBEAFE]',
    iconText: 'text-[#2563EB]',
    check: 'text-[#3B82F6]',
    badgeBg: 'bg-[#DBEAFE]',
    badgeText: 'text-[#2563EB]',
    radio: 'border-[#3B82F6] text-[#3B82F6]',
  },
  purple: {
    border: 'border-[#E9D5FF]',
    borderSelected: 'border-[#A855F7]',
    title: 'text-[#9333EA]',
    iconBg: 'bg-[#F3E8FF]',
    iconText: 'text-[#9333EA]',
    check: 'text-[#A855F7]',
    badgeBg: 'bg-[#F3E8FF]',
    badgeText: 'text-[#9333EA]',
    radio: 'border-[#A855F7] text-[#A855F7]',
  },
  green: {
    border: 'border-[#BBF7D0]',
    borderSelected: 'border-[#22C55E]',
    title: 'text-[#16A34A]',
    iconBg: 'bg-[#DCFCE7]',
    iconText: 'text-[#16A34A]',
    check: 'text-[#22C55E]',
    badgeBg: 'bg-[#DCFCE7]',
    badgeText: 'text-[#16A34A]',
    radio: 'border-[#22C55E] text-[#22C55E]',
  },
  orange: {
    border: 'border-[#FED7AA]',
    borderSelected: 'border-[#F97316]',
    title: 'text-[#EA580C]',
    iconBg: 'bg-[#FFEDD5]',
    iconText: 'text-[#EA580C]',
    check: 'text-[#F97316]',
    badgeBg: 'bg-[#FFEDD5]',
    badgeText: 'text-[#EA580C]',
    radio: 'border-[#F97316] text-[#F97316]',
  },
};

export const FALLBACK_MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: 'general',
    title: 'General',
    badge: 'Lifetime',
    price: 249,
    description: 'Best for individuals starting their creative journey',
    iconKey: 'user',
    theme: THEME_BY_KEY.blue,
    features: [
      {label: 'Best for individuals starting their creative journey', was: 999},
      {label: 'Call & Chat support', was: 999},
      {label: 'Access to all core features', was: 999},
    ],
    discounts: [
      {icon: 'store', label: 'Store 5%'},
      {icon: 'space', label: 'Space 10%'},
    ],
    cashback: '1%',
  },
  {
    id: 'special',
    title: 'Special',
    badge: 'Yearly',
    price: 399,
    description: 'Best for creators who want more rewards & benefits',
    iconKey: 'star',
    theme: THEME_BY_KEY.purple,
    features: [
      {label: 'Best for creators who want more rewards & benefits', was: 1499},
      {label: 'Priority Call & Chat support', was: 1499},
      {label: 'Access to all core + exclusive features', was: 1499},
    ],
    discounts: [
      {icon: 'store', label: 'Store 10%'},
      {icon: 'space', label: 'Space 20%'},
    ],
    cashback: '2%',
  },
  {
    id: 'junior',
    title: 'Junior',
    badge: 'Till School Life',
    price: 199,
    description: 'Best for school students & young creators',
    iconKey: 'graduation',
    theme: THEME_BY_KEY.green,
    features: [
      {label: 'Best for school students & young creators', was: 799},
      {label: 'Guided learning support', was: 799},
      {label: 'Access to junior-friendly features', was: 799},
    ],
    discounts: [
      {icon: 'store', label: 'Store 10%'},
      {icon: 'space', label: 'Space 20%'},
    ],
    cashback: '2%',
  },
  {
    id: 'premium',
    title: 'Premium',
    badge: 'Yearly',
    price: 999,
    description: 'Best for professionals & power users',
    iconKey: 'crown',
    theme: THEME_BY_KEY.orange,
    features: [
      {label: 'Best for professionals & power users', was: 2999},
      {label: 'Dedicated concierge support', was: 2999},
      {label: 'Full access to premium features', was: 2999},
    ],
    discounts: [
      {icon: 'store', label: 'Store 15%'},
      {icon: 'space', label: 'Space 25%'},
    ],
    cashback: '3%',
  },
];

export function mapApiPlanToMembershipPlan(plan: ApiMembershipPlan): MembershipPlan {
  const themeKey = String(plan.themeKey || 'blue').trim() || 'blue';
  return {
    id: String(plan.id || plan.planId).trim(),
    title: plan.title,
    badge: plan.badge,
    price: Number(plan.price || 0),
    description: plan.description || '',
    iconKey: plan.iconKey || 'user',
    theme: THEME_BY_KEY[themeKey] || THEME_BY_KEY.blue,
    features: Array.isArray(plan.features) ? plan.features : [],
    discounts: Array.isArray(plan.discounts) ? plan.discounts : [],
    cashback: plan.cashback || '0%',
  };
}

export function getMembershipPlan(
  id: MembershipPlanId,
  plans: MembershipPlan[] = FALLBACK_MEMBERSHIP_PLANS,
) {
  return plans.find(p => p.id === id) || plans[0];
}

/** @deprecated use fetched plans from API */
export const MEMBERSHIP_PLANS = FALLBACK_MEMBERSHIP_PLANS;

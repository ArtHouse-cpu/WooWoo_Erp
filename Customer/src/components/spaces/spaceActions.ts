import type {SpaceCard} from '../../services/space.service';
import {Crown, Gem, GraduationCap, Star, User} from 'lucide-react';

export const SPACE_WHATSAPP = '918073988123';

export interface MembershipTier {
  id: string;
  name: string;
  discountPercent: number;
  cashbackPercent: number;
  icon: typeof User;
  iconBg: string;
  iconColor: string;
}

export const MEMBERSHIP_TIERS: MembershipTier[] = [
  {
    id: 'general',
    name: 'General Membership',
    discountPercent: 5,
    cashbackPercent: 1,
    icon: User,
    iconBg: 'bg-[#F3E8FF]',
    iconColor: 'text-[#7C3AED]',
  },
  {
    id: 'special',
    name: 'Special Membership',
    discountPercent: 15,
    cashbackPercent: 1,
    icon: Star,
    iconBg: 'bg-[#DBEAFE]',
    iconColor: 'text-[#2563EB]',
  },
  {
    id: 'premium',
    name: 'Premium Membership',
    discountPercent: 40,
    cashbackPercent: 2,
    icon: Crown,
    iconBg: 'bg-[#FEF3C7]',
    iconColor: 'text-[#D97706]',
  },
  {
    id: 'elite',
    name: 'Elite Membership',
    discountPercent: 40,
    cashbackPercent: 2,
    icon: Gem,
    iconBg: 'bg-[#F3E8FF]',
    iconColor: 'text-[#9333EA]',
  },
  {
    id: 'junior',
    name: 'Junior Membership',
    discountPercent: 15,
    cashbackPercent: 1,
    icon: GraduationCap,
    iconBg: 'bg-[#DCFCE7]',
    iconColor: 'text-[#16A34A]',
  },
];

export function formatInr(value: number) {
  return Math.max(0, Number(value) || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });
}

export function spaceShareUrl(spaceId: string, membershipId?: string | null) {
  const base = `${window.location.origin}/spaces/space/${encodeURIComponent(spaceId)}`;
  return membershipId ? `${base}?membership=${encodeURIComponent(membershipId)}` : base;
}

export function spacePriceLine(space: Pick<SpaceCard, 'weekdayPrice' | 'weekendPrice' | 'fromPrice'>) {
  const parts: string[] = [];
  if (space.weekdayPrice != null) parts.push(`Weekday ₹${formatInr(space.weekdayPrice)}/hr`);
  if (space.weekendPrice != null) parts.push(`Weekend ₹${formatInr(space.weekendPrice)}/hr`);
  return parts.join(' · ') || `₹${formatInr(space.fromPrice)}/hr`;
}

export function spaceQueryUrl(
  space: Pick<SpaceCard, 'id' | 'name' | 'spaceType' | 'weekdayPrice' | 'weekendPrice' | 'fromPrice'> & {imageUrl?: string | null},
  enquiry?: {name?: string; phone?: string; message?: string},
) {
  const text = [
    'Hi, I have a query about this space at WooWoo Art House.',
    space.imageUrl ? `Image: ${space.imageUrl}` : '',
    `Product name: ${space.name}`,
    `Price: ${spacePriceLine(space)}`,
    space.spaceType ? `Type: ${space.spaceType}` : '',
    `Link: ${spaceShareUrl(space.id)}`,
    enquiry?.name?.trim() ? `From: ${enquiry.name.trim()}` : '',
    enquiry?.phone?.trim() ? `Phone: ${enquiry.phone.trim()}` : '',
    enquiry?.message?.trim() ? `Message: ${enquiry.message.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return `https://wa.me/${SPACE_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

export function spaceBookingUrl(
  space: Pick<SpaceCard, 'id' | 'name' | 'spaceType' | 'weekdayPrice' | 'weekendPrice' | 'fromPrice'> & {imageUrl?: string | null},
  membershipTier?: MembershipTier | null,
) {
  const basePrice = space.weekdayPrice ?? space.fromPrice;
  const unitDiscount = membershipTier ? Math.round(basePrice * (membershipTier.discountPercent / 100)) : 0;
  const finalPrice = Math.max(0, basePrice - unitDiscount);

  const membershipLine = membershipTier
    ? `Membership: ${membershipTier.name} (${membershipTier.discountPercent}% OFF · Save ₹${formatInr(unitDiscount)}/hr)`
    : '';

  const priceLine = membershipTier
    ? `Price: ₹${formatInr(finalPrice)}/hr (Base: ${spacePriceLine(space)})`
    : `Price: ${spacePriceLine(space)}`;

  const text = [
    'Hi, I would like to book a space at WooWoo Art House.',
    space.imageUrl ? `Image: ${space.imageUrl}` : '',
    `Product name: ${space.name}`,
    membershipLine,
    priceLine,
    space.spaceType ? `Type: ${space.spaceType}` : '',
    `Link: ${spaceShareUrl(space.id, membershipTier?.id)}`,
  ]
    .filter(Boolean)
    .join('\n');
  return `https://wa.me/${SPACE_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

export async function copySpaceLink(spaceId: string, membershipId?: string | null) {
  const url = spaceShareUrl(spaceId, membershipId);
  await navigator.clipboard.writeText(url);
  return url;
}

export async function openNativeShare(space: Pick<SpaceCard, 'name'>, url: string) {
  if (!navigator.share) return 'unavailable' as const;
  try {
    await navigator.share({
      title: space.name,
      text: `${space.name} at WooWoo Art House`,
      url,
    });
    return 'shared' as const;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return 'cancelled' as const;
    return 'failed' as const;
  }
}

export function setSpacePageMeta(input: {
  title: string;
  description: string;
  image?: string | null;
  url?: string;
}) {
  const previousTitle = document.title;
  document.title = input.title;
  const tags: Array<[string, string, string]> = [
    ['property', 'og:title', input.title],
    ['property', 'og:description', input.description],
    ['name', 'description', input.description],
    ['property', 'og:type', 'website'],
  ];
  if (input.image) tags.push(['property', 'og:image', input.image]);
  if (input.url) tags.push(['property', 'og:url', input.url]);
  const created: HTMLMetaElement[] = [];
  for (const [attr, key, content] of tags) {
    let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      el.dataset.spaceMeta = '1';
      document.head.appendChild(el);
      created.push(el);
    }
    el.setAttribute('content', content);
  }
  return () => {
    document.title = previousTitle;
    created.forEach(el => el.remove());
  };
}

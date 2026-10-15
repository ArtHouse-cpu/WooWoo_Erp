import type {SpaceCard} from '../../services/space.service';

export const SPACE_WHATSAPP = '918073988123';

export function formatInr(value: number) {
  return Math.max(0, Number(value) || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });
}

export function spaceShareUrl(spaceId: string) {
  return `${window.location.origin}/spaces/space/${encodeURIComponent(spaceId)}`;
}

export function spacePriceLine(space: Pick<SpaceCard, 'weekdayPrice' | 'weekendPrice' | 'fromPrice'>) {
  const parts: string[] = [];
  if (space.weekdayPrice != null) parts.push(`Weekday ₹${formatInr(space.weekdayPrice)}`);
  if (space.weekendPrice != null) parts.push(`Weekend ₹${formatInr(space.weekendPrice)}`);
  return parts.join(' · ') || `From ₹${formatInr(space.fromPrice)}`;
}

export function spaceQueryUrl(
  space: Pick<SpaceCard, 'id' | 'name' | 'spaceType' | 'weekdayPrice' | 'weekendPrice' | 'fromPrice'>,
  enquiry?: {name?: string; phone?: string; message?: string},
) {
  const text = [
    'Hi, I have a query about this space at WooWoo Art House.',
    `Name: ${space.name}`,
    `Space ID: ${space.id}`,
    space.spaceType ? `Type: ${space.spaceType}` : '',
    spacePriceLine(space),
    enquiry?.name?.trim() ? `From: ${enquiry.name.trim()}` : '',
    enquiry?.phone?.trim() ? `Phone: ${enquiry.phone.trim()}` : '',
    enquiry?.message?.trim() ? `Message: ${enquiry.message.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return `https://wa.me/${SPACE_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

export async function copySpaceLink(spaceId: string) {
  const url = spaceShareUrl(spaceId);
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

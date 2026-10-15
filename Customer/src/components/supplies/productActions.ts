import type {CustomerProduct} from '../../services/product.service';

export const SUPPLIES_WHATSAPP = '918073988123';

export function formatInr(value: number) {
  return Math.max(0, Number(value) || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });
}

export function productShareUrl(productId: string) {
  return `${window.location.origin}/supplies/product/${encodeURIComponent(productId)}`;
}

export function productQueryUrl(
  product: Pick<CustomerProduct, '_id' | 'name' | 'price'>,
  enquiry?: {name?: string; phone?: string; message?: string},
) {
  const text = [
    'Hi, I have a query about this product at WooWoo Art House.',
    `Name: ${product.name}`,
    `Product ID: ${product._id}`,
    `Price: ₹${formatInr(product.price)}`,
    enquiry?.name?.trim() ? `From: ${enquiry.name.trim()}` : '',
    enquiry?.phone?.trim() ? `Phone: ${enquiry.phone.trim()}` : '',
    enquiry?.message?.trim() ? `Message: ${enquiry.message.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return `https://wa.me/${SUPPLIES_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

export async function copyProductLink(productId: string) {
  const url = productShareUrl(productId);
  await navigator.clipboard.writeText(url);
  return url;
}

export async function openNativeShare(product: Pick<CustomerProduct, 'name'>, url: string) {
  if (!navigator.share) return 'unavailable' as const;
  try {
    await navigator.share({
      title: product.name,
      text: `${product.name} at WooWoo Art House`,
      url,
    });
    return 'shared' as const;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return 'cancelled' as const;
    return 'failed' as const;
  }
}

export function setProductPageMeta(input: {
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
    ['property', 'og:type', 'product'],
  ];
  if (input.image) tags.push(['property', 'og:image', input.image]);
  if (input.url) tags.push(['property', 'og:url', input.url]);
  const created: HTMLMetaElement[] = [];
  for (const [attr, key, content] of tags) {
    let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      el.dataset.suppliesMeta = '1';
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

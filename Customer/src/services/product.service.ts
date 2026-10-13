import {api} from './axios';
import {resolveSpaceImageUrl} from './space.service';

export type CustomerProduct = {
  _id: string;
  name: string;
  brandName: string;
  price: number;
  category: string;
  subCategory: string;
  description: string;
  discountType: string;
  discountValue: number;
  imageUrl: string | null;
  images: string[];
  createdAt?: string;
};

type ProductListResponse = {
  success: boolean;
  categories?: string[];
  products?: Array<
    Omit<CustomerProduct, 'imageUrl' | 'images'> & {
      imageUrl?: string | null;
      images?: string[] | null;
    }
  >;
};

export type CustomerProductQuery = {
  search?: string;
  category?: string;
  limit?: number;
};

export async function fetchCustomerProducts(
  query: CustomerProductQuery = {},
  signal?: AbortSignal,
): Promise<{products: CustomerProduct[]; categories: string[]}> {
  const {data} = await api.get<ProductListResponse>('/product', {
    params: {
      limit: query.limit ?? 100,
      ...(query.search?.trim() ? {search: query.search.trim()} : {}),
      ...(query.category?.trim() ? {category: query.category.trim()} : {}),
    },
    signal,
  });
  const rows = Array.isArray(data?.products) ? data.products : [];
  const categories = Array.isArray(data?.categories)
    ? data.categories.map(name => String(name || '').trim()).filter(Boolean)
    : [];
  const products = rows
    .map(row => {
      const images = (Array.isArray(row.images) ? row.images : [])
        .map(url => resolveSpaceImageUrl(url))
        .filter((url): url is string => Boolean(url));
      return {
        _id: String(row._id),
        name: String(row.name || '').trim(),
        brandName: String(row.brandName || '').trim(),
        price: Math.max(0, Number(row.price) || 0),
        category: String(row.category || '').trim(),
        subCategory: String(row.subCategory || '').trim(),
        description: String(row.description || '').trim(),
        discountType: String(row.discountType || 'flat'),
        discountValue: Math.max(0, Number(row.discountValue) || 0),
        imageUrl: resolveSpaceImageUrl(row.imageUrl) || images[0] || null,
        images,
        createdAt: row.createdAt,
      };
    })
    .filter(row => row.name);
  return {products, categories};
}

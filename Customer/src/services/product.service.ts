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
  unit: string;
  discountType: string;
  discountValue: number;
  availability: 'in_stock' | 'out_of_stock';
  imageUrl: string | null;
  images: string[];
  createdAt?: string;
};

type RawCustomerProduct = {
  _id: string;
  name?: string;
  brandName?: string;
  price?: number;
  category?: string;
  subCategory?: string;
  description?: string;
  unit?: string;
  discountType?: string;
  discountValue?: number;
  availability?: string;
  imageUrl?: string | null;
  images?: string[] | null;
  createdAt?: string;
};

type ProductListResponse = {
  success: boolean;
  categories?: string[];
  products?: RawCustomerProduct[];
};

type ProductResponse = {
  success: boolean;
  product?: RawCustomerProduct;
};

export function mapCustomerProduct(row: RawCustomerProduct): CustomerProduct | null {
  const name = String(row.name || '').trim();
  if (!name) return null;
  const images = (Array.isArray(row.images) ? row.images : [])
    .map(url => resolveSpaceImageUrl(url))
    .filter((url): url is string => Boolean(url));
  return {
    _id: String(row._id),
    name,
    brandName: String(row.brandName || '').trim(),
    price: Math.max(0, Number(row.price) || 0),
    category: String(row.category || '').trim(),
    subCategory: String(row.subCategory || '').trim(),
    description: String(row.description || '').trim(),
    unit: String(row.unit || '').trim(),
    discountType: String(row.discountType || 'flat'),
    discountValue: Math.max(0, Number(row.discountValue) || 0),
    availability: row.availability === 'out_of_stock' ? 'out_of_stock' : 'in_stock',
    imageUrl: resolveSpaceImageUrl(row.imageUrl) || images[0] || null,
    images,
    createdAt: row.createdAt,
  };
}

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
    .map(mapCustomerProduct)
    .filter((row): row is CustomerProduct => Boolean(row));
  return {products, categories};
}

export async function fetchCustomerProduct(
  id: string,
  signal?: AbortSignal,
): Promise<CustomerProduct> {
  const {data} = await api.get<ProductResponse>(`/product/${encodeURIComponent(id)}`, {
    signal,
  });
  const product = data?.product ? mapCustomerProduct(data.product) : null;
  if (!product) {
    const error = new Error('Product not found');
    throw error;
  }
  return product;
}

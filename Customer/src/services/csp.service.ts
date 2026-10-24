import {api} from './axios';

export type CspApplicationStatus = 'under_review' | 'approved' | 'rejected';

export type CspApplication = {
  _id: string;
  customerId: string;
  customerName?: string;
  email?: string;
  mobile?: string;
  brandName: string;
  categories: string[];
  prositeUrl: string;
  alreadySelling: boolean;
  sellingPlatforms: string[];
  status: CspApplicationStatus;
  rejectionReason?: string;
  createdAt?: string;
};

export type CspApplyPayload = {
  customerId: string;
  brandName: string;
  categories: string[];
  prositeUrl: string;
  alreadySelling: boolean;
  sellingPlatforms: string[];
};

const PROSITE_PATTERN =
  /^(?:https?:\/\/)?(?:www\.)?1atives\.com\/pro\/[a-z0-9][a-z0-9_-]*\/?$/i;

export function normalizePrositeUrl(raw: string) {
  const value = String(raw || '').trim().replace(/\/+$/, '');
  if (!PROSITE_PATTERN.test(value)) return null;
  return value
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}

export type CspProgramProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category?: string;
  image: string;
  offerType?: 'percent' | 'flat';
  offerValue?: number;
};

export type CspProductPayload = {
  name: string;
  price: string;
  stock: string;
  category: string;
  offerType: 'percent' | 'flat';
  offerValue: string;
};

const productForm = (payload: CspProductPayload, image?: File | null) => {
  const form = new FormData();
  form.append('name', payload.name);
  form.append('price', payload.price);
  form.append('stock', payload.stock);
  form.append('category', payload.category);
  form.append('offerType', payload.offerType);
  form.append('offerValue', payload.offerValue);
  if (image) form.append('image', image);
  return form;
};

const multipart = {
  transformRequest: [
    (data: FormData, headers?: {delete?: (name: string) => void}) => {
      headers?.delete?.('Content-Type');
      return data;
    },
  ],
};

export const cspProductApi = {
  list: () =>
    api.get<{success: boolean; message: string; data: CspProgramProduct[]}>(
      '/csp/products',
    ),
  create: (payload: CspProductPayload, image: File) =>
    api.post<{success: boolean; message: string; data: CspProgramProduct}>(
      '/csp/products',
      productForm(payload, image),
      multipart,
    ),
  update: (id: string, payload: CspProductPayload, image?: File | null) =>
    api.patch<{success: boolean; message: string; data: CspProgramProduct}>(
      `/csp/products/${id}`,
      productForm(payload, image),
      multipart,
    ),
  remove: (id: string) =>
    api.delete<{success: boolean; message: string}>(`/csp/products/${id}`),
};

export const cspApi = {
  mine: () =>
    api.get<{success: boolean; message: string; data: CspApplication | null}>(
      '/csp/application',
    ),
  apply: (payload: CspApplyPayload) =>
    api.post<{success: boolean; message: string; data: CspApplication}>(
      '/csp/apply',
      payload,
    ),
};

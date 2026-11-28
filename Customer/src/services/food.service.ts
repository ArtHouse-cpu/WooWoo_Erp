import {api} from './axios';
import {resolveSpaceImageUrl} from './space.service';

export type FoodMenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  description?: string;
  isVeg?: boolean;
};

type RawFood = {
  _id?: string;
  name?: string;
  category?: string;
  price?: number;
  description?: string;
  isVeg?: boolean;
  imageUrl?: string | null;
};

type FoodListResponse = {
  success: boolean;
  categories?: string[];
  foods?: RawFood[];
};

export function mapCustomerFood(row: RawFood): FoodMenuItem | null {
  const name = String(row.name || '').trim();
  if (!name || !row._id) return null;
  return {
    id: String(row._id),
    name,
    category: String(row.category || 'Food').trim() || 'Food',
    price: Math.max(0, Number(row.price) || 0),
    image: resolveSpaceImageUrl(row.imageUrl) || '',
    description: String(row.description || '').trim(),
    isVeg: row.isVeg !== false,
  };
}

export async function fetchCustomerFoods(signal?: AbortSignal) {
  const {data} = await api.get<FoodListResponse>('/food', {signal});
  const foods = (Array.isArray(data.foods) ? data.foods : [])
    .map(mapCustomerFood)
    .filter((item): item is FoodMenuItem => Boolean(item));
  return foods;
}

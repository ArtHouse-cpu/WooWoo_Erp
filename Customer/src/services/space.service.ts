import {api} from './axios';

const API_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
).replace(/\/$/, '');

/** Cloudinary URLs stay as-is. Relative upload paths are resolved against the API. */
export function resolveSpaceImageUrl(raw?: string | null): string | null {
  const value = String(raw || '').trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('/')) return `${API_ORIGIN}${value}`;
  return `${API_ORIGIN}/${value}`;
}

function pickSpaceImage(row: SpaceRecord): string | null {
  const fromList = Array.isArray(row.images)
    ? row.images.find(item => String(item || '').trim())
    : null;
  return resolveSpaceImageUrl(row.imageUrl || row.image || fromList || null);
}

export type SpaceRecord = {
  _id: string;
  name: string;
  spaceCode?: string;
  category?: string;
  spaceType?: string;
  day?: string;
  price?: number;
  capacity?: number;
  status?: string;
  description?: string;
  imageUrl?: string | null;
  image?: string | null;
  images?: string[] | null;
};

export type SpaceCard = {
  id: string;
  name: string;
  category: string;
  description: string;
  capacity: number;
  imageUrl: string | null;
  weekdayPrice: number | null;
  weekendPrice: number | null;
  fromPrice: number;
};

type SpaceListResponse = {
  success: boolean;
  spaces?: SpaceRecord[];
};

/** Weekday and weekend rows for the same space become one card. */
export function groupSpacesByName(rows: SpaceRecord[]): SpaceCard[] {
  const grouped = new Map<string, SpaceCard>();

  for (const row of rows) {
    const name = String(row.name || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const price = Math.max(0, Number(row.price) || 0);
    const isWeekend = String(row.day || '').toLowerCase() === 'weekend';
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, {
        id: String(row._id),
        name,
        category: String(row.category || '').trim(),
        description: String(row.description || '').trim(),
        capacity: Math.max(0, Number(row.capacity) || 0),
        imageUrl: pickSpaceImage(row),
        weekdayPrice: isWeekend ? null : price,
        weekendPrice: isWeekend ? price : null,
        fromPrice: price,
      });
      continue;
    }

    if (isWeekend) existing.weekendPrice = price;
    else existing.weekdayPrice = price;
    existing.fromPrice = Math.min(existing.fromPrice, price);
    if (!existing.imageUrl) existing.imageUrl = pickSpaceImage(row);
    if (!existing.description && row.description) {
      existing.description = String(row.description).trim();
    }
    if (!existing.capacity && row.capacity) {
      existing.capacity = Math.max(0, Number(row.capacity) || 0);
    }
  }

  return [...grouped.values()];
}

export type BusyInterval = {
  date: string;
  startTime: string;
  endTime: string;
};

type AvailabilityResponse = {
  success: boolean;
  today?: string;
  nowMinutes?: number;
  busy?: BusyInterval[];
  message?: string;
};

export async function fetchSpaceAvailability(
  spaceId: string,
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<{today: string; nowMinutes: number; busy: BusyInterval[]}> {
  const {data} = await api.get<AvailabilityResponse>('/space/availability', {
    params: {spaceId, from, to},
    signal,
  });
  return {
    today: String(data?.today || from),
    nowMinutes: Math.max(0, Number(data?.nowMinutes) || 0),
    busy: Array.isArray(data?.busy) ? data.busy : [],
  };
}

export async function fetchSpacesByType(
  spaceType: 'Exclusive' | 'Coworking',
  signal?: AbortSignal,
): Promise<SpaceRecord[]> {
  const {data} = await api.get<SpaceListResponse>('/space', {
    params: {spaceType, status: 'Available'},
    signal,
  });
  return Array.isArray(data?.spaces) ? data.spaces : [];
}

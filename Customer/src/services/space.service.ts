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
  videoUrl?: string | null;
  videos?: string[] | null;
};

export type SpaceCard = {
  id: string;
  name: string;
  category: string;
  spaceType: string;
  description: string;
  capacity: number;
  imageUrl: string | null;
  images: string[];
  videos: string[];
  weekdayPrice: number | null;
  weekendPrice: number | null;
  fromPrice: number;
};

type SpaceListResponse = {
  success: boolean;
  spaces?: SpaceRecord[];
};

function collectRowImages(row: SpaceRecord): string[] {
  const list = [
    row.imageUrl,
    row.image,
    ...(Array.isArray(row.images) ? row.images : []),
  ];
  const set = new Set<string>();
  const res: string[] = [];
  for (const item of list) {
    const resolved = resolveSpaceImageUrl(item);
    if (resolved && !set.has(resolved)) {
      set.add(resolved);
      res.push(resolved);
    }
  }
  return res;
}

function collectRowVideos(row: SpaceRecord): string[] {
  const list = [
    row.videoUrl,
    ...(Array.isArray(row.videos) ? row.videos : []),
  ];
  const set = new Set<string>();
  const res: string[] = [];
  for (const item of list) {
    const resolved = resolveSpaceImageUrl(item);
    if (resolved && !set.has(resolved)) {
      set.add(resolved);
      res.push(resolved);
    }
  }
  return res;
}

/** Weekday and weekend rows for the same space become one card. */
export function groupSpacesByName(rows: SpaceRecord[]): SpaceCard[] {
  if (!Array.isArray(rows)) return [];
  const grouped = new Map<string, SpaceCard>();

  for (const row of rows) {
    const name = String(row.name || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const price = Math.max(0, Number(row.price) || 0);
    const isWeekend = String(row.day || '').toLowerCase() === 'weekend';
    const existing = grouped.get(key);

    const rowImages = collectRowImages(row);
    const rowVideos = collectRowVideos(row);

    if (!existing) {
      grouped.set(key, {
        id: String(row._id),
        name,
        category: String(row.category || '').trim(),
        spaceType: String(row.spaceType || '').trim(),
        description: String(row.description || '').trim(),
        capacity: Math.max(0, Number(row.capacity) || 0),
        imageUrl: pickSpaceImage(row),
        images: rowImages,
        videos: rowVideos,
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
    for (const img of rowImages) {
      if (!existing.images.includes(img)) existing.images.push(img);
    }
    for (const vid of rowVideos) {
      if (!existing.videos.includes(vid)) existing.videos.push(vid);
    }
    if (!existing.description && row.description) {
      existing.description = String(row.description).trim();
    }
    if (!existing.capacity && row.capacity) {
      existing.capacity = Math.max(0, Number(row.capacity) || 0);
    }
    if (!existing.spaceType && row.spaceType) {
      existing.spaceType = String(row.spaceType).trim();
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

export async function fetchAvailableSpaces(signal?: AbortSignal): Promise<SpaceRecord[]> {
  const {data} = await api.get<SpaceListResponse>('/space', {
    params: {status: 'Available'},
    signal,
  });
  return Array.isArray(data?.spaces) ? data.spaces : [];
}

export async function fetchPublicSpace(id: string, signal?: AbortSignal): Promise<SpaceCard> {
  const {data} = await api.get<{success: boolean; space?: any}>(
    `/space/${encodeURIComponent(id)}`,
    {signal},
  );
  const space = data?.space;
  if (!space?.name) throw new Error('Space not found');
  const rawImages = Array.isArray(space.images)
    ? space.images
    : (space.imageUrl ? [space.imageUrl] : []);
  const rawVideos = Array.isArray(space.videos)
    ? space.videos
    : (space.videoUrl ? [space.videoUrl] : []);

  const images = rawImages.map(resolveSpaceImageUrl).filter(Boolean) as string[];
  const videos = rawVideos.map(resolveSpaceImageUrl).filter(Boolean) as string[];

  return {
    id: String(space.id || id),
    name: String(space.name || '').trim(),
    category: String(space.category || '').trim(),
    spaceType: String(space.spaceType || '').trim(),
    description: String(space.description || '').trim(),
    capacity: Math.max(0, Number(space.capacity) || 0),
    imageUrl: resolveSpaceImageUrl(space.imageUrl),
    images,
    videos,
    weekdayPrice: space.weekdayPrice == null ? null : Math.max(0, Number(space.weekdayPrice) || 0),
    weekendPrice: space.weekendPrice == null ? null : Math.max(0, Number(space.weekendPrice) || 0),
    fromPrice: Math.max(0, Number(space.fromPrice) || 0),
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

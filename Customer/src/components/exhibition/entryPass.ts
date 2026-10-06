export const EXHIBITION_EVENT = {
  name: 'Creative Exhibition',
  edition: '3rd Premium Edition',
  organizer: 'WOO WOO Art House',
  venue: 'WOO WOO Art House, Bhilai, Chhattisgarh',
  dateLabel: '10 & 11 Oct 2026',
  timeLabel: '10:00 AM – 9:00 PM',
  passType: 'Free Entry',
  mapUrl: 'https://maps.app.goo.gl/NmQYkYtfFn8boMEi7',
  instagramUrl: 'https://www.instagram.com/woowoo_art_house/',
  instagramHandle: '@woowoo_art_house',
} as const;

export const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'] as const;

export const INTEREST_OPTIONS = [
  'Art',
  'Fashion',
  'Craft',
  'Live Workshops',
  'Food',
  'Music & Activities',
] as const;

export const MAX_PEOPLE_PER_REQUEST = 10;

export type PassPerson = {
  fullName: string;
  phone: string;
  age: number;
  gender: (typeof GENDER_OPTIONS)[number];
  interests: (typeof INTEREST_OPTIONS)[number][];
};

export type EntryPass = PassPerson & {
  code: string;
  groupId: string;
  /** 1-based position within the group request. */
  position: number;
  groupSize: number;
  issuedAt: string;
  /** Single interest stored by passes issued before multi-select. */
  interest?: string;
};

export const passInterests = (pass: EntryPass): string[] =>
  pass.interests?.length ? pass.interests : pass.interest ? [pass.interest] : [];

/** Payload encoded in the QR code; the pass code alone identifies the entry. */
export const passQrValue = (pass: EntryPass) =>
  `WOOWOO-EXPO|${pass.code}|${pass.fullName}|${pass.position}/${pass.groupSize}`;

const STORAGE_KEY = 'woowoo_exhibition_passes';

export const loadSavedPasses = (): EntryPass[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as EntryPass[]) : [];
  } catch {
    return [];
  }
};

export const savePasses = (passes: EntryPass[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(passes));
  } catch {
    // Storage full or disabled: passes still show in the current session.
  }
};

export const EXHIBITION_EVENT = {
  name: 'Creative Exhibition',
  edition: '3rd Premium Edition',
  organizer: 'WOO WOO Art House',
  venue: 'WOO WOO Art House, Bhilai, Chhattisgarh',
  dateLabel: '10 & 11 Oct 2026',
  timeLabel: '10:00 AM – 9:00 PM',
  passType: 'Free Entry',
  codePrefix: 'WWX',
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
  interest: (typeof INTEREST_OPTIONS)[number];
};

export type EntryPass = PassPerson & {
  code: string;
  groupId: string;
  /** 1-based position within the group request. */
  position: number;
  groupSize: number;
  issuedAt: string;
};

// No 0/O/1/I/L so codes can be read aloud and typed at the gate without mistakes.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

const randomChars = (length: number) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
};

export const generatePassCode = () =>
  `${EXHIBITION_EVENT.codePrefix}-${randomChars(4)}-${randomChars(4)}`;

/** Payload encoded in the QR code; the pass code alone identifies the entry. */
export const passQrValue = (pass: EntryPass) =>
  `WOOWOO-EXPO|${pass.code}|${pass.fullName}|${pass.position}/${pass.groupSize}`;

export const createPasses = (people: PassPerson[]): EntryPass[] => {
  const used = new Set<string>();
  const groupId = randomChars(6);
  const issuedAt = new Date().toISOString();
  const primaryPhone = people[0]?.phone ?? '';

  return people.map((person, index) => {
    let code = generatePassCode();
    while (used.has(code)) code = generatePassCode();
    used.add(code);
    return {
      ...person,
      phone: person.phone || primaryPhone,
      code,
      groupId,
      position: index + 1,
      groupSize: people.length,
      issuedAt,
    };
  });
};

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

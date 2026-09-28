import type { SpaceBookingBusySlot } from "@/services/apiClient";

/** Business timezone used for "today" and past-slot checks (matches the server). */
export const BOOKING_TIMEZONE = "Asia/Kolkata";

export const BOOKING_MESSAGES = {
  ALREADY_BOOKED: "This space is already booked for the selected time.",
  PAST: "Please select a future date and time.",
  NO_LONGER_AVAILABLE: "This time slot is no longer available.",
} as const;

export type SlotAvailability = "available" | "booked" | "unavailable";

export type BusinessNow = { dateKey: string; minutes: number };

const tzFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BOOKING_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export const getBusinessNow = (date = new Date()): BusinessNow => {
  const parts: Record<string, string> = {};
  for (const p of tzFormatter.formatToParts(date)) parts[p.type] = p.value;
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
};

export const getBusinessToday = () => getBusinessNow().dateKey;

export const addDaysToKey = (key: string, days: number) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

export const timeToMinutes = (time?: string | null) => {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(time || "").trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

export const isSlotPast = (
  date: string,
  startTime: string,
  now: BusinessNow,
  fullDay = false,
) => {
  if (!date) return false;
  if (date < now.dateKey) return true;
  if (date > now.dateKey || fullDay) return false;
  const start = timeToMinutes(startTime);
  return start != null && start <= now.minutes;
};

export const findBusyOverlaps = (
  date: string,
  startTime: string,
  endTime: string,
  busy: SpaceBookingBusySlot[],
) => {
  const s = timeToMinutes(startTime);
  const e = timeToMinutes(endTime);
  if (!date || s == null || e == null) return [];
  return busy.filter((b) => {
    if (b.date !== date) return false;
    const bs = timeToMinutes(b.startTime);
    const be = timeToMinutes(b.endTime);
    return bs != null && be != null && s < be && bs < e;
  });
};

export const getSlotAvailability = (
  date: string,
  startTime: string,
  endTime: string,
  busy: SpaceBookingBusySlot[],
  now: BusinessNow,
  fullDay = false,
): SlotAvailability => {
  if (isSlotPast(date, startTime, now, fullDay)) return "unavailable";
  if (findBusyOverlaps(date, startTime, endTime, busy).length > 0) return "booked";
  return "available";
};

export const SLOT_OPTION_SUFFIX: Record<SlotAvailability, string> = {
  available: "",
  booked: " — Booked",
  unavailable: " — Unavailable",
};

/** Maps a failed booking save to the user-facing availability message, if it is one. */
export const getBookingConflictMessage = (err: unknown): string | null => {
  const data = (err as { response?: { data?: { code?: string; message?: string } } })
    ?.response?.data;
  if (data?.code === "SLOT_CONFLICT") return data.message || BOOKING_MESSAGES.NO_LONGER_AVAILABLE;
  if (data?.code === "PAST_BOOKING") return data.message || BOOKING_MESSAGES.PAST;
  return null;
};

/** Shared date-range presets for list screens (invoices, purchases, expenses, etc.). */

export type DatePreset =
  | "all"
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "lastMonth"
  | "year"
  | "lastYear"
  | "custom";

export const DATE_PRESET_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "All Dates" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "year", label: "This Year" },
  { value: "lastYear", label: "Last Year" },
  { value: "custom", label: "Custom Range" },
];

/** Compact presets for Sales / POS filter bar */
export const SALES_DATE_PRESET_OPTIONS: { value: DatePreset; label: string }[] =
  [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "lastMonth", label: "Last Month" },
    { value: "year", label: "This Year" },
    { value: "lastYear", label: "Last Year" },
    { value: "custom", label: "Custom Range" },
  ];

export function toDateYmd(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Local calendar today as YYYY-MM-DD (avoids UTC shift). */
export function getTodayYmd(): string {
  return toDateYmd(new Date());
}

export function rangeForPreset(preset: DatePreset): { from: string; to: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (preset === "today") {
    const ymd = toDateYmd(today);
    return { from: ymd, to: ymd };
  }
  if (preset === "yesterday") {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    const ymd = toDateYmd(y);
    return { from: ymd, to: ymd };
  }
  if (preset === "week") {
    const start = new Date(today);
    const day = start.getDay() || 7; // Monday start
    start.setDate(start.getDate() - (day - 1));
    return { from: toDateYmd(start), to: toDateYmd(today) };
  }
  if (preset === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toDateYmd(start), to: toDateYmd(today) };
  }
  if (preset === "lastMonth") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: toDateYmd(start), to: toDateYmd(end) };
  }
  if (preset === "year") {
    const start = new Date(today.getFullYear(), 0, 1);
    return { from: toDateYmd(start), to: toDateYmd(today) };
  }
  if (preset === "lastYear") {
    const y = today.getFullYear() - 1;
    const start = new Date(y, 0, 1);
    const end = new Date(y, 11, 31);
    return { from: toDateYmd(start), to: toDateYmd(end) };
  }
  // "all" | "custom" — caller keeps or clears inputs
  return { from: "", to: "" };
}

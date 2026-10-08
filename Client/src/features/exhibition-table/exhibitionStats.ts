import type { ExhibitionPassRecord } from "@/services/apiClient";

export type ChartSlice = { name: string; value: number; fill: string };

const PALETTE = [
  "#3b82f6", // blue
  "#ec4899", // pink
  "#a855f7", // purple
  "#94a3b8", // slate
  "#f97316", // orange
  "#10b981", // green
  "#eab308", // yellow
  "#14b8a6", // teal
];

const GENDER_ORDER = ["Male", "Female", "Other", "Prefer not to say"];

const AGE_BUCKETS = [
  { label: "Under 13", max: 12 },
  { label: "13–17", max: 17 },
  { label: "18–24", max: 24 },
  { label: "25–34", max: 34 },
  { label: "35–44", max: 44 },
  { label: "45–59", max: 59 },
  { label: "60+", max: Infinity },
];

const INTEREST_ORDER = ["Art", "Fashion", "Craft", "Live Workshops", "Food", "Music & Activities"];

const ageBucket = (age: number) =>
  AGE_BUCKETS.find((bucket) => age <= bucket.max)?.label ?? "Unknown";

const passInterests = (pass: ExhibitionPassRecord) =>
  pass.interests?.length ? pass.interests : pass.interest ? [pass.interest] : [];

const tally = (values: string[]) => {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return counts;
};

/** Colour is tied to the category's position in `order`, so it never shifts between tabs. */
const toSlices = (counts: Map<string, number>, order: string[]): ChartSlice[] => {
  const extras = [...counts.keys()].filter((key) => !order.includes(key)).sort();
  return [...order, ...extras]
    .map((name, index) => ({
      name,
      value: counts.get(name) ?? 0,
      fill: PALETTE[index % PALETTE.length],
    }))
    .filter((slice) => slice.value > 0);
};

export const buildExhibitionStats = (passes: ExhibitionPassRecord[]) => ({
  gender: toSlices(
    tally(passes.map((p) => p.gender || "Unknown")),
    GENDER_ORDER,
  ),
  age: toSlices(
    tally(passes.map((p) => (Number.isFinite(p.age) ? ageBucket(p.age) : "Unknown"))),
    AGE_BUCKETS.map((bucket) => bucket.label),
  ),
  interests: toSlices(tally(passes.flatMap(passInterests)), INTEREST_ORDER),
});
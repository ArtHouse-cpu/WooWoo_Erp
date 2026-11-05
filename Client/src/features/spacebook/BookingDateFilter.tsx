import { useState } from "react";
import { Calendar, Check, X } from "lucide-react";

export type BookingDatePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "lifetime"
  | "custom";

export const BOOKING_DATE_PRESETS: { key: BookingDatePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "this_week", label: "This Week" },
  { key: "last_week", label: "Last Week" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "this_year", label: "This Year" },
  { key: "lifetime", label: "Lifetime" },
  { key: "custom", label: "Custom Range" },
];

export function rangeForBookingPreset(preset: BookingDatePreset): { from: string; to: string } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const ymd = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  if (preset === "today") {
    const day = ymd(now);
    return { from: day, to: day };
  }
  if (preset === "yesterday") {
    const day = new Date(now);
    day.setDate(day.getDate() - 1);
    const value = ymd(day);
    return { from: value, to: value };
  }
  if (preset === "this_week" || preset === "last_week") {
    const weekday = now.getDay() || 7;
    const start = new Date(now);
    start.setDate(now.getDate() - (weekday - 1) - (preset === "last_week" ? 7 : 0));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: ymd(start), to: ymd(end) };
  }
  if (preset === "this_month") {
    return {
      from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
  }
  if (preset === "last_month") {
    return {
      from: ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: ymd(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }
  if (preset === "this_year") {
    return {
      from: ymd(new Date(now.getFullYear(), 0, 1)),
      to: ymd(new Date(now.getFullYear(), 11, 31)),
    };
  }
  return { from: "", to: "" };
}

type Props = {
  preset: BookingDatePreset;
  fromDate: string;
  toDate: string;
  onChange: (preset: BookingDatePreset, from: string, to: string) => void;
};

export default function BookingDateFilter({ preset, fromDate, toDate, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draftPreset, setDraftPreset] = useState<BookingDatePreset>(preset);
  const [draftFrom, setDraftFrom] = useState(fromDate);
  const [draftTo, setDraftTo] = useState(toDate);
  const label = BOOKING_DATE_PRESETS.find((item) => item.key === preset)?.label || "Lifetime";

  const openModal = () => {
    setDraftPreset(preset);
    setDraftFrom(fromDate);
    setDraftTo(toDate);
    setOpen(true);
  };

  const choose = (next: BookingDatePreset) => {
    setDraftPreset(next);
    if (next === "custom") return;
    const range = rangeForBookingPreset(next);
    onChange(next, range.from, range.to);
    setOpen(false);
  };

  const applyCustom = () => {
    onChange("custom", draftFrom, draftTo);
    setOpen(false);
  };

  return (
    <>
      <select
        value={preset}
        onChange={(event) => {
          const next = event.target.value as BookingDatePreset;
          const range = next === "custom" ? { from: fromDate, to: toDate } : rangeForBookingPreset(next);
          onChange(next, range.from, range.to);
        }}
        className="hidden h-9 w-36 rounded-xl border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 shadow-xs outline-none focus:border-indigo-500 md:block"
      >
        {BOOKING_DATE_PRESETS.map((item) => (
          <option key={item.key} value={item.key}>
            {item.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={openModal}
        className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-xs md:hidden"
      >
        <Calendar size={14} className="text-indigo-600" />
        <span className="max-w-[72px] truncate">{label}</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 md:hidden">
          <button type="button" className="absolute inset-0" aria-label="Close date filter" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full rounded-t-3xl bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Date filter</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1 text-slate-400" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {BOOKING_DATE_PRESETS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => choose(item.key)}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-semibold ${
                    draftPreset === item.key
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-700"
                  }`}
                >
                  {item.label}
                  {draftPreset === item.key ? <Check size={14} /> : null}
                </button>
              ))}
            </div>
            {draftPreset === "custom" ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="text-[11px] font-semibold text-slate-500">
                  From
                  <input
                    type="date"
                    value={draftFrom}
                    onChange={(event) => setDraftFrom(event.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-xs text-slate-800"
                  />
                </label>
                <label className="text-[11px] font-semibold text-slate-500">
                  To
                  <input
                    type="date"
                    value={draftTo}
                    onChange={(event) => setDraftTo(event.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-xs text-slate-800"
                  />
                </label>
                <button
                  type="button"
                  onClick={applyCustom}
                  className="col-span-2 mt-1 rounded-xl bg-indigo-600 py-2 text-xs font-semibold text-white"
                >
                  Apply range
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

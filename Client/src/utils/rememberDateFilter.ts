import { useEffect, useState } from "react";

type SavedFilter = { preset?: string; from?: string; to?: string };

function readSaved(storageKey: string): SavedFilter {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SavedFilter;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Remembers a date dropdown (and custom from/to) for one screen.
 * Named presets are recalculated on the next visit so "Yesterday" stays yesterday.
 * Custom dates are restored exactly.
 */
export function usePersistedDateFilter<T extends string>(
  key: string,
  fallback: T,
  allowed: readonly T[],
  rangeFor: (preset: T) => { from: string; to: string },
) {
  const storageKey = `wooerp-date-filter:${key}`;

  const readInitial = () => {
    const saved = readSaved(storageKey);
    const preset =
      saved.preset && (allowed as readonly string[]).includes(saved.preset)
        ? (saved.preset as T)
        : fallback;
    if (preset === "custom") {
      return {
        preset,
        from: typeof saved.from === "string" ? saved.from : "",
        to: typeof saved.to === "string" ? saved.to : "",
      };
    }
    const range = rangeFor(preset);
    return { preset, from: range.from, to: range.to };
  };

  const [datePreset, setDatePreset] = useState<T>(() => readInitial().preset);
  const [fromDate, setFromDate] = useState(() => readInitial().from);
  const [toDate, setToDate] = useState(() => readInitial().to);

  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ preset: datePreset, from: fromDate, to: toDate }),
      );
    } catch {
      console.error("Error while saving Date Filter in localStorage")
    }
  }, [storageKey, datePreset, fromDate, toDate]);

  return {
    datePreset,
    setDatePreset,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
  };
}

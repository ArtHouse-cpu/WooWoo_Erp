import { useEffect, useRef } from "react";
import Swal from "sweetalert2";

const PREFIX = "wooerp-form-draft:v1:";

type StoredDraft<T> = {
  savedAt: string;
  data: T;
};

function stripLargeStrings<T>(value: T): T {
  if (typeof value === "string") {
    return (value.length > 80_000 ? "" : value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripLargeStrings(item)) as T;
  }
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      next[key] = stripLargeStrings(item);
    }
    return next as T;
  }
  return value;
}

export function clearFormDraft(key: string) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* private mode or blocked storage */
  }
}

function writeFormDraft<T>(key: string, data: T) {
  const savedAt = new Date().toISOString();
  try {
    localStorage.setItem(
      PREFIX + key,
      JSON.stringify({ savedAt, data } satisfies StoredDraft<T>),
    );
  } catch {
    try {
      localStorage.setItem(
        PREFIX + key,
        JSON.stringify({
          savedAt,
          data: stripLargeStrings(data),
        } satisfies StoredDraft<T>),
      );
    } catch {
      /* storage full */
    }
  }
}

export function readFormDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft<T>;
    return parsed?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Keeps an in-progress create form in localStorage so a shutdown
 * or refresh can restore it. Cleared only after a successful save.
 */
export function useAutosaveFormDraft<T>(options: {
  storageKey: string;
  enabled: boolean;
  snapshot: T;
  hasContent: (data: T) => boolean;
  restore: (data: T) => void;
}) {
  const restoreRef = useRef(options.restore);
  restoreRef.current = options.restore;
  const hasContentRef = useRef(options.hasContent);
  hasContentRef.current = options.hasContent;
  const snapshotRef = useRef(options.snapshot);
  snapshotRef.current = options.snapshot;
  const readyRef = useRef(false);
  const restoredRef = useRef(false);
  const stoppedRef = useRef(false);

  useEffect(() => {
    readyRef.current = false;
    restoredRef.current = false;
    stoppedRef.current = false;
    if (!options.enabled) return;

    const saved = readFormDraft<T>(options.storageKey);
    if (saved && hasContentRef.current(saved)) {
      restoreRef.current(saved);
      restoredRef.current = true;
      void Swal.fire({
        toast: true,
        position: "top-end",
        icon: "info",
        title: "Unsaved draft restored",
        showConfirmButton: false,
        timer: 2200,
      });
    }
    readyRef.current = true;
  }, [options.enabled, options.storageKey]);

  useEffect(() => {
    if (!options.enabled) return;

    const persist = () => {
      if (!readyRef.current || stoppedRef.current) return;
      const current = snapshotRef.current;
      if (!hasContentRef.current(current)) {
        if (!restoredRef.current) clearFormDraft(options.storageKey);
        return;
      }
      restoredRef.current = false;
      writeFormDraft(options.storageKey, current);
    };

    const timer = window.setTimeout(persist, 400);
    window.addEventListener("pagehide", persist);
    window.addEventListener("beforeunload", persist);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", persist);
      window.removeEventListener("beforeunload", persist);
    };
  }, [options.enabled, options.storageKey, options.snapshot]);

  return {
    clearDraft: () => {
      stoppedRef.current = true;
      clearFormDraft(options.storageKey);
    },
  };
}

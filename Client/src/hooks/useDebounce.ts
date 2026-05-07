import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delayMs = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(t);
  }, [delayMs, value]);

  return debouncedValue;
}


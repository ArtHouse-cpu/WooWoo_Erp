import { useCallback, useEffect, useRef, useState } from "react";
import {
  handleGetSpaceBookingAvailability,
  type SpaceBookingAvailabilityResponse,
} from "@/services/apiClient";
import { getBusinessNow, type BusinessNow } from "../utils/bookingAvailability";

const CACHE_TTL_MS = 20_000;
const DEBOUNCE_MS = 250;

type Params = {
  spaceId: string;
  from: string;
  to: string;
  excludeId?: string;
  enabled: boolean;
};

type Result = {
  requestKey: string;
  data: SpaceBookingAvailabilityResponse | null;
  error: string;
};

/**
 * Fetches occupied slots for a space over a date range. Requests are debounced,
 * cancelled when inputs change, and cached briefly per (space, range, excludeId)
 * so time-slot changes are evaluated locally without extra calls.
 */
export const useSpaceAvailability = ({ spaceId, from, to, excludeId, enabled }: Params) => {
  const [result, setResult] = useState<Result | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const cacheRef = useRef(new Map<string, { at: number; data: SpaceBookingAvailabilityResponse }>());

  const rangeTo = to && to >= from ? to : from;
  const key = `${spaceId}|${from}|${rangeTo}|${excludeId || ""}`;
  const requestKey = `${key}#${reloadNonce}`;
  const active = enabled && Boolean(spaceId) && /^\d{4}-\d{2}-\d{2}$/.test(from);

  useEffect(() => {
    if (!active) {
      cacheRef.current.clear();
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const cached = cacheRef.current.get(key);
      if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
        setResult({ requestKey, data: cached.data, error: "" });
        return;
      }
      handleGetSpaceBookingAvailability(
        { spaceId, from, to: rangeTo, excludeId },
        controller.signal,
      )
        .then((res) => {
          cacheRef.current.set(key, { at: Date.now(), data: res });
          setResult({ requestKey, data: res, error: "" });
        })
        .catch((err: unknown) => {
          if ((err as { code?: string })?.code === "ERR_CANCELED") return;
          const message =
            (err as { response?: { data?: { message?: string } } })?.response?.data
              ?.message || "Could not check availability.";
          setResult({ requestKey, data: null, error: message });
        });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [active, key, requestKey, spaceId, from, rangeTo, excludeId]);

  const reload = useCallback(() => {
    cacheRef.current.delete(key);
    setReloadNonce((n) => n + 1);
  }, [key]);

  const current = active && result?.requestKey === requestKey ? result : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? "",
    loading: active && !current,
    reload,
  };
};

/** Current date/minute in the business timezone, refreshed at each minute boundary. */
export const useBusinessNow = (enabled = true): BusinessNow => {
  const [now, setNow] = useState(() => getBusinessNow());

  useEffect(() => {
    if (!enabled) return;
    let intervalId: number | undefined;
    const refreshId = window.setTimeout(() => setNow(getBusinessNow()), 0);
    const alignId = window.setTimeout(() => {
      setNow(getBusinessNow());
      intervalId = window.setInterval(() => setNow(getBusinessNow()), 60_000);
    }, 60_000 - (Date.now() % 60_000) + 50);
    return () => {
      window.clearTimeout(refreshId);
      window.clearTimeout(alignId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [enabled]);

  return now;
};

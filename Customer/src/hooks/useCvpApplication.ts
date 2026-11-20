import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import type { CvpApplication } from "../components/dashboard/CvpJoinModal";

export function useCvpApplication() {
  const customer = useAuthStore((state) => state.customer);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [application, setApplication] = useState<CvpApplication | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    try {
      const key = `cvp_application_${customer?._id || "guest"}`;
      const raw =
        localStorage.getItem(key) ||
        (customer?._id ? localStorage.getItem("cvp_application_guest") : null);
      if (raw) {
        setApplication(JSON.parse(raw));
      } else {
        setApplication(null);
      }
    } catch {
      setApplication(null);
    } finally {
      setLoaded(true);
    }
  }, [customer?._id]);

  useEffect(() => {
    refresh();
  }, [refresh, isAuthenticated]);

  return { application, loaded, refresh, setApplication };
}

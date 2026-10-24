import {useCallback, useEffect, useState} from 'react';
import {cspApi, type CspApplication} from '../services/csp.service';
import {useAuthStore} from '../store/authStore';

export function useCspApplication() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const [application, setApplication] = useState<CspApplication | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setApplication(null);
      setLoaded(true);
      return null;
    }
    try {
      const {data} = await cspApi.mine();
      const next = data.data ?? null;
      setApplication(next);
      return next;
    } catch {
      setApplication(null);
      return null;
    } finally {
      setLoaded(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {application, loaded, refresh, setApplication};
}

import {useCallback, useEffect, useState} from 'react';
import {hapApi, type HapApplication} from '../services/hap.service';
import {useAuthStore} from '../store/authStore';

export function useHapApplication() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const [application, setApplication] = useState<HapApplication | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setApplication(null);
      setLoaded(true);
      return null;
    }
    try {
      const {data} = await hapApi.mine();
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

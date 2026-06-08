import { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { isCapacitorNative } from '@/utils/platform.js';

export const useMobileAppInfo = () => {
  const [info, setInfo] = useState({
    version: null,
    build: null,
    loading: isCapacitorNative(),
  });

  useEffect(() => {
    if (!isCapacitorNative() || !App?.getInfo) {
      setInfo({ version: null, build: null, loading: false });
      return undefined;
    }
    let mounted = true;
    void App.getInfo()
      .then((payload) => {
        if (!mounted) return;
        setInfo({
          version: payload?.version || null,
          build: payload?.build != null ? String(payload.build) : null,
          loading: false,
        });
      })
      .catch(() => {
        if (mounted) setInfo({ version: null, build: null, loading: false });
      });
    return () => { mounted = false; };
  }, []);

  return info;
};

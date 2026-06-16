import { useEffect, useSyncExternalStore } from 'react';
import { isCapacitorNative } from '@/utils/platform.js';

const listeners = new Set();
let appVisible = typeof document !== 'undefined' ? document.visibilityState === 'visible' : true;

const notify = () => {
  listeners.forEach((listener) => listener());
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => appVisible;

export const isPageVisible = () => appVisible;

export const initPageVisibilityTracking = () => {
  if (typeof document === 'undefined') return undefined;

  const onVisibilityChange = () => {
    appVisible = document.visibilityState === 'visible';
    notify();
  };

  document.addEventListener('visibilitychange', onVisibilityChange);

  let capSub;
  if (isCapacitorNative()) {
    void import('@capacitor/app').then(({ App }) => {
      if (!App?.addListener) return;
      capSub = App.addListener('appStateChange', ({ isActive }) => {
        appVisible = Boolean(isActive);
        notify();
      });
    }).catch(() => {});
  }

  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    void capSub?.then?.((handle) => handle.remove());
  };
};

if (typeof document !== 'undefined') {
  initPageVisibilityTracking();
}

export const usePageVisibility = () => useSyncExternalStore(
  subscribe,
  getSnapshot,
  () => true,
);

/** Intervalle adaptatif : pause quand l’app est en arrière-plan, backoff optionnel. */
export const useVisibilityAwareInterval = (
  callback,
  {
    enabled = true,
    intervalMs = 4000,
    backoffSteps = [],
    runImmediately = true,
  } = {},
) => {
  const visible = usePageVisibility();

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    let timerId = null;
    let stepIndex = 0;

    const schedule = (delay) => {
      if (cancelled) return;
      timerId = window.setTimeout(async () => {
        if (cancelled || !isPageVisible()) {
          schedule(delay);
          return;
        }
        await callback();
        const nextDelay = backoffSteps.length
          ? backoffSteps[Math.min(stepIndex, backoffSteps.length - 1)]
          : intervalMs;
        stepIndex = Math.min(stepIndex + 1, backoffSteps.length - 1 || 0);
        schedule(nextDelay || intervalMs);
      }, delay);
    };

    if (runImmediately && isPageVisible()) {
      void callback();
    }
    schedule(backoffSteps[0] || intervalMs);

    return () => {
      cancelled = true;
      if (timerId) window.clearTimeout(timerId);
    };
  }, [enabled, intervalMs, callback, backoffSteps, runImmediately, visible]);
};

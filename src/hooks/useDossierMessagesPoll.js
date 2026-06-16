import { useCallback, useEffect, useRef, useState } from 'react';
import { isPageVisible } from '@/utils/pageVisibility.js';

export const sameDossierMessageList = (left = [], right = []) => {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index]?.id !== right[index]?.id) return false;
    if (left[index]?.updatedAt !== right[index]?.updatedAt) return false;
    if (left[index]?.emailSentAt !== right[index]?.emailSentAt) return false;
  }
  return true;
};

const MESSAGE_POLL_BACKOFF_MS = [4000, 6000, 10000, 15000];

export const useDossierMessagesPoll = (
  dossierId,
  fetchMessages,
  { enabled = true, intervalMs = 4000 } = {},
) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const fetchRef = useRef(fetchMessages);
  fetchRef.current = fetchMessages;

  const refresh = useCallback(async (silent = false) => {
    if (!dossierId || !enabled) return [];
    if (!silent) setLoading(true);
    try {
      const items = await fetchRef.current(dossierId);
      setMessages((current) => (sameDossierMessageList(current, items) ? current : items));
      return items;
    } catch (_error) {
      return [];
    } finally {
      if (!silent) setLoading(false);
    }
  }, [dossierId, enabled]);

  useEffect(() => {
    if (!enabled || !dossierId) {
      setMessages([]);
      return undefined;
    }

    let cancelled = false;
    let timerId = null;
    let backoffIndex = 0;

    const schedule = (delay) => {
      if (cancelled) return;
      timerId = window.setTimeout(async () => {
        if (cancelled) {
          schedule(delay);
          return;
        }
        if (!isPageVisible()) {
          schedule(intervalMs);
          return;
        }
        await refresh(true);
        const nextDelay = MESSAGE_POLL_BACKOFF_MS[Math.min(backoffIndex, MESSAGE_POLL_BACKOFF_MS.length - 1)] || intervalMs;
        backoffIndex = Math.min(backoffIndex + 1, MESSAGE_POLL_BACKOFF_MS.length - 1);
        schedule(nextDelay);
      }, delay);
    };

    void refresh(false);
    schedule(intervalMs);

    const onFocus = () => {
      if (isPageVisible()) void refresh(true);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      cancelled = true;
      if (timerId) window.clearTimeout(timerId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [dossierId, enabled, intervalMs, refresh]);

  return {
    messages,
    setMessages,
    loading,
    refresh,
  };
};

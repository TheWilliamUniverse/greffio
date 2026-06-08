import { useCallback, useEffect, useRef, useState } from 'react';

export const sameDossierMessageList = (left = [], right = []) => {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index]?.id !== right[index]?.id) return false;
    if (left[index]?.updatedAt !== right[index]?.updatedAt) return false;
    if (left[index]?.emailSentAt !== right[index]?.emailSentAt) return false;
  }
  return true;
};

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
      if (!silent) {
        // Conserver l'historique affiché en cas d'échec réseau ou session expirée.
      }
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
    const tick = async (silent) => {
      if (cancelled) return;
      await refresh(silent);
    };

    void tick(false);
    const timer = window.setInterval(() => {
      void tick(true);
    }, intervalMs);

    const onFocus = () => {
      void tick(true);
    };
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [dossierId, enabled, intervalMs, refresh]);

  return {
    messages,
    setMessages,
    loading,
    refresh,
  };
};

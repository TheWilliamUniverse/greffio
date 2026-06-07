import { useEffect } from 'react';
import { runtimeConfig } from '@/config/runtime.js';
import { getToken } from '@/utils/localStorage.js';
import { useDossierMessagesPoll } from '@/hooks/useDossierMessagesPoll.js';

const buildWebSocketUrl = (dossierId, token) => {
  const apiUrl = new URL(runtimeConfig.apiBaseUrl);
  const wsProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  const params = new URLSearchParams({
    token,
    dossierId,
  });
  return `${wsProtocol}//${apiUrl.host}/api/ws/dossier-messages?${params.toString()}`;
};

export const useDossierMessagesRealtime = (
  dossierId,
  fetchMessages,
  { enabled = true, intervalMs = 15000 } = {},
) => {
  const poll = useDossierMessagesPoll(dossierId, fetchMessages, { enabled, intervalMs });

  useEffect(() => {
    if (!enabled || !dossierId) return undefined;

    const token = getToken();
    if (!token) return undefined;

    let ws;
    let reconnectTimer;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      ws = new WebSocket(buildWebSocketUrl(dossierId, token));

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data || '{}'));
          if (payload.type === 'messages_updated' && payload.dossierId === dossierId) {
            void poll.refresh(true);
          }
        } catch (_error) {
          // ignore malformed payloads
        }
      };

      ws.onclose = () => {
        if (!cancelled) {
          reconnectTimer = window.setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
    };
  }, [dossierId, enabled, poll.refresh]);

  return poll;
};

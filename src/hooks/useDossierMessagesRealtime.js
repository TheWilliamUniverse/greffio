import { useCallback, useEffect, useRef, useState } from 'react';
import { runtimeConfig } from '@/config/runtime.js';
import { getToken } from '@/utils/localStorage.js';
import { useDossierMessagesPoll, sameDossierMessageList } from '@/hooks/useDossierMessagesPoll.js';

const buildWebSocketUrl = (dossierId, token) => {
  const apiUrl = new URL(runtimeConfig.apiBaseUrl);
  const wsProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  const params = new URLSearchParams({
    token,
    dossierId,
  });
  return `${wsProtocol}//${apiUrl.host}/api/ws/dossier-messages?${params.toString()}`;
};

const applyIncomingMessages = (setMessages, incoming) => {
  if (!Array.isArray(incoming)) return false;
  setMessages((current) => (sameDossierMessageList(current, incoming) ? current : incoming));
  return true;
};

export const useDossierMessagesRealtime = (
  dossierId,
  fetchMessages,
  { enabled = true, intervalMs = 4000, connectedIntervalMs = 60000 } = {},
) => {
  const [wsConnected, setWsConnected] = useState(false);
  const poll = useDossierMessagesPoll(dossierId, fetchMessages, {
    enabled,
    intervalMs: wsConnected ? connectedIntervalMs : intervalMs,
  });
  const setMessagesRef = useRef(poll.setMessages);
  setMessagesRef.current = poll.setMessages;

  const handleSocketPayload = useCallback((payload) => {
    if (!payload || payload.dossierId !== dossierId) return;
    if (payload.type === 'messages_updated') {
      if (applyIncomingMessages(setMessagesRef.current, payload.messages)) {
        return;
      }
      void poll.refresh(true);
    }
  }, [dossierId, poll.refresh]);

  useEffect(() => {
    if (!enabled || !dossierId) {
      setWsConnected(false);
      return undefined;
    }

    const token = getToken();
    if (!token) return undefined;

    let ws;
    let reconnectTimer;
    let cancelled = false;
    let reconnectDelayMs = 1000;

    const connect = () => {
      if (cancelled) return;
      ws = new WebSocket(buildWebSocketUrl(dossierId, token));

      ws.onopen = () => {
        reconnectDelayMs = 1000;
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          handleSocketPayload(JSON.parse(String(event.data || '{}')));
        } catch (_error) {
          // ignore malformed payloads
        }
      };

      ws.onerror = () => {
        setWsConnected(false);
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (!cancelled) {
          reconnectTimer = window.setTimeout(connect, reconnectDelayMs);
          reconnectDelayMs = Math.min(reconnectDelayMs * 2, 15000);
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      setWsConnected(false);
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
    };
  }, [dossierId, enabled, handleSocketPayload]);

  return {
    ...poll,
    wsConnected,
  };
};

export const sendDossierMessageOptimistic = async ({
  dossierId,
  body,
  setMessages,
  postMessage,
  authorType = 'client',
  authorName = 'Vous',
}) => {
  const tempId = `optimistic-${Date.now()}`;
  const optimistic = {
    id: tempId,
    body,
    authorType,
    authorName,
    channel: 'thread',
    createdAt: new Date().toISOString(),
    optimistic: true,
  };

  setMessages((current) => [...current, optimistic]);

  try {
    const result = await postMessage(dossierId, body);
    if (Array.isArray(result?.messages)) {
      setMessages(result.messages);
    }
    return result;
  } catch (error) {
    setMessages((current) => current.filter((item) => item.id !== tempId));
    throw error;
  }
};

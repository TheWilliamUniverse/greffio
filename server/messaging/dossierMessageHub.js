import { WebSocketServer } from 'ws';
import { isInternalRole } from '../authMiddleware.js';
import { getDossier } from '../store.js';
import { verifyToken } from '../tokens.js';

const WS_PATH = '/api/ws/dossier-messages';

const rooms = new Map();

const addClient = (dossierId, ws) => {
  const key = String(dossierId);
  if (!rooms.has(key)) rooms.set(key, new Set());
  rooms.get(key).add(ws);
  ws.dossierId = key;
};

const removeClient = (ws) => {
  const key = ws.dossierId;
  if (!key) return;
  const clients = rooms.get(key);
  if (!clients) return;
  clients.delete(ws);
  if (!clients.size) rooms.delete(key);
};

const canAccessDossier = async (auth, dossierKey) => {
  const dossier = await getDossier(dossierKey);
  if (!dossier) return { ok: false };
  const isOps = isInternalRole(auth?.role);
  const isOwner = dossier.userId && dossier.userId === auth?.sub;
  if (!isOps && !isOwner) return { ok: false };
  return { ok: true, dossier };
};

export const createDossierMessageHub = (httpServer) => {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const host = request.headers.host || 'localhost';
    const url = new URL(request.url || '/', `http://${host}`);
    if (url.pathname !== WS_PATH) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, url);
    });
  });

  wss.on('connection', async (ws, url) => {
    const token = String(url.searchParams.get('token') || '').trim();
    const dossierId = String(url.searchParams.get('dossierId') || '').trim();

    if (!token || !dossierId) {
      ws.close(4401, 'AUTH_OR_DOSSIER_MISSING');
      return;
    }

    let auth;
    try {
      auth = verifyToken(token);
      if (auth.typ === 'mfa_pending') {
        ws.close(4403, 'MFA_VERIFICATION_REQUIRED');
        return;
      }
    } catch (_error) {
      ws.close(4401, 'AUTH_TOKEN_INVALID');
      return;
    }

    const access = await canAccessDossier(auth, dossierId);
    if (!access.ok) {
      ws.close(4403, 'DOSSIER_FORBIDDEN');
      return;
    }

    addClient(access.dossier.id, ws);
    ws.send(JSON.stringify({ type: 'connected', dossierId: access.dossier.id }));

    ws.on('close', () => removeClient(ws));
    ws.on('error', () => removeClient(ws));
  });

  const notifyDossierMessagesUpdated = (dossierId, messages) => {
    const clients = rooms.get(String(dossierId));
    if (!clients?.size) return;
    const payload = JSON.stringify({
      type: 'messages_updated',
      dossierId: String(dossierId),
      messages: Array.isArray(messages) ? messages : undefined,
    });
    for (const client of clients) {
      if (client.readyState === 1) client.send(payload);
    }
  };

  return { notifyDossierMessagesUpdated };
};

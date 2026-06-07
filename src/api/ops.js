import { runtimeConfig } from '@/config/runtime.js';
import { getToken } from '@/utils/localStorage.js';

const authHeaders = () => {
  const token = getToken();
  if (!token) {
    const error = new Error('AUTH_TOKEN_MISSING');
    error.status = 401;
    throw error;
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const parseResponse = async (response) => {
  if (response.ok) return response.json();
  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }
  const error = new Error(payload?.error || 'API_ERROR');
  error.status = response.status;
  error.payload = payload;
  throw error;
};

export const getOpsCockpit = async () => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/ops/cockpit`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseResponse(response);
};

export const getOpsDossiers = async () => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/ops/dossiers`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseResponse(response);
};

export const getOpsDossiersRisk = async () => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/ops/dossiers-risk`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseResponse(response);
};

export const getOpsPayments = async () => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/ops/payments`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseResponse(response);
};

export const getOpsDossierDetail = async (dossierId) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/ops/dossiers/${dossierId}/detail`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseResponse(response);
};

export const updateOpsAssignment = async ({
  dossierId,
  assignedToUserId,
  opsQueue,
  opsPriority,
}) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/ops/dossiers/${dossierId}/assignment`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({
      assignedToUserId,
      opsQueue,
      opsPriority,
    }),
  });
  return parseResponse(response);
};

export const getOpsNotes = async (dossierId) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/ops/dossiers/${dossierId}/notes`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseResponse(response);
};

export const createOpsNote = async ({
  dossierId,
  note,
}) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/ops/dossiers/${dossierId}/notes`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ note }),
  });
  return parseResponse(response);
};

export const getOpsResourceOrders = async ({ status } = {}) => {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/ops/resource-orders?${params.toString()}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseResponse(response);
};

export const updateOpsResourceOrderStatus = async (orderId, { status, notes }) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/ops/resource-orders/${orderId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status, notes }),
  });
  return parseResponse(response);
};

export const downloadOpsDocument = async ({ dossierId, docKey, inline = true, cacheBust = false } = {}) => {
  const params = new URLSearchParams();
  if (inline) params.set('inline', '1');
  if (cacheBust) params.set('t', String(Date.now()));
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(
    `${runtimeConfig.apiBaseUrl}/api/ops/dossiers/${dossierId}/documents/${encodeURIComponent(docKey)}/download${query}`,
    {
      method: 'GET',
      headers: {
        Authorization: authHeaders().Authorization,
      },
      cache: 'no-store',
    },
  );
  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }
    const error = new Error(payload?.error || 'DOCUMENT_DOWNLOAD_FAILED');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  const contentDisposition = response.headers.get('content-disposition') || '';
  const nameMatch = contentDisposition.match(/filename="([^"]+)"/i);
  const filename = nameMatch?.[1] || `${docKey}.pdf`;
  const blob = await response.blob();
  return { filename, blob };
};

export const updateOpsDocumentStatus = async ({
  dossierId,
  docKey,
  status,
  rejectedReason,
}) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/ops/dossiers/${dossierId}/documents/${docKey}/status`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ status, rejectedReason }),
  });
  return parseResponse(response);
};

export const getOpsEmailEvents = async ({
  limit = 100,
  templateId,
  recipientEmail,
} = {}) => {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  if (templateId) params.set('templateId', String(templateId));
  if (recipientEmail) params.set('recipientEmail', String(recipientEmail));
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/ops/email-events?${params.toString()}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseResponse(response);
};

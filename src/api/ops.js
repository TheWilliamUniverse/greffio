import { apiFetch, apiDelete, apiGet, apiPatch, apiPost } from '@/api/client.js';

export const getOpsCockpit = async () => apiGet('/api/ops/cockpit');

export const getOpsTeamWorkload = async () => apiGet('/api/ops/team-workload');

export const getOpsDossiers = async () => apiGet('/api/ops/dossiers');

export const getOpsDossiersRisk = async () => apiGet('/api/ops/dossiers-risk');

export const getOpsPayments = async () => apiGet('/api/ops/payments');

export const getOpsDossierDetail = async (dossierId) => apiGet(`/api/ops/dossiers/${encodeURIComponent(dossierId)}/detail`);

export const updateOpsAssignment = async ({
  dossierId,
  assignedToUserId,
  opsQueue,
  opsPriority,
}) => apiPatch(`/api/ops/dossiers/${encodeURIComponent(dossierId)}/assignment`, {
  assignedToUserId,
  opsQueue,
  opsPriority,
});

export const getOpsNotes = async (dossierId) => apiGet(`/api/ops/dossiers/${encodeURIComponent(dossierId)}/notes`);

export const createOpsNote = async ({ dossierId, note }) => apiPost(`/api/ops/dossiers/${encodeURIComponent(dossierId)}/notes`, { note });

export const getOpsResourceOrders = async ({ status } = {}) => {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  const query = params.toString();
  return apiGet(`/api/ops/resource-orders${query ? `?${query}` : ''}`);
};

export const updateOpsResourceOrderStatus = async (orderId, { status, notes }) => apiPatch(
  `/api/ops/resource-orders/${encodeURIComponent(orderId)}`,
  { status, notes },
);

export const deleteOpsResourceOrder = async (orderId) => apiDelete(
  `/api/ops/resource-orders/${encodeURIComponent(orderId)}`,
);

export const bulkDeleteOpsResourceOrders = async (orderIds) => apiPost(
  '/api/ops/resource-orders/bulk-delete',
  { orderIds },
);

export const downloadOpsDocument = async ({ dossierId, docKey, inline = true, cacheBust = false } = {}) => {
  const params = new URLSearchParams();
  if (inline) params.set('inline', '1');
  if (cacheBust) params.set('t', String(Date.now()));
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await apiFetch(
    `/api/ops/dossiers/${encodeURIComponent(dossierId)}/documents/${encodeURIComponent(docKey)}/download${query}`,
    { parseJson: false },
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
}) => apiPost(
  `/api/ops/dossiers/${encodeURIComponent(dossierId)}/documents/${encodeURIComponent(docKey)}/status`,
  { status, rejectedReason },
);

export const deleteOpsDocument = async ({ dossierId, docKey }) => apiDelete(
  `/api/ops/dossiers/${encodeURIComponent(dossierId)}/documents/${encodeURIComponent(docKey)}`,
);

export const deleteOpsDossier = async (dossierId) => apiDelete(
  `/api/ops/dossiers/${encodeURIComponent(dossierId)}`,
);

export const getOpsEmailEvents = async ({
  limit = 100,
  templateId,
  recipientEmail,
} = {}) => {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  if (templateId) params.set('templateId', String(templateId));
  if (recipientEmail) params.set('recipientEmail', String(recipientEmail));
  return apiGet(`/api/ops/email-events?${params.toString()}`);
};

export const getOpsInvoicesPendingReview = async () => apiGet('/api/ops/invoices/pending-review');

export const sendOpsStepUpCode = async () => apiPost('/api/ops/step-up/send-code', {});

export const verifyOpsStepUp = async ({ method, code } = {}) => apiPost('/api/ops/step-up/verify', {
  method,
  code,
});

export const approveOpsInvoiceSend = async (invoiceId) => apiPost(
  `/api/ops/invoices/${encodeURIComponent(invoiceId)}/approve-send`,
);

export const getMolliePaymentStatus = async () => apiGet('/api/mollie/status');

export const getMollieConnectStatus = async () => apiGet('/api/mollie/connect/status');

export const getMollieConnectAuthorize = async () => apiGet('/api/mollie/connect/authorize');

export const downloadOpsProofsExport = async (dossierId) => {
  const response = await apiFetch(
    `/api/ops/dossiers/${encodeURIComponent(dossierId)}/proofs-export`,
    { parseJson: false },
  );
  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }
    const error = new Error(payload?.error || 'OPS_PROOFS_EXPORT_FAILED');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  const contentDisposition = response.headers.get('content-disposition') || '';
  const nameMatch = contentDisposition.match(/filename="([^"]+)"/i);
  const filename = nameMatch?.[1] || `greffio-preuves-${dossierId}.zip`;
  const blob = await response.blob();
  return { filename, blob };
};

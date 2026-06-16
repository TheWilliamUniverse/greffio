import {
  getEditableDocumentConfig,
  getSupportedEditableDocumentKeys,
  isEditableDocumentKey,
} from '../documents/editableDocumentRegistry.js';
import { isDocumentCompleteStatus } from '../domain/documentStatus.js';
import {
  canEditStatutesInOnlyOffice,
  isStatutesSignedLocked,
} from '../domain/statutesWorkflow.js';

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

export const isDocumentWorkspaceEnabled = () => toBool(
  process.env.DOCUMENT_WORKSPACE_ENABLED,
  true,
);

export const isDocumentFreeEditEnabled = () => toBool(
  process.env.DOCUMENT_FREE_EDIT_ENABLED,
  Boolean(process.env.COLLABORA_URL || process.env.ONLYOFFICE_URL),
);

export const getDocumentEditorAllowedDocKeys = () => {
  const raw = process.env.DOCUMENT_EDITOR_ALLOWED_DOC_KEYS;
  if (raw && String(raw).trim()) {
    return String(raw)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [...getSupportedEditableDocumentKeys(), 'manager_non_conviction', 'signed_statutes'];
};

export const isWorkspaceDocKeyAllowed = (docKey) => {
  if (!isDocumentWorkspaceEnabled()) return false;
  const key = String(docKey || '').trim();
  if (!key) return false;
  return getDocumentEditorAllowedDocKeys().includes(key);
};

export const isDocumentSignedLocked = (document = null) => {
  if (!document) return false;
  if (document.docKey === 'signed_statutes') {
    return isStatutesSignedLocked(document);
  }
  const metadata = document.metadata && typeof document.metadata === 'object'
    ? document.metadata
    : {};
  if (metadata.declarationStatus === 'signed') return true;
  if (metadata.signedAt) return true;
  const status = String(document.status || '').trim().toLowerCase();
  if (status === 'signed') return true;
  if (isDocumentCompleteStatus(status) && metadata.declarationStatus === 'signed') return true;
  return false;
};

export const isFreeEditDocKey = (docKey) => (
  isEditableDocumentKey(docKey) || docKey === 'signed_statutes'
);

const documentHasFile = (document = null) => Boolean(
  document?.storageUrl || document?.fileUrl || document?.filename,
);

export const isGuidedEditorSupported = (docKey) => (
  isEditableDocumentKey(docKey) || docKey === 'manager_non_conviction'
);

export const canGuidedEditDocument = (docKey, document = null) => {
  if (!isWorkspaceDocKeyAllowed(docKey)) return false;
  if (!isGuidedEditorSupported(docKey)) return false;
  if (isDocumentSignedLocked(document)) return false;
  return true;
};

export const canFreeEditDocument = (docKey, document = null) => {
  if (!isWorkspaceDocKeyAllowed(docKey)) return false;
  if (isDocumentSignedLocked(document)) return false;
  if (!isDocumentFreeEditEnabled()) return false;
  if (docKey === 'signed_statutes') {
    return documentHasFile(document) && canEditStatutesInOnlyOffice(document);
  }
  if (!canGuidedEditDocument(docKey, document)) return false;
  return isFreeEditDocKey(docKey);
};

export const buildDocumentWorkspaceCapabilities = ({ docKey, document = null }) => ({
  guidedEdit: canGuidedEditDocument(docKey, document),
  freeEdit: canFreeEditDocument(docKey, document),
  exportPdf: Boolean(document?.storageUrl || document?.fileUrl),
  sign: isDocumentSignedLocked(document),
  validate: Boolean(document?.storageUrl || document?.fileUrl) && !isDocumentSignedLocked(document),
  reject: false,
});

export const getDocumentEditorSessionTtlMinutes = () => {
  const parsed = Number.parseInt(process.env.DOCUMENT_EDITOR_SESSION_TTL_MINUTES || '30', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
};

export const getDocumentEditorMobileMode = () => (
  process.env.DOCUMENT_EDITOR_MOBILE_MODE || 'guided_only'
);

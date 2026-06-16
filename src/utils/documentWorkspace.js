const toBool = (value, fallback = true) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string' || !value.trim()) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export const DOCUMENT_WORKSPACE_EDITABLE_KEYS = Object.freeze([
  'formality_powers',
  'subscribers_list',
  'manager_non_conviction',
]);

export const isDocumentWorkspaceEnabled = () => toBool(
  import.meta.env.VITE_DOCUMENT_WORKSPACE_ENABLED,
  true,
);

export const resolveDocumentWorkspaceEditPath = (dossierId, docKey) => (
  `/dossier/${encodeURIComponent(dossierId)}/documents/${encodeURIComponent(docKey)}/edit`
);

export const resolveLegacyEditorPath = (dossierId, docKey) => {
  const routes = {
    formality_powers: `/dossier/${dossierId}/pouvoirs-formalites`,
    subscribers_list: `/dossier/${dossierId}/liste-souscripteurs`,
    manager_non_conviction: `/dossier/${dossierId}/declaration-non-condamnation`,
  };
  return routes[docKey] || null;
};

export const isWorkspaceEditableDocKey = (docKey) => (
  DOCUMENT_WORKSPACE_EDITABLE_KEYS.includes(String(docKey || ''))
);

export const isDocumentSignedLockedClient = (document = null) => {
  if (!document) return false;
  const metadata = document.metadata && typeof document.metadata === 'object'
    ? document.metadata
    : {};
  if (metadata.declarationStatus === 'signed') return true;
  if (metadata.signedAt) return true;
  const status = String(document.status || '').trim().toUpperCase();
  if (status === 'SIGNED') return true;
  return false;
};

export const canShowDocumentModifyAction = ({ docKey, document = null } = {}) => {
  if (!isDocumentWorkspaceEnabled()) return false;
  if (!isWorkspaceEditableDocKey(docKey)) return false;
  if (isDocumentSignedLockedClient(document)) return false;
  return true;
};

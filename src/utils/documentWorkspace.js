const toBool = (value, fallback = true) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string' || !value.trim()) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export const DOCUMENT_WORKSPACE_EDITABLE_KEYS = Object.freeze([
  'formality_powers',
  'subscribers_list',
  'manager_non_conviction',
  'signed_statutes',
]);

export const DOCUMENT_WORKSPACE_VIEWABLE_KEYS = Object.freeze([
  ...DOCUMENT_WORKSPACE_EDITABLE_KEYS,
  'identity_proof',
  'address_proof',
  'proxy_mandate',
  'legal_notice_certificate',
  'registered_office_proof',
  'ubo_declaration',
  'capital_certificate',
  'regulated_activity_proof',
  'minor_emancipation_order',
  'minor_parental_authorization',
]);

export const isDocumentWorkspaceEnabled = () => toBool(
  import.meta.env.VITE_DOCUMENT_WORKSPACE_ENABLED,
  true,
);

export const resolveDocumentWorkspaceEditPath = (dossierId, docKey) => (
  `/dossier/${encodeURIComponent(dossierId)}/documents/${encodeURIComponent(docKey)}/edit`
);

export const resolveDocumentViewerPath = (dossierId, docKey, { mode = 'view' } = {}) => {
  const base = `/dossier/${encodeURIComponent(dossierId)}/documents/${encodeURIComponent(docKey)}/view`;
  if (mode === 'edit') return `${base}?mode=edit`;
  return base;
};

export const resolveLegacyEditorPath = (dossierId, docKey) => {
  const routes = {
    formality_powers: `/dossier/${dossierId}/pouvoirs-formalites`,
    subscribers_list: `/dossier/${dossierId}/liste-souscripteurs`,
    manager_non_conviction: `/dossier/${dossierId}/declaration-non-condamnation`,
    signed_statutes: resolveDocumentViewerPath(dossierId, docKey, { mode: 'edit' }),
  };
  return routes[docKey] || null;
};

export const isWorkspaceEditableDocKey = (docKey) => (
  DOCUMENT_WORKSPACE_EDITABLE_KEYS.includes(String(docKey || ''))
);

export const canOpenDocumentViewerTab = (docKey, document = null) => {
  const key = String(docKey || '');
  if (!key) return false;
  if (!DOCUMENT_WORKSPACE_VIEWABLE_KEYS.includes(key)) {
    return Boolean(document?.filename || document?.storageUrl || document?.fileUrl);
  }
  return Boolean(document?.filename || document?.storageUrl || document?.fileUrl);
};

export const isDocumentSignedLockedClient = (document = null) => {
  if (!document) return false;
  const metadata = document.metadata && typeof document.metadata === 'object'
    ? document.metadata
    : {};
  if (metadata.statutesWorkflowStatus === 'signed') return true;
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
  if (docKey === 'signed_statutes') {
    const workflow = String(document?.metadata?.statutesWorkflowStatus || '').toLowerCase();
    return workflow !== 'signed';
  }
  return true;
};

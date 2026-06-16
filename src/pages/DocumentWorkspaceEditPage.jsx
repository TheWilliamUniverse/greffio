import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import {
  isDocumentWorkspaceEnabled,
  isWorkspaceEditableDocKey,
  resolveLegacyEditorPath,
} from '@/utils/documentWorkspace.js';
import { DocumentEditorLoadGate } from '@/components/documents/DocumentEditorLoadGate.jsx';

export const DocumentWorkspaceEditPage = () => {
  const { dossierId, docKey } = useParams();

  if (!dossierId || !docKey) {
    return (
      <DocumentEditorLoadGate
        status="error"
        errorMessage="Lien d’édition invalide."
      />
    );
  }

  if (!isDocumentWorkspaceEnabled() || !isWorkspaceEditableDocKey(docKey)) {
    return (
      <DocumentEditorLoadGate
        status="error"
        errorMessage="L’édition en ligne n’est pas disponible pour ce document."
      />
    );
  }

  const legacyPath = resolveLegacyEditorPath(dossierId, docKey);
  if (!legacyPath) {
    return (
      <DocumentEditorLoadGate
        status="error"
        errorMessage="Aucun éditeur disponible pour ce document."
      />
    );
  }

  return <Navigate to={legacyPath} replace />;
};

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar.jsx';
import { PageHeader } from '@/components/patterns/PageHeader.jsx';
import { DocumentUploadDropzone } from './DocumentUploadDropzone.jsx';
import { DocumentAnalysisProgress } from './DocumentAnalysisProgress.jsx';
import { DocumentCompletionResult } from './DocumentCompletionResult.jsx';
import { DocumentCompletionDossierBanner } from './DocumentCompletionDossierBanner.jsx';
import { useDocumentUpload } from '../hooks/useDocumentUpload.js';
import { useDocumentAnalysisStatus } from '../hooks/useDocumentAnalysisStatus.js';
import { useDocumentCompletionDossierContext } from '../hooks/useDocumentCompletionDossierContext.js';
import { useDocumentCompletionDossierActions } from '../hooks/useDocumentCompletionDossierActions.js';
import { TERMINAL_STATUSES } from '../config.js';

export const DocumentCompletionPage = () => {
  const [documentId, setDocumentId] = useState('');
  const { dossierId, dossier, loading: dossierLoading, error: dossierError } = useDocumentCompletionDossierContext();
  const { upload, uploading, error: uploadError, setError: setUploadError } = useDocumentUpload();
  const {
    document,
    fields,
    isProcessing,
    error: statusError,
  } = useDocumentAnalysisStatus(documentId);
  const {
    handleDownload,
    handleAttachToDossier,
    downloading,
    attaching,
    downloadError,
    attachError,
    exportDone,
    attached,
  } = useDocumentCompletionDossierActions(dossierId);

  const handleUpload = async (file) => {
    setUploadError('');
    const result = await upload(file);
    if (result?.documentId) setDocumentId(result.documentId);
  };

  const generatedFileName = document?.generatedFile?.name
    || `${document?.originalFile?.name?.replace(/\.pdf$/i, '') || 'document'}-greffio-completion.pdf`;

  const onDownload = async () => {
    if (!documentId || !document) return;
    await handleDownload({ documentId, fileName: generatedFileName });
  };

  const onAttachToDossier = async () => {
    if (!documentId || !document || !dossierId) return;
    await handleAttachToDossier({ documentId, fileName: generatedFileName });
  };

  const showResult = document && TERMINAL_STATUSES.has(document.status);
  const showProgress = documentId && (!document || isProcessing);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-5 md:p-8">
        <PageHeader
          eyebrow="Outils documents"
          title="Assistant de complétion documentaire"
          subtitle="Importez un Cerfa, un formulaire administratif ou tout PDF à compléter. Greffio génère une version avec des champs bleus remplissables."
        />

        <div className="mx-auto mt-6 max-w-5xl space-y-6">
          <DocumentCompletionDossierBanner
            dossierId={dossierId}
            dossier={dossier}
            loading={dossierLoading}
            error={dossierError}
          />

          {!documentId ? (
            <DocumentUploadDropzone
              onFileSelected={handleUpload}
              uploading={uploading}
              error={uploadError}
            />
          ) : null}

          {showProgress ? (
            <DocumentAnalysisProgress status={document?.status || 'processing'} />
          ) : null}

          {showResult ? (
            <DocumentCompletionResult
              document={document}
              fields={fields}
              downloading={downloading}
              onDownload={onDownload}
              dossierId={dossierId}
              exportDone={exportDone}
              attached={attached}
              attaching={attaching}
              attachError={attachError}
              onAttachToDossier={dossierId ? onAttachToDossier : undefined}
            />
          ) : null}

          {(statusError || downloadError) ? (
            <p className="text-sm text-destructive">{statusError || downloadError}</p>
          ) : null}

          {documentId ? (
            <button
              type="button"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => setDocumentId('')}
            >
              Importer un autre document
            </button>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default DocumentCompletionPage;

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar.jsx';
import { PageHeader } from '@/components/patterns/PageHeader.jsx';
import { DocumentUploadDropzone } from './DocumentUploadDropzone.jsx';
import { DocumentAnalysisProgress } from './DocumentAnalysisProgress.jsx';
import { DocumentCompletionResult } from './DocumentCompletionResult.jsx';
import { useDocumentUpload } from '../hooks/useDocumentUpload.js';
import { useDocumentAnalysisStatus } from '../hooks/useDocumentAnalysisStatus.js';
import { useDocumentCompletionDownload } from '../hooks/useDocumentCompletionDownload.js';
import { TERMINAL_STATUSES } from '../config.js';

export const DocumentCompletionPage = () => {
  const [documentId, setDocumentId] = useState('');
  const { upload, uploading, error: uploadError, setError: setUploadError } = useDocumentUpload();
  const {
    document,
    fields,
    isProcessing,
    error: statusError,
  } = useDocumentAnalysisStatus(documentId);
  const { download, downloading, error: downloadError } = useDocumentCompletionDownload();

  const handleUpload = async (file) => {
    setUploadError('');
    const result = await upload(file);
    if (result?.documentId) setDocumentId(result.documentId);
  };

  const handleDownload = async () => {
    if (!documentId || !document) return;
    await download({
      documentId,
      fileName: document.generatedFile?.name,
      ensureExport: true,
    });
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
              onDownload={handleDownload}
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

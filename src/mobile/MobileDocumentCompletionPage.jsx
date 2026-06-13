import React, { useState } from 'react';
import { FileInput } from 'lucide-react';
import { MobileAnimatedSection } from '@/mobile/ui/MobileAnimatedSection.jsx';
import { MobilePageContainer } from '@/mobile/ui/MobilePageContainer.jsx';
import { DocumentUploadDropzone } from '@/features/document-completion/components/DocumentUploadDropzone.jsx';
import { DocumentAnalysisProgress } from '@/features/document-completion/components/DocumentAnalysisProgress.jsx';
import { DocumentCompletionResult } from '@/features/document-completion/components/DocumentCompletionResult.jsx';
import { DocumentCompletionDossierBanner } from '@/features/document-completion/components/DocumentCompletionDossierBanner.jsx';
import { useDocumentUpload } from '@/features/document-completion/hooks/useDocumentUpload.js';
import { useDocumentAnalysisStatus } from '@/features/document-completion/hooks/useDocumentAnalysisStatus.js';
import { useDocumentCompletionDossierContext } from '@/features/document-completion/hooks/useDocumentCompletionDossierContext.js';
import { useDocumentCompletionDossierActions } from '@/features/document-completion/hooks/useDocumentCompletionDossierActions.js';
import { TERMINAL_STATUSES } from '@/features/document-completion/config.js';

export const MobileDocumentCompletionPage = () => {
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
    <MobilePageContainer>
      <MobileAnimatedSection delay={0}>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileInput className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary/80">Outils documents</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))]">
              Compléter un PDF
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Importez un Cerfa ou formulaire administratif. Greffio génère une version avec des champs bleus remplissables.
            </p>
          </div>
        </div>
      </MobileAnimatedSection>

      <div className="mt-6 space-y-5">
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
    </MobilePageContainer>
  );
};

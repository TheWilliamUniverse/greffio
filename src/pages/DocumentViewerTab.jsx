import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, PencilLine } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { PdfPreviewPanel } from '@/components/documents/PdfPreviewPanel.jsx';
import { OnlyOfficeEditor } from '@/components/documents/OnlyOfficeEditor.jsx';
import { StatutesWorkflowBadge } from '@/components/documents/StatutesWorkflowBadge.jsx';
import { downloadDossierDocument } from '@/api/documents.js';
import {
  createFreeEditSession,
  getDocumentWorkspace,
  submitStatutesWorkflowAction,
} from '@/api/documentWorkspace.js';
import {
  isDocumentWorkspaceEnabled,
  resolveDocumentViewerPath,
} from '@/utils/documentWorkspace.js';
import { mapDocumentPreviewError } from '@/utils/dossierDocumentFile.js';
import { getDocumentTypeLabel } from '@/utils/documentStatusLabels.js';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';

export const DocumentViewerTab = () => {
  const { dossierId, docKey } = useParams();
  const [searchParams] = useSearchParams();
  const mode = String(searchParams.get('mode') || 'view');
  const isMobileLayout = isCapacitorNative() || isMobileBrowserViewport();
  const isEditMode = mode === 'edit';
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workspaceWarning, setWorkspaceWarning] = useState('');
  const [preview, setPreview] = useState(null);
  const [editorPayload, setEditorPayload] = useState(null);
  const [editorLoading, setEditorLoading] = useState(false);
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [workflowMessage, setWorkflowMessage] = useState('');

  const title = useMemo(
    () => getDocumentTypeLabel(docKey, workspace?.title || docKey),
    [docKey, workspace?.title],
  );

  const loadPreview = useCallback(async () => {
    if (!dossierId || !docKey) return;
    const { filename, blob } = await downloadDossierDocument({
      dossierId,
      docKey,
      inline: true,
      cacheBust: true,
    });
    setPreview((current) => {
      if (current?.blobUrl) URL.revokeObjectURL(current.blobUrl);
      return {
        filename,
        blobUrl: URL.createObjectURL(blob),
      };
    });
  }, [dossierId, docKey]);

  const loadDocument = useCallback(async () => {
    if (!dossierId || !docKey) return;
    setLoading(true);
    setError('');
    setWorkspaceWarning('');
    let previewLoaded = false;

    const previewTask = loadPreview()
      .then(() => {
        previewLoaded = true;
      })
      .catch((previewError) => {
        setError(mapDocumentPreviewError(previewError));
      });

    const workspaceTask = getDocumentWorkspace(dossierId, docKey)
      .then((payload) => {
        setWorkspace(payload);
      })
      .catch((workspaceError) => {
        setWorkspaceWarning(mapDocumentPreviewError(workspaceError));
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn('[DocumentViewerTab] workspace metadata unavailable', {
            dossierId,
            docKey,
            code: workspaceError?.code || workspaceError?.message,
          });
        }
      });

    await Promise.allSettled([previewTask, workspaceTask]);

    if (!previewLoaded) {
      setError((current) => current || 'Impossible d’afficher ce document pour le moment.');
    }
    setLoading(false);
  }, [dossierId, docKey, loadPreview]);

  const openEditor = useCallback(async () => {
    if (!dossierId || !docKey) return;
    setEditorLoading(true);
    setWorkflowMessage('');
    setEditorPayload(null);
    try {
      const session = await createFreeEditSession(dossierId, docKey, {
        provider: 'onlyoffice',
        preferFreeEdit: true,
      });
      if (!session?.ok) {
        setWorkflowMessage(session?.message || 'L’éditeur ONLYOFFICE n’est pas configuré. L’aperçu reste disponible.');
        return;
      }
      setEditorPayload(session);
    } catch (sessionError) {
      const payload = sessionError?.payload;
      setWorkflowMessage(
        payload?.message
        || 'L’éditeur ONLYOFFICE n’est pas disponible. Consultez l’aperçu PDF ci-dessous.',
      );
    } finally {
      setEditorLoading(false);
    }
  }, [dossierId, docKey]);

  useEffect(() => {
    void loadDocument();
  }, [loadDocument]);

  useEffect(() => {
    if (isEditMode && workspace?.capabilities?.freeEdit && !editorPayload && !editorLoading) {
      void openEditor();
    }
  }, [isEditMode, workspace, editorPayload, editorLoading, openEditor]);

  useEffect(() => () => {
    if (preview?.blobUrl) URL.revokeObjectURL(preview.blobUrl);
  }, [preview?.blobUrl]);

  const handleDownload = async () => {
    if (!dossierId || !docKey) return;
    const { filename, blob } = await downloadDossierDocument({ dossierId, docKey });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleWorkflowAction = async (action) => {
    if (!dossierId) return;
    setWorkflowBusy(true);
    setWorkflowMessage('');
    try {
      const result = await submitStatutesWorkflowAction(dossierId, action);
      setWorkflowMessage(`Statut mis à jour : ${result.label || result.statutesWorkflowStatus}.`);
      await loadDocument();
    } catch (workflowError) {
      setWorkflowMessage(workflowError?.message || 'Action impossible pour le moment.');
    } finally {
      setWorkflowBusy(false);
    }
  };

  if (!isDocumentWorkspaceEnabled()) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-sm text-muted-foreground">L’espace document n’est pas activé.</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto flex max-w-6xl items-center justify-center px-4 py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (error && !preview?.blobUrl && !editorPayload?.ok) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-sm text-destructive">{error}</p>
      </main>
    );
  }

  const statutesWorkflow = workspace?.statutesWorkflow;
  const canEdit = workspace?.capabilities?.freeEdit && !workspace?.signedLocked;
  const showClientReviewCta = docKey === 'signed_statutes'
    && statutesWorkflow?.status === 'pending_client_review';
  const showOpsValidateCta = docKey === 'signed_statutes'
    && statutesWorkflow?.status === 'pending_ops_review';
  const showEditor = Boolean(editorPayload?.ok && editorPayload?.config);
  const hidePdfPreview = showEditor && isEditMode;

  return (
    <main
      className={
        isMobileLayout
          ? 'flex min-h-[100dvh] flex-col bg-[#f8fafc]'
          : 'mx-auto max-w-6xl space-y-4 px-4 py-6'
      }
    >
      <section
        className={
          isMobileLayout
            ? 'border-b border-border bg-white px-4 py-4 shadow-elevation-sm'
            : 'rounded-md border border-border bg-white p-4 shadow-elevation-sm'
        }
      >
        <div className={`flex ${isMobileLayout ? 'flex-col' : 'flex-wrap items-start justify-between'} gap-3`}>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Document</p>
            <h1 className="mt-1 text-xl font-extrabold text-foreground">{title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {showEditor
                ? 'Édition ONLYOFFICE intégrée. Vos modifications sont enregistrées dans le dossier.'
                : 'Aperçu complet dans cet onglet. Les modifications ONLYOFFICE sont enregistrées dans le dossier.'}
            </p>
          </div>
          <div className={`flex flex-wrap items-center gap-2 ${isMobileLayout ? 'w-full' : ''}`}>
            {statutesWorkflow ? (
              <StatutesWorkflowBadge
                status={statutesWorkflow.status}
                label={statutesWorkflow.label}
              />
            ) : null}
            {canEdit ? (
              <Button
                type="button"
                size={isMobileLayout ? 'default' : 'sm'}
                className={isMobileLayout ? 'flex-1' : ''}
                onClick={() => void openEditor()}
                disabled={editorLoading || showEditor}
              >
                {editorLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PencilLine className="h-4 w-4" />}
                Modifier
              </Button>
            ) : null}
            <Button
              type="button"
              size={isMobileLayout ? 'default' : 'sm'}
              variant="outline"
              className={`bg-white ${isMobileLayout ? 'flex-1' : ''}`}
              onClick={() => void handleDownload()}
            >
              <Download className="h-4 w-4" />
              Télécharger
            </Button>
            <Button
              asChild
              variant="outline"
              size={isMobileLayout ? 'default' : 'sm'}
              className={`bg-white ${isMobileLayout ? 'w-full' : ''}`}
            >
              <Link to={`/documents?dossierId=${encodeURIComponent(dossierId)}`}>
                <ArrowLeft className="h-4 w-4" />
                Documents
              </Link>
            </Button>
          </div>
        </div>

        {workspaceWarning ? (
          <p className="mt-3 text-sm text-amber-700">{workspaceWarning}</p>
        ) : null}

        {workflowMessage ? (
          <p className="mt-3 text-sm text-muted-foreground">{workflowMessage}</p>
        ) : null}

        {showClientReviewCta ? (
          <div className={`mt-4 flex flex-wrap gap-2 ${isMobileLayout ? 'flex-col' : ''}`}>
            <Button
              type="button"
              size={isMobileLayout ? 'default' : 'sm'}
              className={isMobileLayout ? 'w-full' : ''}
              disabled={workflowBusy}
              onClick={() => void handleWorkflowAction('submit_client_review')}
            >
              Confirmer ma relecture
            </Button>
          </div>
        ) : null}

        {showOpsValidateCta ? (
          <div className={`mt-4 flex flex-wrap gap-2 ${isMobileLayout ? 'flex-col sm:flex-row' : ''}`}>
            <Button
              type="button"
              size={isMobileLayout ? 'default' : 'sm'}
              className={isMobileLayout ? 'w-full sm:w-auto' : ''}
              disabled={workflowBusy}
              onClick={() => void handleWorkflowAction('validate')}
            >
              Valider les statuts
            </Button>
            <Button
              type="button"
              size={isMobileLayout ? 'default' : 'sm'}
              variant="outline"
              className={`bg-white ${isMobileLayout ? 'w-full sm:w-auto' : ''}`}
              disabled={workflowBusy}
              onClick={() => void handleWorkflowAction('reject')}
            >
              Renvoyer au client
            </Button>
          </div>
        ) : null}
      </section>

      {showEditor ? (
        <section className={isMobileLayout ? 'flex min-h-0 flex-1 flex-col px-0 py-0' : ''}>
          <OnlyOfficeEditor
            documentServerUrl={editorPayload.documentServerUrl}
            config={editorPayload.config}
            fullViewport={isMobileLayout || isEditMode}
            onRetry={() => void openEditor()}
          />
        </section>
      ) : null}

      {!hidePdfPreview && preview?.blobUrl ? (
        <section
          className={
            isMobileLayout
              ? 'mx-4 mb-4 overflow-hidden rounded-md border border-border bg-white shadow-elevation-sm'
              : 'overflow-hidden rounded-md border border-border bg-white shadow-elevation-sm'
          }
        >
          <div className="border-b border-border px-5 py-3">
            <p className="text-sm font-bold text-foreground">Aperçu PDF</p>
          </div>
          <PdfPreviewPanel
            title={title}
            blobUrl={preview.blobUrl}
            filename={preview.filename}
          />
        </section>
      ) : null}
    </main>
  );
};

export const openDocumentViewerTab = ({ dossierId, docKey, mode = 'view' } = {}) => {
  if (!dossierId || !docKey || typeof window === 'undefined') return null;
  const path = resolveDocumentViewerPath(dossierId, docKey, { mode });
  return window.open(path, '_blank', 'noopener,noreferrer');
};

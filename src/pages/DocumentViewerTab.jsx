import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  PencilLine,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { PdfPreviewPanel } from '@/components/documents/PdfPreviewPanel.jsx';
import { OnlyOfficeEditor, preloadOnlyOfficeAssets } from '@/components/documents/OnlyOfficeEditor.jsx';
import { StatutesWorkflowBadge } from '@/components/documents/StatutesWorkflowBadge.jsx';
import { downloadDossierDocument } from '@/api/documents.js';
import {
  createFreeEditSession,
  downloadDocumentSourceFile,
  getDocumentWorkspace,
  getFreeEditSessionStatus,
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
  const [editorUnavailable, setEditorUnavailable] = useState('');
  const [docxDownloadBusy, setDocxDownloadBusy] = useState(false);
  const [previewRefreshing, setPreviewRefreshing] = useState(false);
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [workflowMessage, setWorkflowMessage] = useState('');
  const [workflowMessageTone, setWorkflowMessageTone] = useState('neutral');
  const [mobileTab, setMobileTab] = useState('preview');
  const [expandedPanel, setExpandedPanel] = useState(null);
  const editorResizeTimerRef = useRef(null);

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
    setWorkflowMessageTone('neutral');
    setEditorPayload(null);
    setEditorUnavailable('');
    try {
      const session = await createFreeEditSession(dossierId, docKey, {
        provider: 'onlyoffice',
        preferFreeEdit: true,
        presentation: isMobileLayout ? 'mobile' : 'desktop',
      });
      if (!session?.ok) {
        setEditorUnavailable(session?.message || 'L’éditeur ONLYOFFICE n’est pas configuré. L’aperçu reste disponible.');
        setWorkflowMessageTone('warning');
        setWorkflowMessage(session?.message || 'L’éditeur ONLYOFFICE n’est pas configuré. L’aperçu reste disponible.');
        return;
      }
      if (session.documentServerUrl) {
        preloadOnlyOfficeAssets(session.documentServerUrl);
      }
      setEditorPayload(session);
    } catch (sessionError) {
      const payload = sessionError?.payload;
      const message = payload?.message
        || 'L’éditeur ONLYOFFICE n’est pas disponible. Consultez l’aperçu PDF ci-dessous.';
      setEditorUnavailable(message);
      setWorkflowMessageTone('warning');
      setWorkflowMessage(message);
    } finally {
      setEditorLoading(false);
    }
  }, [dossierId, docKey, isMobileLayout]);

  const handleDownloadDocxSource = useCallback(async () => {
    if (!dossierId || !docKey || docxDownloadBusy) return;
    setDocxDownloadBusy(true);
    try {
      const { filename, blob } = await downloadDocumentSourceFile({ dossierId, docKey, format: 'docx' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      setWorkflowMessageTone('success');
      setWorkflowMessage('Fichier Word téléchargé. Ouvrez-le dans Word ou LibreOffice pour modifier le document.');
    } catch (_error) {
      setWorkflowMessageTone('warning');
      setWorkflowMessage('Impossible de télécharger la version Word pour le moment.');
    } finally {
      setDocxDownloadBusy(false);
    }
  }, [dossierId, docKey, docxDownloadBusy]);

  const handleEditorUnavailable = useCallback((message) => {
    const clean = String(message || '').trim();
    if (!clean) return;
    setEditorUnavailable(clean);
    setWorkflowMessageTone('warning');
    setWorkflowMessage(clean);
    setEditorPayload(null);
  }, []);

  const waitForSessionPdfUpdate = useCallback(async (sessionId, previousPdfUpdatedAt = null) => {
    if (!sessionId) return false;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((resolve) => {
        setTimeout(resolve, attempt === 0 ? 800 : 1000);
      });
      try {
        const status = await getFreeEditSessionStatus(dossierId, docKey, sessionId);
        if (status?.status === 'saved') {
          if (!previousPdfUpdatedAt || status.pdfUpdatedAt !== previousPdfUpdatedAt) {
            return true;
          }
          if (status.pdfUpdatedAt) return true;
        }
      } catch (_error) {
        // keep polling until timeout
      }
    }
    return false;
  }, [dossierId, docKey]);

  const handleEditorSaved = useCallback(async () => {
    const sessionId = editorPayload?.sessionId;
    if (!sessionId || previewRefreshing) return;

    setPreviewRefreshing(true);
    setWorkflowMessage('');
    setWorkflowMessageTone('neutral');
    const previousPdfUpdatedAt = editorPayload?.pdfUpdatedAt || null;

    try {
      await waitForSessionPdfUpdate(sessionId, previousPdfUpdatedAt);
      await loadPreview();
      const nextWorkspace = await getDocumentWorkspace(dossierId, docKey).catch(() => null);
      if (nextWorkspace) {
        setWorkspace(nextWorkspace);
      }
      const nextStatus = await getFreeEditSessionStatus(dossierId, docKey, sessionId).catch(() => null);
      if (nextStatus?.pdfUpdatedAt) {
        setEditorPayload((current) => (
          current ? { ...current, pdfUpdatedAt: nextStatus.pdfUpdatedAt } : current
        ));
      }
      setWorkflowMessageTone('success');
      setWorkflowMessage('PDF mis à jour avec vos modifications.');
    } catch (_error) {
      setWorkflowMessageTone('warning');
      setWorkflowMessage('Enregistrement reçu. Actualisez l’aperçu si le PDF ne se met pas à jour.');
    } finally {
      setPreviewRefreshing(false);
    }
  }, [
    editorPayload?.sessionId,
    editorPayload?.pdfUpdatedAt,
    previewRefreshing,
    waitForSessionPdfUpdate,
    loadPreview,
    dossierId,
    docKey,
  ]);

  useEffect(() => () => {
    if (editorResizeTimerRef.current) {
      clearTimeout(editorResizeTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!expandedPanel) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setExpandedPanel(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [expandedPanel]);

  const toggleExpandedPanel = useCallback((panel) => {
    setExpandedPanel((current) => (current === panel ? null : panel));
    if (editorResizeTimerRef.current) {
      clearTimeout(editorResizeTimerRef.current);
    }
    editorResizeTimerRef.current = window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 120);
  }, []);

  useEffect(() => {
    if (isEditMode && workspace?.capabilities?.freeEdit && !editorPayload && !editorLoading) {
      void openEditor();
    }
  }, [isEditMode, workspace, editorPayload, editorLoading, openEditor]);

  useEffect(() => {
    void loadDocument();
  }, [loadDocument]);

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
    setWorkflowMessageTone('neutral');
    try {
      const result = await submitStatutesWorkflowAction(dossierId, action);
      setWorkflowMessageTone('success');
      setWorkflowMessage(`Statut mis à jour : ${result.label || result.statutesWorkflowStatus}.`);
      await loadDocument();
    } catch (workflowError) {
      setWorkflowMessageTone('warning');
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
      <main className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-3 px-4 py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Chargement du document…</p>
      </main>
    );
  }

  if (error && !preview?.blobUrl && !editorPayload?.ok) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-sm text-destructive">{error}</p>
        <Button type="button" size="sm" variant="outline" className="mt-4 bg-white" onClick={() => void loadDocument()}>
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </Button>
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
  const showEditorFallback = Boolean(editorUnavailable && !showEditor && !editorLoading);
  const canDownloadDocxSource = Boolean(workspace?.currentVersion?.fileFormat === 'docx' || docKey === 'signed_statutes');
  const editorUnavailableOnMobile = isMobileLayout && isEditMode && !showEditor && !editorLoading && Boolean(workflowMessage);
  const showMobileTabs = isMobileLayout && canEdit && (showEditor || editorLoading) && !expandedPanel;

  const isEditorExpanded = expandedPanel === 'editor';
  const isPreviewExpanded = expandedPanel === 'preview';

  const workflowBannerClass = workflowMessageTone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
    : workflowMessageTone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-border bg-muted/30 text-muted-foreground';

  return (
    <main
      className={
        isMobileLayout
          ? 'flex min-h-[100dvh] flex-col bg-[#f4f7fb]'
          : 'mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6'
      }
    >
      <section
        className={
          isMobileLayout
            ? 'border-b border-border bg-white px-4 py-4 shadow-elevation-sm'
            : 'rounded-xl border border-border bg-white p-5 shadow-elevation-sm'
        }
      >
        <div className={`flex ${isMobileLayout ? 'flex-col' : 'flex-wrap items-start justify-between'} gap-4`}>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
                Espace document
              </span>
              {statutesWorkflow ? (
                <StatutesWorkflowBadge
                  status={statutesWorkflow.status}
                  label={statutesWorkflow.label}
                />
              ) : null}
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">{title}</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {showEditor
                ? 'Modifiez le DOCX dans l’éditeur intégré. L’aperçu PDF se met à jour après chaque enregistrement.'
                : 'Consultez le PDF complet. Ouvrez l’éditeur Word pour ajuster le contenu avant validation.'}
            </p>
          </div>
          <div className={`flex flex-wrap items-center gap-2 ${isMobileLayout ? 'w-full' : 'shrink-0'}`}>
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
              className={`bg-white ${isMobileLayout ? 'w-full sm:w-auto' : ''}`}
            >
              <Link to={`/documents?dossierId=${encodeURIComponent(dossierId)}`}>
                <ArrowLeft className="h-4 w-4" />
                Documents
              </Link>
            </Button>
          </div>
        </div>

        {workspaceWarning ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {workspaceWarning}
          </p>
        ) : null}

        {workflowMessage ? (
          <p className={`mt-4 rounded-lg border px-3 py-2 text-sm ${workflowBannerClass}`}>
            {workflowMessage}
          </p>
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

      {showMobileTabs ? (
        <div className="mx-4 flex rounded-xl border border-border bg-white p-1 shadow-elevation-sm">
          <button
            type="button"
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${
              mobileTab === 'preview' ? 'bg-primary text-white' : 'text-muted-foreground'
            }`}
            onClick={() => setMobileTab('preview')}
          >
            Aperçu PDF
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${
              mobileTab === 'edit' ? 'bg-primary text-white' : 'text-muted-foreground'
            }`}
            onClick={() => setMobileTab('edit')}
          >
            Édition
          </button>
        </div>
      ) : null}

      {isMobileLayout && canEdit && showEditor ? (
        <p className="mx-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          L’édition Word avancée est recommandée sur ordinateur pour une expérience optimale.
        </p>
      ) : null}

      {editorUnavailableOnMobile ? (
        <p className="mx-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {workflowMessage || 'L’éditeur n’est pas disponible sur mobile. Consultez l’aperçu PDF ci-dessous.'}
        </p>
      ) : null}

      {showEditorFallback ? (
        <section className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950 ${isMobileLayout ? 'mx-4' : ''}`}>
          <p className="font-semibold">Éditeur en ligne indisponible</p>
          <p className="mt-2 leading-6">{editorUnavailable}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {canDownloadDocxSource ? (
              <Button type="button" size="sm" onClick={() => void handleDownloadDocxSource()} disabled={docxDownloadBusy}>
                {docxDownloadBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Télécharger le Word (.docx)
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="outline" className="bg-white" onClick={() => void openEditor()}>
              <RefreshCw className="h-4 w-4" />
              Réessayer l’éditeur
            </Button>
          </div>
        </section>
      ) : null}

      <div
        className={
          isMobileLayout
            ? 'flex min-h-0 flex-1 flex-col gap-3 px-0 pb-4'
            : 'grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr] lg:items-stretch'
        }
      >
        {showEditor && (!isMobileLayout || mobileTab === 'edit') ? (
          <section
            className={
              isEditorExpanded
                ? 'fixed inset-0 z-50 flex flex-col bg-white'
                : isMobileLayout
                  ? 'flex min-h-[min(560px,70dvh)] flex-1 flex-col bg-white'
                  : 'flex min-h-[720px] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-white shadow-elevation-sm'
            }
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <p className="truncate text-sm font-bold text-foreground">
                  {isEditorExpanded ? `Éditeur Word ONLYOFFICE – ${title}` : 'Éditeur Word ONLYOFFICE'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary ${isEditorExpanded ? 'hidden sm:inline' : ''}`}>
                  Autosave
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant={isEditorExpanded ? 'outline' : 'ghost'}
                  className={`h-8 px-2 text-xs ${isEditorExpanded ? 'bg-white' : ''}`}
                  onClick={() => toggleExpandedPanel('editor')}
                  aria-label={isEditorExpanded ? 'Quitter le plein écran' : 'Ouvrir l’éditeur en plein écran'}
                >
                  {isEditorExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  {isEditorExpanded ? 'Quitter' : 'Plein écran'}
                </Button>
              </div>
            </div>
            <div className={`flex flex-1 flex-col p-0 sm:p-1 ${isEditorExpanded ? 'min-h-0' : 'min-h-[min(520px,65dvh)]'}`}>
              <OnlyOfficeEditor
                documentServerUrl={editorPayload.documentServerUrl}
                config={editorPayload.config}
                fullViewport
                expanded={isEditorExpanded}
                onRetry={() => void openEditor()}
                onDocumentSaved={() => void handleEditorSaved()}
                onUnavailable={handleEditorUnavailable}
              />
            </div>
          </section>
        ) : null}

        {preview?.blobUrl && (!isMobileLayout || mobileTab === 'preview' || !showEditor) ? (
          <section
            className={
              isPreviewExpanded
                ? 'fixed inset-0 z-50 flex flex-col bg-white'
                : isMobileLayout
                  ? 'mx-4 overflow-hidden rounded-xl border border-border bg-white shadow-elevation-sm'
                  : 'overflow-hidden rounded-xl border border-border bg-white shadow-elevation-sm [content-visibility:auto] [contain-intrinsic-size:720px]'
            }
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-5">
              <p className="truncate text-sm font-bold text-foreground">
                {isPreviewExpanded ? `Aperçu PDF – ${title}` : 'Aperçu PDF'}
              </p>
              <div className="flex items-center gap-2">
                {previewRefreshing ? (
                  <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Mise à jour…
                  </span>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant={isPreviewExpanded ? 'outline' : 'ghost'}
                  className={`h-8 px-2 text-xs ${isPreviewExpanded ? 'bg-white' : ''}`}
                  onClick={() => toggleExpandedPanel('preview')}
                  aria-label={isPreviewExpanded ? 'Quitter le plein écran' : 'Ouvrir l’aperçu PDF en plein écran'}
                >
                  {isPreviewExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  {isPreviewExpanded ? 'Quitter' : 'Plein écran'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-xs"
                  onClick={() => void loadPreview()}
                  disabled={previewRefreshing}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${previewRefreshing ? 'animate-spin' : ''}`} />
                  Actualiser
                </Button>
              </div>
            </div>
            <div className={isPreviewExpanded ? 'flex min-h-0 flex-1 flex-col' : ''}>
              <PdfPreviewPanel
                title={title}
                blobUrl={preview.blobUrl}
                filename={preview.filename}
                expanded={isPreviewExpanded}
                className={isPreviewExpanded ? 'min-h-0 flex-1' : ''}
              />
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
};

export const openDocumentViewerTab = ({ dossierId, docKey, mode = 'view' } = {}) => {
  if (!dossierId || !docKey || typeof window === 'undefined') return null;
  const path = resolveDocumentViewerPath(dossierId, docKey, { mode });
  return window.open(path, '_blank', 'noopener,noreferrer');
};

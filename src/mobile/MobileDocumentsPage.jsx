import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FilePlus2,
  FileText,
  Search,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { MobileDocumentScanner } from '@/mobile/MobileDocumentScanner.jsx';
import { MobilePageSkeleton } from '@/mobile/ui/MobilePageSkeleton.jsx';
import { MobileAnimatedSection } from '@/mobile/ui/MobileAnimatedSection.jsx';
import { MobilePageContainer } from '@/mobile/ui/MobilePageContainer.jsx';
import { MobileEmptyState } from '@/mobile/ui/MobileEmptyState.jsx';
import { MobileDocumentCard } from '@/mobile/ui/MobileDocumentCard.jsx';
import { useMobileMotion } from '@/mobile/ui/mobileMotion.js';
import { useMobileShellOverlay } from '@/mobile/context/MobileShellOverlayContext.jsx';
import { useAuth } from '@/hooks/useAuth.js';
import { useDossierQuery } from '@/hooks/queries/useDossierQuery.js';
import { useDossiersQuery } from '@/hooks/queries/useDossiersQuery.js';
import { INPI_UPLOAD_RULES } from '@/config/legalFlow.js';
import { normalizeUploadToPdfWithMessage, ensurePdfFilename } from '@/utils/documentPdf.js';
import {
  uploadDossierDocument,
  deleteDossierDocument,
} from '@/api/documents.js';
import { getCurrentDossierId, saveCurrentDossierId } from '@/utils/sessionStore.js';
import { DossierVaultPickerOverlay } from '@/components/dossiers/DossierVaultPickerOverlay.jsx';
import { isInternalUser } from '@/utils/roles.js';
import { getDocumentStatusLabel, getDocumentTypeLabel } from '@/utils/documentStatusLabels.js';
import { documentHasFile, filterClientVisibleDocuments, formatDocumentRejectionHint, resolveClientDocumentStatus } from '@/utils/documentWorkflow.js';
import { isDocumentPreviewAction } from '@/utils/dossierDocumentFile.js';
import { isCapacitorNative } from '@/utils/platform.js';
import { isEiLikeFormality } from '@/config/formalities.js';
import { IdentityVerificationCard } from '@/components/identity/IdentityVerificationCard.jsx';
import { MobileOnlineDocumentsPanel } from '@/mobile/ui/MobileOnlineDocumentsPanel.jsx';
import { MobileDocumentPreviewSheet } from '@/mobile/ui/MobileDocumentPreviewSheet.jsx';
import { useDossierDocumentPreview } from '@/hooks/useDossierDocumentPreview.js';
import { parseJsonField } from '@/utils/jsonField.js';
import { resolveDocumentUserAction } from '@/utils/onlineDocumentStatus.js';
import { triggerMobileHaptic } from '@/utils/mobileHaptics.js';
import { toast } from 'sonner';
import { QUESTIONNAIRE_NEW_PATH } from '@/utils/questionnaireNavigation.js';
import {
  readDossierIdFromSearchParams,
  resolveDocumentsDossierId,
  shouldOpenDocumentsDossierPicker,
} from '@/utils/documentsDossierContext.js';

const FILTERS = ['Tous', 'Validés', 'En attente', 'Brouillons'];

const ONLINE_DOC_EDITOR_PATHS = {
  manager_non_conviction: (dossierId) => `/dossier/${dossierId}/declaration-non-condamnation`,
  subscribers_list: (dossierId) => `/dossier/${dossierId}/liste-souscripteurs`,
  formality_powers: (dossierId) => `/dossier/${dossierId}/pouvoirs-formalites`,
};

export const MobileDocumentsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const internalView = isInternalUser(currentUser);
  const { setVaultPickerOpen } = useMobileShellOverlay();
  const { staggerItem } = useMobileMotion();
  const uploadRef = useRef(null);
  const rowUploadRef = useRef(null);
  const pendingUploadDocKey = useRef(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Tous');
  const [uploading, setUploading] = useState(false);
  const [uploadingDocKey, setUploadingDocKey] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [deletingDocKey, setDeletingDocKey] = useState(null);
  const [dossierId, setDossierId] = useState(() => (
    readDossierIdFromSearchParams(searchParams) || getCurrentDossierId()
  ));
  const [pickerOpen, setPickerOpen] = useState(false);
  const { data: dossiersList = [], isLoading: loadingDossiers } = useDossiersQuery(currentUser?.id);
  const { data: dossierPayload, isLoading: loadingDossier, isError, refetch } = useDossierQuery(dossierId);
  const {
    previewDoc,
    previewError,
    loadingDocKey,
    downloading: previewDownloading,
    openPreview,
    closePreview,
    downloadPreview,
    openPreviewInSystemViewer,
  } = useDossierDocumentPreview();

  useEffect(() => {
    const fromUrl = readDossierIdFromSearchParams(searchParams);
    if (fromUrl) {
      saveCurrentDossierId(fromUrl);
      setDossierId(fromUrl);
    }
    if (loadingDossiers || internalView) return;
    const items = Array.isArray(dossiersList) ? dossiersList : [];
    const dossierIds = items.map((item) => item.id).filter(Boolean);
    if (!fromUrl) {
      const nextId = resolveDocumentsDossierId({
        searchParams,
        dossierIds,
        fallbackId: getCurrentDossierId(),
      });
      if (nextId) setDossierId(nextId);
    }
    setPickerOpen(shouldOpenDocumentsDossierPicker({
      searchParams,
      dossierCount: items.length,
      internalView,
    }));
  }, [loadingDossiers, dossiersList, internalView, searchParams]);

  useEffect(() => {
    const open = pickerOpen && !internalView;
    setVaultPickerOpen(open);
    return () => setVaultPickerOpen(false);
  }, [pickerOpen, internalView, setVaultPickerOpen]);

  const handlePickDossier = (dossier) => {
    saveCurrentDossierId(dossier.id);
    setDossierId(dossier.id);
    setPickerOpen(false);
  };

  const documents = useMemo(() => {
    const apiDocuments = filterClientVisibleDocuments(dossierPayload?.documents || []);
    return apiDocuments.map((item) => {
      const label = getDocumentTypeLabel(item.docKey, item.label);
      const hasFile = documentHasFile(item);
      const rawStatus = String(item.status || '').toUpperCase();
      const displayStatus = internalView ? rawStatus : resolveClientDocumentStatus({ ...item, hasFile });
      return {
        id: item.id,
        docKey: item.docKey,
        name: label,
        status: displayStatus,
        statusLabel: getDocumentStatusLabel(displayStatus),
        hasFile,
        rejectedReason: item.rejectedReason || null,
        canUpload: !['VALID', 'VALIDATED', 'SIGNED'].includes(displayStatus),
        date: item.updatedAt || item.uploadedAt || item.createdAt,
      };
    });
  }, [dossierPayload, internalView]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter((doc) => {
      const matchQuery = !q || doc.name.toLowerCase().includes(q);
      const matchFilter = filter === 'Tous'
        || (filter === 'Validés' && ['VALID', 'VALIDATED', 'SIGNED'].includes(doc.status))
        || (filter === 'En attente' && ['UPLOADED', 'PENDING_REVIEW', 'UNDER_REVIEW', 'GENERATED'].includes(doc.status))
        || (filter === 'Brouillons' && !doc.hasFile);
      return matchQuery && matchFilter;
    });
  }, [documents, query, filter]);

  const dossierMeta = useMemo(() => {
    const questionnaire = parseJsonField(dossierPayload?.dossier?.dataJson, {});
    return {
      legalForm: dossierPayload?.dossier?.legalForm,
      formeJuridique: questionnaire?.formeJuridique,
      service: dossierPayload?.dossier?.service,
      typeFormalite: questionnaire?.typeFormalite,
    };
  }, [dossierPayload]);

  const eiLike = isEiLikeFormality({
    legalForm: dossierMeta.legalForm,
    formeJuridique: dossierMeta.formeJuridique,
    service: dossierMeta.service,
  });

  const identityDocUploaded = documents.some((doc) => doc.docKey === 'identity_proof' && doc.hasFile);

  const uploadPdfFile = async (docKey, file) => {
    if (!file || !dossierId || !docKey) return;
    setUploadError('');
    const maxBytes = INPI_UPLOAD_RULES.maxFileSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(`Le fichier dépasse ${INPI_UPLOAD_RULES.maxFileSizeMb} Mo.`);
      return;
    }
    const conversion = await normalizeUploadToPdfWithMessage(file, {
      filename: ensurePdfFilename(file.name),
    });
    if (!conversion.ok) {
      setUploadError(conversion.message);
      return;
    }
    try {
      setUploading(true);
      setUploadingDocKey(docKey);
      await uploadDossierDocument({
        dossierId,
        docKey,
        file: conversion.file,
        ownerFirstName: currentUser?.firstName || '',
        ownerLastName: currentUser?.lastName || '',
      });
      await refetch();
    } catch (error) {
      setUploadError(error?.message || 'Impossible d’envoyer ce fichier. Réessayez.');
    } finally {
      setUploading(false);
      setUploadingDocKey(null);
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !dossierId) return;
    await uploadPdfFile('identity_proof', file);
    event.target.value = '';
  };

  const triggerRowUpload = (docKey) => {
    pendingUploadDocKey.current = docKey;
    rowUploadRef.current?.click();
  };

  const onRowUpload = async (event) => {
    const file = event.target.files?.[0];
    const docKey = pendingUploadDocKey.current;
    await uploadPdfFile(docKey, file);
    event.target.value = '';
    pendingUploadDocKey.current = null;
  };

  const openDocumentPreview = async ({ docKey, label }) => {
    if (!dossierId || !docKey) return;
    setUploadError('');
    const result = await openPreview({ dossierId, docKey, label });
    if (!result.ok) {
      const message = result.error || 'Impossible d’afficher l’aperçu de ce document pour le moment.';
      setUploadError(message);
      toast.error(message);
    }
  };

  const handleDocumentPreview = (doc) => {
    void triggerMobileHaptic('light');
    void openDocumentPreview({ docKey: doc.docKey, label: doc.name });
  };

  const handleDocumentAction = (doc) => {
    void triggerMobileHaptic('light');
    const userAction = resolveDocumentUserAction(doc.status, doc.hasFile, doc.rejectedReason);
    const editorPath = ONLINE_DOC_EDITOR_PATHS[doc.docKey]?.(dossierId);

    if (userAction.action === 'download' || userAction.action === 'view') {
      if (doc.hasFile) {
        handleDocumentPreview(doc);
        return;
      }
    }

    if (['correct', 'fill', 'sign'].includes(userAction.action) && editorPath && !eiLike) {
      navigate(editorPath);
      return;
    }

    if (doc.canUpload) {
      triggerRowUpload(doc.docKey);
    }
  };

  const handleOnlineDocumentAction = (item, state) => {
    void triggerMobileHaptic('light');
    if ((state.action === 'download' || state.action === 'view') && state.hasFile) {
      void openDocumentPreview({ docKey: state.docKey, label: item.label });
      return;
    }
    const editorPath = item.to(dossierId);
    if (editorPath) navigate(editorPath);
  };

  const removeAttachment = async (doc) => {
    if (!dossierId || !doc.docKey || !doc.hasFile) return;
    const confirmed = window.confirm(`Supprimer la pièce jointe « ${doc.name} » ?`);
    if (!confirmed) return;
    setUploadError('');
    setDeletingDocKey(doc.docKey);
    try {
      await deleteDossierDocument({ dossierId, docKey: doc.docKey });
      await refetch();
    } catch (error) {
      setUploadError(error?.message || 'La suppression a échoué.');
    } finally {
      setDeletingDocKey(null);
    }
  };

  if (loadingDossiers || (loadingDossier && dossierId)) return <MobilePageSkeleton />;

  return (
    <>
      <DossierVaultPickerOverlay
        open={pickerOpen && !internalView}
        dossiers={dossiersList}
        onSelect={handlePickDossier}
        onClose={() => setPickerOpen(false)}
      />
      <MobilePageContainer>
      <MobileAnimatedSection delay={0}>
        <p className="text-xs font-bold uppercase tracking-wide text-primary">Espace documentaire</p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))]">Documents</h1>
            <p className="mt-1 text-sm text-muted-foreground">Pièces liées à vos formalités.</p>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-11 shrink-0 rounded-2xl px-4"
            disabled={!dossierId || uploading}
            onClick={() => uploadRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Importer
          </Button>
        </div>
        <input ref={uploadRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => void handleUpload(e)} />
        <input
          ref={rowUploadRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => void onRowUpload(e)}
          disabled={Boolean(uploadingDocKey)}
        />
      </MobileAnimatedSection>

      {!dossierId ? (
        <MobileAnimatedSection delay={0.05}>
          <MobileEmptyState
            icon={FileText}
            title="Aucun dossier actif"
            description="Vos documents apparaîtront ici dès que votre dossier sera initialisé. Commencez une formalité ou revenez à votre dossier actif."
            actionLabel="Créer une formalité"
            actionTo={QUESTIONNAIRE_NEW_PATH}
          />
        </MobileAnimatedSection>
      ) : (
        <>
          {dossiersList.length > 1 ? (
            <MobileAnimatedSection delay={0.04}>
              <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {dossiersList.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDossierId(d.id)}
                    className={`shrink-0 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                      d.id === dossierId
                        ? 'border-primary bg-secondary text-primary'
                        : 'border-border bg-white text-muted-foreground'
                    }`}
                  >
                    {d.companyName || d.denomination || 'Dossier'}
                  </button>
                ))}
              </div>
            </MobileAnimatedSection>
          ) : null}

          <MobileAnimatedSection delay={0.06}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un document…"
                className="h-12 rounded-2xl pl-9 text-base"
              />
            </div>
          </MobileAnimatedSection>

          <MobileAnimatedSection delay={0.08}>
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {FILTERS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                    filter === item ? 'bg-[hsl(var(--greffio-blue))] text-white' : 'bg-white text-muted-foreground ring-1 ring-border'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </MobileAnimatedSection>

          {isCapacitorNative() ? (
            <MobileAnimatedSection delay={0.1}>
              <div className="rounded-2xl border border-primary/20 bg-secondary/30 p-4">
                <p className="text-sm font-bold">Scanner une pièce</p>
                <p className="mt-1 text-xs text-muted-foreground">Conversion PDF optimisée avant envoi.</p>
                <div className="mt-3">
                  <MobileDocumentScanner dossierId={dossierId} docKey="identity_proof" label="Scanner & envoyer" />
                </div>
              </div>
            </MobileAnimatedSection>
          ) : null}

          <MobileOnlineDocumentsPanel
            dossierId={dossierId}
            documents={dossierPayload?.documents || []}
            eiLike={eiLike}
            onDocumentAction={handleOnlineDocumentAction}
            onDocumentPreview={openDocumentPreview}
            previewLoadingDocKey={loadingDocKey}
          />

          <MobileAnimatedSection delay={0.09}>
            <IdentityVerificationCard
              dossierId={dossierId}
              identityDocUploaded={identityDocUploaded}
              onVerificationUpdated={() => { void refetch(); }}
            />
          </MobileAnimatedSection>

          {uploadError ? <p className="text-sm text-red-600">{uploadError}</p> : null}

          {isError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Impossible de charger les documents.
              <Button type="button" variant="outline" className="mt-3 h-11 w-full bg-white" onClick={() => refetch()}>
                Réessayer
              </Button>
            </div>
          ) : null}

          <div className="space-y-3">
            {filtered.map((doc, index) => {
              const userAction = resolveDocumentUserAction(doc.status, doc.hasFile, doc.rejectedReason);
              const canPreview = doc.hasFile && isDocumentPreviewAction(userAction.action);
              return (
              <motion.div key={doc.id || doc.docKey} {...staggerItem(index)}>
                <MobileDocumentCard
                  name={doc.name}
                  status={doc.status}
                  statusLabel={doc.statusLabel}
                  hint={['REJECTED', 'INVALID'].includes(doc.status) ? formatDocumentRejectionHint(doc) : undefined}
                  hasFile={doc.hasFile}
                  date={doc.date}
                  onAction={canPreview ? undefined : () => handleDocumentAction(doc)}
                  onPreview={canPreview ? () => handleDocumentPreview(doc) : undefined}
                  previewLoading={loadingDocKey === doc.docKey}
                  onDelete={doc.hasFile && doc.canUpload ? () => void removeAttachment(doc) : undefined}
                  deleting={deletingDocKey === doc.docKey}
                />
              </motion.div>
            );})}
          </div>

          {!filtered.length && !isError ? (
            <MobileAnimatedSection delay={0.12}>
              <MobileEmptyState
                icon={FilePlus2}
                title="Aucun document pour l’instant"
                description="Vos documents apparaîtront ici dès que votre dossier sera initialisé. Vous pouvez commencer une formalité ou revenir à votre dossier actif."
                actionLabel="Ouvrir le dossier"
                actionTo={`/dossier/${dossierId}`}
                secondaryLabel="Créer une formalité"
                secondaryTo={QUESTIONNAIRE_NEW_PATH}
              />
            </MobileAnimatedSection>
          ) : null}
        </>
      )}
      </MobilePageContainer>
      <MobileDocumentPreviewSheet
        open={Boolean(previewDoc)}
        title={previewDoc?.label}
        previewSrc={previewDoc?.previewSrc}
        previewArrayBuffer={previewDoc?.arrayBuffer}
        previewBlob={previewDoc?.blob}
        loading={Boolean(previewDoc?.loading)}
        filename={previewDoc?.filename}
        error={previewError}
        downloading={previewDownloading}
        dossierId={previewDoc?.dossierId || dossierId}
        docKey={previewDoc?.docKey}
        document={(dossierPayload?.documents || []).find((item) => item.docKey === previewDoc?.docKey) || null}
        onClose={closePreview}
        onDownload={() => {
          void downloadPreview().then((result) => {
            if (result.ok) {
              toast.success('Document enregistré dans l’application Fichiers.');
              return;
            }
            const message = result.error || 'Impossible de télécharger ce document pour le moment.';
            setUploadError(message);
            toast.error(message);
          });
        }}
        onOpenExternal={() => {
          void openPreviewInSystemViewer().then((result) => {
            if (result.ok) return;
            const message = result.error || 'Impossible d’ouvrir ce document pour le moment.';
            setUploadError(message);
            toast.error(message);
          });
        }}
      />
    </>
  );
};

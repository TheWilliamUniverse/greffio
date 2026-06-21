import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Archive, CheckCircle2, FilePlus2, FileText, Search, ShieldCheck, Upload } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar.jsx';
import { StatusBadge } from '@/components/StatusBadge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { INPI_UPLOAD_RULES } from '@/config/legalFlow.js';
import { normalizeUploadToPdfWithMessage, ensurePdfFilename } from '@/utils/documentPdf.js';
import { isEiLikeFormality } from '@/config/formalities.js';
import { getCurrentDossierId, saveCurrentDossierId } from '@/utils/sessionStore.js';
import { DossierVaultPickerOverlay } from '@/components/dossiers/DossierVaultPickerOverlay.jsx';
import {
  deleteDossierDocument,
  downloadDossierDocument,
  getDossierDocumentEditor,
  saveDossierDocumentEditor,
  uploadDossierDocument,
} from '@/api/documents.js';
import { IdentityVerificationCard } from '@/components/identity/IdentityVerificationCard.jsx';
import { DossierBreadcrumb } from '@/components/layout/DossierBreadcrumb.jsx';
import { DocumentPreviewActions } from '@/components/documents/DocumentPreviewActions.jsx';
import { PdfPreviewPanel } from '@/components/documents/PdfPreviewPanel.jsx';
import { mapDocumentPreviewError } from '@/utils/dossierDocumentFile.js';
import { openDocumentViewerTab } from '@/pages/DocumentViewerTab.jsx';
import { FormalityPowerSummary } from '@/components/documents/FormalityPowerSummary.jsx';
import { DocumentsListRow } from '@/components/documents/DocumentsListRow.jsx';
import { PageLoadingState } from '@/components/patterns/PageLoadingState.jsx';
import { DocumentStatusCard } from '@/components/patterns/DocumentStatusCard.jsx';
import { GreffioSignatureInfoBanner } from '@/components/signature/GreffioSignatureInfoBanner.jsx';
import { EmptyState } from '@/components/patterns/EmptyState.jsx';
import { isFormalityPowerDocument, mapFormalityPowerStatus, MERGED_FORMALITY_POWER_LABEL, resolveMergedFormalityPowerDocument } from '@/utils/formalityPowerDocuments.js';
import { useAuth } from '@/hooks/useAuth.js';
import { useDossierQuery } from '@/hooks/queries/useDossierQuery.js';
import { useDossiersQuery } from '@/hooks/queries/useDossiersQuery.js';
import { queryKeys } from '@/hooks/queries/queryKeys.js';
import { isInternalUser } from '@/utils/roles.js';
import { getDocumentStatusLabel, getDocumentTypeLabel } from '@/utils/documentStatusLabels.js';
import { documentHasFile, filterClientActionRequiredDocuments, filterClientVisibleDocuments, formatDocumentRejectionHint, resolveClientDocumentStatus } from '@/utils/documentWorkflow.js';
import { resolveStatutesClientDisplayStatus } from '@/utils/statutesWorkflowClient.js';
import {
  readDossierIdFromSearchParams,
  resolveDocumentsDossierId,
  shouldOpenDocumentsDossierPicker,
} from '@/utils/documentsDossierContext.js';

export const DocumentsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const internalView = isInternalUser(currentUser);
  const { data: dossiersList = [], isLoading: loadingDossiers } = useDossiersQuery(currentUser?.id);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('Tous');
  const [uploading, setUploading] = useState(false);
  const [selectedDocKey, setSelectedDocKey] = useState('identity_proof');
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [editorData, setEditorData] = useState(null);
  const [editorSaving, setEditorSaving] = useState(false);
  const [deletingDocKey, setDeletingDocKey] = useState(null);
  const [uploadingDocKey, setUploadingDocKey] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewLoadingDocKey, setPreviewLoadingDocKey] = useState(null);
  const rowUploadRef = useRef(null);
  const pendingUploadDocKey = useRef(null);
  const [resolvedDossierId, setResolvedDossierId] = useState(() => (
    readDossierIdFromSearchParams(searchParams) || getCurrentDossierId()
  ));
  const [pickerOpen, setPickerOpen] = useState(false);
  const {
    data: dossierPayload,
    isLoading: loadingDossier,
    isError: dossierLoadError,
  } = useDossierQuery(resolvedDossierId);
  const apiDocuments = useMemo(
    () => dossierPayload?.documents ?? [],
    [dossierPayload?.documents],
  );
  const visibleApiDocuments = useMemo(
    () => filterClientVisibleDocuments(apiDocuments),
    [apiDocuments],
  );
  const dossierAccessError = useMemo(() => {
    if (loadingDossiers || loadingDossier) return '';
    if (!resolvedDossierId) return 'Aucun dossier actif. Ouvrez un dossier depuis le tableau de bord.';
    if (dossierLoadError) return 'Impossible de charger ce dossier. Sélectionnez-en un autre depuis « Dossiers ».';
    return '';
  }, [loadingDossiers, loadingDossier, resolvedDossierId, dossierLoadError]);
  const normalizedDocuments = useMemo(() => visibleApiDocuments.map((item) => {
    const displayLabel = getDocumentTypeLabel(item.docKey, item.label);
    const hasFile = documentHasFile(item);
    const rawStatus = String(item.status || '').toUpperCase();
    const statutesDisplayStatus = item.docKey === 'signed_statutes' && hasFile
      ? resolveStatutesClientDisplayStatus(item)
      : null;
    const displayStatus = internalView
      ? rawStatus
      : (statutesDisplayStatus || resolveClientDocumentStatus({ ...item, hasFile }));
    return {
      id: item.id,
      docKey: item.docKey,
      dossierId: item.dossierId,
      name: displayLabel,
      label: displayLabel,
      type: displayLabel,
      status: displayStatus,
      statusLabel: getDocumentStatusLabel(displayStatus),
      date: item.updatedAt || item.uploadedAt || item.createdAt || null,
      hasFile,
      rejectedReason: item.rejectedReason || null,
      canUpload: !['VALID', 'VALIDATED', 'SIGNED'].includes(displayStatus),
      statutesWorkflowStatus: item.metadata?.statutesWorkflowStatus || null,
    };
  }), [visibleApiDocuments, internalView]);
  const waitingDocs = useMemo(
    () => filterClientActionRequiredDocuments(normalizedDocuments),
    [normalizedDocuments],
  );
  const dossierMeta = useMemo(() => {
    const questionnaire = dossierPayload?.dossier?.dataJson
      ? JSON.parse(dossierPayload.dossier.dataJson)
      : {};
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
  const uploadableDocKeys = useMemo(() => ([
    ['identity_proof', 'Pièce d’identité'],
    ['address_proof', 'Justificatif de domicile'],
    ['legal_notice_certificate', 'Attestation annonce légale'],
    ['registered_office_proof', 'Justificatif siège social'],
    ['ubo_declaration', 'Déclaration bénéficiaires effectifs'],
    ['manager_non_conviction', 'Déclaration non-condamnation et filiation (en ligne)'],
    ['subscribers_list', 'Liste des souscripteurs (en ligne)'],
    ['formality_powers', 'Procuration et pouvoirs pour formalités (en ligne)'],
    ['minor_emancipation_order', "Ordonnance ou jugement d'émancipation"],
    ['minor_parental_authorization', 'Autorisation parentale / tuteur (associé mineur)'],
    ['signed_statutes', 'Statuts signés'],
    ['capital_certificate', 'Attestation dépôt capital'],
  ].filter(([value]) => !(eiLike && (value === 'signed_statutes' || value === 'capital_certificate')))), [eiLike]);
  useEffect(() => {
    if (uploadableDocKeys.some(([value]) => value === selectedDocKey)) return;
    setSelectedDocKey(uploadableDocKeys[0]?.[0] || 'identity_proof');
  }, [selectedDocKey, uploadableDocKeys]);
  const types = useMemo(() => ['Tous', ...new Set(normalizedDocuments.map((document) => document.type))], [normalizedDocuments]);

  useEffect(() => {
    const fromUrl = readDossierIdFromSearchParams(searchParams);
    if (fromUrl) {
      saveCurrentDossierId(fromUrl);
      setResolvedDossierId(fromUrl);
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
      if (nextId) setResolvedDossierId(nextId);
    }
    setPickerOpen(shouldOpenDocumentsDossierPicker({
      searchParams,
      dossierCount: items.length,
      internalView,
    }));
  }, [loadingDossiers, dossiersList, internalView, searchParams]);

  const handlePickDossier = (dossier) => {
    saveCurrentDossierId(dossier.id);
    setResolvedDossierId(dossier.id);
    setPickerOpen(false);
  };

  const filteredDocuments = useMemo(() => normalizedDocuments.filter((document) => {
    const searchable = [
      document.name,
      document.label,
      document.type,
      document.statusLabel,
    ].join(' ');
    const matchesQuery = searchable.toLowerCase().includes(query.toLowerCase());
    const matchesType = type === 'Tous' || document.type === type;
    return matchesQuery && matchesType;
  }), [normalizedDocuments, query, type]);

  const invalidateDossierDocuments = useCallback(async () => {
    if (!resolvedDossierId) return;
    await queryClient.invalidateQueries({ queryKey: queryKeys.dossier(resolvedDossierId) });
  }, [queryClient, resolvedDossierId]);

  const uploadPdfFile = async (docKey, file) => {
    if (!file || !resolvedDossierId || !docKey) return;
    setUploadError(null);
    setUploadSuccess('');
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
      setSelectedDocKey(docKey);
      const payload = await uploadDossierDocument({
        dossierId: resolvedDossierId,
        docKey,
        file: conversion.file,
        ownerFirstName: currentUser?.firstName || '',
        ownerLastName: currentUser?.lastName || '',
      });
      await invalidateDossierDocuments();
      if (payload.analysis?.requiresManualReview) {
        setUploadSuccess('Pièce reçue. Contrôle manuel Greffio requis avant validation finale.');
      } else {
        setUploadSuccess('Pièce déposée et enregistrée.');
      }
    } catch (error) {
      setUploadError(error?.message || "L'upload a échoué.");
    } finally {
      setUploading(false);
      setUploadingDocKey(null);
    }
  };

  const onUpload = async (event) => {
    const file = event.target.files?.[0];
    await uploadPdfFile(selectedDocKey, file);
    event.target.value = '';
  };

  const onRowUpload = async (event) => {
    const file = event.target.files?.[0];
    const docKey = pendingUploadDocKey.current;
    await uploadPdfFile(docKey, file);
    event.target.value = '';
    pendingUploadDocKey.current = null;
  };

  const openEditor = async () => {
    if (!resolvedDossierId) return;
    try {
      const payload = await getDossierDocumentEditor({
        dossierId: resolvedDossierId,
        docKey: 'manager_non_conviction',
      });
      setEditorData(payload);
      setUploadError(null);
    } catch (_error) {
      setUploadError("Impossible d'ouvrir l'éditeur PDF pour ce document.");
    }
  };

  const updateEditorField = (key, value) => {
    setEditorData((current) => {
      const nextFields = {
        ...(current?.fields || {}),
        [key]: value,
      };
      if (key === 'useCaseSelf' || key === 'useCaseParents') {
        const self = key === 'useCaseSelf' ? Boolean(value) : Boolean(nextFields.useCaseSelf);
        const parents = key === 'useCaseParents' ? Boolean(value) : Boolean(nextFields.useCaseParents);
        nextFields.useCaseSelf = self;
        nextFields.useCaseParents = parents;
        if (self && parents) nextFields.useCase = 'both';
        else if (self) nextFields.useCase = 'self';
        else if (parents) nextFields.useCase = 'parents';
        else nextFields.useCase = '';
      }
      return { ...current, fields: nextFields };
    });
  };

  const saveEditor = async () => {
    if (!editorData || !resolvedDossierId) return;
    setEditorSaving(true);
    try {
      await saveDossierDocumentEditor({
        dossierId: resolvedDossierId,
        docKey: 'manager_non_conviction',
        fields: editorData.fields || {},
      });
      await invalidateDossierDocuments();
      setUploadSuccess('Document PDF généré et attaché au dossier.');
      setEditorData(null);
    } catch (error) {
      setUploadError(error?.message || "Le document n'a pas pu être généré.");
    } finally {
      setEditorSaving(false);
    }
  };

  useEffect(() => () => {
    if (previewDoc?.blobUrl) URL.revokeObjectURL(previewDoc.blobUrl);
  }, [previewDoc?.blobUrl]);

  const openDocumentPreview = useCallback(async (docKey, label) => {
    if (!resolvedDossierId || !docKey) return;
    setPreviewLoadingDocKey(docKey);
    setUploadError(null);
    try {
      openDocumentViewerTab({ dossierId: resolvedDossierId, docKey });
      const { filename, blob } = await downloadDossierDocument({
        dossierId: resolvedDossierId,
        docKey,
        inline: true,
      });
      setPreviewDoc((current) => {
        if (current?.blobUrl) URL.revokeObjectURL(current.blobUrl);
        return {
          docKey,
          label: label || filename,
          filename,
          blobUrl: URL.createObjectURL(blob),
        };
      });
    } catch (error) {
      setUploadError(mapDocumentPreviewError(error));
    } finally {
      setPreviewLoadingDocKey(null);
    }
  }, [resolvedDossierId]);

  const openDocumentDownload = async (docKey) => {
    if (!resolvedDossierId || !docKey) return;
    try {
      const { filename, blob } = await downloadDossierDocument({ dossierId: resolvedDossierId, docKey });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (_error) {
      setUploadError('Impossible de télécharger ce document pour le moment.');
    }
  };

  const removeAttachment = useCallback(async (docKey, label) => {
    if (!resolvedDossierId || !docKey) return;
    const confirmed = window.confirm(`Supprimer la pièce jointe « ${label} » ? Vous pourrez en déposer une nouvelle ensuite.`);
    if (!confirmed) return;
    setUploadError(null);
    setUploadSuccess('');
    setDeletingDocKey(docKey);
    try {
      await deleteDossierDocument({ dossierId: resolvedDossierId, docKey });
      await invalidateDossierDocuments();
      setUploadSuccess('Pièce jointe supprimée.');
    } catch (error) {
      setUploadError(error?.message || 'La suppression a échoué.');
    } finally {
      setDeletingDocKey(null);
    }
  }, [invalidateDossierDocuments, resolvedDossierId]);

  const handleRowUpload = useCallback((docKey) => {
    pendingUploadDocKey.current = docKey;
    rowUploadRef.current?.click();
  }, []);

  const mergedPowerDocument = useMemo(
    () => resolveMergedFormalityPowerDocument(normalizedDocuments),
    [normalizedDocuments],
  );
  const showPowerSection = Boolean(resolvedDossierId) && !eiLike;
  const isInitialLoading = loadingDossiers || (Boolean(resolvedDossierId) && loadingDossier && !dossierPayload && !dossierLoadError);
  const identityDocUploaded = normalizedDocuments.some((document) => document.docKey === 'identity_proof' && document.hasFile);
  const summary = useMemo(() => ([
    { label: 'Pièces en coffre', value: normalizedDocuments.length, text: 'document(s) du dossier actif', icon: Archive },
    { label: 'À traiter', value: waitingDocs.length, text: 'pièces à compléter ou signer', icon: FileText },
    { label: 'Dossier relié', value: resolvedDossierId ? 1 : 0, text: resolvedDossierId ? 'dossier actif sélectionné' : 'aucun dossier actif', icon: CheckCircle2 },
  ]), [normalizedDocuments.length, resolvedDossierId, waitingDocs.length]);

  const mergedPowerActions = useMemo(() => {
    if (!mergedPowerDocument) return [];
    const document = mergedPowerDocument;
    const fileDocKey = document.docKey;
    return [
      document.hasFile ? {
        label: previewLoadingDocKey === fileDocKey ? 'Ouverture…' : 'Voir',
        onClick: () => { void openDocumentPreview(fileDocKey, MERGED_FORMALITY_POWER_LABEL); },
        disabled: previewLoadingDocKey === fileDocKey,
      } : null,
      document.hasFile ? {
        label: 'Télécharger',
        onClick: () => { void openDocumentDownload(fileDocKey); },
      } : null,
      {
        label: 'Compléter en ligne',
        to: `/dossier/${resolvedDossierId}/pouvoirs-formalites`,
      },
    ].filter(Boolean);
  }, [mergedPowerDocument, openDocumentPreview, previewLoadingDocKey, resolvedDossierId]);

  const handleVerificationUpdated = useCallback(() => {
    void invalidateDossierDocuments();
  }, [invalidateDossierDocuments]);

  if (isInitialLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-5 md:p-8">
          <PageLoadingState
            label="Chargement des documents…"
            description="Récupération du dossier actif et de vos pièces."
          />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      <DossierVaultPickerOverlay
        open={pickerOpen}
        dossiers={dossiersList}
        onSelect={handlePickDossier}
        onClose={() => setPickerOpen(false)}
      />
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-5 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {resolvedDossierId ? (
            <DossierBreadcrumb
              dossierId={resolvedDossierId}
              dossierName={dossierPayload?.dossier?.companyName || dossierPayload?.dossier?.denomination || 'Dossier'}
              section="Documents"
            />
          ) : null}
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase text-primary">Coffre documentaire</p>
              <h1 className="mt-2 text-3xl font-extrabold text-foreground">Documents</h1>
              <p className="mt-2 text-sm text-muted-foreground">Centralisez uniquement les pièces, documents générés, justificatifs tiers et signatures de vos dossiers.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="bg-white">
                <Link to="/statuts">
                  <FilePlus2 className="h-4 w-4" />
                  Générer depuis mon dossier
                </Link>
              </Button>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white">
                <Upload className="h-4 w-4" />
                {uploading ? 'Upload...' : 'Ajouter une pièce'}
                <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={onUpload} disabled={uploading || Boolean(uploadingDocKey)} />
              </label>
              <input
                ref={rowUploadRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={onRowUpload}
                disabled={Boolean(uploadingDocKey)}
              />
            </div>
          </div>

          <section className="rounded-md border border-border bg-white p-4 shadow-elevation-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex-1">
                <p className="text-sm font-semibold">Type de justificatif</p>
                <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={selectedDocKey} onChange={(event) => setSelectedDocKey(event.target.value)}>
                  {uploadableDocKeys.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">PDF ou image (JPG, PNG, WebP), 20 Mo max, un justificatif par fichier.</p>
            </div>
            {uploadError ? <p className="mt-2 text-xs text-destructive">{uploadError}</p> : null}
            {uploadSuccess ? <p className="mt-2 text-xs text-emerald-700">{uploadSuccess}</p> : null}
            {!resolvedDossierId ? <p className="mt-2 text-xs text-amber-700">Aucun dossier actif détecté. Ouvrez un dossier puis revenez ici pour déposer vos pièces.</p> : null}
            {dossierAccessError ? <p className="mt-2 text-xs text-destructive">{dossierAccessError}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="bg-white"
                disabled={!resolvedDossierId || eiLike}
                onClick={() => {
                  const url = `/dossier/${resolvedDossierId}/declaration-non-condamnation`;
                  navigate(url);
                }}
              >
                <FilePlus2 className="h-4 w-4" />
                Non-condamnation
              </Button>
              <Button
                variant="outline"
                className="bg-white"
                disabled={!resolvedDossierId || eiLike}
                onClick={() => navigate(`/dossier/${resolvedDossierId}/liste-souscripteurs`)}
              >
                <FilePlus2 className="h-4 w-4" />
                Liste des souscripteurs
              </Button>
              <Button
                variant="outline"
                className="bg-white"
                disabled={!resolvedDossierId || eiLike}
                onClick={() => navigate(`/dossier/${resolvedDossierId}/pouvoirs-formalites`)}
              >
                <FilePlus2 className="h-4 w-4" />
                Procuration et pouvoirs
              </Button>
            </div>
            <GreffioSignatureInfoBanner className="mt-4" />
          </section>

          {resolvedDossierId ? (
            <IdentityVerificationCard
              dossierId={resolvedDossierId}
              identityDocUploaded={identityDocUploaded}
              onVerificationUpdated={handleVerificationUpdated}
            />
          ) : null}

          {showPowerSection ? (
            <section className="space-y-4 rounded-md border border-border bg-white p-5 shadow-elevation-sm [content-visibility:auto] [contain-intrinsic-size:auto_240px]">
              <div>
                <p className="text-sm font-bold uppercase text-primary">Représentation</p>
                <h2 className="mt-1 text-xl font-extrabold text-foreground">{MERGED_FORMALITY_POWER_LABEL}</h2>
              </div>
              {mergedPowerDocument ? (
                <div className="space-y-3">
                  <DocumentStatusCard
                    title={MERGED_FORMALITY_POWER_LABEL}
                    subtitle={null}
                    status={mapFormalityPowerStatus(mergedPowerDocument)}
                    badges={isFormalityPowerDocument(mergedPowerDocument).confidence !== 'low' ? ['Vaut procuration'] : []}
                    shieldNotch
                    warning={
                      ['REJECTED', 'INVALID'].includes(mergedPowerDocument.status)
                        ? formatDocumentRejectionHint(mergedPowerDocument)
                        : (mergedPowerDocument.status === 'PENDING_REVIEW' ? 'Contrôle Greffio en cours.' : undefined)
                    }
                    actions={mergedPowerActions}
                  />
                  <FormalityPowerSummary document={mergedPowerDocument} />
                </div>
              ) : (
                <EmptyState
                  compact
                  icon={ShieldCheck}
                  title="Document à préparer"
                  description="Complétez et signez la procuration et les pouvoirs pour vos formalités."
                  cta={{ to: `/dossier/${resolvedDossierId}/pouvoirs-formalites`, label: 'Compléter en ligne' }}
                />
              )}
            </section>
          ) : null}

          {editorData ? (
            <section className="rounded-md border border-primary/25 bg-white p-5 shadow-elevation-sm">
              <p className="text-sm font-bold uppercase text-primary">Éditeur PDF en ligne</p>
              <h2 className="mt-1 text-xl font-extrabold">{editorData.title}</h2>
              <p className="mt-1 text-xs text-primary">Les champs correspondent aux zones du PDF remplissable généré (compatible lecteurs PDF).</p>
              <div className="mt-4 rounded-md border border-border bg-muted p-4">
                <p className="text-sm font-bold">Cas d&apos;usage</p>
                <div className="mt-2 flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(editorData.fields?.useCaseSelf ?? (editorData.fields?.useCase === 'self' || editorData.fields?.useCase === 'both'))}
                      onChange={(event) => updateEditorField('useCaseSelf', event.target.checked)}
                    />
                    Pour moi (dirigeant / associé)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(editorData.fields?.useCaseParents ?? (editorData.fields?.useCase === 'parents' || editorData.fields?.useCase === 'both'))}
                      onChange={(event) => updateEditorField('useCaseParents', event.target.checked)}
                    />
                    Filiation (parents)
                  </label>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Input placeholder="Nom complet" value={editorData.fields?.declarantFullName || ''} onChange={(event) => updateEditorField('declarantFullName', event.target.value)} />
                <Input placeholder="Date de naissance" type="date" value={editorData.fields?.declarantBirthDate || ''} onChange={(event) => updateEditorField('declarantBirthDate', event.target.value)} />
                <Input placeholder="Ville de naissance" value={editorData.fields?.declarantBirthCity || ''} onChange={(event) => updateEditorField('declarantBirthCity', event.target.value)} />
                <Input placeholder="Adresse" value={editorData.fields?.declarantAddress || ''} onChange={(event) => updateEditorField('declarantAddress', event.target.value)} />
                <Input placeholder="Nom parent 1" value={editorData.fields?.parent1FullName || ''} onChange={(event) => updateEditorField('parent1FullName', event.target.value)} />
                <Input placeholder="Nom parent 2" value={editorData.fields?.parent2FullName || ''} onChange={(event) => updateEditorField('parent2FullName', event.target.value)} />
                <Input placeholder="Ville de signature" value={editorData.fields?.statementCity || ''} onChange={(event) => updateEditorField('statementCity', event.target.value)} />
                <Input placeholder="Date de signature" type="date" value={editorData.fields?.statementDate || ''} onChange={(event) => updateEditorField('statementDate', event.target.value)} />
              </div>
              <div className="mt-3 grid gap-2">
                <label className="text-sm">
                  <input type="checkbox" checked={Boolean(editorData.fields?.declarationNonCondamnation)} onChange={(event) => updateEditorField('declarationNonCondamnation', event.target.checked)} />
                  {' '}Je confirme la déclaration de non-condamnation.
                </label>
                <label className="text-sm">
                  <input type="checkbox" checked={Boolean(editorData.fields?.declarationFiliation)} onChange={(event) => updateEditorField('declarationFiliation', event.target.checked)} />
                  {' '}Je confirme la déclaration de filiation.
                </label>
                <Input placeholder="Nom du signataire" value={editorData.fields?.signatureFullName || ''} onChange={(event) => updateEditorField('signatureFullName', event.target.value)} />
              </div>
              <div className="mt-4 flex gap-3">
                <Button onClick={saveEditor} disabled={editorSaving}>
                  {editorSaving ? 'Génération...' : 'Générer le PDF'}
                </Button>
                <Button variant="outline" className="bg-white" onClick={() => setEditorData(null)}>
                  Annuler
                </Button>
              </div>
            </section>
          ) : null}

          <section className="grid gap-4 md:grid-cols-3 [content-visibility:auto] [contain-intrinsic-size:auto_160px]">
            {summary.map((item) => (
              <div key={item.label} className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-3xl font-extrabold text-foreground">{item.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </section>

          <section className="rounded-md border border-border bg-white p-4 shadow-elevation-sm">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Rechercher un document, une source, un dossier ou une pièce..." value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={type} onChange={(event) => setType(event.target.value)}>
                {types.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </section>

          <section className="rounded-md border border-primary/20 bg-secondary p-5 shadow-elevation-sm [content-visibility:auto] [contain-intrinsic-size:auto_120px]">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="font-extrabold text-foreground">Dépôt simplifié et sécurisé (Guichet unique)</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Chaque pièce est automatiquement renommée au format attendu, dans un fichier PDF unique et lisible ({INPI_UPLOAD_RULES.maxFileSizeMb} Mo max).
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Vous n&apos;avez rien à mémoriser : Greffio applique la nomenclature et contrôle la cohérence avant traitement.
                </p>
              </div>
            </div>
          </section>

          {filteredDocuments.length === 0 ? (
            <section className="rounded-md border border-dashed border-primary/30 bg-white p-8 text-center shadow-elevation-sm">
              <Archive className="mx-auto h-10 w-10 text-primary" />
              <h2 className="mt-4 text-2xl font-extrabold">Coffre documentaire vide</h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {eiLike
                  ? "Aucun document n’est encore enregistré sur le dossier actif. Les pièces EI/micro (identité, domicile, déclaration d'activité, justificatifs) apparaîtront ici après génération ou dépôt."
                  : 'Aucun document n’est encore enregistré sur le dossier actif. Les statuts, attestations, justificatifs, annonces et pièces administratives apparaîtront ici après génération ou dépôt.'}
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Button>
                  <Upload className="h-4 w-4" />
                  Ajouter une pièce
                </Button>
                <Button variant="outline" className="bg-white">
                  <FilePlus2 className="h-4 w-4" />
                  Générer un document
                </Button>
              </div>
            </section>
          ) : (
            <section className="overflow-hidden rounded-md border border-border bg-white shadow-elevation-sm [content-visibility:auto]">
              <div className="grid grid-cols-[1.4fr_140px_160px] gap-4 border-b border-border bg-muted px-5 py-3 text-xs font-bold uppercase text-muted-foreground max-lg:hidden">
                <span>Document</span>
                <span>Statut</span>
                <span>Actions</span>
              </div>
              {filteredDocuments.map((document) => (
                <DocumentsListRow
                  key={document.id}
                  document={document}
                  resolvedDossierId={resolvedDossierId}
                  isPreviewLoading={previewLoadingDocKey === document.docKey}
                  isUploading={uploadingDocKey === document.docKey}
                  isDeleting={deletingDocKey === document.docKey}
                  onPreview={openDocumentPreview}
                  onUpload={handleRowUpload}
                  onDelete={removeAttachment}
                />
              ))}
            </section>
          )}

          {internalView && apiDocuments.length > 0 ? (
            <section className="overflow-hidden rounded-md border border-dashed border-border bg-muted/30 shadow-elevation-sm">
              <div className="border-b border-border bg-muted px-5 py-3 text-xs font-bold uppercase text-muted-foreground">
                Vue technique (équipe Greffio)
              </div>
              {apiDocuments.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 border-b border-border px-5 py-3 last:border-b-0">
                  <div>
                    <p className="text-sm font-bold">{getDocumentTypeLabel(item.docKey, item.label)}</p>
                    <p className="text-xs text-muted-foreground">{item.docKey} · {item.status}</p>
                  </div>
                  <StatusBadge status={String(item.status || '').toUpperCase()} className="w-fit" />
                </div>
              ))}
            </section>
          ) : null}

          {previewDoc?.blobUrl ? (
            <section className="overflow-hidden rounded-md border border-border bg-white shadow-elevation-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
                <p className="text-sm font-bold text-foreground">Aperçu – {previewDoc.label}</p>
                <DocumentPreviewActions
                  dossierId={resolvedDossierId}
                  docKey={previewDoc.docKey}
                  document={visibleApiDocuments.find((item) => item.docKey === previewDoc.docKey) || null}
                  onDownload={() => openDocumentDownload(previewDoc.docKey)}
                />
              </div>
              <PdfPreviewPanel
                title={previewDoc.label}
                blobUrl={previewDoc.blobUrl}
                filename={previewDoc.filename}
              />
            </section>
          ) : null}

          {resolvedDossierId ? (
            <div className="text-right">
              <Button asChild variant="outline" className="bg-white">
                <Link to={`/dossier/${resolvedDossierId}`}>Retour au dossier</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
};

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import {
  uploadDossierDocument,
  downloadDossierDocument,
} from '@/api/documents.js';
import { getCurrentDossierId, saveCurrentDossierId } from '@/utils/sessionStore.js';
import { DossierVaultPickerOverlay } from '@/components/dossiers/DossierVaultPickerOverlay.jsx';
import { isInternalUser } from '@/utils/roles.js';
import { getDocumentStatusLabel, getDocumentTypeLabel } from '@/utils/documentStatusLabels.js';
import { documentHasFile, resolveClientDocumentStatus } from '@/utils/documentWorkflow.js';
import { isCapacitorNative } from '@/utils/platform.js';
import { isEiLikeFormality } from '@/config/formalities.js';
import { IdentityVerificationCard } from '@/components/identity/IdentityVerificationCard.jsx';
import { MobileOnlineDocumentsPanel } from '@/mobile/ui/MobileOnlineDocumentsPanel.jsx';
import { parseJsonField } from '@/utils/jsonField.js';
import { resolveDocumentUserAction } from '@/utils/onlineDocumentStatus.js';
import { triggerMobileHaptic } from '@/utils/mobileHaptics.js';

const FILTERS = ['Tous', 'Validés', 'En attente', 'Brouillons'];

const ONLINE_DOC_EDITOR_PATHS = {
  manager_non_conviction: (dossierId) => `/dossier/${dossierId}/declaration-non-condamnation`,
  subscribers_list: (dossierId) => `/dossier/${dossierId}/liste-souscripteurs`,
  formality_powers: (dossierId) => `/dossier/${dossierId}/pouvoirs-formalites`,
};

export const MobileDocumentsPage = () => {
  const navigate = useNavigate();
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
  const [dossierId, setDossierId] = useState(() => getCurrentDossierId());
  const [pickerOpen, setPickerOpen] = useState(false);
  const { data: dossiersList = [], isLoading: loadingDossiers } = useDossiersQuery(currentUser?.id);
  const { data: dossierPayload, isLoading: loadingDossier, isError, refetch } = useDossierQuery(dossierId);

  useEffect(() => {
    if (loadingDossiers || internalView) return;
    const items = Array.isArray(dossiersList) ? dossiersList : [];
    if (items.length <= 1) {
      if (items.length === 1) {
        saveCurrentDossierId(items[0].id);
        setDossierId(items[0].id);
      }
      setPickerOpen(false);
      return;
    }
    setPickerOpen(true);
  }, [loadingDossiers, dossiersList, internalView]);

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
    const apiDocuments = dossierPayload?.documents || [];
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
    if (file.type !== 'application/pdf') {
      setUploadError('Seuls les fichiers PDF sont autorisés.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Le fichier dépasse 10 Mo.');
      return;
    }
    try {
      setUploading(true);
      setUploadingDocKey(docKey);
      await uploadDossierDocument({
        dossierId,
        docKey,
        file,
        ownerFirstName: currentUser?.firstName || '',
        ownerLastName: currentUser?.lastName || '',
      });
      await refetch();
    } catch (_error) {
      setUploadError('Impossible d’envoyer ce fichier. Réessayez.');
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

  const openDocumentPreview = async (docKey) => {
    if (!dossierId || !docKey) return;
    setUploadError('');
    try {
      const { filename, blob } = await downloadDossierDocument({
        dossierId,
        docKey,
        inline: true,
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (_error) {
      setUploadError('Impossible d’afficher l’aperçu de ce document pour le moment.');
    }
  };

  const handleDocumentAction = (doc) => {
    void triggerMobileHaptic('light');
    const userAction = resolveDocumentUserAction(doc.status, doc.hasFile);
    const editorPath = ONLINE_DOC_EDITOR_PATHS[doc.docKey]?.(dossierId);

    if (userAction.action === 'download' || userAction.action === 'view') {
      if (doc.hasFile) {
        void openDocumentPreview(doc.docKey);
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
            actionTo="/questionnaire"
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

          <MobileOnlineDocumentsPanel dossierId={dossierId} documents={dossierPayload?.documents || []} eiLike={eiLike} />

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
            {filtered.map((doc, index) => (
              <motion.div key={doc.id || doc.docKey} {...staggerItem(index)}>
                <MobileDocumentCard
                  name={doc.name}
                  status={doc.status}
                  statusLabel={doc.statusLabel}
                  hasFile={doc.hasFile}
                  date={doc.date}
                  onAction={() => handleDocumentAction(doc)}
                />
              </motion.div>
            ))}
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
                secondaryTo="/questionnaire"
              />
            </MobileAnimatedSection>
          ) : null}
        </>
      )}
      </MobilePageContainer>
    </>
  );
};

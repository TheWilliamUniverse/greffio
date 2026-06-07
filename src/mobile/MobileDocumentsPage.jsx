import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FilePlus2,
  FileText,
  FolderKanban,
  Search,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { StatusBadge } from '@/components/StatusBadge.jsx';
import { MobileDocumentScanner } from '@/mobile/MobileDocumentScanner.jsx';
import { MobilePageSkeleton } from '@/mobile/ui/MobilePageSkeleton.jsx';
import { MobileAnimatedSection } from '@/mobile/ui/MobileAnimatedSection.jsx';
import { useMobileMotion } from '@/mobile/ui/mobileMotion.js';
import { useMobileSafeBottomPadding } from '@/hooks/useMobileSafeBottomPadding.js';
import { useAuth } from '@/hooks/useAuth.js';
import { useDossierQuery } from '@/hooks/queries/useDossierQuery.js';
import { useDossiersQuery } from '@/hooks/queries/useDossiersQuery.js';
import { uploadDossierDocument } from '@/api/documents.js';
import { getCurrentDossierId } from '@/utils/sessionStore.js';
import { isInternalUser } from '@/utils/roles.js';
import { getDocumentStatusLabel, getDocumentTypeLabel } from '@/utils/documentStatusLabels.js';
import { documentHasFile, resolveClientDocumentStatus } from '@/utils/documentWorkflow.js';
import { isCapacitorNative } from '@/utils/platform.js';
import { isEiLikeFormality } from '@/config/formalities.js';
import { IdentityVerificationCard } from '@/components/identity/IdentityVerificationCard.jsx';
import { MobileOnlineDocumentsPanel } from '@/mobile/ui/MobileOnlineDocumentsPanel.jsx';
import { parseJsonField } from '@/utils/jsonField.js';

const FILTERS = ['Tous', 'Validés', 'En attente', 'Brouillons'];

export const MobileDocumentsPage = () => {
  const { currentUser } = useAuth();
  const internalView = isInternalUser(currentUser);
  const bottomPad = useMobileSafeBottomPadding();
  const { staggerItem } = useMobileMotion();
  const uploadRef = useRef(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Tous');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dossierId, setDossierId] = useState(() => getCurrentDossierId());
  const { data: dossiersList = [], isLoading: loadingDossiers } = useDossiersQuery(currentUser?.id);
  const { data: dossierPayload, isLoading: loadingDossier, isError, refetch } = useDossierQuery(dossierId);

  useEffect(() => {
    if (dossierId || !dossiersList.length) return;
    setDossierId(dossiersList[0]?.id || null);
  }, [dossierId, dossiersList]);

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
        || (filter === 'En attente' && ['PENDING', 'UPLOADED', 'REVIEW'].includes(doc.status))
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

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !dossierId) return;
    try {
      setUploading(true);
      setUploadError('');
      await uploadDossierDocument({ dossierId, docKey: 'identity_proof', file });
      await refetch();
    } catch (_error) {
      setUploadError('Impossible d’envoyer ce fichier. Réessayez.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  if (loadingDossiers || (loadingDossier && dossierId)) return <MobilePageSkeleton />;

  return (
    <div className={`space-y-5 px-4 py-5 ${bottomPad}`}>
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
      </MobileAnimatedSection>

      {!dossierId ? (
        <MobileAnimatedSection delay={0.05}>
          <div className="rounded-3xl border border-dashed border-border bg-muted/30 p-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-primary" />
            <h2 className="mt-3 text-base font-extrabold">Aucun dossier actif</h2>
            <p className="mt-2 text-sm text-muted-foreground">Lancez une formalité pour déposer vos pièces.</p>
            <Button asChild className="mt-5 h-11 w-full rounded-2xl">
              <Link to="/questionnaire">Nouvelle formalité</Link>
            </Button>
          </div>
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

          <MobileOnlineDocumentsPanel dossierId={dossierId} eiLike={eiLike} />

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
              <motion.article
                key={doc.id || doc.docKey}
                {...staggerItem(index)}
                className="rounded-3xl border border-border/70 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary">
                      <FileText className="h-5 w-5 text-primary" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-extrabold leading-snug">{doc.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{doc.statusLabel}</p>
                    </div>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>
                {doc.date ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Mis à jour le {new Date(doc.date).toLocaleDateString('fr-FR')}
                  </p>
                ) : null}
              </motion.article>
            ))}
          </div>

          {!filtered.length && !isError ? (
            <MobileAnimatedSection delay={0.12}>
              <div className="rounded-3xl border border-dashed border-border bg-muted/30 p-8 text-center">
                <FilePlus2 className="mx-auto h-8 w-8 text-primary" />
                <h2 className="mt-3 text-base font-extrabold">Aucun document</h2>
                <p className="mt-2 text-sm text-muted-foreground">Vos pièces apparaîtront ici dès qu’une formalité sera lancée.</p>
                <Button asChild className="mt-5 h-11 w-full rounded-2xl">
                  <Link to={`/dossier/${dossierId}`}>
                    <FolderKanban className="h-4 w-4" />
                    Ouvrir le dossier
                  </Link>
                </Button>
              </div>
            </MobileAnimatedSection>
          ) : null}
        </>
      )}
    </div>
  );
};

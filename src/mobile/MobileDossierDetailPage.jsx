import React, { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, MessageSquareText, Upload } from 'lucide-react';
import { useDossierQuery } from '@/hooks/queries/useDossierQuery.js';
import { saveCurrentDossierId } from '@/utils/sessionStore.js';
import { DossierBreadcrumb } from '@/components/layout/DossierBreadcrumb.jsx';
import { MobilePageSkeleton } from '@/mobile/ui/MobilePageSkeleton.jsx';
import { MobilePageContainer } from '@/mobile/ui/MobilePageContainer.jsx';
import { OfflineDataBanner } from '@/components/system/OfflineDataBanner.jsx';
import { StatusBadge } from '@/components/StatusBadge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { MobileDocumentUploadSheet } from '@/mobile/MobileDocumentUploadSheet.jsx';
import { MobileOnlineDocumentsPanel } from '@/mobile/ui/MobileOnlineDocumentsPanel.jsx';
import { MobileDossierStatusCard } from '@/mobile/ui/MobileDossierStatusCard.jsx';
import { MobileDossierTimeline } from '@/mobile/ui/MobileDossierTimeline.jsx';
import { MobileAnimatedSection } from '@/mobile/ui/MobileAnimatedSection.jsx';
import { IdentityVerificationCard } from '@/components/identity/IdentityVerificationCard.jsx';
import { parseJsonField } from '@/utils/jsonField.js';
import { isEiLikeFormality } from '@/config/formalities.js';
import { documentHasFile, resolveClientDocumentStatus } from '@/utils/documentWorkflow.js';
import { resolveFormalityPublicLabel } from '@/config/formalityLabels.js';
import { getDocumentTypeLabel } from '@/utils/documentStatusLabels.js';
import { DossierTrashActions } from '@/components/dossiers/DossierTrashActions.jsx';
import { DossierDeleteAction } from '@/components/dossiers/DossierDeleteAction.jsx';
import { MobileDocumentPreviewSheet } from '@/mobile/ui/MobileDocumentPreviewSheet.jsx';
import { useDossierDocumentPreview } from '@/hooks/useDossierDocumentPreview.js';
import { cn } from '@/lib/utils.js';
import { toast } from 'sonner';

const SECTION_PILLS = [
  { id: 'resume', label: 'Résumé' },
  { id: 'documents', label: 'Documents' },
  { id: 'actions', label: 'Actions' },
  { id: 'messages', label: 'Messages' },
];

const mapDocuments = (documents = []) => documents.map((doc) => {
  const hasFile = documentHasFile(doc);
  const status = resolveClientDocumentStatus({ ...doc, hasFile });
  return {
    id: doc.id,
    docKey: doc.docKey,
    name: getDocumentTypeLabel(doc.docKey, doc.label),
    status,
    updatedAt: doc.updatedAt || doc.createdAt,
    hasFile,
  };
});

export const MobileDossierDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedDocKey, setSelectedDocKey] = useState('identity_proof');
  const [activeSection, setActiveSection] = useState('resume');
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useDossierQuery(id);
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
  const sectionRefs = useRef({});

  const dossier = data?.dossier;
  const docs = useMemo(() => mapDocuments(data?.documents || []), [data?.documents]);

  React.useEffect(() => {
    if (id) saveCurrentDossierId(id);
  }, [id]);

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    sectionRefs.current[sectionId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (isLoading) return <MobilePageSkeleton />;

  if (isError || !dossier) {
    return (
      <MobilePageContainer spacing="compact">
        <Button type="button" variant="ghost" className="h-10 px-0" onClick={() => navigate('/dossiers')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Dossier introuvable ou accès refusé.
          <Button type="button" variant="outline" className="mt-3 h-10 w-full bg-white" onClick={() => refetch()} disabled={isFetching}>
            Réessayer
          </Button>
        </div>
      </MobilePageContainer>
    );
  }

  const questionnaire = parseJsonField(dossier.dataJson, {});
  const progress = Number(dossier.progressPercent || 0);
  const pendingDocs = docs.filter((doc) => ['ATTENTE_DOCS', 'BROUILLON', 'URGENT', 'A_SIGNER'].includes(doc.status));
  const identityDocUploaded = docs.some((doc) => doc.docKey === 'identity_proof' && doc.hasFile);
  const eiLike = isEiLikeFormality({
    legalForm: dossier.legalForm,
    formeJuridique: questionnaire.formeJuridique,
    service: dossier.service,
    typeFormalite: questionnaire.typeFormalite,
  });

  return (
    <MobilePageContainer>
      <DossierBreadcrumb
        dossierId={id}
        dossierName={dossier.companyName || dossier.denomination || 'Formalité'}
      />
      {isError ? <OfflineDataBanner cachedAt={dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null} /> : null}

      <div ref={(node) => { sectionRefs.current.resume = node; }}>
        <MobileDossierStatusCard dossier={dossier} documents={docs} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SECTION_PILLS.map((pill) => (
          <button
            key={pill.id}
            type="button"
            onClick={() => scrollToSection(pill.id)}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-xs font-bold transition',
              activeSection === pill.id
                ? 'bg-[hsl(var(--greffio-blue))] text-white'
                : 'bg-white text-muted-foreground ring-1 ring-border',
            )}
          >
            {pill.label}
          </button>
        ))}
      </div>

      <MobileDossierTimeline dossier={dossier} />

      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-white via-secondary/20 to-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary/80">Dossier</p>
            <h1 className="mt-1 text-xl font-extrabold text-[hsl(var(--greffio-blue-900))]">
              {dossier.companyName || dossier.denomination || 'Formalité'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {resolveFormalityPublicLabel({
                service: dossier.service,
                typeFormalite: questionnaire.typeFormalite,
                formeJuridique: dossier.legalForm || questionnaire.formeJuridique,
                legalForm: dossier.legalForm,
              })}
            </p>
          </div>
          <StatusBadge status={String(dossier.status || '').toUpperCase()} />
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs font-semibold text-muted-foreground">
            <span>Avancement</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2.5" />
        </div>
      </div>

      <section ref={(node) => { sectionRefs.current.actions = node; }} className="space-y-4">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            className="h-auto min-h-[88px] flex-col items-start gap-2 rounded-2xl px-4 py-4"
            onClick={() => {
              setSelectedDocKey(pendingDocs[0]?.docKey || 'identity_proof');
              setUploadOpen(true);
            }}
          >
            <Upload className="h-5 w-5" />
            <span className="text-left text-sm font-bold">Envoyer une pièce</span>
          </Button>
          <Button asChild variant="outline" className="h-auto min-h-[88px] flex-col items-start gap-2 rounded-2xl bg-white px-4 py-4">
            <Link to="/mobile/search" onClick={() => setActiveSection('messages')}>
              <MessageSquareText className="h-5 w-5 text-primary" />
              <span className="text-left text-sm font-bold">Assistant Greffio</span>
            </Link>
          </Button>
        </div>
        <DossierTrashActions dossier={dossier} compact />
      </section>

      <div ref={(node) => { sectionRefs.current.documents = node; }}>
        <MobileOnlineDocumentsPanel
          dossierId={id}
          documents={data?.documents || []}
          eiLike={eiLike}
          delay={0.03}
          onDocumentAction={(item, state) => {
            navigate(item.to(id));
          }}
          onDocumentPreview={({ docKey, label }) => {
            void openPreview({ dossierId: id, docKey, label }).then((result) => {
              if (!result.ok) toast.error(result.error || 'Impossible d’afficher ce document.');
            });
          }}
          previewLoadingDocKey={loadingDocKey}
        />
      </div>

      <MobileAnimatedSection delay={0.05}>
        <IdentityVerificationCard
          dossierId={id}
          identityDocUploaded={identityDocUploaded}
          onVerificationUpdated={() => { void refetch(); }}
        />
      </MobileAnimatedSection>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">Documents</h2>
          <Link to="/documents" className="text-xs font-semibold text-primary">Tout voir</Link>
        </div>
        {docs.length ? docs.slice(0, 6).map((doc) => (
          <div key={doc.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-white p-3">
            <div className="flex min-w-0 items-center gap-3">
              <FileText className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{doc.name}</p>
                <p className="text-xs text-muted-foreground">{new Date(doc.updatedAt).toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
            <StatusBadge status={doc.status} />
          </div>
        )) : (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Aucun document listé pour l’instant.
          </p>
        )}
      </section>

      <div className="mt-6 border-t border-border/70 pt-5">
        <DossierDeleteAction dossier={dossier} compact />
      </div>

      <div ref={(node) => { sectionRefs.current.messages = node; }} className="rounded-2xl border border-border/70 bg-white p-4">
        <h2 className="text-sm font-extrabold">Messages Greffio</h2>
        <p className="mt-2 text-sm text-muted-foreground">Échanges liés à ce dossier avec l’équipe.</p>
        <Button asChild variant="outline" className="mt-4 h-11 w-full rounded-2xl bg-white">
          <Link to="/team">Ouvrir la messagerie</Link>
        </Button>
      </div>

      <MobileDocumentUploadSheet
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        dossierId={id}
        docKey={selectedDocKey}
        onUploaded={() => refetch()}
      />
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
        dossierId={previewDoc?.dossierId || id}
        docKey={previewDoc?.docKey}
        document={(data?.documents || []).find((item) => item.docKey === previewDoc?.docKey) || null}
        onClose={closePreview}
        onDownload={() => {
          void downloadPreview().then((result) => {
            if (result.ok) {
              toast.success('Document enregistré dans l’application Fichiers.');
              return;
            }
            toast.error(result.error || 'Impossible de télécharger ce document.');
          });
        }}
        onOpenExternal={() => {
          void openPreviewInSystemViewer().then((result) => {
            if (!result.ok) toast.error(result.error || 'Impossible d’ouvrir ce document.');
          });
        }}
      />
    </MobilePageContainer>
  );
};

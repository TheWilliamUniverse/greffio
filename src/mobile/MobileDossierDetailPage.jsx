import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, MessageSquareText, Upload } from 'lucide-react';
import { useDossierQuery } from '@/hooks/queries/useDossierQuery.js';
import { saveCurrentDossierId } from '@/utils/sessionStore.js';
import { DossierBreadcrumb } from '@/components/layout/DossierBreadcrumb.jsx';
import { MobilePageSkeleton } from '@/mobile/ui/MobilePageSkeleton.jsx';
import { OfflineDataBanner } from '@/components/system/OfflineDataBanner.jsx';
import { StatusBadge } from '@/components/StatusBadge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { MobileDocumentUploadSheet } from '@/mobile/MobileDocumentUploadSheet.jsx';
import { MobileOnlineDocumentsPanel } from '@/mobile/ui/MobileOnlineDocumentsPanel.jsx';
import { MobileAnimatedSection } from '@/mobile/ui/MobileAnimatedSection.jsx';
import { IdentityVerificationCard } from '@/components/identity/IdentityVerificationCard.jsx';
import { parseJsonField } from '@/utils/jsonField.js';
import { isEiLikeFormality } from '@/config/formalities.js';
import { documentHasFile, resolveClientDocumentStatus } from '@/utils/documentWorkflow.js';
import { resolveFormalityPublicLabel } from '@/config/formalityLabels.js';
import { getDocumentTypeLabel } from '@/utils/documentStatusLabels.js';

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
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useDossierQuery(id);

  const dossier = data?.dossier;
  const docs = useMemo(() => mapDocuments(data?.documents || []), [data?.documents]);

  React.useEffect(() => {
    if (id) saveCurrentDossierId(id);
  }, [id]);

  if (isLoading) return <MobilePageSkeleton />;

  if (isError || !dossier) {
    return (
      <div className="space-y-4 px-4 py-5">
        <Button type="button" variant="ghost" className="h-10 px-0" onClick={() => navigate('/dossiers')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Dossier introuvable ou accès refusé.
          <Button type="button" variant="outline" className="mt-3 h-10 w-full bg-white" onClick={() => refetch()} disabled={isFetching}>
            Réessayer
          </Button>
        </div>
      </div>
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
    <div className="space-y-5 px-4 py-5 pb-28">
      <DossierBreadcrumb
        dossierId={id}
        dossierName={dossier.companyName || dossier.denomination || 'Formalité'}
      />
      {isError ? <OfflineDataBanner cachedAt={dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null} /> : null}

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
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3">
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
          <Link to="/mobile/search">
            <MessageSquareText className="h-5 w-5 text-primary" />
            <span className="text-left text-sm font-bold">Assistant Greffio</span>
          </Link>
        </Button>
      </section>

      <MobileOnlineDocumentsPanel dossierId={id} documents={data?.documents || []} eiLike={eiLike} delay={0.03} />

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

      <MobileDocumentUploadSheet
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        dossierId={id}
        docKey={selectedDocKey}
        onUploaded={() => refetch()}
      />
    </div>
  );
};

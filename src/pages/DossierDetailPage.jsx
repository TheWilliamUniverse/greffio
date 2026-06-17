import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CalendarClock, CheckCircle2, Clock3, Eye, FileText, Loader2, PencilLine, Upload } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar.jsx';
import { StatusBadge } from '@/components/StatusBadge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { fetchDossierDetail } from '@/api/dossiers.js';
import { downloadDossierDocument } from '@/api/documents.js';
import { fetchDossierMessages, fetchOpsDossierMessages, postDossierMessage, postOpsDossierMessage } from '@/api/dossierMessages.js';
import { useDossierMessagesRealtime, sendDossierMessageOptimistic } from '@/hooks/useDossierMessagesRealtime.js';
import { fetchVerificationProfile, runDossierVerification } from '@/api/verification.js';
import { VerificationStatusCard } from '@/components/verification/VerificationStatusCard.jsx';
import { saveCurrentDossierId } from '@/utils/sessionStore.js';
import { isEiLikeFormality } from '@/config/formalities.js';
import { resolveFormalityPublicLabel } from '@/config/formalityLabels.js';
import { parseJsonField } from '@/utils/jsonField.js';
import { isInternalUser } from '@/utils/roles.js';
import { useAuth } from '@/hooks/useAuth.js';
import { toast } from 'sonner';
import { DossierTrashActions } from '@/components/dossiers/DossierTrashActions.jsx';
import { DossierDeleteAction } from '@/components/dossiers/DossierDeleteAction.jsx';
import { DossierBreadcrumb } from '@/components/layout/DossierBreadcrumb.jsx';
import {
  canShowDocumentModifyAction,
  resolveDocumentWorkspaceEditPath,
} from '@/utils/documentWorkspace.js';
import { mapDossierStatusForBadge, mapDossierClientAction } from '@/utils/dossierClientStatus.js';
import { DossierMessageThread } from '@/components/messaging/DossierMessageThread.jsx';
import {
  documentHasFile,
  filterClientActionRequiredDocuments,
  filterClientVisibleDocuments,
  formatDocumentRejectionHint,
  getClientDocumentReviewHint,
  resolveClientDocumentStatus,
} from '@/utils/documentWorkflow.js';

const mapDossierFromApi = (d) => {
  const questionnaire = parseJsonField(d.dataJson, {});
  const eiLike = isEiLikeFormality({
    legalForm: d.legalForm || questionnaire.formeJuridique,
    typeFormalite: questionnaire.typeFormalite,
    service: d.service,
  });
  return {
    id: d.id,
    name: d.companyName || d.denomination || 'Dossier',
    legalForm: d.legalForm || d.formeJuridique || 'SASU',
    owner: 'Client',
    status: mapDossierStatusForBadge(d.status),
    priority: 'Normale',
    phase: resolveFormalityPublicLabel({
      service: d.service,
      typeFormalite: questionnaire.typeFormalite || d.typeFormalite,
      formeJuridique: d.legalForm || d.formeJuridique || questionnaire.formeJuridique,
      legalForm: d.legalForm,
    }),
    nextAction: mapDossierClientAction(d.status, d.progressPercent),
    expert: d.assignedToUserId || 'Équipe Greffio',
    createdAt: d.createdAt,
    dueDate: d.updatedAt || d.createdAt,
    progress: Number(d.progressPercent || 0),
    currentStep: Math.max(1, Math.round(Number(d.progressPercent || 0) / 20)),
    totalSteps: 5,
    blockers: [],
    project: {
      initiatorType: questionnaire.initiatorType || 'personne_physique',
      initiatorName: [questionnaire.firstName, questionnaire.lastName].filter(Boolean).join(' ') || 'Client',
      nationality: questionnaire.nationality || '',
      companyCountry: questionnaire.companyCountry || '',
      siren: questionnaire.companySiren || questionnaire.existingBusinessSiren || '',
      companyName: questionnaire.companyName || questionnaire.existingBusinessName || d.companyName || '',
    },
    steps: [
      { label: 'Informations dossier', done: Number(d.progressPercent || 0) >= 20 },
      { label: 'Documents justificatifs', done: Number(d.progressPercent || 0) >= 40 },
      { label: 'Contrôle Greffio', done: Number(d.progressPercent || 0) >= 60 },
      { label: 'Signature', done: Number(d.progressPercent || 0) >= 80 },
      { label: 'Dépôt formalité', done: Number(d.progressPercent || 0) >= 100 },
    ].filter((stepItem) => !(eiLike && stepItem.label.toLowerCase().includes('statuts'))),
  };
};

const mapDocumentsFromApi = (documents = [], { internalView = false } = {}) => filterClientVisibleDocuments(documents).map((doc) => {
  const metadata = parseJsonField(doc.metadata, {});
  const hasFile = documentHasFile(doc);
  const rawStatus = String(doc.status || '').toUpperCase();
  const displayStatus = internalView ? rawStatus : resolveClientDocumentStatus({ ...doc, hasFile });
  return {
    id: doc.id,
    name: getDocumentTypeLabel(doc.docKey, doc.label),
    type: getDocumentTypeLabel(doc.docKey, doc.label),
    size: doc.fileSizeBytes ? `${Math.round(Number(doc.fileSizeBytes) / 1024)} Ko` : 'N/A',
    providedBy: doc.reviewerId ? 'Greffio' : 'Client',
    source: internalView ? 'API' : null,
    status: displayStatus,
    date: doc.updatedAt || doc.createdAt,
    dossierId: doc.dossierId,
    docKey: doc.docKey,
    hasFile,
    metadata,
    rejectedReason: doc.rejectedReason || null,
    reviewHint: internalView
      ? (metadata?.analysis?.requiresManualReview ? 'Vérification manuelle requise' : 'Analyse auto OK')
      : getClientDocumentReviewHint({ metadata }),
    confidence: internalView ? (metadata?.analysis?.confidence ?? null) : null,
  };
});

export const DossierDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const internalView = isInternalUser(currentUser);
  const [dossier, setDossier] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState('');
  const {
    messages,
    setMessages,
    loading: messagesLoading,
  } = useDossierMessagesRealtime(
    id,
    internalView ? fetchOpsDossierMessages : fetchDossierMessages,
    { enabled: Boolean(id) },
  );
  const [verificationProfile, setVerificationProfile] = useState(null);
  const [verificationRunning, setVerificationRunning] = useState(false);
  const [docPreviewing, setDocPreviewing] = useState('');
  const missingDocuments = useMemo(() => filterClientActionRequiredDocuments(docs), [docs]);
  const timeline = useMemo(() => {
    if (!dossier) return [];
    return [
      { id: 'created', action: 'Dossier ouvert', actor: dossier.owner, date: dossier.createdAt, target: dossier.name },
      ...docs.map((document) => ({ id: document.id, action: document.status === 'BROUILLON' ? 'Document préparé' : 'Document ajouté', actor: document.providedBy, date: document.date, target: document.name })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [dossier, docs]);

  useEffect(() => {
    if (id && internalView) {
      navigate(`/ops/dossiers/${encodeURIComponent(id)}`, { replace: true });
    }
  }, [id, internalView, navigate]);

  useEffect(() => {
    const load = async () => {
      if (!id || internalView) {
        if (!id) setLoading(false);
        return;
      }
      saveCurrentDossierId(id);
      setLoading(true);
      setAccessError('');
      try {
        const payload = await fetchDossierDetail(id, { allowOpsFallback: internalView });
        const d = payload.dossier;
        if (!d?.id) {
          setDossier(null);
          setDocs([]);
          setAccessError('DOSSIER_NOT_FOUND');
          return;
        }
        setDossier(mapDossierFromApi(d));
        setDocs(mapDocumentsFromApi(payload.documents || [], { internalView }));
        try {
          const profile = await fetchVerificationProfile(id);
          setVerificationProfile(profile);
        } catch (_error) {
          setVerificationProfile(null);
        }
      } catch (error) {
        setDossier(null);
        setDocs([]);
        setAccessError(String(error?.code || error?.payload?.error || 'DOSSIER_NOT_FOUND'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id, internalView]);

  const handleRunVerification = async () => {
    if (!id) return;
    setVerificationRunning(true);
    try {
      const result = await runDossierVerification(id);
      setVerificationProfile(result.profile || null);
      toast.success('Vérifications mises à jour');
    } catch (error) {
      toast.error(error?.message || 'Impossible de lancer les vérifications');
    } finally {
      setVerificationRunning(false);
    }
  };

  const openDocumentPreview = async (docKey) => {
    if (!id || !docKey) return;
    setDocPreviewing(docKey);
    try {
      const { blob } = await downloadDossierDocument({ dossierId: id, docKey, inline: true });
      const url = window.URL.createObjectURL(blob);
      const previewWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (!previewWindow) {
        window.URL.revokeObjectURL(url);
        toast.error('Autorisez les pop-ups pour ouvrir l’aperçu du document.');
        return;
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 120_000);
    } catch (_error) {
      toast.error('Impossible d’afficher l’aperçu de ce document pour le moment.');
    } finally {
      setDocPreviewing('');
    }
  };

  if (internalView) {
    return (
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center p-8">
          <p className="text-sm font-medium text-muted-foreground">Ouverture du dossier dans le cockpit ops…</p>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center p-8">
          <p className="text-sm font-medium text-muted-foreground">Chargement du dossier...</p>
        </main>
      </div>
    );
  }

  if (!dossier) {
    return (
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8">
          <section className="mx-auto max-w-3xl rounded-md border border-border bg-white p-8 text-center shadow-elevation-sm">
            <h1 className="text-2xl font-extrabold">Dossier introuvable</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {internalView
                ? 'Ce dossier est absent de la plateforme ou l’identifiant est invalide.'
                : accessError === 'DOSSIER_FORBIDDEN'
                  ? 'Vous n’avez pas accès à ce dossier avec ce compte client.'
                  : 'Ce dossier n’existe pas dans votre espace client.'}
            </p>
            {internalView ? (
              <Button asChild variant="outline" className="mt-4 bg-white">
                <Link to="/ops/cockpit">Ouvrir le pilotage Ops</Link>
              </Button>
            ) : null}
            <Button asChild className="mt-6">
              <Link to="/dossiers">Retour aux dossiers</Link>
            </Button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-5 md:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <DossierBreadcrumb dossierId={id} dossierName={dossier.name} />
          <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
            <Link to="/dossiers">
              <ArrowLeft className="h-4 w-4" />
              Retour aux dossiers
            </Link>
          </Button>

          <section className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
            <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-extrabold text-foreground">{dossier.name}</h1>
                  <StatusBadge status={dossier.status} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Responsable : {dossier.expert} · Phase : {dossier.phase}</p>
                <p className="mt-2 text-sm font-semibold text-primary">Prochaine action : {dossier.nextAction}</p>
                <div className="mt-3 rounded-md border border-border bg-muted p-3 text-xs text-muted-foreground">
                  Espace renforcé pour profils personne physique et personne morale: informations d’identité, justificatifs, statut de signature et suivi de dépôt centralisés au même endroit.
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-4">
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-xs uppercase text-muted-foreground">Type</p>
                    <p className="mt-1 font-bold">{dossier.project?.initiatorType === 'personne_morale' ? 'Personne morale' : 'Personne physique'}</p>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-xs uppercase text-muted-foreground">Déclarant</p>
                    <p className="mt-1 font-bold">{dossier.project?.initiatorName || 'N/A'}</p>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-xs uppercase text-muted-foreground">SIREN</p>
                    <p className="mt-1 font-bold">{dossier.project?.siren || 'N/A'}</p>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-xs uppercase text-muted-foreground">Pays/Nationalité</p>
                    <p className="mt-1 font-bold">{dossier.project?.companyCountry || dossier.project?.nationality || 'N/A'}</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Forme</p>
                    <p className="mt-1 font-extrabold">{dossier.legalForm}</p>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Échéance</p>
                    <p className="mt-1 font-extrabold">{new Date(dossier.dueDate).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Documents</p>
                    <p className="mt-1 font-extrabold">{docs.length} pièce(s)</p>
                  </div>
                </div>
              </div>
              <div>
                <div className="mb-2 text-sm font-bold text-primary">
                  {dossier.nextAction}
                </div>
                <Progress value={dossier.progress || 0} className="h-3" />
                {dossier.blockers.length > 0 && (
                  <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertTriangle className="h-4 w-4" />
                      À débloquer
                    </div>
                    <p className="mt-1">{dossier.blockers.join(' · ')}</p>
                  </div>
                )}
                <Button asChild className="mt-5 w-full">
                  <Link to="/documents">
                    <Upload className="h-4 w-4" />
                    Ajouter une pièce
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          <VerificationStatusCard
            profile={verificationProfile}
            onRun={handleRunVerification}
            running={verificationRunning}
            internalView={internalView}
          />

          <Tabs defaultValue="progress" className="w-full">
            <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-md border border-border bg-white p-1">
              <TabsTrigger value="progress">Avancement</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="tasks">Actions</TabsTrigger>
              <TabsTrigger value="timeline">Historique</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
            </TabsList>

            <TabsContent value="progress" className="mt-5">
              <div className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
                <div className="grid gap-3 md:grid-cols-2">
                  {(dossier.steps || []).map((step, index) => (
                    <div key={step.label} className={`rounded-md border p-4 ${step.done ? 'border-emerald-200 bg-emerald-50' : 'border-border bg-muted'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step.done ? 'bg-emerald-600 text-white' : 'bg-white text-muted-foreground'}`}>
                          {step.done ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase text-muted-foreground">Étape {index + 1}</p>
                          <p className="font-extrabold">{step.label}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="documents" className="mt-5">
              <div className="overflow-hidden rounded-md border border-border bg-white shadow-elevation-sm">
                {docs.length ? docs.map((document) => (
                  <div key={document.id} className={`grid gap-4 border-b border-border p-4 last:border-b-0 lg:items-center ${internalView ? 'lg:grid-cols-[1fr_170px_150px_130px]' : 'lg:grid-cols-[1fr_150px_130px]'}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold">{document.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {document.date
                            ? `Mis à jour le ${new Date(document.date).toLocaleDateString('fr-FR')}`
                            : 'En attente de dépôt'}
                          {' · '}fourni par {document.providedBy}
                        </p>
                        {document.reviewHint ? (
                          <p className="mt-1 text-xs font-semibold text-primary">
                            {document.reviewHint}
                            {typeof document.confidence === 'number' ? ` (${document.confidence}%)` : ''}
                          </p>
                        ) : null}
                        {['REJECTED', 'INVALID'].includes(document.status) && document.rejectedReason ? (
                          <p className="mt-1 text-xs text-destructive">{formatDocumentRejectionHint(document)}</p>
                        ) : null}
                      </div>
                    </div>
                    {internalView ? (
                      <span className="text-sm font-semibold text-foreground">{document.source}</span>
                    ) : null}
                    <StatusBadge status={document.status} className="w-fit" />
                    <div className="flex flex-wrap gap-2">
                      {canShowDocumentModifyAction({ docKey: document.docKey, document }) ? (
                        <Button
                          variant="default"
                          size="sm"
                          asChild
                        >
                          <Link to={resolveDocumentWorkspaceEditPath(id, document.docKey)}>
                            <PencilLine className="h-4 w-4" />
                            Modifier
                          </Link>
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white"
                        disabled={!document.hasFile || docPreviewing === document.docKey}
                        onClick={() => void openDocumentPreview(document.docKey)}
                      >
                        {docPreviewing === document.docKey ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        Aperçu
                      </Button>
                    </div>
                  </div>
                )) : (
                  <div className="p-5 text-sm text-muted-foreground">Aucun document n’est encore relié à ce dossier.</div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="mt-5">
              <DossierTrashActions dossier={dossier} className="mb-5" />
              <div className="grid gap-4 md:grid-cols-2">
                {[dossier.nextAction, ...missingDocuments.map((document) => `Compléter ${document.name}`)].map((task) => (
                  <div key={task} className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
                    <CalendarClock className="mb-4 h-5 w-5 text-primary" />
                    <p className="font-extrabold">{task}</p>
                    <p className="mt-2 text-sm text-muted-foreground">Action visible par le client et l’équipe Greffio.</p>
                  </div>
                ))}
              </div>
              {!internalView ? (
                <DossierDeleteAction dossier={dossier} className="mt-5" />
              ) : null}
            </TabsContent>

            <TabsContent value="timeline" className="mt-5">
              <div className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
                <div className="space-y-4">
                  {timeline.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-primary">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold">{item.action}</p>
                        <p className="text-sm text-muted-foreground">{item.actor} · {item.target} · {new Date(item.date).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="messages" className="mt-5">
              <DossierMessageThread
                messages={messages}
                loading={messagesLoading}
                onSend={async (body) => {
                  await sendDossierMessageOptimistic({
                    dossierId: id,
                    body,
                    setMessages,
                    postMessage: internalView ? postOpsDossierMessage : postDossierMessage,
                    authorType: internalView ? 'ops' : 'client',
                    authorName: internalView ? 'Équipe Greffio' : 'Vous',
                  });
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

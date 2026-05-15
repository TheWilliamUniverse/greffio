import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CalendarClock, CheckCircle2, Clock3, FileText, MessageSquareText, Send, Upload } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar.jsx';
import { StatusBadge } from '@/components/StatusBadge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { getChatHistory, getDocuments, getDossiers } from '@/utils/localStorage.js';
import { getDossierById } from '@/api/dossiers.js';

export const DossierDetailPage = () => {
  const { id } = useParams();
  const dossiers = getDossiers();
  const [apiDossier, setApiDossier] = useState(null);
  const [apiDocs, setApiDocs] = useState([]);
  const dossier = apiDossier || dossiers.find((item) => item.id === id);
  const docs = apiDocs.length ? apiDocs : getDocuments().filter((document) => document.dossierId === id);
  const messages = getChatHistory().filter((message) => !message.dossierId || message.dossierId === id);
  const [comment, setComment] = useState('');
  const missingDocuments = useMemo(() => docs.filter((document) => ['ATTENTE_DOCS', 'URGENT', 'EN_ANALYSE', 'A_SIGNER', 'BROUILLON'].includes(document.status)), [docs]);
  const timeline = useMemo(() => {
    if (!dossier) return [];
    return [
      { id: 'created', action: 'Dossier ouvert', actor: dossier.owner, date: dossier.createdAt, target: dossier.name },
      ...docs.map((document) => ({ id: document.id, action: document.status === 'BROUILLON' ? 'Document préparé' : 'Document ajouté', actor: document.providedBy, date: document.date, target: document.name })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [dossier, docs]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const payload = await getDossierById(id);
        const d = payload.dossier;
        const questionnaire = d.dataJson ? JSON.parse(d.dataJson) : {};
        setApiDossier({
          id: d.id,
          name: d.companyName || d.denomination || 'Dossier',
          legalForm: d.legalForm || d.formeJuridique || 'SASU',
          owner: 'Client',
          status: String(d.status || '').toUpperCase(),
          priority: 'Normale',
          phase: d.service || 'formalite',
          nextAction: 'Compléter les pièces demandées et valider les informations.',
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
          ],
        });
        setApiDocs((payload.documents || []).map((doc) => ({
          id: doc.id,
          name: doc.label,
          type: doc.docKey,
          size: doc.fileSizeBytes ? `${Math.round(Number(doc.fileSizeBytes) / 1024)} Ko` : 'N/A',
          providedBy: doc.reviewerId ? 'Greffio' : 'Client',
          source: 'API',
          status: String(doc.status || '').toUpperCase(),
          date: doc.updatedAt || doc.createdAt,
          dossierId: doc.dossierId,
        })));
      } catch (_error) {
        // fallback to local mock
      }
    };
    void load();
  }, [id]);

  if (!dossier) {
    return (
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8">
          <section className="mx-auto max-w-3xl rounded-md border border-border bg-white p-8 text-center shadow-elevation-sm">
            <h1 className="text-2xl font-extrabold">Dossier introuvable</h1>
            <p className="mt-2 text-sm text-muted-foreground">Ce dossier n’existe pas dans votre espace client.</p>
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
                <div className="mb-2 flex justify-between text-sm font-bold">
                  <span>Étape {dossier.currentStep || 0}/{dossier.totalSteps || dossier.steps.length || 0}</span>
                  <span>{dossier.progress || 0}%</span>
                </div>
                <div className="h-3 rounded-full bg-muted">
                  <div className="h-3 rounded-full bg-primary" style={{ width: `${dossier.progress || 0}%` }} />
                </div>
                {dossier.blockers.length > 0 && (
                  <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertTriangle className="h-4 w-4" />
                      À débloquer
                    </div>
                    <p className="mt-1">{dossier.blockers.join(' · ')}</p>
                  </div>
                )}
                <Button className="mt-5 w-full">
                  <Upload className="h-4 w-4" />
                  Ajouter une pièce
                </Button>
              </div>
            </div>
          </section>

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
                  <div key={document.id} className="grid gap-4 border-b border-border p-4 last:border-b-0 lg:grid-cols-[1fr_170px_150px_130px] lg:items-center">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold">{document.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{document.type} · {document.size} · fourni par {document.providedBy}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{document.source}</span>
                    <StatusBadge status={document.status} className="w-fit" />
                    <Button variant="outline" size="sm" className="bg-white">Aperçu</Button>
                  </div>
                )) : (
                  <div className="p-5 text-sm text-muted-foreground">Aucun document n’est encore relié à ce dossier.</div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="mt-5">
              <div className="grid gap-4 md:grid-cols-2">
                {[dossier.nextAction, ...missingDocuments.map((document) => `Compléter ${document.name}`)].map((task) => (
                  <div key={task} className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
                    <CalendarClock className="mb-4 h-5 w-5 text-primary" />
                    <p className="font-extrabold">{task}</p>
                    <p className="mt-2 text-sm text-muted-foreground">Action visible par le client et l’équipe Greffio.</p>
                  </div>
                ))}
              </div>
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
              <div className="rounded-md border border-border bg-white shadow-elevation-sm">
                <div className="border-b border-border p-5">
                  <div className="flex items-center gap-2">
                    <MessageSquareText className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-extrabold">Discussion rattachée au dossier</h2>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Fil partagé entre le client, l’équipe Greffio et les intervenants autorisés.</p>
                </div>
                <div className="space-y-3 p-5">
                  {messages.length ? messages.map((message) => (
                    <div key={message.id} className={`max-w-[82%] rounded-md p-4 text-sm ${message.from === 'client' ? 'ml-auto bg-[hsl(var(--greffio-blue))] text-white' : 'bg-muted text-foreground'}`}>
                      {message.text}
                    </div>
                  )) : (
                    <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">Aucun message pour le moment. Le fil s’alimentera avec vos échanges réels.</div>
                  )}
                </div>
                <div className="flex gap-3 border-t border-border p-5">
                  <Input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Ajouter un message au dossier..." />
                  <Button>
                    <Send className="h-4 w-4" />
                    Envoyer
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

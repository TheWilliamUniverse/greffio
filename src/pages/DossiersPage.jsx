import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Calendar, CheckCircle2, ClipboardCheck, Clock3, Filter, Plus, Search, ShieldCheck } from 'lucide-react';
import { listDossiers, listTrashedDossiers } from '@/api/dossiers.js';
import { Sidebar } from '@/components/Sidebar.jsx';
import { useAuth } from '@/hooks/useAuth.js';
import { isInternalUser } from '@/utils/roles.js';
import { StatusBadge } from '@/components/StatusBadge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
import { resolveFormalityPublicLabel } from '@/config/formalityLabels.js';
import { resolveDossierDisplayName } from '@/utils/dossierBootstrap.js';
import { QUESTIONNAIRE_NEW_PATH } from '@/utils/questionnaireNavigation.js';
import { resolveDossierContinueUrl } from '@/utils/dossierContinueUrl.js';
import { dossierContinuePrefetchHandlers } from '@/utils/dossierPrefetch.js';
import { PageLoadingState } from '@/components/patterns/PageLoadingState.jsx';

const STATUS_LABELS = {
  draft: 'BROUILLON',
  contact_started: 'EN_COURS',
  contact_completed: 'EN_COURS',
  legal_form_selected: 'EN_COURS',
  questionnaire_in_progress: 'EN_COURS',
  questionnaire_completed: 'EN_COURS',
  documents_requested: 'ATTENTE_DOCS',
  documents_uploaded: 'EN_ANALYSE',
  documents_validated: 'VALIDE',
  documents_under_review: 'EN_ANALYSE',
  documents_missing_or_invalid: 'URGENT',
  mandate_pending_signature: 'A_SIGNER',
  mandate_required: 'A_SIGNER',
  mandate_signed: 'VALIDE',
  statutes_generated: 'A_SIGNER',
  statutes_under_review: 'EN_ANALYSE',
  statutes_signed: 'VALIDE',
  payment_pending: 'ATTENTE_DOCS',
  payment_confirmed: 'EN_COURS',
  dossier_preparation: 'EN_COURS',
  client_validation_required: 'A_SIGNER',
  client_validated: 'EN_COURS',
  ready_for_filing: 'PLANIFIE',
  filed_to_guichet_unique: 'EN_ANALYSE',
  under_administration_review: 'EN_ANALYSE',
  regularization_requested: 'URGENT',
  regularization_submitted: 'EN_ANALYSE',
  accepted: 'VALIDE',
  official_documents_available: 'VALIDE',
  completed: 'TERMINE',
  rejected: 'REJETE',
  abandoned: 'TERMINE',
  cancelled_by_client: 'TERMINE',
  payment_failed: 'URGENT',
  manual_review_required: 'EN_ANALYSE',
};

const PRIORITY_LABELS = {
  low: 'Basse',
  normal: 'Normale',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente',
};

const NEXT_ACTIONS = {
  draft: 'Initialiser le dossier et compléter les premières informations.',
  questionnaire_in_progress: 'Continuer le questionnaire intelligent.',
  questionnaire_completed: 'Vérifier les réponses et choisir l’offre adaptée.',
  documents_requested: 'Déposer les pièces justificatives demandées.',
  documents_missing_or_invalid: 'Corriger les documents signalés par l’équipe Greffio.',
  mandate_required: 'Lire et signer la procuration Greffio.',
  mandate_pending_signature: 'Signer la procuration Greffio.',
  statutes_generated: 'Relire les statuts générés avant signature.',
  client_validation_required: 'Confirmer le dossier avant dépôt.',
  payment_pending: 'Régler les frais requis pour poursuivre la formalité.',
  filed_to_guichet_unique: 'Le dossier est déposé et suivi par Greffio.',
  under_administration_review: 'Aucune action requise, instruction en cours.',
  regularization_requested: 'Répondre à la demande de complément.',
  accepted: 'Télécharger les documents officiels disponibles.',
  completed: 'Dossier clôturé, documents conservés dans votre coffre.',
  rejected: 'Lire le retour administratif et préparer une régularisation.',
};

const toVisualStatus = (status) => STATUS_LABELS[String(status || '').toLowerCase()] || String(status || 'BROUILLON').toUpperCase();

const buildSteps = (progress, status) => {
  const normalizedProgress = Number(progress || 0);
  const normalizedStatus = String(status || '').toLowerCase();
  const accepted = ['accepted', 'official_documents_available', 'completed'].includes(normalizedStatus);
  const questionnaireDone = [
    'questionnaire_completed',
    'documents_requested',
    'documents_uploaded',
    'documents_validated',
    'documents_under_review',
    'documents_missing_or_invalid',
    'mandate_pending_signature',
    'mandate_required',
    'mandate_signed',
    'statutes_generated',
    'statutes_under_review',
    'statutes_signed',
    'payment_pending',
    'payment_confirmed',
    'dossier_preparation',
    'client_validation_required',
    'client_validated',
    'ready_for_filing',
    'filed_to_guichet_unique',
    'under_administration_review',
    'regularization_requested',
    'regularization_submitted',
    'accepted',
    'official_documents_available',
    'completed',
  ].includes(normalizedStatus);
  const documentsDone = [
    'documents_validated',
    'mandate_pending_signature',
    'mandate_required',
    'mandate_signed',
    'statutes_generated',
    'statutes_under_review',
    'statutes_signed',
    'payment_pending',
    'payment_confirmed',
    'dossier_preparation',
    'client_validation_required',
    'client_validated',
    'ready_for_filing',
    'filed_to_guichet_unique',
    'under_administration_review',
    'regularization_requested',
    'regularization_submitted',
    'accepted',
    'official_documents_available',
    'completed',
  ].includes(normalizedStatus);
  return [
    { label: 'Projet', done: normalizedProgress >= 5 || Boolean(status) },
    { label: 'Questionnaire', done: normalizedProgress >= 25 || questionnaireDone },
    { label: 'Documents', done: normalizedProgress >= 50 || documentsDone },
    { label: 'Validation', done: normalizedProgress >= 75 || accepted },
    { label: 'Dépôt', done: normalizedProgress >= 95 || accepted },
  ];
};

const normalizeApiDossier = (dossier) => {
  const progress = Math.max(0, Math.min(100, Number(dossier.progressPercent || dossier.progress || 0)));
  const status = String(dossier.status || 'draft').toLowerCase();
  const steps = buildSteps(progress, status);
  const dueDate = dossier.updatedAt || dossier.createdAt || new Date().toISOString();
  return {
    id: dossier.id,
    reference: dossier.reference || '',
    name: resolveDossierDisplayName(dossier),
    legalForm: dossier.legalForm || dossier.formeJuridique || 'Forme à préciser',
    status: toVisualStatus(status),
    rawStatus: status,
    priority: PRIORITY_LABELS[String(dossier.opsPriority || 'normal').toLowerCase()] || dossier.opsPriority || 'Normale',
    phase: resolveFormalityPublicLabel({
      service: dossier.service,
      typeFormalite: dossier.typeFormalite,
      formeJuridique: dossier.formeJuridique || dossier.legalForm,
      legalForm: dossier.legalForm,
    }),
    nextAction: NEXT_ACTIONS[status] || 'Suivre la prochaine étape depuis votre espace sécurisé.',
    expert: dossier.assignedToUserId ? 'Équipe Greffio assignée' : 'Équipe Greffio',
    createdAt: dossier.createdAt,
    dueDate,
    progress,
    currentStep: Math.max(1, steps.filter((step) => step.done).length || 1),
    totalSteps: steps.length,
    blockers: ['URGENT', 'ATTENTE_DOCS'].includes(toVisualStatus(status)) ? ['Action attendue dans le dossier'] : [],
    service: dossier.service,
    steps,
  };
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'À suivre';
  return date.toLocaleDateString('fr-FR');
};

export const DossiersPage = () => {
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const showTrash = searchParams.get('trash') === '1';
  const internalView = isInternalUser(currentUser);
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('Tous');

  useEffect(() => {
    let mounted = true;

    const loadDossiers = async () => {
      setLoading(true);
      try {
        const payload = showTrash ? await listTrashedDossiers() : await listDossiers();
        if (!mounted || !Array.isArray(payload.dossiers)) return;
        const apiDossiers = payload.dossiers.map(normalizeApiDossier);
        setDossiers(apiDossiers);
      } catch (_error) {
        if (!mounted) return;
        setDossiers([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDossiers();

    return () => {
      mounted = false;
    };
  }, [showTrash]);

  const statuses = useMemo(() => ['Tous', ...new Set(dossiers.map((dossier) => dossier.status))], [dossiers]);

  const filteredDossiers = dossiers.filter((dossier) => {
    const searchable = [
      dossier.name,
      dossier.nextAction,
      dossier.expert,
      dossier.phase,
      dossier.legalForm,
      (dossier.blockers || []).join(' '),
    ].join(' ');
    const matchesSearch = searchable.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = status === 'Tous' || dossier.status === status;
    return matchesSearch && matchesStatus;
  });

  const activeCount = dossiers.filter((dossier) => dossier.status !== 'VALIDE' && dossier.status !== 'TERMINE').length;
  const waitingCount = dossiers.filter((dossier) => ['ATTENTE_DOCS', 'URGENT'].includes(dossier.status)).length;
  const completedCount = dossiers.filter((dossier) => dossier.status === 'VALIDE' || dossier.status === 'TERMINE').length;
  const averageProgress = dossiers.length ? Math.round(dossiers.reduce((sum, dossier) => sum + (dossier.progress || 0), 0) / dossiers.length) : 0;

  const overview = [
    { label: 'Dossiers actifs', value: activeCount, icon: ClipboardCheck, text: 'formalité(s) ouverte(s)' },
    { label: 'Blocages', value: waitingCount, icon: AlertTriangle, text: 'pièces ou validations attendues' },
    { label: 'Validés', value: completedCount, icon: CheckCircle2, text: 'jalons terminés' },
    { label: 'Avancement moyen', value: `${averageProgress}%`, icon: ShieldCheck, text: dossiers.length ? 'sur vos dossiers' : 'aucun dossier' },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-5 md:p-8">
        {loading ? (
          <PageLoadingState variant="skeleton" label="Chargement de vos dossiers…" className="min-h-[50vh]" />
        ) : (
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase text-primary">Portefeuille</p>
              <h1 className="mt-2 text-3xl font-extrabold text-foreground">Dossiers</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {internalView
                  ? 'Vue équipe Greffio – tous les dossiers ouverts sur la plateforme.'
                  : 'Vue réelle de vos créations, modifications, dissolutions et démarches administratives.'}
              </p>
            </div>
            <Button asChild>
              <Link to={QUESTIONNAIRE_NEW_PATH}>
                <Plus className="h-4 w-4" />
                Nouveau dossier
              </Link>
            </Button>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {overview.map((item) => (
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
                <Input className="pl-9" placeholder="Rechercher dossier, étape, équipe ou action..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 w-full md:w-[180px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" className="bg-white">
                <Filter className="h-4 w-4" />
                Filtrer
              </Button>
              <Button variant="outline" className="bg-white">
                <Calendar className="h-4 w-4" />
                Échéances
              </Button>
            </div>
          </section>

          {filteredDossiers.length === 0 ? (
            <section className="rounded-md border border-dashed border-primary/30 bg-white p-8 text-center shadow-elevation-sm">
              <ClipboardCheck className="mx-auto h-10 w-10 text-primary" />
              <h2 className="mt-4 text-2xl font-extrabold">Aucun dossier à afficher</h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Les dossiers apparaîtront ici uniquement après création d’un projet ou ouverture effective par l’équipe Greffio.
              </p>
              <Button asChild className="mt-6">
                <Link to={QUESTIONNAIRE_NEW_PATH}>
                  Créer mon premier dossier
                  <Plus className="h-4 w-4" />
                </Link>
              </Button>
            </section>
          ) : (
            <section className="grid gap-4 lg:grid-cols-2">
              {filteredDossiers.map((dossier) => (
                <Link
                  key={dossier.id}
                  to={resolveDossierContinueUrl({
                    id: dossier.id,
                    status: dossier.rawStatus,
                    progressPercent: dossier.progress,
                  })}
                  {...dossierContinuePrefetchHandlers({
                    id: dossier.id,
                    status: dossier.rawStatus,
                    progressPercent: dossier.progress,
                  })}
                  className="rounded-md border border-border bg-white p-5 shadow-elevation-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-elevation-md"
                >
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={dossier.status} />
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">{dossier.legalForm}</span>
                    </div>
                    <span className="text-xs font-bold uppercase text-muted-foreground">{dossier.priority}</span>
                  </div>

                  <h2 className="text-lg font-extrabold text-foreground">{dossier.name}</h2>
                  <p className="mt-2 text-sm font-semibold text-primary">{dossier.phase}</p>
                  <p className="mt-2 min-h-[44px] text-sm leading-6 text-muted-foreground">{dossier.nextAction}</p>

                  <div className="mt-5">
                    <div className="mb-2 flex justify-between text-xs font-bold text-muted-foreground">
                      <span>Étape {dossier.currentStep || 0}/{dossier.totalSteps || dossier.steps?.length || 0}</span>
                      <span>{dossier.progress || 0}%</span>
                    </div>
                      <Progress value={dossier.progress || 0} className="h-2" />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {(dossier.steps || []).slice(0, 6).map((step) => (
                      <span key={step.label} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${step.done ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                        {step.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                        {step.label}
                      </span>
                    ))}
                  </div>

                  {(dossier.blockers || []).length > 0 && (
                    <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      <p className="font-bold">Point bloquant</p>
                      <p className="mt-1">{dossier.blockers.join(' · ')}</p>
                    </div>
                  )}

                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
                    <span className="font-semibold text-foreground">{dossier.expert}</span>
                    <span className="text-muted-foreground">{formatDate(dossier.dueDate)}</span>
                  </div>
                </Link>
              ))}
            </section>
          )}
        </div>
        )}
      </main>
    </div>
  );
};

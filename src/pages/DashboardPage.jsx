import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  FileText,
  FolderKanban,
  MessageSquareText,
  Plus,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar.jsx';
import { MobileSidebarDrawer, MobileSidebarTrigger } from '@/components/MobileSidebarDrawer.jsx';
import { StatusBadge } from '@/components/StatusBadge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { useAuth } from '@/hooks/useAuth.js';
import { getCurrentDossierId, saveCurrentDossierId } from '@/utils/sessionStore.js';
import { syncCurrentDossierId } from '@/utils/documentEditorErrors.js';
import { fetchUserProfile } from '@/api/profile.js';
import { LoginAlertsPromptBanner } from '@/components/security/LoginAlertsPromptBanner.jsx';
import { RememberMfaDeviceBanner } from '@/components/security/RememberMfaDeviceBanner.jsx';
import { isEiLikeFormality } from '@/config/formalities.js';
import { resolveFormalityPublicLabel } from '@/config/formalityLabels.js';
import { mapDossierStatusForBadge, mapDossierClientAction } from '@/utils/dossierClientStatus.js';
import { isLoginAlertsConfigured, getLoginAlertsSettings, rememberLoginAlertsChoice } from '@/utils/userProfile.js';
import { getDocumentTypeLabel } from '@/utils/documentStatusLabels.js';
import { countActionableDocuments, resolveClientDocumentStatus, documentHasFile } from '@/utils/documentWorkflow.js';
import { useDossierQuery } from '@/hooks/queries/useDossierQuery.js';
import { useDossiersQuery } from '@/hooks/queries/useDossiersQuery.js';

export const DashboardPage = () => {
  const { currentUser, updateProfile } = useAuth();
  const { data: dossiersRaw = [], isLoading: loadingApi } = useDossiersQuery(currentUser?.id);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const notifications = [];
  const [showLoginAlertsPrompt, setShowLoginAlertsPrompt] = useState(
    () => !isLoginAlertsConfigured(currentUser),
  );
  const [activeDossierId, setActiveDossierId] = useState(() => getCurrentDossierId());
  const { data: activeDossierPayload } = useDossierQuery(activeDossierId);

  useEffect(() => {
    const dossierIds = dossiersRaw.map((dossier) => dossier.id).filter(Boolean);
    const syncedId = syncCurrentDossierId(dossierIds);
    const nextId = syncedId || dossierIds[0] || null;
    if (nextId && !getCurrentDossierId()) {
      saveCurrentDossierId(nextId);
    }
    setActiveDossierId(nextId);
  }, [dossiersRaw]);

  const dossiers = useMemo(() => dossiersRaw.map((dossier) => ({
    id: dossier.id,
    name: dossier.companyName || dossier.denomination || 'Dossier entreprise',
    legalForm: dossier.legalForm || dossier.formeJuridique || 'SASU',
    owner: currentUser?.firstName || 'Client',
    status: mapDossierStatusForBadge(dossier.status),
    phase: resolveFormalityPublicLabel({
      service: dossier.service,
      typeFormalite: dossier.typeFormalite,
      formeJuridique: dossier.legalForm || dossier.formeJuridique,
      legalForm: dossier.legalForm,
    }),
    nextAction: mapDossierClientAction(dossier.status, dossier.progressPercent),
    expert: dossier.assignedToUserId || 'Équipe Greffio',
    createdAt: dossier.createdAt,
    dueDate: dossier.updatedAt || dossier.createdAt,
    progress: Number(dossier.progressPercent || 0),
    currentStep: Math.max(1, Math.round(Number(dossier.progressPercent || 0) / 20)),
    totalSteps: 5,
    blockers: [],
    steps: [],
    project: {
      initiatorType: 'personne_physique',
      initiatorName: currentUser?.firstName || 'Client',
      companyName: dossier.companyName || dossier.denomination,
      siren: '',
      nationality: '',
      companyCountry: '',
    },
  })), [dossiersRaw, currentUser?.firstName]);

  const documents = useMemo(() => {
    const dossier = activeDossierPayload?.dossier;
    if (!dossier) return [];
    const questionnaire = dossier.dataJson ? JSON.parse(dossier.dataJson) : {};
    const eiLike = isEiLikeFormality({
      legalForm: dossier.legalForm || questionnaire.formeJuridique,
      typeFormalite: questionnaire.typeFormalite,
      service: dossier.service,
    });
    return (activeDossierPayload.documents || [])
      .filter((doc) => !(eiLike && (doc.docKey === 'signed_statutes' || doc.docKey === 'capital_certificate')))
      .map((doc) => {
        const hasFile = documentHasFile(doc);
        const status = resolveClientDocumentStatus({ ...doc, hasFile });
        return {
          id: doc.id,
          dossierId: doc.dossierId,
          name: getDocumentTypeLabel(doc.docKey, doc.label),
          status,
          type: doc.docKey,
          size: doc.fileSizeBytes ? `${Math.round(Number(doc.fileSizeBytes) / 1024)} Ko` : 'N/A',
          providedBy: doc.reviewerId ? 'Greffio' : 'Client',
          date: doc.updatedAt || doc.createdAt,
        };
      });
  }, [activeDossierPayload]);

  useEffect(() => {
    if (isLoginAlertsConfigured(currentUser)) {
      setShowLoginAlertsPrompt(false);
    }
  }, [currentUser]);

  useEffect(() => {
    let mounted = true;
    const checkLoginAlertsPreference = async () => {
      try {
        const payload = await fetchUserProfile();
        if (!mounted) return;
        const user = payload?.user || currentUser;
        if (user) {
          rememberLoginAlertsChoice(user);
          updateProfile(user);
          setShowLoginAlertsPrompt(!isLoginAlertsConfigured(user));
        }
      } catch (_error) {
        if (!mounted) return;
        setShowLoginAlertsPrompt(!isLoginAlertsConfigured(currentUser));
      }
    };
    if (currentUser?.id) {
      void checkLoginAlertsPreference();
    }
    return () => {
      mounted = false;
    };
  }, [currentUser?.id]);

  const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const activeDossiers = dossiers.filter((dossier) => dossier.status !== 'VALIDE' && dossier.status !== 'TERMINE').length;
  const documentsToReview = countActionableDocuments(documents);
  const averageProgress = dossiers.length ? Math.round(dossiers.reduce((sum, dossier) => sum + (dossier.progress || 0), 0) / dossiers.length) : 0;
  const nextDueDate = useMemo(() => {
    if (!dossiers.length) return 'Aucune';
    return new Date([...dossiers].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0].dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }, [dossiers]);

  const stats = [
    { label: 'Dossiers actifs', value: activeDossiers, icon: FolderKanban, text: dossiers.length ? 'formalité(s) réellement ouverte(s)' : 'aucun dossier ouvert' },
    { label: 'Pièces à traiter', value: documentsToReview, icon: FileText, text: documents.length ? 'documents à compléter ou signer' : 'aucune pièce déposée' },
    { label: 'Progression globale', value: dossiers.length ? `${averageProgress}%` : '0%', icon: ShieldCheck, text: dossiers.length ? 'calculée depuis vos dossiers' : 'en attente de projet' },
    { label: 'Échéance proche', value: nextDueDate, icon: CalendarDays, text: dossiers.length ? 'prochaine action réelle' : 'aucune échéance' },
  ];
  const profile = useMemo(() => {
    const questionnaire = activeDossierPayload?.dossier?.dataJson
      ? JSON.parse(activeDossierPayload.dossier.dataJson)
      : {};
    return {
      initiatorType: questionnaire.initiatorType || 'personne_physique',
      initiatorName: [questionnaire.firstName, questionnaire.lastName].filter(Boolean).join(' ')
        || currentUser?.firstName
        || 'Client',
      companyName: questionnaire.companyName || questionnaire.existingBusinessName || activeDossierPayload?.dossier?.companyName,
      siren: questionnaire.companySiren || questionnaire.existingBusinessSiren || '',
      nationality: questionnaire.nationality || '',
      companyCountry: questionnaire.companyCountry || '',
    };
  }, [activeDossierPayload, currentUser?.firstName]);
  const declarantProfile = profile.initiatorType
    || (documents.some((item) => item.type === 'ubo_declaration') ? 'personne_morale' : 'personne_physique');
  const declarantLabel = declarantProfile === 'personne_morale' ? 'Personne morale' : 'Personne physique';

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      <Sidebar />
      <MobileSidebarDrawer open={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
      <main className="flex-1 overflow-y-auto p-5 pb-28 md:p-8">
        <div className="mx-auto max-w-7xl space-y-7">
          <div className="flex items-center justify-between gap-3 md:hidden">
            <MobileSidebarTrigger onClick={() => setIsMobileNavOpen(true)} />
            <p className="truncate text-sm font-semibold text-muted-foreground">
              Cockpit Greffio
            </p>
          </div>
          <RememberMfaDeviceBanner />
          {showLoginAlertsPrompt ? (
            <LoginAlertsPromptBanner
              initialEnabled={getLoginAlertsSettings(currentUser).enabled}
              onSaved={(user) => {
                if (user) {
                  rememberLoginAlertsChoice(user);
                  updateProfile(user);
                }
                setShowLoginAlertsPrompt(false);
              }}
            />
          ) : null}
          <section className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
              <div>
                <p className="text-sm font-semibold capitalize text-muted-foreground">{today}</p>
                <h1 className="mt-2 text-3xl font-extrabold text-foreground">Bonjour {currentUser.firstName || 'Bienvenue'}, votre cockpit Greffio.</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Votre espace affiche vos dossiers, documents et messages en temps réel, avec un parcours adapté aux personnes physiques et morales.
                </p>
                {loadingApi ? <p className="mt-2 text-xs text-muted-foreground">Chargement de votre espace…</p> : null}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="outline" className="bg-white">
                  <Link to="/team">
                    <MessageSquareText className="h-4 w-4" />
                    Écrire à l’équipe
                  </Link>
                </Button>
                <Button asChild>
                  <Link to="/questionnaire">
                    <Plus className="h-4 w-4" />
                    Nouveau projet
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.label} className="border-border bg-white shadow-elevation-sm">
                <CardContent className="p-5">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-primary">
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-3xl font-extrabold text-foreground">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.text}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
            <p className="text-sm font-bold uppercase text-primary">Profil déclarant</p>
            <h2 className="mt-1 text-2xl font-extrabold">{declarantLabel}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Parcours interne adapté automatiquement : identité et nationalité pour personne physique, ou raison sociale/SIREN/justificatifs d’entreprise pour personne morale.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs uppercase text-muted-foreground">Déclarant</p>
                <p className="mt-1 font-bold">{profile.initiatorName || 'Non renseigné'}</p>
              </div>
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs uppercase text-muted-foreground">SIREN</p>
                <p className="mt-1 font-bold">{profile.siren || 'Non renseigné'}</p>
              </div>
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs uppercase text-muted-foreground">Nationalité</p>
                <p className="mt-1 font-bold">{profile.nationality || 'N/A'}</p>
              </div>
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs uppercase text-muted-foreground">Pays immatriculation</p>
                <p className="mt-1 font-bold">{profile.companyCountry || 'N/A'}</p>
              </div>
            </div>
          </section>

          {dossiers.length === 0 ? (
            <section className="rounded-md border border-dashed border-primary/30 bg-white p-8 text-center shadow-elevation-sm">
              <FolderKanban className="mx-auto h-10 w-10 text-primary" />
              <h2 className="mt-4 text-2xl font-extrabold">Aucun dossier en cours</h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                C’est normal si aucun projet n’a encore été déposé. Lancez le simulateur, renseignez votre formalité, puis Greffio ouvrira le dossier correspondant dans cet espace.
              </p>
              <Button asChild className="mt-6">
                <Link to="/questionnaire">
                  Démarrer une démarche
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </section>
          ) : (
            <div className="grid gap-7 xl:grid-cols-[1.28fr_0.72fr]">
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-extrabold text-foreground">Formalités en cours</h2>
                  <Button variant="ghost" asChild>
                    <Link to="/dossiers">
                      Tout voir
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div className="overflow-hidden rounded-md border border-border bg-white shadow-elevation-sm">
                  <div className="grid grid-cols-[1fr_130px_120px_110px] gap-4 border-b border-border bg-muted px-5 py-3 text-xs font-bold uppercase text-muted-foreground max-lg:hidden">
                    <span>Dossier</span>
                    <span>Statut</span>
                    <span>Échéance</span>
                    <span>Avancement</span>
                  </div>
                  {dossiers.slice(0, 4).map((dossier) => (
                    <Link key={dossier.id} to={`/dossier/${dossier.id}`} className="grid gap-4 border-b border-border px-5 py-4 transition hover:bg-muted/60 lg:grid-cols-[1fr_130px_120px_110px] lg:items-center last:border-b-0">
                      <div>
                        <p className="font-bold text-foreground">{dossier.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{dossier.nextAction} · Responsable : {dossier.expert}</p>
                      </div>
                      <StatusBadge status={dossier.status} className="w-fit" />
                      <span className="text-sm font-semibold text-foreground">{new Date(dossier.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                      <div>
                        <div className="h-2 rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-primary" style={{ width: `${dossier.progress || 0}%` }} />
                        </div>
                        <p className="mt-1 text-xs font-bold text-muted-foreground">{dossier.progress || 0}%</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              <aside className="space-y-7">
                <section className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-extrabold">Notifications</h2>
                  </div>
                  {notifications.length ? (
                    <div className="space-y-3">
                      {notifications.slice(0, 4).map((notification) => (
                        <div key={notification.id} className="rounded-md bg-muted p-3">
                          <p className="text-sm font-medium leading-5 text-foreground">{notification.message}</p>
                          <p className="mt-2 text-xs text-muted-foreground">{new Date(notification.date || notification.createdAt).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm leading-6 text-muted-foreground">Aucune notification pour le moment.</p>
                  )}
                </section>

                <section className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <h2 className="text-lg font-extrabold">Prochaines pièces</h2>
                  </div>
                  <div className="space-y-3">
                    {documents.length ? documents.slice(0, 4).map((document) => (
                      <div key={document.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                        <span className="text-sm font-medium text-foreground">{document.name}</span>
                        <StatusBadge status={document.status} />
                      </div>
                    )) : (
                      <div className="rounded-md bg-muted p-4 text-sm leading-6 text-muted-foreground">
                        Aucune pièce dans le coffre. Les documents apparaîtront après génération, dépôt ou demande de l’équipe Greffio.
                      </div>
                    )}
                  </div>
                  <Button asChild variant="outline" className="mt-5 bg-white">
                    <Link to="/documents">
                      <Upload className="h-4 w-4" />
                      Ouvrir le coffre
                    </Link>
                  </Button>
                </section>
              </aside>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

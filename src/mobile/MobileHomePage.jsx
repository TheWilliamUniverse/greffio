import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, FileText, FolderKanban, MessageSquareText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { useAuth } from '@/hooks/useAuth.js';
import { useDossiersQuery } from '@/hooks/queries/useDossiersQuery.js';
import { useDossierActionStateQuery } from '@/hooks/queries/useDossierActionStateQuery.js';
import { loadDossiersSnapshot, cacheDossiersSnapshot } from '@/utils/mobileOffline.js';
import { AnimatedProgressRing } from '@/components/ui/AnimatedProgressRing.jsx';
import { dossierContinuePrefetchHandlers } from '@/utils/dossierPrefetch.js';
import { greffioTileTap } from '@/motion/greffioMotion.js';
import { MobileDocumentScanner } from '@/mobile/MobileDocumentScanner.jsx';
import { GreffioAppLoader } from '@/components/system/GreffioAppLoader.jsx';
import { MobileAnimatedSection } from '@/mobile/ui/MobileAnimatedSection.jsx';
import { MobilePageContainer } from '@/mobile/ui/MobilePageContainer.jsx';
import { MobileDossierTimeline } from '@/mobile/ui/MobileDossierTimeline.jsx';
import { MobileCockpitOnboarding } from '@/mobile/ui/MobileCockpitOnboarding.jsx';
import { useMobileMotion } from '@/mobile/ui/mobileMotion.js';
import { mapDossierClientAction } from '@/utils/dossierClientStatus.js';
import { resolveDossierDashboardCta } from '@/utils/dossierDashboardCta.js';
import { QUESTIONNAIRE_NEW_PATH } from '@/utils/questionnaireNavigation.js';

export const MobileHomePage = () => {
  const { currentUser } = useAuth();
  const { staggerItem } = useMobileMotion();
  const { data, isLoading, isError, isSuccess, refetch, isFetching } = useDossiersQuery(currentUser?.id);
  const [offlineSnapshot, setOfflineSnapshot] = useState(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    void loadDossiersSnapshot(currentUser.id).then(setOfflineSnapshot);
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id && isSuccess && data?.length) {
      void cacheDossiersSnapshot({ userId: currentUser.id, dossiers: data });
    }
  }, [currentUser?.id, data, isSuccess]);

  const dossiers = isError ? (offlineSnapshot?.dossiers || []) : (data || []);
  const primaryDossier = dossiers[0];
  const { data: actionState } = useDossierActionStateQuery(primaryDossier?.id);
  const actionLabel = useMemo(() => {
    if (actionState?.description) return actionState.description;
    if (!primaryDossier) return 'Votre espace est prêt. Lancez votre première démarche : Greffio prépare les documents, les pièces et le suivi avec vous.';
    return mapDossierClientAction(primaryDossier.status, primaryDossier.progressPercent);
  }, [actionState?.description, primaryDossier]);

  const { url: continueUrl, label: continueLabel } = primaryDossier
    ? resolveDossierDashboardCta(primaryDossier, actionState)
    : { url: '/simulateur?type=creation', label: 'Créer mon premier dossier' };
  const prefetchHandlers = primaryDossier ? dossierContinuePrefetchHandlers(primaryDossier) : {};
  const actionCardTitle = primaryDossier
    ? (['under_administration_review', 'filed_to_guichet_unique'].includes(String(primaryDossier.status || '').toLowerCase())
      ? 'En vérification'
      : 'Action requise')
    : 'Bienvenue sur Greffio';

  const quickLinks = [
    { to: '/dossiers', icon: FolderKanban, label: 'Dossiers', hint: 'Suivi formalités' },
    { to: '/documents', icon: FileText, label: 'Documents', hint: 'Pièces & PDF' },
    { to: '/team', icon: MessageSquareText, label: 'Messages', hint: 'Équipe Greffio' },
    { to: '/mobile/account', icon: ArrowRight, label: 'Compte', hint: 'Profil & réglages' },
  ];

  if (isLoading && !offlineSnapshot?.dossiers?.length) {
    return <GreffioAppLoader label="Chargement de l'accueil…" fullScreen />;
  }

  return (
    <>
      <MobileCockpitOnboarding />
      <MobilePageContainer>
        <MobileAnimatedSection delay={0}>
          <p className="text-sm text-muted-foreground">Bonjour {currentUser?.firstName || 'Bienvenue'}</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))]">
            Que devez-vous faire maintenant ?
          </h1>
        </MobileAnimatedSection>

        <MobileAnimatedSection delay={0.05}>
          <motion.section
            {...greffioTileTap}
            className="rounded-3xl border border-primary/20 bg-gradient-to-br from-white via-secondary/30 to-white p-5 shadow-[0_8px_30px_rgba(15,39,80,0.08)]"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-primary/80">{actionCardTitle}</p>
              {primaryDossier ? (
                <AnimatedProgressRing
                  value={primaryDossier.progressPercent || 0}
                  size={44}
                  strokeWidth={3}
                />
              ) : null}
            </div>
            <h2 className="mt-1 text-lg font-extrabold text-foreground">
              {primaryDossier?.companyName || 'Créez votre premier dossier'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{actionLabel}</p>
            <div className="mt-4 flex flex-col gap-2">
              <Button asChild className="h-11 w-full rounded-2xl text-base">
                <Link to={continueUrl} {...prefetchHandlers}>
                  {continueLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              {primaryDossier ? (
                <Button asChild variant="outline" className="h-11 w-full rounded-2xl bg-white text-base">
                  <Link to={QUESTIONNAIRE_NEW_PATH}>
                    Nouveau dossier
                    <Plus className="h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </motion.section>
        </MobileAnimatedSection>

        {primaryDossier ? (
          <MobileAnimatedSection delay={0.08}>
            <MobileDossierTimeline dossier={primaryDossier} />
          </MobileAnimatedSection>
        ) : null}

        {isError && !dossiers.length ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Impossible de charger vos dossiers.
            <Button type="button" variant="outline" className="mt-3 h-11 w-full rounded-2xl bg-white" onClick={() => refetch()} disabled={isFetching}>
              Réessayer
            </Button>
          </div>
        ) : null}

        <MobileAnimatedSection delay={0.1}>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Raccourcis</p>
          <div className="grid grid-cols-2 gap-3 opacity-95">
            {quickLinks.map((item, index) => (
              <motion.div key={item.to} {...staggerItem(index)}>
                <Link
                  to={item.to}
                  className="flex min-h-[108px] flex-col rounded-3xl border border-border/70 bg-white p-4 shadow-sm transition active:scale-[0.98]"
                >
                  <item.icon className="h-5 w-5 text-primary" />
                  <p className="mt-3 text-sm font-bold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.hint}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </MobileAnimatedSection>

        {primaryDossier ? (
          <MobileAnimatedSection delay={0.12}>
            <section className="rounded-3xl border border-border/70 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-extrabold">Envoi mobile</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Photographiez une pièce – conversion PDF optimisée avant envoi.
              </p>
              <div className="mt-4">
                <MobileDocumentScanner dossierId={primaryDossier.id} docKey="identity_proof" label="Scanner & envoyer" />
              </div>
            </section>
          </MobileAnimatedSection>
        ) : null}
      </MobilePageContainer>
    </>
  );
};

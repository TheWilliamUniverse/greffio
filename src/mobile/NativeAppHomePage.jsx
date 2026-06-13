import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FolderKanban, LogIn, Sparkles, UserPlus } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { MobileAnimatedSection } from '@/mobile/ui/MobileAnimatedSection.jsx';
import { MobilePageContainer } from '@/mobile/ui/MobilePageContainer.jsx';

export const NativeAppHomePage = () => (
  <MobilePageContainer>
    <MobileAnimatedSection delay={0}>
      <GreffioLogo variant="full" className="text-2xl" />
      <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))]">
        Vos formalités d&apos;entreprise, simplifiées
      </h1>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        Créez un dossier, déposez vos pièces, signez et suivez l&apos;avancement avec l&apos;équipe Greffio.
      </p>
    </MobileAnimatedSection>

    <MobileAnimatedSection delay={0.05} className="mt-6 space-y-3">
      <Button asChild size="lg" className="h-12 w-full justify-between rounded-2xl">
        <Link to="/simulateur">
          Simuler une formalité
          <Sparkles className="h-5 w-5" />
        </Link>
      </Button>
      <Button asChild size="lg" variant="outline" className="h-12 w-full justify-between rounded-2xl bg-white">
        <Link to="/login">
          Me connecter
          <LogIn className="h-5 w-5" />
        </Link>
      </Button>
      <Button asChild size="lg" variant="outline" className="h-12 w-full justify-between rounded-2xl bg-white">
        <Link to="/signup">
          Créer mon espace
          <UserPlus className="h-5 w-5" />
        </Link>
      </Button>
    </MobileAnimatedSection>

    <MobileAnimatedSection delay={0.1} className="mt-8">
      <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-white via-secondary/30 to-white p-5 shadow-elevation-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <FolderKanban className="h-5 w-5 text-primary" />
          </span>
          <div>
            <p className="text-sm font-extrabold text-foreground">Déjà client ?</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Connectez-vous pour reprendre votre dossier là où vous l&apos;avez laissé.
            </p>
            <Link to="/login" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary">
              Accéder à mon espace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </MobileAnimatedSection>
  </MobilePageContainer>
);

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileSearch } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { PublicPageLayout } from '@/components/layout/PublicPageLayout.jsx';

export const NotFoundPage = () => (
  <PublicPageLayout>
  <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--we-bg)] px-4 py-16 text-center">
    <p className="text-sm font-bold uppercase tracking-wide text-primary">Erreur 404</p>
    <h1 className="mt-3 text-3xl font-extrabold text-foreground sm:text-4xl">On ne trouve pas cette page</h1>
    <p className="mt-3 max-w-lg text-muted-foreground">
      L&apos;adresse est peut-être incorrecte, ou la page a été déplacée. Retournez à l&apos;accueil ou parcourez nos services.
    </p>
    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      <Button asChild>
        <Link to="/">
          Retour à l&apos;accueil
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
      <Button asChild variant="outline" className="bg-white">
        <Link to="/services">
          <FileSearch className="h-4 w-4" />
          Voir les services
        </Link>
      </Button>
    </div>
  </div>
  </PublicPageLayout>
);

export default NotFoundPage;

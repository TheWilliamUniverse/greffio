import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FilePenLine } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { ResourcesSearchBar } from '@/components/resources/ResourcesSearchBar.jsx';

export const ResourceHero = ({
  query,
  onQueryChange,
  onSearch,
  searchResults,
  onSelectResult,
  onSelectSuggestion,
  isAuthenticated,
}) => (
  <section className="rounded-2xl border border-border/80 bg-gradient-to-br from-[hsl(var(--greffio-citron)/0.35)] via-white to-white p-8 md:p-10">
    <p className="text-sm font-bold uppercase tracking-wide text-primary">Ressources</p>
    <h1 className="mt-2 max-w-3xl text-3xl font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))] md:text-4xl">
      Ressources et documents officiels
    </h1>
    <p className="mt-4 max-w-2xl text-sm leading-7 text-[hsl(var(--greffio-blue-900)/0.85)] md:text-base">
      Retrouvez les documents, guides et services utiles pour suivre, compléter ou sécuriser vos démarches d’entreprise.
    </p>
    <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:items-start">
      <ResourcesSearchBar
        query={query}
        onQueryChange={onQueryChange}
        onSearch={onSearch}
        searchResults={searchResults}
        onSelectResult={onSelectResult}
        onSelectSuggestion={onSelectSuggestion}
        isAuthenticated={isAuthenticated}
      />
      <div className="rounded-xl border border-[hsl(var(--greffio-blue)/0.18)] bg-white/90 p-5 shadow-elevation-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--greffio-blue)/0.1)] text-[hsl(var(--greffio-blue))]">
          <FilePenLine className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm font-bold uppercase tracking-wide text-primary">Nouveau</p>
        <h2 className="mt-1 text-lg font-extrabold text-[hsl(var(--greffio-blue-900))]">
          Compléter un PDF
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Déposez un Cerfa ou formulaire administratif. Greffio détecte les zones à compléter et génère un PDF avec des champs bleus remplissables.
        </p>
        <Button asChild className="mt-4 w-full gap-2">
          <Link to="/boutique#boutique-outils-gratuits">
            Voir dans la boutique
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  </section>
);

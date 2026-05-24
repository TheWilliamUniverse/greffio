import React from 'react';
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
    <div className="mt-8">
      <ResourcesSearchBar
        query={query}
        onQueryChange={onQueryChange}
        onSearch={onSearch}
        searchResults={searchResults}
        onSelectResult={onSelectResult}
        onSelectSuggestion={onSelectSuggestion}
        isAuthenticated={isAuthenticated}
      />
    </div>
  </section>
);

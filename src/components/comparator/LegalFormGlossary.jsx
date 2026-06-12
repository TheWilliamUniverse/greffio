import React from 'react';
import { BookOpen } from 'lucide-react';
import { LEGAL_FORM_GLOSSARY } from '@/config/legalFormComparator.js';

export const LegalFormGlossary = () => (
  <section className="mt-14 border-t border-border pt-12">
    <div className="mb-6 max-w-2xl">
      <p className="text-sm font-bold uppercase tracking-wide text-primary">Glossaire</p>
      <h2 className="mt-2 text-2xl font-extrabold text-[hsl(var(--greffio-blue-900))]">
        Termes utiles
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Les notions clés pour lire le comparatif, expliquées simplement.
      </p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {LEGAL_FORM_GLOSSARY.map((entry) => (
        <article
          key={entry.term}
          className="rounded-2xl border border-border bg-white p-4 shadow-elevation-sm transition hover:border-primary/30"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary/70">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
            </span>
            <h3 className="text-sm font-extrabold text-[hsl(var(--greffio-blue-900))]">{entry.term}</h3>
          </div>
          <p className="mt-2.5 text-xs leading-5 text-muted-foreground">{entry.definition}</p>
        </article>
      ))}
    </div>
  </section>
);

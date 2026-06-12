import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { LegalFormDisclaimer } from '@/components/comparator/LegalFormDisclaimer.jsx';

export const LegalFormComparatorIntro = ({ onStart, onScrollToTable, isMobile }) => (
  <section className="rounded-2xl border border-border bg-white p-6 shadow-elevation-sm md:p-8">
    <p className="text-sm font-bold uppercase text-primary">Accompagnateur juridique</p>
    <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))] md:text-3xl">
      Trouvez la forme juridique adaptée à votre projet
    </h1>
    <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">
      Répondez à quelques questions pour comparer micro-entreprise, EI, SASU, SAS, EURL, SARL, SCI, association et autres structures selon votre situation.
    </p>
    <p className="mt-2 text-xs text-muted-foreground md:text-sm">
      Durée estimée : 3 à 5 minutes. Résultat indicatif, sans engagement.
    </p>
    <LegalFormDisclaimer className="mt-4" compact />
    <div className={`mt-6 flex flex-col gap-2 ${isMobile ? '' : 'sm:flex-row'}`}>
      <Button type="button" className="h-12 rounded-full font-extrabold" onClick={onStart}>
        Commencer le questionnaire
        <ArrowRight className="h-4 w-4" />
      </Button>
      <Button type="button" variant="outline" className="h-12 rounded-full font-bold" onClick={onScrollToTable}>
        Voir le tableau comparatif
      </Button>
    </div>
  </section>
);

import React from 'react';
import { Scale, ListChecks, FileCheck2 } from 'lucide-react';
import { COMPARATOR_EDUCATION_CARDS } from '@/config/legalFormComparator.js';

const ICONS = {
  why: Scale,
  criteria: ListChecks,
  next: FileCheck2,
};

export const LegalFormEducationCards = ({ className }) => (
  <div className={className}>
    <div className="grid gap-4 md:grid-cols-3">
      {COMPARATOR_EDUCATION_CARDS.map((card) => {
        const Icon = ICONS[card.key] || Scale;
        return (
          <article
            key={card.key}
            className="rounded-xl border border-border bg-white p-5 shadow-elevation-sm"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
            </span>
            <h3 className="mt-3 text-sm font-extrabold text-[hsl(var(--greffio-blue-900))]">
              {card.title}
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{card.text}</p>
          </article>
        );
      })}
    </div>
  </div>
);

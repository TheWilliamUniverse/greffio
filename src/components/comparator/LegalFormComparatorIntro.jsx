import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { LegalFormDisclaimer } from '@/components/comparator/LegalFormDisclaimer.jsx';
import { LegalFormBadge, FitBadge } from '@/components/comparator/LegalFormBadge.jsx';
import {
  COMPARATOR_TRUST_LINE,
  LEGAL_FORM_COMPARATOR_FORMS,
  LEGAL_FORM_FEATURE_BADGES,
} from '@/config/legalFormComparator.js';

const PREVIEW_FORM_KEYS = ['sasu', 'sarl', 'micro'];
const PREVIEW_FITS = [
  { fitLevel: 'strong', label: 'Très adapté' },
  { fitLevel: 'good', label: 'Adapté' },
  { fitLevel: 'possible', label: 'Possible avec vigilance' },
];

const HeroPreviewPanel = () => (
  <div
    aria-hidden
    className="relative hidden min-w-0 overflow-hidden rounded-2xl border border-[hsl(var(--we-border))] bg-gradient-to-br from-[hsl(var(--we-bg))] via-white to-secondary/40 p-6 lg:block"
  >
    <p className="text-xs font-bold uppercase tracking-wide text-primary">Exemple de résultat</p>
    <div className="mt-4 space-y-3">
      {PREVIEW_FORM_KEYS.map((formKey, index) => {
        const form = LEGAL_FORM_COMPARATOR_FORMS[formKey];
        const fit = PREVIEW_FITS[index];
        return (
          <div
            key={formKey}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white p-4 shadow-elevation-sm"
          >
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-[hsl(var(--greffio-blue-900))]">{form.label}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{form.longLabel}</p>
            </div>
            <FitBadge fitLevel={fit.fitLevel} label={fit.label} />
          </div>
        );
      })}
    </div>
    <div className="mt-4 flex flex-wrap gap-1.5">
      {LEGAL_FORM_FEATURE_BADGES.sasu.map((badge) => (
        <LegalFormBadge key={badge} tone="blue">{badge}</LegalFormBadge>
      ))}
    </div>
  </div>
);

export const LegalFormComparatorIntro = ({ onStart, onScrollToTable, isMobile }) => {
  const reduceMotion = useReducedMotion();
  const reveal = reduceMotion
    ? {}
    : {
      initial: { opacity: 0, y: 14 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
    };

  return (
    <motion.section
      {...reveal}
      className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-sm"
    >
      <div className="grid min-w-0 gap-8 p-6 md:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:p-10">
        <div className="min-w-0">
          <p className="text-sm font-bold uppercase tracking-wide text-primary">Accompagnateur juridique</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))] md:text-4xl md:leading-tight">
            Trouvez la forme juridique adaptée à votre projet
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base md:leading-8">
            Répondez à quelques questions pour comparer SASU, SAS, SARL, EURL, micro-entreprise, EI, SCI et association selon votre situation.
          </p>

          <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            {COMPARATOR_TRUST_LINE.map((item) => (
              <li key={item} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground md:text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[hsl(var(--greffio-mint))]" aria-hidden />
                {item}
              </li>
            ))}
          </ul>

          <p className="mt-3 text-xs text-muted-foreground md:text-sm">
            Durée estimée : 3 à 5 minutes.
          </p>

          <div className={`mt-6 flex flex-col gap-2.5 ${isMobile ? '' : 'sm:flex-row sm:flex-wrap'}`}>
            <Button
              type="button"
              className="h-12 rounded-full px-7 font-extrabold shadow-[0_10px_28px_rgba(30,77,140,0.18)]"
              onClick={onStart}
            >
              Commencer le questionnaire
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-full px-6 font-bold"
              onClick={onScrollToTable}
            >
              Voir le tableau comparatif
            </Button>
          </div>

          <LegalFormDisclaimer className="mt-6" compact />
        </div>

        <HeroPreviewPanel />
      </div>
    </motion.section>
  );
};

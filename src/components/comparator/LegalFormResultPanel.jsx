import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, PencilLine, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { LegalFormRecommendationCard } from '@/components/comparator/LegalFormRecommendationCard.jsx';
import { FitBadge } from '@/components/comparator/LegalFormBadge.jsx';
import {
  COMPARATOR_DISCLAIMER_RESULT,
  LEGAL_FORM_COMPARATOR_FORMS,
} from '@/config/legalFormComparator.js';

const EASE_OUT = [0.22, 1, 0.36, 1];

export const LegalFormResultPanel = ({ result, onRestart, onEditAnswers }) => {
  const reduceMotion = useReducedMotion();

  if (!result?.primary) return null;

  const isNuanced = result.primary.fitLevel === 'possible' || result.primary.fitLevel === 'weak';

  const reveal = (delay = 0) => (reduceMotion
    ? {}
    : {
      initial: { opacity: 0, y: 16 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.4, delay, ease: EASE_OUT },
    });

  return (
    <section className="min-w-0 space-y-6">
      {isNuanced ? (
        <motion.div
          {...reveal(0)}
          className="rounded-xl border border-[hsl(var(--greffio-citron)/0.5)] bg-[hsl(var(--greffio-citron)/0.12)] p-4 text-sm leading-6 text-foreground"
        >
          Aucune forme ne ressort très nettement de vos réponses. La recommandation ci-dessous reste indicative :
          comparez attentivement les alternatives proposées.
        </motion.div>
      ) : null}

      <motion.div {...reveal(0.05)}>
        <LegalFormRecommendationCard recommendation={result.primary} variant="primary" />
      </motion.div>

      {result.alternatives?.length ? (
        <motion.div {...reveal(0.12)}>
          <h3 className="mb-3 text-lg font-extrabold text-[hsl(var(--greffio-blue-900))]">
            Alternatives crédibles
          </h3>
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            {result.alternatives.map((alt) => (
              <LegalFormRecommendationCard
                key={alt.formKey}
                recommendation={alt}
                variant="alternative"
                showCta={false}
              />
            ))}
          </div>
        </motion.div>
      ) : null}

      {result.avoid?.length ? (
        <motion.div {...reveal(0.18)} className="rounded-2xl border border-border bg-white p-5 shadow-elevation-sm">
          <h3 className="text-base font-extrabold text-[hsl(var(--greffio-blue-900))]">
            Formes moins adaptées à votre profil
          </h3>
          <ul className="mt-3 space-y-2.5">
            {result.avoid.map((item) => {
              const form = LEGAL_FORM_COMPARATOR_FORMS[item.formKey];
              return (
                <li key={item.formKey} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/30 px-3.5 py-2.5">
                  <span className="text-sm font-semibold text-foreground">{form?.label || item.formKey}</span>
                  <FitBadge fitLevel={item.fitLevel} label={item.fitLevelLabel} />
                </li>
              );
            })}
          </ul>
        </motion.div>
      ) : null}

      {(result.warnings?.length || result.specialCases?.length) ? (
        <motion.div {...reveal(0.22)} className="space-y-3">
          {[...(result.specialCases || []), ...(result.warnings || [])].map((message) => (
            <div
              key={message}
              className="flex gap-3 rounded-xl border border-[hsl(var(--greffio-coral)/0.25)] bg-[hsl(var(--greffio-coral)/0.06)] p-4 text-sm leading-6 text-foreground"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--greffio-coral))]" aria-hidden />
              <p>{message}</p>
            </div>
          ))}
        </motion.div>
      ) : null}

      <motion.p
        {...reveal(0.26)}
        className="rounded-xl border border-[hsl(var(--we-border))] bg-[hsl(var(--we-bg))] p-4 text-xs leading-6 text-muted-foreground md:text-sm"
      >
        {COMPARATOR_DISCLAIMER_RESULT}
      </motion.p>

      <motion.div {...reveal(0.3)} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {onEditAnswers ? (
          <Button type="button" variant="outline" className="h-11 rounded-full font-bold" onClick={onEditAnswers}>
            <PencilLine className="h-4 w-4" />
            Modifier mes réponses
          </Button>
        ) : null}
        <Button type="button" variant="outline" className="h-11 rounded-full font-bold" onClick={onRestart}>
          <RotateCcw className="h-4 w-4" />
          Recommencer
        </Button>
        <Button asChild variant="ghost" className="h-11 rounded-full font-bold">
          <Link to="/tarifs">Voir les tarifs Greffio</Link>
        </Button>
        <Button asChild variant="ghost" className="h-11 rounded-full font-bold">
          <Link to="/creation-entreprise">Comprendre les frais légaux</Link>
        </Button>
      </motion.div>
    </section>
  );
};

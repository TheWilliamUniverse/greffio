import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { LegalFormRecommendationCard } from '@/components/comparator/LegalFormRecommendationCard.jsx';
import { LEGAL_FORM_COMPARATOR_FORMS } from '@/config/legalFormComparator.js';

export const LegalFormResultPanel = ({ result, onRestart }) => {
  if (!result?.primary) return null;

  return (
    <section className="space-y-6">
      <LegalFormRecommendationCard recommendation={result.primary} variant="primary" />

      {result.alternatives?.length ? (
        <div>
          <h3 className="mb-3 text-lg font-extrabold text-[hsl(var(--greffio-blue-900))]">
            Alternatives à comparer
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {result.alternatives.map((alt) => (
              <LegalFormRecommendationCard
                key={alt.formKey}
                recommendation={alt}
                variant="alternative"
                showCta={false}
              />
            ))}
          </div>
        </div>
      ) : null}

      {result.avoid?.length ? (
        <div className="rounded-2xl border border-border bg-muted/40 p-5">
          <h3 className="text-base font-extrabold text-[hsl(var(--greffio-blue-900))]">
            Formes peu adaptées selon vos réponses
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {result.avoid.map((item) => {
              const form = LEGAL_FORM_COMPARATOR_FORMS[item.formKey];
              return (
                <li key={item.formKey}>
                  <span className="font-semibold text-foreground">{form?.label || item.formKey}</span>
                  {' — '}
                  {item.fitLevelLabel}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {(result.warnings?.length || result.specialCases?.length) ? (
        <div className="space-y-3">
          {[...(result.specialCases || []), ...(result.warnings || [])].map((message) => (
            <div
              key={message}
              className="flex gap-3 rounded-xl border border-[hsl(var(--greffio-coral)/0.25)] bg-[hsl(var(--greffio-coral)/0.06)] p-4 text-sm leading-6 text-foreground"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--greffio-coral))]" aria-hidden />
              <p>{message}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button type="button" variant="outline" className="rounded-full font-bold" onClick={onRestart}>
          Recommencer le questionnaire
        </Button>
        <Button asChild variant="outline" className="rounded-full font-bold">
          <Link to="/tarifs">Voir les tarifs Greffio</Link>
        </Button>
        <Button asChild variant="ghost" className="rounded-full font-bold">
          <Link to="/creation-entreprise">Comprendre les frais légaux</Link>
        </Button>
      </div>
    </section>
  );
};

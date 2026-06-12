import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { AVAILABILITY_LABELS } from '@/config/legalFormComparator.js';
import { cn } from '@/lib/utils';

const fitBadgeClass = {
  strong: 'border-[hsl(var(--greffio-mint)/0.45)] bg-[hsl(var(--greffio-mint)/0.12)] text-[hsl(var(--greffio-blue-900))]',
  good: 'border-primary/30 bg-secondary text-primary',
  possible: 'border-border bg-muted text-foreground',
  weak: 'border-[hsl(var(--we-border))] bg-white text-muted-foreground',
  avoid: 'border-[hsl(var(--greffio-coral)/0.35)] bg-[hsl(var(--greffio-coral)/0.08)] text-[hsl(var(--greffio-blue-900))]',
};

export const LegalFormRecommendationCard = ({
  recommendation,
  variant = 'primary',
  showCta = true,
}) => {
  if (!recommendation) return null;

  const isPrimary = variant === 'primary';
  const greffioKey = recommendation.cta?.greffioAvailability;
  const availabilityText = greffioKey === 'AVAILABLE_NOW'
    ? AVAILABILITY_LABELS.available_now
    : greffioKey === 'COMING_SOON'
      ? AVAILABILITY_LABELS.coming_soon
      : greffioKey === 'MANUAL_QUOTE'
        ? AVAILABILITY_LABELS.manual_quote
        : null;

  return (
    <article
      className={cn(
        'rounded-2xl border p-5',
        isPrimary
          ? 'border-primary/35 bg-gradient-to-br from-secondary/60 via-white to-white shadow-elevation-md'
          : 'border-border bg-white shadow-elevation-sm',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-primary">
            {isPrimary ? 'Recommandation principale' : 'Alternative à comparer'}
          </p>
          <h3 className="mt-1 text-xl font-extrabold text-[hsl(var(--greffio-blue-900))]">
            {recommendation.title}
          </h3>
          {recommendation.longLabel && recommendation.longLabel !== recommendation.title ? (
            <p className="mt-1 text-sm text-muted-foreground">{recommendation.longLabel}</p>
          ) : null}
        </div>
        <span
          className={cn(
            'inline-flex rounded-full border px-3 py-1 text-xs font-bold',
            fitBadgeClass[recommendation.fitLevel] || fitBadgeClass.possible,
          )}
        >
          {recommendation.fitLevelLabel}
        </span>
      </div>

      {isPrimary ? (
        <p className="mt-4 text-sm leading-7 text-foreground">
          Votre projet semble compatible avec une {recommendation.title}. {recommendation.summary}
        </p>
      ) : (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{recommendation.summary}</p>
      )}

      {recommendation.reasons?.length ? (
        <div className="mt-4">
          <p className="text-sm font-bold text-foreground">Pourquoi cette forme ressort</p>
          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-muted-foreground">
            {recommendation.reasons.slice(0, isPrimary ? 5 : 3).map((reason) => (
              <li key={reason} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {isPrimary && recommendation.cautions?.length ? (
        <div className="mt-4 rounded-xl border border-[hsl(var(--we-border))] bg-[hsl(var(--we-bg))] p-4">
          <p className="text-sm font-bold text-foreground">Points de vigilance</p>
          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-muted-foreground">
            {recommendation.cautions.slice(0, 5).map((caution) => (
              <li key={caution}>{caution}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {availabilityText ? (
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-primary">
          {availabilityText}
        </p>
      ) : null}

      {showCta && recommendation.cta ? (
        <div className="mt-4">
          <Button
            asChild
            variant={recommendation.cta.variant === 'outline' ? 'outline' : 'default'}
            className="h-11 w-full rounded-full font-extrabold sm:w-auto"
          >
            <Link to={recommendation.cta.href}>
              {recommendation.cta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      ) : null}
    </article>
  );
};

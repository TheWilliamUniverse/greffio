import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { AvailabilityBadge, FitBadge, LegalFormBadge } from '@/components/comparator/LegalFormBadge.jsx';
import { LEGAL_FORM_FEATURE_BADGES } from '@/config/legalFormComparator.js';
import { cn } from '@/lib/utils';

export const LegalFormRecommendationCard = ({
  recommendation,
  variant = 'primary',
  showCta = true,
}) => {
  if (!recommendation) return null;

  const isPrimary = variant === 'primary';
  const greffioKey = recommendation.cta?.greffioAvailability;
  const featureBadges = LEGAL_FORM_FEATURE_BADGES[recommendation.formKey] || [];

  return (
    <article
      className={cn(
        'min-w-0 rounded-2xl border',
        isPrimary
          ? 'border-primary/30 bg-gradient-to-br from-secondary/55 via-white to-white p-6 shadow-elevation-md md:p-8'
          : 'border-border bg-white p-5 shadow-elevation-sm',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
            {isPrimary ? (
              <>
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Recommandation principale
              </>
            ) : 'Alternative crédible'}
          </p>
          <h3 className={cn(
            'mt-1.5 font-extrabold text-[hsl(var(--greffio-blue-900))]',
            isPrimary ? 'text-2xl md:text-3xl' : 'text-xl',
          )}
          >
            {recommendation.title}
          </h3>
          {recommendation.longLabel && recommendation.longLabel !== recommendation.title ? (
            <p className="mt-1 text-sm text-muted-foreground">{recommendation.longLabel}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <FitBadge fitLevel={recommendation.fitLevel} label={recommendation.fitLevelLabel} />
          {greffioKey ? <AvailabilityBadge availability={greffioKey} /> : null}
        </div>
      </div>

      {featureBadges.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {featureBadges.map((badge) => (
            <LegalFormBadge key={badge} tone="blue">{badge}</LegalFormBadge>
          ))}
        </div>
      ) : null}

      {isPrimary ? (
        <p className="mt-4 text-sm leading-7 text-foreground md:text-[15px]">
          La {recommendation.title} est la forme qui semble la plus cohérente avec vos réponses. {recommendation.summary}
        </p>
      ) : (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{recommendation.summary}</p>
      )}

      {recommendation.reasons?.length ? (
        <div className="mt-5">
          <p className="text-sm font-extrabold text-[hsl(var(--greffio-blue-900))]">Pourquoi cette forme ressort</p>
          <ul className="mt-2.5 space-y-2 text-sm leading-6 text-muted-foreground">
            {recommendation.reasons.slice(0, isPrimary ? 5 : 3).map((reason) => (
              <li key={reason} className="flex gap-2.5">
                <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {isPrimary && recommendation.cautions?.length ? (
        <div className="mt-5 rounded-xl border border-[hsl(var(--we-border))] bg-[hsl(var(--we-bg))] p-4 md:p-5">
          <p className="flex items-center gap-2 text-sm font-extrabold text-[hsl(var(--greffio-blue-900))]">
            <ShieldAlert className="h-4 w-4 text-primary" aria-hidden />
            Points de vigilance
          </p>
          <ul className="mt-2.5 space-y-2 text-sm leading-6 text-muted-foreground">
            {recommendation.cautions.slice(0, 5).map((caution) => (
              <li key={caution} className="flex gap-2.5">
                <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--we-border))]" aria-hidden />
                <span>{caution}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {isPrimary ? (
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          À confirmer selon votre situation fiscale, sociale et comptable.
        </p>
      ) : null}

      {showCta && recommendation.cta ? (
        <div className="mt-5">
          <Button
            asChild
            variant={recommendation.cta.variant === 'outline' ? 'outline' : 'default'}
            className="h-12 w-full rounded-full font-extrabold sm:w-auto sm:px-7"
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

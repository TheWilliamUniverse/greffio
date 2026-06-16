import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BadgeCheck, FileSignature, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils.js';
import {
  FORMALITY_POWER_STATUS_LABELS,
  mapFormalityPowerStatus,
} from '@/utils/formalityPowerDocuments.js';

const STATUS_VARIANTS = {
  missing: 'bg-muted text-muted-foreground',
  pending_signature: 'bg-amber-100 text-amber-800',
  signed: 'bg-sky-100 text-sky-800',
  signed_unverified: 'bg-amber-100 text-amber-800',
  verified: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-destructive/10 text-destructive',
  requires_manual_review: 'bg-secondary text-primary',
};

export const DocumentStatusCard = React.memo(({
  title,
  subtitle,
  status,
  badges = [],
  metadata,
  warning,
  icon: Icon = FileSignature,
  actions = [],
  className,
  shieldNotch = false,
}) => {
  const normalizedStatus = status || 'requires_manual_review';
  const statusLabel = FORMALITY_POWER_STATUS_LABELS[normalizedStatus] || 'À vérifier';

  return (
    <article className={cn(
      'rounded-2xl border border-border bg-white p-5 shadow-elevation-sm',
      shieldNotch && 'relative overflow-visible pr-16 sm:pr-20',
      className,
    )}>
      {shieldNotch ? (
        <div
          className="absolute right-0 top-5 flex h-14 w-14 items-center justify-center rounded-l-2xl bg-primary text-white shadow-md"
          aria-hidden="true"
        >
          <ShieldCheck className="h-7 w-7" strokeWidth={2.2} />
        </div>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-extrabold text-foreground">{title}</h3>
              <Badge className={cn('border-0', STATUS_VARIANTS[normalizedStatus] || STATUS_VARIANTS.requires_manual_review)}>
                {statusLabel}
              </Badge>
              {badges.map((badge) => (
                <Badge key={badge} variant="outline" className="bg-background">
                  {badge}
                </Badge>
              ))}
            </div>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        {actions.length ? (
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                key={action.label}
                type="button"
                variant={action.variant || 'outline'}
                className={action.variant === 'default' ? undefined : 'bg-white'}
                onClick={action.onClick}
                disabled={action.disabled}
                asChild={Boolean(action.to)}
              >
                {action.to ? <Link to={action.to}>{action.label}</Link> : action.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      {metadata?.length ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {metadata.map((item) => (
            <div key={item.label} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{item.label}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-foreground">{item.value || 'À vérifier'}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {warning ? (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{warning}</p>
        </div>
      ) : null}
    </article>
  );
});

export const buildPowerDocumentStatus = (document) => mapFormalityPowerStatus(document);

export const PowerVerifiedBadge = () => (
  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
    <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
    Vaut procuration
  </span>
);

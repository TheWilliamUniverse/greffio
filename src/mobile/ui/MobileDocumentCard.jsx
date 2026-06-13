import React from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { StatusBadge } from '@/components/StatusBadge.jsx';
import { resolveDocumentUserAction } from '@/utils/onlineDocumentStatus.js';
import { cn } from '@/lib/utils.js';

/**
 * Carte document mobile – badge + hint actionnable + CTA unique.
 */
export const MobileDocumentCard = ({
  name,
  status,
  statusLabel,
  hint,
  cta,
  hasFile = false,
  date,
  icon: Icon = FileText,
  to,
  onAction,
  onDelete,
  deleting = false,
  className,
  minHeight = true,
}) => {
  const action = resolveDocumentUserAction(status, hasFile);
  const displayHint = hint || action.hint;
  const displayCta = cta || action.cta;
  const useActionHandler = Boolean(onAction);
  const useEditorLink = Boolean(to) && !useActionHandler;

  const ctaButton = useEditorLink ? (
    <Button asChild size="sm" className="h-10 shrink-0 rounded-xl px-4 font-bold">
      <Link to={to}>{displayCta}</Link>
    </Button>
  ) : (
    <Button
      type="button"
      size="sm"
      className="h-10 shrink-0 rounded-xl px-4 font-bold"
      onClick={onAction}
      disabled={!onAction}
    >
      {displayCta}
    </Button>
  );

  return (
    <article
      className={cn(
        'rounded-3xl border border-border/70 bg-white p-4 shadow-sm',
        minHeight && 'min-h-[132px]',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary">
          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-extrabold leading-snug text-foreground">{name}</p>
            <StatusBadge status={status} className="shrink-0 text-[10px]" showGlossary={false} />
          </div>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{displayHint}</p>
          {statusLabel ? (
            <p className="sr-only">{statusLabel}</p>
          ) : null}
          {date ? (
            <p className="mt-2 text-[11px] text-muted-foreground/80">
              Mis à jour le {new Date(date).toLocaleDateString('fr-FR')}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-3">
        {onDelete && hasFile ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-10 rounded-xl px-3 text-xs font-bold text-red-600"
            onClick={onDelete}
            disabled={deleting}
          >
            {deleting ? 'Suppression…' : 'Supprimer'}
          </Button>
        ) : null}
        {onAction || to ? ctaButton : null}
      </div>
    </article>
  );
};

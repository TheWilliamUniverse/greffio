import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { StatusBadge } from '@/components/StatusBadge.jsx';
import { resolveDocumentUserAction } from '@/utils/onlineDocumentStatus.js';
import { isDocumentPreviewAction } from '@/utils/dossierDocumentFile.js';
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
  onPreview,
  previewLoading = false,
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
  const showPreviewButton = Boolean(onPreview) && hasFile && isDocumentPreviewAction(action.action);

  const previewButton = showPreviewButton ? (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="h-10 w-10 shrink-0 rounded-xl bg-white"
      aria-label="Aperçu"
      title="Aperçu"
      onClick={(event) => {
        event.stopPropagation();
        onPreview();
      }}
      disabled={previewLoading}
    >
      {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
    </Button>
  ) : null;

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

  const handleCardClick = showPreviewButton
    ? () => { if (!previewLoading) onPreview(); }
    : undefined;

  return (
    <article
      role={handleCardClick ? 'button' : undefined}
      tabIndex={handleCardClick ? 0 : undefined}
      onClick={handleCardClick}
      onKeyDown={handleCardClick ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleCardClick();
        }
      } : undefined}
      className={cn(
        'rounded-3xl border border-border/70 bg-white p-4 shadow-sm',
        minHeight && 'min-h-[132px]',
        handleCardClick && 'cursor-pointer active:bg-secondary/20',
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
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            disabled={deleting}
          >
            {deleting ? 'Suppression…' : 'Supprimer'}
          </Button>
        ) : null}
        {previewButton}
        {!showPreviewButton && (onAction || to) ? ctaButton : null}
      </div>
    </article>
  );
};

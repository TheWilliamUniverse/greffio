import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils.js';

/**
 * Empty state premium orienté action – cockpit mobile.
 */
export const MobileEmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  secondaryLabel,
  secondaryTo,
  className,
}) => (
  <div
    className={cn(
      'rounded-3xl border border-dashed border-border bg-muted/30 p-8 text-center',
      className,
    )}
  >
    {Icon ? <Icon className="mx-auto h-9 w-9 text-primary" aria-hidden="true" /> : null}
    <h2 className="mt-3 text-base font-extrabold text-foreground">{title}</h2>
    {description ? (
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    ) : null}
    {actionLabel && (actionTo || onAction) ? (
      <Button
        asChild={Boolean(actionTo)}
        type="button"
        className="mt-5 h-11 w-full rounded-2xl"
        onClick={onAction}
      >
        {actionTo ? <Link to={actionTo}>{actionLabel}</Link> : actionLabel}
      </Button>
    ) : null}
    {secondaryLabel && secondaryTo ? (
      <Button asChild variant="outline" className="mt-2 h-11 w-full rounded-2xl bg-white">
        <Link to={secondaryTo}>{secondaryLabel}</Link>
      </Button>
    ) : null}
  </div>
);

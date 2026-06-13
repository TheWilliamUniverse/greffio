import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils.js';
import { Button } from '@/components/ui/button.jsx';

const CtaButton = ({ cta, variant = 'default' }) => {
  if (!cta) return null;
  if (cta.to) {
    return (
      <Button asChild variant={variant} className={variant === 'outline' ? 'bg-white' : undefined} disabled={cta.disabled}>
        <Link to={cta.to}>{cta.label}</Link>
      </Button>
    );
  }
  return (
    <Button type="button" variant={variant} className={variant === 'outline' ? 'bg-white' : undefined} onClick={cta.onClick} disabled={cta.disabled}>
      {cta.label}
    </Button>
  );
};

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  cta,
  secondaryCta,
  compact = false,
  className,
}) => (
  <section
    className={cn(
      'rounded-md border border-dashed border-primary/30 bg-white text-center shadow-elevation-sm',
      compact ? 'p-6' : 'p-8',
      className,
    )}
  >
    {Icon ? <Icon className="mx-auto h-10 w-10 text-primary" aria-hidden="true" /> : null}
    {title ? (
      <h2 className={cn('font-extrabold text-foreground', Icon ? 'mt-4' : '', compact ? 'text-xl' : 'text-2xl')}>
        {title}
      </h2>
    ) : null}
    {description ? (
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
    ) : null}
    {cta || secondaryCta ? (
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <CtaButton cta={cta} />
        <CtaButton cta={secondaryCta} variant="outline" />
      </div>
    ) : null}
  </section>
);

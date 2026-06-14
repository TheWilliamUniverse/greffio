import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils.js';

export const LegalAcceptanceCheckbox = ({
  checked,
  onChange,
  className,
  id = 'greffio-legal-acceptance',
}) => (
  <label
    htmlFor={id}
    className={cn(
      'flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground',
      className,
    )}
  >
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange?.(event.target.checked)}
      className="mt-1 h-4 w-4 shrink-0 rounded border-input accent-[hsl(var(--greffio-blue))]"
    />
    <span>
      J&apos;accepte les{' '}
      <Link to="/cgu" className="font-semibold text-primary hover:underline" target="_blank" rel="noopener noreferrer">
        conditions générales d&apos;utilisation
      </Link>
      {' '}et les{' '}
      <Link to="/mentions-legales#cgv" className="font-semibold text-primary hover:underline" target="_blank" rel="noopener noreferrer">
        conditions générales de vente
      </Link>
      {' '}Greffio avant de procéder au paiement.
    </span>
  </label>
);

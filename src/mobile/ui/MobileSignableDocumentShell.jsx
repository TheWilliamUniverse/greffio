import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { MobilePageContainer } from '@/mobile/ui/MobilePageContainer.jsx';
import { isCapacitorNative } from '@/utils/platform.js';

export const MobileSignableDocumentHeader = ({
  eyebrow,
  title,
  backTo = '/documents',
  backLabel = 'Retour documents',
  intro,
}) => {
  if (!isCapacitorNative()) return null;

  return (
    <div className="mb-4 rounded-2xl border border-border/70 bg-white p-4 shadow-sm">
      <Link
        to={backTo}
        className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-primary"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        {backLabel}
      </Link>
      {eyebrow ? (
        <p className="mt-2 text-xs font-bold uppercase tracking-wide text-primary">{eyebrow}</p>
      ) : null}
      {title ? <h1 className="mt-1 text-xl font-extrabold text-[hsl(var(--greffio-blue-900))]">{title}</h1> : null}
      {intro ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{intro}</p> : null}
    </div>
  );
};

/**
 * Shell mobile minimal pour éditeurs de documents signables (Mixte).
 * Masque la sidebar desktop et fournit un header natif cohérent avec le shell.
 */
export const MobileSignableDocumentShell = ({
  eyebrow,
  title,
  backTo = '/documents',
  backLabel = 'Retour documents',
  intro,
  children,
}) => {
  if (!isCapacitorNative()) return children;

  return (
    <MobilePageContainer className="space-y-4">
      <MobileSignableDocumentHeader
        eyebrow={eyebrow}
        title={title}
        backTo={backTo}
        backLabel={backLabel}
        intro={intro}
      />
      {children}
    </MobilePageContainer>
  );
};

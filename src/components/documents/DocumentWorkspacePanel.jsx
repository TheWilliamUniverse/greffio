import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

export const DocumentWorkspacePanel = ({
  title,
  dossierId,
  statusLabel = 'Brouillon',
  children,
  backTo = null,
}) => {
  const backHref = backTo || (dossierId ? `/documents?dossierId=${encodeURIComponent(dossierId)}` : '/documents');

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-border bg-white p-4 shadow-elevation-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Espace document</p>
            <h2 className="mt-1 flex items-center gap-2 text-lg font-extrabold text-foreground">
              <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate">{title}</span>
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Modifiez le contenu via le formulaire Greffio. Chaque enregistrement crée une nouvelle version PDF.
            </p>
          </div>
          <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            {statusLabel}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="bg-white">
            <Link to={backHref}>
              <ArrowLeft className="h-4 w-4" />
              Retour aux documents
            </Link>
          </Button>
        </div>
      </section>
      {children}
    </div>
  );
};

import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export const DossierBreadcrumb = ({
  dossierName = 'Dossier',
  dossierId = '',
  section = '',
}) => (
  <nav aria-label="Fil d’Ariane dossier" className="mb-4 flex flex-wrap items-center gap-1 text-xs font-semibold text-muted-foreground">
    <Link to="/dashboard" className="transition hover:text-primary">Accueil</Link>
    <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
    <Link to="/dossiers" className="transition hover:text-primary">Dossiers</Link>
    {dossierId ? (
      <>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
        <Link to={`/dossier/${dossierId}`} className="max-w-[180px] truncate transition hover:text-primary">
          {dossierName}
        </Link>
      </>
    ) : null}
    {section ? (
      <>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
        <span className="truncate text-foreground">{section}</span>
      </>
    ) : null}
  </nav>
);

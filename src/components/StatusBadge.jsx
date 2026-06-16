import React from 'react';
import { cn } from '@/lib/utils.js';
import { getDocumentStatusLabel } from '@/utils/documentStatusLabels.js';
import { getStatusGlossary } from '@/utils/statusGlossary.js';

const labels = {
  EN_COURS: 'EN COURS',
  EN_ANALYSE: 'EN ANALYSE',
  TERMINE: 'TERMINÉ',
  VALIDE: 'VALIDÉ',
  ATTENTE_DOCS: 'ATTENTE DOCS',
  URGENT: 'URGENT',
  PLANIFIE: 'PLANIFIÉ',
  REJETE: 'REJETÉ',
  MODELE: 'MODÈLE',
  A_SIGNER: 'À SIGNER',
  BROUILLON: 'BROUILLON',
  REQUESTED: 'À FOURNIR',
  UPLOADED: 'DÉPOSÉ',
  UNDER_REVIEW: 'EN VÉRIFICATION',
  PENDING_REVIEW: 'EN VÉRIFICATION',
  VALIDATED: 'VALIDÉ',
  VALID: 'VALIDÉ',
  REJECTED: 'REFUSÉ',
  INVALID: 'À CORRIGER',
  SIGNED: 'SIGNÉ',
  GENERATED: 'GÉNÉRÉ',
};

export const StatusBadge = ({ status, className, showGlossary = true }) => {
  const normalizedStatus = status.toUpperCase();
  const label = labels[normalizedStatus] || getDocumentStatusLabel(status).toUpperCase() || 'INCONNU';
  const glossary = showGlossary ? getStatusGlossary(normalizedStatus) : '';

  const getStatusStyles = (s) => {
    switch (s) {
      case 'EN_COURS':
      case 'EN_ANALYSE':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'TERMINE':
      case 'VALIDE':
      case 'VALID':
      case 'VALIDATED':
      case 'SIGNED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'UPLOADED':
      case 'GENERATED':
        return 'bg-sky-100 text-sky-900 border-sky-300';
      case 'UNDER_REVIEW':
      case 'PENDING_REVIEW':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'INVALID':
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'REQUESTED':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'ATTENTE_DOCS':
      case 'URGENT':
      case 'A_SIGNER':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'PLANIFIE':
      case 'MODELE':
      case 'BROUILLON':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'REJETE':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        getStatusStyles(normalizedStatus),
        className,
      )}
      title={glossary || undefined}
      tabIndex={showGlossary ? 0 : undefined}
    >
      {label}
      {glossary ? (
        <span className="sr-only"> – {glossary}</span>
      ) : null}
    </span>
  );
};

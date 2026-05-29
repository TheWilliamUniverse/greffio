import React from 'react';
import { cn } from '@/lib/utils.js';
import { getDocumentStatusLabel } from '@/utils/documentStatusLabels.js';

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

export const StatusBadge = ({ status, className }) => {
  const normalizedStatus = status.toUpperCase();

  const getStatusStyles = (s) => {
    switch (s) {
      case 'EN_COURS':
      case 'EN_ANALYSE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'TERMINE':
      case 'VALIDE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'ATTENTE_DOCS':
      case 'URGENT':
      case 'A_SIGNER':
        return 'bg-amber-100 text-amber-800 border-amber-200';
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
    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium border', getStatusStyles(normalizedStatus), className)}>
      {labels[normalizedStatus] || getDocumentStatusLabel(status).toUpperCase() || 'INCONNU'}
    </span>
  );
};

import React from 'react';

const WORKFLOW_BADGE_CLASSES = Object.freeze({
  pending_client_review: 'border-amber-200 bg-amber-50 text-amber-900',
  pending_ops_review: 'border-blue-200 bg-blue-50 text-blue-900',
  validated: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  signed: 'border-primary/20 bg-primary/5 text-primary',
  draft: 'border-border bg-muted/40 text-muted-foreground',
});

export const StatutesWorkflowBadge = ({ status, label, className = '' }) => {
  const normalized = String(status || 'draft').toLowerCase();
  const badgeClass = WORKFLOW_BADGE_CLASSES[normalized] || WORKFLOW_BADGE_CLASSES.draft;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass} ${className}`}>
      {label || 'Statuts'}
    </span>
  );
};

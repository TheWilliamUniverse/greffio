import React from 'react';
import { completionTone, riskTone, slaTone } from '@/components/ops/opsLabels.js';

const toneClasses = {
  ok: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  watch: 'bg-amber-50 text-amber-800 ring-amber-200',
  late: 'bg-orange-50 text-orange-800 ring-orange-200',
  critical: 'bg-rose-50 text-rose-800 ring-rose-200',
  high: 'bg-orange-50 text-orange-800 ring-orange-200',
  medium: 'bg-amber-50 text-amber-800 ring-amber-200',
  low: 'bg-slate-100 text-slate-700 ring-slate-200',
};

const Badge = ({ label, tone = 'ok' }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${toneClasses[tone] || toneClasses.ok}`}>
    {label}
  </span>
);

export const OpsSlaBadge = ({ status, label }) => (
  <Badge label={label || status} tone={slaTone(status)} />
);

export const OpsRiskBadge = ({ score }) => (
  <Badge label={`Risque ${score}/100`} tone={riskTone(score)} />
);

export const OpsCompletionBadge = ({ score }) => (
  <Badge label={`${score}% complet`} tone={completionTone(score)} />
);

export const OpsQueueBadge = ({ queue }) => {
  const labels = {
    blocked: 'Bloqué ops',
    waiting_client: 'Attente client',
    ready_to_file: 'Prêt dépôt',
  };
  const tones = {
    blocked: 'critical',
    waiting_client: 'watch',
    ready_to_file: 'ok',
  };
  return <Badge label={labels[queue] || queue || '–'} tone={tones[queue] || 'low'} />;
};

export const OpsPriorityBadge = ({ priority }) => {
  const labels = { low: 'Basse', normal: 'Normale', high: 'Haute', urgent: 'Urgente' };
  const tones = { low: 'low', normal: 'ok', high: 'watch', urgent: 'critical' };
  return <Badge label={labels[priority] || priority} tone={tones[priority] || 'low'} />;
};

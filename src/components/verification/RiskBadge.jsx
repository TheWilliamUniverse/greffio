import React from 'react';

const RISK_STYLES = {
  LOW: 'bg-emerald-100 text-emerald-800',
  MEDIUM: 'bg-amber-100 text-amber-900',
  HIGH: 'bg-orange-100 text-orange-900',
  BLOCKING: 'bg-rose-100 text-rose-900',
};

export const RiskBadge = ({ level = 'LOW' }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase ${RISK_STYLES[level] || RISK_STYLES.LOW}`}>
    {level}
  </span>
);

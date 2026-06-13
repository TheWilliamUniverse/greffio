import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

const severityStyles = {
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
  critical: 'border-red-200 bg-red-50 text-red-950',
};

export const DocumentWarningsPanel = ({ warnings = [] }) => {
  if (!warnings.length) return null;
  return (
    <div className="space-y-3">
      {warnings.map((warning) => {
        const Icon = warning.severity === 'info' ? Info : AlertTriangle;
        return (
          <div
            key={`${warning.code}-${warning.message}`}
            className={`flex gap-3 rounded-lg border px-4 py-3 text-sm ${severityStyles[warning.severity] || severityStyles.info}`}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">{warning.code?.replace(/_/g, ' ')}</p>
              <p className="mt-1 opacity-90">{warning.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

import React from 'react';

export const ProgressCircle = ({ percent }) => (
  <div className="relative h-16 w-16">
    <svg viewBox="0 0 36 36" className="h-16 w-16">
      <path className="stroke-muted" fill="none" strokeWidth="3" d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31" />
      <path
        className="stroke-primary"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${percent}, 100`}
        d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31"
      />
    </svg>
    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{percent}%</span>
  </div>
);

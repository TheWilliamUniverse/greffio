import React from 'react';
import { cn } from '@/lib/utils';

export const ProgressCircle = ({ percent, size = 'md', className }) => {
  const dimensions = size === 'lg' ? 'h-[4.5rem] w-[4.5rem]' : 'h-16 w-16';
  const labelSize = size === 'lg' ? 'text-sm' : 'text-xs';

  return (
    <div className={cn('relative shrink-0', dimensions, className)}>
      <svg viewBox="0 0 36 36" className={dimensions}>
        <path className="stroke-[#e2ebf8]" fill="none" strokeWidth="3" d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31" />
        <path
          className="stroke-primary"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${percent}, 100`}
          d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31"
        />
      </svg>
      <span className={cn('absolute inset-0 flex items-center justify-center font-extrabold text-primary', labelSize)}>
        {percent}%
      </span>
    </div>
  );
};

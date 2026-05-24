import React from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export const QuestionSectionHint = ({ title, note, className }) => (
  <div
    className={cn(
      'flex gap-3 rounded-2xl border border-primary/12 bg-gradient-to-br from-[#f0f6ff] via-white to-[#fafcff] p-4',
      className,
    )}
  >
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <Info className="h-4 w-4" strokeWidth={2.5} />
    </span>
    <div className="min-w-0">
      <p className="text-xs font-extrabold uppercase tracking-wide text-primary">{title}</p>
      {note ? (
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{note}</p>
      ) : null}
    </div>
  </div>
);

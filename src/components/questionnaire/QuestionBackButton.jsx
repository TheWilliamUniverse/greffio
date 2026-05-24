import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export const QuestionBackButton = ({
  type = 'button',
  label = 'Retour',
  disabled = false,
  className,
  ...props
}) => (
  <button
    type={type}
    disabled={disabled}
    className={cn(
      'inline-flex h-12 items-center gap-2.5 rounded-full border-2 border-[#d4e2f5] bg-white px-6',
      'text-sm font-bold text-foreground shadow-[0_6px_18px_rgba(15,31,61,0.06)]',
      'transition hover:border-primary/35 hover:bg-[#f5f9ff] disabled:pointer-events-none disabled:opacity-45',
      className,
    )}
    {...props}
  >
    <ArrowLeft className="h-4 w-4 text-primary" strokeWidth={2.5} />
    {label}
  </button>
);

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils.js';

export const PriorFieldGuide = ({
  message,
  ctaLabel,
  onNavigate,
  className,
}) => (
  <div
    className={cn(
      'rounded-2xl border border-[#c5d9f5] bg-gradient-to-br from-[#f4f8ff] via-white to-[#fafcff] p-4 shadow-[0_8px_24px_rgba(15,31,61,0.05)]',
      className,
    )}
    role="status"
  >
    <p className="text-sm leading-6 text-muted-foreground">{message}</p>
    <div className="mt-3 flex items-center gap-2">
      <motion.span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
        animate={{ x: [0, 4, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden
      >
        <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
      </motion.span>
      <button
        type="button"
        onClick={onNavigate}
        className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
      >
        {ctaLabel}
      </button>
    </div>
  </div>
);

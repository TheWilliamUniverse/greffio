import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const WizardNavButtons = ({
  onBack,
  onContinue,
  backDisabled = false,
  continueDisabled = false,
  continueLabel = 'Continuer',
  backLabel = 'Retour',
  showContinue = true,
  className,
}) => (
  <div className={cn('flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4', className)}>
    <motion.button
      type="button"
      onClick={onBack}
      disabled={backDisabled}
      whileHover={backDisabled ? undefined : { y: -1, scale: 1.01 }}
      whileTap={backDisabled ? undefined : { scale: 0.98 }}
      className={cn(
        'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-border bg-white px-6 text-sm font-bold text-foreground shadow-elevation-sm transition-colors sm:w-auto sm:justify-start',
        'hover:border-primary/40 hover:bg-muted disabled:pointer-events-none disabled:opacity-45',
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      {backLabel}
    </motion.button>

    <motion.button
      type="button"
      onClick={onContinue}
      disabled={continueDisabled}
      aria-label={continueLabel}
      whileHover={continueDisabled ? undefined : { y: -2, scale: 1.02 }}
      whileTap={continueDisabled ? undefined : { scale: 0.98 }}
      className={cn(
        'group relative inline-flex h-14 w-full touch-manipulation items-center justify-center gap-3 overflow-hidden rounded-full bg-primary px-7 text-base font-extrabold text-primary-foreground shadow-[0_14px_36px_rgba(30,77,140,0.28)] sm:w-auto sm:min-w-[10rem]',
        'disabled:pointer-events-none disabled:opacity-45',
        !showContinue && 'hidden',
      )}
    >
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/18 to-white/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <span className="relative">{continueLabel}</span>
      <span
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/18 ring-1 ring-white/35 transition-transform duration-200 group-hover:translate-x-1 group-hover:bg-white/26"
        aria-hidden
      >
        <ArrowRight className="h-5 w-5" strokeWidth={2.75} />
      </span>
    </motion.button>
  </div>
);

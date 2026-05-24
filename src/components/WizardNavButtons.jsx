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
  <div className={cn('flex items-center justify-between gap-4', className)}>
    <motion.button
      type="button"
      onClick={onBack}
      disabled={backDisabled}
      whileHover={backDisabled ? undefined : { y: -1, scale: 1.01 }}
      whileTap={backDisabled ? undefined : { scale: 0.98 }}
      className={cn(
        'inline-flex h-12 items-center gap-2 rounded-full border-2 border-border bg-white px-6 text-sm font-bold text-foreground shadow-elevation-sm transition-colors',
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
        'group relative inline-flex h-12 min-w-[3rem] touch-manipulation items-center gap-2 overflow-hidden rounded-full bg-primary px-7 text-sm font-bold text-primary-foreground shadow-elevation-md',
        'disabled:pointer-events-none disabled:opacity-45',
        !showContinue && 'hidden',
      )}
    >
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/18 to-white/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <span className="relative">{continueLabel}</span>
      <ArrowRight className="relative h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
    </motion.button>
  </div>
);

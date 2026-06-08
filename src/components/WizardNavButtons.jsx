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
  hideBack = false,
  variant = 'default',
  className,
}) => {
  const isMobile = variant === 'mobile';

  return (
  <div className={cn(
    isMobile ? 'flex flex-col items-stretch gap-2.5' : 'flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4',
    className,
  )}>
    {!hideBack ? (
    <motion.button
      type="button"
      onClick={onBack}
      disabled={backDisabled}
      whileHover={backDisabled ? undefined : { y: -1, scale: 1.01 }}
      whileTap={backDisabled ? undefined : { scale: 0.98 }}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full border bg-white font-bold text-foreground transition-colors',
        isMobile
          ? 'h-10 w-full border-[#d4e2f5] px-4 text-xs text-muted-foreground'
          : 'h-12 w-full gap-2 border-2 border-border px-6 text-sm shadow-elevation-sm sm:w-auto sm:justify-start',
        'hover:border-primary/40 hover:bg-muted disabled:pointer-events-none disabled:opacity-45',
      )}
    >
      <ArrowLeft className={isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      {backLabel}
    </motion.button>
    ) : null}

    <motion.button
      type="button"
      onClick={onContinue}
      disabled={continueDisabled}
      aria-label={continueLabel}
      aria-disabled={continueDisabled}
      whileHover={continueDisabled ? undefined : { y: isMobile ? -1 : -2, scale: 1.01 }}
      whileTap={continueDisabled ? undefined : { scale: 0.98 }}
      className={cn(
        'group relative inline-flex w-full touch-manipulation items-center justify-center overflow-hidden rounded-full bg-primary font-extrabold text-primary-foreground transition-opacity',
        isMobile
          ? 'h-12 gap-2.5 px-5 text-sm shadow-[0_10px_28px_rgba(30,77,140,0.22)]'
          : 'h-14 gap-3 px-7 text-base shadow-[0_14px_36px_rgba(30,77,140,0.28)] sm:w-auto sm:min-w-[10rem]',
        'disabled:cursor-not-allowed disabled:opacity-40',
        !showContinue && 'hidden',
      )}
    >
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/18 to-white/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <span className="relative">{continueLabel}</span>
      <span
        className={cn(
          'relative flex shrink-0 items-center justify-center rounded-full bg-white/18 ring-1 ring-white/35 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:bg-white/26',
          isMobile ? 'h-7 w-7' : 'h-9 w-9',
        )}
        aria-hidden
      >
        <ArrowRight className={isMobile ? 'h-4 w-4' : 'h-5 w-5'} strokeWidth={2.75} />
      </span>
    </motion.button>
  </div>
  );
};

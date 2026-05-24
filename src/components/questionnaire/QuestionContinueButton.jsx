import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const QuestionContinueButton = ({
  type = 'button',
  label = 'Continuer',
  disabled = false,
  className,
  ...props
}) => (
  <motion.button
    type={type}
    disabled={disabled}
    whileHover={disabled ? undefined : { y: -2, scale: 1.02 }}
    whileTap={disabled ? undefined : { scale: 0.98 }}
    className={cn(
      'group inline-flex h-14 min-w-[11rem] touch-manipulation items-center justify-center gap-3 overflow-hidden rounded-full',
      'bg-primary px-7 text-base font-extrabold text-primary-foreground',
      'shadow-[0_14px_36px_rgba(30,77,140,0.28)] transition-colors',
      'hover:bg-[#1a447c] disabled:pointer-events-none disabled:opacity-45',
      className,
    )}
    {...props}
  >
    <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/14 to-white/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    <span className="relative">{label}</span>
    <span
      className={cn(
        'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
        'bg-white/18 ring-1 ring-white/35 transition-transform duration-200',
        'group-hover:translate-x-1 group-hover:bg-white/26',
      )}
      aria-hidden
    >
      <ArrowRight className="h-5 w-5" strokeWidth={2.75} />
    </span>
  </motion.button>
);

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils.js';
import { greffioTileTap } from '@/motion/greffioMotion.js';
import { lightQuestionnaireHaptic, successQuestionnaireHaptic } from '@/utils/questionnaireHaptics.js';

export const MobileChoiceTile = ({
  title,
  description,
  kicker,
  icon: Icon,
  imageSrc,
  iconTone = 'bg-secondary',
  selected = false,
  onSelect,
  disabled = false,
  compact = false,
  className,
}) => {
  const handleSelect = () => {
    if (disabled) return;
    void lightQuestionnaireHaptic();
    onSelect?.();
    if (!selected) void successQuestionnaireHaptic();
  };

  return (
  <motion.button
    type="button"
    role="radio"
    aria-checked={selected}
    disabled={disabled}
    onClick={handleSelect}
    whileHover={disabled ? undefined : { y: -2 }}
    {...(disabled ? {} : greffioTileTap)}
    className={cn(
      'mobile-choice-tile group relative flex w-full flex-col text-left transition-all duration-200 ease-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
      compact ? 'min-h-[2.75rem] rounded-2xl p-2.5 sm:min-h-[3rem] sm:p-3.5' : 'min-h-[3.25rem] rounded-[22px] p-4 sm:min-h-[3.5rem] sm:p-5',
      selected
        ? 'border-2 border-primary bg-secondary/70 shadow-[0_10px_28px_rgba(30,77,140,0.12)]'
        : 'border border-[#d4e2f5] bg-white shadow-[0_2px_12px_rgba(15,31,61,0.05)] hover:border-primary/30 hover:shadow-[0_12px_32px_rgba(15,31,61,0.1)]',
      disabled && 'cursor-not-allowed opacity-60',
      className,
    )}
  >
    {imageSrc ? (
      <span
        className={cn(
          'mb-2.5 shrink-0 overflow-hidden rounded-xl',
          compact ? 'h-9 w-9 sm:h-11 sm:w-11' : 'h-12 w-12',
        )}
      >
        <img
          src={imageSrc}
          alt=""
          width={48}
          height={48}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </span>
    ) : Icon ? (
      <span
        className={cn(
          'mb-2.5 flex shrink-0 items-center justify-center rounded-xl text-primary',
          iconTone,
          compact ? 'h-8 w-8 sm:h-9 sm:w-9' : 'h-10 w-10',
        )}
      >
        <Icon className={compact ? 'h-3.5 w-3.5 sm:h-4 sm:w-4' : 'h-5 w-5'} strokeWidth={2.2} aria-hidden />
      </span>
    ) : null}
    {kicker ? (
      <span className={cn('font-bold uppercase tracking-[0.12em] text-primary/70', compact ? 'text-[9px] sm:text-[10px]' : 'text-[10px]')}>
        {kicker}
      </span>
    ) : null}
    <span
      className={cn(
        'block font-extrabold leading-snug text-[hsl(var(--greffio-blue-900))]',
        compact ? 'text-xs sm:text-sm' : 'text-base',
        selected && 'text-primary',
      )}
    >
      {title}
    </span>
    {description ? (
      <span className={cn('mt-0.5 block leading-snug text-muted-foreground', compact ? 'line-clamp-2 text-[11px] sm:mt-1 sm:text-xs' : 'mt-1 text-sm')}>
        {description}
      </span>
    ) : null}
  </motion.button>
  );
};

export const MobileChoiceStep = ({
  kicker,
  title,
  subtitle,
  hint,
  progressPercent,
  stepCurrent,
  stepTotal,
  children,
  className,
  gridClassName,
}) => (
  <div className={cn('mobile-choice-step flex min-h-[min(58vh,520px)] w-full flex-col', className)}>
    <header className="shrink-0 space-y-1.5">
      {kicker ? (
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">{kicker}</p>
      ) : null}
      <h2 className="font-display text-xl font-extrabold leading-snug tracking-tight text-[hsl(var(--greffio-blue-900))]">
        {title}
      </h2>
      {subtitle ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
      ) : null}
      {typeof progressPercent === 'number' ? (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[#e8f0fa]">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
          />
        </div>
      ) : null}
      {stepCurrent && stepTotal ? (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Question {stepCurrent} sur {stepTotal}
        </p>
      ) : null}
    </header>

    <div className="flex flex-1 flex-col items-center justify-center py-4 sm:py-6">
      <div
        className={cn(
          'mobile-choice-grid w-full max-w-md',
          gridClassName || 'grid grid-cols-2 gap-2.5',
        )}
        role="radiogroup"
        aria-label={title}
      >
        {children}
      </div>
    </div>

    {hint ? (
      <p className="shrink-0 text-center text-xs font-medium text-primary/85">{hint}</p>
    ) : null}
  </div>
);

export const MOBILE_CHOICE_TWO_COL_GRID = 'grid grid-cols-2 gap-2.5';

export const isMobileChoiceField = (field) => (
  Boolean(field && (field.type === 'select' || field.type === 'checkbox'))
);

export const isMobileTapToAdvanceGroup = (fields = []) => (
  fields.length === 1 && isMobileChoiceField(fields[0])
);

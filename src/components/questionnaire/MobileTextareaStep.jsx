import React, { useId, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { useMobileKeyboardInset } from '@/hooks/useMobileKeyboardInset.js';

export const MobileTextareaStep = ({
  kicker,
  title,
  subtitle,
  hint = 'Utilisez la flèche lorsque votre réponse est prête.',
  progressPercent,
  stepCurrent,
  stepTotal,
  fieldId,
  value = '',
  placeholder = '',
  minLength = 12,
  onChange,
  onAdvance,
  canAdvance = false,
  invalid = false,
  errorMessage = '',
  compact = false,
  showProgressBar = true,
  showStepMeta = true,
}) => {
  const generatedId = useId();
  const textareaRef = useRef(null);
  const resolvedId = fieldId || generatedId;
  const errorId = `${resolvedId}-error`;
  const charCount = String(value || '').trim().length;

  useMobileKeyboardInset(compact);

  return (
    <div
      className={cn(
        'mobile-textarea-step flex w-full flex-col',
        compact
          ? 'gap-3 pb-[var(--greffio-keyboard-inset,0px)]'
          : 'min-h-[min(58vh,520px)]',
      )}
    >
      <header className={cn('shrink-0', compact ? 'space-y-1' : 'space-y-1.5')}>
        {!compact && kicker ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">{kicker}</p>
        ) : null}
        <h2 className="font-display text-xl font-extrabold leading-snug tracking-tight text-[hsl(var(--greffio-blue-900))]">
          {title}
        </h2>
        {!compact && subtitle ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        ) : null}
        {!compact && showProgressBar && typeof progressPercent === 'number' ? (
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[#e8f0fa]">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
            />
          </div>
        ) : null}
      </header>

      <div className={cn(compact ? 'pt-1' : 'flex flex-1 flex-col justify-center py-4 sm:py-6')}>
        <div className="relative mx-auto w-full max-w-md">
          <textarea
            ref={textareaRef}
            id={resolvedId}
            value={value}
            placeholder={placeholder}
            rows={compact ? 4 : 5}
            aria-invalid={invalid || undefined}
            aria-describedby={errorMessage ? errorId : undefined}
            onChange={(event) => onChange?.(event.target.value)}
            className={cn(
              'w-full rounded-2xl border-2 bg-white px-4 py-3 text-base font-medium shadow-sm',
              compact ? 'min-h-[112px]' : 'min-h-[140px]',
              invalid ? 'border-red-400' : 'border-[#d4e2f5] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/12',
            )}
          />
          {canAdvance ? (
            <button
              type="button"
              aria-label="Question suivante"
              onClick={onAdvance}
              className="absolute bottom-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-md"
            >
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
          {charCount}/{minLength} caractères minimum
        </p>
        {errorMessage ? (
          <p id={errorId} className="mx-auto mt-3 max-w-md text-xs text-destructive">{errorMessage}</p>
        ) : null}
      </div>

      {hint ? (
        <p className="shrink-0 text-center text-xs font-medium text-primary/85">{hint}</p>
      ) : null}
    </div>
  );
};

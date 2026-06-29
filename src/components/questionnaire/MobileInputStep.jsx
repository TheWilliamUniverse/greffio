import React, { useEffect, useId, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input.jsx';
import { cn } from '@/lib/utils.js';
import { useMobileKeyboardInset } from '@/hooks/useMobileKeyboardInset.js';

export const MobileInputStep = ({
  kicker,
  title,
  subtitle,
  hint,
  progressPercent,
  stepCurrent,
  stepTotal,
  fieldId,
  value = '',
  placeholder = '',
  inputMode = 'text',
  inputType = 'text',
  enterKeyHint = 'next',
  autoFocus = false,
  invalid = false,
  errorMessage = '',
  onChange,
  onAdvance,
  canAdvance = false,
  compact = false,
  autoAdvanceMs = 0,
  showProgressBar = true,
  showStepMeta = true,
  children,
  extra,
}) => {
  const generatedId = useId();
  const inputRef = useRef(null);
  const resolvedId = fieldId || generatedId;
  const errorId = `${resolvedId}-error`;

  useMobileKeyboardInset(compact);

  useEffect(() => {
    if (!autoFocus || !inputRef.current) return undefined;
    const timer = window.setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [autoFocus, resolvedId]);

  useEffect(() => {
    if (!autoAdvanceMs || !canAdvance || typeof onAdvance !== 'function') return undefined;
    const timer = window.setTimeout(() => {
      onAdvance();
    }, autoAdvanceMs);
    return () => window.clearTimeout(timer);
  }, [autoAdvanceMs, canAdvance, value, onAdvance]);

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    if (canAdvance && typeof onAdvance === 'function') onAdvance();
  };

  const scrollInputToEnd = () => {
    const input = inputRef.current;
    if (!input || typeof input.scrollLeft !== 'number') return;
    input.scrollLeft = input.scrollWidth;
  };

  return (
    <div
      className={cn(
        'mobile-input-step flex w-full flex-col',
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
        {!compact && showStepMeta && stepCurrent && stepTotal ? (
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Question {stepCurrent} sur {stepTotal}
          </p>
        ) : null}
      </header>

      <div className={cn(compact ? 'pt-1' : 'flex flex-1 flex-col justify-center py-4 sm:py-6')}>
        <div className="mx-auto w-full max-w-md space-y-3">
          <Input
            ref={inputRef}
            id={resolvedId}
            type={inputType}
            inputMode={inputMode}
            enterKeyHint={enterKeyHint}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={value}
            placeholder={placeholder}
            aria-invalid={invalid || undefined}
            aria-describedby={errorMessage ? errorId : undefined}
            onChange={(event) => {
              onChange?.(event.target.value);
              window.requestAnimationFrame(scrollInputToEnd);
            }}
            onFocus={scrollInputToEnd}
            onKeyDown={handleKeyDown}
            className={cn(
              'h-14 w-full overflow-x-auto rounded-2xl border-2 bg-white px-4 text-base font-semibold shadow-sm',
              invalid ? 'border-red-400' : 'border-[#d4e2f5] focus-visible:border-primary',
            )}
          />
          {canAdvance ? (
            <div className="flex justify-end">
              <button
                type="button"
                aria-label="Question suivante"
                onClick={onAdvance}
                className="inline-flex h-11 min-w-[3rem] items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-white shadow-md"
              >
                Continuer
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
        {extra}
        {children}
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

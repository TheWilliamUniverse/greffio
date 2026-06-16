import React from 'react';
import { QuestionBackButton } from '@/components/questionnaire/QuestionBackButton.jsx';
import { QuestionContinueButton } from '@/components/questionnaire/QuestionContinueButton.jsx';
import { MobileStickyFormActions } from '@/mobile/ui/MobileStickyFormActions.jsx';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';
import { cn } from '@/lib/utils.js';

export const StepLayout = ({
  title,
  description,
  reference,
  progress,
  progressNode,
  autosaveNode,
  securityNode,
  onBack,
  onNext,
  canGoBack,
  canGoNext,
  continueLabel = 'Continuer',
  onEnterNext,
  hideContinueButton = false,
  compactMobile = false,
  children,
}) => {
  const nativeApp = isCapacitorNative();
  const mobileShell = nativeApp || isMobileBrowserViewport();
  const tapToAdvanceMobile = mobileShell && hideContinueButton;
  const actionBarClass = mobileShell
    ? 'border-t border-border bg-white/95 px-4 py-4 backdrop-blur-sm md:static md:bg-background md:px-6 md:py-5 md:backdrop-blur-none lg:px-8'
    : 'flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background px-6 py-5 md:px-8';

  return (
  <section
    className={cn(
      'overflow-hidden bg-white',
      mobileShell
        ? 'rounded-none border-0 shadow-none'
        : 'rounded-[1.35rem] border border-border shadow-elevation-md',
    )}
    onKeyDown={(event) => {
      if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
      const tagName = String(event.target?.tagName || '').toUpperCase();
      const isTextarea = tagName === 'TEXTAREA';
      const isButton = tagName === 'BUTTON';
      if (isTextarea || isButton) return;
      event.preventDefault();
      if (!canGoNext || typeof onEnterNext !== 'function') return;
      onEnterNext();
    }}
  >
    <div className={cn(
      'border-b border-border bg-gradient-to-br from-secondary/40 via-white to-white',
      compactMobile ? 'px-4 py-3' : 'px-6 py-6 md:px-8',
    )}>
      {tapToAdvanceMobile ? (
        <div className={cn('flex', compactMobile ? 'mb-2' : 'mb-3')}>
          <QuestionBackButton
            type="button"
            onClick={onBack}
            disabled={!canGoBack}
            className={compactMobile ? 'h-10 px-4 text-xs' : undefined}
          />
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {!compactMobile ? (
            <>
              <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Réf. : {reference}</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))] md:text-[1.65rem]">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
            </>
          ) : (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{reference}</p>
              <p className="mt-0.5 text-xs font-semibold text-primary">{title}</p>
            </>
          )}
        </div>
        {!compactMobile ? progressNode : null}
      </div>
      <div className={cn('flex items-center justify-between gap-4', compactMobile ? 'mt-2' : 'mt-4')}>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-background ring-1 ring-border">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="shrink-0">{autosaveNode}</div>
      </div>
    </div>

    <div className={cn(
      compactMobile ? 'space-y-3 p-4' : 'space-y-6 p-6 md:p-8 md:pt-7',
      mobileShell && !tapToAdvanceMobile && 'pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0',
    )}>
      {children}
      {!compactMobile ? securityNode : null}
    </div>

    {!tapToAdvanceMobile ? (
      mobileShell ? (
        <MobileStickyFormActions
          aboveBottomNav
          innerClassName="flex-row flex-wrap items-center justify-between gap-3"
        >
          <QuestionBackButton type="button" onClick={onBack} disabled={!canGoBack} />
          {!hideContinueButton ? (
            <QuestionContinueButton type="button" label={continueLabel} onClick={onNext} disabled={!canGoNext} />
          ) : null}
        </MobileStickyFormActions>
      ) : (
        <div className={cn(actionBarClass, 'flex flex-wrap items-center justify-between gap-3')}>
          <QuestionBackButton type="button" onClick={onBack} disabled={!canGoBack} />
          {!hideContinueButton ? (
            <QuestionContinueButton type="button" label={continueLabel} onClick={onNext} disabled={!canGoNext} />
          ) : null}
        </div>
      )
    ) : null}
  </section>
  );
};

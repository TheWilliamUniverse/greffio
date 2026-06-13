import React from 'react';
import { QuestionBackButton } from '@/components/questionnaire/QuestionBackButton.jsx';
import { QuestionContinueButton } from '@/components/questionnaire/QuestionContinueButton.jsx';
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
  children,
}) => {
  const nativeApp = isCapacitorNative();
  const mobileShell = nativeApp || isMobileBrowserViewport();
  const bottomNavVar = nativeApp ? 'var(--bottom-nav-height)' : 'var(--bottom-nav-height-web, 3.5rem)';
  const stickyBottomStyle = mobileShell
    ? { bottom: `calc(${bottomNavVar} + env(safe-area-inset-bottom))` }
    : undefined;
  const actionBarClass = mobileShell
    ? 'sticky z-20 border-t border-border bg-white/95 px-4 py-4 backdrop-blur-sm md:static md:bg-background md:px-6 md:py-5 md:backdrop-blur-none lg:px-8'
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
    <div className="border-b border-border bg-gradient-to-br from-secondary/40 via-white to-white px-6 py-6 md:px-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Réf. : {reference}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))] md:text-[1.65rem]">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {progressNode}
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="h-2.5 w-full max-w-md overflow-hidden rounded-full bg-background ring-1 ring-border">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="shrink-0">{autosaveNode}</div>
      </div>
    </div>

    <div className="space-y-6 p-6 md:p-8 md:pt-7">
      {children}
      {securityNode}
    </div>

    <div className={cn(actionBarClass, 'flex flex-wrap items-center justify-between gap-3')} style={stickyBottomStyle}>
      <QuestionBackButton type="button" onClick={onBack} disabled={!canGoBack} />
      {!hideContinueButton ? (
        <QuestionContinueButton type="button" label={continueLabel} onClick={onNext} disabled={!canGoNext} />
      ) : null}
    </div>
  </section>
  );
};

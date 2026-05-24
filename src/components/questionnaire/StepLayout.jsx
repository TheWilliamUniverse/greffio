import React from 'react';
import { QuestionBackButton } from '@/components/questionnaire/QuestionBackButton.jsx';
import { QuestionContinueButton } from '@/components/questionnaire/QuestionContinueButton.jsx';

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
  onEnterNext,
  children,
}) => (
  <section
    className="overflow-hidden rounded-[1.35rem] border border-[#d4e2f5] bg-white shadow-[0_18px_48px_rgba(15,31,61,0.08)]"
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
    <div className="border-b border-[#e2ebf8] bg-gradient-to-br from-[#f0f6ff] via-white to-white px-6 py-6 md:px-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Réf. : {reference}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))] md:text-[1.65rem]">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {progressNode}
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="h-2.5 w-full max-w-md overflow-hidden rounded-full bg-white ring-1 ring-[#d4e2f5]">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="shrink-0">{autosaveNode}</div>
      </div>
    </div>

    <div className="space-y-6 p-6 md:p-8 md:pt-7">
      {children}
      {securityNode}
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e2ebf8] bg-[#fafcff] px-6 py-5 md:px-8">
      <QuestionBackButton type="button" onClick={onBack} disabled={!canGoBack} />
      <QuestionContinueButton type="button" onClick={onNext} disabled={!canGoNext} />
    </div>
  </section>
);

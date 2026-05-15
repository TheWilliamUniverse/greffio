import React from 'react';
import { Button } from '@/components/ui/button.jsx';

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
  children,
}) => (
  <section className="rounded-md border border-border bg-white shadow-elevation-md">
    <div className="border-b border-border bg-muted px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-primary">Réf. : {reference}</p>
          <h1 className="mt-1 text-2xl font-extrabold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {progressNode}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="ml-4 shrink-0">{autosaveNode}</div>
      </div>
    </div>

    <div className="space-y-6 p-6 md:p-8">
      {children}
      {securityNode}
    </div>

    <div className="flex items-center justify-between border-t border-border px-6 py-4">
      <Button type="button" variant="outline" className="bg-white" onClick={onBack} disabled={!canGoBack}>
        Retour
      </Button>
      <Button type="button" onClick={onNext} disabled={!canGoNext}>
        Continuer
      </Button>
    </div>
  </section>
);

import React from 'react';
import { Button } from '@/components/ui/button.jsx';

/**
 * Écran de pré-permission Greffio avant prompt OS (caméra, notifications…).
 */
export const MobilePermissionPrompt = ({
  open,
  icon: Icon,
  title,
  description,
  benefit,
  confirmLabel = 'Autoriser',
  cancelLabel = 'Plus tard',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div
        className="w-full max-w-lg rounded-3xl border border-border bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-permission-title"
      >
        {Icon ? (
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
            <Icon className="h-7 w-7 text-primary" aria-hidden="true" />
          </span>
        ) : null}
        <h2 id="mobile-permission-title" className="text-center text-lg font-extrabold text-foreground">
          {title}
        </h2>
        <p className="mt-2 text-center text-sm leading-6 text-muted-foreground">{description}</p>
        {benefit ? (
          <p className="mt-3 rounded-2xl bg-secondary/50 px-4 py-3 text-center text-sm font-semibold text-[hsl(var(--greffio-blue-900))]">
            {benefit}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col gap-2">
          <Button type="button" className="h-11 w-full rounded-2xl" onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button type="button" variant="outline" className="h-11 w-full rounded-2xl bg-white" onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

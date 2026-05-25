import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ArrowUpRight, Loader2, RefreshCw, ShieldAlert, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils.js';
import { isUpdateAvailable, isUpdateBlocking } from '@/services/appUpdate/appUpdateTypes.js';

const stop = (event) => {
  event.preventDefault();
  event.stopPropagation();
};

const renderChangelog = (changelog) => {
  if (!Array.isArray(changelog) || changelog.length === 0) return null;
  return (
    <ul className="mt-4 space-y-2 rounded-2xl border border-[#dde6f5] bg-[#f5f9ff] p-4">
      {changelog.slice(0, 8).map((item, index) => (
        <li key={`${index}-${item}`} className="flex items-start gap-2 text-sm text-[#314368]">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#1a447c]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
};

export const AppUpdateDialog = ({ open, state, starting, onUpdate, onDismiss }) => {
  if (!isUpdateAvailable(state)) return null;

  const blocking = isUpdateBlocking(state);
  const title = blocking
    ? 'Mise à jour requise'
    : state?.title || 'Nouvelle version disponible';
  const message = state?.message
    || (blocking
      ? "Cette version de Greffio n'est plus prise en charge. Mettez-à-jour pour continuer."
      : "Une nouvelle version de Greffio est disponible.");

  const handleOpenChange = (next) => {
    if (next) return;
    if (blocking) return;
    void onDismiss?.();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-[200] bg-[#0b1a36]/65 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
        />
        <DialogPrimitive.Content
          onPointerDownOutside={blocking ? stop : undefined}
          onEscapeKeyDown={blocking ? stop : undefined}
          onInteractOutside={blocking ? stop : undefined}
          className={cn(
            'fixed left-1/2 top-1/2 z-[201] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2',
            'rounded-3xl border border-[#d7e2f4] bg-white p-6 shadow-[0_28px_80px_rgba(15,31,61,0.28)]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'sm:p-7',
          )}
        >
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                blocking ? 'bg-[#fee9ea] text-[#b3261e]' : 'bg-[#e8efff] text-[#1a447c]',
              )}
            >
              {blocking ? <ShieldAlert className="h-6 w-6" /> : <RefreshCw className="h-6 w-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="text-lg font-bold leading-tight text-[#0b1f3d]">
                {title}
              </DialogPrimitive.Title>
              {state?.latestVersionName ? (
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#6e7a96]">
                  Version {state.latestVersionName}
                </p>
              ) : null}
            </div>
            {!blocking ? (
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => onDismiss?.()}
                className="rounded-full p-1.5 text-[#6e7a96] transition-colors hover:bg-[#f1f4fb] hover:text-[#0b1f3d]"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <DialogPrimitive.Description className="mt-4 text-sm leading-relaxed text-[#314368]">
            {message}
          </DialogPrimitive.Description>

          {renderChangelog(state?.changelog)}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {!blocking ? (
              <Button
                variant="outline"
                size="default"
                onClick={() => onDismiss?.()}
                disabled={starting}
                className="w-full sm:w-auto"
              >
                Plus tard
              </Button>
            ) : null}
            <Button
              size="default"
              onClick={() => onUpdate?.()}
              disabled={starting}
              className="w-full sm:w-auto"
            >
              {starting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ouverture…
                </>
              ) : (
                <>
                  Mettre à jour
                  <ArrowUpRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          {blocking ? (
            <p className="mt-4 text-center text-xs text-[#6e7a96]">
              Cette mise à jour est requise pour continuer.
            </p>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default AppUpdateDialog;

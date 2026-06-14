import React from 'react';
import { Download, ExternalLink, FileText, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils.js';
import { isCapacitorNative } from '@/utils/platform.js';

export const MobileDocumentPreviewSheet = ({
  open,
  title = 'Aperçu document',
  previewSrc = '',
  filename = 'document.pdf',
  nativePreview = false,
  error = '',
  downloading = false,
  onClose,
  onDownload,
  onOpenExternal,
}) => {
  if (!open) return null;

  const nativeApp = isCapacitorNative() || nativePreview;
  const showIframe = Boolean(previewSrc) && !nativeApp;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#0f172a]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{title}</p>
          <p className="truncate text-xs text-white/60">{filename}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {nativeApp && onOpenExternal ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-9 bg-white/10 text-white hover:bg-white/20"
              onClick={onOpenExternal}
              disabled={downloading}
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Ouvrir
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-9 bg-white/10 text-white hover:bg-white/20"
            onClick={onDownload}
            disabled={downloading}
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Télécharger
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="h-9 w-9 bg-white/10 text-white hover:bg-white/20"
            aria-label="Fermer l’aperçu"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <FileText className="h-12 w-12 text-red-300/80" aria-hidden="true" />
          <p className="text-sm leading-6 text-red-200">{error}</p>
          <Button type="button" variant="secondary" className="bg-white/10 text-white hover:bg-white/20" onClick={onClose}>
            Fermer
          </Button>
        </div>
      ) : showIframe ? (
        <iframe
          title={title}
          src={previewSrc}
          className={cn('min-h-0 w-full flex-1 bg-[#334155]')}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <FileText className="h-14 w-14 text-white/45" aria-hidden="true" />
          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">PDF prêt</p>
            <p className="text-xs leading-5 text-white/70">
              {nativeApp
                ? 'Sur Android, l’aperçu intégré n’est pas fiable. Ouvrez le PDF dans le lecteur de votre téléphone.'
                : 'Aperçu indisponible pour ce document.'}
            </p>
          </div>
          {nativeApp && onOpenExternal ? (
            <Button
              type="button"
              className="h-11 rounded-2xl bg-white px-6 font-bold text-[#0f172a] hover:bg-white/90"
              onClick={onOpenExternal}
              disabled={downloading}
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Ouvrir dans le lecteur
            </Button>
          ) : null}
        </div>
      )}

      {nativeApp && !error ? (
        <div className="border-t border-white/10 bg-[#0f172a]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3 text-white/70">
            <FileText className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="text-xs leading-5">
              Utilisez « Ouvrir » pour le lecteur PDF, ou « Télécharger » pour enregistrer via le menu de partage.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

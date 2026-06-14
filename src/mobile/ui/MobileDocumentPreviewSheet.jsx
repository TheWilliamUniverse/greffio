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
  downloading = false,
  onClose,
  onDownload,
  onOpenExternal,
}) => {
  if (!open || !previewSrc) return null;

  const nativeApp = isCapacitorNative();

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
      <iframe
        title={title}
        src={previewSrc}
        className={cn('min-h-0 w-full flex-1 bg-[#334155]')}
      />
      {nativeApp && onOpenExternal ? (
        <div className="border-t border-white/10 bg-[#0f172a]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3 text-white/70">
            <FileText className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="text-xs leading-5">
              Si l’aperçu est vide, ouvrez le PDF dans le lecteur de votre téléphone.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

import React from 'react';
import { Download, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils.js';

export const MobileDocumentPreviewSheet = ({
  open,
  title = 'Aperçu document',
  blobUrl = '',
  filename = 'document.pdf',
  downloading = false,
  onClose,
  onDownload,
}) => {
  if (!open || !blobUrl) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#0f172a]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{title}</p>
          <p className="truncate text-xs text-white/60">{filename}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
        src={blobUrl}
        className={cn('min-h-0 w-full flex-1 bg-[#334155]')}
      />
    </div>
  );
};

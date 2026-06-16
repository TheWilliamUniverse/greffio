import React, { lazy, Suspense } from 'react';
import { ExternalLink, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { DocumentPreviewActions } from '@/components/documents/DocumentPreviewActions.jsx';

const PdfJsCanvasViewer = lazy(() => import('@/components/documents/PdfJsCanvasViewer.jsx').then((module) => ({
  default: module.PdfJsCanvasViewer,
})));

export const MobileDocumentPreviewSheet = ({
  open,
  title = 'Aperçu document',
  previewSrc = '',
  previewArrayBuffer = null,
  previewBlob = null,
  loading = false,
  filename = 'document.pdf',
  error = '',
  downloading = false,
  dossierId = '',
  docKey = '',
  document = null,
  onClose,
  onDownload,
  onOpenExternal,
  onModify,
}) => {
  if (!open) return null;

  const hasPdfData = Boolean(previewBlob) || Boolean(previewArrayBuffer) || Boolean(previewSrc);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#0f172a]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{title}</p>
          <p className="truncate text-xs text-white/60">{filename}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <DocumentPreviewActions
            variant="mobile"
            dossierId={dossierId}
            docKey={docKey}
            document={document}
            downloading={downloading}
            downloadDisabled={!hasPdfData}
            onDownload={onDownload}
            onModify={onModify}
            className="mr-1"
          />
          {onOpenExternal ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-9 bg-white/10 text-white hover:bg-white/20"
              onClick={onOpenExternal}
              disabled={downloading || !hasPdfData}
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Ouvrir
            </Button>
          ) : null}
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
          <p className="text-sm leading-6 text-red-200">{error}</p>
          <Button type="button" variant="secondary" className="bg-white/10 text-white hover:bg-white/20" onClick={onClose}>
            Fermer
          </Button>
        </div>
      ) : hasPdfData ? (
        <Suspense fallback={(
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-white/70">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-white/70" aria-hidden="true" />
            Chargement du document…
          </div>
        )}
        >
          <PdfJsCanvasViewer
            blob={previewBlob}
            arrayBuffer={previewArrayBuffer}
            blobUrl={previewSrc}
            className="flex-1"
          />
        </Suspense>
      ) : (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-white/70">
          {loading ? (
            <>
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-white/70" aria-hidden="true" />
              Chargement du document…
            </>
          ) : (
            'Chargement du document…'
          )}
        </div>
      )}

      {!error && hasPdfData ? (
        <div className="border-t border-white/10 bg-[#0f172a]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <p className="text-xs leading-5 text-white/70">
            « Modifier » ouvre l’éditeur Greffio. « Télécharger » enregistre une copie dans Fichiers.
          </p>
        </div>
      ) : null}
    </div>
  );
};

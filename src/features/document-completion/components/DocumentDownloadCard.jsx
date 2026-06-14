import React from 'react';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

export const DocumentDownloadCard = ({
  fileName,
  sizeBytes,
  generatedAt,
  available = false,
  downloading = false,
  onDownload,
}) => (
  <div className="rounded-xl border border-border bg-white p-6 shadow-elevation-sm">
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[hsl(var(--greffio-blue)/0.1)] text-[hsl(var(--greffio-blue))]">
        <FileText className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-foreground">{fileName || 'document-a-completer.pdf'}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {sizeBytes ? `${Math.round(sizeBytes / 1024)} Ko` : 'Taille en cours de calcul'}
          {generatedAt ? ` · généré le ${new Date(generatedAt).toLocaleString('fr-FR')}` : ''}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Ouvrez ce PDF dans votre navigateur ou une application de lecture PDF pour compléter les champs bleus.
        </p>
      </div>
    </div>
    <Button
      className="mt-5 w-full gap-2 sm:w-auto"
      disabled={!available || downloading}
      onClick={onDownload}
    >
      <Download className="h-4 w-4" />
      {downloading ? 'Téléchargement…' : 'Télécharger le PDF à compléter'}
    </Button>
  </div>
);

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FolderPlus, Sparkles } from 'lucide-react';
import { DocumentDetectedFieldsSummary } from './DocumentDetectedFieldsSummary.jsx';
import { DocumentDownloadCard } from './DocumentDownloadCard.jsx';
import { DocumentWarningsPanel } from './DocumentWarningsPanel.jsx';
import { Button } from '@/components/ui/button.jsx';
import { STATUS_LABELS } from '../config.js';

export const DocumentCompletionResult = ({
  document,
  fields = [],
  downloading = false,
  onDownload,
  dossierId = null,
  exportDone = false,
  attached = false,
  attaching = false,
  attachError = '',
  onAttachToDossier,
}) => {
  if (!document) return null;
  const summary = document.analysisSummary || {};
  const ready = ['analyzed', 'needs_review', 'exported'].includes(document.status);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-white p-6 shadow-elevation-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-primary">
              {ready ? 'Document prêt' : STATUS_LABELS[document.status] || document.status}
            </p>
            <h3 className="mt-1 text-2xl font-bold text-foreground">{document.originalFile?.name}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {summary.totalFieldsDetected || fields.length || 0} champs détectés
              {summary.highConfidenceFields != null ? `, dont ${summary.highConfidenceFields} avec une confiance élevée` : ''}.
            </p>
            {summary.globalConfidence != null ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Confiance globale : {Math.round(summary.globalConfidence * 100)}%
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <DocumentWarningsPanel warnings={document.warnings || []} />
      <DocumentDetectedFieldsSummary fields={fields} />
      <DocumentDownloadCard
        fileName={document.generatedFile?.name || `${document.originalFile?.name?.replace(/\.pdf$/i, '') || 'document'}-greffio-completion.pdf`}
        sizeBytes={document.generatedFile?.sizeBytes}
        generatedAt={document.exportedAt}
        available={ready}
        downloading={downloading}
        onDownload={onDownload}
      />

      {dossierId ? (
        <div className="rounded-xl border border-[#dbe7f7] bg-[#f8fbff] p-5">
          <p className="text-sm font-semibold text-[hsl(var(--greffio-blue-900))]">
            {attached ? 'PDF ajouté au dossier' : exportDone ? 'Prochaine étape' : 'Rattachement dossier'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {attached
              ? 'Retrouvez le document dans l’espace Documents de votre dossier.'
              : 'Après téléchargement, vous pouvez ajouter le PDF complété directement au dossier.'}
          </p>
          {attachError ? (
            <p className="mt-2 text-sm text-destructive">{attachError}</p>
          ) : null}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {!attached && onAttachToDossier ? (
              <Button
                type="button"
                className="gap-2"
                disabled={!ready || attaching || downloading}
                onClick={onAttachToDossier}
              >
                <FolderPlus className="h-4 w-4" />
                {attaching ? 'Ajout en cours…' : 'Ajouter au dossier'}
              </Button>
            ) : null}
            <Button type="button" variant="outline" className="gap-2 bg-white" asChild>
              <Link to={`/dossier/${encodeURIComponent(dossierId)}`}>
                Retourner au dossier
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

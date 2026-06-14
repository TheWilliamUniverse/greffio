import React from 'react';
import { CheckCircle2, Download, ExternalLink, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { PdfPreviewPanel } from '@/components/documents/PdfPreviewPanel.jsx';
import { cn } from '@/lib/utils.js';

const formatFrenchDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    dateStyle: 'long',
    timeStyle: 'short',
  });
};

/** Présentation post-signature — niveau SignWell ou supérieur. */
export const SignedDocumentSuccessPanel = ({
  title = 'Document signé avec succès',
  subtitle = 'Votre document a été signé électroniquement via Greffio. Une preuve de signature a été générée et enregistrée dans votre dossier.',
  documentLabel = '',
  signerName = '',
  signedAt = null,
  proofId = '',
  verifyUrl = '',
  previewBlobUrl = '',
  previewFilename = 'document-signe.pdf',
  onDownload,
  downloadHref = '',
  downloadLabel = 'Télécharger le document signé',
  secondaryHref = '',
  secondaryLabel = 'Télécharger le certificat de preuve',
  onContinue,
  continueLabel = 'Retour aux documents',
  continueHref = '/documents',
  className = '',
  layout = 'page',
}) => {
  const signedAtLabel = formatFrenchDateTime(signedAt);
  const isPage = layout === 'page';

  return (
    <div
      className={cn(
        isPage
          ? 'flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center py-6 text-center'
          : 'rounded-2xl border border-border/70 bg-white p-6 shadow-elevation-sm',
        className,
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
      </div>
      <h1 className={cn('font-extrabold text-foreground', isPage ? 'mt-5 text-2xl' : 'mt-4 text-xl')}>
        {title}
      </h1>
      <p className={cn('max-w-lg leading-6 text-muted-foreground', isPage ? 'mt-2 text-sm' : 'mt-2 text-sm')}>
        {subtitle}
      </p>

      {(documentLabel || signerName || signedAtLabel || proofId) ? (
        <dl className="mt-6 w-full max-w-md rounded-xl border border-border/70 bg-muted/20 p-4 text-left text-sm">
          {documentLabel ? (
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="font-semibold text-foreground">Document</dt>
              <dd>{documentLabel}</dd>
            </div>
          ) : null}
          {signerName ? (
            <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="font-semibold text-foreground">Signataire</dt>
              <dd>{signerName}</dd>
            </div>
          ) : null}
          {signedAtLabel ? (
            <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="font-semibold text-foreground">Date</dt>
              <dd>{signedAtLabel}</dd>
            </div>
          ) : null}
          {proofId ? (
            <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="font-semibold text-foreground">Preuve</dt>
              <dd className="font-mono text-xs">{proofId}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {previewBlobUrl ? (
        <div className="mt-6 w-full max-w-2xl overflow-hidden rounded-xl border border-border/70">
          <PdfPreviewPanel
            title="Document signé"
            blobUrl={previewBlobUrl}
            filename={previewFilename}
          />
        </div>
      ) : null}

      <div className="mt-6 flex w-full max-w-md flex-col gap-3">
        {onDownload ? (
          <Button type="button" className="h-12 rounded-2xl" onClick={onDownload}>
            {downloadLabel}
            <Download className="h-4 w-4" />
          </Button>
        ) : null}
        {!onDownload && downloadHref ? (
          <Button asChild className="h-12 rounded-2xl">
            <a href={downloadHref} target="_blank" rel="noreferrer">
              {downloadLabel}
              <Download className="h-4 w-4" />
            </a>
          </Button>
        ) : null}
        {secondaryHref ? (
          <Button asChild variant="outline" className="h-12 rounded-2xl bg-white">
            <a href={secondaryHref} target="_blank" rel="noreferrer">
              {secondaryLabel}
            </a>
          </Button>
        ) : null}
        {verifyUrl ? (
          <Button asChild variant="outline" className="h-12 rounded-2xl bg-white">
            <a href={verifyUrl} target="_blank" rel="noreferrer">
              <ShieldCheck className="h-4 w-4" />
              Vérifier l&apos;authenticité
              <ExternalLink className="h-3.5 w-3.5 opacity-60" />
            </a>
          </Button>
        ) : null}
        {onContinue ? (
          <Button type="button" variant="ghost" className="h-11" onClick={onContinue}>
            {continueLabel}
          </Button>
        ) : null}
        {!onContinue && continueHref ? (
          <Button asChild variant="ghost" className="h-11">
            <a href={continueHref}>{continueLabel}</a>
          </Button>
        ) : null}
      </div>

      <p className="mt-4 max-w-md text-[11px] leading-5 text-muted-foreground">
        Signature électronique simple (SES) — non qualifiée eIDAS. Le QR code figurant sur le PDF permet de vérifier l&apos;intégrité du document.
      </p>
    </div>
  );
};

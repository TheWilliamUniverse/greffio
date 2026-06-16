import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, ExternalLink, Eye, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { PdfPreviewPanel } from '@/components/documents/PdfPreviewPanel.jsx';
import { MobileDocumentPreviewSheet } from '@/mobile/ui/MobileDocumentPreviewSheet.jsx';
import { SignatureValidationNotch } from '@/components/signature/SignatureValidationNotch.jsx';
import { triggerMobileHaptic } from '@/utils/mobileHaptics.js';
import { openCachedPdfInSystemViewer, savePdfBlobToDevice } from '@/utils/dossierDocumentFile.js';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';
import { cn } from '@/lib/utils.js';

export const SIGNATURE_CONTINUE_VALIDATION_MS = 1400;

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

/** Présentation post-signature – niveau SignWell ou supérieur. */
export const SignedDocumentSuccessPanel = ({
  title = 'Document signé avec succès',
  subtitle = 'Votre document a été signé électroniquement via Greffio. Une preuve de signature a été générée et enregistrée dans votre dossier.',
  documentLabel = '',
  signerName = '',
  signedAt = null,
  proofId = '',
  verifyUrl = '',
  previewBlobUrl = '',
  previewBlob = null,
  previewArrayBuffer = null,
  previewFilename = 'document-signe.pdf',
  dossierId = '',
  docKey = '',
  onDownload,
  downloadHref = '',
  downloadLabel = 'Télécharger le document signé',
  secondaryHref = '',
  secondaryLabel = 'Télécharger le certificat de preuve',
  onContinue,
  continueLabel = 'Retour aux documents',
  continueHref = '/documents',
  validationNotchOnContinue = false,
  continueRedirectDelayMs = SIGNATURE_CONTINUE_VALIDATION_MS,
  className = '',
  layout = 'page',
}) => {
  const signedAtLabel = formatFrenchDateTime(signedAt);
  const isPage = layout === 'page';
  const isMobilePresentation = isCapacitorNative() || isMobileBrowserViewport();
  const [validating, setValidating] = useState(false);
  const [previewSheetOpen, setPreviewSheetOpen] = useState(false);
  const [previewDownloading, setPreviewDownloading] = useState(false);
  const continueTimerRef = useRef(null);

  const handleDownloadClick = onDownload || (previewBlob || previewBlobUrl ? async () => {
    if (previewBlob) {
      await savePdfBlobToDevice(previewBlob, previewFilename);
      return;
    }
    if (previewBlobUrl) {
      const response = await fetch(previewBlobUrl);
      const blob = await response.blob();
      await savePdfBlobToDevice(blob, previewFilename);
    }
  } : null);

  const handleOpenPreview = async () => {
    if (previewBlob) {
      await openCachedPdfInSystemViewer({
        blob: previewBlob,
        filename: previewFilename,
        dossierId,
        docKey,
      });
      return;
    }
    if (previewBlobUrl) {
      const response = await fetch(previewBlobUrl);
      const blob = await response.blob();
      await openCachedPdfInSystemViewer({
        blob,
        filename: previewFilename,
        dossierId,
        docKey,
      });
    }
  };

  const handleSheetDownload = async () => {
    setPreviewDownloading(true);
    try {
      if (handleDownloadClick) await handleDownloadClick();
    } finally {
      setPreviewDownloading(false);
    }
  };

  const handleSheetOpenExternal = async () => {
    setPreviewDownloading(true);
    try {
      await handleOpenPreview();
    } finally {
      setPreviewDownloading(false);
    }
  };

  const hasPreview = Boolean(previewBlobUrl || previewBlob || previewArrayBuffer);

  useEffect(() => () => {
    if (continueTimerRef.current) window.clearTimeout(continueTimerRef.current);
  }, []);

  const runContinueWithValidation = (action) => {
    if (!validationNotchOnContinue) {
      action();
      return;
    }
    setValidating(true);
    void triggerMobileHaptic('success');
    continueTimerRef.current = window.setTimeout(() => {
      action();
    }, continueRedirectDelayMs);
  };

  const handleContinueClick = () => {
    if (!onContinue) return;
    runContinueWithValidation(onContinue);
  };

  const handleContinueHref = () => {
    if (!continueHref) return;
    runContinueWithValidation(() => {
      if (/^https?:\/\//i.test(continueHref)) {
        window.location.assign(continueHref);
        return;
      }
      window.location.assign(continueHref);
    });
  };

  if (validating) {
    return (
      <div
        className={cn(
          isPage
            ? 'flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center py-6 text-center'
            : 'rounded-2xl border border-border/70 bg-white p-6 shadow-elevation-sm',
          className,
        )}
        role="status"
        aria-live="polite"
        aria-label="Document validé"
      >
        <article className="relative mx-auto w-full max-w-md overflow-visible rounded-2xl border border-border bg-white px-6 py-10 pr-20 text-left shadow-elevation-md sm:pr-24">
          <SignatureValidationNotch className="absolute right-0 top-5 animate-in fade-in slide-in-from-right-4 duration-300" />
          <p className="text-xs font-bold uppercase tracking-wide text-primary">Validation Greffio</p>
          <h1 className="mt-2 text-xl font-extrabold text-foreground">Document validé et enregistré</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {documentLabel
              ? `« ${documentLabel} » a bien été signé et ajouté à votre dossier.`
              : 'Votre signature a bien été enregistrée dans le dossier.'}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">Redirection vers vos documents…</p>
        </article>
      </div>
    );
  }

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

      {hasPreview && !isMobilePresentation ? (
        <div className="mt-6 w-full max-w-2xl overflow-hidden rounded-xl border border-border/70">
          <PdfPreviewPanel
            title="Document signé"
            blobUrl={previewBlobUrl}
            filename={previewFilename}
            onOpen={previewBlob ? () => void handleOpenPreview() : undefined}
          />
        </div>
      ) : null}

      {hasPreview && isMobilePresentation ? (
        <div className="mt-6 w-full max-w-md">
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full rounded-2xl bg-white"
            onClick={() => setPreviewSheetOpen(true)}
          >
            <Eye className="h-4 w-4" />
            Consulter le document signé
          </Button>
        </div>
      ) : null}

      <div className="mt-6 flex w-full max-w-md flex-col gap-3">
        {handleDownloadClick ? (
          <Button type="button" className="h-12 rounded-2xl" onClick={() => void handleDownloadClick()}>
            {downloadLabel}
            <Download className="h-4 w-4" />
          </Button>
        ) : null}
        {!handleDownloadClick && downloadHref ? (
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
          <Button type="button" variant="ghost" className="h-11" onClick={handleContinueClick}>
            {continueLabel}
          </Button>
        ) : null}
        {!onContinue && continueHref ? (
          <Button type="button" variant="ghost" className="h-11" onClick={handleContinueHref}>
            {continueLabel}
          </Button>
        ) : null}
      </div>

      <p className="mt-4 max-w-md text-[11px] leading-5 text-muted-foreground">
        Signature électronique simple (SES) – non qualifiée eIDAS. Le QR code figurant sur le PDF permet de vérifier l&apos;intégrité du document.
      </p>

      <MobileDocumentPreviewSheet
        open={previewSheetOpen}
        title="Document signé"
        previewSrc={previewBlobUrl}
        previewArrayBuffer={previewArrayBuffer}
        previewBlob={previewBlob}
        filename={previewFilename}
        downloading={previewDownloading}
        onClose={() => setPreviewSheetOpen(false)}
        onDownload={() => { void handleSheetDownload(); }}
        onOpenExternal={() => { void handleSheetOpenExternal(); }}
      />
    </div>
  );
};

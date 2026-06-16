import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FileSignature } from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar.jsx';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { SignatureAdoptPanel } from '@/components/signature/SignatureAdoptPanel.jsx';
import { SignatureDocumentAcknowledge } from '@/components/signature/SignatureDocumentAcknowledge.jsx';
import { GreffioSignatureInfoBanner } from '@/components/signature/GreffioSignatureInfoBanner.jsx';
import { SignedDocumentSuccessPanel } from '@/components/signature/SignedDocumentSuccessPanel.jsx';
import { PdfPreviewPanel } from '@/components/documents/PdfPreviewPanel.jsx';
import { MobileSignableDocumentShell } from '@/mobile/ui/MobileSignableDocumentShell.jsx';
import { MobileStickyFormActions } from '@/mobile/ui/MobileStickyFormActions.jsx';
import {
  fetchDocumentSignSession,
  downloadDocumentSignPreview,
  submitDocumentSignature,
  downloadDossierDocument,
} from '@/api/documents.js';
import { downloadSignedDocument } from '@/utils/signedDocumentDownload.js';
import { runtimeConfig } from '@/config/runtime.js';
import { PageLoadingState } from '@/components/patterns/PageLoadingState.jsx';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';
import { openCachedPdfInSystemViewer } from '@/utils/dossierDocumentFile.js';
import { cn } from '@/lib/utils.js';

export const DocumentSignPage = () => {
  const { id: documentId } = useParams();
  const navigate = useNavigate();
  const isMobilePresentation = isCapacitorNative() || isMobileBrowserViewport();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');
  const [previewAcknowledged, setPreviewAcknowledged] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState('');
  const [previewBlob, setPreviewBlob] = useState(null);
  const [signedPreviewBlob, setSignedPreviewBlob] = useState(null);
  const [signedPreviewBlobUrl, setSignedPreviewBlobUrl] = useState('');
  const [step, setStep] = useState('adopt');
  const [done, setDone] = useState(false);
  const [proofId, setProofId] = useState('');
  const [verifyUrl, setVerifyUrl] = useState('');
  const pendingSignRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const payload = await fetchDocumentSignSession(documentId);
        if (cancelled) return;
        setSession(payload);
      } catch (err) {
        if (!cancelled) {
          setError(err?.payload?.message || 'Impossible de charger la session de signature.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [documentId]);

  useEffect(() => {
    if (!documentId || !session) return undefined;
    let cancelled = false;
    const loadPdf = async () => {
      try {
        const blob = await downloadDocumentSignPreview(documentId);
        if (cancelled) return;
        setPreviewBlob(blob);
        setPreviewBlobUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return URL.createObjectURL(blob);
        });
      } catch (_err) {
        if (!cancelled) setError('Aperçu PDF indisponible.');
      }
    };
    void loadPdf();
    return () => { cancelled = true; };
  }, [documentId, session]);

  useEffect(() => () => {
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    if (signedPreviewBlobUrl) URL.revokeObjectURL(signedPreviewBlobUrl);
  }, [previewBlobUrl, signedPreviewBlobUrl]);

  const finalizeSign = async (payload) => {
    setSigning(true);
    try {
      const result = await submitDocumentSignature(documentId, {
        ...payload,
        consent: true,
        previewAcknowledged: true,
      });
      setProofId(result.proofId || '');
      setVerifyUrl(result.verifyUrl || '');
      try {
        const { blob } = await downloadDossierDocument({
          dossierId: session.dossierId,
          docKey: session.docKey,
          cacheBust: true,
          inline: true,
        });
        setSignedPreviewBlob(blob);
        setSignedPreviewBlobUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return URL.createObjectURL(blob);
        });
      } catch (_downloadError) {
        setSignedPreviewBlob(previewBlob);
        setSignedPreviewBlobUrl(previewBlobUrl);
      }
      setDone(true);
      toast.success('Document signé avec succès.');
    } catch (err) {
      toast.error(err?.payload?.message || 'La signature a échoué.');
    } finally {
      setSigning(false);
      setStep('adopt');
    }
  };

  const openPreviewExternally = async () => {
    if (!previewBlob) return;
    try {
      await openCachedPdfInSystemViewer({
        blob: previewBlob,
        filename: `${session?.documentTitle || 'document'}.pdf`,
      });
    } catch (_error) {
      toast.error('Impossible d’ouvrir le PDF sur cet appareil.');
    }
  };

  if (loading) {
    return <PageLoadingState label="Chargement de la signature…" />;
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="border-b border-border bg-white px-6 py-4">
          <GreffioLogo variant="full" to="/dashboard" />
        </header>
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-muted-foreground">{error || 'Session introuvable.'}</p>
          <Button className="mt-6" asChild><Link to="/documents">Retour aux documents</Link></Button>
        </main>
      </div>
    );
  }

  if (done) {
    const documentsContinueUrl = session.dossierId
      ? `/documents?dossierId=${encodeURIComponent(session.dossierId)}`
      : '/documents';
    return (
      <div className={cn('flex min-h-screen bg-[#f6f8fc]', isMobilePresentation ? 'flex-col' : '')}>
        {!isMobilePresentation ? <Sidebar /> : null}
        <main className="flex flex-1 items-center justify-center p-6">
          <SignedDocumentSuccessPanel
            layout="page"
            documentLabel={session.documentTitle}
            signerName={session.signerFullName}
            signedAt={new Date().toISOString()}
            proofId={proofId}
            verifyUrl={verifyUrl}
            previewBlobUrl={signedPreviewBlobUrl || previewBlobUrl}
            previewBlob={signedPreviewBlob || previewBlob}
            previewFilename="document-signe-greffio.pdf"
            dossierId={session.dossierId}
            docKey={session.docKey}
            onDownload={async () => {
              await downloadSignedDocument({
                blob: signedPreviewBlob || previewBlob,
                filename: 'document-signe-greffio.pdf',
                dossierId: session.dossierId,
                docKey: session.docKey,
              });
            }}
            onContinue={() => navigate(documentsContinueUrl)}
            continueLabel="Retour aux documents"
            validationNotchOnContinue
          />
        </main>
      </div>
    );
  }

  const signaturePanel = (
    <section className="space-y-4">
      <GreffioSignatureInfoBanner />
      {!previewAcknowledged ? (
        <SignatureDocumentAcknowledge
          documentTitle={session.documentTitle}
          onAcknowledge={() => setPreviewAcknowledged(true)}
        />
      ) : step === 'adopt' ? (
        <SignatureAdoptPanel
          defaultName={session.signerFullName || ''}
          defaultEmail={session.signerEmail || ''}
          subtitle="Signature électronique simple (SES) – Greffio"
          loading={signing}
          onConfirm={(payload) => {
            pendingSignRef.current = payload;
            void finalizeSign(payload);
          }}
        />
      ) : null}
      <p className="text-xs text-muted-foreground">
        Paiement et données hébergés en Europe · {runtimeConfig.appUrl}
      </p>
    </section>
  );

  const previewPanel = (
    <PdfPreviewPanel
      blobUrl={previewBlobUrl}
      filename={`${session.documentTitle}.pdf`}
      onOpen={isMobilePresentation ? () => void openPreviewExternally() : undefined}
    />
  );

  if (isMobilePresentation) {
    return (
      <div className="min-h-screen bg-background">
        <MobileSignableDocumentShell
          eyebrow="Signature Greffio"
          title={session.documentTitle}
          backTo="/documents"
          backLabel="Retour documents"
          intro="Relisez le document puis adoptez votre signature électronique."
          hasBottomNav={false}
        >
          <div className="space-y-4">
            {signaturePanel}
            {previewPanel}
          </div>
          <MobileStickyFormActions>
            <Button variant="outline" className="w-full bg-white" asChild>
              <Link to="/documents">Annuler</Link>
            </Button>
          </MobileStickyFormActions>
        </MobileSignableDocumentShell>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="border-b border-border bg-white px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FileSignature className="h-6 w-6 text-primary" />
              <div>
                <p className="text-xs font-bold uppercase text-primary">Signature Greffio</p>
                <h1 className="text-lg font-extrabold">{session.documentTitle}</h1>
              </div>
            </div>
            <Button variant="outline" className="bg-white" asChild>
              <Link to="/documents">Annuler</Link>
            </Button>
          </div>
        </header>

        <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-8 lg:grid-cols-2">
          {signaturePanel}
          {previewPanel}
        </main>
      </div>
    </div>
  );
};

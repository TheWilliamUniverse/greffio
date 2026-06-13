import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Download, FileSignature } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { SignatureAdoptPanel } from '@/components/signature/SignatureAdoptPanel.jsx';
import { SignatureDocumentAcknowledge } from '@/components/signature/SignatureDocumentAcknowledge.jsx';
import { SignwellPublicSigningPanel } from '@/components/signature/SignwellPublicSigningPanel.jsx';
import {
  fetchPublicSignatureSession,
  getPublicSignaturePdfUrl,
  submitPublicSignature,
} from '@/api/nonConviction.js';
import { mapSignaturePublicError } from '@/utils/signaturePublicErrors.js';
import { redirectToSignwellSigning } from '@/utils/signwellClient.js';
import { PdfPreviewPanel } from '@/components/documents/PdfPreviewPanel.jsx';

export const SignaturePublicPage = () => {
  const { token } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [previewAcknowledged, setPreviewAcknowledged] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState('');

  const isSignwellSession = session?.provider === 'signwell' && Boolean(session?.signwellSigningUrl);

  useEffect(() => {
    const load = async () => {
      try {
        const payload = await fetchPublicSignatureSession(token);
        setSession(payload);
        if (payload.status === 'signed') setDone(true);
      } catch (err) {
        setError(mapSignaturePublicError(err?.payload?.error || err?.code, err?.message));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token]);

  useEffect(() => {
    if (!token || !session || session.status === 'signed') return undefined;
    let cancelled = false;
    const loadPdf = async () => {
      try {
        const response = await fetch(getPublicSignaturePdfUrl(token));
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error || 'SIGNATURE_PDF_NOT_FOUND');
        }
        const blob = await response.blob();
        if (cancelled) return;
        setPreviewBlobUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return URL.createObjectURL(blob);
        });
      } catch (err) {
        if (!cancelled) {
          setError(mapSignaturePublicError(err?.message, err?.message));
        }
      }
    };
    void loadPdf();
    return () => {
      cancelled = true;
    };
  }, [token, session]);

  useEffect(() => () => {
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
  }, [previewBlobUrl]);

  const onSignInternal = async (payload) => {
    if (!previewAcknowledged) {
      setError(mapSignaturePublicError('SIGNATURE_PREVIEW_REQUIRED'));
      return;
    }
    setSigning(true);
    setError('');
    try {
      await submitPublicSignature(token, { ...payload, previewAcknowledged: true });
      setDone(true);
    } catch (err) {
      setError(mapSignaturePublicError(err?.payload?.error || err?.code, err?.message));
    } finally {
      setSigning(false);
    }
  };

  const onContinueSignwell = () => {
    if (!previewAcknowledged) {
      setError(mapSignaturePublicError('SIGNATURE_PREVIEW_REQUIRED'));
      return;
    }
    setSigning(true);
    setError('');
    redirectToSignwellSigning(session.signwellSigningUrl);
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f6f8fc] text-sm text-muted-foreground">
        Chargement du document…
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#f6f8fc] p-6 text-center">
        <p className="max-w-sm text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#f6f8fc] px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold text-foreground">Document signé</h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Votre signature a été enregistrée. Un exemplaire signé vous sera envoyé par e-mail.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-primary shadow-elevation-sm">
          <Download className="h-3.5 w-3.5" />
          Preuve Greffio archivée
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f6f8fc]">
      <header className="border-b border-border bg-white px-4 py-4">
        <GreffioLogo variant="full" className="text-lg" />
        <div className="mt-4 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
            <FileSignature className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary">Signature en attente</p>
            <h1 className="text-base font-extrabold leading-snug text-foreground">{session?.documentTitle}</h1>
            <p className="text-xs text-muted-foreground">{session?.companyName}</p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-2">
        <div className="border-b border-border px-4 py-4 lg:border-b-0 lg:border-r">
          <PdfPreviewPanel
            title="Document à signer"
            blobUrl={previewBlobUrl}
            filename="document-a-signer.pdf"
            emptyMessage="Chargement du document…"
          />
          <SignatureDocumentAcknowledge
            checked={previewAcknowledged}
            onChange={setPreviewAcknowledged}
          />
        </div>
        <div className="flex items-start justify-center p-4 lg:p-6">
          {isSignwellSession ? (
            <SignwellPublicSigningPanel
              signerFullName={session?.signerFullName}
              signerEmail={session?.signerEmail}
              signingUrl={session?.signwellSigningUrl}
              previewAcknowledged={previewAcknowledged}
              onContinue={onContinueSignwell}
              loading={signing}
              errorMessage={error}
            />
          ) : (
            <div className="w-full max-w-md">
              <SignatureAdoptPanel
                defaultName={session?.signerFullName || ''}
                defaultEmail={session?.signerEmail || ''}
                loading={signing}
                onCancel={() => window.close()}
                onConfirm={onSignInternal}
                errorMessage={error}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

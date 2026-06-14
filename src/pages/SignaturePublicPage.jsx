import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Download, FileSignature } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { SignatureAdoptPanel } from '@/components/signature/SignatureAdoptPanel.jsx';
import { SignatureDocumentAcknowledge } from '@/components/signature/SignatureDocumentAcknowledge.jsx';
import { SignatureOtpStep } from '@/components/signature/SignatureOtpStep.jsx';
import {
  fetchPublicSignatureSession,
  getPublicProofCertificateUrl,
  getPublicSignaturePdfUrl,
  getPublicSignedDocumentUrl,
  submitPublicSignature,
} from '@/api/nonConviction.js';
import { mapSignaturePublicError } from '@/utils/signaturePublicErrors.js';
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
  const [step, setStep] = useState('adopt');
  const [proofId, setProofId] = useState('');
  const pendingSignRef = useRef(null);

  const otpRequired = Boolean(session?.signature?.otpRequired) && !session?.signature?.otpVerified;

  useEffect(() => {
    const load = async () => {
      try {
        const payload = await fetchPublicSignatureSession(token);
        setSession(payload);
        if (payload.status === 'signed') {
          setDone(true);
          setProofId(payload.proofId || '');
        }
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

  const finalizeSign = async (payload) => {
    setSigning(true);
    setError('');
    try {
      const result = await submitPublicSignature(token, { ...payload, previewAcknowledged: true });
      setProofId(result?.proofId || '');
      setDone(true);
      setStep('adopt');
    } catch (err) {
      const code = err?.payload?.error || err?.code;
      if (code === 'SIGNATURE_OTP_REQUIRED') {
        setStep('otp');
      } else {
        setError(mapSignaturePublicError(code, err?.message));
      }
    } finally {
      setSigning(false);
    }
  };

  const onSignInternal = async (payload) => {
    if (!previewAcknowledged) {
      setError(mapSignaturePublicError('SIGNATURE_PREVIEW_REQUIRED'));
      return;
    }
    pendingSignRef.current = payload;
    if (otpRequired) {
      setStep('otp');
      return;
    }
    await finalizeSign(payload);
  };

  const onOtpVerified = async () => {
    if (pendingSignRef.current) {
      await finalizeSign(pendingSignRef.current);
    }
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
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#f6f8fc] px-6 py-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold text-foreground">Document signé avec succès</h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Votre document a été signé électroniquement via Greffio. Une preuve de signature a été générée et votre dossier a été mis à jour.
        </p>
        {proofId ? (
          <p className="mt-3 text-xs font-bold text-primary">Preuve {proofId}</p>
        ) : null}
        <div className="mt-6 flex w-full max-w-sm flex-col gap-3">
          <Button asChild className="h-12 rounded-2xl">
            <a href={getPublicSignedDocumentUrl(token)} target="_blank" rel="noreferrer">
              Télécharger le document signé
              <Download className="h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline" className="h-12 rounded-2xl bg-white">
            <a href={getPublicProofCertificateUrl(token)} target="_blank" rel="noreferrer">
              Télécharger le certificat de preuve
            </a>
          </Button>
        </div>
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
          {step === 'adopt' ? (
            <SignatureDocumentAcknowledge
              checked={previewAcknowledged}
              onChange={setPreviewAcknowledged}
            />
          ) : null}
        </div>
        <div className="flex items-start justify-center p-4 lg:p-6">
          {step === 'otp' ? (
            <div className="w-full max-w-md">
              <SignatureOtpStep
                token={token}
                maskedEmail={session?.signerEmailMasked || session?.signerEmail}
                onVerified={() => void onOtpVerified()}
                onBack={() => setStep('adopt')}
              />
            </div>
          ) : (
            <div className="w-full max-w-md">
              <SignatureAdoptPanel
                defaultName={session?.signerFullName || ''}
                defaultEmail={session?.signerEmail || ''}
                consentText={session?.signature?.consentText}
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

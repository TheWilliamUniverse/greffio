import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileSignature } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { SignatureAdoptPanel } from '@/components/signature/SignatureAdoptPanel.jsx';
import { SignatureDocumentAcknowledge } from '@/components/signature/SignatureDocumentAcknowledge.jsx';
import { SignatureOtpStep } from '@/components/signature/SignatureOtpStep.jsx';
import { SignedDocumentSuccessPanel } from '@/components/signature/SignedDocumentSuccessPanel.jsx';
import {
  fetchPublicSignatureSession,
  getPublicProofCertificateUrl,
  getPublicSignaturePdfUrl,
  getPublicSignedDocumentUrl,
  submitPublicSignature,
} from '@/api/nonConviction.js';
import { mapSignaturePublicError } from '@/utils/signaturePublicErrors.js';
import { PdfPreviewPanel } from '@/components/documents/PdfPreviewPanel.jsx';
import { runtimeConfig } from '@/config/runtime.js';

const isRecoverableSignatureLinkError = (message = '') => /expiré|invalide|déjà utilisé/i.test(String(message));

export const SignaturePublicPage = () => {
  const { token } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [previewAcknowledged, setPreviewAcknowledged] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState('');
  const [signedBlobUrl, setSignedBlobUrl] = useState('');
  const [step, setStep] = useState('adopt');
  const [proofId, setProofId] = useState('');
  const [verifyUrl, setVerifyUrl] = useState('');
  const [signedAt, setSignedAt] = useState(null);
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
          setVerifyUrl(payload.verifyUrl || '');
          setSignedAt(payload.signedAt || null);
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

  useEffect(() => {
    if (!done || !token) return undefined;
    let cancelled = false;
    const loadSignedPdf = async () => {
      try {
        const response = await fetch(getPublicSignedDocumentUrl(token));
        if (!response.ok) return;
        const blob = await response.blob();
        if (cancelled) return;
        setSignedBlobUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return URL.createObjectURL(blob);
        });
      } catch (_error) {
        // optional preview
      }
    };
    void loadSignedPdf();
    return () => {
      cancelled = true;
    };
  }, [done, token]);

  useEffect(() => {
    return () => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
      if (signedBlobUrl) URL.revokeObjectURL(signedBlobUrl);
    };
  }, [previewBlobUrl, signedBlobUrl]);

  const finalizeSign = async (payload) => {
    setSigning(true);
    setError('');
    try {
      const result = await submitPublicSignature(token, { ...payload, previewAcknowledged: true });
      setProofId(result?.proofId || '');
      setVerifyUrl(result?.verifyUrl || '');
      setSignedAt(result?.signedAt || new Date().toISOString());
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
        <GreffioLogo variant="wordmark" className="mb-6 text-2xl" />
        <p className="max-w-sm text-sm text-destructive">{error}</p>
        {isRecoverableSignatureLinkError(error) ? (
          <div className="mt-5 flex max-w-sm flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Demandez un nouveau lien depuis votre espace Greffio ou contactez notre équipe.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="outline" className="rounded-xl">
                <a href={`mailto:${runtimeConfig.supportEmail}?subject=Nouveau%20lien%20de%20signature`}>
                  Contacter Greffio
                </a>
              </Button>
              <Button asChild className="rounded-xl">
                <Link to="/contact">Aide &amp; support</Link>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-[100dvh] bg-[#f6f8fc] px-4 py-8">
        <div className="mx-auto mb-8 flex justify-center">
          <GreffioLogo variant="wordmark" className="text-2xl" />
        </div>
        <SignedDocumentSuccessPanel
          layout="page"
          documentLabel={session?.documentTitle || 'Document Greffio'}
          signerName={session?.signerFullName || ''}
          signedAt={signedAt}
          proofId={proofId}
          verifyUrl={verifyUrl}
          previewBlobUrl={signedBlobUrl}
          previewFilename="document-signe-greffio.pdf"
          downloadHref={getPublicSignedDocumentUrl(token)}
          secondaryHref={getPublicProofCertificateUrl(token)}
          continueHref={`${runtimeConfig.appUrl}/documents`}
          continueLabel="Fermer"
          validationNotchOnContinue
        />
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

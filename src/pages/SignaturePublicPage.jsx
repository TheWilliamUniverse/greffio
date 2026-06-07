import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { SignatureAdoptPanel } from '@/components/signature/SignatureAdoptPanel.jsx';
import {
  fetchPublicSignatureSession,
  getPublicSignaturePdfUrl,
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

  const onSign = async (payload) => {
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

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#0f172a] text-white">Chargement…</div>;
  }

  if (error && !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f172a] p-6 text-center text-white">
        <p>{error}</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f172a] p-6 text-center text-white">
        <CheckCircle2 className="h-14 w-14 text-emerald-400" />
        <h1 className="mt-4 text-2xl font-bold">Signature effectuée</h1>
        <p className="mt-2 max-w-md text-white/75">
          Vous avez signé ce document. Vous recevrez un exemplaire signé par e-mail.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0f172a]">
      <header className="border-b border-white/10 px-5 py-4 text-white">
        <p className="text-xs uppercase tracking-wide text-amber-300/90">Signature en attente</p>
        <h1 className="text-lg font-bold">{session?.documentTitle}</h1>
        <p className="text-sm text-white/60">{session?.companyName}</p>
      </header>
      <div className="grid flex-1 lg:grid-cols-2">
        <div className="min-h-[50vh] lg:min-h-0">
          <PdfPreviewPanel
            title="Document à signer"
            blobUrl={previewBlobUrl}
            filename="document-a-signer.pdf"
            emptyMessage="Chargement du document…"
          />
          <label className="mt-3 flex items-start gap-2 px-4 text-sm text-white/80">
            <input
              type="checkbox"
              className="mt-1"
              checked={previewAcknowledged}
              onChange={(event) => setPreviewAcknowledged(event.target.checked)}
            />
            J’ai consulté le document et je souhaite le signer.
          </label>
        </div>
        <div className="flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <SignatureAdoptPanel
              defaultName={session?.signerFullName || ''}
              defaultEmail={session?.signerEmail || ''}
              loading={signing}
              onCancel={() => window.close()}
              onConfirm={onSign}
              errorMessage={error}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

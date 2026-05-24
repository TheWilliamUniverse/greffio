import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { SignatureAdoptPanel } from '@/components/signature/SignatureAdoptPanel.jsx';
import {
  fetchPublicSignatureSession,
  getPublicSignaturePdfUrl,
  submitPublicSignature,
} from '@/api/nonConviction.js';

export const SignaturePublicPage = () => {
  const { token } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const payload = await fetchPublicSignatureSession(token);
        setSession(payload);
        if (payload.status === 'signed') setDone(true);
      } catch (err) {
        setError(err?.payload?.error || 'Lien invalide ou expiré.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token]);

  const onSign = async (payload) => {
    setSigning(true);
    try {
      await submitPublicSignature(token, payload);
      setDone(true);
    } catch (err) {
      setError(err?.payload?.error || 'Signature impossible.');
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
    <div className="flex min-h-screen flex-col bg-[#0f172a]">
      <header className="border-b border-white/10 px-5 py-4 text-white">
        <p className="text-xs uppercase tracking-wide text-amber-300/90">Signature en attente</p>
        <h1 className="text-lg font-bold">{session?.documentTitle}</h1>
        <p className="text-sm text-white/60">{session?.companyName}</p>
      </header>
      <div className="grid flex-1 lg:grid-cols-2">
        <div className="min-h-[50vh] lg:min-h-0">
          <iframe
            title="Document à signer"
            src={getPublicSignaturePdfUrl(token)}
            className="h-full min-h-[50vh] w-full bg-[#334155]"
          />
        </div>
        <div className="flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <SignatureAdoptPanel
              defaultName={session?.signerFullName || ''}
              defaultEmail={session?.signerEmail || ''}
              loading={signing}
              onCancel={() => window.close()}
              onConfirm={onSign}
            />
            {error ? <p className="mt-3 text-center text-sm text-red-300">{error}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
};

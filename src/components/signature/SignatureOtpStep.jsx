import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp.jsx';
import { sendPublicSignatureOtp, verifyPublicSignatureOtp } from '@/api/nonConviction.js';

export const SignatureOtpStep = ({
  token,
  maskedEmail = '',
  onVerified,
  onBack,
}) => {
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const autoSentRef = useRef(false);

  const sendCode = async () => {
    setSending(true);
    setError('');
    try {
      await sendPublicSignatureOtp(token);
      setSent(true);
    } catch (err) {
      setError(err?.payload?.message || 'Envoi du code impossible. Réessayez.');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (autoSentRef.current) return;
    autoSentRef.current = true;
    void sendCode();
  }, [token]);

  useEffect(() => {
    if (code.length !== 6 || verifying) return undefined;
    const timer = window.setTimeout(async () => {
      setVerifying(true);
      setError('');
      try {
        await verifyPublicSignatureOtp(token, code);
        onVerified?.();
      } catch (err) {
        setError(err?.payload?.message || 'Code incorrect ou expiré.');
        setCode('');
      } finally {
        setVerifying(false);
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [code, token, verifying, onVerified]);

  return (
    <div className="rounded-3xl border border-border bg-white p-6 shadow-elevation-md">
      <h2 className="text-lg font-extrabold">Vérification email</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Un code à 6 chiffres a été envoyé à {maskedEmail || 'votre adresse email'} pour confirmer votre identité.
      </p>
      <div className="mt-5 flex justify-center">
        <InputOTP maxLength={6} value={code} onChange={setCode}>
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <InputOTPSlot key={index} index={index} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-5 flex flex-col gap-2">
        <Button type="button" variant="outline" className="h-11 rounded-2xl" disabled={sending} onClick={() => void sendCode()}>
          {sending ? 'Envoi…' : sent ? 'Renvoyer le code' : 'Envoyer le code'}
        </Button>
        {onBack ? (
          <Button type="button" variant="ghost" className="h-11 rounded-2xl" onClick={onBack}>
            Retour
          </Button>
        ) : null}
      </div>
    </div>
  );
};

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { sendOpsStepUpCode, verifyOpsStepUp } from '@/api/ops.js';
import { saveOpsStepUp } from '@/lib/auth/opsStepUp.js';
import { isBiometricAvailable } from '@/utils/biometricAuth.js';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { isCapacitorNative } from '@/utils/platform.js';

export const useIdentityStepUp = () => {
  const [phase, setPhase] = useState('identity');
  const [loading, setLoading] = useState(false);
  const [emailMasked, setEmailMasked] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [success, setSuccess] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const detectBiometric = useCallback(async () => {
    const native = await isBiometricAvailable();
    const webPasskey = typeof window !== 'undefined'
      && typeof window.PublicKeyCredential !== 'undefined'
      && Boolean(window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.());
    let webReady = false;
    if (webPasskey) {
      try {
        webReady = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch (_error) {
        webReady = false;
      }
    }
    const available = native || webReady;
    setBiometricAvailable(available);
    return available;
  }, []);

  const finalizeStepUp = useCallback(async (method, code = null) => {
    setLoading(true);
    try {
      const payload = await verifyOpsStepUp({ method, code });
      saveOpsStepUp({
        token: payload.stepUpToken,
        expiresAt: payload.expiresAt,
      });
      setSuccess(true);
      setPhase('success');
      return payload;
    } catch (error) {
      toast.error(error?.payload?.message || 'Confirmation impossible. Réessayez.');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendEmailCode = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await sendOpsStepUpCode();
      setEmailMasked(payload.emailMasked || '');
      setCodeSent(true);
      setPhase('verify');
      toast.success(`Code envoyé à ${payload.emailMasked || 'votre adresse email'}.`);
    } catch (error) {
      if (error?.code === 'OPS_STEP_UP_COOLDOWN') {
        toast.error(`Patientez ${error.payload?.retryAfterSeconds || 60} s avant un nouvel envoi.`);
      } else {
        toast.error('Impossible d’envoyer le code de confirmation.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyWithBiometric = useCallback(async () => {
    setLoading(true);
    try {
      if (isCapacitorNative()) {
        await NativeBiometric.verifyIdentity({
          reason: 'Confirmer votre accès au Cockpit Ops Greffio',
          title: 'Greffio Ops',
          subtitle: 'Sésame ouvre-toi',
          description: 'Vérifiez votre identité pour accéder au cockpit.',
        });
      } else if (typeof window.PublicKeyCredential !== 'undefined') {
        await navigator.credentials.get({
          mediation: 'optional',
          publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            timeout: 60000,
            userVerification: 'required',
            rpId: window.location.hostname,
          },
        });
      }
      return finalizeStepUp('biometric');
    } catch (_error) {
      toast.message('Biométrie indisponible. Utilisez le code email.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [finalizeStepUp]);

  const verifyWithEmailCode = useCallback(async () => {
    if (otpCode.replace(/\D/g, '').length !== 6) {
      toast.error('Saisissez le code à 6 chiffres.');
      return null;
    }
    return finalizeStepUp('mfa_email', otpCode.replace(/\D/g, ''));
  }, [finalizeStepUp, otpCode]);

  const reset = useCallback(() => {
    setPhase('identity');
    setLoading(false);
    setEmailMasked('');
    setCodeSent(false);
    setOtpCode('');
    setSuccess(false);
  }, []);

  return {
    phase,
    setPhase,
    loading,
    emailMasked,
    codeSent,
    otpCode,
    setOtpCode,
    success,
    biometricAvailable,
    detectBiometric,
    sendEmailCode,
    verifyWithBiometric,
    verifyWithEmailCode,
    reset,
  };
};

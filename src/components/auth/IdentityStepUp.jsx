import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp.jsx';
import { useIdentityStepUp } from '@/hooks/useIdentityStepUp.js';
import { PUBLISHER_LEGAL_NAME } from '@/config/publisher.js';
import { SESAME_PAGE_CLASS } from '@/components/auth/SesamePortalCard.jsx';

const resolveInitials = (user) => {
  const first = String(user?.firstName || user?.email || 'G').trim();
  const last = String(user?.lastName || '').trim();
  return `${first.charAt(0)}${last.charAt(0) || ''}`.toUpperCase();
};

const resolveDeviceLabel = () => {
  if (typeof navigator === 'undefined') return 'Navigateur web';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad/i.test(ua)) return 'Appareil iOS';
  if (/Android/i.test(ua)) return 'Appareil Android';
  if (/Windows/i.test(ua)) return 'Poste Windows';
  if (/Mac/i.test(ua)) return 'Poste macOS';
  return 'Navigateur web';
};

export const IdentityStepUp = ({ user, onCancel, onSuccess, layout = 'overlay' }) => {
  const {
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
  } = useIdentityStepUp();

  useEffect(() => {
    void detectBiometric();
  }, [detectBiometric]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = window.setTimeout(() => {
      onSuccess?.();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [success, onSuccess]);

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ')
    || user?.email
    || 'Utilisateur Greffio';

  const isInline = layout === 'inline';

  return (
    <div
      className={
        isInline
          ? 'relative w-full px-4 pb-16 pt-8 sm:px-8'
          : `${SESAME_PAGE_CLASS} fixed inset-0 z-[120] flex items-center justify-center p-4`
      }
    >
      {!isInline ? (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(96,165,250,0.18),transparent_55%)]" />
      ) : null}
      <motion.div
        initial={isInline ? { opacity: 0, y: 48 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={isInline ? { duration: 0.55, ease: [0.22, 1, 0.36, 1] } : undefined}
        className={`relative w-full rounded-[32px] border border-white/10 bg-white/[0.08] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8 ${isInline ? 'mx-auto max-w-lg' : 'max-w-lg'}`}
      >
        <AnimatePresence mode="wait">
          {phase === 'success' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.9] }}
                transition={{ duration: 0.8 }}
                className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-400/15 ring-1 ring-emerald-300/30"
              >
                <Sparkles className="h-9 w-9 text-emerald-200" />
              </motion.div>
              <p className="text-lg font-extrabold">Identité confirmée.</p>
              <p className="mt-2 text-sm text-white/75">Ouverture du Cockpit Ops.</p>
            </motion.div>
          ) : (
            <motion.div key={phase} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {phase === 'identity' ? (
                <>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">Confirmation d’identité</p>
                  <h2 className="mt-2 text-2xl font-extrabold">C’est bien toi ?</h2>
                  <div className="mt-6 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-lg font-extrabold">
                      {resolveInitials(user)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold">{displayName}</p>
                      <p className="text-sm text-white/70">{PUBLISHER_LEGAL_NAME}</p>
                      <p className="text-xs text-white/55">
                        {String(user?.role || 'CLIENT').toUpperCase()} · {resolveDeviceLabel()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-col gap-3">
                    {biometricAvailable ? (
                      <Button
                        type="button"
                        className="h-12 bg-white text-[#0a2a5c] hover:bg-white/90"
                        disabled={loading}
                        onClick={() => void verifyWithBiometric()}
                      >
                        <Fingerprint className="mr-2 h-4 w-4" />
                        Sésame ouvre-toi
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 border-white/20 bg-transparent text-white hover:bg-white/10"
                      disabled={loading}
                      onClick={() => void sendEmailCode()}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Recevoir un code email
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">Étape 2</p>
                  <h2 className="mt-2 text-2xl font-extrabold">Sésame ouvre-toi</h2>
                  <p className="mt-2 text-sm leading-6 text-white/75">
                    {codeSent
                      ? `Saisissez le code reçu${emailMasked ? ` à ${emailMasked}` : ''}.`
                      : 'Confirmez votre identité pour accéder au cockpit ops.'}
                  </p>
                  <div className="mt-6 flex justify-center">
                    <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <Button
                    type="button"
                    className="mt-6 h-12 w-full bg-white text-[#0a2a5c] hover:bg-white/90"
                    disabled={loading || otpCode.length !== 6}
                    onClick={() => void verifyWithEmailCode()}
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Confirmer et ouvrir le Cockpit Ops
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-2 w-full text-white/70 hover:bg-white/10 hover:text-white"
                    onClick={() => setPhase('identity')}
                  >
                    Retour
                  </Button>
                </>
              )}

              {onCancel ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-4 w-full text-white/60 hover:bg-white/10 hover:text-white"
                  onClick={onCancel}
                >
                  Annuler
                </Button>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

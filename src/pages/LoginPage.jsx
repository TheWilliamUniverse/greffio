import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth.js';
import { sendMfaEmailCode } from '@/api/mfa.js';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp.jsx';
import { runtimeConfig } from '@/config/runtime.js';

const MFA_MODES = {
  totp: 'totp',
  email: 'email',
  recovery: 'recovery',
};

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState('credentials');
  const [mfaToken, setMfaToken] = useState('');
  const [mfaMode, setMfaMode] = useState(MFA_MODES.totp);
  const [otpCode, setOtpCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [emailMasked, setEmailMasked] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [sendingEmailCode, setSendingEmailCode] = useState(false);
  const { login, completeMfaLogin } = useAuth();
  const navigate = useNavigate();

  const resetMfaState = () => {
    setMfaMode(MFA_MODES.totp);
    setOtpCode('');
    setRecoveryCode('');
    setEmailMasked('');
    setEmailCodeSent(false);
  };

  const openSession = async (sessionEmail, sessionPassword, provider = 'email') => {
    setIsLoading(true);
    const result = await login(sessionEmail, sessionPassword, provider);
    setIsLoading(false);

    if (result.success && result.mfaRequired) {
      setMfaToken(result.mfaToken);
      resetMfaState();
      setStep('mfa');
      toast.message('Vérification en deux étapes requise');
      return;
    }

    if (result.success) {
      navigate('/dashboard');
    } else if (result.error === 'TEMP_ACCOUNT_EXPIRED') {
      toast.error('Ce compte temporaire a expiré (validité jusqu’à 10 h ce matin).');
    } else {
      toast.error(result.error || 'Connexion impossible');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await openSession(email, password, 'email');
  };

  const handleSendEmailCode = async () => {
    if (!mfaToken) return;
    setSendingEmailCode(true);
    try {
      const payload = await sendMfaEmailCode({ mfaToken });
      setEmailMasked(payload.emailMasked || '');
      setEmailCodeSent(true);
      toast.success(`Code envoyé à ${payload.emailMasked || 'votre adresse email'}.`);
    } catch (error) {
      if (error?.message === 'MFA_EMAIL_COOLDOWN') {
        toast.error(`Patientez ${error.payload?.retryAfterSeconds || 60} s avant un nouvel envoi.`);
      } else {
        toast.error('Impossible d’envoyer le code par email.');
      }
    } finally {
      setSendingEmailCode(false);
    }
  };

  const switchMfaMode = (nextMode) => {
    setMfaMode(nextMode);
    setOtpCode('');
    setRecoveryCode('');
    if (nextMode !== MFA_MODES.email) {
      setEmailCodeSent(false);
      setEmailMasked('');
    }
  };

  const handleMfaSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    const result = await completeMfaLogin({
      mfaToken,
      method: mfaMode,
      code: mfaMode === MFA_MODES.recovery ? undefined : otpCode,
      recoveryCode: mfaMode === MFA_MODES.recovery ? recoveryCode : undefined,
    });
    setIsLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      toast.error(result.error || 'Code invalide');
    }
  };

  const mfaDescription = {
    [MFA_MODES.totp]: 'Saisissez le code à 6 chiffres de votre application d’authentification.',
    [MFA_MODES.email]: emailCodeSent
      ? `Saisissez le code reçu par email${emailMasked ? ` à ${emailMasked}` : ''}.`
      : 'Recevez un code temporaire par email pour finaliser la connexion.',
    [MFA_MODES.recovery]: 'Saisissez l’un de vos codes de secours à usage unique.',
  }[mfaMode];

  const canSubmitMfa = mfaMode === MFA_MODES.recovery
    ? Boolean(recoveryCode.trim())
    : otpCode.length === 6;

  return (
    <div className="grid min-h-[calc(100vh-4rem)] bg-background lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden bg-[hsl(var(--greffio-blue))] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <GreffioLogo variant="inverse" to="/" />
        <div className="max-w-xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold">
            <ShieldCheck className="h-4 w-4" />
            Accès sécurisé client, pro et équipe
          </p>
          <h1 className="text-5xl font-extrabold leading-tight">Retrouvez vos dossiers, vos messages et vos prochaines actions.</h1>
          <div className="mt-8 grid grid-cols-3 gap-3 text-sm font-semibold">
            <div className="rounded-md bg-white/10 p-4">Documents</div>
            <div className="rounded-md bg-white/10 p-4">Équipe</div>
            <div className="rounded-md bg-white/10 p-4">Dépôt au greffe</div>
          </div>
        </div>
        <p className="text-sm text-white/60">Greffio est une marque déposée de William Establishments.</p>
      </section>

      <section className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md rounded-md border border-border bg-white p-8 shadow-elevation-md"
        >
          {step === 'credentials' ? (
            <>
              <div className="mb-6 lg:hidden">
                <GreffioLogo variant="full" to="/" />
              </div>
              <div>
                <LockKeyhole className="mb-5 h-9 w-9 text-primary" />
                <h2 className="text-3xl font-extrabold">Connexion</h2>
                <p className="mt-2 text-sm text-muted-foreground">Connexion sécurisée par email et mot de passe.</p>
              </div>

              <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email ou identifiant</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="pl-9" placeholder="vous@entreprise.fr" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="pl-9" placeholder="Votre mot de passe" required />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <Link to="/password-reset" className="font-semibold text-primary hover:underline">Mot de passe oublié</Link>
                </div>

                <Button type="submit" className="h-11 w-full justify-between" disabled={isLoading}>
                  {isLoading ? 'Ouverture de l’espace...' : 'Continuer'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <>
              <div>
                <ShieldCheck className="mb-5 h-9 w-9 text-primary" />
                <h2 className="text-3xl font-extrabold">Vérification MFA</h2>
                <p className="mt-2 text-sm text-muted-foreground">{mfaDescription}</p>
              </div>

              <form className="mt-6 space-y-5" onSubmit={handleMfaSubmit}>
                {mfaMode === MFA_MODES.email && !emailCodeSent ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full bg-white"
                    disabled={sendingEmailCode}
                    onClick={() => void handleSendEmailCode()}
                  >
                    {sendingEmailCode ? 'Envoi en cours…' : 'Recevoir un code par email'}
                  </Button>
                ) : null}

                {mfaMode !== MFA_MODES.recovery ? (
                  <div className="space-y-3">
                    <Label>{mfaMode === MFA_MODES.email ? 'Code reçu par email' : 'Code TOTP'}</Label>
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
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="recoveryCode">Code de secours</Label>
                    <Input
                      id="recoveryCode"
                      value={recoveryCode}
                      onChange={(event) => setRecoveryCode(event.target.value.toUpperCase())}
                      placeholder="GRF-XXXX-XXXX"
                      required
                    />
                  </div>
                )}

                {mfaMode === MFA_MODES.email && emailCodeSent ? (
                  <button
                    type="button"
                    className="text-sm font-semibold text-primary hover:underline disabled:opacity-50"
                    disabled={sendingEmailCode}
                    onClick={() => void handleSendEmailCode()}
                  >
                    Renvoyer le code par email
                  </button>
                ) : null}

                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  {mfaMode !== MFA_MODES.totp ? (
                    <button type="button" className="font-semibold text-primary hover:underline" onClick={() => switchMfaMode(MFA_MODES.totp)}>
                      Utiliser l’application TOTP
                    </button>
                  ) : null}
                  {mfaMode !== MFA_MODES.email ? (
                    <button type="button" className="font-semibold text-primary hover:underline" onClick={() => switchMfaMode(MFA_MODES.email)}>
                      Recevoir un code par email
                    </button>
                  ) : null}
                  {mfaMode !== MFA_MODES.recovery ? (
                    <button type="button" className="font-semibold text-primary hover:underline" onClick={() => switchMfaMode(MFA_MODES.recovery)}>
                      Utiliser un code de secours
                    </button>
                  ) : null}
                </div>

                <Button type="submit" className="h-11 w-full justify-between" disabled={isLoading || !canSubmitMfa || (mfaMode === MFA_MODES.email && !emailCodeSent)}>
                  {isLoading ? 'Vérification...' : 'Valider et accéder'}
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setStep('credentials');
                    resetMfaState();
                  }}
                >
                  Revenir à la connexion
                </Button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Nouveau sur Greffio ? <Link to="/signup" className="font-semibold text-primary hover:underline">Créer un espace</Link>
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Besoin d’aide : <a href={`mailto:${runtimeConfig.supportEmail}`} className="text-primary hover:underline">{runtimeConfig.supportEmail}</a>
          </p>
        </motion.div>
      </section>
    </div>
  );
};

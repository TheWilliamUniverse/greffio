import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { PasswordInput } from '@/components/PasswordInput.jsx';
import { showAuthFeedback } from '@/utils/authFeedback.js';
import { useAuth } from '@/hooks/useAuth.js';
import { sendMfaEmailCode } from '@/api/mfa.js';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { BrandName } from '@/components/BrandName.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp.jsx';
import { runtimeConfig } from '@/config/runtime.js';
import { PUBLISHER_LEGAL_NAME } from '@/config/publisher.js';
import { isMobileBrowserViewport, isCapacitorNative } from '@/utils/platform.js';
import { NativeWebLoginPage } from '@/pages/NativeWebLoginPage.jsx';
import { resolveNativePostLoginPath } from '@/utils/nativeColdStart.js';
import { resolvePostLoginPath } from '@/lib/auth/postLoginRedirect.js';
import { resolveSessionRole } from '@/utils/roles.js';
import { PublicMinimalLegalFooter } from '@/components/layout/PublicMinimalLegalFooter.jsx';
import { MobileFooter } from '@/mobile/MobileFooter.jsx';
import { SecurityChallengeWidget } from '@/components/security/SecurityChallengeWidget.jsx';
import { useSecurityConfig } from '@/hooks/useSecurityConfig.js';
import { FieldError } from '@/components/patterns/FieldError.jsx';
import { getAuthInputClass } from '@/lib/authFormStyles.js';

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
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [captcha, setCaptcha] = useState({ provider: 'turnstile', turnstileToken: '', recaptchaToken: '' });
  const mfaAutoSubmitLockRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const mobileAuth = isCapacitorNative() || isMobileBrowserViewport();
  const nativeApp = isCapacitorNative();
  const nativeAppHandoff = searchParams.get('nativeApp') === '1';
  const nativeAppReturnPath = searchParams.get('return') || '/auth/app-bridge';
  const fromPath = location.state?.from?.pathname;
  const { login, completeMfaLogin } = useAuth();
  const security = useSecurityConfig();
  const hasCaptchaToken = Boolean(captcha.turnstileToken || captcha.recaptchaToken);
  const showLoginChallenge = !nativeApp
    && security.turnstileOnLoginRisky
    && failedAttempts >= 2
    && security.captchaProvider !== 'none';
  const authInputClass = getAuthInputClass(mobileAuth);

  const validateCredentials = () => {
    const errors = { email: '', password: '' };
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = 'Indiquez votre email ou identifiant.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Format d’email invalide.';
    }
    if (!password) {
      errors.password = 'Indiquez votre mot de passe.';
    } else if (password.length < 8) {
      errors.password = 'Le mot de passe doit contenir au moins 8 caractères.';
    }
    setFieldErrors(errors);
    return !errors.email && !errors.password;
  };

  const resetMfaState = () => {
    setMfaMode(MFA_MODES.totp);
    setOtpCode('');
    setRecoveryCode('');
    setEmailMasked('');
    setEmailCodeSent(false);
  };

  const openSession = async (sessionEmail, sessionPassword, provider = 'email') => {
    setIsLoading(true);
    const result = await login(
      sessionEmail,
      sessionPassword,
      provider,
      showLoginChallenge ? captcha : {},
    );
    setIsLoading(false);

    if (result.success && result.mfaRequired) {
      setMfaToken(result.mfaToken);
      resetMfaState();
      setStep('mfa');
      showAuthFeedback('mfa', 'Vérification en deux étapes – c’est une protection standard pour votre compte.', { level: 'message' });
      return;
    }

    if (result.success) {
      setFailedAttempts(0);
      setCaptcha({ provider: 'turnstile', turnstileToken: '', recaptchaToken: '' });
      if (nativeAppHandoff && !nativeApp) {
        navigate(nativeAppReturnPath, { replace: true });
        return;
      }
      if (nativeApp) {
        const target = await resolveNativePostLoginPath(result.user);
        navigate(target, { replace: true });
      } else {
        navigate(resolvePostLoginPath({ role: resolveSessionRole(result.user), fromPath }), { replace: true });
      }
    } else if (result.error === 'TEMP_ACCOUNT_EXPIRED') {
      showAuthFeedback('login', 'Ce compte temporaire a expiré (validité jusqu’à 10 h ce matin).', { level: 'error' });
    } else if (result.error === 'SECURITY_CHECK_REQUIRED') {
      setFailedAttempts((value) => Math.max(value + 1, 2));
      showAuthFeedback('login', result.message || 'Une vérification de sécurité est nécessaire. Réessayez dans un instant.', { level: 'error' });
    } else if (result.error === 'RATE_LIMITED') {
      showAuthFeedback('login', result.message || 'Pour protéger votre compte, merci de patienter quelques minutes avant de réessayer.', { level: 'error' });
    } else {
      setFailedAttempts((value) => value + 1);
      setFieldErrors({
        email: '',
        password: result.error || 'Identifiants non reconnus. Vérifiez email et mot de passe, puis réessayez.',
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateCredentials()) return;
    setFieldErrors({ email: '', password: '' });
    await openSession(email, password, 'email');
  };

  const handleSendEmailCode = async () => {
    if (!mfaToken) return;
    setSendingEmailCode(true);
    try {
      const payload = await sendMfaEmailCode({ mfaToken });
      setEmailMasked(payload.emailMasked || '');
      setEmailCodeSent(true);
      showAuthFeedback('mfa', `Code envoyé à ${payload.emailMasked || 'votre adresse email'}.`);
    } catch (error) {
      if (error?.message === 'MFA_EMAIL_COOLDOWN') {
        showAuthFeedback('mfa', `Patientez ${error.payload?.retryAfterSeconds || 60} s avant un nouvel envoi.`, { level: 'error' });
      } else {
        showAuthFeedback('mfa', 'Impossible d\'envoyer le code par email.', { level: 'error' });
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
      code: mfaMode === MFA_MODES.recovery ? undefined : otpCode.replace(/\s+/g, ''),
      recoveryCode: mfaMode === MFA_MODES.recovery ? recoveryCode : undefined,
    });
    setIsLoading(false);

    if (result.success) {
      if (nativeAppHandoff && !nativeApp) {
        navigate(nativeAppReturnPath, { replace: true });
        return;
      }
      if (nativeApp) {
        const target = await resolveNativePostLoginPath(result.user);
        navigate(target, { replace: true });
      } else {
        navigate(resolvePostLoginPath({ role: resolveSessionRole(result.user), fromPath }), { replace: true });
      }
    } else {
      showAuthFeedback('mfa', result.error || 'Code incorrect ou expiré. Réessayez ou demandez un nouveau code.', { level: 'error' });
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

  useEffect(() => {
    if (!nativeApp || step !== 'mfa' || isLoading || mfaAutoSubmitLockRef.current) return undefined;
    if (mfaMode === MFA_MODES.recovery) return undefined;
    if (mfaMode === MFA_MODES.email && !emailCodeSent) return undefined;
    if (otpCode.length !== 6) {
      mfaAutoSubmitLockRef.current = false;
      return undefined;
    }
    mfaAutoSubmitLockRef.current = true;
    const timer = window.setTimeout(() => {
      void handleMfaSubmit({ preventDefault: () => {} }).finally(() => {
        mfaAutoSubmitLockRef.current = false;
      });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [nativeApp, step, isLoading, mfaMode, emailCodeSent, otpCode]);

  if (nativeApp && !nativeAppHandoff) {
    return <NativeWebLoginPage />;
  }

  return (
    <div className={`bg-background ${mobileAuth ? 'flex min-h-[100dvh] flex-col' : `grid min-h-[calc(100vh-4rem)] lg:grid-cols-[1.05fr_0.95fr]`}`}>
      {mobileAuth ? (
        nativeApp ? (
          <section className="bg-gradient-to-b from-[hsl(var(--greffio-blue-900))] via-[hsl(var(--greffio-blue))] to-[hsl(var(--greffio-blue))] px-5 pb-7 pt-[calc(env(safe-area-inset-top)+1rem)] text-white">
            <GreffioLogo variant="wordmark-on-blue" to="/app/home" className="text-xl" />
            <h1 className="mt-5 text-[1.65rem] font-extrabold leading-tight tracking-tight">
              Bon retour sur Greffio
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/80">
              Connectez-vous pour reprendre vos dossiers et signatures.
            </p>
          </section>
        ) : (
          <div className="px-5 pb-2 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
            <GreffioLogo variant="full" to="/" className="text-xl" />
          </div>
        )
      ) : (
      <section className="hidden bg-[hsl(var(--greffio-blue))] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <GreffioLogo variant="wordmark-on-blue" to="/" />
        <div className="max-w-xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold">
            <ShieldCheck className="h-4 w-4" />
            Accès sécurisé client, pro et équipe
          </p>
          <h1 className="text-5xl font-extrabold leading-tight">Retrouvez vos dossiers, vos messages et vos prochaines actions.</h1>
          <div className="mt-8 grid grid-cols-3 gap-3 text-sm font-semibold">
            <div className="rounded-md bg-white/10 p-4">Documents</div>
            <div className="rounded-md bg-white/10 p-4">Équipe</div>
            <div className="rounded-md bg-white/10 p-4">Dépôt du dossier</div>
          </div>
        </div>
        <p className="text-sm text-white/60"><BrandName /> est une marque déposée de {PUBLISHER_LEGAL_NAME}.</p>
      </section>
      )}

      <section className={`flex flex-1 items-start justify-center px-4 sm:px-6 ${mobileAuth ? 'py-6 pb-[calc(env(safe-area-inset-bottom)+1rem)]' : 'items-center py-12 lg:px-8'}`}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className={`w-full max-w-md ${mobileAuth ? 'rounded-3xl border-0 bg-white p-6 shadow-elevation-md sm:border sm:border-border' : 'rounded-md border border-border bg-white p-8 shadow-elevation-md'}`}
        >
          {step === 'credentials' ? (
            <>
              {!mobileAuth ? (
                <div className="mb-6 lg:hidden">
                  <GreffioLogo variant="full" to="/" />
                </div>
              ) : !nativeApp ? (
                <div className="mb-5">
                  <h2 className="text-2xl font-extrabold tracking-tight">Connexion</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Accédez à votre espace client Greffio.</p>
                </div>
              ) : null}
              {!mobileAuth ? (
                <div>
                  <LockKeyhole className="mb-5 h-9 w-9 text-primary" />
                  <h2 className="text-3xl font-extrabold">Connexion</h2>
                  <p className="mt-2 text-sm text-muted-foreground">Connexion sécurisée par email et mot de passe.</p>
                </div>
              ) : null}

              <form className={`space-y-5 ${mobileAuth ? 'mt-2' : 'mt-6'}`} onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email ou identifiant</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (fieldErrors.email) setFieldErrors((current) => ({ ...current, email: '' }));
                      }}
                      required
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                      className={`pl-9 ${authInputClass}`}
                      placeholder="vous@entreprise.fr"
                    />
                  </div>
                  <FieldError id="login-email-error">{fieldErrors.email}</FieldError>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (fieldErrors.password) setFieldErrors((current) => ({ ...current, password: '' }));
                    }}
                    placeholder="Votre mot de passe"
                    required
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                    className={authInputClass}
                  />
                  <FieldError id="login-password-error">{fieldErrors.password}</FieldError>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <Link to="/password-reset" className="font-semibold text-primary hover:underline">Mot de passe oublié</Link>
                </div>

                {showLoginChallenge ? (
                  <SecurityChallengeWidget action="login" onTokens={setCaptcha} />
                ) : null}

                <Button
                  type="submit"
                  className={`w-full justify-between ${mobileAuth ? 'h-12 rounded-2xl text-base font-bold' : 'h-11'}`}
                  disabled={isLoading || (showLoginChallenge && !hasCaptchaToken)}
                >
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

                {(!nativeApp || mfaMode === MFA_MODES.recovery) ? (
                  <Button
                    type="submit"
                    className="h-11 w-full justify-between"
                    disabled={isLoading || !canSubmitMfa || (mfaMode === MFA_MODES.email && !emailCodeSent)}
                  >
                    {isLoading ? 'Vérification...' : 'Accéder à mon espace'}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <p className="text-center text-xs text-muted-foreground">
                    Le code est validé automatiquement une fois les 6 chiffres saisis.
                  </p>
                )}

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
            Nouveau sur <BrandName /> ? <Link to="/signup" className="font-semibold text-primary hover:underline">Créer un espace</Link>
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Besoin d’aide : <a href={`mailto:${runtimeConfig.supportEmail}`} className="text-primary hover:underline">{runtimeConfig.supportEmail}</a>
          </p>
        </motion.div>
      </section>
      {!nativeApp ? (isMobileBrowserViewport() ? <MobileFooter /> : <PublicMinimalLegalFooter />) : null}
    </div>
  );
};

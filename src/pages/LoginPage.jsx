import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth.js';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp.jsx';
import { runtimeConfig } from '@/config/runtime.js';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState('credentials');
  const [mfaToken, setMfaToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const { login, completeMfaLogin } = useAuth();
  const navigate = useNavigate();

  const openSession = async (sessionEmail, sessionPassword, provider = 'email') => {
    setIsLoading(true);
    const result = await login(sessionEmail, sessionPassword, provider);
    setIsLoading(false);

    if (result.success && result.mfaRequired) {
      setMfaToken(result.mfaToken);
      setStep('mfa');
      toast.message('Vérification en deux étapes requise');
      return;
    }

    if (result.success) {
      navigate('/dashboard');
    } else {
      toast.error(result.error || 'Connexion impossible');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await openSession(email, password, 'email');
  };

  const handleMfaSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    const result = await completeMfaLogin({
      mfaToken,
      code: useRecoveryCode ? undefined : totpCode,
      recoveryCode: useRecoveryCode ? recoveryCode : undefined,
    });
    setIsLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      toast.error(result.error || 'Code invalide');
    }
  };

  return (
    <div className="grid min-h-[calc(100vh-4rem)] bg-background lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden bg-[hsl(var(--greffio-blue))] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <GreffioLogo variant="inverse" />
        <div className="max-w-xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold">
            <ShieldCheck className="h-4 w-4" />
            Accès sécurisé client, pro et équipe
          </p>
          <h1 className="text-5xl font-extrabold leading-tight">Retrouvez vos dossiers, vos messages et vos prochaines actions.</h1>
          <div className="mt-8 grid grid-cols-3 gap-3 text-sm font-semibold">
            <div className="rounded-md bg-white/10 p-4">Documents</div>
            <div className="rounded-md bg-white/10 p-4">Équipe</div>
            <div className="rounded-md bg-white/10 p-4">dépôt au greffe</div>
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
              <div>
                <LockKeyhole className="mb-5 h-9 w-9 text-primary" />
                <h2 className="text-3xl font-extrabold">Connexion</h2>
                <p className="mt-2 text-sm text-muted-foreground">Connexion sécurisée par email et mot de passe.</p>
              </div>

              <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email professionnel</Label>
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
                <p className="mt-2 text-sm text-muted-foreground">
                  Saisissez le code à 6 chiffres de votre application d’authentification.
                </p>
              </div>

              <form className="mt-6 space-y-5" onSubmit={handleMfaSubmit}>
                {!useRecoveryCode ? (
                  <div className="space-y-3">
                    <Label>Code TOTP</Label>
                    <InputOTP maxLength={6} value={totpCode} onChange={setTotpCode}>
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

                <button
                  type="button"
                  className="text-sm font-semibold text-primary hover:underline"
                  onClick={() => setUseRecoveryCode((value) => !value)}
                >
                  {useRecoveryCode ? 'Utiliser l’application TOTP' : 'Utiliser un code de secours'}
                </button>

                <Button type="submit" className="h-11 w-full justify-between" disabled={isLoading || (!useRecoveryCode && totpCode.length !== 6)}>
                  {isLoading ? 'Vérification...' : 'Valider et accéder'}
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <Button type="button" variant="ghost" className="w-full" onClick={() => setStep('credentials')}>
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

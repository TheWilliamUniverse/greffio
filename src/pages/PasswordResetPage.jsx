import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { confirmPasswordReset, requestPasswordReset } from '@/api/auth.js';
import { mapSecurityApiError } from '@/config/security.js';
import { SecurityChallengeWidget } from '@/components/security/SecurityChallengeWidget.jsx';
import { useSecurityConfig } from '@/hooks/useSecurityConfig.js';

export const PasswordResetPage = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [captcha, setCaptcha] = useState({ provider: 'turnstile', turnstileToken: '', recaptchaToken: '' });
  const resetToken = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const security = useSecurityConfig();
  const hasCaptchaToken = Boolean(captcha.turnstileToken || captcha.recaptchaToken);
  const showPasswordResetChallenge = security.turnstileOnPasswordReset && security.captchaProvider !== 'none';

  const handleRequestSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await requestPasswordReset({
        email,
        ...(showPasswordResetChallenge && hasCaptchaToken ? captcha : {}),
      });
      setSubmitted(true);
      toast.success('Si un compte correspond à cette adresse, un email vous sera envoyé.');
    } catch (error) {
      const securityMessage = mapSecurityApiError(error);
      toast.error(securityMessage || "Impossible d'envoyer le lien pour le moment.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetSubmit = async (event) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }
    setSaving(true);
    try {
      await confirmPasswordReset({
        token: resetToken,
        password: newPassword,
        ...(showPasswordResetChallenge && hasCaptchaToken ? captcha : {}),
      });
      toast.success('Votre mot de passe a été mis à jour.');
      setSubmitted(true);
    } catch (error) {
      const securityMessage = mapSecurityApiError(error);
      toast.error(securityMessage || 'Lien invalide ou expiré. Redemandez un nouveau lien.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-12">
      <section className="w-full max-w-md rounded-md border border-border bg-white p-8 shadow-elevation-md">
        <div className="mb-7">
          <GreffioLogo variant="full" to="/" />
        </div>

        {submitted ? (
          <div className="space-y-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-secondary text-primary">
              <MailCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold">Lien envoyé</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Si un compte Greffio existe pour {email}, un email de réinitialisation sera envoyé.
              </p>
            </div>
            <Button asChild className="w-full">
              <Link to="/login">Retour à la connexion</Link>
            </Button>
          </div>
        ) : resetToken ? (
          <form className="space-y-5" onSubmit={handleResetSubmit}>
            <div>
              <h1 className="text-2xl font-extrabold">Nouveau mot de passe</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Ce lien est sécurisé et à usage unique.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="8 caractères minimum"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Répétez le mot de passe"
              />
            </div>
            {showPasswordResetChallenge ? (
              <SecurityChallengeWidget action="reset_password" onTokens={setCaptcha} />
            ) : null}
            <Button
              type="submit"
              className="w-full"
              disabled={saving || (showPasswordResetChallenge && !hasCaptchaToken)}
            >
              {saving ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
            </Button>
          </form>
        ) : (
          <form className="space-y-5" onSubmit={handleRequestSubmit}>
            <div>
              <h1 className="text-2xl font-extrabold">Mot de passe oublié</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Entrez votre email professionnel pour recevoir un lien sécurisé.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="vous@entreprise.fr"
              />
            </div>
            {showPasswordResetChallenge ? (
              <SecurityChallengeWidget action="forgot_password" onTokens={setCaptcha} />
            ) : null}
            <Button
              type="submit"
              className="w-full"
              disabled={saving || (showPasswordResetChallenge && !hasCaptchaToken)}
            >
              {saving ? 'Envoi...' : 'Envoyer le lien'}
            </Button>
            <Button variant="ghost" asChild className="w-full">
              <Link to="/login">
                <ArrowLeft className="h-4 w-4" />
                Retour à la connexion
              </Link>
            </Button>
          </form>
        )}
      </section>
    </main>
  );
};

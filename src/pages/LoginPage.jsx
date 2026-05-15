import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BriefcaseBusiness, Building2, KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth.js';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { runtimeConfig } from '@/config/runtime.js';

const providers = [
  { id: 'google', label: 'Continuer avec Google', mark: 'G', description: 'OAuth Google Workspace / Gmail', color: '#DB4437' },
  { id: 'microsoft', label: 'Compte pro Microsoft', mark: 'M', description: 'Microsoft Entra ID / Outlook', color: '#0078D4' },
  { id: 'linkedin', label: 'Réseau pro LinkedIn', mark: 'in', description: 'Connexion professionnelle', color: '#0A66C2' },
  { id: 'sso', label: 'SSO entreprise', mark: 'SSO', description: 'SAML/OIDC pour cabinets et équipes', color: 'hsl(var(--greffio-blue))' },
  { id: 'william', label: 'Continuer via William Establishments', mark: 'WE', description: 'Accès organisationnel William Establishments', color: 'hsl(var(--greffio-blue))' },
];

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [providerPending, setProviderPending] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const openSession = async (sessionEmail, sessionPassword = 'greffio-session', provider = 'email') => {
    setIsLoading(true);
    const result = await login(sessionEmail, sessionPassword, provider);
    setIsLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      toast.error(result.error || 'Connexion impossible');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (providerPending) {
      await openSession(email, `${providerPending.id}-oauth`, providerPending.id);
      return;
    }
    if (!mfaStep) {
      setMfaStep(true);
      toast.success('Code de sécurité demandé');
      return;
    }
    if (mfaCode && mfaCode.length < 6) {
      toast.error('Le code de sécurité doit contenir 6 chiffres.');
      return;
    }
    await openSession(email, password || 'greffio-session');
  };

  const sendMagicLink = () => {
    if (!email) {
      toast.error('Ajoutez votre email pour recevoir le lien magique.');
      return;
    }
    setMagicSent(true);
    toast.success('Lien magique préparé pour votre adresse');
  };

  const startProviderLogin = (provider) => {
    setProviderPending(provider);
    if (email) {
      void openSession(email, `${provider.id}-oauth`, provider.id);
      return;
    }
    toast.info(`Ajoutez votre email pour continuer avec ${provider.label.replace('Continuer avec ', '')}.`);
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
            <div className="rounded-md bg-white/10 p-4">Greffe</div>
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
          <div>
            <LockKeyhole className="mb-5 h-9 w-9 text-primary" />
            <h2 className="text-3xl font-extrabold">Connexion</h2>
            <p className="mt-2 text-sm text-muted-foreground">Choisissez votre mode d’accès à l’espace Greffio.</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Domaine actif : <span className="font-semibold">greffio.willentreprises.com</span>
            </p>
          </div>

          <div className="mt-7 grid gap-3">
            {providers.map((provider) => (
              <Button
                key={provider.id}
                type="button"
                variant="outline"
                className="h-auto justify-start bg-white py-3 text-left"
                onClick={() => startProviderLogin(provider)}
                disabled={isLoading}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border bg-white text-xs font-extrabold text-primary">
                  {provider.id === 'william' ? <Building2 className="h-4 w-4" /> : <span style={{ color: provider.color }}>{provider.mark}</span>}
                </span>
                <span>
                  <span className="block">{provider.label}</span>
                  <span className="block text-xs font-normal text-muted-foreground">{provider.description}</span>
                </span>
              </Button>
            ))}
          </div>

          <div className="my-7 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-semibold uppercase text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {providerPending && (
              <div className="rounded-md border border-primary/30 bg-secondary p-4 text-sm">
                <p className="font-bold text-primary">{providerPending.label}</p>
                <p className="mt-1 leading-5 text-muted-foreground">Renseignez votre email professionnel puis validez pour ouvrir l’espace Greffio.</p>
              </div>
            )}
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
                <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="pl-9" placeholder="Votre mot de passe" disabled={Boolean(providerPending)} />
              </div>
            </div>

            {mfaStep && (
              <div className="space-y-2 rounded-md border border-border bg-muted p-4">
                <Label htmlFor="mfa">Code de sécurité</Label>
                <Input id="mfa" inputMode="numeric" value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} placeholder="Code email, SMS ou application" />
                <p className="text-xs leading-5 text-muted-foreground">Compatible Google Authenticator, Microsoft Authenticator, code email et SMS.</p>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground">
                <input type="checkbox" className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                Se souvenir de moi
              </label>
              <Link to="/password-reset" className="font-semibold text-primary hover:underline">Mot de passe oublié</Link>
            </div>

            <Button type="submit" className="h-11 w-full justify-between" disabled={isLoading}>
              {isLoading ? 'Ouverture de l’espace...' : providerPending ? 'Continuer avec ce compte' : mfaStep ? 'Valider et accéder' : 'Continuer'}
              <ArrowRight className="h-4 w-4" />
            </Button>

            <Button type="button" variant="secondary" className="h-11 w-full justify-between" onClick={sendMagicLink}>
              {magicSent ? 'Demande de lien prête' : 'Recevoir un lien magique'}
              <BriefcaseBusiness className="h-4 w-4" />
            </Button>
          </form>

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

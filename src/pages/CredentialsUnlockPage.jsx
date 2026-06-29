import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { getCredentialsUnlockMeta, verifyCredentialsUnlock } from '@/api/credentialsUnlock.js';

export const CredentialsUnlockPage = () => {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null);
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const payload = await getCredentialsUnlockMeta(token);
        setMeta(payload);
      } catch (_error) {
        setMeta(null);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      toast.error('Saisissez le code à 6 chiffres reçu par SMS.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = await verifyCredentialsUnlock({ token, code: code.trim() });
      setResult(payload);
      toast.success('Identifiants déverrouillés');
    } catch (error) {
      toast.error(error?.message === 'CREDENTIAL_UNLOCK_CODE_INVALID'
        ? 'Code incorrect. Vérifiez le SMS reçu ou demandez un nouveau lien à votre équipe Greffio.'
        : 'Déverrouillage momentanément indisponible. Réessayez dans quelques instants.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-md">
        <Link to="/login" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Retour à la connexion
        </Link>

        <div className="mb-8 flex justify-center">
          <GreffioLogo variant="full" to="/" />
        </div>

        <div className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold">Accès sécurisé</h1>
              <p className="text-sm text-muted-foreground">Déverrouillez vos identifiants Greffio</p>
            </div>
          </div>

          {loading ? <p className="text-sm text-muted-foreground">Chargement...</p> : null}

          {!loading && !token ? (
            <p className="text-sm text-destructive">Lien invalide ou incomplet.</p>
          ) : null}

          {!loading && token && !meta?.ok && !result ? (
            <p className="text-sm text-muted-foreground">Ce lien n’est plus actif. Demandez un nouveau SMS de déverrouillage à votre équipe Greffio.</p>
          ) : null}

          {!loading && meta?.ok && !result ? (
            <>
              <p className="text-sm text-muted-foreground">
                Bonjour {meta.firstName}, saisissez le code reçu par SMS au numéro se terminant par <strong>{meta.phoneMasked}</strong>.
              </p>
              <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <Label htmlFor="sms-code">Code SMS (6 chiffres)</Label>
                  <Input
                    id="sms-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="mt-1 text-center text-lg tracking-[0.35em]"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Vérification...' : 'Afficher mon mot de passe temporaire'}
                </Button>
              </form>
            </>
          ) : null}

          {result?.ok ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Identifiants pour <strong>{result.email}</strong></p>
              <div className="rounded-md border border-border bg-muted p-4 text-sm">
                <p className="font-semibold">Mot de passe temporaire</p>
                <p className="mt-2 font-mono text-base">{result.temporaryPassword}</p>
              </div>
              <Button asChild className="w-full">
                <Link to="/login">Se connecter</Link>
              </Button>
              <p className="text-xs text-muted-foreground">Changez ce mot de passe dès votre première connexion.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

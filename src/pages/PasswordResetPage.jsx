import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';

export const PasswordResetPage = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    toast.success('Lien de réinitialisation préparé');
  };

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-12">
      <section className="w-full max-w-md rounded-md border border-border bg-white p-8 shadow-elevation-md">
        <div className="mb-7">
          <GreffioLogo variant="full" />
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
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
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
            <Button type="submit" className="w-full">Envoyer le lien</Button>
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

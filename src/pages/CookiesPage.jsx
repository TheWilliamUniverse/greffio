import React from 'react';
import { Link } from 'react-router-dom';
import { Cookie, ShieldCheck } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { COOKIE_CATEGORIES } from '@/config/cookieCatalog.js';

const CookieTable = ({ items }) => (
  <div className="mt-4 overflow-x-auto rounded-xl border border-border">
    <table className="w-full min-w-[640px] text-left text-sm">
      <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
        <tr>
          <th className="px-4 py-3 font-semibold">Nom</th>
          <th className="px-4 py-3 font-semibold">Finalité</th>
          <th className="px-4 py-3 font-semibold">Support</th>
          <th className="px-4 py-3 font-semibold">Durée</th>
          <th className="px-4 py-3 font-semibold">Responsable</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {items.map((item) => (
          <tr key={item.name} className="bg-white">
            <td className="px-4 py-3 align-top font-medium text-foreground">{item.name}</td>
            <td className="px-4 py-3 align-top text-muted-foreground">{item.purpose}</td>
            <td className="px-4 py-3 align-top whitespace-nowrap text-muted-foreground">{item.storage}</td>
            <td className="px-4 py-3 align-top whitespace-nowrap text-muted-foreground">{item.duration}</td>
            <td className="px-4 py-3 align-top text-muted-foreground">{item.provider}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const CookiesPage = () => (
  <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <GreffioLogo variant="full" to="/" />
        <Button variant="outline" asChild className="bg-white">
          <Link to="/">Accueil</Link>
        </Button>
      </div>

      <section className="rounded-2xl bg-[hsl(var(--greffio-blue))] p-6 text-white shadow-elevation-md md:p-8">
        <p className="text-sm font-bold uppercase text-white/70">Transparence</p>
        <h1 className="mt-2 text-3xl font-extrabold">Politique cookies Greffio</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/92">
          Cette page décrit les traceurs et stockages locaux utilisés par Greffio, leur finalité et la durée de conservation.
          Vous pouvez accepter ou refuser les cookies non essentiels depuis le bandeau affiché lors de votre première visite.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-5 shadow-elevation-sm">
          <Cookie className="mb-3 h-6 w-6 text-primary" />
          <h2 className="font-extrabold text-foreground">Qu’est-ce qu’un cookie ?</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            Un cookie est un petit fichier déposé ou lu par votre navigateur. Greffio utilise aussi le stockage local
            (localStorage) pour mémoriser votre session, vos préférences et l’avancement de vos dossiers.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5 shadow-elevation-sm">
          <ShieldCheck className="mb-3 h-6 w-6 text-primary" />
          <h2 className="font-extrabold text-foreground">Vos choix</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            Les cookies essentiels et fonctionnels sont nécessaires au service. Les cookies de mesure d’audience restent
            désactivés tant que vous n’avez pas cliqué sur « Accepter » dans le bandeau cookies.
          </p>
        </div>
      </section>

      {COOKIE_CATEGORIES.map((group) => (
        <section key={group.id} className="rounded-xl border border-border bg-white p-5 shadow-elevation-sm md:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-extrabold text-foreground">{group.label}</h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                group.required
                  ? 'bg-secondary text-primary ring-1 ring-primary/20'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {group.required ? 'Toujours actifs' : 'Optionnels'}
            </span>
          </div>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{group.summary}</p>
          <CookieTable items={group.items} />
        </section>
      ))}

      <section className="rounded-xl border border-border bg-white p-5 text-sm leading-7 text-muted-foreground shadow-elevation-sm">
        <p>
          Pour en savoir plus sur le traitement de vos données personnelles, consultez notre{' '}
          <Link to="/confidentialite" className="font-semibold text-primary hover:underline">
            politique de confidentialité
          </Link>
          .
        </p>
        <p className="mt-3">
          Pour exercer vos droits ou poser une question, contactez-nous via la page{' '}
          <Link to="/contact" className="font-semibold text-primary hover:underline">
            Contact
          </Link>
          .
        </p>
      </section>
    </div>
  </main>
);

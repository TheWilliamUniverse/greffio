import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, MonitorSmartphone, PackageCheck, QrCode, ShieldCheck, Smartphone } from 'lucide-react';
import { NavbarDropdown } from '@/components/NavbarDropdown.jsx';
import { Button } from '@/components/ui/button.jsx';
import { GooglePlayStoreLink } from '@/components/store/GooglePlayStoreLink.jsx';

const installTracks = [
  {
    icon: MonitorSmartphone,
    title: 'Installation web immédiate',
    text: 'Greffio s’installe depuis Chrome, Edge et Safari compatible : icône Greffio, mode plein écran et accès rapide à vos dossiers.',
    points: ['Icône Greffio', 'Mode plein écran', 'Cache de secours', 'Raccourcis dashboard'],
  },
  {
    icon: PackageCheck,
    title: 'Google Play',
    text: 'L’application Android officielle est disponible : dossiers, documents et suivi de formalités depuis votre mobile.',
    points: ['Version 1.2.3 publiée', 'Liens profonds Android', 'Notifications de mise à jour', 'Même espace client'],
    playStore: true,
  },
  {
    icon: Smartphone,
    title: 'App Store',
    text: 'Application iOS à venir prochainement, avec le même espace client et le même suivi de dossier.',
    points: ['Version iOS en préparation', 'Même compte Greffio', 'Notifications prévues', 'Soumission App Store à venir'],
    soon: true,
  },
];

export const AppInstallPage = () => (
  <div className="min-h-screen bg-background text-foreground">
    <NavbarDropdown />
    <main className="px-4 pt-28 sm:px-6 lg:px-8">
      <section className="mx-auto grid max-w-7xl gap-8 rounded-md border border-border bg-[hsl(var(--greffio-citron))] p-4 shadow-elevation-lg sm:p-6 md:p-8 lg:grid-cols-[0.88fr_1.12fr] lg:p-10">
        <div>
          <Button asChild variant="outline" className="mb-8 bg-white">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Accueil
            </Link>
          </Button>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-4 py-2 text-sm font-bold text-primary">
            <QrCode className="h-4 w-4" />
            Application Greffio
          </div>
          <h1 className="mt-6 text-3xl font-extrabold leading-tight text-[hsl(var(--greffio-blue-900))] sm:text-4xl lg:text-6xl">
            Web, Android disponible, iOS bientôt.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[hsl(var(--greffio-blue-900))] sm:text-lg sm:leading-8">
            Installez Greffio depuis votre navigateur ou téléchargez l’application Android sur Google Play.
            L’application iOS arrive prochainement sur l’App Store.
          </p>
          <div className="mt-7 flex flex-col gap-5">
            <GooglePlayStoreLink size="lg" />
            <Button asChild size="lg" variant="outline" className="w-full bg-white sm:w-auto">
              <Link to="/login">Ouvrir l’espace client</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4">
          {installTracks.map((track) => (
            <div key={track.title} className="rounded-md border border-border bg-white p-4 shadow-elevation-sm sm:p-5">
              <div className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-secondary">
                  <track.icon className="h-5 w-5 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-extrabold sm:text-lg">{track.title}</h2>
                    {track.soon ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Bientôt
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{track.text}</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {track.points.map((point) => (
                      <div key={point} className="flex items-center gap-2 text-sm font-semibold">
                        <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                        {point}
                      </div>
                    ))}
                  </div>
                  {track.playStore ? (
                    <div className="mt-5 border-t border-border/70 pt-5">
                      <GooglePlayStoreLink size="mdInline" className="w-full max-w-md" />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 py-12 md:grid-cols-3">
        {[
          ['Sécurité', 'MFA, sessions, espace client et documents restent côté espace sécurisé.'],
          ['Multi-support', 'Même espace client sur navigateur, application Android et prochainement iOS.'],
          ['Mises à jour', 'L’application Android évolue via Google Play ; la PWA se met à jour à chaque visite.'],
        ].map(([title, text]) => (
          <div key={title} className="rounded-md border border-border bg-white p-5">
            <ShieldCheck className="mb-4 h-5 w-5 text-primary" />
            <h2 className="font-extrabold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>
    </main>
  </div>
);

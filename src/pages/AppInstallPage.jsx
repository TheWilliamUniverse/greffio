import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, MonitorSmartphone, PackageCheck, QrCode, ShieldCheck, Smartphone } from 'lucide-react';
import { NavbarDropdown } from '@/components/NavbarDropdown.jsx';
import { Button } from '@/components/ui/button.jsx';

const installTracks = [
  {
    icon: MonitorSmartphone,
    title: 'Installation web immédiate',
    text: 'Greffio est installable depuis Chrome, Edge et Safari compatible grâce au manifeste PWA et au service worker.',
    points: ['Icône Greffio', 'Mode plein écran', 'Cache de secours', 'Raccourcis dashboard'],
  },
  {
    icon: PackageCheck,
    title: 'Google Play',
    text: 'La base Capacitor est prête pour générer une application Android lorsque le compte Play Console et la clé de signature seront disponibles.',
    points: ['Bundle id com.greffio.app', 'WebDir dist', 'Signature AAB', 'Asset links'],
  },
  {
    icon: Smartphone,
    title: 'App Store',
    text: 'Le même build peut être synchronisé vers iOS avec Capacitor, puis finalisé dans Xcode et App Store Connect.',
    points: ['Bundle iOS', 'Certificats Apple', 'Notifications', 'Soumission App Store'],
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
            Une plateforme prête à vivre sur web, mobile et tablette.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[hsl(var(--greffio-blue-900))]/78 sm:text-lg sm:leading-8">
            Le socle installable est intégré. Les stores nécessitent ensuite les comptes éditeur, les certificats et les clés de signature propres à Greffio.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/simulateur">Lancer une formalité</Link>
            </Button>
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
                <div>
                  <h2 className="text-base font-extrabold sm:text-lg">{track.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{track.text}</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {track.points.map((point) => (
                      <div key={point} className="flex items-center gap-2 text-sm font-semibold">
                        <BadgeCheck className="h-4 w-4 text-emerald-600" />
                        {point}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 py-12 md:grid-cols-3">
        {[
          ['Sécurité', 'MFA, sessions, espace client et documents restent côté espace sécurisé.'],
          ['Déploiement', 'Hostinger peut servir le build Vite/PWA, puis les stores utilisent le même dossier dist.'],
          ['Production', 'Les SMS, emails et SSO devront être reliés à des fournisseurs réels côté backend.'],
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

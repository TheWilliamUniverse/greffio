import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Banknote, Calculator, FileText, Landmark, Percent, ReceiptText, SearchCheck, WalletCards } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';

const resources = [
  { title: 'Simulateur de choix de forme juridique', text: 'Comparer SAS, SARL, SA, EI, SCI, association et formes spécialisées selon le projet.', icon: SearchCheck, to: '/simulateur?type=statuts' },
  { title: 'Calcul de charges sociales', text: 'Préparer une estimation dirigeant salarié, TNS, micro ou assimilé salarié.', icon: Calculator, to: '/simulateur?type=charges' },
  { title: 'Estimation du coût de création', text: 'Visualiser accompagnement, annonce légale, dépôt, greffe et frais tiers avant validation.', icon: ReceiptText, to: '/paiement' },
  { title: 'Calcul d’éligibilité à l’ACRE', text: 'Identifier les critères, justificatifs et impacts de l’aide à la création.', icon: Percent, to: '/simulateur?type=acre' },
  { title: 'Vérification de disponibilité du nom', text: 'Préparer les contrôles nom commercial, marque, domaine et risque de confusion.', icon: FileText, to: '/simulateur?type=nom' },
  { title: 'Générateur de mentions légales', text: 'Créer une base de mentions légales, CGU, CGV et politique de confidentialité.', icon: Landmark, to: '/simulateur?type=mentions' },
];

const transversal = [
  { title: 'Dépôt de capital', text: 'Préparation du dossier bancaire et suivi de l’attestation.', icon: Banknote },
  { title: 'Compte pro', text: 'Orientation vers compte professionnel selon profil, forme et calendrier.', icon: WalletCards },
  { title: 'Logiciel de facturation', text: 'Préparation factures, devis, numérotation et conformité TVA.', icon: ReceiptText },
];

export const ResourcesPage = () => {
  const [monthlyRevenue, setMonthlyRevenue] = useState('5000');
  const [monthlyCosts, setMonthlyCosts] = useState('1200');
  const [managerStatus, setManagerStatus] = useState('assimile-salarie');
  const [isJobSeeker, setIsJobSeeker] = useState(true);
  const [nameCandidate, setNameCandidate] = useState('');
  const [legalFamily, setLegalFamily] = useState('commerciale');

  const socialEstimate = useMemo(() => {
    const revenue = Number(monthlyRevenue) || 0;
    const costs = Number(monthlyCosts) || 0;
    const base = Math.max(0, revenue - costs);
    const ratio = managerStatus === 'tns' ? 0.45 : 0.62;
    return Math.round(base * ratio);
  }, [monthlyRevenue, monthlyCosts, managerStatus]);

  const creationEstimate = useMemo(() => {
    const base = legalFamily === 'commerciale' ? 149 : legalFamily === 'civile' ? 199 : 99;
    const fees = legalFamily === 'commerciale' ? 250 : 180;
    return {
      service: base,
      legalFees: fees,
      total: base + fees,
    };
  }, [legalFamily]);

  const acreResult = useMemo(() => (
    isJobSeeker
      ? 'Profil potentiellement éligible à l’ACRE (vérification finale selon votre situation).'
      : 'Éligibilité ACRE moins probable, à confirmer selon votre statut exact.'
  ), [isJobSeeker]);

  const nameCheckResult = useMemo(() => {
    if (!nameCandidate.trim()) return 'Saisissez un nom pour lancer la vérification.';
    if (nameCandidate.trim().length < 4) return 'Nom trop court : ajoutez au moins 4 caractères.';
    if (/[^a-zA-Z0-9\s-]/.test(nameCandidate)) return 'Évitez les caractères spéciaux non nécessaires.';
    return 'Nom exploitable en première approche. Vérifier INPI, RNE et nom de domaine avant dépôt.';
  }, [nameCandidate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/">
            <GreffioLogo variant="full" />
          </Link>
          <Button asChild>
            <Link to="/simulateur">
              Démarrer
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <section className="rounded-md bg-[hsl(var(--greffio-citron))] p-8 md:p-10">
          <p className="text-sm font-bold uppercase text-primary">Ressources</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-extrabold text-[hsl(var(--greffio-blue-900))]">Outils utiles pour préparer votre dossier sans omission.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[hsl(var(--greffio-blue-900))]">
            Cette page fournit des estimations et vérifications pratiques, avec des résultats compréhensibles immédiatement.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {resources.map((resource) => (
            <Link key={resource.title} to={resource.to} className="rounded-md border border-border bg-white p-5 shadow-elevation-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-elevation-md">
              <resource.icon className="mb-5 h-7 w-7 text-primary" />
              <h2 className="text-lg font-extrabold">{resource.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{resource.text}</p>
            </Link>
          ))}
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-2">
          <article className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
            <div className="mb-4 flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-extrabold">Estimation des charges sociales</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                Chiffre d’affaires mensuel
                <input className="mt-1 h-9 w-full rounded-md border border-input px-3" type="number" min="0" value={monthlyRevenue} onChange={(event) => setMonthlyRevenue(event.target.value)} />
              </label>
              <label className="text-sm">
                Charges mensuelles
                <input className="mt-1 h-9 w-full rounded-md border border-input px-3" type="number" min="0" value={monthlyCosts} onChange={(event) => setMonthlyCosts(event.target.value)} />
              </label>
            </div>
            <label className="mt-3 block text-sm">
              Statut du dirigeant
              <select className="mt-1 h-9 w-full rounded-md border border-input px-3" value={managerStatus} onChange={(event) => setManagerStatus(event.target.value)}>
                <option value="assimile-salarie">Assimilé salarié</option>
                <option value="tns">TNS</option>
              </select>
            </label>
            <p className="mt-4 rounded-md bg-muted p-3 text-sm">
              Estimation des cotisations : <strong>{socialEstimate} € / mois</strong>
            </p>
          </article>

          <article className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
            <div className="mb-4 flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-extrabold">Estimation coût global de création</h2>
            </div>
            <label className="text-sm">
              Famille juridique
              <select className="mt-1 h-9 w-full rounded-md border border-input px-3" value={legalFamily} onChange={(event) => setLegalFamily(event.target.value)}>
                <option value="commerciale">Société commerciale</option>
                <option value="civile">Société civile</option>
                <option value="individuelle">Entreprise individuelle</option>
              </select>
            </label>
            <div className="mt-4 grid gap-2 text-sm">
              <p className="rounded-md bg-muted p-3">Accompagnement Greffio : <strong>{creationEstimate.service} €</strong></p>
              <p className="rounded-md bg-muted p-3">Frais administratifs estimés : <strong>{creationEstimate.legalFees} €</strong></p>
              <p className="rounded-md bg-secondary p-3">Total estimatif : <strong>{creationEstimate.total} €</strong></p>
            </div>
          </article>

          <article className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
            <div className="mb-4 flex items-center gap-2">
              <Percent className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-extrabold">Pré-vérification ACRE</h2>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isJobSeeker} onChange={(event) => setIsJobSeeker(event.target.checked)} />
              Je suis actuellement demandeur d’emploi
            </label>
            <p className="mt-4 rounded-md bg-muted p-3 text-sm">{acreResult}</p>
          </article>

          <article className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
            <div className="mb-4 flex items-center gap-2">
              <SearchCheck className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-extrabold">Vérification de nom (premier niveau)</h2>
            </div>
            <label className="text-sm">
              Nom envisagé
              <input className="mt-1 h-9 w-full rounded-md border border-input px-3" value={nameCandidate} onChange={(event) => setNameCandidate(event.target.value)} placeholder="Ex: Nova Conseil" />
            </label>
            <p className="mt-4 rounded-md bg-muted p-3 text-sm">{nameCheckResult}</p>
          </article>
        </section>

        <section className="mt-10 rounded-md border border-border bg-white p-6 shadow-elevation-sm">
          <p className="text-sm font-bold uppercase text-primary">Services transversaux</p>
          <h2 className="mt-2 text-2xl font-extrabold">Activer les briques utiles autour du dossier</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {transversal.map((item) => (
              <div key={item.title} className="rounded-md bg-muted p-5">
                <item.icon className="mb-4 h-6 w-6 text-primary" />
                <h3 className="font-extrabold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
                <Button asChild size="sm" className="mt-4">
                  <Link to="/contact">Demander l’activation</Link>
                </Button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

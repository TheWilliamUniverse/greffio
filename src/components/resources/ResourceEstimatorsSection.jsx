import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Calculator,
  FileText,
  Landmark,
  Percent,
  ReceiptText,
  SearchCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { LEGACY_ESTIMATORS } from '@/config/resourceServices.js';

const resourceLinks = [
  { title: 'Simulateur de choix de forme juridique', text: 'Comparer SAS, SARL, SA, EI, SCI, association et formes spécialisées selon le projet.', icon: SearchCheck, to: '/ressources/comparateur-forme-juridique' },
  { title: 'Calcul de charges sociales', text: 'Préparer une estimation dirigeant salarié, TNS, micro ou assimilé salarié.', icon: Calculator, to: '/simulateur?type=charges' },
  { title: 'Estimation du coût de création', text: 'Visualiser accompagnement, annonce légale, dépôt, greffe et frais tiers avant validation.', icon: ReceiptText, to: '/paiement' },
  { title: 'Calcul d’éligibilité à l’ACRE', text: 'Identifier les critères, justificatifs et impacts de l’aide à la création.', icon: Percent, to: '/simulateur?type=acre' },
  { title: 'Vérification de disponibilité du nom', text: 'Préparer les contrôles nom commercial, marque, domaine et risque de confusion.', icon: FileText, to: '/simulateur?type=nom' },
  { title: 'Générateur de mentions légales', text: 'Créer une base de mentions légales, CGU, CGV et politique de confidentialité.', icon: Landmark, to: '/simulateur?type=mentions' },
];

export const ResourceEstimatorsSection = () => {
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
    return { service: base, legalFees: fees, total: base + fees };
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
    <section id="outils-estimateurs" className="mt-16 scroll-mt-24 border-t border-border pt-14">
      <div className="mb-8 max-w-2xl">
        <p className="text-sm font-bold uppercase text-primary">Outils & estimateurs</p>
        <h2 className="mt-2 text-2xl font-extrabold">Préparer votre dossier sans omission</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Estimations et vérifications pratiques, avec des résultats compréhensibles immédiatement.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {resourceLinks.map((resource) => (
          <Link
            key={resource.title}
            to={resource.to}
            className="rounded-xl border border-border bg-white p-5 shadow-elevation-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevation-md"
          >
            <resource.icon className="mb-5 h-7 w-7 text-primary" />
            <h3 className="text-lg font-extrabold">{resource.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{resource.text}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-border bg-white p-6 shadow-elevation-sm">
          <div className="mb-4 flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-extrabold">Estimation des charges sociales</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Chiffre d’affaires mensuel
              <input className="mt-1 h-9 w-full rounded-md border border-input px-3" type="number" min="0" value={monthlyRevenue} onChange={(e) => setMonthlyRevenue(e.target.value)} />
            </label>
            <label className="text-sm">
              Charges mensuelles
              <input className="mt-1 h-9 w-full rounded-md border border-input px-3" type="number" min="0" value={monthlyCosts} onChange={(e) => setMonthlyCosts(e.target.value)} />
            </label>
          </div>
          <label className="mt-3 block text-sm">
            Statut du dirigeant
            <select className="mt-1 h-9 w-full rounded-md border border-input px-3" value={managerStatus} onChange={(e) => setManagerStatus(e.target.value)}>
              <option value="assimile-salarie">Assimilé salarié</option>
              <option value="tns">TNS</option>
            </select>
          </label>
          <p className="mt-4 rounded-md bg-muted p-3 text-sm">
            Estimation des cotisations : <strong>{socialEstimate} € / mois</strong>
          </p>
        </article>

        <article className="rounded-xl border border-border bg-white p-6 shadow-elevation-sm">
          <div className="mb-4 flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-extrabold">Estimation coût global de création</h3>
          </div>
          <label className="text-sm">
            Famille juridique
            <select className="mt-1 h-9 w-full rounded-md border border-input px-3" value={legalFamily} onChange={(e) => setLegalFamily(e.target.value)}>
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

        <article className="rounded-xl border border-border bg-white p-6 shadow-elevation-sm">
          <div className="mb-4 flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-extrabold">Pré-vérification ACRE</h3>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isJobSeeker} onChange={(e) => setIsJobSeeker(e.target.checked)} />
            Je suis actuellement demandeur d’emploi
          </label>
          <p className="mt-4 rounded-md bg-muted p-3 text-sm">{acreResult}</p>
        </article>

        <article className="rounded-xl border border-border bg-white p-6 shadow-elevation-sm">
          <div className="mb-4 flex items-center gap-2">
            <SearchCheck className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-extrabold">Vérification de nom (premier niveau)</h3>
          </div>
          <label className="text-sm">
            Nom envisagé
            <input className="mt-1 h-9 w-full rounded-md border border-input px-3" value={nameCandidate} onChange={(e) => setNameCandidate(e.target.value)} placeholder="Ex: Nova Conseil" />
          </label>
          <p className="mt-4 rounded-md bg-muted p-3 text-sm">{nameCheckResult}</p>
        </article>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {LEGACY_ESTIMATORS.map((item) => (
          <Button key={item.id} asChild variant="outline" size="sm">
            <Link to={item.to}>
              {item.title}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        ))}
      </div>
    </section>
  );
};

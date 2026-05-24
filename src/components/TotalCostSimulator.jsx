import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calculator, CircleHelp } from 'lucide-react';
import { LEGAL_STRUCTURES } from '@/config/businessCatalog.js';
import { Button } from '@/components/ui/button.jsx';
import { YoungEntrepreneurOfferBanner } from '@/components/YoungEntrepreneurOfferBanner.jsx';
import { BirthDateMinorEncouragement } from '@/components/BirthDateMinorEncouragement.jsx';
import { isYoungEntrepreneurEligible } from '@/config/minorAssociateRules.js';
import { YOUNG_ENTREPRENEUR_OFFER, resolveServicePriceCents } from '@/config/pricingOffers.js';

const legalFeesByForm = {
  SASU: 24500,
  SAS: 24500,
  SARL: 24500,
  EURL: 24500,
  SA: 28500,
  SCI: 21000,
  'Micro-entreprise': 0,
};

const fmtEuro = (cents) => `${(cents / 100).toFixed(2)} €`;

export const TotalCostSimulator = () => {
  const [searchParams] = useSearchParams();
  const [legalForm, setLegalForm] = useState('SASU');
  const [associateCount, setAssociateCount] = useState(1);
  const [birthDate, setBirthDate] = useState('');
  const [options, setOptions] = useState({
    assistancePremium: false,
    depositCapital: true,
    accountingSetup: false,
  });

  const youngEligible = useMemo(
    () => searchParams.get('offer') === 'jeune-entrepreneur' || isYoungEntrepreneurEligible(birthDate),
    [birthDate, searchParams],
  );

  const legalFormOptions = useMemo(() => (
    LEGAL_STRUCTURES[0]?.types?.filter((item) => item !== 'SA' || true) || ['SASU', 'SAS', 'SARL', 'EURL', 'SA', 'SCI', 'Micro-entreprise']
  ), []);

  const breakdown = useMemo(() => {
    const standardBase = legalForm === 'SCI' ? 19900 : legalForm === 'SA' ? 29900 : legalForm === 'Micro-entreprise' ? 0 : YOUNG_ENTREPRENEUR_OFFER.standardPriceCents;
    const baseService = resolveServicePriceCents({ youngEligible, standardCents: standardBase });
    const legalFees = legalFeesByForm[legalForm] ?? 24500;
    const premium = options.assistancePremium ? 9900 : 0;
    const deposit = options.depositCapital ? 7900 : 0;
    const accounting = options.accountingSetup ? 4900 : 0;
    const associatesExtra = associateCount > 1 ? (associateCount - 1) * 1500 : 0;

    const serviceSubtotal = baseService + premium + accounting + associatesExtra;
    const legalSubtotal = legalFees + deposit;
    const totalHt = serviceSubtotal + legalSubtotal;
    const vat = Math.round(serviceSubtotal * 0.2);
    const totalTtc = totalHt + vat;
    return {
      baseService,
      standardBase,
      youngEligible,
      premium,
      accounting,
      associatesExtra,
      legalFees,
      deposit,
      serviceSubtotal,
      legalSubtotal,
      totalHt,
      vat,
      totalTtc,
    };
  }, [associateCount, birthDate, legalForm, options, youngEligible]);

  const toggle = (key) => {
    setOptions((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <section className="space-y-4">
      <YoungEntrepreneurOfferBanner compact />

      <div className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-md bg-secondary p-2">
          <Calculator className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold">Simulateur de coût total</h2>
          <p className="text-sm text-muted-foreground">Le prix affiché est le prix expliqué, ligne par ligne.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-semibold">Forme juridique</label>
          <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={legalForm} onChange={(event) => setLegalForm(event.target.value)}>
            {legalFormOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">Nombre d’associés</label>
          <input
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            type="number"
            min={1}
            max={10}
            value={associateCount}
            onChange={(event) => setAssociateCount(Math.max(1, Number(event.target.value || 1)))}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">Date de naissance (offre jeune)</label>
          <input
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
          />
          <BirthDateMinorEncouragement birthDate={birthDate} />
        </div>
      </div>

      {youngEligible ? (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
          Offre Jeune appliquée : {fmtEuro(breakdown.baseService)} au lieu de {fmtEuro(breakdown.standardBase)} pour le service Greffio.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant={options.assistancePremium ? 'default' : 'outline'} className="bg-white" onClick={() => toggle('assistancePremium')}>
          Assistance Premium
        </Button>
        <Button type="button" variant={options.depositCapital ? 'default' : 'outline'} className="bg-white" onClick={() => toggle('depositCapital')}>
          Dépôt de capital
        </Button>
        <Button type="button" variant={options.accountingSetup ? 'default' : 'outline'} className="bg-white" onClick={() => toggle('accountingSetup')}>
          Setup comptable
        </Button>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted text-left">
              <th className="px-3 py-2 font-semibold">Ligne</th>
              <th className="px-3 py-2 font-semibold">Montant</th>
              <th className="px-3 py-2 font-semibold">Destinataire</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border"><td className="px-3 py-2">Service Greffio (base)</td><td className="px-3 py-2">{fmtEuro(breakdown.baseService)}</td><td className="px-3 py-2">Greffio</td></tr>
            <tr className="border-t border-border"><td className="px-3 py-2">Options service</td><td className="px-3 py-2">{fmtEuro(breakdown.premium + breakdown.accounting + breakdown.associatesExtra)}</td><td className="px-3 py-2">Greffio</td></tr>
            <tr className="border-t border-border"><td className="px-3 py-2">Frais légaux estimés</td><td className="px-3 py-2">{fmtEuro(breakdown.legalFees)}</td><td className="px-3 py-2">Greffe / INPI / JAL</td></tr>
            <tr className="border-t border-border"><td className="px-3 py-2">Dépôt de capital</td><td className="px-3 py-2">{fmtEuro(breakdown.deposit)}</td><td className="px-3 py-2">Banque / partenaire</td></tr>
            <tr className="border-t border-border"><td className="px-3 py-2 font-bold">Total HT</td><td className="px-3 py-2 font-bold">{fmtEuro(breakdown.totalHt)}</td><td className="px-3 py-2">-</td></tr>
            <tr className="border-t border-border"><td className="px-3 py-2">TVA (sur service Greffio)</td><td className="px-3 py-2">{fmtEuro(breakdown.vat)}</td><td className="px-3 py-2">État</td></tr>
            <tr className="border-t border-border bg-secondary/40"><td className="px-3 py-2 text-base font-extrabold">Total TTC</td><td className="px-3 py-2 text-base font-extrabold">{fmtEuro(breakdown.totalTtc)}</td><td className="px-3 py-2">-</td></tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
        <CircleHelp className="mt-0.5 h-4 w-4 text-primary" />
        <p>
          Estimation indicative. Le total final dépend des pièces, du département, des organismes et des
          options réellement validées.
        </p>
      </div>
      </div>
    </section>
  );
};

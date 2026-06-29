import React from 'react';
import { DEMARCHE_CATALOG } from '@/lib/questionnaireFlow.js';
import { formatInitiatorType } from '@/utils/initiatorLabels.js';

import { parseLiberationPercentValue } from '@/components/questionnaire/CapitalLiberationPicker.jsx';

const parseCapitalAmount = (capital) => {
  const normalized = String(capital || '').replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const formatEuroRecap = (amount) => new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
}).format(amount);

const formatValue = (value) => {
  if (value == null || value === '') return '–';
  if (Array.isArray(value)) return value.length ? `${value.length} élément(s)` : '–';
  return String(value);
};

const formatSectionValue = (section, key, value, formData = {}) => {
  if (section.format) return section.format(key, value, formData);
  if (key === 'initiatorType') return formatInitiatorType(value);
  return formatValue(value);
};

const SECTIONS = [
  {
    title: 'Déclarant',
    keys: ['initiatorType', 'firstName', 'lastName', 'email', 'phone', 'nationality'],
    labels: {
      initiatorType: 'Type',
      firstName: 'Prénom',
      lastName: 'Nom',
      email: 'Email',
      phone: 'Téléphone',
      nationality: 'Nationalité',
    },
  },
  {
    title: 'Formalité',
    keys: ['typeFormalite', 'formeJuridique'],
    labels: {
      typeFormalite: 'Démarche',
      formeJuridique: 'Forme juridique',
    },
    format: (key, value) => {
      if (key === 'typeFormalite') {
        return DEMARCHE_CATALOG.find((item) => item.key === value)?.label || formatValue(value);
      }
      if (key === 'initiatorType') {
        return formatInitiatorType(value);
      }
      return formatValue(value);
    },
  },
  {
    title: 'Entreprise',
    keys: ['denomination', 'adresseSiege', 'codePostal', 'villeSiege', 'activite', 'capital', 'liberationCapital', 'apportsNature', 'detailApportsNature'],
    labels: {
      denomination: 'Dénomination',
      adresseSiege: 'Siège',
      codePostal: 'Code postal',
      villeSiege: 'Ville',
      activite: 'Activité',
      capital: 'Capital',
      liberationCapital: 'Libération du capital',
      apportsNature: 'Apports en nature',
      detailApportsNature: 'Détail apports en nature',
    },
    format: (key, value, formData = {}) => {
      if (key === 'liberationCapital') {
        const parsed = parseLiberationPercentValue(value) ?? Number(String(value || '').replace('%', '').replace(',', '.').trim());
        const capitalNum = parseCapitalAmount(formData.capital);
        if (parsed === 100) {
          return capitalNum
            ? `Libération intégrale (100 %) — ${formatEuroRecap(capitalNum)} libérés`
            : 'Libération intégrale (100 %)';
        }
        if (Number.isFinite(parsed) && parsed > 0) {
          const released = capitalNum ? Math.round((capitalNum * parsed) / 100) : null;
          return released
            ? `Libération partielle (${parsed} %) — ${formatEuroRecap(released)} libérés sur ${formatEuroRecap(capitalNum)}`
            : `Libération partielle (${parsed} %)`;
        }
      }
      return formatValue(value);
    },
  },
];

export const QuestionnaireRecapPanel = ({ formData = {}, onEditStep }) => (
  <div className="space-y-4">
    {SECTIONS.map((section) => {
      const rows = section.keys
        .map((key) => ({
          key,
          label: section.labels[key] || key,
          value: formatSectionValue(section, key, formData[key], formData),
        }))
        .filter((row) => row.value !== '–');
      if (!rows.length) return null;
      return (
        <section key={section.title} className="rounded-2xl border border-[#d4e2f5] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-extrabold text-foreground">{section.title}</h3>
            {onEditStep ? (
              <button
                type="button"
                className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                onClick={() => onEditStep(section.title)}
              >
                Modifier
              </button>
            ) : null}
          </div>
          <dl className="space-y-2">
            {rows.map((row) => (
              <div key={row.key} className="grid gap-1 sm:grid-cols-[140px_1fr]">
                <dt className="text-xs font-semibold uppercase text-muted-foreground">{row.label}</dt>
                <dd className="text-sm font-medium text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      );
    })}
    <p className="text-sm leading-6 text-muted-foreground">
      Vérifiez l’exactitude de ces informations avant de générer vos documents. Une erreur peut retarder le dépôt au greffe.
    </p>
  </div>
);

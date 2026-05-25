import { SECURITY_LABELS, usesActions } from './formatting.js';
import { formatFrInteger, parseFrenchAmount } from '../../../statuts/shared/numberFormat.js';

export const buildCapitalAnnexe = (data) => {
  const isAction = usesActions(data.legalForm);
  const securities = SECURITY_LABELS[data.legalForm];
  const unitLabel = isAction ? 'Nombre d’actions' : 'Nombre de parts sociales';
  const capitalAmount = parseFrenchAmount(data.capital) || parseFrenchAmount(data.capitalRaw);
  const totalShares = parseFrenchAmount(data.nombreTitres) || capitalAmount;
  const nominal = parseFrenchAmount(data.valeurNominale) || 1;

  return {
    title: 'Annexe 1 — Répartition du capital',
    paragraphs: [
      `Société : ${data.denomination} (${data.legalForm})`,
      `Capital social : ${formatFrInteger(capitalAmount)} euros`,
      `${unitLabel} : ${formatFrInteger(totalShares)}`,
      `Valeur nominale : ${data.valeurNominale} euro(s)`,
    ],
    table: {
      headers: ['Associé', unitLabel, 'Valeur nominale', 'Montant souscrit', 'Pourcentage'],
      rows: (data.associates || []).map((associate) => {
        const sharePct = parseFrenchAmount(String(associate.share || '').replace('%', '').trim());
        const shares = parseFrenchAmount(associate.titlesCount)
          || (sharePct > 0 ? Math.max(1, Math.round((totalShares * sharePct) / 100)) : 0);
        const subscribed = shares * nominal;
        return [
          associate.label,
          formatFrInteger(shares),
          `${data.valeurNominale} €`,
          `${formatFrInteger(subscribed)} €`,
          associate.share || data.repartition,
        ];
      }),
    },
  };
};

export const buildActsAnnexe = (data) => ({
  title: 'Annexe 2 — État des actes accomplis pour le compte de la société en formation',
  paragraphs: [
    'Conformément aux dispositions applicables, les actes accomplis pour le compte de la Société en formation seront repris automatiquement par la Société du fait de son immatriculation au Registre du Commerce et des Sociétés, sous réserve qu’ils aient été conclus dans l’intérêt de la Société.',
    'Les actes suivants pourront notamment être repris :',
    '• ouverture et utilisation du compte bancaire provisoire ;',
    '• signature du bail ou contrat de domiciliation relatif au siège social ;',
    '• souscription aux contrats préalables nécessaires à l’exploitation ;',
    '• tous actes strictement utiles à la constitution de la Société.',
  ],
  table: {
    headers: ['Date', 'Nature de l’acte', 'Partie concernée', 'Montant éventuel'],
    rows: (data.actsInFormation?.length ? data.actsInFormation : [
      { date: data.dateDocument, nature: 'Actes préparatoires à compléter', party: data.denomination, amount: '—' },
    ]).map((row) => [row.date, row.nature, row.party, row.amount]),
  },
});

export const buildPowersAnnexe = (data) => ({
  title: 'Annexe 3 — Pouvoirs pour formalités',
  paragraphs: [
    `Pouvoirs sont expressément conférés à ${data.mandataire}, ou à toute personne qu’il désignera, aux fins notamment de :`,
    '• procéder à la signature électronique des pièces lorsque la loi l’autorise ;',
    '• effectuer le dépôt au greffe compétent et les formalités au guichet unique ;',
    '• publier l’annonce légale et accomplir toute publicité requise ;',
    '• demander l’immatriculation et répondre aux demandes de compléments du greffe ;',
    '• corriger, compléter ou régulariser le dossier dans l’intérêt de la Société.',
  ],
});

export const buildStandardAnnexes = (data) => [
  buildCapitalAnnexe(data),
  buildActsAnnexe(data),
  buildPowersAnnexe(data),
];

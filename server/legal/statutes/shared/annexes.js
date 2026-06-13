import { SECURITY_LABELS, usesActions } from './formatting.js';
import { formatFrInteger, parseFrenchAmount } from '../../../statuts/shared/numberFormat.js';
import { deriveStatutsCapitalModel } from '../../../statuts/shared/deriveStatutsCapital.js';

export const buildCapitalAnnexe = (data) => {
  const isAction = usesActions(data.legalForm);
  const unitLabel = isAction ? 'Nombre d’actions' : 'Nombre de parts sociales';
  const capitalAmount = parseFrenchAmount(data.capital) || parseFrenchAmount(data.capitalRaw);
  const shareCount = parseFrenchAmount(data.nombreTitres) || capitalAmount;
  const liberationPercent = parseFrenchAmount(String(data.liberationCapital || '50 %').replace('%', '')) || 50;
  const model = deriveStatutsCapitalModel({
    capitalAmount,
    shareCount,
    nominalValue: parseFrenchAmount(data.valeurNominale) || null,
    liberationPercent,
    associates: data.associates || [],
  });

  return {
    title: 'Annexe 1 – Répartition du capital',
    paragraphs: [
      `Société : ${data.denomination} (${data.legalForm})`,
      `Capital social : ${formatFrInteger(model.capitalTotal)} euros`,
      `${unitLabel} : ${formatFrInteger(model.shareCount)}`,
      `Valeur nominale : ${model.nominalValueFormatted} euro(s)`,
    ],
    table: {
      headers: ['Associé', unitLabel, 'Valeur nominale', 'Montant souscrit', 'Pourcentage'],
      rows: model.associatesComputed.map((associate) => [
        associate.label || associate.fullName || associate.companyName,
        formatFrInteger(associate.shares),
        `${model.nominalValueFormatted} €`,
        `${formatFrInteger(associate.subscribedAmount)} €`,
        associate.sharePercentage != null ? `${associate.sharePercentage} %` : associate.share,
      ]),
    },
  };
};

const FORMATION_ACTS_BULLETS = [
  '• ouverture et utilisation du compte bancaire provisoire ;',
  '• signature du bail ou contrat de domiciliation relatif au siège social ;',
  '• souscription aux contrats préalables nécessaires à l’exploitation ;',
  '• tous actes strictement utiles à la constitution de la Société.',
];

export const buildActsAnnexe = (data) => {
  const hasCustomActs = Array.isArray(data.actsInFormation)
    && data.actsInFormation.length
    && data.actsInFormation.some((row) => row?.nature && !/à compléter/i.test(String(row.nature)));

  return {
    title: 'Annexe 2 – État des actes accomplis pour le compte de la société en formation',
    paragraphs: [
      'Conformément aux dispositions applicables, les actes accomplis pour le compte de la Société en formation seront repris automatiquement par la Société du fait de son immatriculation au Registre du Commerce et des Sociétés, sous réserve qu’ils aient été conclus dans l’intérêt de la Société.',
      'Les actes suivants pourront notamment être repris :',
      ...FORMATION_ACTS_BULLETS,
    ],
    table: hasCustomActs ? {
      headers: ['Date', 'Nature de l’acte', 'Partie concernée', 'Montant éventuel'],
      rows: data.actsInFormation.map((row) => [row.date, row.nature, row.party, row.amount]),
    } : null,
  };
};

export const buildPowersAnnexe = (data) => ({
  title: 'Annexe 3 – Pouvoirs pour formalités',
  paragraphs: [
    `Les pouvoirs sont expressément conférés à ${data.mandataire || 'WILLIAM ESTABLISHMENTS / Greffio'}, ou à toute personne qu'il désignera, aux fins notamment de :`,
    '• procéder à la signature électronique des pièces lorsque la loi l\'autorise ;',
    '• effectuer le dépôt au greffe compétent et les formalités au guichet unique ;',
    '• publier l\'annonce légale et accomplir toute publicité requise ;',
    '• demander l\'immatriculation et répondre aux demandes de compléments du greffe ;',
    '• corriger, compléter ou régulariser le dossier dans l\'intérêt de la Société.',
  ],
});

export const buildStandardAnnexes = (data) => [
  buildCapitalAnnexe(data),
  buildActsAnnexe(data),
  buildPowersAnnexe(data),
];

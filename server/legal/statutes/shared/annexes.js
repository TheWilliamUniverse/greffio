import { usesActions } from './formatting.js';
import { formatFrInteger, parseFrenchAmount } from '../../../statuts/shared/numberFormat.js';
import { deriveStatutsCapitalModel } from '../../../statuts/shared/deriveStatutsCapital.js';
import { resolveGlobalLiberationPercent } from '../../../statuts/shared/parseLiberationPercent.js';
import {
  formatStatutesPersonDisplayName,
  isLegalEntityParty,
  sortAssociatesStatutesCanon,
} from '../../../shared/partyIdentityFormatter.js';

const resolveAssociateAnnexeLabel = (associate = {}) => (
  isLegalEntityParty(associate)
    ? (associate.companyName || associate.label || 'Société associée')
    : formatStatutesPersonDisplayName(associate)
);

export const buildCapitalAnnexe = (data) => {
  const isAction = usesActions(data.legalForm);
  const unitLabel = isAction ? 'Nombre d’actions' : 'Nombre de parts sociales';
  const capitalAmount = parseFrenchAmount(data.capital) || parseFrenchAmount(data.capitalRaw);
  const shareCount = parseFrenchAmount(data.nombreTitres) || capitalAmount;
  const liberationPercent = resolveGlobalLiberationPercent({
    liberationCapital: data.liberationCapital,
    liberationRate: data.liberationRate,
    liberationCapitalAutre: data.liberationCapitalAutre,
    liberationCapitalCustom: data.liberationCapitalCustom,
    liberationCapitalDetail: data.liberationCapitalDetail,
  });
  const model = deriveStatutsCapitalModel({
    capitalAmount,
    shareCount,
    nominalValue: parseFrenchAmount(data.valeurNominale) || null,
    liberationPercent,
    associates: sortAssociatesStatutesCanon(data.associates || []),
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
        resolveAssociateAnnexeLabel(associate),
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

/** Aligné sur formalityPowersPdf – annonce légale exclue (mandat distinct requis). */
export const FORMALITY_POWERS_BULLETS = [
  '• procéder à la signature électronique des pièces lorsque la loi l\'autorise ;',
  '• effectuer le dépôt au greffe compétent et les formalités au guichet unique ;',
  '• demander l\'immatriculation et répondre aux demandes de compléments du greffe ;',
  '• corriger, compléter ou régulariser le dossier dans l\'intérêt de la Société.',
];

export const buildPowersAnnexe = (data) => {
  const mandataire = data.mandataire || 'WILLIAM ESTABLISHMENTS';
  return {
    title: 'Annexe 3 – Pouvoirs pour formalités',
    paragraphs: [
      `Les pouvoirs sont expressément conférés à ${mandataire}, ou à toute personne qu'elle désignera, aux fins notamment de :`,
      ...FORMALITY_POWERS_BULLETS,
    ],
  };
};

export const buildStandardAnnexes = (data) => [
  buildCapitalAnnexe(data),
  buildActsAnnexe(data),
  buildPowersAnnexe(data),
];

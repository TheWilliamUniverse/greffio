/**
 * Objet social rédigé – modèle William Establishments SAS (référence 2026).
 * Chaque catégorie du questionnaire mappe vers des puces complètes, pas un libellé court.
 */

import { mergeWrapFragments } from '../../../statuts/shared/normalizeStatutesParagraphs.js';

const WILLIAM_COMMERCE_HOLDING_BULLETS = [
  'Le commerce de détail, de gros et semi-gros de tous biens non réglementés notamment informatiques, électroniques, technologiques ou professionnels, par tous moyens, notamment par voie électronique (e-commerce), vente à distance, par correspondance, en magasin ou par tout autre canal de distribution',
  "L'importation et l'exportation de tous produits non réglementés",
  'La prise de participations dans toutes sociétés ou entreprises, la détention, la gestion et la cession de titres. Le cas échéant, l’animation effective du groupe de sociétés qu’elle contrôle, notamment par la participation active à la définition de leur politique et à leur contrôle, ainsi que la fourniture de prestations de services administratives, financières, juridiques, comptables, commerciales ou stratégiques au profit de ces sociétés. La Société peut ainsi exercer l\'activité de Holding passive, et le cas échéant animatrice',
  'La gestion centralisée de trésorerie du groupe, dans le respect de la réglementation en vigueur',
  'L’exploitation de plateformes numériques, marketplaces ou sites internet, la mise en relation de professionnels et/ou de particuliers, ainsi que la commercialisation de biens ou services pour le compte de tiers et la perception de commissions, frais ou rémunérations. La fourniture de services numériques, technologiques et informatiques liés à ces activités',
  'L’activité d’agent commercial, l’intermédiation commerciale, la représentation et la négociation de tous produits ou services non réglementés, pour le compte de tiers',
];

const CATALOG = {
  Commerce: WILLIAM_COMMERCE_HOLDING_BULLETS,
  'Prestations numériques': [
    'La conception, le développement, l’édition, l’exploitation et la commercialisation de logiciels, applications, sites internet, plateformes numériques et services en ligne',
    'La fourniture de prestations de services informatiques, techniques, digitales, de conseil, d’assistance, de maintenance et d’hébergement',
    'L’intermédiation, la mise en relation et la commercialisation de biens ou services pour le compte de tiers, ainsi que la perception de commissions ou rémunérations',
    ...WILLIAM_COMMERCE_HOLDING_BULLETS.slice(3, 5),
  ],
  Conseil: [
    'Le conseil, l’assistance, l’audit, la formation et l’accompagnement auprès de toute personne physique ou morale, en France et à l’étranger',
    'La fourniture de prestations de services administratives, financières, juridiques, comptables, commerciales, organisationnelles ou stratégiques',
    'La prise de participations dans toutes sociétés ou entreprises et, le cas échéant, l’animation d’un groupe',
  ],
  Immobilier: [
    'L’acquisition, la propriété, la gestion, l’administration, la location, la sous-location et la mise en valeur de tous biens immobiliers',
    'La réalisation de toutes opérations de marchand de biens, de promotion immobilière et d’intermédiation immobilière dans le respect de la réglementation applicable',
    'La prise de participations dans des sociétés à objet immobilier',
  ],
  Restauration: [
    'L’exploitation directe ou indirecte de tous fonds de commerce de restauration, traiteur, vente à emporter ou à consommer sur place',
    'La vente de produits alimentaires et de boissons dans le respect de la réglementation sanitaire et des autorisations requises',
    'Toutes opérations connexes favorisant le développement de l’activité',
  ],
  'Autre activité réglementée': [],
};

export const resolveWilliamObjetSocialBullets = (questionnaire = {}) => {
  if (Array.isArray(questionnaire.objetSocialBullets) && questionnaire.objetSocialBullets.length >= 3) {
    return mergeWrapFragments(questionnaire.objetSocialBullets.filter(Boolean));
  }

  const guided = pickGuidedCategory(questionnaire);
  if (guided && CATALOG[guided]?.length) {
    return [...CATALOG[guided]];
  }

  const freeText = pick(
    questionnaire.businessPurpose,
    questionnaire.objetSocialDetail,
    questionnaire.objetSocial,
    questionnaire.activite,
    questionnaire.activity,
  );
  if (freeText && freeText.length > 80) {
    return mergeWrapFragments(
      freeText.split(/\n+/).map((line) => line.replace(/^●\s*/, '').trim()).filter(Boolean),
    );
  }

  if (freeText) {
    return [freeText, ...WILLIAM_COMMERCE_HOLDING_BULLETS.slice(-1)];
  }

  return [...WILLIAM_COMMERCE_HOLDING_BULLETS];
};

const pickGuidedCategory = (questionnaire) => {
  const raw = pick(
    questionnaire.objetSocial,
    questionnaire.activity,
    questionnaire.activite,
  );
  if (!raw) return null;
  const normalized = String(raw).trim();
  return Object.keys(CATALOG).find((key) => key.toLowerCase() === normalized.toLowerCase()) || null;
};

const pick = (...values) => {
  for (const value of values) {
    const normalized = value === undefined || value === null ? '' : String(value).trim();
    if (normalized) return normalized;
  }
  return '';
};

export { WILLIAM_COMMERCE_HOLDING_BULLETS };

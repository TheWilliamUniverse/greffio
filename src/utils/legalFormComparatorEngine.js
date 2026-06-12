import { getFormAvailability, SERVICE_AVAILABILITY } from '../config/catalog.js';
import {
  LEGAL_FORM_CAUTIONS,
  LEGAL_FORM_COMPARATOR_FORMS,
  LEGAL_FORM_REASONS,
  FIT_LEVEL_LABELS,
} from '../config/legalFormComparator.js';

const INITIAL_SCORES = {
  micro: 0,
  ei: 0,
  sasu: 0,
  sas: 0,
  eurl: 0,
  sarl: 0,
  sci: 0,
  association_1901: 0,
  sa: 0,
  snc: 0,
};

const add = (scores, keys, delta) => {
  keys.forEach((key) => {
    scores[key] = (scores[key] || 0) + delta;
  });
};

export function getFitLevel(score) {
  if (score >= 28) return 'strong';
  if (score >= 16) return 'good';
  if (score >= 6) return 'possible';
  if (score >= 0) return 'weak';
  return 'avoid';
}

export function getFitLevelLabel(score) {
  return FIT_LEVEL_LABELS[getFitLevel(score)] || FIT_LEVEL_LABELS.weak;
}

export function getReasonsForForm(formKey, _answers) {
  return (LEGAL_FORM_REASONS[formKey] || []).slice(0, 5);
}

export function getCautionsForForm(formKey, _answers) {
  return (LEGAL_FORM_CAUTIONS[formKey] || []).slice(0, 5);
}

const AVAILABLE_NOW_LABELS = {
  sas: 'Générer mes statuts de SAS',
  sasu: 'Générer mes statuts de SASU',
  sarl: 'Générer mes statuts de SARL',
  eurl: 'Générer mes statuts d’EURL',
  sci: 'Générer mes statuts de SCI',
  micro: 'Démarrer ma micro-entreprise',
  ei: 'Préparer mon entreprise individuelle',
};

export function getComparatorCta(formKey) {
  const form = LEGAL_FORM_COMPARATOR_FORMS[formKey];
  const availabilityKey = form?.availabilityKey || formKey;
  const availability = getFormAvailability(availabilityKey);

  if (availability === SERVICE_AVAILABILITY.AVAILABLE_NOW) {
    return {
      label: AVAILABLE_NOW_LABELS[formKey] || `Démarrer avec ${form?.label || formKey}`,
      href: `/simulateur?type=statuts&formality=${availabilityKey}`,
      variant: 'primary',
      greffioAvailability: 'AVAILABLE_NOW',
    };
  }

  if (availability === SERVICE_AVAILABILITY.COMING_SOON) {
    return {
      label: 'Être prévenu de la disponibilité',
      href: `/contact?service=creation&form=${availabilityKey}&mode=coming-soon`,
      variant: 'outline',
      greffioAvailability: 'COMING_SOON',
    };
  }

  return {
    label: 'Demander un devis',
    href: `/contact?service=creation&form=${availabilityKey}&mode=devis`,
    variant: 'primary',
    greffioAvailability: 'MANUAL_QUOTE',
  };
}

function applyHardExclusions(scores, answers) {
  const solo = answers.founders_count === 'solo';
  const multi = answers.founders_count === 'two' || answers.founders_count === 'three_plus';

  if (solo) {
    scores.sas -= 100;
    scores.sarl -= 100;
    scores.sci -= 100;
    scores.association_1901 -= 100;
    scores.snc -= 100;
  }

  if (multi) {
    scores.micro -= 100;
    scores.ei -= 100;
    scores.sasu -= 100;
    scores.eurl -= 100;
  }

  if (answers.activity_type !== 'real_estate') {
    scores.sci -= 5;
  }

  if (answers.activity_type !== 'non_profit') {
    scores.association_1901 -= 5;
  }

  if (answers.activity_type !== 'saas_startup' && answers.fundraising !== 'yes_short_term') {
    scores.sa -= 8;
  }

  scores.snc = Math.min(scores.snc || 0, -5);
}

function applyTieBreak(scores, answers) {
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (ranked.length < 2) return scores;

  const [topKey, topScore] = ranked[0];
  const [secondKey, secondScore] = ranked[1];
  if (topScore - secondScore > 3) return scores;

  const next = { ...scores };

  if (answers.fundraising !== 'no' && (topKey === 'sarl' || secondKey === 'sarl')) {
    if (next.sasu >= next.sarl - 3) next.sasu += 2;
    if (next.sas >= next.sarl - 3) next.sas += 2;
  }

  if (answers.activity_type === 'real_estate') {
    next.sci += 6;
    next.sarl -= 3;
    next.sas -= 2;
  }

  if (answers.activity_type === 'non_profit') {
    next.association_1901 += 3;
  }

  if (answers.founders_count === 'solo' && answers.image_priority === 'premium') {
    if (next.sasu >= next.eurl - 4) next.sasu += 2;
  }

  if (
    answers.founders_count === 'solo'
    && answers.admin_tolerance === 'minimal'
    && answers.expenses_level === 'low'
  ) {
    if (next.micro >= next.ei - 3) next.micro += 2;
  }

  if (
    (answers.founders_count === 'two' || answers.founders_count === 'three_plus')
    && answers.activity_type === 'commerce'
    && answers.fundraising === 'no'
  ) {
    if (next.sarl >= next.sas - 4) next.sarl += 2;
  }

  return next;
}

export function computeLegalFormScores(answers) {
  const scores = { ...INITIAL_SCORES };
  const warnings = [];
  const specialCases = [];

  if (answers.founders_count === 'solo') {
    add(scores, ['micro', 'ei', 'sasu', 'eurl'], 8);
    add(scores, ['sas', 'sarl', 'sci', 'association_1901', 'sa', 'snc'], -8);
  }

  if (answers.founders_count === 'two' || answers.founders_count === 'three_plus') {
    add(scores, ['sas', 'sarl', 'sci', 'association_1901'], 8);
    add(scores, ['sa'], 3);
    add(scores, ['micro', 'ei', 'sasu', 'eurl'], -12);
  }

  if (answers.founders_count === 'not_sure') {
    add(scores, ['sasu', 'sas', 'eurl', 'sarl'], 3);
    warnings.push('Le nombre définitif d’associés devra être confirmé avant de choisir la forme juridique.');
  }

  switch (answers.activity_type) {
    case 'freelance_services':
      add(scores, ['micro', 'ei'], 7);
      add(scores, ['sasu', 'eurl'], 5);
      add(scores, ['sas', 'sarl'], 2);
      break;
    case 'commerce':
      add(scores, ['sarl', 'sas', 'eurl', 'sasu'], 6);
      add(scores, ['micro', 'ei'], 3);
      break;
    case 'craft':
      add(scores, ['ei', 'eurl', 'sarl', 'micro'], 6);
      add(scores, ['sasu', 'sas'], 3);
      break;
    case 'saas_startup':
      add(scores, ['sasu', 'sas'], 10);
      add(scores, ['micro', 'ei'], -4);
      add(scores, ['sarl', 'eurl'], 1);
      break;
    case 'liberal':
      add(scores, ['ei', 'micro', 'eurl', 'sasu'], 5);
      specialCases.push('Si l’activité libérale est réglementée, vérifier les formes autorisées par la profession.');
      break;
    case 'regulated_liberal':
      add(scores, ['ei', 'eurl', 'sasu'], 2);
      add(scores, ['micro'], 1);
      specialCases.push('Profession réglementée : vérifier SEL, SELAS, SELARL, SCP ou SCM selon la profession.');
      break;
    case 'real_estate':
      add(scores, ['sci'], 14);
      add(scores, ['sas', 'sarl'], 2);
      add(scores, ['micro', 'ei'], -8);
      break;
    case 'non_profit':
      add(scores, ['association_1901'], 14);
      add(scores, ['sas', 'sarl', 'sasu', 'eurl'], -4);
      break;
    case 'agricultural':
      add(scores, ['ei'], 3);
      specialCases.push('Activité agricole : vérifier GAEC, EARL ou SCEA selon le projet.');
      break;
    case 'holding_group':
      add(scores, ['sas', 'sasu'], 8);
      add(scores, ['sarl', 'eurl'], 3);
      specialCases.push('Projet de holding ou groupe : vérifier fiscalité, détention, conventions et montage avec un professionnel.');
      break;
    default:
      add(scores, ['sasu', 'sas', 'eurl', 'sarl', 'ei'], 2);
  }

  switch (answers.revenue_12m) {
    case 'under_15000':
    case 'under_50000':
      add(scores, ['micro'], 8);
      add(scores, ['ei'], 5);
      add(scores, ['sasu', 'eurl'], 2);
      break;
    case 'under_83600':
      add(scores, ['micro'], 6);
      add(scores, ['ei'], 4);
      add(scores, ['sasu', 'eurl'], 3);
      break;
    case 'under_203100':
      add(scores, ['micro'], 2);
      add(scores, ['sasu', 'sas', 'eurl', 'sarl'], 5);
      break;
    case 'above_203100':
      add(scores, ['micro'], -10);
      add(scores, ['sasu', 'sas', 'eurl', 'sarl'], 7);
      warnings.push('Un chiffre d’affaires élevé rend souvent le régime micro moins adapté ou impossible selon l’activité et les seuils applicables.');
      break;
    case 'unknown':
      add(scores, ['micro', 'ei', 'sasu', 'eurl'], 2);
      warnings.push('Le chiffre d’affaires prévisionnel devra être précisé pour confirmer le choix.');
      break;
    default:
      break;
  }

  if (answers.expenses_level === 'low') {
    add(scores, ['micro'], 8);
    add(scores, ['ei'], 4);
  }

  if (answers.expenses_level === 'medium') {
    add(scores, ['ei', 'sasu', 'sas', 'eurl', 'sarl'], 3);
  }

  if (answers.expenses_level === 'high') {
    add(scores, ['micro'], -8);
    add(scores, ['sasu', 'sas', 'eurl', 'sarl'], 6);
    add(scores, ['ei'], 3);
    warnings.push('Des charges importantes peuvent rendre le régime micro moins pertinent, car il ne fonctionne pas comme une déduction au réel classique.');
  }

  if (answers.fundraising === 'yes_short_term') {
    add(scores, ['sas'], 12);
    add(scores, ['sasu'], 10);
    add(scores, ['sa'], 4);
    add(scores, ['micro', 'ei'], -12);
    add(scores, ['eurl', 'sarl'], -4);
  }

  if (answers.fundraising === 'maybe_later') {
    add(scores, ['sasu', 'sas'], 8);
    add(scores, ['eurl', 'sarl'], 1);
    add(scores, ['micro', 'ei'], -4);
  }

  if (answers.fundraising === 'no') {
    add(scores, ['micro', 'ei', 'eurl', 'sarl'], 3);
  }

  if (answers.risk_level === 'low') {
    add(scores, ['micro', 'ei'], 4);
  }

  if (answers.risk_level === 'medium') {
    add(scores, ['sasu', 'sas', 'eurl', 'sarl'], 4);
  }

  if (answers.risk_level === 'high') {
    add(scores, ['sasu', 'sas', 'eurl', 'sarl'], 7);
    add(scores, ['snc'], -12);
    add(scores, ['micro'], -3);
    warnings.push('En cas de risque élevé, vérifier les assurances, garanties personnelles, contrats et responsabilités du dirigeant.');
  }

  if (answers.image_priority === 'basic') {
    add(scores, ['micro', 'ei'], 5);
  }

  if (answers.image_priority === 'professional') {
    add(scores, ['sasu', 'sas', 'eurl', 'sarl'], 5);
  }

  if (answers.image_priority === 'premium') {
    add(scores, ['sasu', 'sas'], 8);
    add(scores, ['eurl', 'sarl'], 3);
    add(scores, ['micro'], -3);
  }

  if (answers.admin_tolerance === 'minimal') {
    add(scores, ['micro'], 9);
    add(scores, ['ei'], 6);
    add(scores, ['sasu', 'sas', 'eurl', 'sarl'], -3);
    add(scores, ['sa'], -10);
  }

  if (answers.admin_tolerance === 'moderate') {
    add(scores, ['ei', 'eurl', 'sarl', 'sasu'], 3);
  }

  if (answers.admin_tolerance === 'advanced') {
    add(scores, ['sasu', 'sas', 'sarl', 'eurl'], 5);
    add(scores, ['sa'], 2);
  }

  if (answers.social_preference === 'low_contributions') {
    add(scores, ['micro', 'ei', 'eurl', 'sarl'], 5);
    add(scores, ['sasu', 'sas'], -2);
  }

  if (answers.social_preference === 'better_protection') {
    add(scores, ['sasu', 'sas'], 6);
    warnings.push('Le statut assimilé salarié n’ouvre pas automatiquement droit à l’assurance chômage pour le mandataire social.');
  }

  if (answers.profit_distribution === 'yes') {
    add(scores, ['sasu', 'sas'], 6);
    add(scores, ['eurl', 'sarl'], 4);
    add(scores, ['micro', 'ei'], -8);
  }

  if (answers.profit_distribution === 'maybe') {
    add(scores, ['sasu', 'sas', 'eurl', 'sarl'], 3);
  }

  if (answers.profit_distribution === 'no') {
    add(scores, ['micro', 'ei'], 3);
  }

  applyHardExclusions(scores, answers);
  const adjustedScores = applyTieBreak(scores, answers);

  return { scores: adjustedScores, warnings, specialCases };
}

function buildRecommendation(formKey, score, answers) {
  const form = LEGAL_FORM_COMPARATOR_FORMS[formKey];
  const fitLevel = getFitLevel(score);
  const cta = getComparatorCta(formKey);

  return {
    formKey,
    score,
    fitLevel,
    fitLevelLabel: FIT_LEVEL_LABELS[fitLevel],
    title: form?.label || formKey,
    longLabel: form?.longLabel || form?.label || formKey,
    summary: form?.shortPitch || '',
    reasons: getReasonsForForm(formKey, answers),
    cautions: getCautionsForForm(formKey, answers),
    cta,
    greffioAvailability: cta.greffioAvailability,
  };
}

export function computeRecommendations(answers) {
  const { scores, warnings, specialCases } = computeLegalFormScores(answers);

  const ranked = Object.entries(scores)
    .map(([formKey, score]) => ({ formKey, score }))
    .sort((a, b) => b.score - a.score);

  const recommendations = ranked.map((item) => buildRecommendation(item.formKey, item.score, answers));

  const viable = recommendations.filter((r) => r.score > -50);
  const primary = viable[0] || recommendations[0];
  const alternatives = viable.slice(1, 3).filter((r) => r.formKey !== primary?.formKey);
  const avoid = [...recommendations]
    .filter((r) => r.score < 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  return {
    primary,
    alternatives,
    avoid,
    warnings,
    specialCases,
    allRanked: recommendations,
  };
}

export function isQuestionnaireComplete(answers, questionIds) {
  return questionIds.every((id) => Boolean(answers[id]));
}

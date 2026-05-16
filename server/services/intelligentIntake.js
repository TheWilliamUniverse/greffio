import { getFormalityRule } from '../domain/formalities.js';

const safeString = (value) => String(value || '').trim();
const upper = (value) => safeString(value).toUpperCase();

const extractDate = (text = '') => {
  const match = String(text).match(/\b(\d{2}[\/.-]\d{2}[\/.-]\d{4})\b/);
  return match?.[1] || null;
};

const extractSirenLike = (text = '') => {
  const siretMatch = String(text).replace(/\D/g, '').match(/\d{14}/);
  if (siretMatch?.[0]) {
    return { siret: siretMatch[0], siren: siretMatch[0].slice(0, 9) };
  }
  const sirenMatch = String(text).replace(/\D/g, '').match(/\d{9}/);
  if (sirenMatch?.[0]) {
    return { siren: sirenMatch[0], siret: null };
  }
  return { siren: null, siret: null };
};

const detectAddress = (text = '') => {
  const lines = String(text).split('\n').map((line) => line.trim()).filter(Boolean);
  const maybeAddress = lines.find((line) => /\d{1,4}.+(rue|avenue|boulevard|chemin|impasse|route)/i.test(line));
  return maybeAddress || null;
};

const detectIdentityName = (text = '') => {
  const normalized = String(text).split('\n').map((line) => line.trim()).filter(Boolean);
  const lastNameLine = normalized.find((line) => /nom/i.test(line));
  const firstNameLine = normalized.find((line) => /prenom|prénom/i.test(line));
  return {
    lastName: lastNameLine ? lastNameLine.split(':').slice(1).join(':').trim() : null,
    firstName: firstNameLine ? firstNameLine.split(':').slice(1).join(':').trim() : null,
  };
};

const buildCoherenceChecks = ({ data = {}, companyLookup = null, analyses = [] }) => {
  const issues = [];
  const warnings = [];
  const sirenData = safeString(data.companySiren || data.existingBusinessSiren);
  if (sirenData && companyLookup?.siren && sirenData.slice(0, 9) !== companyLookup.siren) {
    issues.push('SIREN saisi différent du SIREN trouvé automatiquement.');
  }
  if (safeString(data.companyName) && companyLookup?.denomination) {
    const expected = upper(companyLookup.denomination);
    const actual = upper(data.companyName);
    if (actual && !expected.includes(actual) && !actual.includes(expected)) {
      warnings.push('La dénomination saisie est différente de la dénomination administrative trouvée.');
    }
  }
  const lowConfidenceDocs = analyses.filter((item) => Number(item?.confidence || 0) < 55);
  if (lowConfidenceDocs.length) {
    warnings.push('Certains documents ont une confiance OCR faible et nécessitent une vérification manuelle.');
  }
  const identityAnalysis = analyses.find((item) => item?.analysisType === 'identity_check');
  if (identityAnalysis?.extractedIdentity?.lastName && safeString(data.lastName)) {
    if (upper(identityAnalysis.extractedIdentity.lastName) !== upper(data.lastName)) {
      warnings.push("Le nom extrait de la pièce d'identité diffère du nom saisi.");
    }
  }
  if (identityAnalysis?.requiresManualReview) {
    issues.push("La pièce d'identité nécessite une validation humaine.");
  }
  return {
    issues,
    warnings,
    score: Math.max(0, 100 - (issues.length * 35) - (warnings.length * 15)),
  };
};

export const buildIntelligentPrefill = ({
  dossier = null,
  questionnaire = {},
  companyLookup = null,
  analyses = [],
}) => {
  const formalityRule = getFormalityRule({ dossier, questionnaire });
  const extracted = {
    firstName: null,
    lastName: null,
    adressePersonnelle: null,
    dateDebutActivite: null,
    companySiren: null,
    companySiret: null,
  };

  for (const analysis of analyses) {
    const text = String(analysis?.extractedText || '');
    if (!text) continue;
    const identity = detectIdentityName(text);
    extracted.firstName = extracted.firstName || identity.firstName;
    extracted.lastName = extracted.lastName || identity.lastName;
    extracted.adressePersonnelle = extracted.adressePersonnelle || detectAddress(text);
    extracted.dateDebutActivite = extracted.dateDebutActivite || extractDate(text);
    const ids = extractSirenLike(text);
    extracted.companySiren = extracted.companySiren || ids.siren;
    extracted.companySiret = extracted.companySiret || ids.siret;
  }

  const prefill = {
    firstName: safeString(questionnaire.firstName) || extracted.firstName || null,
    lastName: safeString(questionnaire.lastName) || extracted.lastName || null,
    companySiren: safeString(questionnaire.companySiren) || companyLookup?.siren || extracted.companySiren || null,
    existingBusinessSiren: safeString(questionnaire.existingBusinessSiren) || companyLookup?.siren || extracted.companySiren || null,
    companyName: safeString(questionnaire.companyName) || companyLookup?.denomination || null,
    existingBusinessName: safeString(questionnaire.existingBusinessName) || companyLookup?.denomination || null,
    adressePersonnelle: safeString(questionnaire.adressePersonnelle) || extracted.adressePersonnelle || null,
    dateDebutActivite: safeString(questionnaire.dateDebutActivite) || extracted.dateDebutActivite || null,
  };

  if (!formalityRule.requiresStatutes) {
    prefill.capital = null;
    prefill.associesSummary = null;
    prefill.dirigeant = null;
    prefill.beneficiairesEffectifs = null;
  }

  const coherence = buildCoherenceChecks({
    data: questionnaire,
    companyLookup,
    analyses,
  });

  return {
    prefill,
    coherence,
    formalityRule,
  };
};

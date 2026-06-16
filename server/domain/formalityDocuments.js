import { getFormalityRule, resolveLegalForm, isEiLikeLabel } from './formalities.js';
import {
  getModificationFormalityRule,
  isModificationDossier,
  resolveModificationType,
} from './modificationDocuments.js';

const CREATION_REQUIRED_OVERRIDES = Object.freeze({
  signed_statutes: (rule) => Boolean(rule.requiresStatutes),
  capital_certificate: (rule) => Boolean(rule.requiresCapital),
  legal_notice_certificate: () => false,
  ubo_declaration: (rule, questionnaire = {}) => {
    if (rule.requiresAssociates === false && isEiLikeLabel(questionnaire.formeJuridique)) return false;
    return Boolean(questionnaire.requiresUbo || questionnaire.hasUbo || questionnaire.uboRequired);
  },
  subscribers_list: (rule) => Boolean(rule.requiresAssociates),
  formality_powers: (rule, questionnaire = {}) => {
    if (rule.requiresMandate) return true;
    return Boolean(questionnaire.requiresMandate);
  },
  proxy_mandate: (rule, questionnaire = {}) => Boolean(rule.requiresMandate || questionnaire.requiresMandate),
});

export const resolveTemplateRequired = (docKey, { formalityRule, questionnaire = {} } = {}) => {
  const resolver = CREATION_REQUIRED_OVERRIDES[docKey];
  if (resolver) return Boolean(resolver(formalityRule, questionnaire));
  return null;
};

export const resolveDossierDocumentPlan = ({ dossier, questionnaire = {} } = {}) => {
  const legalForm = resolveLegalForm({ dossier, questionnaire });

  if (isModificationDossier({ dossier, questionnaire })) {
    const modificationType = resolveModificationType({ dossier, questionnaire });
    return getModificationFormalityRule({
      legalForm,
      modificationType,
      context: {
        transferOutsideJurisdiction: Boolean(questionnaire.transferOutsideJurisdiction),
        regulatedActivity: Boolean(questionnaire.regulatedActivity || questionnaire.activityRegulated),
        officerNamedInArticles: Boolean(questionnaire.officerNamedInArticles),
        hasMandataire: Boolean(questionnaire.hasMandataire || questionnaire.mandataire),
      },
    });
  }

  const formalityRule = getFormalityRule({ dossier, questionnaire });
  const checklist = [];

  if (!isEiLikeLabel(legalForm)) {
    checklist.push(
      { id: 'identity_proof', label: "Pièce d'identité", required: true, docKey: 'identity_proof' },
      { id: 'address_proof', label: 'Justificatif de domicile', required: true, docKey: 'address_proof' },
      { id: 'registered_office_proof', label: 'Justificatif siège social', required: true, docKey: 'registered_office_proof' },
    );
    if (formalityRule.requiresStatutes) {
      checklist.push({ id: 'signed_statutes', label: 'Statuts signés', required: true, docKey: 'signed_statutes' });
    }
    if (formalityRule.requiresCapital) {
      checklist.push({ id: 'capital_certificate', label: 'Attestation dépôt capital', required: false, docKey: 'capital_certificate' });
    }
    if (formalityRule.requiresAssociates) {
      checklist.push({ id: 'subscribers_list', label: 'Liste des souscripteurs', required: true, docKey: 'subscribers_list' });
    }
    checklist.push({ id: 'formality_powers', label: 'Procuration et pouvoirs pour formalités', required: true, docKey: 'formality_powers' });
    checklist.push({ id: 'manager_non_conviction', label: 'Déclaration non-condamnation', required: false, docKey: 'manager_non_conviction' });
    checklist.push({ id: 'legal_notice_certificate', label: 'Attestation annonce légale', required: false, docKey: 'legal_notice_certificate' });
    checklist.push({ id: 'ubo_declaration', label: 'Déclaration bénéficiaires effectifs', required: false, docKey: 'ubo_declaration' });
  } else {
    checklist.push(
      { id: 'identity_proof', label: "Pièce d'identité", required: true, docKey: 'identity_proof' },
      { id: 'address_proof', label: 'Justificatif de domicile', required: true, docKey: 'address_proof' },
      { id: 'proxy_mandate', label: 'Procuration signée', required: Boolean(formalityRule.requiresMandate), docKey: 'proxy_mandate' },
    );
  }

  const requiredDocKeys = checklist.filter((item) => item.required && item.docKey).map((item) => item.docKey);

  return {
    formalityType: 'creation',
    legalForm,
    modificationType: null,
    label: 'Création d’entreprise',
    checklist,
    requiredDocKeys,
    warnings: [],
    formalityRule,
  };
};

export const resolveDocumentRequiredFlag = (docKey, { dossier, questionnaire = {}, documentPlan = null } = {}) => {
  const plan = documentPlan || resolveDossierDocumentPlan({ dossier, questionnaire });
  if (plan.requiredDocKeys?.includes(docKey)) return true;
  const checklistItem = plan.checklist?.find((item) => item.docKey === docKey);
  if (checklistItem?.required === true) return true;
  if (plan.formalityType === 'creation' && plan.formalityRule) {
    const override = resolveTemplateRequired(docKey, { formalityRule: plan.formalityRule, questionnaire });
    if (override !== null) return override;
  }
  return false;
};

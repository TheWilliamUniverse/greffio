import { apiGet, apiPatch, apiPost } from '@/api/client.js';

export const getQuestionnaireState = async (dossierId) => apiGet(`/api/dossiers/${dossierId}/questionnaire`);

export const patchQuestionnaireState = async ({
  dossierId,
  dataPatch,
  progressPercent,
}) => apiPatch(`/api/dossiers/${dossierId}/questionnaire`, {
  dataPatch,
  progressPercent,
});

export const completeQuestionnaireStep = async ({
  dossierId,
  stepId,
  dataPatch,
  progressPercent,
  continueWithWarnings = false,
  missingFieldKeys = [],
}) => apiPost(`/api/dossiers/${dossierId}/complete-step`, {
  stepId,
  dataPatch,
  progressPercent,
  continueWithWarnings,
  missingFieldKeys,
});

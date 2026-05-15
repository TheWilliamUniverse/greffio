import { runtimeConfig } from '@/config/runtime.js';
import { getToken } from '@/utils/localStorage.js';

const parseResponse = async (response) => {
  if (response.ok) return response.json();
  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }
  const error = new Error(payload?.error || 'API_ERROR');
  error.status = response.status;
  error.payload = payload;
  throw error;
};

const authHeaders = () => {
  const token = getToken();
  if (!token) {
    const error = new Error('AUTH_TOKEN_MISSING');
    error.status = 401;
    throw error;
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

export const getQuestionnaireState = async (dossierId) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/dossiers/${dossierId}/questionnaire`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseResponse(response);
};

export const patchQuestionnaireState = async ({
  dossierId,
  dataPatch,
  progressPercent,
}) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/dossiers/${dossierId}/questionnaire`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({
      dataPatch,
      progressPercent,
    }),
  });
  return parseResponse(response);
};

export const completeQuestionnaireStep = async ({
  dossierId,
  stepId,
  dataPatch,
  progressPercent,
}) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/dossiers/${dossierId}/complete-step`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      stepId,
      dataPatch,
      progressPercent,
    }),
  });
  return parseResponse(response);
};

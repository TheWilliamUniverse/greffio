import { apiPost } from '@/api/client.js';

const extractAssistantPayload = (payload = {}) => ({
  answer: payload.answer || null,
  suggestedActions: Array.isArray(payload.suggestedActions) ? payload.suggestedActions : [],
  degraded: Boolean(payload.degraded),
  provider: payload.provider || null,
});

export const askAssistant = async ({
  message,
  history = [],
  dossierId = null,
  route = null,
}) => {
  try {
    const payload = await apiPost('/api/assistant', {
      message,
      history,
      dossierId,
      route,
    });
    return extractAssistantPayload(payload);
  } catch (error) {
    const payload = error?.payload;
    if (payload?.answer) {
      return extractAssistantPayload(payload);
    }
    throw error;
  }
};

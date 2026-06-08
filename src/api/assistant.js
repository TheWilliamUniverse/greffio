import { apiPost } from '@/api/client.js';

export const askAssistant = async ({
  message,
  history = [],
  dossierId = null,
}) => apiPost('/api/assistant', {
  message,
  history,
  dossierId,
});

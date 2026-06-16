import { apiPost } from '@/api/client.js';

export const askAssistant = async ({
  message,
  history = [],
  dossierId = null,
  route = null,
}) => apiPost('/api/assistant', {
  message,
  history,
  dossierId,
  route,
});

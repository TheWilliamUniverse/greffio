import { apiGet } from '@/api/client.js';

export const fetchNotificationsSummary = async () => apiGet('/api/notifications/summary');

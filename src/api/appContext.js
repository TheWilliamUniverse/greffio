import { apiGet } from '@/api/client.js';

export const fetchAppContext = () => apiGet('/api/app-context');

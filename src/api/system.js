import { apiGet } from '@/api/client.js';

export const getInterfacesStatus = async () => apiGet('/api/interfaces/status');

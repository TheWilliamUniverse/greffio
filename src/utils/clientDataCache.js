import { COOKIE_CONSENT_KEY } from '@/config/cookieCatalog.js';
import { queryClient } from '@/lib/queryClient.js';

export const CLIENT_DATA_SCHEMA = 'greffio_client_data_v2';
const SCHEMA_KEY = 'greffio_client_data_schema';
const OWNER_KEY = 'greffio_client_data_owner';

const EPHEMERAL_KEYS = [
  'dossiers',
  'documents',
  'chatHistory',
  'notifications',
  'greffio_workflow_events',
  'greffio_project_draft',
  'greffio_current_dossier_id',
];

const removeKeysByPrefix = (prefix) => {
  if (typeof window === 'undefined') return;
  const keys = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key && key.startsWith(prefix)) keys.push(key);
  }
  keys.forEach((key) => window.localStorage.removeItem(key));
};

export const purgeEphemeralClientData = ({ keepConsent = true } = {}) => {
  if (typeof window === 'undefined') return;
  EPHEMERAL_KEYS.forEach((key) => window.localStorage.removeItem(key));
  removeKeysByPrefix('greffio_current_dossier_');
  window.localStorage.removeItem(OWNER_KEY);
  if (!keepConsent) {
    window.localStorage.removeItem(COOKIE_CONSENT_KEY);
  }
};

export const stampClientDataOwner = (userId) => {
  if (typeof window === 'undefined' || !userId) return;
  window.localStorage.setItem(OWNER_KEY, String(userId));
};

export const getClientDataOwner = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(OWNER_KEY);
};

export const initializeClientDataCache = (userId = null) => {
  if (typeof window === 'undefined') return;

  const schema = window.localStorage.getItem(SCHEMA_KEY);
  if (schema !== CLIENT_DATA_SCHEMA) {
    purgeEphemeralClientData({ keepConsent: true });
    window.localStorage.setItem(SCHEMA_KEY, CLIENT_DATA_SCHEMA);
  }

  const owner = getClientDataOwner();
  if (userId) {
    if (owner && owner !== String(userId)) {
      purgeEphemeralClientData({ keepConsent: true });
      queryClient.removeQueries({ queryKey: ['dossiers'] });
      queryClient.removeQueries({ queryKey: ['dossier'] });
    }
    stampClientDataOwner(userId);
    return;
  }

  if (owner) {
    purgeEphemeralClientData({ keepConsent: true });
  }
};

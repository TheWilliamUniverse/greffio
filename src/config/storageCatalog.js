/**
 * Inventaire des clés localStorage Greffio (audit v2).
 * Source de vérité métier : API uniquement. Local = session, brouillon, consentement.
 */
export const STORAGE_CATALOG = [
  { key: 'greffio_user', owner: 'auth', ttl: 'session', purgeOnLogout: true, uiSourceOfTruth: false },
  { key: 'greffio_token', owner: 'auth', ttl: 'session', purgeOnLogout: true, uiSourceOfTruth: false },
  { key: 'greffio_refresh_token', owner: 'auth', ttl: 'rotating', purgeOnLogout: true, uiSourceOfTruth: false },
  { key: 'greffio_cookie_consent_v1', owner: 'consent', ttl: '13 months', purgeOnLogout: false, uiSourceOfTruth: false },
  { key: 'greffio_client_data_schema', owner: 'system', ttl: 'versioned', purgeOnLogout: false, uiSourceOfTruth: false },
  { key: 'greffio_client_data_owner', owner: 'system', ttl: 'session', purgeOnLogout: true, uiSourceOfTruth: false },
  { key: 'greffio_project_draft', owner: 'draft', ttl: 'until submit', purgeOnLogout: true, uiSourceOfTruth: false },
  { key: 'greffio_current_dossier_*', owner: 'navigation', ttl: 'per user', purgeOnLogout: true, uiSourceOfTruth: false },
  { key: 'dossiers', owner: 'legacy-removed', ttl: 'deprecated', purgeOnLogout: true, uiSourceOfTruth: false },
  { key: 'documents', owner: 'legacy-removed', ttl: 'deprecated', purgeOnLogout: true, uiSourceOfTruth: false },
  { key: 'chatHistory', owner: 'legacy-removed', ttl: 'deprecated', purgeOnLogout: true, uiSourceOfTruth: false },
  { key: 'notifications', owner: 'legacy-removed', ttl: 'deprecated', purgeOnLogout: true, uiSourceOfTruth: false },
];

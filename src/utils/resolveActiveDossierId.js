import { getCurrentDossierId, saveCurrentDossierId } from '@/utils/sessionStore.js';

/**
 * Resolve the active dossier id from route params, query, pathname or session storage.
 * The assistant orb renders outside nested routes, so pathname parsing is required.
 */
export const resolveActiveDossierId = ({
  params = {},
  pathname = '',
  search = '',
  persist = false,
} = {}) => {
  let dossierId = null;

  if (params?.dossierId) {
    dossierId = String(params.dossierId);
  } else {
    const fromQuery = new URLSearchParams(search).get('dossierId');
    if (fromQuery) {
      dossierId = fromQuery;
    } else {
      const pathMatch = String(pathname || '').match(/\/dossier\/([^/]+)/i);
      if (pathMatch?.[1]) {
        dossierId = pathMatch[1];
      }
    }
  }

  if (!dossierId) {
    dossierId = getCurrentDossierId();
  }

  if (persist && dossierId) {
    saveCurrentDossierId(dossierId);
  }

  return dossierId || null;
};

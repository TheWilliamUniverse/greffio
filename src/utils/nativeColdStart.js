import { getUser } from '@/utils/localStorage.js';
import { resolvePostLoginPath } from '@/lib/auth/postLoginRedirect.js';
import { apiGet } from '@/api/client.js';
import { resolveDossierContinueUrl } from '@/utils/dossierContinueUrl.js';

const TERMINAL_STATUSES = new Set(['completed', 'cancelled', 'archived', 'closed']);

const pickPrimaryDossier = (dossiers = []) => {
  if (!dossiers.length) return null;
  const sorted = [...dossiers].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
  return sorted.find((entry) => !TERMINAL_STATUSES.has(String(entry?.status || '').toLowerCase())) || sorted[0];
};

/** Après connexion ou cold start natif : dashboard client ou Sésame ops. */
export const resolveNativePostLoginPath = async (user = getUser()) =>
  resolvePostLoginPath({ role: user?.role });

/** Reprise dossier depuis l’accueil (carte action) – distinct du post-login. */
export const resolveNativeDossierContinuePath = async () => {
  try {
    const payload = await apiGet('/api/dossiers', { retryOnUnauthorized: false });
    const primary = pickPrimaryDossier(payload?.dossiers || []);
    if (!primary?.id) return '/dashboard';
    return resolveDossierContinueUrl(primary);
  } catch (_error) {
    return '/dashboard';
  }
};

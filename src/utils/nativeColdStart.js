import { listDossiers } from '@/api/dossiers.js';
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

/** Prochaine action métier après connexion ou cold start natif. */
export const resolveNativePostLoginPath = async () => {
  try {
    const payload = await listDossiers();
    const primary = pickPrimaryDossier(payload?.dossiers || []);
    if (!primary?.id) return '/dashboard';
    return resolveDossierContinueUrl(primary);
  } catch (_error) {
    return '/dashboard';
  }
};

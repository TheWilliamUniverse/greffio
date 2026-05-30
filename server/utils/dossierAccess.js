import { isInternalRole } from '../authMiddleware.js';
import { claimDossierForUser, getDossier } from '../store.js';

export const resolveDossierAccess = async (req, dossierKey, { allowClaim = false } = {}) => {
  let dossier = await getDossier(dossierKey);
  if (!dossier) {
    return { ok: false, status: 404, error: 'DOSSIER_NOT_FOUND' };
  }
  const isOps = isInternalRole(req.auth?.role);
  if (!isOps && !dossier.userId && allowClaim) {
    dossier = await claimDossierForUser(dossier.id, req.auth.sub) || dossier;
  }
  const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
  if (!isOps && !isOwner) {
    return { ok: false, status: 403, error: 'DOSSIER_FORBIDDEN' };
  }
  return { ok: true, dossier };
};

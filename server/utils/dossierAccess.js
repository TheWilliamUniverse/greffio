import { isInternalRole } from '../authMiddleware.js';
import { claimDossierForUser, getDossier } from '../store.js';
import { evaluateDossierAccess } from './dossierAccessPolicy.js';

export { evaluateDossierAccess } from './dossierAccessPolicy.js';

export const resolveDossierAccess = async (req, dossierKey, { allowClaim = false } = {}) => {
  let dossier = await getDossier(dossierKey);
  const initial = evaluateDossierAccess({
    dossier,
    authSub: req.auth?.sub,
    authRole: req.auth?.role,
    allowClaim,
  });
  if (!initial.ok) return initial;

  const isOps = isInternalRole(req.auth?.role);
  if (!isOps && !dossier.userId && allowClaim) {
    dossier = await claimDossierForUser(dossier.id, req.auth.sub) || dossier;
  }

  return evaluateDossierAccess({
    dossier,
    authSub: req.auth?.sub,
    authRole: req.auth?.role,
    allowClaim: false,
  });
};

import { isInternalRole } from '../authMiddleware.js';

export const evaluateDossierAccess = ({
  dossier,
  authSub,
  authRole,
  allowClaim = false,
}) => {
  if (!dossier) {
    return { ok: false, status: 404, error: 'DOSSIER_NOT_FOUND' };
  }
  const isOps = isInternalRole(authRole);
  const canClaim = allowClaim && !dossier.userId;
  const isOwner = dossier.userId && dossier.userId === authSub;
  if (!isOps && !isOwner && !canClaim) {
    return { ok: false, status: 403, error: 'DOSSIER_FORBIDDEN' };
  }
  return { ok: true, dossier };
};

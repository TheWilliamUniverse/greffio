import { resolveSessionRole } from '@/utils/roles.js';

const OPS_PORTAL_ROLES = new Set(['ADMIN', 'OPS']);

export const canAccessSesameGateway = (roleOrUser) => (
  OPS_PORTAL_ROLES.has(resolveSessionRole(roleOrUser))
);

/** Post-login destination: Sésame (/gateway) réservé Admin/Ops ; clients → dashboard. */
export const resolvePostLoginPath = ({ role, fromPath } = {}) => {
  const from = typeof fromPath === 'string' && fromPath.startsWith('/') ? fromPath : null;

  if (!canAccessSesameGateway(role)) {
    if (from && from !== '/gateway' && !from.startsWith('/ops')) {
      return from;
    }
    return '/dashboard';
  }

  if (from && (from.startsWith('/ops') || from === '/gateway')) {
    return from;
  }
  return '/gateway';
};

import { getToken } from '@/utils/localStorage.js';

export const INTERNAL_ROLES = ['ADMIN', 'OPS', 'FORMALISTE'];

const decodeJwtPayload = (token) => {
  if (!token) return null;
  const parts = String(token).split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch (_error) {
    return null;
  }
};

/** Rôle effectif : objet user, chaîne role, ou claim JWT access token (après refresh). */
export const resolveSessionRole = (userOrRole) => {
  if (typeof userOrRole === 'string' && userOrRole.trim()) {
    return String(userOrRole).toUpperCase();
  }
  const fromUser = userOrRole?.role;
  if (fromUser) return String(fromUser).toUpperCase();
  const payload = decodeJwtPayload(getToken());
  return String(payload?.role || '').toUpperCase();
};

export const isInternalUser = (userOrRole) => (
  INTERNAL_ROLES.includes(resolveSessionRole(userOrRole))
);

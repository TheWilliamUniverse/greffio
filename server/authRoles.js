export const INTERNAL_ROLES = ['ADMIN', 'OPS', 'FORMALISTE'];

export const normalizeRole = (role) => String(role || '').toUpperCase();

export const isInternalRole = (role) => INTERNAL_ROLES.includes(normalizeRole(role));

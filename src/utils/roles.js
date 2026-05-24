export const INTERNAL_ROLES = ['ADMIN', 'OPS', 'FORMALISTE'];

export const isInternalUser = (userOrRole) => {
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role;
  return INTERNAL_ROLES.includes(String(role || '').toUpperCase());
};

/** Logs mobile Greffio – développement uniquement, jamais en production build. */
export const mobileDevLog = (scope, payload = {}) => {
  if (!import.meta.env.DEV || typeof console === 'undefined') return;
  console.debug(`[MobileGreffio:${scope}]`, payload);
};

import { toast } from 'sonner';

const AUTH_TOAST_IDS = {
  logout: 'greffio-auth-logout',
  login: 'greffio-auth-login',
  mfa: 'greffio-auth-mfa',
  welcome: 'greffio-auth-welcome',
  sessionSleep: 'greffio-auth-session-sleep',
};

/**
 * Affiche un retour auth/paiement sans doublon (remplace le toast précédent du même id).
 */
export const showAuthFeedback = (type, message, options = {}) => {
  const id = AUTH_TOAST_IDS[type] || `greffio-auth-${type}`;
  const { level = 'success', duration } = options;
  const payload = { id, duration };
  if (level === 'error') return toast.error(message, payload);
  if (level === 'info') return toast.info(message, payload);
  if (level === 'message') return toast.message(message, payload);
  return toast.success(message, payload);
};

export { AUTH_TOAST_IDS };

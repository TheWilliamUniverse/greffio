import { isSignwellConfigured } from './signwell.service.js';

export const GREFFIO_INTERNAL_PROVIDER = 'greffio_internal';

/**
 * Provider de signature documentaire Greffio.
 * Par défaut : signature interne (consentement + estampillage pdf-lib).
 * SignWell uniquement si GREFFIO_SIGNATURE_PROVIDER=signwell et clé API présente.
 */
export const resolveSignatureProvider = () => {
  const explicit = String(process.env.GREFFIO_SIGNATURE_PROVIDER || '').trim().toLowerCase();
  if (explicit === 'signwell' && isSignwellConfigured()) {
    return 'signwell';
  }
  return GREFFIO_INTERNAL_PROVIDER;
};

export const shouldUseSignwellForSignature = () => resolveSignatureProvider() === 'signwell';

export const isGreffioInternalSignature = () => resolveSignatureProvider() === GREFFIO_INTERNAL_PROVIDER;

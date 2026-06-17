import {
  completeSignwellDocument,
  formatSignwellApiError,
  isSignwellConfigured,
  isSignwellStrictMode,
  sendDocumentForSignature as sendSignwellDocument,
  SIGNWELL_PROVIDER,
} from './signwellOrchestrator.js';
import {
  completeYousignDocument,
  isYousignConfigured,
  isYousignStrictMode,
  sendDocumentForYousignSignature,
  YOUSIGN_PROVIDER,
} from './yousignOrchestrator.js';
import {
  formatYousignApiError,
} from './yousign.service.js';
import {
  resolveSignatureProvider,
  shouldUseTrustedProviderForSignature,
} from './signatureProvider.js';

export {
  isSignwellConfigured,
  isSignwellStrictMode,
  formatSignwellApiError,
  SIGNWELL_PROVIDER,
  isYousignConfigured,
  isYousignStrictMode,
  formatYousignApiError,
  YOUSIGN_PROVIDER,
};

export const isTrustedSignatureConfigured = () => {
  const provider = resolveSignatureProvider();
  if (provider === 'signwell') return isSignwellConfigured();
  if (provider === 'yousign') return isYousignConfigured();
  return false;
};

export const isTrustedSignatureStrictMode = () => {
  const provider = resolveSignatureProvider();
  if (provider === 'yousign') return isYousignStrictMode();
  return isSignwellStrictMode();
};

export const formatTrustedSignatureApiError = (error) => {
  if (String(error?.code || '').startsWith('YOUSIGN')) {
    return formatYousignApiError(error);
  }
  return formatSignwellApiError(error);
};

export const sendDocumentForSignature = async (params) => {
  const provider = resolveSignatureProvider();
  if (provider === 'yousign') {
    return sendDocumentForYousignSignature(params);
  }
  if (provider === 'signwell') {
    return sendSignwellDocument(params);
  }
  const error = new Error('TRUSTED_SIGNATURE_PROVIDER_NOT_CONFIGURED');
  error.code = 'TRUSTED_SIGNATURE_PROVIDER_NOT_CONFIGURED';
  throw error;
};

export const completeTrustedSignatureDocument = async (params) => {
  const provider = resolveSignatureProvider();
  if (provider === 'yousign') {
    return completeYousignDocument({
      ...params,
      yousignSignatureRequestId: params.signwellDocumentId || params.yousignSignatureRequestId,
    });
  }
  return completeSignwellDocument(params);
};

export { shouldUseTrustedProviderForSignature };

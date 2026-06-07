export const isSignwellSignNowResponse = (result) => (
  result?.provider === 'signwell' && Boolean(result?.signingLink)
);

export const redirectToSignwellSigning = (signingLink, { replace = false } = {}) => {
  const url = String(signingLink || '').trim();
  if (!url) return false;
  if (replace) {
    window.location.replace(url);
  } else {
    window.location.assign(url);
  }
  return true;
};

export const handleSignNowApiResponse = (result, { onSigned } = {}) => {
  if (isSignwellSignNowResponse(result)) {
    redirectToSignwellSigning(result.signingLink);
    return 'redirect';
  }
  if (result?.status === 'signed') {
    onSigned?.(result);
    return 'signed';
  }
  return 'unknown';
};

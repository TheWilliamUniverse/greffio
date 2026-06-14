/** Réponse API sign-now : signature interne Greffio uniquement. */
export const handleSignNowApiResponse = (result, { onSigned } = {}) => {
  if (result?.status === 'signed') {
    onSigned?.(result);
    return 'signed';
  }
  return 'unknown';
};

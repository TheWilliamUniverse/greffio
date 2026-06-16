/**
 * Signaturit – stub provider (no live API calls yet).
 * Yousign is intentionally not wired here.
 */

export const SIGNATURIT_PROVIDER = 'signaturit';

export const isSignaturitConfigured = () => Boolean(
  process.env.SIGNATURIT_ACCESS_TOKEN && process.env.SIGNATURIT_API_BASE_URL,
);

export const createSignaturitSignatureRequest = async () => ({
  ok: false,
  error: 'SIGNATURIT_NOT_IMPLEMENTED',
  message: 'Signaturit sera branché prochainement via signatureProvider.',
});

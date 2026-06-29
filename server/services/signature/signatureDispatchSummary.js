import { listSignatureRequestsByDossier } from '../../signatureRequestStore.js';
import { maskEmail } from './signatureUtils.js';

/**
 * Résumé client d'une demande de signature email en cours (pending / expirée).
 * Utilisé par l'éditeur documentaire pour afficher « Renvoyer le lien ».
 */
export const buildSignatureDispatchSummary = async ({ dossierId, docKey, document }) => {
  const key = String(docKey || '').trim();
  const id = String(dossierId || '').trim();
  if (!id || !key) return null;

  const metadata = document?.metadata && typeof document.metadata === 'object'
    ? document.metadata
    : {};
  if (metadata.declarationStatus === 'signed' || metadata.signedAt) return null;
  if (String(document?.status || '').trim().toUpperCase() === 'SIGNED') return null;

  const requests = await listSignatureRequestsByDossier(id);
  const latest = [...requests].reverse().find((item) => (
    item.docKey === key && item.status === 'pending'
  ));
  if (!latest) return null;

  const expired = new Date(latest.expiresAt).getTime() < Date.now();
  return {
    status: expired ? 'expired' : 'pending',
    signerEmail: latest.signerEmail,
    signerEmailMasked: maskEmail(latest.signerEmail),
    signerFullName: latest.signerFullName,
    expiresAt: latest.expiresAt,
    canResend: true,
  };
};

import { createHash, randomBytes } from 'node:crypto';
import { getDocumentById, updateDocumentIntegrity } from '../store.js';
import { getLatestSignatureByDocumentId } from '../signatureStore.js';

export const computeSha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

export const createDocumentVerifyToken = () => {
  const raw = randomBytes(24).toString('hex');
  const hash = hashDocumentVerifyToken(raw);
  return { raw, hash };
};

export const hashDocumentVerifyToken = (raw) => (
  createHash('sha256').update(String(raw || '')).digest('hex')
);

export const buildDocumentVerifyUrl = ({
  appUrl = null,
  documentId = null,
  verifyToken = null,
} = {}) => {
  const base = String(appUrl || process.env.GREFFIO_APP_URL || process.env.APP_URL || 'https://greffio.fr').replace(/\/$/, '');
  const id = String(documentId || '').trim();
  const token = String(verifyToken || '').trim();
  if (!id || !token) return null;
  const params = new URLSearchParams({ token });
  return `${base}/verify/document/${encodeURIComponent(id)}?${params.toString()}`;
};

export const ensureDocumentVerifyCredentials = async (documentId) => {
  const doc = await getDocumentById(documentId);
  if (!doc) return null;
  if (doc.verifyTokenHash) {
    return { documentId: doc.id, verifyToken: null, verifyTokenHash: doc.verifyTokenHash, existing: true };
  }
  const { raw, hash } = createDocumentVerifyToken();
  await updateDocumentIntegrity({ documentId: doc.id, verifyTokenHash: hash });
  return { documentId: doc.id, verifyToken: raw, verifyTokenHash: hash, existing: false };
};

export const recordDocumentHashBeforeSignature = async ({
  documentId,
  buffer,
  verifyTokenHash = null,
  verifyToken = null,
}) => {
  const hash = computeSha256(buffer);
  let tokenHash = verifyTokenHash;
  let tokenRaw = verifyToken;
  if (!tokenHash) {
    const created = createDocumentVerifyToken();
    tokenHash = created.hash;
    tokenRaw = created.raw;
  }
  await updateDocumentIntegrity({
    documentId,
    documentHashBeforeSignature: hash,
    verifyTokenHash: tokenHash,
  });
  return { documentHashBeforeSignature: hash, verifyToken: tokenRaw, verifyTokenHash: tokenHash };
};

export const recordDocumentHashAfterSignature = async ({ documentId, buffer }) => {
  const hash = computeSha256(buffer);
  await updateDocumentIntegrity({
    documentId,
    documentHashAfterSignature: hash,
  });
  return hash;
};

const GENERIC_VERIFY_FAILURE = {
  ok: true,
  status: 'unverified',
  verified: false,
  message: 'Ce lien ne permet pas de confirmer l\'authenticité du document. Utilisez le QR code ou le lien complet figurant sur le PDF signé Greffio.',
};

export const verifyDocumentPublic = async ({ documentId, token = null }) => {
  const doc = await getDocumentById(documentId);
  if (!doc || !token) {
    return GENERIC_VERIFY_FAILURE;
  }

  const tokenValid = Boolean(
    doc.verifyTokenHash && hashDocumentVerifyToken(token) === doc.verifyTokenHash,
  );
  if (!tokenValid) {
    return GENERIC_VERIFY_FAILURE;
  }

  const referenceHash = doc.documentHashAfterSignature || doc.documentHashBeforeSignature;
  const hashMatch = Boolean(referenceHash && doc.sha256 && referenceHash === doc.sha256);

  const signature = await getLatestSignatureByDocumentId(doc.id);

  return {
    ok: true,
    status: 'verified',
    verified: true,
    documentId: doc.id,
    documentLabel: doc.label,
    docKey: doc.docKey,
    hashMatch,
    documentHashBeforeSignature: doc.documentHashBeforeSignature || null,
    documentHashAfterSignature: doc.documentHashAfterSignature || null,
    signedAt: signature?.signedAt || doc.metadata?.signedAt || doc.reviewedAt || null,
    signerName: signature?.signerName || doc.metadata?.signerFullName || null,
    signatureLevel: signature?.signatureLevel || null,
  };
};

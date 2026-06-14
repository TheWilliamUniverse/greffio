import fs from 'node:fs';
import path from 'node:path';
import { zipSync } from 'fflate';
import { listSignatureAuditEvents } from './signature/signatureAuditService.js';
import { listSignatureRequestsByDossier } from '../signatureRequestStore.js';
import { listSignaturesByDossier } from '../signatureStore.js';
import { downloadDocumentBufferFromConfiguredStorage } from './objectStorage.js';

const toZipBytes = (buffer) => new Uint8Array(buffer);

const readLocalOrStorageBuffer = async (localPath, storageUrl) => {
  if (localPath && fs.existsSync(localPath)) {
    return fs.readFileSync(localPath);
  }
  if (storageUrl) {
    try {
      return await downloadDocumentBufferFromConfiguredStorage(storageUrl);
    } catch (_error) {
      return null;
    }
  }
  return null;
};

const safeZipName = (value, fallback = 'document') => (
  String(value || fallback).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120)
);

export const buildDossierAuditZipBuffer = async ({
  dossier,
  listDossierDocuments,
}) => {
  const dossierId = dossier.id;
  const documents = await listDossierDocuments(dossierId);
  const signatureRequests = await listSignatureRequestsByDossier(dossierId);
  const signatures = await listSignaturesByDossier(dossierId);

  const zipEntries = {};
  const manifest = {
    exportedAt: new Date().toISOString(),
    dossierId,
    reference: dossier.reference || dossierId,
    companyName: dossier.companyName || null,
    documents: documents.map((doc) => ({
      id: doc.id,
      docKey: doc.docKey,
      status: doc.status,
      filename: doc.filename,
      sha256: doc.sha256,
      storageUrl: doc.storageUrl || null,
      metadata: doc.metadata || null,
    })),
    signatureRequests: [],
    signatures: signatures.map((item) => ({
      id: item.id,
      documentId: item.documentId,
      signerName: item.signerName,
      signerEmail: item.signerEmail,
      signedAt: item.signedAt,
      originalHashSha256: item.originalHashSha256,
      signedHashSha256: item.signedHashSha256,
      proofId: item.proofId,
      provider: item.provider,
      signatureLevel: item.signatureLevel,
    })),
  };

  for (const request of signatureRequests) {
    const proofPath = request.proofCertificatePath || request.evidence?.proofCertificatePath || null;
    const auditEvents = await listSignatureAuditEvents(request.id);
    const matchingDoc = documents.find((doc) => doc.id === request.documentId) || null;

    manifest.signatureRequests.push({
      id: request.id,
      docKey: request.docKey,
      status: request.status,
      signerEmail: request.signerEmail,
      signerFullName: request.signerFullName,
      sha256Draft: request.sha256Draft,
      sha256Signed: request.sha256Signed,
      proofId: request.proofId || request.evidence?.proofId || null,
      signedAt: request.signedAt,
      draftPdfPath: request.draftPdfPath || null,
      signedPdfPath: request.signedPdfPath || null,
      proofCertificatePath: proofPath,
      auditTrail: request.auditTrail || [],
    });

    const signedBuffer = await readLocalOrStorageBuffer(
      request.signedPdfPath,
      matchingDoc?.storageUrl,
    );
    if (signedBuffer) {
      const signedName = safeZipName(`${request.docKey}_${request.id}_signed.pdf`);
      zipEntries[`documents/signed/${signedName}`] = toZipBytes(signedBuffer);
    }

    const proofBuffer = proofPath ? await readLocalOrStorageBuffer(proofPath, null) : null;
    if (proofBuffer) {
      const proofName = safeZipName(`${request.docKey}_${request.id}_proof.pdf`);
      zipEntries[`certificates/${proofName}`] = toZipBytes(proofBuffer);
    }

    zipEntries[`audit-logs/${safeZipName(request.id)}.json`] = toZipBytes(
      Buffer.from(JSON.stringify({
        signatureRequestId: request.id,
        docKey: request.docKey,
        events: auditEvents,
        auditTrail: request.auditTrail || [],
      }, null, 2)),
    );
  }

  for (const doc of documents) {
    if (!doc.sha256) continue;
    const hashEntry = {
      docKey: doc.docKey,
      documentId: doc.id,
      sha256: doc.sha256,
      filename: doc.filename,
      status: doc.status,
    };
    zipEntries[`hashes/${safeZipName(doc.docKey)}.json`] = toZipBytes(
      Buffer.from(JSON.stringify(hashEntry, null, 2)),
    );

    const isSignedDoc = doc.status === 'valid' || doc.status === 'VALID';
    const alreadyIncluded = signatureRequests.some(
      (req) => req.documentId === doc.id && req.status === 'signed',
    );
    if (isSignedDoc && !alreadyIncluded && doc.storageUrl) {
      const buffer = await readLocalOrStorageBuffer(doc.storageUrl, doc.storageUrl);
      if (buffer) {
        zipEntries[`documents/signed/${safeZipName(doc.docKey)}_${safeZipName(doc.filename, 'document.pdf')}`] = toZipBytes(buffer);
      }
    }
  }

  zipEntries['manifest.json'] = toZipBytes(Buffer.from(JSON.stringify(manifest, null, 2)));
  return Buffer.from(zipSync(zipEntries, { level: 6 }));
};

export const buildDossierAuditZipFilename = (dossier) => {
  const ref = safeZipName(dossier.reference || dossier.id, 'dossier');
  const stamp = new Date().toISOString().slice(0, 10);
  return `greffio-audit_${ref}_${stamp}.zip`;
};

import { randomUUID } from 'node:crypto';
import { hasPostgres, query } from './dbClient.js';

const nowIso = () => new Date().toISOString();

const mapRow = (row) => {
  if (!row) return null;
  return {
    ...row,
    metadata: row.metadataJson ? JSON.parse(row.metadataJson) : {},
  };
};

export const createSignwellDocumentRecord = async ({
  dossierId,
  docKey,
  signwellDocumentId,
  signatureRequestId = null,
  signerEmail,
  signerFullName,
  signingUrl = null,
  metadata = {},
}) => {
  if (!hasPostgres) {
    const error = new Error('SIGNWELL_STORE_REQUIRES_POSTGRES');
    error.code = 'SIGNWELL_STORE_REQUIRES_POSTGRES';
    throw error;
  }

  const createdAt = nowIso();
  const record = {
    id: randomUUID(),
    dossierId,
    docKey,
    signwellDocumentId,
    signatureRequestId,
    signerEmail,
    signerFullName,
    status: 'pending',
    signingUrl,
    metadataJson: JSON.stringify(metadata || {}),
    createdAt,
    updatedAt: createdAt,
  };

  await query(`
    INSERT INTO signwell_documents (
      id, dossier_id, doc_key, signwell_document_id, signature_request_id,
      signer_email, signer_full_name, status, signing_url, metadata_json, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
  `, [
    record.id,
    record.dossierId,
    record.docKey,
    record.signwellDocumentId,
    record.signatureRequestId,
    record.signerEmail,
    record.signerFullName,
    record.status,
    record.signingUrl,
    record.metadataJson,
    record.createdAt,
    record.updatedAt,
  ]);

  return record;
};

export const getSignwellDocumentBySignwellId = async (signwellDocumentId) => {
  if (!hasPostgres) return null;
  const result = await query(`
    SELECT
      id,
      dossier_id AS "dossierId",
      doc_key AS "docKey",
      signwell_document_id AS "signwellDocumentId",
      signature_request_id AS "signatureRequestId",
      signer_email AS "signerEmail",
      signer_full_name AS "signerFullName",
      status,
      signing_url AS "signingUrl",
      metadata_json AS "metadataJson",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM signwell_documents
    WHERE signwell_document_id = $1
    LIMIT 1
  `, [signwellDocumentId]);
  return mapRow(result.rows[0]);
};

export const getSignwellDocumentBySignatureRequestId = async (signatureRequestId) => {
  if (!hasPostgres || !signatureRequestId) return null;
  const result = await query(`
    SELECT
      id,
      dossier_id AS "dossierId",
      doc_key AS "docKey",
      signwell_document_id AS "signwellDocumentId",
      signature_request_id AS "signatureRequestId",
      signer_email AS "signerEmail",
      signer_full_name AS "signerFullName",
      status,
      signing_url AS "signingUrl",
      metadata_json AS "metadataJson",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM signwell_documents
    WHERE signature_request_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `, [signatureRequestId]);
  return mapRow(result.rows[0]);
};

export const updateSignwellDocumentStatus = async (id, status, extra = {}) => {
  if (!hasPostgres) return;
  const updatedAt = nowIso();
  await query(`
    UPDATE signwell_documents
    SET status = $1, metadata_json = COALESCE($2, metadata_json), updated_at = $3
    WHERE id = $4
  `, [
    status,
    extra.metadata ? JSON.stringify(extra.metadata) : null,
    updatedAt,
    id,
  ]);
};

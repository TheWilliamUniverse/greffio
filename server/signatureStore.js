import { randomUUID } from 'node:crypto';
import { hasPostgres, query, sqlite } from './dbClient.js';

const nowIso = () => new Date().toISOString();

const createSignatureRecord = async ({
  dossierId,
  documentId = null,
  signerUserId = null,
  signatureType = 'electronic_simple',
  status = 'signed',
  signedAt = nowIso(),
  ipAddress = null,
  userAgent = null,
  evidence = {},
}) => {
  const record = {
    id: randomUUID(),
    dossierId,
    documentId,
    signerUserId,
    signatureType,
    status,
    signedAt,
    ipAddress,
    userAgent,
    evidenceJson: JSON.stringify(evidence || {}),
    createdAt: nowIso(),
  };
  if (hasPostgres) {
    await query(`
      INSERT INTO signatures (
        id, dossier_id, document_id, signer_user_id, signature_type, status, signed_at, ip_address, user_agent, evidence_json, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `, [
      record.id,
      record.dossierId,
      record.documentId,
      record.signerUserId,
      record.signatureType,
      record.status,
      record.signedAt,
      record.ipAddress,
      record.userAgent,
      record.evidenceJson,
      record.createdAt,
    ]);
    return record;
  }
  sqlite.prepare(`
    INSERT INTO signatures (
      id, dossier_id, document_id, signer_user_id, signature_type, status, signed_at, ip_address, user_agent, evidence_json, created_at
    ) VALUES (
      @id, @dossierId, @documentId, @signerUserId, @signatureType, @status, @signedAt, @ipAddress, @userAgent, @evidenceJson, @createdAt
    )
  `).run(record);
  return record;
};

const getLatestSignatureByDossier = async (dossierId) => {
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        dossier_id AS "dossierId",
        document_id AS "documentId",
        signer_user_id AS "signerUserId",
        signature_type AS "signatureType",
        status,
        signed_at AS "signedAt",
        ip_address AS "ipAddress",
        user_agent AS "userAgent",
        evidence_json AS "evidenceJson",
        created_at AS "createdAt"
      FROM signatures
      WHERE dossier_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [dossierId]);
    return result.rows[0] || null;
  }
  return sqlite.prepare(`
    SELECT
      id,
      dossier_id AS dossierId,
      document_id AS documentId,
      signer_user_id AS signerUserId,
      signature_type AS signatureType,
      status,
      signed_at AS signedAt,
      ip_address AS ipAddress,
      user_agent AS userAgent,
      evidence_json AS evidenceJson,
      created_at AS createdAt
    FROM signatures
    WHERE dossier_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(dossierId) || null;
};

export {
  createSignatureRecord,
  getLatestSignatureByDossier,
};

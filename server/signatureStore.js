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
  signatureRequestId = null,
  provider = 'greffio_internal',
  signatureLevel = 'ses_reinforced',
  signerName = null,
  signerEmail = null,
  originalHashSha256 = null,
  signedHashSha256 = null,
  proofId = null,
  proofCertificatePath = null,
  consentTextVersion = null,
  consentTextSnapshot = null,
  documentAcknowledged = false,
  otpVerified = false,
  visualSignatureMode = null,
  greffioProofLine = null,
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
    signatureRequestId,
    provider,
    signatureLevel,
    signerName,
    signerEmail,
    originalHashSha256,
    signedHashSha256,
    proofId,
    proofCertificatePath,
    consentTextVersion,
    consentTextSnapshot,
    documentAcknowledged: documentAcknowledged ? 1 : 0,
    otpVerified: otpVerified ? 1 : 0,
    visualSignatureMode,
    greffioProofLine,
  };

  const baseColumns = 'id, dossier_id, document_id, signer_user_id, signature_type, status, signed_at, ip_address, user_agent, evidence_json, created_at';
  const baseValues = '@id, @dossierId, @documentId, @signerUserId, @signatureType, @status, @signedAt, @ipAddress, @userAgent, @evidenceJson, @createdAt';

  if (hasPostgres) {
    await query(`
      INSERT INTO signatures (
        ${baseColumns.replace(/@/g, '').replace(/,/g, ', ')},
        signature_request_id, provider, signature_level, signer_name, signer_email,
        original_hash_sha256, signed_hash_sha256, proof_id, proof_certificate_path,
        consent_text_version, consent_text_snapshot, document_acknowledged, otp_verified,
        visual_signature_mode, greffio_proof_line
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
    `, [
      record.id, record.dossierId, record.documentId, record.signerUserId,
      record.signatureType, record.status, record.signedAt, record.ipAddress,
      record.userAgent, record.evidenceJson, record.createdAt,
      record.signatureRequestId, record.provider, record.signatureLevel,
      record.signerName, record.signerEmail, record.originalHashSha256,
      record.signedHashSha256, record.proofId, record.proofCertificatePath,
      record.consentTextVersion, record.consentTextSnapshot, record.documentAcknowledged,
      record.otpVerified, record.visualSignatureMode, record.greffioProofLine,
    ]).catch(async () => {
      await query(`
        INSERT INTO signatures (
          id, dossier_id, document_id, signer_user_id, signature_type, status, signed_at, ip_address, user_agent, evidence_json, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `, [
        record.id, record.dossierId, record.documentId, record.signerUserId,
        record.signatureType, record.status, record.signedAt, record.ipAddress,
        record.userAgent, record.evidenceJson, record.createdAt,
      ]);
    });
    return record;
  }

  try {
    sqlite.prepare(`
      INSERT INTO signatures (
        id, dossier_id, document_id, signer_user_id, signature_type, status, signed_at, ip_address, user_agent, evidence_json, created_at,
        signature_request_id, provider, signature_level, signer_name, signer_email,
        original_hash_sha256, signed_hash_sha256, proof_id, proof_certificate_path,
        consent_text_version, consent_text_snapshot, document_acknowledged, otp_verified,
        visual_signature_mode, greffio_proof_line
      ) VALUES (
        @id, @dossierId, @documentId, @signerUserId, @signatureType, @status, @signedAt, @ipAddress, @userAgent, @evidenceJson, @createdAt,
        @signatureRequestId, @provider, @signatureLevel, @signerName, @signerEmail,
        @originalHashSha256, @signedHashSha256, @proofId, @proofCertificatePath,
        @consentTextVersion, @consentTextSnapshot, @documentAcknowledged, @otpVerified,
        @visualSignatureMode, @greffioProofLine
      )
    `).run(record);
  } catch (_error) {
    sqlite.prepare(`
      INSERT INTO signatures (
        id, dossier_id, document_id, signer_user_id, signature_type, status, signed_at, ip_address, user_agent, evidence_json, created_at
      ) VALUES (
        @id, @dossierId, @documentId, @signerUserId, @signatureType, @status, @signedAt, @ipAddress, @userAgent, @evidenceJson, @createdAt
      )
    `).run(record);
  }
  return record;
};

const getLatestSignatureByDocumentId = async (documentId) => {
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        dossier_id AS "dossierId",
        document_id AS "documentId",
        signer_name AS "signerName",
        signer_email AS "signerEmail",
        signature_level AS "signatureLevel",
        status,
        signed_at AS "signedAt",
        original_hash_sha256 AS "originalHashSha256",
        signed_hash_sha256 AS "signedHashSha256",
        proof_id AS "proofId"
      FROM signatures
      WHERE document_id = $1
      ORDER BY signed_at DESC NULLS LAST, created_at DESC
      LIMIT 1
    `, [documentId]).catch(async () => {
      const fallback = await query(`
        SELECT
          id,
          dossier_id AS "dossierId",
          document_id AS "documentId",
          status,
          signed_at AS "signedAt",
          evidence_json AS "evidenceJson",
          created_at AS "createdAt"
        FROM signatures
        WHERE document_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `, [documentId]);
      return fallback;
    });
    return result.rows[0] || null;
  }
  try {
    return sqlite.prepare(`
      SELECT
        id,
        dossier_id AS dossierId,
        document_id AS documentId,
        signer_name AS signerName,
        signer_email AS signerEmail,
        signature_level AS signatureLevel,
        status,
        signed_at AS signedAt,
        original_hash_sha256 AS originalHashSha256,
        signed_hash_sha256 AS signedHashSha256,
        proof_id AS proofId
      FROM signatures
      WHERE document_id = ?
      ORDER BY signed_at DESC, created_at DESC
      LIMIT 1
    `).get(documentId) || null;
  } catch (_error) {
    return sqlite.prepare(`
      SELECT
        id,
        dossier_id AS dossierId,
        document_id AS documentId,
        status,
        signed_at AS signedAt,
        evidence_json AS evidenceJson,
        created_at AS createdAt
      FROM signatures
      WHERE document_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(documentId) || null;
  }
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

const listSignaturesByDossier = async (dossierId) => {
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        dossier_id AS "dossierId",
        document_id AS "documentId",
        signer_name AS "signerName",
        signer_email AS "signerEmail",
        signature_level AS "signatureLevel",
        provider,
        status,
        signed_at AS "signedAt",
        original_hash_sha256 AS "originalHashSha256",
        signed_hash_sha256 AS "signedHashSha256",
        proof_id AS "proofId",
        proof_certificate_path AS "proofCertificatePath",
        evidence_json AS "evidenceJson",
        created_at AS "createdAt"
      FROM signatures
      WHERE dossier_id = $1
      ORDER BY created_at ASC
    `, [dossierId]).catch(async () => {
      const fallback = await query(`
        SELECT
          id,
          dossier_id AS "dossierId",
          document_id AS "documentId",
          status,
          signed_at AS "signedAt",
          evidence_json AS "evidenceJson",
          created_at AS "createdAt"
        FROM signatures
        WHERE dossier_id = $1
        ORDER BY created_at ASC
      `, [dossierId]);
      return fallback;
    });
    return result.rows || [];
  }
  try {
    return sqlite.prepare(`
      SELECT
        id,
        dossier_id AS dossierId,
        document_id AS documentId,
        signer_name AS signerName,
        signer_email AS signerEmail,
        signature_level AS signatureLevel,
        provider,
        status,
        signed_at AS signedAt,
        original_hash_sha256 AS originalHashSha256,
        signed_hash_sha256 AS signedHashSha256,
        proof_id AS proofId,
        proof_certificate_path AS proofCertificatePath,
        evidence_json AS evidenceJson,
        created_at AS createdAt
      FROM signatures
      WHERE dossier_id = ?
      ORDER BY created_at ASC
    `).all(dossierId);
  } catch (_error) {
    return sqlite.prepare(`
      SELECT
        id,
        dossier_id AS dossierId,
        document_id AS documentId,
        status,
        signed_at AS signedAt,
        evidence_json AS evidenceJson,
        created_at AS createdAt
      FROM signatures
      WHERE dossier_id = ?
      ORDER BY created_at ASC
    `).all(dossierId);
  }
};

export {
  createSignatureRecord,
  getLatestSignatureByDocumentId,
  getLatestSignatureByDossier,
  listSignaturesByDossier,
};

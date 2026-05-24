import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { hasPostgres, query, sqlite } from './dbClient.js';

const nowIso = () => new Date().toISOString();

export const createSigningToken = () => {
  const raw = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
};

export const hashSigningToken = (raw) => createHash('sha256').update(String(raw || '')).digest('hex');

const parseRow = (row) => {
  if (!row) return null;
  return {
    ...row,
    fields: row.fieldsJson ? JSON.parse(row.fieldsJson) : {},
    evidence: row.evidenceJson ? JSON.parse(row.evidenceJson) : {},
    auditTrail: row.auditJson ? JSON.parse(row.auditJson) : [],
  };
};

export const createSignatureRequest = async ({
  dossierId,
  documentId = null,
  docKey,
  tokenHash,
  signerEmail,
  signerFullName,
  draftPdfPath,
  sha256Draft,
  fields = {},
  expiresAt,
}) => {
  const createdAt = nowIso();
  const record = {
    id: randomUUID(),
    dossierId,
    documentId,
    docKey,
    tokenHash,
    signerEmail,
    signerFullName,
    status: 'pending',
    draftPdfPath,
    signedPdfPath: null,
    sha256Draft,
    sha256Signed: null,
    fieldsJson: JSON.stringify(fields || {}),
    expiresAt,
    signedAt: null,
    ipAddress: null,
    userAgent: null,
    evidenceJson: JSON.stringify({}),
    auditJson: JSON.stringify([{ at: createdAt, type: 'created' }]),
    createdAt,
    updatedAt: createdAt,
  };
  if (hasPostgres) {
    await query(`
      INSERT INTO signature_requests (
        id, dossier_id, document_id, doc_key, token_hash, signer_email, signer_full_name,
        status, draft_pdf_path, signed_pdf_path, sha256_draft, sha256_signed, fields_json,
        expires_at, signed_at, ip_address, user_agent, evidence_json, audit_json, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
    `, [
      record.id, record.dossierId, record.documentId, record.docKey, record.tokenHash,
      record.signerEmail, record.signerFullName, record.status, record.draftPdfPath,
      record.signedPdfPath, record.sha256Draft, record.sha256Signed, record.fieldsJson,
      record.expiresAt, record.signedAt, record.ipAddress, record.userAgent,
      record.evidenceJson, record.auditJson, record.createdAt, record.updatedAt,
    ]);
  } else {
    sqlite.prepare(`
      INSERT INTO signature_requests (
        id, dossier_id, document_id, doc_key, token_hash, signer_email, signer_full_name,
        status, draft_pdf_path, signed_pdf_path, sha256_draft, sha256_signed, fields_json,
        expires_at, signed_at, ip_address, user_agent, evidence_json, audit_json, created_at, updated_at
      ) VALUES (
        @id, @dossierId, @documentId, @docKey, @tokenHash, @signerEmail, @signerFullName,
        @status, @draftPdfPath, @signedPdfPath, @sha256Draft, @sha256Signed, @fieldsJson,
        @expiresAt, @signedAt, @ipAddress, @userAgent, @evidenceJson, @auditJson, @createdAt, @updatedAt
      )
    `).run(record);
  }
  return parseRow(record);
};

export const getSignatureRequestByTokenHash = async (tokenHash) => {
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        dossier_id AS "dossierId",
        document_id AS "documentId",
        doc_key AS "docKey",
        token_hash AS "tokenHash",
        signer_email AS "signerEmail",
        signer_full_name AS "signerFullName",
        status,
        draft_pdf_path AS "draftPdfPath",
        signed_pdf_path AS "signedPdfPath",
        sha256_draft AS "sha256Draft",
        sha256_signed AS "sha256Signed",
        fields_json AS "fieldsJson",
        expires_at AS "expiresAt",
        signed_at AS "signedAt",
        ip_address AS "ipAddress",
        user_agent AS "userAgent",
        evidence_json AS "evidenceJson",
        audit_json AS "auditJson",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM signature_requests
      WHERE token_hash = $1
      LIMIT 1
    `, [tokenHash]);
    return parseRow(result.rows[0]);
  }
  const row = sqlite.prepare(`
    SELECT
      id, dossier_id AS dossierId, document_id AS documentId, doc_key AS docKey,
      token_hash AS tokenHash, signer_email AS signerEmail, signer_full_name AS signerFullName,
      status, draft_pdf_path AS draftPdfPath, signed_pdf_path AS signedPdfPath,
      sha256_draft AS sha256Draft, sha256_signed AS sha256Signed, fields_json AS fieldsJson,
      expires_at AS expiresAt, signed_at AS signedAt, ip_address AS ipAddress,
      user_agent AS userAgent, evidence_json AS evidenceJson, audit_json AS auditJson,
      created_at AS createdAt, updated_at AS updatedAt
    FROM signature_requests
    WHERE token_hash = ?
    LIMIT 1
  `).get(tokenHash);
  return parseRow(row);
};

export const appendSignatureAudit = async (id, entry) => {
  const current = hasPostgres
    ? (await query('SELECT audit_json AS "auditJson" FROM signature_requests WHERE id = $1', [id])).rows[0]
    : sqlite.prepare('SELECT audit_json AS auditJson FROM signature_requests WHERE id = ?').get(id);
  const trail = current?.auditJson ? JSON.parse(current.auditJson) : [];
  trail.push({ at: nowIso(), ...entry });
  const auditJson = JSON.stringify(trail);
  const updatedAt = nowIso();
  if (hasPostgres) {
    await query('UPDATE signature_requests SET audit_json = $1, updated_at = $2 WHERE id = $3', [auditJson, updatedAt, id]);
  } else {
    sqlite.prepare('UPDATE signature_requests SET audit_json = ?, updated_at = ? WHERE id = ?').run(auditJson, updatedAt, id);
  }
};

export const markSignatureRequestSigned = async ({
  id,
  signedPdfPath,
  sha256Signed,
  ipAddress,
  userAgent,
  evidence = {},
}) => {
  const signedAt = nowIso();
  const updatedAt = signedAt;
  if (hasPostgres) {
    await query(`
      UPDATE signature_requests
      SET status = 'signed', signed_pdf_path = $1, sha256_signed = $2, signed_at = $3,
          ip_address = $4, user_agent = $5, evidence_json = $6, updated_at = $7
      WHERE id = $8
    `, [signedPdfPath, sha256Signed, signedAt, ipAddress, userAgent, JSON.stringify(evidence), updatedAt, id]);
  } else {
    sqlite.prepare(`
      UPDATE signature_requests
      SET status = 'signed', signed_pdf_path = @signedPdfPath, sha256_signed = @sha256Signed,
          signed_at = @signedAt, ip_address = @ipAddress, user_agent = @userAgent,
          evidence_json = @evidenceJson, updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id, signedPdfPath, sha256Signed, signedAt, ipAddress, userAgent,
      evidenceJson: JSON.stringify(evidence), updatedAt,
    });
  }
  await appendSignatureAudit(id, { type: 'signed', ipAddress, userAgent });
};

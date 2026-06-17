import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasPostgres, query, sqlite } from '../dbClient.js';
import { deleteDocumentFromConfiguredStorage } from '../services/objectStorage.js';
import {
  isEphemeralPlaceholderDossier,
  normalizePlaceholderKey,
} from '../utils/placeholderDossier.js';

dotenv.config({ quiet: true });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataRoot = path.resolve(__dirname, '../data');
const dryRun = process.env.CLEANUP_DRY_RUN === '1' || process.env.CONFIRM_CLEANUP !== 'YES';
const actorId = process.env.CLEANUP_ACTOR_ID || 'ops-cleanup-script';

const EPHEMERAL_STATUSES = new Set([
  'draft',
  'contact_started',
  'contact_completed',
  'legal_form_selected',
  'questionnaire_in_progress',
  'questionnaire_started',
  'questionnaire_completed',
  'quote_generated',
]);

const PROTECTED_DOSSIER_STATUSES = new Set([
  'statutes_generated',
  'statutes_under_review',
  'statutes_signed',
  'mandate_signed',
  'payment_pending',
  'payment_confirmed',
  'dossier_preparation',
  'client_validation_required',
  'client_validated',
  'ready_for_filing',
  'filed_to_guichet_unique',
  'under_administration_review',
  'regularization_requested',
  'regularization_submitted',
  'accepted',
  'official_documents_available',
  'completed',
  'manual_review_required',
  'documents_requested',
  'documents_uploaded',
  'documents_validated',
  'documents_under_review',
  'documents_missing_or_invalid',
  'mandate_pending_signature',
  'mandate_required',
]);

const PAID_PAYMENT_STATUSES = ['paid', 'confirmed', 'succeeded', 'completed'];

const report = {
  environment: hasPostgres ? 'postgres' : 'sqlite',
  dryRun,
  signedPdfFilesRemoved: 0,
  signedPdfFileErrors: [],
  signatureRequestsReset: 0,
  documentsReset: [],
  draftDossiersDeleted: [],
  draftDossierErrors: [],
};

const safeUnlink = async (filePath) => {
  const normalized = String(filePath || '').trim();
  if (!normalized) return false;
  const abs = path.isAbsolute(normalized) ? normalized : path.resolve(process.cwd(), normalized);
  if (!fs.existsSync(abs)) return false;
  if (dryRun) {
    report.signedPdfFilesRemoved += 1;
    return true;
  }
  try {
    await fs.promises.unlink(abs);
    report.signedPdfFilesRemoved += 1;
    return true;
  } catch (error) {
    report.signedPdfFileErrors.push({ filePath: abs, error: error?.message || String(error) });
    return false;
  }
};

const deleteStorageUrl = async (url) => {
  const value = String(url || '').trim();
  if (!value) return;
  if (dryRun) {
    report.signedPdfFilesRemoved += 1;
    return;
  }
  try {
    const result = await deleteDocumentFromConfiguredStorage(value);
    if (result.deleted) report.signedPdfFilesRemoved += 1;
  } catch (error) {
    report.signedPdfFileErrors.push({ storageUrl: value, error: error?.message || String(error) });
  }
};

const isSignedDocumentRow = (doc) => {
  const status = String(doc.status || '').trim().toLowerCase();
  if (status === 'signed') return true;
  const filename = String(doc.filename || '');
  const storageUrl = String(doc.storageUrl || doc.storage_url || '');
  const fileUrl = String(doc.fileUrl || doc.file_url || '');
  if (/_signed/i.test(`${filename} ${storageUrl} ${fileUrl}`)) return true;
  const metadata = doc.metadata || (doc.metadata_json ? JSON.parse(doc.metadata_json) : {});
  return Boolean(metadata.signedAt || metadata.sha256AfterSignature || metadata.proofId);
};

const isIncompleteStatutesInfoDraft = (dossier, hasPaidPayment) => {
  if (dossier.deletedAt || dossier.deleted_at) return false;
  if (hasPaidPayment) return false;
  const status = normalizePlaceholderKey(dossier.status);
  if (PROTECTED_DOSSIER_STATUSES.has(status)) return false;
  if (isEphemeralPlaceholderDossier(dossier)) return true;
  if (!EPHEMERAL_STATUSES.has(status)) return false;
  const progress = Number(dossier.progressPercent ?? dossier.progress_percent ?? 0);
  return progress < 90;
};

const listSignedSignatureRequests = async () => {
  if (hasPostgres) {
    const result = await query(`
      SELECT id, dossier_id AS "dossierId", doc_key AS "docKey", status,
             draft_pdf_path AS "draftPdfPath", signed_pdf_path AS "signedPdfPath",
             evidence_json AS "evidenceJson"
      FROM signature_requests
      WHERE status = 'signed'
    `);
    return result.rows.map((row) => ({
      ...row,
      evidence: row.evidenceJson ? JSON.parse(row.evidenceJson) : {},
    }));
  }
  return sqlite.prepare(`
    SELECT id, dossier_id, doc_key, status, draft_pdf_path, signed_pdf_path, evidence_json
    FROM signature_requests
    WHERE status = 'signed'
  `).all().map((row) => ({
    id: row.id,
    dossierId: row.dossier_id,
    docKey: row.doc_key,
    status: row.status,
    draftPdfPath: row.draft_pdf_path,
    signedPdfPath: row.signed_pdf_path,
    evidence: row.evidence_json ? JSON.parse(row.evidence_json) : {},
  }));
};

const listDocuments = async () => {
  if (hasPostgres) {
    const result = await query(`
      SELECT id, dossier_id AS "dossierId", doc_key AS "docKey", status, filename,
             storage_url AS "storageUrl", file_url AS "fileUrl", metadata_json AS "metadataJson"
      FROM documents
    `);
    return result.rows.map((row) => ({
      ...row,
      metadata: row.metadataJson ? JSON.parse(row.metadataJson) : {},
    }));
  }
  return sqlite.prepare(`
    SELECT id, dossier_id, doc_key, status, filename, storage_url, file_url, metadata_json
    FROM documents
  `).all().map((row) => ({
    id: row.id,
    dossierId: row.dossier_id,
    docKey: row.doc_key,
    status: row.status,
    filename: row.filename,
    storageUrl: row.storage_url,
    fileUrl: row.file_url,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {},
  }));
};

const resetDocumentRow = async (doc) => {
  const updatedAt = new Date().toISOString();
  const metadata = doc.metadata && typeof doc.metadata === 'object' ? doc.metadata : {};
  const nextMetadata = metadata.fields
    ? { fields: metadata.fields, clearedAt: updatedAt, clearedBy: actorId }
    : { clearedAt: updatedAt, clearedBy: actorId };

  if (hasPostgres) {
    await query(`
      UPDATE documents
      SET status = 'requested',
          original_filename = NULL,
          recommended_filename = NULL,
          file_url = NULL,
          filename = NULL,
          file_size_bytes = NULL,
          mime_type = NULL,
          storage_url = NULL,
          sha256 = NULL,
          rejected_reason = NULL,
          uploaded_at = NULL,
          reviewed_at = NULL,
          reviewer_id = NULL,
          metadata_json = $1,
          document_hash_before_signature = NULL,
          document_hash_after_signature = NULL,
          verify_token_hash = NULL,
          updated_at = $2
      WHERE id = $3
    `, [JSON.stringify(nextMetadata), updatedAt, doc.id]);
  } else {
    sqlite.prepare(`
      UPDATE documents
      SET status = 'requested',
          original_filename = NULL,
          recommended_filename = NULL,
          file_url = NULL,
          filename = NULL,
          file_size_bytes = NULL,
          mime_type = NULL,
          storage_url = NULL,
          sha256 = NULL,
          rejected_reason = NULL,
          uploaded_at = NULL,
          reviewed_at = NULL,
          reviewer_id = NULL,
          metadata_json = ?,
          document_hash_before_signature = NULL,
          document_hash_after_signature = NULL,
          verify_token_hash = NULL,
          updated_at = ?
      WHERE id = ?
    `).run(JSON.stringify(nextMetadata), updatedAt, doc.id);
  }
  report.documentsReset.push({ dossierId: doc.dossierId, docKey: doc.docKey, documentId: doc.id });
};

const cleanupSignedArtifacts = async () => {
  const requests = await listSignedSignatureRequests();
  for (const request of requests) {
    const paths = new Set([
      request.signedPdfPath,
      request.evidence?.proofCertificatePath,
    ].filter(Boolean));
    for (const p of paths) await safeUnlink(p);
    if (!dryRun) {
      if (hasPostgres) {
        await query('DELETE FROM signature_audit_events WHERE signature_request_id = $1', [request.id]);
        await query('DELETE FROM signatures WHERE evidence_json::text LIKE $1', [`%${request.id}%`]);
        const del = await query("DELETE FROM signature_requests WHERE id = $1 AND status = 'signed'", [request.id]);
        report.signatureRequestsReset += del.rowCount || 0;
      } else {
        sqlite.prepare('DELETE FROM signature_audit_events WHERE signature_request_id = ?').run(request.id);
        sqlite.prepare('DELETE FROM signatures WHERE evidence_json LIKE ?').run(`%${request.id}%`);
        const del = sqlite.prepare("DELETE FROM signature_requests WHERE id = ? AND status = 'signed'").run(request.id);
        report.signatureRequestsReset += del.changes || 0;
      }
    } else {
      report.signatureRequestsReset += 1;
    }
  }

  const docs = (await listDocuments()).filter(isSignedDocumentRow);
  for (const doc of docs) {
    const metaPath = doc.metadata?.proofCertificatePath || doc.metadata?.signedPdfPath;
    await deleteStorageUrl(doc.storageUrl);
    await deleteStorageUrl(doc.fileUrl);
    if (metaPath) await safeUnlink(metaPath);
    if (doc.filename && /_signed/i.test(doc.filename)) {
      const uploadGuess = path.join(dataRoot, 'uploads', doc.dossierId, doc.filename);
      await safeUnlink(uploadGuess);
    }
    await resetDocumentRow(doc);
  }

  const scanDirs = [path.join(dataRoot, 'generated'), path.join(dataRoot, 'uploads')];
  for (const dir of scanDirs) {
    if (!fs.existsSync(dir)) continue;
    const stack = [dir];
    while (stack.length) {
      const current = stack.pop();
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) stack.push(full);
        else if (entry.isFile() && /_signed/i.test(entry.name) && entry.name.toLowerCase().endsWith('.pdf')) {
          await safeUnlink(full);
        }
      }
    }
  }
};

const listActiveDossiers = async () => {
  if (hasPostgres) {
    const result = await query(`
      SELECT id, reference, user_id AS "userId", company_name AS "companyName",
             denomination, status, progress_percent AS "progressPercent", deleted_at AS "deletedAt"
      FROM dossiers
      WHERE deleted_at IS NULL
    `);
    return result.rows;
  }
  return sqlite.prepare(`
    SELECT id, reference, user_id AS userId, company_name AS companyName,
           denomination, status, progress_percent AS progressPercent, deleted_at AS deletedAt
    FROM dossiers
    WHERE deleted_at IS NULL
  `).all();
};

const dossierHasPaidPayment = async (dossierId) => {
  if (hasPostgres) {
    const result = await query(`
      SELECT COUNT(*)::int AS count
      FROM payments
      WHERE dossier_id = $1 AND lower(status) = ANY($2::text[])
    `, [dossierId, PAID_PAYMENT_STATUSES]);
    return (result.rows[0]?.count || 0) > 0;
  }
  const placeholders = PAID_PAYMENT_STATUSES.map(() => '?').join(',');
  const row = sqlite.prepare(`
    SELECT COUNT(*) AS count FROM payments
    WHERE dossier_id = ? AND lower(status) IN (${placeholders})
  `).get(dossierId, ...PAID_PAYMENT_STATUSES);
  return Number(row?.count || 0) > 0;
};

const hardDeleteDossier = async (dossier) => {
  const entry = {
    id: dossier.id,
    reference: dossier.reference,
    companyName: dossier.companyName,
    status: dossier.status,
    progressPercent: dossier.progressPercent,
  };
  if (dryRun) {
    report.draftDossiersDeleted.push(entry);
    return;
  }
  try {
    if (hasPostgres) {
      await query('DELETE FROM dossiers WHERE id = $1', [dossier.id]);
    } else {
      sqlite.prepare('DELETE FROM dossiers WHERE id = ?').run(dossier.id);
    }
    report.draftDossiersDeleted.push(entry);
  } catch (error) {
    report.draftDossierErrors.push({ id: dossier.id, error: error?.message || String(error) });
  }
};

const cleanupDraftDossiers = async () => {
  const dossiers = await listActiveDossiers();
  for (const dossier of dossiers) {
    const paid = await dossierHasPaidPayment(dossier.id);
    if (!isIncompleteStatutesInfoDraft(dossier, paid)) continue;
    await hardDeleteDossier(dossier);
  }
};

await cleanupSignedArtifacts();
await cleanupDraftDossiers();

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

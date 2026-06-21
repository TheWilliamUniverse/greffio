import { randomUUID } from 'node:crypto';
import { DOSSIER_STATUSES, evaluateTransition, ROLE } from './stateMachine.js';
import { hasPostgres, query, sqlite } from './dbClient.js';
import { DOCUMENT_STATUSES, isDocumentCompleteStatus } from './domain/documentStatus.js';
import { buildInitialStatutesWorkflowMetadata } from './domain/statutesWorkflow.js';
import {
  resolveDossierDocumentPlan,
  resolveDocumentRequiredFlag,
} from './domain/formalityDocuments.js';
import { resolveLegalFormFromQuestionnaire, resolveServiceFromFormality } from './utils/formalityMapping.js';
import { getMinorDocumentRequirements } from './utils/minorAssociateRules.js';

import { isEphemeralPlaceholderDossier, resolveCreateCompanyName } from './utils/placeholderDossier.js';

const nowIso = () => new Date().toISOString();
const parseJsonMetadata = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
};
const makeShortReference = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let block = '';
  for (let index = 0; index < 6; index += 1) {
    block += chars[Math.floor(Math.random() * chars.length)];
  }
  return `GF-${block}`;
};
const DOSSIER_DOCUMENT_TEMPLATES = Object.freeze([
  { key: 'identity_proof', label: "Pièce d'identité", required: true },
  { key: 'address_proof', label: 'Justificatif de domicile', required: true },
  { key: 'proxy_mandate', label: 'Procuration signée', required: false },
  { key: 'signed_statutes', label: 'Statuts signés', required: true },
  { key: 'capital_certificate', label: 'Attestation dépôt capital', required: false },
  { key: 'legal_notice_certificate', label: 'Attestation annonce légale', required: false },
  { key: 'registered_office_proof', label: 'Justificatif siège social', required: true },
  { key: 'ubo_declaration', label: 'Déclaration bénéficiaires effectifs', required: false },
  { key: 'manager_non_conviction', label: 'Déclaration non-condamnation et filiation', required: false },
  { key: 'subscribers_list', label: 'Liste des souscripteurs', required: true },
  { key: 'formality_powers', label: 'Procuration et pouvoirs pour formalités', required: true },
  { key: 'regulated_activity_proof', label: 'Autorisation activité réglementée', required: false },
  { key: 'minor_emancipation_order', label: "Ordonnance ou jugement d'émancipation", required: false },
  { key: 'minor_parental_authorization', label: 'Autorisation parentale / tuteur (associé mineur)', required: false },
]);

const addStatusEvent = async ({ dossierId, fromStatus, toStatus, actorType, actorId, reason, metadata }) => {
  const event = {
    id: randomUUID(),
    dossierId,
    fromStatus,
    toStatus,
    actorType,
    actorId: actorId || null,
    reason: reason || null,
    metadata: metadata || {},
    createdAt: nowIso(),
  };
  if (hasPostgres) {
    await query(`
      INSERT INTO dossier_status_events (
        id, dossier_id, from_status, to_status, actor_type, actor_id, reason, metadata_json, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [
      event.id,
      event.dossierId,
      event.fromStatus,
      event.toStatus,
      event.actorType,
      event.actorId,
      event.reason,
      JSON.stringify(event.metadata || {}),
      event.createdAt,
    ]);
  } else {
    sqlite
      .prepare(`
        INSERT INTO dossier_status_events (
          id, dossier_id, from_status, to_status, actor_type, actor_id, reason, metadata_json, created_at
        ) VALUES (
          @id, @dossierId, @fromStatus, @toStatus, @actorType, @actorId, @reason, @metadataJson, @createdAt
        )
      `)
      .run({
        ...event,
        metadataJson: JSON.stringify(event.metadata || {}),
      });
  }
  return event;
};

const addDocumentEvent = async ({
  documentId,
  dossierId,
  previousStatus,
  newStatus,
  actorType,
  actorId = null,
  reason = null,
  metadata = {},
}) => {
  const event = {
    id: randomUUID(),
    documentId,
    dossierId,
    previousStatus,
    newStatus,
    actorType,
    actorId,
    reason,
    metadata,
    createdAt: nowIso(),
  };
  if (hasPostgres) {
    await query(`
      INSERT INTO document_events (
        id, document_id, dossier_id, previous_status, new_status, actor_type, actor_id, reason, metadata_json, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `, [
      event.id,
      event.documentId,
      event.dossierId,
      event.previousStatus,
      event.newStatus,
      event.actorType,
      event.actorId,
      event.reason,
      JSON.stringify(event.metadata || {}),
      event.createdAt,
    ]);
  } else {
    sqlite.prepare(`
      INSERT INTO document_events (
        id, document_id, dossier_id, previous_status, new_status, actor_type, actor_id, reason, metadata_json, created_at
      ) VALUES (
        @id, @documentId, @dossierId, @previousStatus, @newStatus, @actorType, @actorId, @reason, @metadataJson, @createdAt
      )
    `).run({
      ...event,
      metadataJson: JSON.stringify(event.metadata || {}),
    });
  }
  return event;
};

const recordDossierSignatureTimelineEvent = async ({
  dossierId,
  documentTitle,
  signerFullName,
  proofId,
  metadata = {},
}) => {
  const dossier = await getDossier(dossierId);
  if (!dossier) return null;
  return addStatusEvent({
    dossierId,
    fromStatus: dossier.status,
    toStatus: dossier.status,
    actorType: 'signer',
    reason: 'Document signé électroniquement',
    metadata: {
      documentTitle,
      signerFullName,
      proofId,
      ...metadata,
    },
  });
};

const ensureSeedDossier = async (dossierId = 'dos_seed_001') => {
  const existing = await getDossier(dossierId);
  if (existing) return existing;
  const createdAt = nowIso();
  const dossier = {
    id: dossierId,
    userId: 'usr_seed_001',
    companyName: 'Greffio Demo Company',
    legalForm: 'SASU',
    service: 'creation-sasu',
    status: DOSSIER_STATUSES.QUOTE_GENERATED,
    createdAt,
    updatedAt: createdAt,
  };
  if (hasPostgres) {
    await query(`
      INSERT INTO dossiers (id, user_id, company_name, legal_form, service, status, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `, [
      dossier.id,
      dossier.userId,
      dossier.companyName,
      dossier.legalForm,
      dossier.service,
      dossier.status,
      dossier.createdAt,
      dossier.updatedAt,
    ]);
  } else {
    sqlite
      .prepare(`
        INSERT INTO dossiers (id, user_id, company_name, legal_form, service, status, created_at, updated_at)
        VALUES (@id, @userId, @companyName, @legalForm, @service, @status, @createdAt, @updatedAt)
      `)
      .run(dossier);
  }
  await addStatusEvent({
    dossierId: dossier.id,
    fromStatus: null,
    toStatus: dossier.status,
    actorType: 'system',
    reason: 'seed',
  });
  await ensureDossierDocuments(dossier.id);
  return dossier;
};

const createDossier = async ({
  userId = null,
  companyName = null,
  legalForm = 'SASU',
  service = 'creation-sasu',
  status = DOSSIER_STATUSES.DRAFT,
  forceNew = false,
}) => {
  if (userId && !forceNew) {
    const existingDrafts = await listDossiersForUser({ userId });
    const reusable = existingDrafts.find((entry) => isEphemeralPlaceholderDossier(entry));
    if (reusable) return { dossier: reusable, isNewCreation: false };
  }

  const createdAt = nowIso();
  const reference = makeShortReference();
  const resolvedCompanyName = resolveCreateCompanyName(companyName, reference);
  const dossier = {
    id: `dos_${randomUUID()}`,
    reference,
    userId,
    companyName: resolvedCompanyName,
    legalForm,
    service,
    status,
    progressPercent: 0,
    assignedToUserId: null,
    opsQueue: 'waiting_client',
    opsPriority: 'normal',
    dataJson: JSON.stringify({}),
    createdAt,
    updatedAt: createdAt,
  };
  if (hasPostgres) {
    await query(`
      INSERT INTO dossiers (
        id, reference, user_id, type_formalite, forme_juridique, denomination, company_name, legal_form, service, status, progress_percent, assigned_to_user_id, ops_queue, ops_priority, data_json, created_at, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    `, [
      dossier.id,
      dossier.reference,
      dossier.userId,
      'creation_societe',
      dossier.legalForm,
      dossier.companyName,
      dossier.companyName,
      dossier.legalForm,
      dossier.service,
      dossier.status,
      dossier.progressPercent,
      dossier.assignedToUserId,
      dossier.opsQueue,
      dossier.opsPriority,
      dossier.dataJson,
      dossier.createdAt,
      dossier.updatedAt,
    ]);
  } else {
    sqlite
      .prepare(`
        INSERT INTO dossiers (
          id, reference, user_id, type_formalite, forme_juridique, denomination, company_name, legal_form, service, status, progress_percent, assigned_to_user_id, ops_queue, ops_priority, data_json, created_at, updated_at
        )
        VALUES (
          @id, @reference, @userId, @typeFormalite, @formeJuridique, @denomination, @companyName, @legalForm, @service, @status, @progressPercent, @assignedToUserId, @opsQueue, @opsPriority, @dataJson, @createdAt, @updatedAt
        )
      `)
      .run({
        ...dossier,
        typeFormalite: 'creation_societe',
        formeJuridique: dossier.legalForm,
        denomination: dossier.companyName,
      });
  }
  await addStatusEvent({
    dossierId: dossier.id,
    fromStatus: null,
    toStatus: dossier.status,
    actorType: 'api',
    reason: 'dossier_created',
  });
  await ensureDossierDocuments(dossier.id);
  return { dossier, isNewCreation: true };
};

const ensureDossierDocuments = async (dossierId) => {
  const createdAt = nowIso();
  const dossier = await getDossier(dossierId);
  const questionnaire = dossier?.dataJson ? JSON.parse(dossier.dataJson) : {};
  const documentPlan = resolveDossierDocumentPlan({ dossier, questionnaire });
  const excludedDocumentKeys = documentPlan.formalityType === 'creation'
    ? (documentPlan.formalityRule?.excludedDocumentKeys || [])
    : [];
  const allowedTemplates = DOSSIER_DOCUMENT_TEMPLATES.filter(
    (template) => !excludedDocumentKeys.includes(template.key),
  );
  if (hasPostgres) {
    for (const template of allowedTemplates) {
      await query(`
        INSERT INTO documents (
          id, dossier_id, doc_key, label, required, status, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (dossier_id, doc_key) DO NOTHING
      `, [
        randomUUID(),
        dossierId,
        template.key,
        template.label,
        template.required,
        DOCUMENT_STATUSES.REQUESTED,
        createdAt,
        createdAt,
      ]);
    }
    return;
  }
  for (const template of allowedTemplates) {
    sqlite.prepare(`
      INSERT INTO documents (
        id, dossier_id, doc_key, label, required, status, created_at, updated_at
      ) VALUES (@id, @dossierId, @docKey, @label, @required, @status, @createdAt, @updatedAt)
      ON CONFLICT(dossier_id, doc_key) DO NOTHING
    `).run({
      id: randomUUID(),
      dossierId,
      docKey: template.key,
      label: template.label,
      required: template.required ? 1 : 0,
      status: DOCUMENT_STATUSES.REQUESTED,
      createdAt,
      updatedAt: createdAt,
    });
  }
  await syncDocumentRequirements(dossierId);
};

const syncDocumentRequirements = async (dossierId) => {
  const dossier = await getDossier(dossierId);
  if (!dossier) return;
  const questionnaire = dossier.dataJson ? JSON.parse(dossier.dataJson) : {};
  const documentPlan = resolveDossierDocumentPlan({ dossier, questionnaire });
  const updatedAt = nowIso();

  for (const template of DOSSIER_DOCUMENT_TEMPLATES) {
    const required = resolveDocumentRequiredFlag(template.key, {
      dossier,
      questionnaire,
      documentPlan,
    });
    if (hasPostgres) {
      await query(`
        UPDATE documents
        SET required = $1, updated_at = $2
        WHERE dossier_id = $3 AND doc_key = $4
      `, [required, updatedAt, dossierId, template.key]);
    } else {
      sqlite.prepare(`
        UPDATE documents
        SET required = @required, updated_at = @updatedAt
        WHERE dossier_id = @dossierId AND doc_key = @docKey
      `).run({
        required: required ? 1 : 0,
        updatedAt,
        dossierId,
        docKey: template.key,
      });
    }
  }

  const excludedDocumentKeys = documentPlan.formalityType === 'creation'
    ? (documentPlan.formalityRule?.excludedDocumentKeys || [])
    : [];
  if (excludedDocumentKeys.length) {
    if (hasPostgres) {
      await query(
        `
        UPDATE documents
        SET required = FALSE, updated_at = $1
        WHERE dossier_id = $2 AND doc_key = ANY($3::text[])
        `,
        [updatedAt, dossierId, excludedDocumentKeys],
      );
    } else {
      const placeholders = excludedDocumentKeys.map(() => '?').join(',');
      sqlite.prepare(`
        UPDATE documents
        SET required = 0, updated_at = ?
        WHERE dossier_id = ? AND doc_key IN (${placeholders})
      `).run(updatedAt, dossierId, ...excludedDocumentKeys);
    }
  }
};

const syncMinorAssociateDocuments = async (dossierId, questionnaire = {}) => {
  const { needsEmancipation, needsAuthorization } = getMinorDocumentRequirements(questionnaire);
  const rules = [
    { key: 'minor_emancipation_order', required: needsEmancipation },
    { key: 'minor_parental_authorization', required: needsAuthorization },
  ];
  const templatesByKey = Object.fromEntries(DOSSIER_DOCUMENT_TEMPLATES.map((item) => [item.key, item]));
  const updatedAt = nowIso();

  for (const rule of rules) {
    const template = templatesByKey[rule.key];
    if (!template) continue;
    if (hasPostgres) {
      await query(`
        INSERT INTO documents (
          id, dossier_id, doc_key, label, required, status, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (dossier_id, doc_key) DO UPDATE SET
          required = EXCLUDED.required,
          label = EXCLUDED.label,
          updated_at = EXCLUDED.updated_at
      `, [
        randomUUID(),
        dossierId,
        template.key,
        template.label,
        rule.required,
        DOCUMENT_STATUSES.REQUESTED,
        updatedAt,
        updatedAt,
      ]);
    } else {
      sqlite.prepare(`
        INSERT INTO documents (
          id, dossier_id, doc_key, label, required, status, created_at, updated_at
        ) VALUES (@id, @dossierId, @docKey, @label, @required, @status, @createdAt, @updatedAt)
        ON CONFLICT(dossier_id, doc_key) DO UPDATE SET
          required = excluded.required,
          label = excluded.label,
          updated_at = excluded.updated_at
      `).run({
        id: randomUUID(),
        dossierId,
        docKey: template.key,
        label: template.label,
        required: rule.required ? 1 : 0,
        status: DOCUMENT_STATUSES.REQUESTED,
        createdAt: updatedAt,
        updatedAt,
      });
    }
  }
};

const listDossierDocuments = async (dossierId) => {
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        dossier_id AS "dossierId",
        doc_key AS "docKey",
        label,
        required,
        status,
        original_filename AS "originalFilename",
        recommended_filename AS "recommendedFilename",
        file_url AS "fileUrl",
        filename,
        file_size_bytes AS "fileSizeBytes",
        mime_type AS "mimeType",
        storage_url AS "storageUrl",
        sha256,
        rejected_reason AS "rejectedReason",
        uploaded_at AS "uploadedAt",
        reviewed_at AS "reviewedAt",
        reviewer_id AS "reviewerId",
        metadata_json AS "metadataJson",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM documents
      WHERE dossier_id = $1
      ORDER BY created_at ASC
    `, [dossierId]);
    return result.rows.map((row) => ({
      ...row,
      metadata: parseJsonMetadata(row.metadataJson),
    }));
  }
  return sqlite.prepare(`
    SELECT
      id,
      dossier_id AS dossierId,
      doc_key AS docKey,
      label,
      required,
      status,
      original_filename AS originalFilename,
      recommended_filename AS recommendedFilename,
      file_url AS fileUrl,
      filename,
      file_size_bytes AS fileSizeBytes,
      mime_type AS mimeType,
      storage_url AS storageUrl,
      sha256,
      rejected_reason AS rejectedReason,
      uploaded_at AS uploadedAt,
      reviewed_at AS reviewedAt,
      reviewer_id AS reviewerId,
      metadata_json AS metadataJson,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM documents
    WHERE dossier_id = ?
    ORDER BY created_at ASC
  `).all(dossierId).map((row) => ({
    ...row,
    required: Boolean(row.required),
    metadata: parseJsonMetadata(row.metadataJson),
  }));
};

const updateDossierDocument = async ({
  dossierId,
  docKey,
  status,
  originalFilename = null,
  recommendedFilename = null,
  fileUrl = null,
  filename = null,
  fileSizeBytes = null,
  mimeType = null,
  storageUrl = null,
  sha256 = null,
  rejectedReason = null,
  reviewerId = null,
  metadata = null,
}) => {
  const existing = (await listDossierDocuments(dossierId)).find((item) => item.docKey === docKey);
  if (!existing) return null;
  const updatedAt = nowIso();
  const uploadedAt = status === DOCUMENT_STATUSES.UPLOADED ? updatedAt : null;
  const reviewedAt = [DOCUMENT_STATUSES.VALID, DOCUMENT_STATUSES.INVALID, DOCUMENT_STATUSES.UNDER_REVIEW].includes(status)
    ? updatedAt
    : null;
  if (hasPostgres) {
    await query(`
      UPDATE documents
      SET
        status = $1,
        original_filename = COALESCE($2, original_filename),
        recommended_filename = COALESCE($3, recommended_filename),
        file_url = COALESCE($4, file_url),
        metadata_json = COALESCE($5, metadata_json),
        filename = COALESCE($6, filename),
        file_size_bytes = COALESCE($7, file_size_bytes),
        mime_type = COALESCE($8, mime_type),
        storage_url = COALESCE($9, storage_url),
        sha256 = COALESCE($10, sha256),
        rejected_reason = $11,
        uploaded_at = COALESCE($12, uploaded_at),
        reviewed_at = COALESCE($13, reviewed_at),
        reviewer_id = $14,
        updated_at = $15
      WHERE dossier_id = $16 AND doc_key = $17
    `, [
      status,
      originalFilename,
      recommendedFilename,
      fileUrl,
      metadata ? JSON.stringify(metadata) : null,
      filename,
      fileSizeBytes,
      mimeType,
      storageUrl,
      sha256,
      rejectedReason,
      uploadedAt,
      reviewedAt,
      reviewerId,
      updatedAt,
      dossierId,
      docKey,
    ]);
    const next = (await listDossierDocuments(dossierId)).find((item) => item.docKey === docKey) || null;
    if (next) {
      await addDocumentEvent({
        documentId: next.id,
        dossierId,
        previousStatus: existing.status,
        newStatus: next.status,
        actorType: 'ops',
        actorId: reviewerId,
        reason: rejectedReason ? 'document_rejected' : 'document_status_update',
        metadata: { docKey, filename: next.filename || filename || null },
      });
    }
    return next;
  }
  sqlite.prepare(`
    UPDATE documents
    SET
      status = @status,
      original_filename = COALESCE(@originalFilename, original_filename),
      recommended_filename = COALESCE(@recommendedFilename, recommended_filename),
      file_url = COALESCE(@fileUrl, file_url),
      metadata_json = COALESCE(@metadataJson, metadata_json),
      filename = COALESCE(@filename, filename),
      file_size_bytes = COALESCE(@fileSizeBytes, file_size_bytes),
      mime_type = COALESCE(@mimeType, mime_type),
      storage_url = COALESCE(@storageUrl, storage_url),
      sha256 = COALESCE(@sha256, sha256),
      rejected_reason = @rejectedReason,
      uploaded_at = COALESCE(@uploadedAt, uploaded_at),
      reviewed_at = COALESCE(@reviewedAt, reviewed_at),
      reviewer_id = @reviewerId,
      updated_at = @updatedAt
    WHERE dossier_id = @dossierId AND doc_key = @docKey
  `).run({
    status,
    originalFilename,
    recommendedFilename,
    fileUrl,
    metadataJson: metadata ? JSON.stringify(metadata) : null,
    filename,
    fileSizeBytes,
    mimeType,
    storageUrl,
    sha256,
    rejectedReason,
    uploadedAt,
    reviewedAt,
    reviewerId,
    updatedAt,
    dossierId,
    docKey,
  });
  const next = (await listDossierDocuments(dossierId)).find((item) => item.docKey === docKey) || null;
  if (next) {
    await addDocumentEvent({
      documentId: next.id,
      dossierId,
      previousStatus: existing.status,
      newStatus: next.status,
      actorType: 'ops',
      actorId: reviewerId,
      reason: rejectedReason ? 'document_rejected' : 'document_status_update',
      metadata: { docKey, filename: next.filename || filename || null },
    });
  }
  return next;
};

const mapDocumentRow = (row) => {
  if (!row) return null;
  return {
    ...row,
    required: row.required === undefined ? undefined : Boolean(row.required),
    metadata: parseJsonMetadata(row.metadataJson),
    documentHashBeforeSignature: row.documentHashBeforeSignature || null,
    documentHashAfterSignature: row.documentHashAfterSignature || null,
    verifyTokenHash: row.verifyTokenHash || null,
  };
};

const getDocumentById = async (documentId) => {
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        dossier_id AS "dossierId",
        doc_key AS "docKey",
        label,
        required,
        status,
        filename,
        sha256,
        metadata_json AS "metadataJson",
        reviewed_at AS "reviewedAt",
        document_hash_before_signature AS "documentHashBeforeSignature",
        document_hash_after_signature AS "documentHashAfterSignature",
        verify_token_hash AS "verifyTokenHash"
      FROM documents
      WHERE id = $1
      LIMIT 1
    `, [documentId]).catch(async () => {
      const fallback = await query(`
        SELECT
          id,
          dossier_id AS "dossierId",
          doc_key AS "docKey",
          label,
          required,
          status,
          filename,
          sha256,
          metadata_json AS "metadataJson",
          reviewed_at AS "reviewedAt"
        FROM documents
        WHERE id = $1
        LIMIT 1
      `, [documentId]);
      return fallback;
    });
    return mapDocumentRow(result.rows[0]);
  }
  const row = sqlite.prepare(`
    SELECT
      id,
      dossier_id AS dossierId,
      doc_key AS docKey,
      label,
      required,
      status,
      filename,
      sha256,
      metadata_json AS metadataJson,
      reviewed_at AS reviewedAt,
      document_hash_before_signature AS documentHashBeforeSignature,
      document_hash_after_signature AS documentHashAfterSignature,
      verify_token_hash AS verifyTokenHash
    FROM documents
    WHERE id = ?
    LIMIT 1
  `).get(documentId);
  return mapDocumentRow(row);
};

const updateDocumentIntegrity = async ({
  documentId,
  documentHashBeforeSignature = undefined,
  documentHashAfterSignature = undefined,
  verifyTokenHash = undefined,
}) => {
  const sets = [];
  const values = [];
  let paramIndex = 1;

  if (documentHashBeforeSignature !== undefined) {
    sets.push(`document_hash_before_signature = $${paramIndex++}`);
    values.push(documentHashBeforeSignature);
  }
  if (documentHashAfterSignature !== undefined) {
    sets.push(`document_hash_after_signature = $${paramIndex++}`);
    values.push(documentHashAfterSignature);
  }
  if (verifyTokenHash !== undefined) {
    sets.push(`verify_token_hash = $${paramIndex++}`);
    values.push(verifyTokenHash);
  }
  if (!sets.length) return null;

  const updatedAt = nowIso();
  sets.push(`updated_at = $${paramIndex++}`);
  values.push(updatedAt);
  values.push(documentId);

  if (hasPostgres) {
    await query(`
      UPDATE documents
      SET ${sets.join(', ')}
      WHERE id = $${paramIndex}
    `, values).catch(() => null);
    return getDocumentById(documentId);
  }

  const sqliteSets = [];
  const sqliteParams = { documentId, updatedAt };
  if (documentHashBeforeSignature !== undefined) {
    sqliteSets.push('document_hash_before_signature = @documentHashBeforeSignature');
    sqliteParams.documentHashBeforeSignature = documentHashBeforeSignature;
  }
  if (documentHashAfterSignature !== undefined) {
    sqliteSets.push('document_hash_after_signature = @documentHashAfterSignature');
    sqliteParams.documentHashAfterSignature = documentHashAfterSignature;
  }
  if (verifyTokenHash !== undefined) {
    sqliteSets.push('verify_token_hash = @verifyTokenHash');
    sqliteParams.verifyTokenHash = verifyTokenHash;
  }
  sqliteSets.push('updated_at = @updatedAt');
  try {
    sqlite.prepare(`
      UPDATE documents
      SET ${sqliteSets.join(', ')}
      WHERE id = @documentId
    `).run(sqliteParams);
  } catch (_error) {
    return null;
  }
  return getDocumentById(documentId);
};

const clearDossierDocumentAttachment = async ({
  dossierId,
  docKey,
  actorId = null,
  actorType = 'client',
}) => {
  const existing = (await listDossierDocuments(dossierId)).find((item) => item.docKey === docKey);
  if (!existing) return null;
  const hadFile = Boolean(existing.filename || existing.storageUrl || existing.fileUrl);
  if (!hadFile) return { document: existing, removed: false };

  const updatedAt = nowIso();
  const previousMetadata = existing.metadata && typeof existing.metadata === 'object' ? existing.metadata : {};
  const nextMetadata = previousMetadata.fields
    ? { fields: previousMetadata.fields, clearedAt: updatedAt, clearedBy: actorId }
    : { clearedAt: updatedAt, clearedBy: actorId };

  if (hasPostgres) {
    await query(`
      UPDATE documents
      SET
        status = $1,
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
        metadata_json = $2,
        updated_at = $3
      WHERE dossier_id = $4 AND doc_key = $5
    `, [
      DOCUMENT_STATUSES.REQUESTED,
      JSON.stringify(nextMetadata),
      updatedAt,
      dossierId,
      docKey,
    ]);
  } else {
    sqlite.prepare(`
      UPDATE documents
      SET
        status = @status,
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
        metadata_json = @metadataJson,
        updated_at = @updatedAt
      WHERE dossier_id = @dossierId AND doc_key = @docKey
    `).run({
      status: DOCUMENT_STATUSES.REQUESTED,
      metadataJson: JSON.stringify(nextMetadata),
      updatedAt,
      dossierId,
      docKey,
    });
  }

  const next = (await listDossierDocuments(dossierId)).find((item) => item.docKey === docKey) || null;
  if (next) {
    await addDocumentEvent({
      documentId: next.id,
      dossierId,
      previousStatus: existing.status,
      newStatus: next.status,
      actorType,
      actorId,
      reason: 'document_attachment_removed',
      metadata: {
        docKey,
        previousFilename: existing.filename || null,
      },
    });
  }
  return {
    document: next,
    removed: true,
    previousStorageUrl: existing.storageUrl || existing.fileUrl || null,
  };
};

const getDossier = async (dossierId) => {
  const key = String(dossierId || '').trim();
  if (!key) return null;
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        reference,
        user_id AS "userId",
        type_formalite AS "typeFormalite",
        forme_juridique AS "formeJuridique",
        denomination,
        company_name AS "companyName",
        legal_form AS "legalForm",
        service,
        status,
        progress_percent AS "progressPercent",
        assigned_to_user_id AS "assignedToUserId",
        ops_queue AS "opsQueue",
        ops_priority AS "opsPriority",
        data_json AS "dataJson",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM dossiers
      WHERE (id = $1 OR reference = $1)
        AND deleted_at IS NULL
      LIMIT 1
    `, [key]);
    return result.rows[0] || null;
  }
  return sqlite
    .prepare(`
      SELECT
        id,
        reference,
        user_id AS userId,
        type_formalite AS typeFormalite,
        forme_juridique AS formeJuridique,
        denomination,
        company_name AS companyName,
        legal_form AS legalForm,
        service,
        status,
        progress_percent AS progressPercent,
        assigned_to_user_id AS assignedToUserId,
        ops_queue AS opsQueue,
        ops_priority AS opsPriority,
        data_json AS dataJson,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM dossiers
      WHERE (id = ? OR reference = ?)
        AND deleted_at IS NULL
    `)
    .get(key, key) || null;
};

const listDossiersForUser = async ({ userId }) => {
  if (!userId) return [];
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        reference,
        user_id AS "userId",
        type_formalite AS "typeFormalite",
        forme_juridique AS "formeJuridique",
        denomination,
        company_name AS "companyName",
        legal_form AS "legalForm",
        service,
        status,
        progress_percent AS "progressPercent",
        assigned_to_user_id AS "assignedToUserId",
        ops_queue AS "opsQueue",
        ops_priority AS "opsPriority",
        data_json AS "dataJson",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM dossiers
      WHERE user_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
    `, [userId]);
    return result.rows;
  }
  return sqlite.prepare(`
    SELECT
      id,
      reference,
      user_id AS userId,
      type_formalite AS typeFormalite,
      forme_juridique AS formeJuridique,
      denomination,
      company_name AS companyName,
      legal_form AS legalForm,
      service,
      status,
      progress_percent AS progressPercent,
      assigned_to_user_id AS assignedToUserId,
      ops_queue AS opsQueue,
      ops_priority AS opsPriority,
      data_json AS dataJson,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM dossiers
    WHERE user_id = ? AND deleted_at IS NULL
    ORDER BY created_at DESC
  `).all(userId);
};

const getAllDossiers = async () => {
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        reference,
        user_id AS "userId",
        type_formalite AS "typeFormalite",
        forme_juridique AS "formeJuridique",
        denomination,
        company_name AS "companyName",
        legal_form AS "legalForm",
        service,
        status,
        progress_percent AS "progressPercent",
        assigned_to_user_id AS "assignedToUserId",
        ops_queue AS "opsQueue",
        ops_priority AS "opsPriority",
        data_json AS "dataJson",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM dossiers
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `);
    return result.rows;
  }
  return sqlite
    .prepare(`
      SELECT
        id,
        reference,
        user_id AS userId,
        type_formalite AS typeFormalite,
        forme_juridique AS formeJuridique,
        denomination,
        company_name AS companyName,
        legal_form AS legalForm,
        service,
        status,
        progress_percent AS progressPercent,
        assigned_to_user_id AS assignedToUserId,
        ops_queue AS opsQueue,
        ops_priority AS opsPriority,
        data_json AS dataJson,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM dossiers
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `)
    .all();
};

const claimDossierForUser = async (dossierId, userId) => {
  if (!dossierId || !userId) return null;
  const dossier = await getDossier(dossierId);
  if (!dossier) return null;
  if (dossier.userId && dossier.userId !== userId) return null;
  if (dossier.userId === userId) return dossier;
  const updatedAt = nowIso();
  if (hasPostgres) {
    await query('UPDATE dossiers SET user_id = $1, updated_at = $2 WHERE id = $3 AND (user_id IS NULL OR user_id = $1)', [userId, updatedAt, dossierId]);
  } else {
    sqlite.prepare('UPDATE dossiers SET user_id = ?, updated_at = ? WHERE id = ? AND (user_id IS NULL OR user_id = ?)').run(userId, updatedAt, dossierId, userId);
  }
  return getDossier(dossierId);
};

const updateDossierQuestionnaire = async ({
  dossierId,
  dataPatch = {},
  progressPercent = null,
}) => {
  const dossier = await getDossier(dossierId);
  if (!dossier) return null;
  const previousData = dossier.dataJson ? JSON.parse(dossier.dataJson) : {};
  const mergedData = {
    ...previousData,
    ...dataPatch,
  };
  const nextProgress = progressPercent == null ? Number(dossier.progressPercent || 0) : Math.max(0, Math.min(100, Number(progressPercent)));
  const updatedAt = nowIso();
  const nextLegalForm = resolveLegalFormFromQuestionnaire({ dossier, questionnaire: mergedData }) || dossier.legalForm;
  const nextService = resolveServiceFromFormality(
    mergedData.typeFormalite || dossier.typeFormalite,
    nextLegalForm,
  ) || dossier.service;
  const resolvedDenom = String(mergedData.denomination || mergedData.companyName || '').trim();
  const currentName = String(dossier.companyName || '').trim();
  const isPlaceholderName = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    return !normalized || ['projet greffio', 'greffio demo company', 'brouillon en cours'].includes(normalized);
  };
  const nextCompanyName = (resolvedDenom && !isPlaceholderName(resolvedDenom))
    ? resolvedDenom
    : ((!isPlaceholderName(currentName) ? currentName : (resolvedDenom || currentName || dossier.reference || 'Brouillon en cours')));

  if (hasPostgres) {
    await query(`
      UPDATE dossiers
      SET
        data_json = $1,
        progress_percent = $2,
        updated_at = $3,
        legal_form = $4,
        forme_juridique = $5,
        service = $6,
        company_name = $7,
        denomination = COALESCE(NULLIF($8, ''), denomination)
      WHERE id = $9
    `, [
      JSON.stringify(mergedData),
      nextProgress,
      updatedAt,
      nextLegalForm,
      nextLegalForm,
      nextService,
      nextCompanyName,
      nextCompanyName,
      dossierId,
    ]);
  } else {
    sqlite.prepare(`
      UPDATE dossiers
      SET
        data_json = ?,
        progress_percent = ?,
        updated_at = ?,
        legal_form = ?,
        forme_juridique = ?,
        service = ?,
        company_name = ?,
        denomination = COALESCE(NULLIF(?, ''), denomination)
      WHERE id = ?
    `).run(
      JSON.stringify(mergedData),
      nextProgress,
      updatedAt,
      nextLegalForm,
      nextLegalForm,
      nextService,
      nextCompanyName,
      nextCompanyName,
      dossierId,
    );
  }
  try {
    await syncDocumentRequirements(dossierId);
  } catch (error) {
    console.error('[questionnaire] syncDocumentRequirements failed:', error?.message || error);
  }
  try {
    await syncMinorAssociateDocuments(dossierId, mergedData);
  } catch (error) {
    console.error('[questionnaire] syncMinorAssociateDocuments failed:', error?.message || error);
  }
  return getDossier(dossierId);
};

const getAllPayments = async () => {
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        dossier_id AS "dossierId",
        resource_order_id AS "resourceOrderId",
        user_id AS "userId",
        offer_code AS "offerCode",
        amount_total_cents AS "amountTotalCents",
        amount_service_cents AS "amountServiceCents",
        amount_legal_fees_cents AS "amountLegalFeesCents",
        currency,
        status,
        provider,
        provider_payment_id AS "providerPaymentId",
        provider_payload_json AS "providerPayloadJson",
        metadata_json AS "metadataJson",
        created_at AS "createdAt",
        paid_at AS "paidAt",
        failed_at AS "failedAt",
        refunded_at AS "refundedAt",
        updated_at AS "updatedAt"
      FROM payments
      ORDER BY created_at DESC
    `);
    return result.rows.map((item) => ({
      ...item,
      providerPayload: item.providerPayloadJson ? JSON.parse(item.providerPayloadJson) : {},
    }));
  }
  return sqlite
    .prepare(`
      SELECT
        id,
        dossier_id AS dossierId,
        user_id AS userId,
        offer_code AS offerCode,
        amount_total_cents AS amountTotalCents,
        amount_service_cents AS amountServiceCents,
        amount_legal_fees_cents AS amountLegalFeesCents,
        currency,
        status,
        provider,
        provider_payment_id AS providerPaymentId,
        provider_payload_json AS providerPayloadJson,
        metadata_json AS metadataJson,
        created_at AS createdAt,
        paid_at AS paidAt,
        failed_at AS failedAt,
        refunded_at AS refundedAt,
        updated_at AS updatedAt
      FROM payments
      ORDER BY created_at DESC
    `)
    .all()
    .map((item) => ({
      ...item,
      providerPayload: item.providerPayloadJson ? JSON.parse(item.providerPayloadJson) : {},
    }));
};

const listDossierEvents = async (dossierId) => {
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        dossier_id AS "dossierId",
        from_status AS "fromStatus",
        to_status AS "toStatus",
        actor_type AS "actorType",
        actor_id AS "actorId",
        reason,
        metadata_json AS "metadataJson",
        created_at AS "createdAt"
      FROM dossier_status_events
      WHERE dossier_id = $1
      ORDER BY created_at ASC
    `, [dossierId]);
    return result.rows.map((item) => ({
      ...item,
      metadata: item.metadataJson ? JSON.parse(item.metadataJson) : {},
    }));
  }
  return sqlite
    .prepare(`
      SELECT
        id,
        dossier_id AS dossierId,
        from_status AS fromStatus,
        to_status AS toStatus,
        actor_type AS actorType,
        actor_id AS actorId,
        reason,
        metadata_json AS metadataJson,
        created_at AS createdAt
      FROM dossier_status_events
      WHERE dossier_id = ?
      ORDER BY created_at ASC
    `)
    .all(dossierId)
    .map((item) => ({
      ...item,
      metadata: item.metadataJson ? JSON.parse(item.metadataJson) : {},
    }));
};

const transitionDossierStatus = async ({
  dossierId,
  nextStatus,
  actorType = 'system',
  actorId = null,
  actorRole = ROLE.SYSTEM,
  reason = null,
  metadata = {},
}) => {
  const dossier = await getDossier(dossierId);
  if (!dossier) {
    return { ok: false, code: 'DOSSIER_NOT_FOUND' };
  }
  const documents = await listDossierDocuments(dossier.id);
  const requiredDocsValid = documents
    .filter((item) => item.required)
    .every((item) => isDocumentCompleteStatus(item.status));
  const mandateDoc = documents.find((item) => (
    item.docKey === 'proxy_mandate' || item.docKey === 'formality_powers'
  ));
  const hasMandateSigned = Boolean(
    mandateDoc && [DOCUMENT_STATUSES.VALID, DOCUMENT_STATUSES.SIGNED].includes(mandateDoc.status),
  );
  const requiresMandate = Boolean(mandateDoc && mandateDoc.required);
  const hasConfirmedPayment = metadata?.paymentConfirmed === true
    || dossier.status === DOSSIER_STATUSES.PAYMENT_CONFIRMED;

  const evalResult = evaluateTransition({
    from: dossier.status,
    to: nextStatus,
    actorRole,
    hasConfirmedPayment,
    hasAllRequiredDocuments: requiredDocsValid,
    requiresMandate,
    isMandateSigned: hasMandateSigned,
  });
  if (!evalResult.ok) {
    return {
      ok: false,
      code: evalResult.code,
      currentStatus: dossier.status,
      requestedStatus: nextStatus,
    };
  }
  const prev = dossier.status;
  const updatedAt = nowIso();
  if (hasPostgres) {
    await query(`
      UPDATE dossiers
      SET status = $1, updated_at = $2
      WHERE id = $3
    `, [nextStatus, updatedAt, dossier.id]);
  } else {
    sqlite
      .prepare(`
        UPDATE dossiers
        SET status = ?, updated_at = ?
        WHERE id = ?
      `)
      .run(nextStatus, updatedAt, dossier.id);
  }
  const updated = {
    ...dossier,
    status: nextStatus,
    updatedAt,
  };
  const event = await addStatusEvent({
    dossierId,
    fromStatus: prev,
    toStatus: nextStatus,
    actorType,
    actorId,
    reason,
    metadata,
  });
  return { ok: true, dossier: updated, event };
};

const upsertPayment = async (payload) => {
  const payment = {
    id: payload.id || randomUUID(),
    customerId: payload.customerId || null,
    customerType: payload.customerType || null,
    invoiceId: payload.invoiceId || null,
    dossierId: payload.dossierId || null,
    resourceOrderId: payload.resourceOrderId || null,
    userId: payload.userId || null,
    offerCode: payload.offerCode,
    amountTotalCents: payload.amountTotalCents,
    amountServiceCents: payload.amountServiceCents,
    amountLegalFeesCents: payload.amountLegalFeesCents,
    currency: payload.currency || 'EUR',
    status: payload.status || 'pending',
    provider: payload.provider || 'mollie',
    providerPaymentId: payload.providerPaymentId || null,
    providerCheckoutUrl: payload.providerCheckoutUrl || null,
    providerPayload: payload.providerPayload || {},
    paymentMethod: payload.paymentMethod || null,
    metadata: payload.metadata || null,
    qontoTransactionId: payload.qontoTransactionId || null,
    createdAt: payload.createdAt || nowIso(),
    paidAt: payload.paidAt || null,
    failedAt: payload.failedAt || null,
    cancelledAt: payload.cancelledAt || null,
    refundedAt: payload.refundedAt || null,
    updatedAt: nowIso(),
  };
  if (hasPostgres) {
    await query(`
      INSERT INTO payments (
        id, customer_id, customer_type, invoice_id,
        dossier_id, resource_order_id, user_id, offer_code,
        amount_total_cents, amount_service_cents, amount_legal_fees_cents,
        currency, status, provider, provider_payment_id, provider_checkout_url,
        provider_payload_json, payment_method, metadata_json, qonto_transaction_id,
        created_at, paid_at, failed_at, cancelled_at, refunded_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26
      )
      ON CONFLICT (id) DO UPDATE SET
        customer_id=EXCLUDED.customer_id,
        customer_type=EXCLUDED.customer_type,
        invoice_id=EXCLUDED.invoice_id,
        dossier_id=EXCLUDED.dossier_id,
        resource_order_id=EXCLUDED.resource_order_id,
        user_id=EXCLUDED.user_id,
        offer_code=EXCLUDED.offer_code,
        amount_total_cents=EXCLUDED.amount_total_cents,
        amount_service_cents=EXCLUDED.amount_service_cents,
        amount_legal_fees_cents=EXCLUDED.amount_legal_fees_cents,
        currency=EXCLUDED.currency,
        status=EXCLUDED.status,
        provider=EXCLUDED.provider,
        provider_payment_id=EXCLUDED.provider_payment_id,
        provider_checkout_url=EXCLUDED.provider_checkout_url,
        provider_payload_json=EXCLUDED.provider_payload_json,
        payment_method=EXCLUDED.payment_method,
        metadata_json=COALESCE(EXCLUDED.metadata_json, payments.metadata_json),
        qonto_transaction_id=COALESCE(EXCLUDED.qonto_transaction_id, payments.qonto_transaction_id),
        paid_at=EXCLUDED.paid_at,
        failed_at=EXCLUDED.failed_at,
        cancelled_at=EXCLUDED.cancelled_at,
        refunded_at=EXCLUDED.refunded_at,
        updated_at=EXCLUDED.updated_at
    `, [
      payment.id,
      payment.customerId,
      payment.customerType,
      payment.invoiceId,
      payment.dossierId,
      payment.resourceOrderId,
      payment.userId,
      payment.offerCode,
      payment.amountTotalCents,
      payment.amountServiceCents,
      payment.amountLegalFeesCents,
      payment.currency,
      payment.status,
      payment.provider,
      payment.providerPaymentId,
      payment.providerCheckoutUrl,
      JSON.stringify(payment.providerPayload || {}),
      payment.paymentMethod,
      payment.metadata ? JSON.stringify(payment.metadata) : null,
      payment.qontoTransactionId,
      payment.createdAt,
      payment.paidAt,
      payment.failedAt,
      payment.cancelledAt,
      payment.refundedAt,
      payment.updatedAt,
    ]);
  } else {
    sqlite
      .prepare(`
        INSERT INTO payments (
          id, customer_id, customer_type, invoice_id,
          dossier_id, resource_order_id, user_id, offer_code,
          amount_total_cents, amount_service_cents, amount_legal_fees_cents,
          currency, status, provider, provider_payment_id, provider_checkout_url,
          provider_payload_json, payment_method, metadata_json, qonto_transaction_id,
          created_at, paid_at, failed_at, cancelled_at, refunded_at, updated_at
        ) VALUES (
          @id, @customerId, @customerType, @invoiceId,
          @dossierId, @resourceOrderId, @userId, @offerCode,
          @amountTotalCents, @amountServiceCents, @amountLegalFeesCents,
          @currency, @status, @provider, @providerPaymentId, @providerCheckoutUrl,
          @providerPayloadJson, @paymentMethod, @metadataJson, @qontoTransactionId,
          @createdAt, @paidAt, @failedAt, @cancelledAt, @refundedAt, @updatedAt
        )
        ON CONFLICT(id) DO UPDATE SET
          customer_id=excluded.customer_id,
          customer_type=excluded.customer_type,
          invoice_id=excluded.invoice_id,
          dossier_id=excluded.dossier_id,
          resource_order_id=excluded.resource_order_id,
          user_id=excluded.user_id,
          offer_code=excluded.offer_code,
          amount_total_cents=excluded.amount_total_cents,
          amount_service_cents=excluded.amount_service_cents,
          amount_legal_fees_cents=excluded.amount_legal_fees_cents,
          currency=excluded.currency,
          status=excluded.status,
          provider=excluded.provider,
          provider_payment_id=excluded.provider_payment_id,
          provider_checkout_url=excluded.provider_checkout_url,
          provider_payload_json=excluded.provider_payload_json,
          payment_method=excluded.payment_method,
          metadata_json=COALESCE(excluded.metadata_json, metadata_json),
          qonto_transaction_id=COALESCE(excluded.qonto_transaction_id, qonto_transaction_id),
          paid_at=excluded.paid_at,
          failed_at=excluded.failed_at,
          cancelled_at=excluded.cancelled_at,
          refunded_at=excluded.refunded_at,
          updated_at=excluded.updated_at
      `)
      .run({
        ...payment,
        providerPayloadJson: JSON.stringify(payment.providerPayload || {}),
        metadataJson: payment.metadata ? JSON.stringify(payment.metadata) : null,
      });
  }
  return payment;
};

const getPaymentById = async (paymentId) => {
  if (!paymentId) return null;
  let row;
  if (hasPostgres) {
    const result = await query(
      `SELECT
         id,
         customer_id AS "customerId",
         customer_type AS "customerType",
         invoice_id AS "invoiceId",
         dossier_id AS "dossierId",
         resource_order_id AS "resourceOrderId",
         user_id AS "userId",
         offer_code AS "offerCode",
         amount_total_cents AS "amountTotalCents",
         amount_service_cents AS "amountServiceCents",
         amount_legal_fees_cents AS "amountLegalFeesCents",
         currency,
         status,
         provider,
         provider_payment_id AS "providerPaymentId",
         provider_checkout_url AS "providerCheckoutUrl",
         provider_payload_json AS "providerPayloadJson",
         payment_method AS "paymentMethod",
         metadata_json AS "metadataJson",
         qonto_transaction_id AS "qontoTransactionId",
         created_at AS "createdAt",
         paid_at AS "paidAt",
         failed_at AS "failedAt",
         cancelled_at AS "cancelledAt",
         refunded_at AS "refundedAt",
         updated_at AS "updatedAt"
       FROM payments WHERE id = $1 LIMIT 1`,
      [paymentId],
    );
    row = result.rows[0] || null;
  } else {
    row = sqlite.prepare(`
      SELECT
        id,
        customer_id AS customerId,
        customer_type AS customerType,
        invoice_id AS invoiceId,
        dossier_id AS dossierId,
        resource_order_id AS resourceOrderId,
        user_id AS userId,
        offer_code AS offerCode,
        amount_total_cents AS amountTotalCents,
        amount_service_cents AS amountServiceCents,
        amount_legal_fees_cents AS amountLegalFeesCents,
        currency,
        status,
        provider,
        provider_payment_id AS providerPaymentId,
        provider_checkout_url AS providerCheckoutUrl,
        provider_payload_json AS providerPayloadJson,
        payment_method AS paymentMethod,
        metadata_json AS metadataJson,
        qonto_transaction_id AS qontoTransactionId,
        created_at AS createdAt,
        paid_at AS paidAt,
        failed_at AS failedAt,
        cancelled_at AS cancelledAt,
        refunded_at AS refundedAt,
        updated_at AS updatedAt
      FROM payments WHERE id = ? LIMIT 1
    `).get(paymentId);
  }
  if (!row) return null;
  return {
    ...row,
    providerPayload: row.providerPayloadJson ? JSON.parse(row.providerPayloadJson) : {},
    metadata: row.metadataJson ? JSON.parse(row.metadataJson) : null,
  };
};

const getPaymentByProviderId = async (providerPaymentId) => {
  let row;
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        dossier_id AS "dossierId",
        resource_order_id AS "resourceOrderId",
        user_id AS "userId",
        offer_code AS "offerCode",
        amount_total_cents AS "amountTotalCents",
        amount_service_cents AS "amountServiceCents",
        amount_legal_fees_cents AS "amountLegalFeesCents",
        currency,
        status,
        provider,
        provider_payment_id AS "providerPaymentId",
        provider_payload_json AS "providerPayloadJson",
        metadata_json AS "metadataJson",
        created_at AS "createdAt",
        paid_at AS "paidAt",
        failed_at AS "failedAt",
        refunded_at AS "refundedAt",
        updated_at AS "updatedAt"
      FROM payments
      WHERE provider_payment_id = $1
      LIMIT 1
    `, [providerPaymentId]);
    row = result.rows[0] || null;
  } else {
    row = sqlite
      .prepare(`
      SELECT
        id,
        dossier_id AS dossierId,
        resource_order_id AS resourceOrderId,
        user_id AS userId,
        offer_code AS offerCode,
        amount_total_cents AS amountTotalCents,
        amount_service_cents AS amountServiceCents,
        amount_legal_fees_cents AS amountLegalFeesCents,
        currency,
        status,
        provider,
        provider_payment_id AS providerPaymentId,
        provider_payload_json AS providerPayloadJson,
        metadata_json AS metadataJson,
        created_at AS createdAt,
        paid_at AS paidAt,
        failed_at AS failedAt,
        refunded_at AS refundedAt,
        updated_at AS updatedAt
      FROM payments
      WHERE provider_payment_id = ?
    `)
      .get(providerPaymentId);
  }
  if (!row) return null;
  return {
    ...row,
    providerPayload: row.providerPayloadJson ? JSON.parse(row.providerPayloadJson) : {},
    metadata: parseJsonMetadata(row.metadataJson),
  };
};

const addPaymentEvent = async ({
  paymentId,
  eventType,
  providerEventId,
  rawPayload,
}) => {
  const event = {
    id: randomUUID(),
    paymentId,
    eventType,
    providerEventId,
    rawPayload,
    processedAt: nowIso(),
    createdAt: nowIso(),
  };
  if (hasPostgres) {
    await query(`
      INSERT INTO payment_events (
        id, payment_id, event_type, provider_event_id, raw_payload_json, processed_at, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
    `, [
      event.id,
      event.paymentId,
      event.eventType,
      event.providerEventId,
      JSON.stringify(event.rawPayload || {}),
      event.processedAt,
      event.createdAt,
    ]);
  } else {
    sqlite
      .prepare(`
        INSERT INTO payment_events (
          id, payment_id, event_type, provider_event_id, raw_payload_json, processed_at, created_at
        ) VALUES (
          @id, @paymentId, @eventType, @providerEventId, @rawPayloadJson, @processedAt, @createdAt
        )
      `)
      .run({
        ...event,
        rawPayloadJson: JSON.stringify(event.rawPayload || {}),
      });
  }
  return event;
};

const hasPaymentEventProviderId = async (providerEventId) => {
  if (hasPostgres) {
    const result = await query(
      'SELECT 1 AS found FROM payment_events WHERE provider_event_id = $1 LIMIT 1',
      [providerEventId],
    );
    return Boolean(result.rows[0]);
  }
  return Boolean(
    sqlite
      .prepare('SELECT 1 AS found FROM payment_events WHERE provider_event_id = ? LIMIT 1')
      .get(providerEventId),
  );
};

const listOpsNotesByDossier = async (dossierId) => {
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        dossier_id AS "dossierId",
        author_id AS "authorId",
        note,
        created_at AS "createdAt"
      FROM ops_notes
      WHERE dossier_id = $1
      ORDER BY created_at DESC
    `, [dossierId]);
    return result.rows;
  }
  return sqlite.prepare(`
    SELECT
      id,
      dossier_id AS dossierId,
      author_id AS authorId,
      note,
      created_at AS createdAt
    FROM ops_notes
    WHERE dossier_id = ?
    ORDER BY created_at DESC
  `).all(dossierId);
};

const updateDossierOpsFields = async ({
  dossierId,
  assignedToUserId,
  opsQueue,
  opsPriority,
}) => {
  const dossier = await getDossier(dossierId);
  if (!dossier) return null;
  const updatedAt = nowIso();
  const nextAssigned = assignedToUserId === undefined ? dossier.assignedToUserId : (assignedToUserId || null);
  const nextQueue = opsQueue === undefined ? (dossier.opsQueue || 'waiting_client') : String(opsQueue || 'waiting_client');
  const nextPriority = opsPriority === undefined ? (dossier.opsPriority || 'normal') : String(opsPriority || 'normal');

  if (hasPostgres) {
    await query(`
      UPDATE dossiers
      SET assigned_to_user_id = $1, ops_queue = $2, ops_priority = $3, updated_at = $4
      WHERE id = $5
    `, [nextAssigned, nextQueue, nextPriority, updatedAt, dossierId]);
  } else {
    sqlite.prepare(`
      UPDATE dossiers
      SET assigned_to_user_id = ?, ops_queue = ?, ops_priority = ?, updated_at = ?
      WHERE id = ?
    `).run(nextAssigned, nextQueue, nextPriority, updatedAt, dossierId);
  }
  return getDossier(dossierId);
};

const listDossierMessagesByDossier = async (dossierId) => {
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        dossier_id AS "dossierId",
        author_type AS "authorType",
        author_id AS "authorId",
        author_name AS "authorName",
        body,
        channel,
        email_sent_at AS "emailSentAt",
        created_at AS "createdAt"
      FROM dossier_messages
      WHERE dossier_id = $1
      ORDER BY created_at ASC
    `, [dossierId]);
    return result.rows;
  }
  return sqlite.prepare(`
    SELECT
      id,
      dossier_id AS dossierId,
      author_type AS authorType,
      author_id AS authorId,
      author_name AS authorName,
      body,
      channel,
      email_sent_at AS emailSentAt,
      created_at AS createdAt
    FROM dossier_messages
    WHERE dossier_id = ?
    ORDER BY created_at ASC
  `).all(dossierId);
};

const addDossierMessage = async ({
  dossierId,
  authorType,
  authorId = null,
  authorName = '',
  body,
  channel = 'thread',
  emailSentAt = null,
}) => {
  const record = {
    id: randomUUID(),
    dossierId,
    authorType: String(authorType || 'client'),
    authorId,
    authorName: String(authorName || '').trim() || 'Greffio',
    body: String(body || '').trim(),
    channel: String(channel || 'thread'),
    emailSentAt,
    createdAt: nowIso(),
  };
  if (!record.body) return null;
  if (hasPostgres) {
    await query(`
      INSERT INTO dossier_messages (
        id, dossier_id, author_type, author_id, author_name, body, channel, email_sent_at, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [
      record.id, record.dossierId, record.authorType, record.authorId, record.authorName,
      record.body, record.channel, record.emailSentAt, record.createdAt,
    ]);
  } else {
    sqlite.prepare(`
      INSERT INTO dossier_messages (
        id, dossier_id, author_type, author_id, author_name, body, channel, email_sent_at, created_at
      ) VALUES (
        @id, @dossierId, @authorType, @authorId, @authorName, @body, @channel, @emailSentAt, @createdAt
      )
    `).run(record);
  }
  return record;
};

const markDossierMessageEmailSent = async (messageId) => {
  const sentAt = nowIso();
  if (hasPostgres) {
    await query(`
      UPDATE dossier_messages SET email_sent_at = $1 WHERE id = $2
    `, [sentAt, messageId]);
  } else {
    sqlite.prepare(`
      UPDATE dossier_messages SET email_sent_at = ? WHERE id = ?
    `).run(sentAt, messageId);
  }
  return sentAt;
};

const addOpsNote = async ({
  dossierId,
  authorId = null,
  note,
}) => {
  const record = {
    id: randomUUID(),
    dossierId,
    authorId,
    note: String(note || '').trim(),
    createdAt: nowIso(),
  };
  if (!record.note) return null;
  if (hasPostgres) {
    await query(`
      INSERT INTO ops_notes (
        id, dossier_id, author_id, note, created_at
      ) VALUES ($1,$2,$3,$4,$5)
    `, [record.id, record.dossierId, record.authorId, record.note, record.createdAt]);
    return record;
  }
  sqlite.prepare(`
    INSERT INTO ops_notes (
      id, dossier_id, author_id, note, created_at
    ) VALUES (
      @id, @dossierId, @authorId, @note, @createdAt
    )
  `).run(record);
  return record;
};

const syncGeneratedStatutesToDossierChecklist = async ({
  dossierId,
  fileUrl,
  fileSizeBytes,
  filename,
  contentHash,
  legalForm,
}) => {
  const docs = await listDossierDocuments(dossierId);
  const statutesDoc = docs.find((item) => item.docKey === 'signed_statutes');
  if (!statutesDoc) return null;
  return updateDossierDocument({
    dossierId,
    docKey: 'signed_statutes',
    status: DOCUMENT_STATUSES.UPLOADED,
    originalFilename: filename,
    recommendedFilename: filename,
    fileUrl,
    storageUrl: fileUrl,
    filename,
    fileSizeBytes,
    mimeType: 'application/pdf',
    sha256: contentHash,
    metadata: buildInitialStatutesWorkflowMetadata({
      legalForm,
      filename,
      contentHash,
    }),
  });
};

const markDossierStatutesGenerated = async ({
  dossierId,
  actorId = null,
  actorRole = ROLE.CLIENT,
}) => {
  const dossier = await getDossier(dossierId);
  if (!dossier) return { ok: false, code: 'DOSSIER_NOT_FOUND' };
  if (dossier.status === DOSSIER_STATUSES.STATUTES_GENERATED) {
    return { ok: true, dossier };
  }
  return transitionDossierStatus({
    dossierId: dossier.id,
    nextStatus: DOSSIER_STATUSES.STATUTES_GENERATED,
    actorType: 'api',
    actorId,
    actorRole,
    reason: 'statutes_pdf_generated',
  });
};

const upsertGeneratedDocument = async ({
  dossierId,
  type,
  status = 'generated',
  version = 1,
  fileUrl = null,
  fileSizeBytes = null,
  contentHash = null,
  metadata = {},
}) => {
  const record = {
    id: randomUUID(),
    dossierId,
    type,
    status,
    version,
    fileUrl,
    fileSizeBytes,
    contentHash,
    metadata,
    createdAt: nowIso(),
  };
  if (hasPostgres) {
    await query(`
      INSERT INTO generated_documents (
        id, dossier_id, type, status, version, file_url, file_size_bytes, content_hash, metadata_json, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `, [
      record.id,
      record.dossierId,
      record.type,
      record.status,
      record.version,
      record.fileUrl,
      record.fileSizeBytes,
      record.contentHash,
      JSON.stringify(record.metadata || {}),
      record.createdAt,
    ]);
    return record;
  }
  sqlite.prepare(`
    INSERT INTO generated_documents (
      id, dossier_id, type, status, version, file_url, file_size_bytes, content_hash, metadata_json, created_at
    ) VALUES (
      @id, @dossierId, @type, @status, @version, @fileUrl, @fileSizeBytes, @contentHash, @metadataJson, @createdAt
    )
  `).run({
    ...record,
    metadataJson: JSON.stringify(record.metadata || {}),
  });
  return record;
};

const listGeneratedDocumentsByDossier = async (dossierId) => {
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        dossier_id AS "dossierId",
        type,
        status,
        version,
        file_url AS "fileUrl",
        file_size_bytes AS "fileSizeBytes",
        content_hash AS "contentHash",
        metadata_json AS "metadataJson",
        created_at AS "createdAt"
      FROM generated_documents
      WHERE dossier_id = $1
      ORDER BY created_at DESC
    `, [dossierId]);
    return result.rows.map((item) => ({
      ...item,
      metadata: parseJsonMetadata(item.metadataJson),
    }));
  }
  return sqlite.prepare(`
    SELECT
      id,
      dossier_id AS dossierId,
      type,
      status,
      version,
      file_url AS fileUrl,
      file_size_bytes AS fileSizeBytes,
      content_hash AS contentHash,
      metadata_json AS metadataJson,
      created_at AS createdAt
    FROM generated_documents
    WHERE dossier_id = ?
    ORDER BY created_at DESC
  `).all(dossierId).map((item) => ({
    ...item,
    metadata: parseJsonMetadata(item.metadataJson),
  }));
};

const scheduleDossierDeletion = async ({ dossierId, userId }) => {
  const now = new Date().toISOString();
  const purgeAfter = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
  if (hasPostgres) {
    const result = await query(`
      UPDATE dossiers
      SET deleted_at = $2, purge_after = $3, deleted_by = $4, updated_at = $2
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id
    `, [dossierId, now, purgeAfter, userId]);
    return result.rows[0] || null;
  }
  const row = sqlite.prepare(`
    UPDATE dossiers
    SET deleted_at = ?, purge_after = ?, deleted_by = ?, updated_at = ?
    WHERE id = ? AND deleted_at IS NULL
  `).run(now, purgeAfter, userId, now, dossierId);
  return row.changes > 0 ? { id: dossierId } : null;
};

const restoreDossier = async ({ dossierId, userId }) => {
  const now = new Date().toISOString();
  if (hasPostgres) {
    const result = await query(`
      UPDATE dossiers
      SET deleted_at = NULL, purge_after = NULL, deleted_by = NULL, updated_at = $2
      WHERE id = $1 AND deleted_by = $3
      RETURNING id
    `, [dossierId, now, userId]);
    return result.rows[0] || null;
  }
  const row = sqlite.prepare(`
    UPDATE dossiers
    SET deleted_at = NULL, purge_after = NULL, deleted_by = NULL, updated_at = ?
    WHERE id = ? AND deleted_by = ?
  `).run(now, dossierId, userId);
  return row.changes > 0 ? { id: dossierId } : null;
};

const purgePlaceholderDossiersForUser = async ({ userId, deletedBy }) => {
  if (!userId) return { purged: 0, ids: [] };
  const dossiers = await listDossiersForUser({ userId });
  const targets = dossiers.filter((entry) => isEphemeralPlaceholderDossier(entry));
  const ids = [];
  for (const entry of targets) {
    const scheduled = await scheduleDossierDeletion({ dossierId: entry.id, userId: deletedBy || userId });
    if (scheduled?.id) ids.push(scheduled.id);
  }
  return { purged: ids.length, ids };
};

const listTrashedDossiers = async ({ userId }) => {
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        reference,
        user_id AS "userId",
        company_name AS "companyName",
        legal_form AS "legalForm",
        service,
        status,
        deleted_at AS "deletedAt",
        purge_after AS "purgeAfter"
      FROM dossiers
      WHERE deleted_at IS NOT NULL AND deleted_by = $1
      ORDER BY deleted_at DESC
    `, [userId]);
    return result.rows;
  }
  return sqlite.prepare(`
    SELECT
      id,
      reference,
      user_id AS userId,
      company_name AS companyName,
      legal_form AS legalForm,
      service,
      status,
      deleted_at AS deletedAt,
      purge_after AS purgeAfter
    FROM dossiers
    WHERE deleted_at IS NOT NULL AND deleted_by = ?
    ORDER BY deleted_at DESC
  `).all(userId);
};

export {
  createDossier,
  ensureSeedDossier,
  ensureDossierDocuments,
  syncDocumentRequirements,
  listDossierDocuments,
  getDocumentById,
  updateDocumentIntegrity,
  updateDossierDocument,
  clearDossierDocumentAttachment,
  DOCUMENT_STATUSES,
  DOSSIER_DOCUMENT_TEMPLATES,
  getDossier,
  getAllDossiers,
  listDossiersForUser,
  scheduleDossierDeletion,
  restoreDossier,
  purgePlaceholderDossiersForUser,
  listTrashedDossiers,
  getAllPayments,
  updateDossierQuestionnaire,
  claimDossierForUser,
  listDossierEvents,
  transitionDossierStatus,
  upsertPayment,
  getPaymentById,
  getPaymentByProviderId,
  addPaymentEvent,
  hasPaymentEventProviderId,
  upsertGeneratedDocument,
  syncGeneratedStatutesToDossierChecklist,
  markDossierStatutesGenerated,
  listGeneratedDocumentsByDossier,
  listOpsNotesByDossier,
  addOpsNote,
  listDossierMessagesByDossier,
  addDossierMessage,
  markDossierMessageEmailSent,
  updateDossierOpsFields,
  recordDossierSignatureTimelineEvent,
};

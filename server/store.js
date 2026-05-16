import { randomUUID } from 'node:crypto';
import { DOSSIER_STATUSES, evaluateTransition, ROLE } from './stateMachine.js';
import { hasPostgres, query, sqlite } from './dbClient.js';

const nowIso = () => new Date().toISOString();
const makeShortReference = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let block = '';
  for (let index = 0; index < 6; index += 1) {
    block += chars[Math.floor(Math.random() * chars.length)];
  }
  return `GF-${block}`;
};
const DOCUMENT_STATUSES = Object.freeze({
  REQUESTED: 'requested',
  UPLOADED: 'uploaded',
  UNDER_REVIEW: 'under_review',
  VALID: 'valid',
  INVALID: 'invalid',
});

const DOSSIER_DOCUMENT_TEMPLATES = Object.freeze([
  { key: 'identity_proof', label: "Piece d'identite", required: true },
  { key: 'address_proof', label: 'Justificatif de domicile', required: true },
  { key: 'proxy_mandate', label: 'Procuration signee', required: false },
  { key: 'signed_statutes', label: 'Statuts signes', required: true },
  { key: 'capital_certificate', label: 'Attestation depot capital', required: false },
  { key: 'legal_notice_certificate', label: 'Attestation annonce legale', required: false },
  { key: 'registered_office_proof', label: 'Justificatif siege social', required: true },
  { key: 'ubo_declaration', label: 'Declaration beneficiaires effectifs', required: false },
  { key: 'manager_non_conviction', label: 'Declaration non-condamnation et filiation', required: false },
  { key: 'regulated_activity_proof', label: 'Autorisation activite reglementee', required: false },
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
  companyName = 'Projet Greffio',
  legalForm = 'SASU',
  service = 'creation-sasu',
  status = DOSSIER_STATUSES.QUOTE_GENERATED,
}) => {
  const createdAt = nowIso();
  const reference = makeShortReference();
  const dossier = {
    id: `dos_${randomUUID()}`,
    reference,
    userId,
    companyName,
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
  return dossier;
};

const ensureDossierDocuments = async (dossierId) => {
  const createdAt = nowIso();
  if (hasPostgres) {
    for (const template of DOSSIER_DOCUMENT_TEMPLATES) {
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
  for (const template of DOSSIER_DOCUMENT_TEMPLATES) {
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
      metadata: row.metadataJson ? JSON.parse(row.metadataJson) : {},
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
    metadata: row.metadataJson ? JSON.parse(row.metadataJson) : {},
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
        rejected_reason = $10,
        uploaded_at = COALESCE($11, uploaded_at),
        reviewed_at = COALESCE($12, reviewed_at),
        reviewer_id = $13,
        updated_at = $14
      WHERE dossier_id = $15 AND doc_key = $16
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

const getDossier = async (dossierId) => {
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
      WHERE id = $1
      LIMIT 1
    `, [dossierId]);
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
      WHERE id = ?
    `)
    .get(dossierId) || null;
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
      ORDER BY created_at DESC
    `)
    .all();
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

  if (hasPostgres) {
    await query(`
      UPDATE dossiers
      SET data_json = $1, progress_percent = $2, updated_at = $3
      WHERE id = $4
    `, [JSON.stringify(mergedData), nextProgress, updatedAt, dossierId]);
  } else {
    sqlite.prepare(`
      UPDATE dossiers
      SET data_json = ?, progress_percent = ?, updated_at = ?
      WHERE id = ?
    `).run(JSON.stringify(mergedData), nextProgress, updatedAt, dossierId);
  }
  return getDossier(dossierId);
};

const getAllPayments = async () => {
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        dossier_id AS "dossierId",
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
    .every((item) => item.status === DOCUMENT_STATUSES.VALID);
  const mandateDoc = documents.find((item) => item.docKey === 'proxy_mandate');
  const hasMandateSigned = Boolean(mandateDoc && mandateDoc.status === DOCUMENT_STATUSES.VALID);
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
    dossierId: payload.dossierId,
    userId: payload.userId || null,
    offerCode: payload.offerCode,
    amountTotalCents: payload.amountTotalCents,
    amountServiceCents: payload.amountServiceCents,
    amountLegalFeesCents: payload.amountLegalFeesCents,
    currency: payload.currency || 'EUR',
    status: payload.status || 'created',
    provider: payload.provider || 'payplug',
    providerPaymentId: payload.providerPaymentId || null,
    providerPayload: payload.providerPayload || {},
    createdAt: payload.createdAt || nowIso(),
    paidAt: payload.paidAt || null,
    failedAt: payload.failedAt || null,
    refundedAt: payload.refundedAt || null,
    updatedAt: nowIso(),
  };
  if (hasPostgres) {
    await query(`
      INSERT INTO payments (
        id, dossier_id, user_id, offer_code, amount_total_cents, amount_service_cents, amount_legal_fees_cents,
        currency, status, provider, provider_payment_id, provider_payload_json, created_at, paid_at, failed_at,
        refunded_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
      )
      ON CONFLICT (id) DO UPDATE SET
        dossier_id=EXCLUDED.dossier_id,
        user_id=EXCLUDED.user_id,
        offer_code=EXCLUDED.offer_code,
        amount_total_cents=EXCLUDED.amount_total_cents,
        amount_service_cents=EXCLUDED.amount_service_cents,
        amount_legal_fees_cents=EXCLUDED.amount_legal_fees_cents,
        currency=EXCLUDED.currency,
        status=EXCLUDED.status,
        provider=EXCLUDED.provider,
        provider_payment_id=EXCLUDED.provider_payment_id,
        provider_payload_json=EXCLUDED.provider_payload_json,
        paid_at=EXCLUDED.paid_at,
        failed_at=EXCLUDED.failed_at,
        refunded_at=EXCLUDED.refunded_at,
        updated_at=EXCLUDED.updated_at
    `, [
      payment.id,
      payment.dossierId,
      payment.userId,
      payment.offerCode,
      payment.amountTotalCents,
      payment.amountServiceCents,
      payment.amountLegalFeesCents,
      payment.currency,
      payment.status,
      payment.provider,
      payment.providerPaymentId,
      JSON.stringify(payment.providerPayload || {}),
      payment.createdAt,
      payment.paidAt,
      payment.failedAt,
      payment.refundedAt,
      payment.updatedAt,
    ]);
  } else {
    sqlite
      .prepare(`
        INSERT INTO payments (
          id, dossier_id, user_id, offer_code, amount_total_cents, amount_service_cents, amount_legal_fees_cents,
          currency, status, provider, provider_payment_id, provider_payload_json, created_at, paid_at, failed_at,
          refunded_at, updated_at
        ) VALUES (
          @id, @dossierId, @userId, @offerCode, @amountTotalCents, @amountServiceCents, @amountLegalFeesCents,
          @currency, @status, @provider, @providerPaymentId, @providerPayloadJson, @createdAt, @paidAt, @failedAt,
          @refundedAt, @updatedAt
        )
        ON CONFLICT(id) DO UPDATE SET
          dossier_id=excluded.dossier_id,
          user_id=excluded.user_id,
          offer_code=excluded.offer_code,
          amount_total_cents=excluded.amount_total_cents,
          amount_service_cents=excluded.amount_service_cents,
          amount_legal_fees_cents=excluded.amount_legal_fees_cents,
          currency=excluded.currency,
          status=excluded.status,
          provider=excluded.provider,
          provider_payment_id=excluded.provider_payment_id,
          provider_payload_json=excluded.provider_payload_json,
          paid_at=excluded.paid_at,
          failed_at=excluded.failed_at,
          refunded_at=excluded.refunded_at,
          updated_at=excluded.updated_at
      `)
      .run({
        ...payment,
        providerPayloadJson: JSON.stringify(payment.providerPayload || {}),
      });
  }
  return payment;
};

const getPaymentByProviderId = async (providerPaymentId) => {
  let row;
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        dossier_id AS "dossierId",
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
      metadata: item.metadataJson ? JSON.parse(item.metadataJson) : {},
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
    metadata: item.metadataJson ? JSON.parse(item.metadataJson) : {},
  }));
};

export {
  createDossier,
  ensureSeedDossier,
  ensureDossierDocuments,
  listDossierDocuments,
  updateDossierDocument,
  DOCUMENT_STATUSES,
  DOSSIER_DOCUMENT_TEMPLATES,
  getDossier,
  getAllDossiers,
  getAllPayments,
  updateDossierQuestionnaire,
  listDossierEvents,
  transitionDossierStatus,
  upsertPayment,
  getPaymentByProviderId,
  addPaymentEvent,
  hasPaymentEventProviderId,
  upsertGeneratedDocument,
  listGeneratedDocumentsByDossier,
  listOpsNotesByDossier,
  addOpsNote,
  updateDossierOpsFields,
};

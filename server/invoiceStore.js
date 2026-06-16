import { randomUUID } from 'node:crypto';
import { hasPostgres, query, sqlite } from './dbClient.js';

const nowIso = () => new Date().toISOString();

const mapRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    dossierId: row.dossier_id || row.dossierId || null,
    paymentId: row.payment_id || row.paymentId || null,
    userId: row.user_id || row.userId || null,
    invoiceKind: row.invoice_kind || row.invoiceKind || 'dossier_service',
    invoiceNumber: row.invoice_number || row.invoiceNumber || null,
    qontoInvoiceId: row.qonto_invoice_id || row.qontoInvoiceId || null,
    qontoStatus: row.qonto_status || row.qontoStatus || null,
    amountTotalCents: Number(row.amount_total_cents ?? row.amountTotalCents ?? 0),
    currency: row.currency || 'EUR',
    customerEmail: row.customer_email || row.customerEmail || null,
    customerName: row.customer_name || row.customerName || null,
    clientDeliveryStatus: row.client_delivery_status || row.clientDeliveryStatus || 'pending_ops_review',
    opsReviewedBy: row.ops_reviewed_by || row.opsReviewedBy || null,
    opsReviewedAt: row.ops_reviewed_at || row.opsReviewedAt || null,
    clientSentAt: row.client_sent_at || row.clientSentAt || null,
    metadata: row.metadata_json || row.metadataJson
      ? JSON.parse(row.metadata_json || row.metadataJson)
      : {},
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
  };
};

export const upsertInvoice = async (input) => {
  const now = nowIso();
  const record = {
    id: input.id || randomUUID(),
    dossierId: input.dossierId || null,
    paymentId: input.paymentId || null,
    userId: input.userId || null,
    invoiceKind: input.invoiceKind || 'dossier_service',
    invoiceNumber: input.invoiceNumber || null,
    qontoInvoiceId: input.qontoInvoiceId || null,
    qontoStatus: input.qontoStatus || null,
    amountTotalCents: input.amountTotalCents,
    currency: input.currency || 'EUR',
    customerEmail: input.customerEmail,
    customerName: input.customerName || null,
    clientDeliveryStatus: input.clientDeliveryStatus || 'pending_ops_review',
    opsReviewedBy: input.opsReviewedBy || null,
    opsReviewedAt: input.opsReviewedAt || null,
    clientSentAt: input.clientSentAt || null,
    metadata: input.metadata || {},
    createdAt: input.createdAt || now,
    updatedAt: now,
  };

  if (hasPostgres) {
    await query(`
      INSERT INTO invoices (
        id, dossier_id, payment_id, user_id, invoice_kind, invoice_number,
        qonto_invoice_id, qonto_status, amount_total_cents, currency,
        customer_email, customer_name, client_delivery_status,
        ops_reviewed_by, ops_reviewed_at, client_sent_at, metadata_json,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13,
        $14, $15, $16, $17,
        $18, $19
      )
      ON CONFLICT (id) DO UPDATE SET
        qonto_invoice_id = COALESCE(EXCLUDED.qonto_invoice_id, invoices.qonto_invoice_id),
        qonto_status = COALESCE(EXCLUDED.qonto_status, invoices.qonto_status),
        client_delivery_status = EXCLUDED.client_delivery_status,
        ops_reviewed_by = COALESCE(EXCLUDED.ops_reviewed_by, invoices.ops_reviewed_by),
        ops_reviewed_at = COALESCE(EXCLUDED.ops_reviewed_at, invoices.ops_reviewed_at),
        client_sent_at = COALESCE(EXCLUDED.client_sent_at, invoices.client_sent_at),
        metadata_json = EXCLUDED.metadata_json,
        updated_at = EXCLUDED.updated_at
    `, [
      record.id,
      record.dossierId,
      record.paymentId,
      record.userId,
      record.invoiceKind,
      record.invoiceNumber,
      record.qontoInvoiceId,
      record.qontoStatus,
      record.amountTotalCents,
      record.currency,
      record.customerEmail,
      record.customerName,
      record.clientDeliveryStatus,
      record.opsReviewedBy,
      record.opsReviewedAt,
      record.clientSentAt,
      JSON.stringify(record.metadata),
      record.createdAt,
      record.updatedAt,
    ]);
    return record;
  }

  sqlite.prepare(`
    INSERT INTO invoices (
      id, dossier_id, payment_id, user_id, invoice_kind, invoice_number,
      qonto_invoice_id, qonto_status, amount_total_cents, currency,
      customer_email, customer_name, client_delivery_status,
      ops_reviewed_by, ops_reviewed_at, client_sent_at, metadata_json,
      created_at, updated_at
    ) VALUES (
      @id, @dossierId, @paymentId, @userId, @invoiceKind, @invoiceNumber,
      @qontoInvoiceId, @qontoStatus, @amountTotalCents, @currency,
      @customerEmail, @customerName, @clientDeliveryStatus,
      @opsReviewedBy, @opsReviewedAt, @clientSentAt, @metadataJson,
      @createdAt, @updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      qonto_invoice_id = COALESCE(excluded.qonto_invoice_id, qonto_invoice_id),
      qonto_status = COALESCE(excluded.qonto_status, qonto_status),
      client_delivery_status = excluded.client_delivery_status,
      ops_reviewed_by = COALESCE(excluded.ops_reviewed_by, ops_reviewed_by),
      ops_reviewed_at = COALESCE(excluded.ops_reviewed_at, ops_reviewed_at),
      client_sent_at = COALESCE(excluded.client_sent_at, client_sent_at),
      metadata_json = excluded.metadata_json,
      updated_at = excluded.updated_at
  `).run({
    ...record,
    metadataJson: JSON.stringify(record.metadata),
  });
  return record;
};

export const getInvoiceById = async (id) => {
  if (hasPostgres) {
    const result = await query('SELECT * FROM invoices WHERE id = $1 LIMIT 1', [id]);
    return mapRow(result.rows[0]);
  }
  return mapRow(sqlite.prepare('SELECT * FROM invoices WHERE id = ? LIMIT 1').get(id));
};

export const getInvoiceByPaymentId = async (paymentId) => {
  if (hasPostgres) {
    const result = await query('SELECT * FROM invoices WHERE payment_id = $1 LIMIT 1', [paymentId]);
    return mapRow(result.rows[0]);
  }
  return mapRow(sqlite.prepare('SELECT * FROM invoices WHERE payment_id = ? LIMIT 1').get(paymentId));
};

export const listInvoicesPendingOpsReview = async ({ limit = 50 } = {}) => {
  const capped = Math.min(Math.max(Number(limit) || 50, 1), 200);
  if (hasPostgres) {
    const result = await query(`
      SELECT * FROM invoices
      WHERE client_delivery_status = 'pending_ops_review'
      ORDER BY created_at DESC
      LIMIT $1
    `, [capped]);
    return result.rows.map(mapRow);
  }
  return sqlite.prepare(`
    SELECT * FROM invoices
    WHERE client_delivery_status = 'pending_ops_review'
    ORDER BY created_at DESC
    LIMIT ?
  `).all(capped).map(mapRow);
};

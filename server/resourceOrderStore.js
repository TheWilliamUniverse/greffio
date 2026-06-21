import { randomUUID } from 'node:crypto';
import { hasPostgres, query, sqlite } from './dbClient.js';
import { resolveResourceOrderPublicReference } from './utils/resourceOrderReference.js';
import { makeResourceOrderPublicReference } from './utils/resourceOrderReference.js';

const nowIso = () => new Date().toISOString();

const parseJsonField = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return {};
  }
};

const ORDER_WITH_PAYMENT_SELECT = `
  ro.*,
  p.status AS payment_status,
  p.refunded_at AS payment_refunded_at,
  p.metadata_json AS payment_metadata_json
`;

const mapRow = (row) => {
  if (!row) return null;
  const metadata = row.metadata_json ? JSON.parse(row.metadata_json) : (row.metadata || {});
  const paymentMetadata = parseJsonField(row.payment_metadata_json || row.paymentMetadataJson);
  return {
    id: row.id,
    userId: row.user_id || row.userId,
    serviceId: row.service_id || row.serviceId,
    serviceTitle: row.service_title || row.serviceTitle,
    companyName: row.company_name || row.companyName || null,
    siren: row.siren || null,
    dossierId: row.dossier_id || row.dossierId || null,
    contactEmail: row.contact_email || row.contactEmail,
    status: row.status,
    fulfillmentMode: row.fulfillment_mode || row.fulfillmentMode || 'manual_ops',
    priceTtc: Number(row.price_ttc_cents ?? row.priceTtcCents ?? 0) / 100,
    priceTtcCents: Number(row.price_ttc_cents ?? row.priceTtcCents ?? 0),
    notes: row.notes || null,
    paymentId: row.payment_id || row.paymentId || null,
    providerRef: row.provider_ref || row.providerRef || null,
    metadata,
    publicReference: resolveResourceOrderPublicReference({
      metadata,
      serviceTitle: row.service_title || row.serviceTitle,
      createdAt: row.created_at || row.createdAt,
    }),
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
    paidAt: row.paid_at || row.paidAt || null,
    completedAt: row.completed_at || row.completedAt || null,
    paymentStatus: row.payment_status || row.paymentStatus || null,
    refundedAt: row.payment_refunded_at || row.paymentRefundedAt || null,
    refundPending: paymentMetadata.refundPending === true,
  };
};

export const createResourceOrder = async ({
  userId,
  serviceId,
  serviceTitle,
  companyName,
  siren,
  dossierId,
  contactEmail,
  status = 'draft',
  fulfillmentMode = 'manual_ops',
  priceTtcCents,
  notes,
  metadata = {},
}) => {
  const publicReference = makeResourceOrderPublicReference();
  const orderMetadata = {
    ...metadata,
    publicReference,
  };
  const order = {
    id: randomUUID(),
    userId,
    serviceId,
    serviceTitle,
    companyName: companyName || null,
    siren: siren || null,
    dossierId: dossierId || null,
    contactEmail,
    status,
    fulfillmentMode,
    priceTtcCents: Number(priceTtcCents) || 0,
    notes: notes || null,
    paymentId: null,
    providerRef: null,
    metadata: orderMetadata,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    paidAt: null,
    completedAt: null,
  };

  if (hasPostgres) {
    await query(`
      INSERT INTO resource_orders (
        id, user_id, service_id, service_title, company_name, siren, dossier_id,
        contact_email, status, fulfillment_mode, price_ttc_cents, notes,
        payment_id, provider_ref, metadata_json, created_at, updated_at, paid_at, completed_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    `, [
      order.id,
      order.userId,
      order.serviceId,
      order.serviceTitle,
      order.companyName,
      order.siren,
      order.dossierId,
      order.contactEmail,
      order.status,
      order.fulfillmentMode,
      order.priceTtcCents,
      order.notes,
      order.paymentId,
      order.providerRef,
      JSON.stringify(order.metadata || {}),
      order.createdAt,
      order.updatedAt,
      order.paidAt,
      order.completedAt,
    ]);
  } else {
    sqlite.prepare(`
      INSERT INTO resource_orders (
        id, user_id, service_id, service_title, company_name, siren, dossier_id,
        contact_email, status, fulfillment_mode, price_ttc_cents, notes,
        payment_id, provider_ref, metadata_json, created_at, updated_at, paid_at, completed_at
      ) VALUES (
        @id, @userId, @serviceId, @serviceTitle, @companyName, @siren, @dossierId,
        @contactEmail, @status, @fulfillmentMode, @priceTtcCents, @notes,
        @paymentId, @providerRef, @metadataJson, @createdAt, @updatedAt, @paidAt, @completedAt
      )
    `).run({
      ...order,
      metadataJson: JSON.stringify(order.metadata || {}),
    });
  }

  return getResourceOrderById(order.id);
};

export const getResourceOrderById = async (orderId) => {
  if (hasPostgres) {
    const result = await query(
      `SELECT ${ORDER_WITH_PAYMENT_SELECT}
       FROM resource_orders ro
       LEFT JOIN payments p ON p.id = ro.payment_id
       WHERE ro.id = $1
       LIMIT 1`,
      [orderId],
    );
    return mapRow(result.rows[0]);
  }
  const row = sqlite.prepare(
    `SELECT ${ORDER_WITH_PAYMENT_SELECT}
     FROM resource_orders ro
     LEFT JOIN payments p ON p.id = ro.payment_id
     WHERE ro.id = ?
     LIMIT 1`,
  ).get(orderId);
  return mapRow(row);
};

export const listResourceOrdersByUser = async (userId) => {
  if (hasPostgres) {
    const result = await query(
      `SELECT ${ORDER_WITH_PAYMENT_SELECT}
       FROM resource_orders ro
       LEFT JOIN payments p ON p.id = ro.payment_id
       WHERE ro.user_id = $1
       ORDER BY ro.created_at DESC
       LIMIT 100`,
      [userId],
    );
    return result.rows.map(mapRow);
  }
  return sqlite.prepare(
    `SELECT ${ORDER_WITH_PAYMENT_SELECT}
     FROM resource_orders ro
     LEFT JOIN payments p ON p.id = ro.payment_id
     WHERE ro.user_id = ?
     ORDER BY ro.created_at DESC
     LIMIT 100`,
  ).all(userId).map(mapRow);
};

export const listResourceOrdersForOps = async ({ status } = {}) => {
  const sqlBase = `SELECT ${ORDER_WITH_PAYMENT_SELECT}
    FROM resource_orders ro
    LEFT JOIN payments p ON p.id = ro.payment_id`;
  if (hasPostgres) {
    if (status) {
      const result = await query(
        `${sqlBase} WHERE ro.status = $1 ORDER BY ro.created_at DESC LIMIT 200`,
        [status],
      );
      return result.rows.map(mapRow);
    }
    const result = await query(`${sqlBase} ORDER BY ro.created_at DESC LIMIT 200`);
    return result.rows.map(mapRow);
  }
  if (status) {
    return sqlite.prepare(
      `${sqlBase} WHERE ro.status = ? ORDER BY ro.created_at DESC LIMIT 200`,
    ).all(status).map(mapRow);
  }
  return sqlite.prepare(`${sqlBase} ORDER BY ro.created_at DESC LIMIT 200`).all().map(mapRow);
};

export const updateResourceOrder = async (orderId, patch) => {
  const existing = await getResourceOrderById(orderId);
  if (!existing) return null;

  const next = {
    ...existing,
    ...patch,
    updatedAt: nowIso(),
  };

  if (hasPostgres) {
    await query(`
      UPDATE resource_orders SET
        status = $2,
        fulfillment_mode = $3,
        payment_id = $4,
        provider_ref = $5,
        notes = COALESCE($6, notes),
        metadata_json = $7,
        updated_at = $8,
        paid_at = $9,
        completed_at = $10
      WHERE id = $1
    `, [
      orderId,
      next.status,
      next.fulfillmentMode,
      next.paymentId,
      next.providerRef,
      patch.notes ?? existing.notes,
      JSON.stringify(next.metadata || {}),
      next.updatedAt,
      next.paidAt,
      next.completedAt,
    ]);
  } else {
    sqlite.prepare(`
      UPDATE resource_orders SET
        status = @status,
        fulfillment_mode = @fulfillmentMode,
        payment_id = @paymentId,
        provider_ref = @providerRef,
        notes = @notes,
        metadata_json = @metadataJson,
        updated_at = @updatedAt,
        paid_at = @paidAt,
        completed_at = @completedAt
      WHERE id = @id
    `).run({
      id: orderId,
      status: next.status,
      fulfillmentMode: next.fulfillmentMode,
      paymentId: next.paymentId,
      providerRef: next.providerRef,
      notes: patch.notes ?? existing.notes,
      metadataJson: JSON.stringify(next.metadata || {}),
      updatedAt: next.updatedAt,
      paidAt: next.paidAt,
      completedAt: next.completedAt,
    });
  }

  return getResourceOrderById(orderId);
};

export const deleteResourceOrderById = async (orderId) => {
  if (hasPostgres) {
    const result = await query('DELETE FROM resource_orders WHERE id = $1', [orderId]);
    return result.rowCount > 0;
  }
  const result = sqlite.prepare('DELETE FROM resource_orders WHERE id = ?').run(orderId);
  return result.changes > 0;
};

export const deleteResourceOrdersByIds = async (orderIds = []) => {
  const ids = [...new Set(orderIds.map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) return 0;
  if (hasPostgres) {
    const result = await query('DELETE FROM resource_orders WHERE id = ANY($1::text[])', [ids]);
    return result.rowCount;
  }
  const stmt = sqlite.prepare('DELETE FROM resource_orders WHERE id = ?');
  let deleted = 0;
  for (const id of ids) {
    deleted += stmt.run(id).changes;
  }
  return deleted;
};

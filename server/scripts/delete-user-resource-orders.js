import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasPostgres, query } from '../dbClient.js';
import { sqlite } from '../database.js';
import { getUserByEmail } from '../authStore.js';
import { deleteResourceOrdersByIds } from '../resourceOrderStore.js';

dotenv.config({ quiet: true });

const normalizeEmail = (email) => String(email || '').toLowerCase().trim();

const email = normalizeEmail(process.env.DELETE_USER_EMAIL || process.argv[2] || '');
const confirm = process.env.CONFIRM_DELETE_USER_RESOURCE_ORDERS === 'YES';
const deleteAll = process.env.DELETE_ALL_STATUSES === 'YES';

const listUserResourceOrders = async (userId) => {
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        service_title AS "serviceTitle",
        status,
        price_ttc_cents AS "priceTtcCents",
        created_at AS "createdAt"
      FROM resource_orders
      WHERE user_id = $1
      ORDER BY created_at ASC
    `, [userId]);
    return result.rows;
  }
  return sqlite.prepare(`
    SELECT
      id,
      service_title AS serviceTitle,
      status,
      price_ttc_cents AS priceTtcCents,
      created_at AS createdAt
    FROM resource_orders
    WHERE user_id = ?
    ORDER BY created_at ASC
  `).all(userId);
};

const writeReport = (lines) => {
  const reportDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/reports');
  fs.mkdirSync(reportDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeEmail = email.replace(/[^a-z0-9@._-]/gi, '_');
  const reportPath = path.join(reportDir, `resource-orders-delete-${safeEmail}-${stamp}.log`);
  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');
  process.stdout.write(`REPORT:${reportPath}\n`);
};

const run = async () => {
  if (!confirm) {
    throw new Error('CONFIRM_DELETE_USER_RESOURCE_ORDERS=YES required');
  }
  if (!email || !email.includes('@')) {
    throw new Error('DELETE_USER_EMAIL required');
  }

  const user = await getUserByEmail(email);
  if (!user) {
    throw new Error(`USER_NOT_FOUND:${email}`);
  }

  const orders = await listUserResourceOrders(user.id);
  if (orders.length === 0) {
    process.stdout.write(`NO_ORDERS:${email}\n`);
    return;
  }

  const cancellableStatuses = new Set(['draft', 'pending_payment', 'cancelled']);
  const targetOrders = deleteAll
    ? orders
    : orders.filter((order) => cancellableStatuses.has(order.status));

  const reportLines = [
    `email=${email}`,
    `userId=${user.id}`,
    `found=${orders.length}`,
    `target=${targetOrders.length}`,
    `deleteAll=${deleteAll ? 'yes' : 'no'}`,
    '---',
  ];

  process.stdout.write(`FOUND:${orders.length} order(s) for ${email}\n`);
  for (const order of orders) {
    const line = `  - ${order.id} | ${order.serviceTitle} | ${order.status} | ${(Number(order.priceTtcCents || 0) / 100).toFixed(2)} EUR`;
    process.stdout.write(`${line}\n`);
    reportLines.push(line.trim());
  }

  if (!targetOrders.length) {
    process.stdout.write(`NOTHING_TO_DELETE:${email}\n`);
    writeReport(reportLines);
    return;
  }

  const deleted = await deleteResourceOrdersByIds(targetOrders.map((order) => order.id));
  reportLines.push('---', `deleted=${deleted}`);
  process.stdout.write(`DELETED:${deleted} order(s) for ${email}\n`);
  writeReport(reportLines);
};

run().catch((error) => {
  process.stderr.write(`${error.message || 'DELETE_USER_RESOURCE_ORDERS_FAILED'}\n`);
  process.exit(1);
});

import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { hasPostgres, query, sqlite } from '../dbClient.js';
import {
  deleteAllUsers,
  listAllUserRecords,
  replaceUserRecord,
} from '../authStore.js';

dotenv.config({ quiet: true });

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const backupDir = path.resolve(scriptDir, '..', 'data', 'backups');

const ADMIN_EMAILS = new Set([
  'william@willentreprises.com',
  'nobatene@willentreprises.com',
  'ibtissam@willentreprises.com',
]);

const COMPANY = {
  name: 'WILLIAM ESTABLISHMENTS',
  service: 'Greffio',
  domain: 'greffio.willentreprises.com',
};

const ENSURE_ACCOUNTS = [
  {
    email: 'william@willentreprises.com',
    firstName: 'William',
    lastName: 'Abdou',
    role: 'ADMIN',
    company: { ...COMPANY, jobTitle: 'Président – Co-fondateur' },
  },
  {
    email: 'nobatene@willentreprises.com',
    firstName: 'Nobatène',
    lastName: 'Abdou',
    role: 'ADMIN',
    company: { ...COMPANY, jobTitle: 'Directeur Général – Co-fondateur' },
  },
  {
    email: 'ibtissam@willentreprises.com',
    firstName: 'Ibtissam',
    lastName: 'Abdou',
    role: 'ADMIN',
    company: { ...COMPANY, jobTitle: 'Cheffe de cabinet' },
  },
  {
    email: 'william.abdou01@gmail.com',
    firstName: 'William',
    lastName: 'Abdou',
    role: 'CLIENT',
    company: COMPANY,
  },
];

const normalizeEmail = (email) => String(email || '').toLowerCase().trim();

const generatePassword = () => randomBytes(14).toString('base64url');

const resolveSharedPassword = () => {
  const candidates = [
    process.env.ACCOUNT_REFRESH_PASSWORD,
    process.env.ADMIN_BOOTSTRAP_PASSWORD,
    process.env.INTERNAL_USER_PASSWORD,
  ];
  for (const value of candidates) {
    const password = String(value || '').trim();
    if (password.length >= 12) return password;
  }
  return null;
};

const countRows = async (table) => {
  if (hasPostgres) {
    const result = await query(`SELECT COUNT(*)::int AS count FROM ${table}`);
    return Number(result.rows[0]?.count || 0);
  }
  const row = sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get();
  return Number(row?.count || 0);
};

const buildTargetRecords = (existingRecords) => {
  const byEmail = new Map(
    existingRecords.map((record) => [normalizeEmail(record.email), { ...record, source: 'existing' }]),
  );

  for (const template of ENSURE_ACCOUNTS) {
    const email = normalizeEmail(template.email);
    const current = byEmail.get(email);
    if (current) {
      byEmail.set(email, {
        ...current,
        firstName: template.firstName,
        lastName: template.lastName,
        role: template.role,
        companyJson: JSON.stringify(template.company),
        source: 'existing+template',
      });
      continue;
    }
    byEmail.set(email, {
      id: `usr_${randomUUID()}`,
      email,
      firstName: template.firstName,
      lastName: template.lastName,
      role: template.role,
      companyJson: JSON.stringify(template.company),
      profileJson: null,
      phone: null,
      createdAt: new Date().toISOString(),
      source: 'created',
    });
  }

  return Array.from(byEmail.values()).map((record) => ({
    ...record,
    role: ADMIN_EMAILS.has(normalizeEmail(record.email))
      ? 'ADMIN'
      : String(record.role || 'CLIENT').toUpperCase(),
  }));
};

const run = async () => {
  if (process.env.CONFIRM_REFRESH_ALL_ACCOUNTS !== 'YES') {
    throw new Error('CONFIRM_REFRESH_ALL_ACCOUNTS=YES required');
  }

  const sharedPassword = resolveSharedPassword();
  const existingRecords = await listAllUserRecords();
  const targetRecords = buildTargetRecords(existingRecords);

  const statsBefore = {
    users: existingRecords.length,
    dossiers: await countRows('dossiers'),
    documents: await countRows('documents'),
    payments: await countRows('payments'),
  };

  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(
    backupDir,
    `users-refresh-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  );
  fs.writeFileSync(backupPath, JSON.stringify({
    exportedAt: new Date().toISOString(),
    statsBefore,
    existingRecords,
    targetRecords: targetRecords.map(({ id, email, role, firstName, lastName, source }) => ({
      id, email, role, firstName, lastName, source,
    })),
  }, null, 2));

  await deleteAllUsers();

  const recreated = [];
  for (const record of targetRecords) {
    const password = sharedPassword || generatePassword();
    await replaceUserRecord({
      id: record.id,
      email: record.email,
      password,
      firstName: record.firstName,
      lastName: record.lastName,
      role: record.role,
      companyJson: record.companyJson || null,
      profileJson: record.profileJson || null,
      phone: record.phone || null,
      createdAt: record.createdAt,
    });
    recreated.push({
      email: normalizeEmail(record.email),
      id: record.id,
      role: record.role,
      source: record.source,
      temporaryPassword: sharedPassword ? '[shared env password]' : password,
    });
  }

  const statsAfter = {
    users: await countRows('users'),
    dossiers: await countRows('dossiers'),
    documents: await countRows('documents'),
    payments: await countRows('payments'),
  };

  process.stdout.write(`${JSON.stringify({
    ok: true,
    emailsSent: false,
    backupPath,
    statsBefore,
    statsAfter,
    dataConserved: statsBefore.dossiers === statsAfter.dossiers
      && statsBefore.documents === statsAfter.documents
      && statsBefore.payments === statsAfter.payments,
    accounts: recreated,
    sharedPasswordInUse: Boolean(sharedPassword),
  }, null, 2)}\n`);
};

run().catch((error) => {
  process.stderr.write(`${error.message || 'REFRESH_ALL_ACCOUNTS_FAILED'}\n`);
  process.exit(1);
});

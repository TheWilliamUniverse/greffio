import dotenv from 'dotenv';
import { hasPostgres, query } from '../dbClient.js';
import { getUserByEmail } from '../authStore.js';
import { deleteDocumentFromConfiguredStorage } from '../services/objectStorage.js';

dotenv.config({ quiet: true });

const normalizeEmail = (email) => String(email || '').toLowerCase().trim();

const email = normalizeEmail(process.env.DELETE_USER_EMAIL || process.argv[2] || '');
const confirm = process.env.CONFIRM_DELETE_USER_DOSSIERS === 'YES';

const listUserDossiers = async (userId) => {
  const result = await query(`
    SELECT id, reference, company_name AS "companyName", status, deleted_at AS "deletedAt"
    FROM dossiers
    WHERE user_id = $1
    ORDER BY created_at ASC
  `, [userId]);
  return result.rows;
};

const listStorageUrlsForDossier = async (dossierId) => {
  const docs = await query(`
    SELECT storage_url AS "storageUrl", file_url AS "fileUrl"
    FROM documents
    WHERE dossier_id = $1
  `, [dossierId]);
  const generated = await query(`
    SELECT file_url AS "fileUrl"
    FROM generated_documents
    WHERE dossier_id = $1
  `, [dossierId]);
  const urls = new Set();
  for (const row of [...docs.rows, ...generated.rows]) {
    for (const value of [row.storageUrl, row.fileUrl]) {
      const url = String(value || '').trim();
      if (url) urls.add(url);
    }
  }
  return [...urls];
};

const run = async () => {
  if (!confirm) {
    throw new Error('CONFIRM_DELETE_USER_DOSSIERS=YES required');
  }
  if (!email || !email.includes('@')) {
    throw new Error('DELETE_USER_EMAIL required');
  }
  if (!hasPostgres) {
    throw new Error('POSTGRES_REQUIRED');
  }

  const user = await getUserByEmail(email);
  if (!user) {
    throw new Error(`USER_NOT_FOUND:${email}`);
  }

  const dossiers = await listUserDossiers(user.id);
  if (dossiers.length === 0) {
    process.stdout.write(`NO_DOSSIERS:${email}\n`);
    return;
  }

  process.stdout.write(`FOUND:${dossiers.length} dossier(s) for ${email}\n`);
  for (const dossier of dossiers) {
    process.stdout.write(`  - ${dossier.id} | ${dossier.reference || '–'} | ${dossier.companyName} | ${dossier.status}${dossier.deletedAt ? ' (corbeille)' : ''}\n`);
  }

  let storageDeleted = 0;
  for (const dossier of dossiers) {
    const urls = await listStorageUrlsForDossier(dossier.id);
    for (const url of urls) {
      const result = await deleteDocumentFromConfiguredStorage(url);
      if (result.deleted) storageDeleted += 1;
    }
  }

  const deleteResult = await query('DELETE FROM dossiers WHERE user_id = $1', [user.id]);
  process.stdout.write(`DELETED:${deleteResult.rowCount} dossier(s), storage_files:${storageDeleted}\n`);
};

run().catch((error) => {
  process.stderr.write(`${error.message || 'DELETE_USER_DOSSIERS_FAILED'}\n`);
  process.exit(1);
});

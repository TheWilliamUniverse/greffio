import dotenv from 'dotenv';
import { hasPostgres } from '../dbClient.js';
import { getUserByEmail } from '../authStore.js';
import { listDossiersForUser, purgePlaceholderDossiersForUser } from '../store.js';
import { isEphemeralPlaceholderDossier } from '../utils/placeholderDossier.js';

dotenv.config({ quiet: true });

const email = String(process.env.PURGE_USER_EMAIL || process.argv[2] || '').toLowerCase().trim();
const confirm = process.env.CONFIRM_PURGE_PLACEHOLDERS === 'YES';

const run = async () => {
  if (!confirm) {
    throw new Error('CONFIRM_PURGE_PLACEHOLDERS=YES required');
  }
  if (!email || !email.includes('@')) {
    throw new Error('PURGE_USER_EMAIL or argv email required');
  }
  if (!hasPostgres) {
    throw new Error('POSTGRES_REQUIRED');
  }

  const user = await getUserByEmail(email);
  if (!user) throw new Error(`USER_NOT_FOUND:${email}`);

  const dossiers = await listDossiersForUser({ userId: user.id });
  const targets = dossiers.filter((entry) => isEphemeralPlaceholderDossier(entry));
  process.stdout.write(`USER:${email} PLACEHOLDERS:${targets.length}\n`);
  for (const entry of targets) {
    process.stdout.write(`  - ${entry.id} | ${entry.reference || '–'} | ${entry.companyName} | ${entry.status}\n`);
  }

  const result = await purgePlaceholderDossiersForUser({ userId: user.id, deletedBy: user.id });
  process.stdout.write(`PURGED:${result.purged}\n`);
};

run().catch((error) => {
  process.stderr.write(`${error.message || 'PURGE_FAILED'}\n`);
  process.exit(1);
});

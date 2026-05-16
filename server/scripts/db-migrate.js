import dotenv from 'dotenv';
import { runPostgresMigrations } from '../dbClient.js';

dotenv.config({ quiet: true });

const run = async () => {
  const applied = await runPostgresMigrations();
  if (applied.length === 0) {
    process.stdout.write('NO_MIGRATIONS_TO_APPLY\n');
    return;
  }
  process.stdout.write(`MIGRATIONS_APPLIED:${applied.join(',')}\n`);
};

run().catch(() => {
  process.stdout.write('DB_MIGRATE_FAILED\n');
  process.exit(1);
});

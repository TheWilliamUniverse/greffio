#!/usr/bin/env node
import dotenv from 'dotenv';
import { migrateAllLocalDocumentsToS3 } from '../services/storageMigrationService.js';

dotenv.config({ override: process.env.NODE_ENV === 'production' });

const dryRun = process.argv.includes('--dry-run');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : 200;

const run = async () => {
  const summary = await migrateAllLocalDocumentsToS3({ dryRun, limit });
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(summary, null, 2));
  if (summary.failed > 0) process.exit(1);
};

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('MIGRATE_LOCAL_DOCUMENTS_TO_S3_FAILED', error);
  process.exit(1);
});

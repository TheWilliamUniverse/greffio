#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { uploadDocumentToConfiguredStorage } from '../services/objectStorage.js';

const rootDir = path.resolve(process.cwd(), 'server', 'data', 'uploads');
const dryRun = process.argv.includes('--dry-run');

const listFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(entryPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
      files.push(entryPath);
    }
  }
  return files;
};

const run = async () => {
  const files = listFiles(rootDir);
  let uploaded = 0;
  let skipped = 0;
  for (const filePath of files) {
    const parts = filePath.split(path.sep);
    const dossierId = parts[parts.length - 2] || 'unknown';
    const filename = path.basename(filePath);
    if (dryRun) {
      // eslint-disable-next-line no-console
      console.log(`[dry-run] ${dossierId}/${filename}`);
      skipped += 1;
      continue;
    }
    try {
      const result = await uploadDocumentToConfiguredStorage({
        dossierId,
        filename,
        localFilePath: filePath,
      });
      // eslint-disable-next-line no-console
      console.log(`[uploaded] ${dossierId}/${filename} -> ${result.storageUrl}`);
      uploaded += 1;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`[failed] ${dossierId}/${filename}`, error?.message || error);
    }
  }
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({
    ok: true,
    rootDir,
    total: files.length,
    uploaded,
    dryRun,
    skipped,
  }));
};

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('MIGRATE_LOCAL_DOCUMENTS_FAILED', error);
  process.exit(1);
});

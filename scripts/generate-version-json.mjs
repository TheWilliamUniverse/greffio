#!/usr/bin/env node
/**
 * Génère public/version.json et dist/version.json à partir de server/config/appVersion.js.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAppVersionConfig } from '../server/config/appVersion.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = getAppVersionConfig();
const payload = {
  versionName: config.latestVersionName,
  versionCode: config.latestVersionCode,
  publishedVersionName: config.publishedVersionName,
  publishedVersionCode: config.publishedVersionCode,
  generatedAt: new Date().toISOString(),
};
const json = `${JSON.stringify(payload, null, 2)}\n`;

for (const rel of ['public/version.json', 'dist/version.json']) {
  const target = path.join(root, rel);
  if (rel.startsWith('dist/') && !fs.existsSync(path.dirname(target))) continue;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, json, 'utf8');
  console.log(`[generate-version-json] wrote ${rel}`);
}

#!/usr/bin/env node
/**
 * Lit android/release-version.properties pour CI / builds locaux.
 * Usage CI : node scripts/read-android-version.mjs --github-env >> "$GITHUB_ENV"
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const propsPath = path.join(root, 'android', 'release-version.properties');

const parseProperties = (content) => {
  const props = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    props[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return props;
};

const props = parseProperties(fs.readFileSync(propsPath, 'utf8'));
const versionCode = props.versionCode;
const versionName = props.versionName;

if (!versionCode || !versionName) {
  console.error('read-android-version: versionCode/versionName manquants dans release-version.properties');
  process.exit(1);
}

if (process.argv.includes('--github-env')) {
  console.log(`ANDROID_VERSION_CODE=${versionCode}`);
  console.log(`ANDROID_VERSION_NAME=${versionName}`);
} else {
  console.log(JSON.stringify({ versionCode, versionName }));
}

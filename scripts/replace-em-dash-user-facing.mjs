#!/usr/bin/env node
/**
 * Remplace le tiret cadratin (— U+2014) par le tiret demi-cadratin (– U+2013) dans le copy Greffio.
 * Cible : src/, server/, docs/, e2e/, releases/, android/, assets/, templates publics.
 * Exclut : staging/, staging-deploy/, node_modules/, dist/
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const EM = '\u2014';
const EN = '\u2013';

const TARGET_DIRS = [
  'src',
  'server',
  'docs',
  'e2e',
  'releases',
  'android',
  'assets',
  'public',
  'scripts',
];

const EXTRA_FILES = [
  '.env.example',
  'PRODUCTION_SECRETS_TEMPLATE.env',
  'GITHUB_SECRETS_TEMPLATE.md',
  'ANDROID_PLAY_RELEASE.md',
  'DEPLOY_VPS_HOSTINGER.md',
  'MOBILE_RELEASE_PLAN.md',
  'index.html',
  'lighthouserc.cjs',
  'lighthouserc.mobile.cjs',
];

const SKIP_DIRS = new Set(['node_modules', 'dist', 'staging', 'staging-deploy', '.git']);

const EXT = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.html', '.json', '.md', '.css', '.xml',
  '.mjs', '.cjs', '.example', '.env',
]);

const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (EXT.has(path.extname(entry.name)) || entry.name.endsWith('.env')) out.push(full);
  }
  return out;
};

const files = new Set();
for (const rel of TARGET_DIRS) {
  walk(path.join(ROOT, rel)).forEach((f) => files.add(f));
}
for (const rel of EXTRA_FILES) {
  const full = path.join(ROOT, rel);
  if (fs.existsSync(full)) files.add(full);
}

let changed = 0;
let replacements = 0;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(EM)) continue;
  const next = text.split(EM).join(EN);
  if (next !== text) {
    fs.writeFileSync(file, next, 'utf8');
    changed += 1;
    replacements += (text.match(new RegExp(EM, 'g')) || []).length;
  }
}

console.log(`[replace-em-dash] ${replacements} remplacements dans ${changed} fichiers.`);

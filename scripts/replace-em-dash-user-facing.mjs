#!/usr/bin/env node
/**
 * Remplace le tiret cadratin (—) par le tiret demi-cadratin (–) dans les chaînes user-facing.
 * Cible : src/, server/emails/, server/legal/, server/pdf/, server/documents/, server/services (sélectif).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const EM = '\u2014';
const EN = '\u2013';

const TARGET_DIRS = [
  'src',
  path.join('server', 'emails'),
  path.join('server', 'legal'),
  path.join('server', 'pdf'),
  path.join('server', 'documents'),
];

const EXTRA_FILES = [
  path.join('server', 'services', 'assistant', 'localRules.js'),
  path.join('server', 'services', 'opsCockpitService.js'),
  path.join('server', 'services', 'resourceFulfillment.js'),
  path.join('server', 'services', 'signature', 'signwell.service.js'),
  path.join('server', 'domain', 'formalityLabels.js'),
  path.join('index.html'),
  path.join('public', 'confidentialite', 'index.html'),
  path.join('public', 'suppression-compte', 'index.html'),
  path.join('public', 'suppression-donnees', 'index.html'),
];

const EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.html', '.json']);

const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (EXT.has(path.extname(entry.name))) out.push(full);
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

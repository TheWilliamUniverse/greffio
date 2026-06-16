import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const indexPath = path.join(distDir, 'index.html');

const fail = (message) => {
  console.error(`[verify-build-assets] ${message}`);
  process.exit(1);
};

if (!fs.existsSync(indexPath)) {
  fail('dist/index.html introuvable – lancez npm run build.');
}

const html = fs.readFileSync(indexPath, 'utf8');
const assetRefs = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);

if (!assetRefs.length) {
  fail('Aucune référence /assets/* hashée dans index.html.');
}

for (const assetRef of assetRefs) {
  const filePath = path.join(distDir, assetRef.replace(/^\//, '').replace(/\//g, path.sep));
  if (!fs.existsSync(filePath)) {
    fail(`Asset manquant: ${assetRef}`);
  }
}

const swPath = path.join(distDir, 'sw.js');
if (!fs.existsSync(swPath)) {
  fail('dist/sw.js manquant.');
}

console.log(`[verify-build-assets] OK – ${assetRefs.length} assets hashés vérifiés.`);

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] || 'remote';
const target = path.join(root, 'capacitor.config.json');

const sources = {
  remote: 'capacitor.config.remote.json',
  bundled: 'capacitor.config.bundled.json',
  dev: 'capacitor.config.dev.json',
};

const sourceName = sources[mode];
if (!sourceName) {
  console.error(`Mode inconnu: ${mode}. Utilisez: remote | bundled | dev`);
  process.exit(1);
}

const source = path.join(root, sourceName);
if (!fs.existsSync(source)) {
  console.error(`Fichier source introuvable: ${sourceName}`);
  process.exit(1);
}

fs.copyFileSync(source, target);
console.log(`capacitor.config.json ← ${sourceName}`);

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public', '.well-known');

const sha256 = String(process.env.ANDROID_UPLOAD_KEY_SHA256 || '').trim();
const teamId = String(process.env.APPLE_TEAM_ID || '').trim();

const patchAssetLinks = () => {
  const file = path.join(publicDir, 'assetlinks.json');
  if (!fs.existsSync(file)) return;
  if (!sha256) {
    console.info('[patch-well-known] ANDROID_UPLOAD_KEY_SHA256 absent — assetlinks.json inchangé');
    return;
  }
  const normalized = sha256.replace(/:/g, '').toUpperCase();
  const formatted = normalized.match(/.{1,2}/g)?.join(':') || sha256;
  const content = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.greffio.app',
        sha256_cert_fingerprints: [formatted],
      },
    },
  ];
  fs.writeFileSync(file, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
  console.info('[patch-well-known] assetlinks.json mis à jour');
};

const patchAppleAssociation = () => {
  const file = path.join(publicDir, 'apple-app-site-association');
  if (!fs.existsSync(file)) return;
  if (!teamId) {
    console.info('[patch-well-known] APPLE_TEAM_ID absent — apple-app-site-association inchangé');
    return;
  }
  const payload = {
    applinks: {
      apps: [],
      details: [
        {
          appID: `${teamId}.com.greffio.app`,
          paths: [
            '/dossier/*',
            '/dossiers',
            '/documents',
            '/questionnaire',
            '/paiement',
            '/login',
            '/password-reset',
          ],
        },
      ],
    },
  };
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.info('[patch-well-known] apple-app-site-association mis à jour');
};

patchAssetLinks();
patchAppleAssociation();

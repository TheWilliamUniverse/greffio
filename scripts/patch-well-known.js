import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public', '.well-known');

const teamId = String(process.env.APPLE_TEAM_ID || '').trim();

const DEFAULT_UPLOAD_KEY_SHA256 = 'F7:4F:72:96:22:4E:C1:0D:C9:56:A3:89:7E:68:0A:A9:2E:35:33:B9:59:75:C3:0F:6B:2B:7B:3D:6E:36:52:55';
const DEFAULT_APP_SIGNING_SHA256 = '9D:22:A5:82:5A:46:3A:2A:99:9B:C0:1A:0F:1A:6E:1A:DD:66:18:FC:0A:97:A3:6E:ED:EC:D3:0C:07:59:99:5B';

const patchAssetLinks = () => {
  const file = path.join(publicDir, 'assetlinks.json');
  if (!fs.existsSync(file)) return;

  const envSha = String(process.env.ANDROID_UPLOAD_KEY_SHA256 || '').trim();
  const normalized = (envSha || DEFAULT_UPLOAD_KEY_SHA256).replace(/:/g, '').toUpperCase();
  const uploadFormatted = normalized.match(/.{1,2}/g)?.join(':') || DEFAULT_UPLOAD_KEY_SHA256;
  const appSigningFormatted = DEFAULT_APP_SIGNING_SHA256;

  const content = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.greffio.app',
        sha256_cert_fingerprints: [appSigningFormatted, uploadFormatted],
      },
    },
  ];
  fs.writeFileSync(file, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
  console.info('[patch-well-known] assetlinks.json mis à jour (Play App Signing + upload key)');
};

const patchAppleAssociation = () => {
  const file = path.join(publicDir, 'apple-app-site-association');
  if (!fs.existsSync(file)) return;
  if (!teamId) {
    console.info('[patch-well-known] APPLE_TEAM_ID absent – apple-app-site-association inchangé');
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

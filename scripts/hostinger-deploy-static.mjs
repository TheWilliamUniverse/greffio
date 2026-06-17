#!/usr/bin/env node
/**
 * Déploiement frontend statique Hostinger via API (sans axios / MCP).
 *
 * Usage:
 *   node scripts/hostinger-deploy-static.mjs [domain] [archive.zip]
 *
 * Env: HOSTINGER_API_TOKEN
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  fetchUploadCredentials,
  getWebsiteByDomain,
  triggerWebsiteDeploy,
} from './hostinger-api.mjs';

const domain = process.argv[2] || process.env.HOSTINGER_DEPLOY_DOMAIN || 'greffio.willentreprises.com';
const archivePath = process.argv[3] || process.env.HOSTINGER_DEPLOY_ARCHIVE;
const verifyUrl = process.env.HOSTINGER_VERIFY_URL || `https://${domain}/health`;

if (!archivePath || !fs.existsSync(archivePath)) {
  console.error(JSON.stringify({ ok: false, error: 'ARCHIVE_MISSING', hint: 'node scripts/hostinger-deploy-static.mjs greffio.willentreprises.com dist.zip' }));
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const uploadArchive = async ({ uploadUrl, authToken, authRestToken, archivePath, archiveBasename }) => {
  const stats = fs.statSync(archivePath);
  const normalizedPath = archiveBasename.replace(/\\/g, '/');
  const targetUrl = `${String(uploadUrl).replace(/\/$/, '')}/${normalizedPath}?override=true`;

  const initRes = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'X-Auth': authToken,
      'X-Auth-Rest': authRestToken,
      'upload-length': String(stats.size),
      'upload-offset': '0',
    },
  });
  if (initRes.status !== 201) {
    const body = await initRes.text();
    throw new Error(`upload-init ${initRes.status}: ${body.slice(0, 200)}`);
  }

  const fileBuffer = fs.readFileSync(archivePath);
  const patchRes = await fetch(targetUrl, {
    method: 'PATCH',
    headers: {
      'X-Auth': authToken,
      'X-Auth-Rest': authRestToken,
      'Content-Type': 'application/offset+octet-stream',
      'Upload-Offset': '0',
      'Tus-Resumable': '1.0.0',
    },
    body: fileBuffer,
  });
  if (!patchRes.ok) {
    const body = await patchRes.text();
    throw new Error(`upload-patch ${patchRes.status}: ${body.slice(0, 200)}`);
  }
};

const verifyLive = async (url, { attempts = 8, delayMs = 4000 } = {}) => {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'follow' });
      if (res.ok) {
        const text = await res.text();
        return { ok: true, status: res.status, snippet: text.slice(0, 120) };
      }
    } catch (_error) {
      // retry
    }
    await sleep(delayMs);
  }
  return { ok: false, url };
};

try {
  const archiveBasename = path.basename(archivePath);
  const website = await getWebsiteByDomain(domain);
  console.log(JSON.stringify({ step: 'resolved', domain, username: website.username }));

  const creds = await fetchUploadCredentials({ username: website.username, domain });
  const uploadUrl = creds.url || creds.upload_url;
  const authToken = creds.auth_key || creds.authKey;
  const authRestToken = creds.rest_auth_key || creds.restAuthKey;
  if (!uploadUrl || !authToken || !authRestToken) {
    throw new Error('UPLOAD_CREDENTIALS_INCOMPLETE');
  }

  await uploadArchive({
    uploadUrl,
    authToken,
    authRestToken,
    archivePath,
    archiveBasename,
  });
  console.log(JSON.stringify({ step: 'uploaded', archiveBasename }));

  const deployResult = await triggerWebsiteDeploy({
    username: website.username,
    domain,
    archiveBasename,
  });
  console.log(JSON.stringify({ step: 'deploy_triggered', deployResult }));

  const live = await verifyLive(verifyUrl);
  console.log(JSON.stringify({ step: 'verify', verifyUrl, live }, null, 2));
  if (!live.ok) {
    process.exit(2);
  }
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    error: error?.code || error?.message || 'HOSTINGER_DEPLOY_FAILED',
    status: error?.status || null,
  }));
  process.exit(1);
}

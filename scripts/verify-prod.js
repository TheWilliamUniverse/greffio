#!/usr/bin/env node
/**
 * Smoke checks prod Greffio (frontend + API).
 *
 * Usage: node scripts/verify-prod.js
 * Exit 0 if all checks pass, 1 otherwise.
 */

import { getAppVersionConfig } from '../server/config/appVersion.js';

const FRONT_ORIGIN = process.env.GREFFIO_FRONT_ORIGIN || 'https://greffio.willentreprises.com';
const API_ORIGIN = process.env.GREFFIO_API_ORIGIN || 'https://api.greffio.willentreprises.com';

const checks = [
  { name: 'Front home', url: `${FRONT_ORIGIN}/`, expectStatus: 200 },
  { name: 'API health', url: `${API_ORIGIN}/api/health`, expectStatus: 200 },
  { name: 'API app-version', url: `${API_ORIGIN}/api/app-version`, expectStatus: 200, parseJson: true },
];

const expectedVersion = getAppVersionConfig();

const runCheck = async (check) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(check.url, { method: 'GET', redirect: 'follow', signal: controller.signal });
    const ok = res.status === check.expectStatus;
    if (!ok) {
      return { ok: false, detail: `HTTP ${res.status}` };
    }
    if (check.parseJson) {
      const payload = await res.json();
      const name = payload?.latestVersionName || payload?.publishedVersionName;
      const code = payload?.latestVersionCode || payload?.publishedVersionCode;
      if (name !== expectedVersion.latestVersionName || code !== expectedVersion.latestVersionCode) {
        return {
          ok: false,
          detail: `version mismatch (got ${name}/${code}, expected ${expectedVersion.latestVersionName}/${expectedVersion.latestVersionCode})`,
        };
      }
      return { ok: true, detail: `${name} (${code})` };
    }
    return { ok: true, detail: String(res.status) };
  } catch (error) {
    return { ok: false, detail: error?.message || 'fetch failed' };
  } finally {
    clearTimeout(timeout);
  }
};

let failed = 0;

for (const check of checks) {
  const result = await runCheck(check);
  if (result.ok) {
    console.log(`[OK] ${check.name} – ${result.detail}`);
  } else {
    console.error(`[FAIL] ${check.name} – ${result.detail}`);
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}

console.log('\nProd verification OK.');

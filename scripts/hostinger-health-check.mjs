#!/usr/bin/env node
/**
 * Vérifie DNS (API Hostinger + résolution publique) et santé HTTP frontend/API.
 *
 * Usage: node scripts/hostinger-health-check.mjs [apex-domain]
 * Env: HOSTINGER_API_TOKEN (optionnel pour lecture zone DNS)
 */

import dns from 'node:dns/promises';
import {
  listDnsZoneRecords,
  listDomainPortfolio,
  resolveHostingerToken,
} from './hostinger-api.mjs';

const apexDomain = process.argv[2] || 'willentreprises.com';
const checks = [
  { label: 'frontend', url: 'https://greffio.willentreprises.com/health' },
  { label: 'api', url: 'https://api.greffio.willentreprises.com/api/health' },
];
const hostnames = [
  'greffio.willentreprises.com',
  'api.greffio.willentreprises.com',
];

const resolvePublic = async (hostname) => {
  try {
    const rows = await dns.resolve4(hostname);
    return { ok: true, ips: rows };
  } catch (error) {
    return { ok: false, error: error?.code || error?.message };
  }
};

const checkHttp = async ({ label, url }) => {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (_e) { /* html ok */ }
    return {
      label,
      url,
      ok: res.ok,
      status: res.status,
      service: json?.service ?? (json?.ok === true ? 'ok' : null),
    };
  } catch (error) {
    return { label, url, ok: false, error: error?.message };
  }
};

const report = {
  apexDomain,
  timestamp: new Date().toISOString(),
  dns: {},
  http: [],
  hostingerApi: { configured: false },
};

for (const hostname of hostnames) {
  report.dns[hostname] = await resolvePublic(hostname);
}

report.http = await Promise.all(checks.map(checkHttp));

try {
  resolveHostingerToken();
  report.hostingerApi.configured = true;
  const portfolio = await listDomainPortfolio();
  report.hostingerApi.portfolioCount = Array.isArray(portfolio) ? portfolio.length : null;
  const zone = await listDnsZoneRecords(apexDomain);
  const records = Array.isArray(zone) ? zone : zone?.records || [];
  report.hostingerApi.dnsRecords = records
    .filter((row) => {
      const name = String(row?.name || row?.host || '').toLowerCase();
      return name.includes('greffio') || name.includes('api.greffio');
    })
    .slice(0, 12)
    .map((row) => ({
      type: row?.type || row?.record_type,
      name: row?.name || row?.host,
      content: row?.content || row?.value || row?.points_to,
    }));
} catch (error) {
  report.hostingerApi.error = error?.code || error?.message;
}

console.log(JSON.stringify(report, null, 2));
const failed = report.http.some((row) => !row.ok)
  || Object.values(report.dns).some((row) => !row.ok);
process.exit(failed ? 1 : 0);

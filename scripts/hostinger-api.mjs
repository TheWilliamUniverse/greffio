/**
 * Client minimal Hostinger API (fetch natif).
 * Token : HOSTINGER_API_TOKEN (hPanel → API).
 * Docs : https://developers.hostinger.com
 */

const BASE_URL = String(process.env.HOSTINGER_API_BASE_URL || 'https://developers.hostinger.com').replace(/\/$/, '');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const resolveHostingerToken = () => {
  const token = String(process.env.HOSTINGER_API_TOKEN || '').trim();
  if (!token) {
    const error = new Error('HOSTINGER_API_TOKEN manquant');
    error.code = 'HOSTINGER_TOKEN_MISSING';
    throw error;
  }
  return token;
};

export const hostingerFetch = async (path, { method = 'GET', body, retries = 2 } = {}) => {
  const token = resolveHostingerToken();
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });

      let payload = null;
      const text = await response.text();
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch (_error) {
          payload = { raw: text };
        }
      }

      if (!response.ok) {
        const error = new Error(payload?.message || payload?.error || `HOSTINGER_HTTP_${response.status}`);
        error.code = 'HOSTINGER_API_ERROR';
        error.status = response.status;
        error.payload = payload;
        throw error;
      }

      return payload;
    } catch (error) {
      lastError = error;
      const retryable = error?.status >= 500 || error?.code === 'ECONNRESET';
      if (attempt < retries && retryable) {
        await sleep(500 * (attempt + 1));
        continue;
      }
      throw error;
    }
  }

  throw lastError;
};

/** GET /api/hosting/v1/websites?domain=… */
export const getWebsiteByDomain = async (domain) => {
  const payload = await hostingerFetch(`/api/hosting/v1/websites?domain=${encodeURIComponent(domain)}`);
  const row = payload?.data?.[0] || null;
  if (!row?.username) {
    const error = new Error(`Site Hostinger introuvable pour ${domain}`);
    error.code = 'HOSTINGER_WEBSITE_NOT_FOUND';
    throw error;
  }
  return row;
};

/** POST /api/hosting/v1/files/upload-urls */
export const fetchUploadCredentials = async ({ username, domain }) => (
  hostingerFetch('/api/hosting/v1/files/upload-urls', {
    method: 'POST',
    body: { username, domain },
  })
);

/** POST deploy après upload archive */
export const triggerWebsiteDeploy = async ({ username, domain, archiveBasename }) => (
  hostingerFetch(
    `/api/hosting/v1/accounts/${encodeURIComponent(username)}/websites/${encodeURIComponent(domain)}/deploy`,
    {
      method: 'POST',
      body: { archive_path: archiveBasename },
    },
  )
);

/** GET /api/dns/v1/zones/{domain} */
export const listDnsZoneRecords = async (domain) => {
  const payload = await hostingerFetch(`/api/dns/v1/zones/${encodeURIComponent(domain)}`);
  return payload?.data || payload?.records || payload || [];
};

/** GET /api/domains/v1/portfolio */
export const listDomainPortfolio = async () => {
  const payload = await hostingerFetch('/api/domains/v1/portfolio');
  return payload?.data || payload || [];
};

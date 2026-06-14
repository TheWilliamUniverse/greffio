const QONTO_API_BASE = process.env.QONTO_API_BASE_URL || 'https://thirdparty.qonto.com/v2';

const getQontoCredentials = () => {
  const login = process.env.QONTO_CLIENT_ID || process.env.QONTO_LOGIN || '';
  const secret = process.env.QONTO_CLIENT_SECRET || process.env.QONTO_SECRET_KEY || '';
  if (!login || !secret) {
    throw new Error('QONTO_CREDENTIALS_MISSING');
  }
  return { login, secret };
};

export const isQontoConfigured = () => {
  const login = process.env.QONTO_CLIENT_ID || process.env.QONTO_LOGIN || '';
  const secret = process.env.QONTO_CLIENT_SECRET || process.env.QONTO_SECRET_KEY || '';
  return Boolean(login && secret);
};

export const qontoRequest = async (path, { method = 'GET', body = null } = {}) => {
  const { login, secret } = getQontoCredentials();
  const response = await fetch(`${QONTO_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `${login}:${secret}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.message || payload?.error || JSON.stringify(payload);
    throw new Error(`QONTO_${method}_${path}_FAILED:${detail}`);
  }
  return payload;
};

export const getQontoOrganization = async () => {
  const data = await qontoRequest('/organization');
  return data.organization || data;
};

export const listQontoBankAccounts = async () => {
  const data = await qontoRequest('/organization/bank_accounts');
  return data.bank_accounts || [];
};

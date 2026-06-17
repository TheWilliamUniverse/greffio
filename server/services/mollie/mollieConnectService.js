const MOLLIE_OAUTH_AUTHORIZE_URL = 'https://www.mollie.com/oauth2/authorize';
const MOLLIE_OAUTH_TOKEN_URL = 'https://api.mollie.com/oauth2/tokens';
const MOLLIE_CONNECT_CLIENTS_URL = 'https://api.mollie.com/v2/clients';
const MOLLIE_ORGANIZATIONS_ME_URL = 'https://api.mollie.com/v2/organizations/me';

/** Scopes Connect for Platforms — onboarding + paiements + profils (docs Mollie). */
export const MOLLIE_CONNECT_SCOPES = (
  process.env.MOLLIE_CONNECT_SCOPES
  || 'payments.read payments.write profiles.read profiles.write onboarding.read organizations.read'
).trim();

export const isMollieConnectConfigured = () => (
  Boolean(process.env.MOLLIE_OAUTH_CLIENT_ID && process.env.MOLLIE_OAUTH_CLIENT_SECRET)
);

export const resolveMollieConnectRedirectUri = () => (
  process.env.MOLLIE_CONNECT_REDIRECT_URI
  || `${process.env.API_PUBLIC_URL || 'https://api.greffio.willentreprises.com'}/api/mollie/connect/callback`
).trim();

export const buildMollieConnectAuthorizeUrl = ({ state, scope = MOLLIE_CONNECT_SCOPES } = {}) => {
  if (!isMollieConnectConfigured()) {
    throw new Error('MOLLIE_CONNECT_NOT_CONFIGURED');
  }
  const params = new URLSearchParams({
    client_id: process.env.MOLLIE_OAUTH_CLIENT_ID,
    redirect_uri: resolveMollieConnectRedirectUri(),
    response_type: 'code',
    scope,
    state: state || 'greffio_connect',
  });
  return `${MOLLIE_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
};

export const exchangeMollieConnectCode = async ({ code }) => {
  if (!isMollieConnectConfigured()) {
    throw new Error('MOLLIE_CONNECT_NOT_CONFIGURED');
  }
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: resolveMollieConnectRedirectUri(),
    client_id: process.env.MOLLIE_OAUTH_CLIENT_ID,
    client_secret: process.env.MOLLIE_OAUTH_CLIENT_SECRET,
  });
  const response = await fetch(MOLLIE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error_description || payload?.error || 'MOLLIE_CONNECT_TOKEN_FAILED');
  }
  return payload;
};

export const refreshMollieConnectToken = async ({ refreshToken }) => {
  if (!isMollieConnectConfigured()) {
    throw new Error('MOLLIE_CONNECT_NOT_CONFIGURED');
  }
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: process.env.MOLLIE_OAUTH_CLIENT_ID,
    client_secret: process.env.MOLLIE_OAUTH_CLIENT_SECRET,
  });
  const response = await fetch(MOLLIE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error_description || payload?.error || 'MOLLIE_CONNECT_REFRESH_FAILED');
  }
  return payload;
};

export const fetchMollieConnectOrganization = async ({ accessToken }) => {
  const response = await fetch(MOLLIE_ORGANIZATIONS_ME_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.detail || payload?.title || 'MOLLIE_CONNECT_ORG_FETCH_FAILED');
  }
  return payload;
};

export const createMollieConnectClientLink = async ({ accessToken, name, email, registrationNumber = null }) => {
  const response = await fetch(MOLLIE_CONNECT_CLIENTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      name,
      email,
      registrationNumber,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.detail || payload?.title || 'MOLLIE_CONNECT_CLIENT_CREATE_FAILED');
  }
  return payload;
};

export const describeMollieConnectStatus = ({ connectedAccounts = null } = {}) => ({
  app: 'Connect Partners',
  configured: isMollieConnectConfigured(),
  redirectUri: resolveMollieConnectRedirectUri(),
  clientId: process.env.MOLLIE_OAUTH_CLIENT_ID || null,
  scopes: MOLLIE_CONNECT_SCOPES,
  authorizeUrlPattern: isMollieConnectConfigured()
    ? `${MOLLIE_OAUTH_AUTHORIZE_URL}?client_id=${process.env.MOLLIE_OAUTH_CLIENT_ID}&redirect_uri=${encodeURIComponent(resolveMollieConnectRedirectUri())}&response_type=code&scope=${encodeURIComponent(MOLLIE_CONNECT_SCOPES)}&state=<csrf_state>`
    : null,
  connectedAccounts,
  docs: 'https://docs.mollie.com/docs/connect-platforms-getting-started',
});

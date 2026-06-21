import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';

/**
 * ONLYOFFICE Document Server integration.
 *
 * VPS setup hint (Docker, not full infra):
 *   docker run -i -t -d -p 8082:80 --restart=always \
 *     -e JWT_SECRET="${ONLYOFFICE_JWT_SECRET}" \
 *     onlyoffice/documentserver
 *   Nginx reverse proxy → ONLYOFFICE_URL=https://office.example.com
 *   Ensure ONLYOFFICE can reach GREFFIO_API_URL for document download + callback.
 */

const FRONTEND_ONLY_HOSTS = new Set([
  'greffio.willentreprises.com',
  'www.greffio.willentreprises.com',
]);

const normalizeBaseUrl = (value = '') => String(value || '').trim().replace(/\/$/, '');

export const isOnlyOfficeConfigured = () => Boolean(
  String(process.env.ONLYOFFICE_URL || '').trim(),
);

export const getOnlyOfficeServerUrl = () => normalizeBaseUrl(process.env.ONLYOFFICE_URL);

export const getOnlyOfficeJwtSecret = () => String(process.env.ONLYOFFICE_JWT_SECRET || '').trim() || null;

/** Public API base URL reachable by the ONLYOFFICE container (never the SPA frontend host). */
export const getOnlyOfficePublicApiBaseUrl = () => {
  const candidates = [
    process.env.GREFFIO_API_URL,
    process.env.API_PUBLIC_URL,
  ].map(normalizeBaseUrl).filter(Boolean);

  for (const configured of candidates) {
    try {
      const host = new URL(configured).hostname.toLowerCase();
      if (FRONTEND_ONLY_HOSTS.has(host)) continue;
      if (host.startsWith('api.')) return configured;
      if (host.includes('greffio') && !FRONTEND_ONLY_HOSTS.has(host)) return configured;
    } catch (_error) {
      continue;
    }
  }
  return null;
};

export const assertOnlyOfficePublicApiBaseUrl = () => {
  const apiBase = getOnlyOfficePublicApiBaseUrl();
  if (!apiBase) {
    const error = new Error('ONLYOFFICE_API_BASE_MISCONFIGURED');
    error.code = 'ONLYOFFICE_API_BASE_MISCONFIGURED';
    error.message = 'GREFFIO_API_URL ou API_PUBLIC_URL doit pointer vers https://api.greffio.willentreprises.com (accessible par ONLYOFFICE).';
    throw error;
  }
  return apiBase;
};

export const buildOnlyOfficeFileDownloadUrl = ({ sessionId, accessToken, apiBase = null }) => {
  const base = apiBase || assertOnlyOfficePublicApiBaseUrl();
  return `${base}/api/onlyoffice/files/${sessionId}/download?token=${encodeURIComponent(accessToken)}`;
};

export const buildOnlyOfficeCallbackUrl = ({ sessionId, apiBase = null }) => {
  const base = apiBase || assertOnlyOfficePublicApiBaseUrl();
  return `${base}/api/onlyoffice/callback/${sessionId}`;
};

export const isOnlyOfficeDocumentServerUrl = (value = '') => {
  const normalized = normalizeBaseUrl(value);
  if (!normalized) return false;
  try {
    const host = new URL(normalized).hostname.toLowerCase();
    if (FRONTEND_ONLY_HOSTS.has(host)) return false;
    if (host.startsWith('api.')) return false;
    return true;
  } catch (_error) {
    return false;
  }
};

export const probeOnlyOfficeDocumentServer = async (serverUrl = getOnlyOfficeServerUrl()) => {
  const base = normalizeBaseUrl(serverUrl);
  if (!base) {
    const error = new Error('ONLYOFFICE_URL_MISSING');
    error.code = 'ONLYOFFICE_URL_MISSING';
    throw error;
  }
  if (!isOnlyOfficeDocumentServerUrl(base)) {
    const error = new Error('ONLYOFFICE_URL_INVALID');
    error.code = 'ONLYOFFICE_URL_INVALID';
    throw error;
  }

  const timeoutSignal = AbortSignal.timeout(10000);
  try {
    const healthResponse = await fetch(`${base}/healthcheck`, {
      method: 'GET',
      signal: timeoutSignal,
    });
    if (healthResponse.ok) {
      const body = String(await healthResponse.text()).trim().toLowerCase();
      if (body === 'true' || body.includes('true')) return { ok: true, endpoint: 'healthcheck' };
    }
  } catch (_error) {
    // fall through to api.js probe
  }

  const apiResponse = await fetch(`${base}/web-apps/apps/api/documents/api.js`, {
    method: 'GET',
    headers: { Range: 'bytes=0-0' },
    signal: AbortSignal.timeout(10000),
  });
  if (!apiResponse.ok) {
    const error = new Error(`ONLYOFFICE_SERVER_PROBE_${apiResponse.status}`);
    error.code = 'ONLYOFFICE_SERVER_UNREACHABLE';
    throw error;
  }
  return { ok: true, endpoint: 'api.js' };
};

export const probeOnlyOfficeFileDownloadUrl = async (downloadUrl) => {
  const response = await fetch(downloadUrl, {
    method: 'GET',
    headers: { Accept: '*/*' },
    signal: AbortSignal.timeout(15000),
  });
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (!response.ok) {
    let probeCode = 'ONLYOFFICE_DOWNLOAD_PROBE_FAILED';
    let detectedFormat = null;
    if (response.status === 422 && contentType.includes('json')) {
      try {
        const body = await response.json();
        if (body?.error === 'ONLYOFFICE_FILE_FORMAT_MISMATCH') {
          probeCode = 'ONLYOFFICE_FILE_FORMAT_MISMATCH';
          detectedFormat = body.detectedFormat || null;
        }
      } catch (_error) {
        // ignore JSON parse errors
      }
    }
    const error = new Error(`ONLYOFFICE_DOWNLOAD_PROBE_${response.status}`);
    error.code = probeCode;
    error.status = response.status;
    if (detectedFormat) error.detectedFormat = detectedFormat;
    throw error;
  }
  if (contentType.includes('text/html')) {
    const error = new Error('ONLYOFFICE_DOWNLOAD_PROBE_HTML');
    error.code = 'ONLYOFFICE_DOWNLOAD_PROBE_HTML';
    throw error;
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 64) {
    const error = new Error('ONLYOFFICE_DOWNLOAD_PROBE_EMPTY');
    error.code = 'ONLYOFFICE_DOWNLOAD_PROBE_EMPTY';
    throw error;
  }
  return { contentType, size: buffer.length };
};

export const resolveOnlyOfficeFileType = (mimeType = '', fileFormat = 'pdf') => {
  const format = String(fileFormat || '').toLowerCase();
  if (format === 'docx') return 'docx';
  if (format === 'odt') return 'odt';
  const mime = String(mimeType || '').toLowerCase();
  if (mime.includes('wordprocessingml')) return 'docx';
  if (mime.includes('opendocument.text')) return 'odt';
  return 'pdf';
};

export const resolveOnlyOfficeDocumentType = (fileType) => {
  if (fileType === 'pdf') return 'pdf';
  if (['xlsx', 'xls', 'csv'].includes(fileType)) return 'cell';
  if (['pptx', 'ppt'].includes(fileType)) return 'slide';
  return 'word';
};

export const buildOnlyOfficeDocumentKey = ({
  dossierId,
  docKey,
  versionId = null,
  sha256 = null,
  sessionId = null,
}) => {
  const parts = [
    dossierId,
    docKey,
    versionId || 'v0',
    sha256 ? sha256.slice(0, 12) : 'nosha',
    sessionId || Date.now(),
  ];
  return createHash('sha256').update(parts.join(':')).digest('hex').slice(0, 32);
};

export const signOnlyOfficePayload = (payload) => {
  const secret = getOnlyOfficeJwtSecret();
  if (!secret) return null;
  return jwt.sign(payload, secret, { expiresIn: '8h' });
};

export const verifyOnlyOfficeToken = (token) => {
  const secret = getOnlyOfficeJwtSecret();
  if (!secret || !token) return null;
  try {
    return jwt.verify(token, secret);
  } catch (_error) {
    return null;
  }
};

export const resolveOnlyOfficeEditorHeight = (presentation = 'desktop') => (
  presentation === 'mobile' ? '560px' : '720px'
);

export const buildOnlyOfficeEditorConfig = ({
  documentKey,
  title,
  fileUrl,
  callbackUrl,
  fileType = 'pdf',
  user = {},
  mode = 'edit',
  presentation = 'desktop',
}) => {
  const documentType = resolveOnlyOfficeDocumentType(fileType);
  const editorHeight = resolveOnlyOfficeEditorHeight(presentation);
  const config = {
    document: {
      fileType,
      key: documentKey,
      title: title || 'Document Greffio',
      url: fileUrl,
      permissions: {
        edit: mode === 'edit',
        download: true,
        print: true,
        review: false,
        comment: false,
      },
    },
    documentType,
    editorConfig: {
      callbackUrl,
      lang: 'fr',
      mode,
      user: {
        id: String(user.id || 'greffio-user'),
        name: String(user.name || 'Utilisateur Greffio'),
      },
      customization: {
        autosave: true,
        forcesave: true,
        compactHeader: true,
        // toolbarNoTabs → 404 index_loader.html sur Document Server 9.4.x (ONLYOFFICE #3694)
        hideRightMenu: true,
        hideRulers: presentation === 'mobile',
        features: {
          spellcheck: { mode: true },
        },
      },
    },
    // Explicit px height — JWT-signed; % collapses to 0 in CSS grid/flex parents.
    height: editorHeight,
    width: '100%',
    type: presentation === 'mobile' ? 'mobile' : 'desktop',
  };

  const token = signOnlyOfficePayload(config);
  if (token) {
    return { ...config, token };
  }
  return config;
};

export const convertDocumentViaOnlyOffice = async ({
  fileUrl,
  fileType = 'docx',
  outputType = 'pdf',
  key = null,
}) => {
  const serverUrl = getOnlyOfficeServerUrl();
  if (!serverUrl) {
    const error = new Error('ONLYOFFICE_NOT_CONFIGURED');
    error.code = 'ONLYOFFICE_NOT_CONFIGURED';
    throw error;
  }

  const payload = {
    async: false,
    filetype: String(fileType || 'docx').toLowerCase(),
    key: key || createHash('sha256').update(String(fileUrl)).digest('hex').slice(0, 20),
    outputtype: String(outputType || 'pdf').toLowerCase(),
    url: fileUrl,
  };

  const token = signOnlyOfficePayload(payload);
  const response = await fetch(`${serverUrl}/ConvertService.ashx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(token ? { token } : payload),
  });

  if (!response.ok) {
    const error = new Error(`ONLYOFFICE_CONVERT_HTTP_${response.status}`);
    error.code = 'ONLYOFFICE_CONVERT_FAILED';
    throw error;
  }

  const result = await response.json();
  if (result?.error) {
    const error = new Error(`ONLYOFFICE_CONVERT_${result.error}`);
    error.code = 'ONLYOFFICE_CONVERT_FAILED';
    throw error;
  }
  if (!result?.fileUrl) {
    const error = new Error('ONLYOFFICE_CONVERT_NO_URL');
    error.code = 'ONLYOFFICE_CONVERT_FAILED';
    throw error;
  }

  const convertedResponse = await fetch(String(result.fileUrl));
  if (!convertedResponse.ok) {
    const error = new Error(`ONLYOFFICE_CONVERT_DOWNLOAD_${convertedResponse.status}`);
    error.code = 'ONLYOFFICE_CONVERT_FAILED';
    throw error;
  }

  return Buffer.from(await convertedResponse.arrayBuffer());
};

export const parseOnlyOfficeCallbackStatus = (body = {}) => {
  const status = Number(body?.status);
  return {
    status,
    mustSave: status === 2 || status === 6,
    closedWithoutChanges: status === 4,
    corrupted: status === 3 || status === 7,
    downloadUrl: body?.url ? String(body.url) : null,
    key: body?.key ? String(body.key) : null,
  };
};

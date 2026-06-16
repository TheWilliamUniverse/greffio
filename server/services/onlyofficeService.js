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

export const isOnlyOfficeConfigured = () => Boolean(
  String(process.env.ONLYOFFICE_URL || '').trim(),
);

export const getOnlyOfficeServerUrl = () => String(process.env.ONLYOFFICE_URL || '').replace(/\/$/, '');

export const getOnlyOfficeJwtSecret = () => String(process.env.ONLYOFFICE_JWT_SECRET || '').trim() || null;

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

export const buildOnlyOfficeEditorConfig = ({
  documentKey,
  title,
  fileUrl,
  callbackUrl,
  fileType = 'pdf',
  user = {},
  mode = 'edit',
}) => {
  const documentType = resolveOnlyOfficeDocumentType(fileType);
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
      },
    },
    height: '100%',
    width: '100%',
    type: 'desktop',
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

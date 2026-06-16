import fs from 'node:fs/promises';
import path from 'node:path';
import {
  buildS3StorageUrl,
  deleteDocumentFromS3StorageUrl,
  downloadObjectBufferFromStorageUrl,
  getSignedDownloadUrlFromStorageUrl,
  isS3Configured,
  parseS3StorageUrl,
  probeS3StorageConnectivity,
  uploadDocumentToS3WithRetry,
} from './s3StorageService.js';

const STORAGE_DRIVER = String(process.env.DOCUMENT_STORAGE_DRIVER || 'local').toLowerCase();
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const SUPABASE_STORAGE_BUCKET = String(process.env.SUPABASE_STORAGE_BUCKET || 'greffio-documents');

const hasSupabaseCredentials = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const s3DriverRequested = STORAGE_DRIVER === 's3';
const supabaseDriverRequested = STORAGE_DRIVER === 'supabase';

const resolveActiveDriver = () => {
  if (s3DriverRequested && isS3Configured()) return 's3';
  if (supabaseDriverRequested && hasSupabaseCredentials) return 'supabase';
  if (s3DriverRequested || supabaseDriverRequested) return STORAGE_DRIVER;
  return 'local';
};

const activeDriver = resolveActiveDriver();

export const objectStorageConfig = {
  driver: activeDriver,
  requestedDriver: STORAGE_DRIVER,
  s3Configured: isS3Configured(),
  /** Clés Supabase présentes (Postgres / API admin). */
  supabaseCredentialsPresent: hasSupabaseCredentials,
  /** Storage Supabase actif uniquement si DOCUMENT_STORAGE_DRIVER=supabase. */
  supabaseStorageActive: activeDriver === 'supabase',
  /** @deprecated Utiliser supabaseCredentialsPresent – ne signifie pas que le bucket Storage existe. */
  supabaseConfigured: hasSupabaseCredentials,
  bucket: activeDriver === 's3'
    ? process.env.AWS_S3_BUCKET
    : SUPABASE_STORAGE_BUCKET,
  presignedTtlSeconds: Number(process.env.AWS_S3_PRESIGNED_URL_TTL_SECONDS || 900),
};

export const probeSupabaseStorageBucket = async () => {
  if (!hasSupabaseCredentials) {
    return { ok: false, reason: 'SUPABASE_CREDENTIALS_MISSING', bucket: SUPABASE_STORAGE_BUCKET };
  }
  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/bucket/${encodeURIComponent(SUPABASE_STORAGE_BUCKET)}`,
    { headers: supabaseHeaders() },
  );
  if (response.ok) {
    return { ok: true, bucket: SUPABASE_STORAGE_BUCKET, mode: 'bucket_get' };
  }
  const listResponse = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, { headers: supabaseHeaders() });
  if (!listResponse.ok) {
    return {
      ok: false,
      reason: 'SUPABASE_STORAGE_API_FAILED',
      bucket: SUPABASE_STORAGE_BUCKET,
      status: listResponse.status,
    };
  }
  const buckets = await listResponse.json().catch(() => []);
  const exists = Array.isArray(buckets)
    && buckets.some((entry) => entry?.name === SUPABASE_STORAGE_BUCKET || entry?.id === SUPABASE_STORAGE_BUCKET);
  return {
    ok: exists,
    reason: exists ? null : 'SUPABASE_STORAGE_BUCKET_MISSING',
    bucket: SUPABASE_STORAGE_BUCKET,
    mode: 'bucket_list',
  };
};

const supabaseHeaders = (extra = {}) => ({
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  ...extra,
});

const encodePath = (value) => String(value || '')
  .split('/')
  .map((part) => encodeURIComponent(part))
  .join('/');

export const buildSupabaseStorageUrl = (bucket, objectPath) => `supabase://${bucket}/${objectPath}`;

export const parseSupabaseStorageUrl = (storageUrl) => {
  const source = String(storageUrl || '');
  if (!source.startsWith('supabase://')) return null;
  const remainder = source.replace('supabase://', '');
  const slashIndex = remainder.indexOf('/');
  if (slashIndex === -1) return null;
  return {
    bucket: remainder.slice(0, slashIndex),
    objectPath: remainder.slice(slashIndex + 1),
  };
};

const uploadToSupabaseFromBuffer = async ({
  dossierId,
  docKey,
  buffer,
  originalFilename,
  mimeType,
}) => {
  const safeDossierId = String(dossierId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeDocKey = String(docKey || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
  const objectPath = `${safeDossierId}/${safeDocKey}/${Date.now()}_${String(originalFilename || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${encodePath(objectPath)}`,
    {
      method: 'POST',
      headers: supabaseHeaders({
        'Content-Type': mimeType || 'application/pdf',
        'x-upsert': 'true',
      }),
      body: buffer,
    },
  );
  if (!response.ok) {
    const body = await response.text().catch(() => 'SUPABASE_UPLOAD_FAILED');
    throw new Error(`SUPABASE_UPLOAD_FAILED:${body}`);
  }
  return {
    uploaded: true,
    storageProvider: 'supabase',
    storageUrl: buildSupabaseStorageUrl(SUPABASE_STORAGE_BUCKET, objectPath),
  };
};

const writeLocalFallback = async ({
  dossierId,
  targetFilename,
  buffer,
}) => {
  const uploadsRoot = path.resolve(process.cwd(), 'server', 'data', 'uploads');
  const dossierUploadDir = path.join(uploadsRoot, String(dossierId));
  await fs.mkdir(dossierUploadDir, { recursive: true });
  const finalPath = path.join(dossierUploadDir, targetFilename);
  await fs.writeFile(finalPath, buffer);
  return {
    uploaded: true,
    storageProvider: 'local',
    storageUrl: finalPath,
    localFilePath: finalPath,
  };
};

export const uploadDocumentToConfiguredStorage = async ({
  dossierId,
  docKey,
  buffer,
  originalFilename,
  mimeType = 'application/pdf',
  targetFilename,
  localFilePath,
}) => {
  let fileBuffer = buffer;
  if (!fileBuffer && localFilePath) {
    fileBuffer = await fs.readFile(localFilePath);
  }
  if (!fileBuffer) {
    throw new Error('FILE_BUFFER_REQUIRED');
  }

  if (objectStorageConfig.driver === 's3') {
    const uploaded = await uploadDocumentToS3WithRetry({
      buffer: fileBuffer,
      dossierId,
      docKey,
      originalFilename,
      mimeType,
    });
    return {
      uploaded: true,
      storageProvider: uploaded.storageProvider,
      storageUrl: uploaded.storageUrl,
      bucket: uploaded.bucket,
      key: uploaded.key,
    };
  }

  if (objectStorageConfig.driver === 'supabase') {
    const uploaded = await uploadToSupabaseFromBuffer({
      dossierId,
      docKey,
      buffer: fileBuffer,
      originalFilename,
      mimeType,
    });
    return uploaded;
  }

  const localName = targetFilename || `${Date.now()}_${String(originalFilename || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  return writeLocalFallback({
    dossierId,
    targetFilename: localName,
    buffer: fileBuffer,
  });
};

export const createSupabaseSignedDownloadUrl = async (storageUrl, expiresInSeconds = 120) => {
  const parsed = parseSupabaseStorageUrl(storageUrl);
  if (!parsed) return null;
  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/sign/${parsed.bucket}/${encodePath(parsed.objectPath)}`,
    {
      method: 'POST',
      headers: supabaseHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
    },
  );
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null);
  const signedPath = payload?.signedURL || payload?.signedUrl || null;
  if (!signedPath) return null;
  return signedPath.startsWith('http') ? signedPath : `${SUPABASE_URL}/storage/v1${signedPath}`;
};

export const createSignedDownloadUrl = async (storageUrl) => {
  const source = String(storageUrl || '');
  if (source.startsWith('s3://')) {
    if (!isS3Configured()) return null;
    return getSignedDownloadUrlFromStorageUrl(source);
  }
  if (source.startsWith('supabase://')) {
    const url = await createSupabaseSignedDownloadUrl(source, 120);
    return url ? { url, expiresIn: 120 } : null;
  }
  return null;
};

export const deleteDocumentFromConfiguredStorage = async (storageUrl) => {
  const source = String(storageUrl || '');
  if (!source) return { deleted: false };

  if (source.startsWith('s3://')) {
    if (!isS3Configured()) return { deleted: false, provider: 's3' };
    return deleteDocumentFromS3StorageUrl(source);
  }

  const parsed = parseSupabaseStorageUrl(source);
  if (parsed && hasSupabaseCredentials) {
    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${parsed.bucket}/${encodePath(parsed.objectPath)}`,
      {
        method: 'DELETE',
        headers: supabaseHeaders(),
      },
    );
    return { deleted: response.ok, provider: 'supabase' };
  }

  if (source.startsWith('supabase://')) {
    return { deleted: false, provider: 'supabase' };
  }

  try {
    await fs.unlink(source);
    return { deleted: true, provider: 'local' };
  } catch (_error) {
    return { deleted: false, provider: 'local' };
  }
};

export const downloadDocumentBufferFromConfiguredStorage = async (storageUrl) => {
  const source = String(storageUrl || '');
  if (!source) throw new Error('STORAGE_URL_MISSING');

  if (source.startsWith('s3://')) {
    if (!isS3Configured()) throw new Error('STORAGE_DOWNLOAD_FAILED');
    return downloadObjectBufferFromStorageUrl(source);
  }

  if (source.startsWith('supabase://')) {
    const signedUrl = await createSupabaseSignedDownloadUrl(source, 120);
    if (!signedUrl) throw new Error('STORAGE_DOWNLOAD_FAILED');
    const response = await fetch(signedUrl);
    if (!response.ok) throw new Error('STORAGE_DOWNLOAD_FAILED');
    return Buffer.from(await response.arrayBuffer());
  }

  return fs.readFile(source);
};

export { parseS3StorageUrl, buildS3StorageUrl, probeS3StorageConnectivity };

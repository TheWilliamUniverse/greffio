import fs from 'node:fs/promises';

const STORAGE_DRIVER = String(process.env.DOCUMENT_STORAGE_DRIVER || 'local').toLowerCase();
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const SUPABASE_STORAGE_BUCKET = String(process.env.SUPABASE_STORAGE_BUCKET || 'greffio-documents');

const isSupabaseDriver = STORAGE_DRIVER === 'supabase';
const hasSupabaseCredentials = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

const supabaseHeaders = (extra = {}) => ({
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  ...extra,
});

const encodePath = (value) => String(value || '')
  .split('/')
  .map((part) => encodeURIComponent(part))
  .join('/');

export const objectStorageConfig = {
  driver: isSupabaseDriver && hasSupabaseCredentials ? 'supabase' : 'local',
  supabaseConfigured: hasSupabaseCredentials,
  bucket: SUPABASE_STORAGE_BUCKET,
};

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

export const uploadDocumentToConfiguredStorage = async ({
  dossierId,
  filename,
  localFilePath,
}) => {
  if (objectStorageConfig.driver !== 'supabase') {
    return { uploaded: false, storageUrl: localFilePath };
  }

  const safeDossierId = String(dossierId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
  const objectPath = `${safeDossierId}/${Date.now()}_${String(filename || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const fileBuffer = await fs.readFile(localFilePath);
  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${encodePath(objectPath)}`,
    {
      method: 'POST',
      headers: supabaseHeaders({
        'Content-Type': 'application/pdf',
        'x-upsert': 'true',
      }),
      body: fileBuffer,
    },
  );
  if (!response.ok) {
    const body = await response.text().catch(() => 'SUPABASE_UPLOAD_FAILED');
    throw new Error(`SUPABASE_UPLOAD_FAILED:${body}`);
  }
  return {
    uploaded: true,
    storageUrl: buildSupabaseStorageUrl(SUPABASE_STORAGE_BUCKET, objectPath),
  };
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

export const deleteDocumentFromConfiguredStorage = async (storageUrl) => {
  const source = String(storageUrl || '');
  if (!source) return { deleted: false };

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

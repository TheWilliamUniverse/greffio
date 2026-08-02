import crypto from 'node:crypto';
import path from 'node:path';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const readFirstEnv = (...keys) => {
  for (const key of keys) {
    const value = String(process.env[key] || '').trim();
    if (value) return value;
  }
  return '';
};

const parseBoolean = (value, fallback = false) => {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const resolveEndpoint = () => readFirstEnv('S3_ENDPOINT', 'AWS_S3_ENDPOINT').replace(/\/+$/, '');
const resolveAccessKeyId = () => readFirstEnv('S3_ACCESS_KEY_ID', 'AWS_ACCESS_KEY_ID');
const resolveSecretAccessKey = () => readFirstEnv('S3_SECRET_ACCESS_KEY', 'AWS_SECRET_ACCESS_KEY');
const resolveBucket = () => readFirstEnv('S3_BUCKET', 'AWS_S3_BUCKET');
const resolveAwsRegion = () => readFirstEnv('S3_REGION', 'AWS_REGION', 'AWS_DEFAULT_REGION') || 'eu-west-3';
const resolveForcePathStyle = () => parseBoolean(
  readFirstEnv('S3_FORCE_PATH_STYLE', 'AWS_S3_FORCE_PATH_STYLE'),
  Boolean(resolveEndpoint()),
);
const resolveServerSideEncryption = () => {
  const configured = readFirstEnv('S3_SERVER_SIDE_ENCRYPTION', 'AWS_S3_SERVER_SIDE_ENCRYPTION');
  if (configured) return configured;
  return resolveEndpoint() ? '' : 'AES256';
};

export const getS3StorageConfig = () => ({
  endpoint: resolveEndpoint() || null,
  region: resolveAwsRegion(),
  accessKeyId: resolveAccessKeyId(),
  secretAccessKey: resolveSecretAccessKey(),
  bucket: resolveBucket(),
  forcePathStyle: resolveForcePathStyle(),
  serverSideEncryption: resolveServerSideEncryption() || null,
  presignedTtlSeconds: Number(
    readFirstEnv('S3_PRESIGNED_URL_TTL_SECONDS', 'AWS_S3_PRESIGNED_URL_TTL_SECONDS') || 900,
  ),
});

export const isS3Configured = () => {
  const config = getS3StorageConfig();
  return Boolean(config.accessKeyId && config.secretAccessKey && config.bucket);
};

export const assertS3Config = () => {
  const config = getS3StorageConfig();
  const missing = [];
  if (!config.accessKeyId) missing.push('S3_ACCESS_KEY_ID/AWS_ACCESS_KEY_ID');
  if (!config.secretAccessKey) missing.push('S3_SECRET_ACCESS_KEY/AWS_SECRET_ACCESS_KEY');
  if (!config.bucket) missing.push('S3_BUCKET/AWS_S3_BUCKET');
  if (missing.length > 0) {
    throw new Error(`Configuration S3 incomplete. Variables manquantes: ${missing.join(', ')}`);
  }
  return config;
};

let s3Client = null;
let s3ClientFingerprint = null;

const getS3Client = () => {
  const config = assertS3Config();
  const fingerprint = JSON.stringify({
    endpoint: config.endpoint,
    region: config.region,
    accessKeyId: config.accessKeyId,
    forcePathStyle: config.forcePathStyle,
  });
  if (!s3Client || s3ClientFingerprint !== fingerprint) {
    s3Client = new S3Client({
      region: config.region,
      endpoint: config.endpoint || undefined,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    s3ClientFingerprint = fingerprint;
  }
  return s3Client;
};

const bucketName = () => assertS3Config().bucket;
const presignedTtlSeconds = () => {
  const configured = getS3StorageConfig().presignedTtlSeconds;
  return Number.isFinite(configured) && configured > 0 ? configured : 900;
};
const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

const buildEncryptionInput = () => {
  const value = resolveServerSideEncryption();
  return value ? { ServerSideEncryption: value } : {};
};

/** Metadonnees S3 : valeurs ASCII uniquement (sinon SignatureDoesNotMatch cote AWS). */
const sanitizeS3MetadataValue = (value, fallback = '') => {
  const ascii = String(value ?? fallback)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '_')
    .trim()
    .slice(0, 1024);
  return ascii || fallback;
};

const sanitizeSegment = (value) => String(value || '')
  .trim()
  .replace(/[^a-zA-Z0-9-_]/g, '-')
  .replace(/-+/g, '-')
  .slice(0, 120);

const getExtension = (filename, mimeType) => {
  const fromName = path.extname(String(filename || '')).toLowerCase();
  if (fromName) return fromName;
  if (mimeType === 'image/jpeg') return '.jpg';
  if (mimeType === 'image/png') return '.png';
  return '.pdf';
};

export const buildDocumentKey = ({ dossierId, docKey, originalFilename, mimeType }) => {
  if (!dossierId) throw new Error('dossierId requis pour creer une cle S3');
  if (!docKey) throw new Error('docKey requis pour creer une cle S3');
  const uuid = crypto.randomUUID();
  const extension = getExtension(originalFilename, mimeType);
  const safeDossierId = sanitizeSegment(dossierId);
  const safeDocKey = sanitizeSegment(docKey);
  return `dossiers/${safeDossierId}/${safeDocKey}/${uuid}${extension}`;
};

export const buildS3StorageUrl = (bucket, key) => `s3://${bucket}/${key}`;

export const parseS3StorageUrl = (storageUrl) => {
  const source = String(storageUrl || '');
  if (!source.startsWith('s3://')) return null;
  const remainder = source.replace('s3://', '');
  const slashIndex = remainder.indexOf('/');
  if (slashIndex === -1) return null;
  return {
    bucket: remainder.slice(0, slashIndex),
    key: remainder.slice(slashIndex + 1),
  };
};

export async function uploadDocumentToS3({
  buffer,
  dossierId,
  docKey,
  originalFilename,
  mimeType = 'application/pdf',
  metadata = {},
}) {
  if (!buffer) throw new Error('Buffer fichier manquant pour upload S3');
  const key = buildDocumentKey({ dossierId, docKey, originalFilename, mimeType });
  const bucket = bucketName();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ...buildEncryptionInput(),
    Metadata: {
      dossierId: sanitizeS3MetadataValue(dossierId, 'unknown'),
      docKey: sanitizeS3MetadataValue(docKey, 'document'),
      originalFilename: sanitizeS3MetadataValue(originalFilename, 'document.pdf'),
      ...Object.fromEntries(
        Object.entries(metadata || {}).map(([entryKey, value]) => [
          sanitizeS3MetadataValue(entryKey, 'meta'),
          sanitizeS3MetadataValue(value, ''),
        ]),
      ),
    },
  });
  await getS3Client().send(command);
  return {
    storageProvider: 's3',
    bucket,
    key,
    storageUrl: buildS3StorageUrl(bucket, key),
  };
}

export async function uploadDocumentToS3WithRetry(params, { attempts = 3 } = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await uploadDocumentToS3(params);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(250 * attempt);
    }
  }
  throw lastError;
}

export async function probeS3StorageConnectivity() {
  const config = assertS3Config();
  const probeKey = `test/greffio-storage-probe-${Date.now()}.txt`;
  const payload = Buffer.from(`greffio-probe ${new Date().toISOString()}`);
  await getS3Client().send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: probeKey,
    Body: payload,
    ContentType: 'text/plain',
    ...buildEncryptionInput(),
  }));
  await getS3Client().send(new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: probeKey,
  }));
  return {
    ok: true,
    bucket: config.bucket,
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
  };
}

export async function getSignedDownloadUrl(s3Key, bucket = bucketName()) {
  if (!s3Key) throw new Error('Cle S3 manquante pour generer une URL signee');
  const command = new GetObjectCommand({ Bucket: bucket, Key: s3Key });
  const expiresIn = presignedTtlSeconds();
  const url = await getSignedUrl(getS3Client(), command, { expiresIn });
  return { url, expiresIn };
}

export async function getSignedDownloadUrlFromStorageUrl(storageUrl) {
  const parsed = parseS3StorageUrl(storageUrl);
  if (!parsed) return null;
  return getSignedDownloadUrl(parsed.key, parsed.bucket);
}

export async function deleteDocumentFromS3(s3Key, bucket = bucketName()) {
  if (!s3Key) throw new Error('Cle S3 manquante pour suppression');
  await getS3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: s3Key }));
  return true;
}

export async function downloadObjectBufferFromStorageUrl(storageUrl) {
  const parsed = parseS3StorageUrl(storageUrl);
  if (!parsed) throw new Error('S3_STORAGE_URL_INVALID');
  const response = await getS3Client().send(new GetObjectCommand({
    Bucket: parsed.bucket,
    Key: parsed.key,
  }));
  if (typeof response.Body?.transformToByteArray === 'function') {
    return Buffer.from(await response.Body.transformToByteArray());
  }
  const chunks = [];
  for await (const chunk of response.Body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export async function deleteDocumentFromS3StorageUrl(storageUrl) {
  const parsed = parseS3StorageUrl(storageUrl);
  if (!parsed) return { deleted: false, provider: 's3' };
  await deleteDocumentFromS3(parsed.key, parsed.bucket);
  return { deleted: true, provider: 's3' };
}

if (process.env.NODE_ENV === 'production' && String(process.env.DOCUMENT_STORAGE_DRIVER || '').toLowerCase() === 's3') {
  assertS3Config();
}

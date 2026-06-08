import crypto from 'node:crypto';
import path from 'node:path';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const REQUIRED_ENV = [
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_S3_BUCKET',
];

export const isS3Configured = () => REQUIRED_ENV.every((key) => Boolean(process.env[key]));

export const assertS3Config = () => {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Configuration AWS S3 incomplète. Variables manquantes: ${missing.join(', ')}`);
  }
};

let s3Client = null;

const getS3Client = () => {
  if (!s3Client) {
    assertS3Config();
    s3Client = new S3Client({
      region: resolveAwsRegion(),
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
};

const bucketName = () => process.env.AWS_S3_BUCKET;

const resolveAwsRegion = () => (
  process.env.AWS_REGION
  || process.env.AWS_DEFAULT_REGION
  || 'eu-west-3'
);

const presignedTtlSeconds = () => Number(process.env.AWS_S3_PRESIGNED_URL_TTL_SECONDS || 900);

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/** Métadonnées S3 : valeurs ASCII uniquement (sinon SignatureDoesNotMatch côté AWS). */
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
  if (!dossierId) throw new Error('dossierId requis pour créer une clé S3');
  if (!docKey) throw new Error('docKey requis pour créer une clé S3');
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
    ServerSideEncryption: 'AES256',
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
      if (attempt < attempts) {
        await sleep(250 * attempt);
      }
    }
  }
  throw lastError;
}

export async function probeS3StorageConnectivity() {
  assertS3Config();
  const probeKey = `test/greffio-storage-probe-${Date.now()}.txt`;
  const bucket = bucketName();
  const payload = Buffer.from(`greffio-probe ${new Date().toISOString()}`);
  await getS3Client().send(new PutObjectCommand({
    Bucket: bucket,
    Key: probeKey,
    Body: payload,
    ContentType: 'text/plain',
  }));
  await getS3Client().send(new DeleteObjectCommand({
    Bucket: bucket,
    Key: probeKey,
  }));
  return { ok: true, bucket, region: resolveAwsRegion() };
}

export async function getSignedDownloadUrl(s3Key, bucket = bucketName()) {
  if (!s3Key) throw new Error('Clé S3 manquante pour générer une URL signée');
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: s3Key,
  });
  const url = await getSignedUrl(getS3Client(), command, { expiresIn: presignedTtlSeconds() });
  return { url, expiresIn: presignedTtlSeconds() };
}

export async function getSignedDownloadUrlFromStorageUrl(storageUrl) {
  const parsed = parseS3StorageUrl(storageUrl);
  if (!parsed) return null;
  return getSignedDownloadUrl(parsed.key, parsed.bucket);
}

export async function deleteDocumentFromS3(s3Key, bucket = bucketName()) {
  if (!s3Key) throw new Error('Clé S3 manquante pour suppression');
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: s3Key,
  });
  await getS3Client().send(command);
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
  for await (const chunk of response.Body) {
    chunks.push(Buffer.from(chunk));
  }
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

#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const mode = process.argv[2];
const directoryArgument = process.argv[3];
if (!['backup', 'restore'].includes(mode) || !directoryArgument) {
  console.error('Usage: backup-object-storage.mjs <backup|restore> <directory>');
  process.exit(2);
}

const readFirstEnv = (...keys) => {
  for (const key of keys) {
    const value = String(process.env[key] || '').trim();
    if (value) return value;
  }
  return '';
};
const parseBoolean = (value, fallback = false) => {
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const config = {
  endpoint: readFirstEnv('S3_ADMIN_ENDPOINT', 'S3_ENDPOINT', 'AWS_S3_ENDPOINT'),
  region: readFirstEnv('S3_REGION', 'AWS_REGION', 'AWS_DEFAULT_REGION') || 'garage',
  accessKeyId: readFirstEnv('S3_ACCESS_KEY_ID', 'AWS_ACCESS_KEY_ID', 'GARAGE_DEFAULT_ACCESS_KEY'),
  secretAccessKey: readFirstEnv('S3_SECRET_ACCESS_KEY', 'AWS_SECRET_ACCESS_KEY', 'GARAGE_DEFAULT_SECRET_KEY'),
  bucket: readFirstEnv('S3_BUCKET', 'AWS_S3_BUCKET', 'GARAGE_DEFAULT_BUCKET'),
  forcePathStyle: parseBoolean(readFirstEnv('S3_FORCE_PATH_STYLE', 'AWS_S3_FORCE_PATH_STYLE'), true),
};
for (const [key, value] of Object.entries(config)) {
  if (['endpoint', 'region'].includes(key)) continue;
  if (!value && key !== 'forcePathStyle') throw new Error(`S3_${key.toUpperCase()}_REQUIRED`);
}

const client = new S3Client({
  endpoint: config.endpoint || undefined,
  region: config.region,
  forcePathStyle: config.forcePathStyle,
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  },
});

const outputDirectory = path.resolve(directoryArgument);
const objectsDirectory = path.join(outputDirectory, 'objects');
const manifestPath = path.join(outputDirectory, 'manifest.json');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const bodyToBuffer = async (body) => {
  if (typeof body?.transformToByteArray === 'function') {
    return Buffer.from(await body.transformToByteArray());
  }
  const chunks = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
};

const backup = async () => {
  await fs.mkdir(objectsDirectory, { recursive: true, mode: 0o700 });
  const manifest = {
    format: 'greffio-object-backup-v1',
    generatedAt: new Date().toISOString(),
    bucket: config.bucket,
    objects: [],
  };
  let continuationToken;
  do {
    const page = await client.send(new ListObjectsV2Command({
      Bucket: config.bucket,
      ContinuationToken: continuationToken,
    }));
    for (const item of page.Contents || []) {
      const response = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: item.Key }));
      const buffer = await bodyToBuffer(response.Body);
      const digest = sha256(buffer);
      const filename = `${sha256(Buffer.from(item.Key))}.bin`;
      await fs.writeFile(path.join(objectsDirectory, filename), buffer, { mode: 0o600 });
      manifest.objects.push({
        key: item.Key,
        filename,
        bytes: buffer.length,
        sha256: digest,
        etag: item.ETag || null,
        lastModified: item.LastModified?.toISOString?.() || null,
        contentType: response.ContentType || 'application/octet-stream',
        contentEncoding: response.ContentEncoding || null,
        contentDisposition: response.ContentDisposition || null,
        cacheControl: response.CacheControl || null,
        metadata: response.Metadata || {},
      });
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({
    ok: true,
    mode: 'backup',
    bucket: config.bucket,
    objects: manifest.objects.length,
    manifest: manifestPath,
  }));
};

const restore = async () => {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  if (manifest.format !== 'greffio-object-backup-v1') throw new Error('BACKUP_FORMAT_UNSUPPORTED');
  let restored = 0;
  for (const item of manifest.objects || []) {
    const buffer = await fs.readFile(path.join(objectsDirectory, item.filename));
    if (buffer.length !== item.bytes || sha256(buffer) !== item.sha256) {
      throw new Error(`BACKUP_OBJECT_CORRUPT:${item.key}`);
    }
    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: item.key,
      Body: buffer,
      ContentType: item.contentType || 'application/octet-stream',
      ContentEncoding: item.contentEncoding || undefined,
      ContentDisposition: item.contentDisposition || undefined,
      CacheControl: item.cacheControl || undefined,
      Metadata: item.metadata || {},
    }));
    const head = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: item.key }));
    if (Number(head.ContentLength) !== buffer.length) throw new Error(`RESTORE_VERIFY_FAILED:${item.key}`);
    restored += 1;
  }
  console.log(JSON.stringify({ ok: true, mode: 'restore', bucket: config.bucket, restored }));
};

if (mode === 'backup') await backup();
else await restore();

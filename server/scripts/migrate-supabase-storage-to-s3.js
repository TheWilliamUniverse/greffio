#!/usr/bin/env node
import '../loadEnv.js';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Pool } from 'pg';
import {
  assertS3Config,
  buildS3StorageUrl,
  getS3StorageConfig,
} from '../services/s3StorageService.js';

const APPLY = process.argv.includes('--apply');
const ALLOW_JSON_BLOCKERS = process.argv.includes('--allow-json-blockers');
const limitArgument = process.argv.find((argument) => argument.startsWith('--limit='));
const LIMIT = Math.max(1, Number(limitArgument?.split('=')[1] || 1000));

const databaseUrl = String(process.env.DATABASE_URL || '').trim();
const sourceUrl = String(process.env.MIGRATION_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const sourceKey = String(process.env.MIGRATION_SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!databaseUrl) throw new Error('DATABASE_URL_REQUIRED');
if (APPLY && (!sourceUrl || !sourceKey)) {
  throw new Error('MIGRATION_SUPABASE_CREDENTIALS_REQUIRED');
}

const targetConfig = assertS3Config();
const database = new Pool({
  connectionString: databaseUrl,
  ssl: String(process.env.DATABASE_SSL || 'require').toLowerCase() === 'disable'
    ? false
    : { rejectUnauthorized: false },
  max: 2,
});

const s3 = new S3Client({
  region: targetConfig.region,
  endpoint: targetConfig.endpoint || undefined,
  forcePathStyle: targetConfig.forcePathStyle,
  credentials: {
    accessKeyId: targetConfig.accessKeyId,
    secretAccessKey: targetConfig.secretAccessKey,
  },
});

const quoteIdentifier = (value) => `"${String(value).replaceAll('"', '""')}"`;
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const sourceUriHash = (value) => sha256(Buffer.from(String(value)));

const parseSupabaseStorageUrl = (value) => {
  const source = String(value || '');
  if (!source.startsWith('supabase://')) return null;
  const remainder = source.slice('supabase://'.length);
  const slashIndex = remainder.indexOf('/');
  if (slashIndex <= 0 || slashIndex === remainder.length - 1) return null;
  return {
    bucket: remainder.slice(0, slashIndex),
    objectPath: remainder.slice(slashIndex + 1),
  };
};

const encodeObjectPath = (value) => String(value || '')
  .split('/')
  .map((segment) => encodeURIComponent(segment))
  .join('/');

const buildSignedSourceUrl = async ({ bucket, objectPath }) => {
  const response = await fetch(
    `${sourceUrl}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encodeObjectPath(objectPath)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sourceKey}`,
        apikey: sourceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: 600 }),
    },
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`SUPABASE_SIGN_FAILED:${response.status}:${detail.slice(0, 200)}`);
  }
  const payload = await response.json();
  const signedPath = payload?.signedURL || payload?.signedUrl;
  if (!signedPath) throw new Error('SUPABASE_SIGNED_URL_MISSING');
  if (/^https?:\/\//i.test(signedPath)) return signedPath;
  if (signedPath.startsWith('/storage/v1/')) return `${sourceUrl}${signedPath}`;
  if (signedPath.startsWith('/')) return `${sourceUrl}/storage/v1${signedPath}`;
  return `${sourceUrl}/storage/v1/${signedPath}`;
};

const downloadSourceObject = async (parsed) => {
  const signedUrl = await buildSignedSourceUrl(parsed);
  const response = await fetch(signedUrl);
  if (!response.ok) throw new Error(`SUPABASE_DOWNLOAD_FAILED:${response.status}`);
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get('content-type') || 'application/octet-stream',
  };
};

const streamToBuffer = async (body) => {
  if (typeof body?.transformToByteArray === 'function') {
    return Buffer.from(await body.transformToByteArray());
  }
  const chunks = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
};

const safeLegacyKey = ({ bucket, objectPath }) => {
  const safeBucket = String(bucket).replace(/[^a-zA-Z0-9._-]/g, '_');
  const safePath = String(objectPath)
    .replace(/[\u0000-\u001f\u007f]/g, '_')
    .replace(/^\/+/, '');
  return `legacy/supabase/${safeBucket}/${safePath}`;
};

const putAndVerifyTargetObject = async ({ parsed, sourceUri, buffer, contentType }) => {
  const key = safeLegacyKey(parsed);
  const digest = sha256(buffer);
  let alreadyPresent = false;

  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: targetConfig.bucket, Key: key }));
    alreadyPresent = head.Metadata?.sha256 === digest && Number(head.ContentLength) === buffer.length;
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    if (status !== 404 && error?.name !== 'NotFound' && error?.name !== 'NoSuchKey') throw error;
  }

  if (!alreadyPresent) {
    const encryption = targetConfig.serverSideEncryption
      ? { ServerSideEncryption: targetConfig.serverSideEncryption }
      : {};
    await s3.send(new PutObjectCommand({
      Bucket: targetConfig.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ...encryption,
      Metadata: {
        sha256: digest,
        sourceurihash: sourceUriHash(sourceUri),
        migratedat: new Date().toISOString(),
      },
    }));
  }

  const verification = await s3.send(new GetObjectCommand({ Bucket: targetConfig.bucket, Key: key }));
  const targetBuffer = await streamToBuffer(verification.Body);
  const targetDigest = sha256(targetBuffer);
  if (targetDigest !== digest || targetBuffer.length !== buffer.length) {
    throw new Error('S3_VERIFICATION_FAILED');
  }

  return {
    storageUrl: buildS3StorageUrl(targetConfig.bucket, key),
    sha256: digest,
    bytes: buffer.length,
    reused: alreadyPresent,
  };
};

const listDirectReferenceColumns = async () => {
  const result = await database.query(`
    WITH primary_keys AS (
      SELECT
        tc.table_schema,
        tc.table_name,
        kcu.column_name AS primary_key_column,
        COUNT(*) OVER (PARTITION BY tc.table_schema, tc.table_name) AS primary_key_columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON kcu.constraint_name = tc.constraint_name
       AND kcu.table_schema = tc.table_schema
       AND kcu.table_name = tc.table_name
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
    )
    SELECT
      c.table_schema AS "tableSchema",
      c.table_name AS "tableName",
      c.column_name AS "columnName",
      pk.primary_key_column AS "primaryKeyColumn"
    FROM information_schema.columns c
    JOIN primary_keys pk
      ON pk.table_schema = c.table_schema
     AND pk.table_name = c.table_name
     AND pk.primary_key_columns = 1
    WHERE c.table_schema = 'public'
      AND c.data_type IN ('text', 'character varying', 'character')
    ORDER BY c.table_name, c.ordinal_position
  `);
  return result.rows;
};

const listJsonBlockers = async () => {
  const columns = await database.query(`
    SELECT table_schema AS "tableSchema", table_name AS "tableName", column_name AS "columnName"
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type IN ('json', 'jsonb')
    ORDER BY table_name, ordinal_position
  `);
  const blockers = [];
  for (const column of columns.rows) {
    const table = `${quoteIdentifier(column.tableSchema)}.${quoteIdentifier(column.tableName)}`;
    const field = quoteIdentifier(column.columnName);
    const result = await database.query(
      `SELECT COUNT(*)::int AS count FROM ${table} WHERE ${field}::text LIKE '%supabase://%'`,
    );
    const count = Number(result.rows[0]?.count || 0);
    if (count > 0) blockers.push({ ...column, count });
  }
  return blockers;
};

const listDirectReferences = async () => {
  const columns = await listDirectReferenceColumns();
  const references = [];
  let remaining = LIMIT;
  for (const column of columns) {
    if (remaining <= 0) break;
    const table = `${quoteIdentifier(column.tableSchema)}.${quoteIdentifier(column.tableName)}`;
    const field = quoteIdentifier(column.columnName);
    const primaryKey = quoteIdentifier(column.primaryKeyColumn);
    const result = await database.query(
      `SELECT ${primaryKey}::text AS "primaryKeyValue", ${field} AS "storageUrl"
       FROM ${table}
       WHERE ${field} LIKE 'supabase://%'
       ORDER BY ${primaryKey}::text
       LIMIT $1`,
      [remaining],
    );
    for (const row of result.rows) {
      references.push({
        ...column,
        primaryKeyValue: row.primaryKeyValue,
        storageUrl: row.storageUrl,
      });
    }
    remaining -= result.rows.length;
  }
  return references;
};

const updateReference = async (reference, nextStorageUrl) => {
  const table = `${quoteIdentifier(reference.tableSchema)}.${quoteIdentifier(reference.tableName)}`;
  const field = quoteIdentifier(reference.columnName);
  const primaryKey = quoteIdentifier(reference.primaryKeyColumn);
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE ${table}
       SET ${field} = $1
       WHERE ${primaryKey}::text = $2
         AND ${field} = $3`,
      [nextStorageUrl, reference.primaryKeyValue, reference.storageUrl],
    );
    if (result.rowCount !== 1) throw new Error('REFERENCE_UPDATE_CONFLICT');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const run = async () => {
  const startedAt = new Date().toISOString();
  const directReferences = await listDirectReferences();
  const jsonBlockers = await listJsonBlockers();
  const summary = {
    mode: APPLY ? 'apply' : 'audit',
    startedAt,
    limit: LIMIT,
    target: {
      bucket: targetConfig.bucket,
      endpointConfigured: Boolean(getS3StorageConfig().endpoint),
    },
    directReferencesFound: directReferences.length,
    jsonBlockers,
    migrated: 0,
    reusedObjects: 0,
    failed: 0,
    results: [],
  };

  if (!APPLY) {
    summary.results = directReferences.map((reference) => ({
      table: `${reference.tableSchema}.${reference.tableName}`,
      column: reference.columnName,
      primaryKeyColumn: reference.primaryKeyColumn,
      primaryKeyValue: reference.primaryKeyValue,
      sourceUriHash: sourceUriHash(reference.storageUrl),
      status: 'pending',
    }));
  } else {
    if (jsonBlockers.length > 0 && !ALLOW_JSON_BLOCKERS) {
      throw Object.assign(new Error('JSON_SUPABASE_REFERENCES_REQUIRE_MANUAL_MIGRATION'), {
        blockers: jsonBlockers,
      });
    }
    const migratedObjects = new Map();
    for (const reference of directReferences) {
      const resultEntry = {
        table: `${reference.tableSchema}.${reference.tableName}`,
        column: reference.columnName,
        primaryKeyValue: reference.primaryKeyValue,
        sourceUriHash: sourceUriHash(reference.storageUrl),
      };
      try {
        let migrated = migratedObjects.get(reference.storageUrl);
        if (!migrated) {
          const parsed = parseSupabaseStorageUrl(reference.storageUrl);
          if (!parsed) throw new Error('SUPABASE_STORAGE_URL_INVALID');
          const source = await downloadSourceObject(parsed);
          migrated = await putAndVerifyTargetObject({
            parsed,
            sourceUri: reference.storageUrl,
            buffer: source.buffer,
            contentType: source.contentType,
          });
          migratedObjects.set(reference.storageUrl, migrated);
        }
        await updateReference(reference, migrated.storageUrl);
        summary.migrated += 1;
        if (migrated.reused) summary.reusedObjects += 1;
        summary.results.push({
          ...resultEntry,
          status: 'migrated',
          targetStorageUrl: migrated.storageUrl,
          sha256: migrated.sha256,
          bytes: migrated.bytes,
        });
      } catch (error) {
        summary.failed += 1;
        summary.results.push({
          ...resultEntry,
          status: 'failed',
          error: error?.message || 'MIGRATION_FAILED',
        });
      }
    }
  }

  summary.finishedAt = new Date().toISOString();
  const outputDirectory = path.resolve(process.cwd(), 'artifacts', 'migration');
  await fs.mkdir(outputDirectory, { recursive: true });
  const stamp = summary.finishedAt.replace(/[:.]/g, '-');
  const outputPath = path.join(outputDirectory, `supabase-storage-${summary.mode}-${stamp}.json`);
  await fs.writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({
    ok: summary.failed === 0,
    mode: summary.mode,
    directReferencesFound: summary.directReferencesFound,
    jsonBlockers: summary.jsonBlockers,
    migrated: summary.migrated,
    failed: summary.failed,
    manifest: outputPath,
  }, null, 2));
  if (summary.failed > 0) process.exitCode = 1;
};

run()
  .catch((error) => {
    console.error('SUPABASE_STORAGE_MIGRATION_FAILED', {
      error: error?.message || error,
      blockers: error?.blockers || undefined,
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await database.end().catch(() => {});
  });

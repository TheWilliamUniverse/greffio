#!/usr/bin/env node
import '../loadEnv.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { Pool } from 'pg';

const STRICT = process.argv.includes('--strict');
const REQUIRE_ZERO = process.argv.includes('--require-zero');
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!databaseUrl) throw new Error('DATABASE_URL_REQUIRED');

const database = new Pool({
  connectionString: databaseUrl,
  ssl: String(process.env.DATABASE_SSL || 'require').toLowerCase() === 'disable'
    ? false
    : { rejectUnauthorized: false },
  max: 2,
});

const quoteIdentifier = (value) => `"${String(value).replaceAll('"', '""')}"`;

const listColumns = async () => {
  const result = await database.query(`
    WITH primary_keys AS (
      SELECT
        tc.table_schema,
        tc.table_name,
        array_agg(kcu.column_name ORDER BY kcu.ordinal_position) AS primary_key_columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON kcu.constraint_name = tc.constraint_name
       AND kcu.table_schema = tc.table_schema
       AND kcu.table_name = tc.table_name
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
      GROUP BY tc.table_schema, tc.table_name
    )
    SELECT
      c.table_schema AS "tableSchema",
      c.table_name AS "tableName",
      c.column_name AS "columnName",
      c.data_type AS "dataType",
      c.udt_name AS "udtName",
      COALESCE(pk.primary_key_columns, ARRAY[]::information_schema.sql_identifier[]) AS "primaryKeyColumns"
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
     AND t.table_type = 'BASE TABLE'
    LEFT JOIN primary_keys pk
      ON pk.table_schema = c.table_schema
     AND pk.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND (
        c.data_type IN ('text', 'character varying', 'character', 'json', 'jsonb', 'ARRAY')
        OR c.udt_name IN ('text', 'varchar', 'bpchar', '_text', '_varchar', '_bpchar')
      )
    ORDER BY c.table_name, c.ordinal_position
  `);
  return result.rows;
};

const classify = (column) => {
  const isDirectText = ['text', 'character varying', 'character'].includes(column.dataType);
  if (isDirectText && column.primaryKeyColumns.length === 1) return 'direct-migratable';
  if (['json', 'jsonb'].includes(column.dataType)) return 'json-manual';
  if (column.dataType === 'ARRAY' || String(column.udtName || '').startsWith('_')) return 'array-manual';
  if (column.primaryKeyColumns.length === 0) return 'missing-primary-key';
  if (column.primaryKeyColumns.length > 1) return 'composite-primary-key';
  return 'manual-review';
};

const scan = async () => {
  const findings = [];
  for (const column of await listColumns()) {
    const table = `${quoteIdentifier(column.tableSchema)}.${quoteIdentifier(column.tableName)}`;
    const field = quoteIdentifier(column.columnName);
    const result = await database.query(
      `SELECT COUNT(*)::int AS count
       FROM ${table}
       WHERE ${field} IS NOT NULL
         AND ${field}::text LIKE '%supabase://%'`,
    );
    const count = Number(result.rows[0]?.count || 0);
    if (count === 0) continue;
    findings.push({
      tableSchema: column.tableSchema,
      tableName: column.tableName,
      columnName: column.columnName,
      dataType: column.dataType,
      primaryKeyColumns: column.primaryKeyColumns,
      classification: classify(column),
      count,
    });
  }
  const totalReferences = findings.reduce((sum, finding) => sum + finding.count, 0);
  const migratableReferences = findings
    .filter((finding) => finding.classification === 'direct-migratable')
    .reduce((sum, finding) => sum + finding.count, 0);
  const blockers = findings.filter((finding) => finding.classification !== 'direct-migratable');
  return {
    generatedAt: new Date().toISOString(),
    totalReferences,
    migratableReferences,
    blockerReferences: blockers.reduce((sum, finding) => sum + finding.count, 0),
    blockers,
    findings,
  };
};

try {
  const report = await scan();
  const outputDirectory = path.resolve(process.cwd(), 'artifacts', 'migration');
  await fs.mkdir(outputDirectory, { recursive: true });
  const stamp = report.generatedAt.replace(/[:.]/g, '-');
  const outputPath = path.join(outputDirectory, `supabase-storage-reference-audit-${stamp}.json`);
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({
    ok: report.blockerReferences === 0 && (!REQUIRE_ZERO || report.totalReferences === 0),
    totalReferences: report.totalReferences,
    migratableReferences: report.migratableReferences,
    blockerReferences: report.blockerReferences,
    blockers: report.blockers,
    manifest: outputPath,
  }, null, 2));
  if (STRICT && report.blockerReferences > 0) process.exitCode = 2;
  if (REQUIRE_ZERO && report.totalReferences > 0) process.exitCode = 3;
} catch (error) {
  console.error('SUPABASE_STORAGE_REFERENCE_AUDIT_FAILED', error?.message || error);
  process.exitCode = 1;
} finally {
  await database.end().catch(() => {});
}

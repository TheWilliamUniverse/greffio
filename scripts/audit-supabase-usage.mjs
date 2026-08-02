#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(process.cwd());
const STRICT = process.argv.includes('--strict');
const JSON_ONLY = process.argv.includes('--json');

const EXCLUDED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  'artifacts',
  'releases',
  'staging-deploy',
]);

const EXCLUDED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip', '.gz', '.tgz',
  '.aab', '.apk', '.jks', '.keystore', '.woff', '.woff2', '.ttf', '.otf', '.mp4', '.webm',
]);

const PATTERNS = [
  { id: 'supabase-env', regex: /\bSUPABASE_[A-Z0-9_]+\b/g },
  { id: 'supabase-uri', regex: /\bsupabase:\/\//gi },
  { id: 'supabase-sdk', regex: /@supabase\/[a-z0-9._/-]+/gi },
  { id: 'supabase-domain', regex: /[a-z0-9-]+\.supabase\.co/gi },
  { id: 'supabase-word', regex: /\bsupabase\b/gi },
  { id: 'service-role', regex: /\bservice_role\b/gi },
];

const normalize = (value) => value.split(path.sep).join('/');

const isHistoricalMigration = (relativePath) => (
  relativePath.startsWith('server/migrations/')
  && /(?:supabase|rls|postgrest)/i.test(relativePath)
);

const classify = (relativePath) => {
  if (relativePath === 'scripts/audit-supabase-usage.mjs') return 'audit-tool';
  if (relativePath === 'server/scripts/migrate-supabase-storage-to-s3.js') return 'migration-tool';
  if (relativePath.startsWith('docs/') || relativePath.endsWith('.md')) return 'documentation';
  if (isHistoricalMigration(relativePath)) return 'historical-migration';
  if (relativePath.includes('/tests/') || relativePath.includes('.test.') || relativePath.includes('.spec.')) {
    return 'test';
  }
  if (relativePath === '.env.example' || relativePath.endsWith('.env.example')) return 'configuration';
  return 'runtime-blocker';
};

const shouldReadFile = (relativePath) => {
  const extension = path.extname(relativePath).toLowerCase();
  return !EXCLUDED_EXTENSIONS.has(extension);
};

const walk = async (directory) => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(absolutePath));
      continue;
    }
    if (entry.isFile()) files.push(absolutePath);
  }
  return files;
};

const redactLine = (line) => {
  let value = String(line || '');
  value = value.replace(/(SUPABASE_[A-Z0-9_]+\s*=\s*)[^\s#]+/g, '$1<redacted>');
  value = value.replace(/(sb_(?:secret|publishable)_[A-Za-z0-9_-]+)/g, '<redacted-supabase-key>');
  value = value.replace(/(eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,})/g, '<redacted-jwt>');
  value = value.replace(/(postgres(?:ql)?:\/\/[^:\s]+:)[^@\s]+@/gi, '$1<redacted>@');
  return value.trim().slice(0, 300);
};

const scan = async () => {
  const files = (await walk(ROOT)).filter((file) => shouldReadFile(path.relative(ROOT, file)));
  const findings = [];

  for (const absolutePath of files) {
    const relativePath = normalize(path.relative(ROOT, absolutePath));
    let content;
    try {
      content = await fs.readFile(absolutePath, 'utf8');
    } catch (_error) {
      continue;
    }
    if (!content) continue;
    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const matchedPatternIds = [];
      for (const pattern of PATTERNS) {
        pattern.regex.lastIndex = 0;
        if (pattern.regex.test(line)) matchedPatternIds.push(pattern.id);
      }
      if (!matchedPatternIds.length) continue;
      findings.push({
        file: relativePath,
        line: index + 1,
        classification: classify(relativePath),
        patterns: [...new Set(matchedPatternIds)],
        excerpt: redactLine(line),
      });
    }
  }

  const counts = findings.reduce((accumulator, finding) => {
    accumulator[finding.classification] = (accumulator[finding.classification] || 0) + 1;
    return accumulator;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    root: '.',
    strict: STRICT,
    summary: {
      filesScanned: files.length,
      findings: findings.length,
      runtimeBlockers: counts['runtime-blocker'] || 0,
      configuration: counts.configuration || 0,
      documentation: counts.documentation || 0,
      historicalMigrations: counts['historical-migration'] || 0,
      migrationTools: counts['migration-tool'] || 0,
      tests: counts.test || 0,
    },
    findings,
  };
};

const toMarkdown = (result) => {
  const lines = [
    '# Inventaire automatise Supabase',
    '',
    `Genere le ${result.generatedAt}.`,
    '',
    `- Fichiers analyses : ${result.summary.filesScanned}`,
    `- Occurrences : ${result.summary.findings}`,
    `- Bloquants runtime : ${result.summary.runtimeBlockers}`,
    `- Configuration : ${result.summary.configuration}`,
    `- Documentation : ${result.summary.documentation}`,
    `- Migrations historiques : ${result.summary.historicalMigrations}`,
    `- Outils de migration : ${result.summary.migrationTools}`,
    `- Tests : ${result.summary.tests}`,
    '',
  ];

  if (!result.findings.length) {
    lines.push('Aucune reference Supabase trouvee.');
    return lines.join('\n');
  }

  lines.push('| Classement | Fichier | Ligne | Motifs | Extrait expurge |');
  lines.push('|---|---|---:|---|---|');
  for (const finding of result.findings) {
    const excerpt = finding.excerpt.replaceAll('|', '\\|');
    lines.push(`| ${finding.classification} | \`${finding.file}\` | ${finding.line} | ${finding.patterns.join(', ')} | \`${excerpt}\` |`);
  }
  return lines.join('\n');
};

try {
  const result = await scan();
  if (JSON_ONLY) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else process.stdout.write(`${toMarkdown(result)}\n`);
  if (STRICT && result.summary.runtimeBlockers > 0) process.exitCode = 2;
} catch (error) {
  console.error('SUPABASE_AUDIT_FAILED', error?.message || error);
  process.exitCode = 1;
}

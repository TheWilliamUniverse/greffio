import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const iconSource = path.join(repoRoot, 'assets', 'play-store', 'source', 'icon-source.svg');
const iconTarget = path.join(repoRoot, 'assets', 'play-store', 'icon-512.png');
const featureSource = path.join(repoRoot, 'assets', 'play-store', 'source', 'feature-graphic-source.html');
const featureTarget = path.join(repoRoot, 'assets', 'play-store', 'feature-graphic-1024x500.png');

const LIMITS = {
  iconBytes: 1 * 1024 * 1024,
  featureBytes: 15 * 1024 * 1024,
};

async function ensureExists(filePath) {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`Missing required source file: ${path.relative(repoRoot, filePath)}`);
  }
}

async function pngDimensions(filePath) {
  const buffer = await fs.readFile(filePath);
  // PNG signature is 8 bytes, IHDR starts after signature, width/height at bytes 16..23.
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error(`File is not a valid PNG: ${path.relative(repoRoot, filePath)}`);
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

async function renderIcon(page) {
  await page.setViewportSize({ width: 512, height: 512 });
  const svgUrl = `file:///${iconSource.replace(/\\/g, '/')}`;
  await page.goto(svgUrl, { waitUntil: 'load', timeout: 15_000 });
  await page.screenshot({ path: iconTarget, type: 'png' });
}

async function renderFeatureGraphic(page) {
  await page.setViewportSize({ width: 1024, height: 500 });
  const htmlUrl = `file:///${featureSource.replace(/\\/g, '/')}`;
  await page.goto(htmlUrl, { waitUntil: 'load', timeout: 15_000 });
  await page.screenshot({ path: featureTarget, type: 'png' });
}

async function validateAsset(filePath, expectedWidth, expectedHeight, maxBytes) {
  const stat = await fs.stat(filePath);
  const { width, height } = await pngDimensions(filePath);
  const ok = width === expectedWidth && height === expectedHeight && stat.size <= maxBytes;
  return {
    file: path.relative(repoRoot, filePath),
    width,
    height,
    sizeBytes: stat.size,
    expected: `${expectedWidth}x${expectedHeight}`,
    maxBytes,
    valid: ok,
  };
}

function printValidation(result) {
  const status = result.valid ? 'OK' : 'ERROR';
  console.log(
    `${status} ${result.file} -> ${result.width}x${result.height}, ${(result.sizeBytes / 1024).toFixed(1)} KB (expected ${result.expected}, max ${(result.maxBytes / 1024 / 1024).toFixed(1)} MB)`,
  );
}

async function main() {
  await ensureExists(iconSource);
  await ensureExists(featureSource);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await renderIcon(page);
  await renderFeatureGraphic(page);
  await browser.close();

  const iconReport = await validateAsset(iconTarget, 512, 512, LIMITS.iconBytes);
  const featureReport = await validateAsset(featureTarget, 1024, 500, LIMITS.featureBytes);

  console.log('Play Store assets generation report:');
  printValidation(iconReport);
  printValidation(featureReport);

  if (!iconReport.valid || !featureReport.valid) {
    throw new Error('One or more generated assets do not comply with Google Play constraints.');
  }
}

main().catch((error) => {
  console.error('Failed to generate Play Store assets.');
  console.error(error);
  process.exitCode = 1;
});

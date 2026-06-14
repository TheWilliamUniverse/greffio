import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const wordmarkSvg = path.join(repoRoot, 'assets', 'play-store', 'source', 'greffio-wordmark-official.svg');
const backgroundSource = path.join(repoRoot, 'assets', 'payments', 'source', 'payment-background-source.html');
const logoTarget = path.join(repoRoot, 'assets', 'payments', 'greffio-payment-logo.png');
const backgroundTarget = path.join(repoRoot, 'assets', 'payments', 'greffio-payment-background.png');

async function pngDimensions(filePath) {
  const buffer = await fs.readFile(filePath);
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error(`File is not a valid PNG: ${path.relative(repoRoot, filePath)}`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

async function renderAssets() {
  await fs.mkdir(path.dirname(logoTarget), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const svgMarkup = await fs.readFile(wordmarkSvg, 'utf8');
  const sizedSvg = svgMarkup.replace(
    '<svg ',
    '<svg width="640" height="149" preserveAspectRatio="xMidYMid meet" ',
  );
  await page.setViewportSize({ width: 640, height: 150 });
  await page.setContent(
    `<!DOCTYPE html><html><body style="margin:0;width:640px;height:150px;display:flex;align-items:center;justify-content:center;background:transparent;">${sizedSvg}</body></html>`,
    { waitUntil: 'load' },
  );
  await page.screenshot({
    path: logoTarget,
    type: 'png',
    omitBackground: true,
  });

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`file:///${backgroundSource.replace(/\\/g, '/')}`, { waitUntil: 'load', timeout: 15_000 });
  await page.screenshot({
    path: backgroundTarget,
    type: 'png',
  });

  await browser.close();

  const logo = await pngDimensions(logoTarget);
  const background = await pngDimensions(backgroundTarget);

  if (logo.width > 640 || logo.height > 150) {
    throw new Error(`Logo exceeds 640x150: ${logo.width}x${logo.height}`);
  }
  if (background.width > 1920 || background.height > 1080) {
    throw new Error(`Background exceeds 1920x1080: ${background.width}x${background.height}`);
  }

  process.stdout.write(
    `PAYMENT_BRANDING_GENERATED:${path.relative(repoRoot, logoTarget)} (${logo.width}x${logo.height}), ${path.relative(repoRoot, backgroundTarget)} (${background.width}x${background.height})\n`,
  );
}

renderAssets().catch((error) => {
  process.stderr.write(`${error.message || 'PAYMENT_BRANDING_GENERATION_FAILED'}\n`);
  process.exit(1);
});

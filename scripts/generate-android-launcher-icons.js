import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const iconSource = path.join(repoRoot, 'assets', 'play-store', 'source', 'icon-source.svg');
const androidResRoot = path.join(repoRoot, 'android', 'app', 'src', 'main', 'res');

const LAUNCHER_SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const FOREGROUND_SIZES = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

async function renderPng(page, size, targetPath) {
  await page.setViewportSize({ width: size, height: size });
  const svgUrl = `file:///${iconSource.replace(/\\/g, '/')}`;
  await page.goto(svgUrl, { waitUntil: 'load', timeout: 15_000 });
  await page.screenshot({ path: targetPath, type: 'png' });
}

async function main() {
  await fs.access(iconSource);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const [folder, size] of Object.entries(LAUNCHER_SIZES)) {
    const dir = path.join(androidResRoot, folder);
    await fs.mkdir(dir, { recursive: true });
    await renderPng(page, size, path.join(dir, 'ic_launcher.png'));
    await renderPng(page, size, path.join(dir, 'ic_launcher_round.png'));
  }

  for (const [folder, size] of Object.entries(FOREGROUND_SIZES)) {
    const dir = path.join(androidResRoot, folder);
    await fs.mkdir(dir, { recursive: true });
    await renderPng(page, size, path.join(dir, 'ic_launcher_foreground.png'));
  }

  await browser.close();
  console.log('Android launcher icons generated from Greffio icon source.');
}

main().catch((error) => {
  console.error('Failed to generate Android launcher icons.');
  console.error(error);
  process.exitCode = 1;
});

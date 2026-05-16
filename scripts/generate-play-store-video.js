import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const sourceHtml = path.join(repoRoot, 'assets', 'play-store', 'source', 'promo-video-desktop.html');
const outputDir = path.join(repoRoot, 'assets', 'play-store', 'video');
const outputVideo = path.join(outputDir, 'promo-desktop.webm');

async function main() {
  await fs.access(sourceHtml);
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: outputDir,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();
  const videoHandle = page.video();
  const url = `file:///${sourceHtml.replace(/\\/g, '/')}`;
  await page.goto(url, { waitUntil: 'load', timeout: 15_000 });

  // One full cycle = 24s in CSS animation, plus a small lead-in.
  await page.waitForTimeout(26_000);

  await context.close();
  await browser.close();

  if (!videoHandle) {
    throw new Error('Video capture handle is not available.');
  }

  const tempVideoPath = await videoHandle.path();
  await fs.copyFile(tempVideoPath, outputVideo);

  const stat = await fs.stat(outputVideo);
  console.log(`Desktop promo video generated: assets/play-store/video/promo-desktop.webm (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((error) => {
  console.error('Failed to generate Play Store promo video.');
  console.error(error);
  process.exitCode = 1;
});

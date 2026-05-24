import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const sourceSvg = path.join(repoRoot, 'assets', 'email', 'greffio-wordmark-white.svg');
const targets = [
  path.join(repoRoot, 'server', 'assets', 'email', 'greffio-wordmark-white.png'),
  path.join(repoRoot, 'public', 'icons', 'greffio-email-wordmark.png'),
];

const renderLogo = async () => {
  await fs.mkdir(path.dirname(targets[0]), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 446, height: 104 });
  const svgUrl = `file:///${sourceSvg.replace(/\\/g, '/')}`;
  await page.goto(svgUrl, { waitUntil: 'load', timeout: 15_000 });

  const buffer = await page.screenshot({
    type: 'png',
    omitBackground: true,
  });
  await browser.close();

  for (const target of targets) {
    await fs.writeFile(target, buffer);
  }

  process.stdout.write(`EMAIL_LOGO_GENERATED:${targets.map((file) => path.relative(repoRoot, file)).join(',')}\n`);
};

renderLogo().catch((error) => {
  process.stderr.write(`${error.message || 'EMAIL_LOGO_GENERATION_FAILED'}\n`);
  process.exit(1);
});

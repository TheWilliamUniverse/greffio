import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const baseUrl = process.env.PLAYSTORE_BASE_URL || 'http://127.0.0.1:3000';
const outputRoot = path.join(repoRoot, 'assets', 'play-store', 'screenshots');
const phoneSourceRoot = path.join(repoRoot, 'assets', 'play-store', 'source', 'phone');
const OFFICIAL_ICON = '../../../public/icons/greffio-icon.svg';
const USE_SITE_SOURCES = process.env.PLAYSTORE_USE_SITE_SOURCES !== '0';

const SCREEN_GROUPS = [
  {
    folder: 'phone',
    width: 1080,
    height: 1920,
    minCount: 4,
    maxCount: 8,
    sizeLimitBytes: 8 * 1024 * 1024,
    minSide: 320,
    maxSide: 3840,
  },
  {
    folder: 'tablet-7',
    width: 1440,
    height: 2560,
    minCount: 1,
    maxCount: 8,
    sizeLimitBytes: 8 * 1024 * 1024,
    minSide: 320,
    maxSide: 3840,
  },
  {
    folder: 'tablet-10',
    width: 2880,
    height: 5120,
    minCount: 1,
    maxCount: 8,
    sizeLimitBytes: 8 * 1024 * 1024,
    minSide: 1080,
    maxSide: 7680,
  },
  {
    folder: 'chromebook',
    width: 1920,
    height: 1080,
    minCount: 4,
    maxCount: 8,
    sizeLimitBytes: 8 * 1024 * 1024,
    minSide: 1080,
    maxSide: 7680,
  },
  {
    folder: 'android-xr',
    width: 1920,
    height: 1080,
    minCount: 4,
    maxCount: 8,
    sizeLimitBytes: 15 * 1024 * 1024,
    minSide: 720,
    maxSide: 7680,
  },
];

const SCENES = [
  { file: '01-accueil-greffio.png', sourceHtml: '01-accueil-greffio.html', activeNavTab: 'accueil', navVariant: 'public', route: '/', title: 'Accueil Greffio', subtitle: 'Formalités d’entreprise simplifiées', fallbackTag: 'Accueil' },
  { file: '02-recherche-siren-siret.png', sourceHtml: '02-recherche-siren-siret.html', activeNavTab: 'simuler', navVariant: 'public', route: '/simulateur', title: 'Recherche SIREN / SIRET', subtitle: 'Entreprise trouvée : Nova Atelier SAS', fallbackTag: 'Recherche' },
  { file: '03-questionnaire-progressif.png', sourceHtml: '03-questionnaire-progressif.html', activeNavTab: 'new', navVariant: 'auth', route: '/questionnaire', title: 'Questionnaire progressif', subtitle: 'Étape 2 sur 6 - informations entreprise', fallbackTag: 'Questionnaire' },
  { file: '04-dashboard-dossier.png', sourceHtml: '04-dashboard-dossier.html', activeNavTab: 'home', navVariant: 'auth', route: '/dashboard', title: 'Dashboard dossier', subtitle: 'Suivez les étapes et actions prioritaires', fallbackTag: 'Dashboard' },
  { file: '05-documents.png', sourceHtml: '05-documents.html', activeNavTab: 'documents', navVariant: 'auth', route: '/documents', title: 'Documents à transmettre', subtitle: 'Pièces centralisées et statut de vérification', fallbackTag: 'Documents' },
  { file: '06-suivi-dossier.png', sourceHtml: '06-suivi-dossier.html', activeNavTab: 'dossiers', navVariant: 'auth', route: '/dossiers', title: 'Suivi du dossier', subtitle: 'Prochaines actions et avancement en direct', fallbackTag: 'Suivi dossier' },
];

const MOBILE_LOGICAL_VIEWPORT = { width: 1080, height: 1920 };

function resolveCaptureProfile(group) {
  if (['phone', 'tablet-7', 'tablet-10'].includes(group.folder)) {
    const scaleX = group.width / MOBILE_LOGICAL_VIEWPORT.width;
    const scaleY = group.height / MOBILE_LOGICAL_VIEWPORT.height;
    const deviceScaleFactor = Math.min(scaleX, scaleY);
    return {
      viewport: MOBILE_LOGICAL_VIEWPORT,
      deviceScaleFactor,
    };
  }
  return {
    viewport: { width: group.width, height: group.height },
    deviceScaleFactor: 1,
  };
}

function applyActiveNavTab(navHtml, activeTab) {
  return navHtml.replace(
    /(<a class=")bottom-nav-link(" href="#" data-tab=")([^"]+)(")/g,
    (_match, prefix, middle, tab, suffix) => (
      tab === activeTab
        ? `${prefix}bottom-nav-link active${middle}${tab}${suffix}`
        : `${prefix}bottom-nav-link${middle}${tab}${suffix}`
    ),
  );
}

const PHONE_DEVICE_SHELL_OPEN = [
  '<body class="capture-phone">',
  '<div class="phone-stage">',
  '<div class="iphone-device">',
  '<span class="iphone-btn iphone-btn-vol-up" aria-hidden="true"></span>',
  '<span class="iphone-btn iphone-btn-vol-down" aria-hidden="true"></span>',
  '<span class="iphone-btn iphone-btn-power" aria-hidden="true"></span>',
  '<div class="iphone-glass">',
  '<div class="iphone-screen">',
].join('');

const PHONE_DEVICE_SHELL_CLOSE = '</div></div></div></div>';

function wrapPhoneDeviceHtml(html) {
  return html
    .replace('<body>', PHONE_DEVICE_SHELL_OPEN)
    .replace('</main>', `</main>${PHONE_DEVICE_SHELL_CLOSE}`)
    .replace(
      '<div class="status-bar">',
      '<div class="status-bar"><div class="dynamic-island" aria-hidden="true"><span class="di-sensor"></span></div>',
    );
}

async function loadSceneHtml(scene, { captureMode = 'phone' } = {}) {
  const htmlPath = path.join(phoneSourceRoot, scene.sourceHtml);
  let html = await fs.readFile(htmlPath, 'utf8');
  const fragmentName = scene.navVariant === 'public' ? 'bottom-nav-public.html' : 'bottom-nav-auth.html';
  const fragmentPath = path.join(phoneSourceRoot, 'fragments', fragmentName);
  let nav = await fs.readFile(fragmentPath, 'utf8');
  nav = applyActiveNavTab(nav, scene.activeNavTab);
  if (!html.includes('<!-- BOTTOM_NAV -->')) {
    throw new Error(`Missing <!-- BOTTOM_NAV --> placeholder in ${scene.sourceHtml}`);
  }
  html = html.replace('<!-- BOTTOM_NAV -->', nav);

  const cssPath = path.join(phoneSourceRoot, 'play-store-shared.css');
  const css = await fs.readFile(cssPath, 'utf8');
  html = html.replace(
    '<link rel="stylesheet" href="./play-store-shared.css" />',
    `<style>${css}</style>`,
  );

  const wordmarkSvg = await fs.readFile(path.join(phoneSourceRoot, '..', 'greffio-wordmark-official.svg'), 'utf8');
  const inlineWordmark = wordmarkSvg.replace('<svg ', '<svg class="wordmark" ');
  html = html.replace(/<img class="wordmark"[^>]*>/g, inlineWordmark);

  if (captureMode === 'tablet') {
    html = html.replace('<body>', '<body class="capture-tablet">');
  } else if (captureMode === 'phone') {
    html = wrapPhoneDeviceHtml(html);
  }

  return html;
}

function maskSensitiveDataInDom() {
  const selectors = [
    'input[type="password"]',
    'input[name*="password" i]',
    'input[name*="token" i]',
    'input[name*="secret" i]',
    'input[name*="apikey" i]',
    'input[name*="api_key" i]',
    '[data-sensitive="true"]',
  ];
  for (const selector of selectors) {
    for (const node of document.querySelectorAll(selector)) {
      if (node instanceof HTMLInputElement) {
        node.value = '••••••••';
        node.setAttribute('value', '••••••••');
      } else {
        node.textContent = '••••••••';
      }
    }
  }
}

function buildFallbackTemplate({ title, subtitle, tag, width, height }) {
  const escapedTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escapedSubtitle = subtitle.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escapedTag = tag.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const scale = Math.min(width / 1080, height / 1920);
  const pad = Math.round(70 * scale);
  const titleSize = Math.max(44, Math.round(68 * scale));
  const subtitleSize = Math.max(24, Math.round(34 * scale));
  const rowSize = Math.max(16, Math.round(28 * scale));
  const radius = Math.max(16, Math.round(28 * scale));
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedTitle}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      width: ${width}px;
      height: ${height}px;
      font-family: Inter, "Segoe UI", Roboto, Arial, sans-serif;
      background: linear-gradient(165deg, #f8faff 0%, #eef3ff 100%);
      color: #0f172a;
      overflow: hidden;
    }
    .wrap { padding: ${pad}px; display: flex; flex-direction: column; height: 100%; }
    .logo {
      width: ${Math.round(280 * scale)}px;
      max-width: 46%;
      height: auto;
    }
    .tag { margin-top: ${Math.round(20 * scale)}px; align-self: flex-start; padding: ${Math.round(10 * scale)}px ${Math.round(18 * scale)}px; border-radius: 999px; border: 1px solid #dbe5ff; color: #1d4ed8; background: #e8efff; font-weight: 700; font-size: ${Math.round(22 * scale)}px; }
    .title { margin-top: ${Math.round(28 * scale)}px; font-size: ${titleSize}px; line-height: 1.08; letter-spacing: -0.03em; font-weight: 760; }
    .subtitle { margin-top: ${Math.round(18 * scale)}px; font-size: ${subtitleSize}px; line-height: 1.3; color: #334155; }
    .card {
      margin-top: ${Math.round(58 * scale)}px;
      background: #fff;
      border: 1px solid #e5eaff;
      border-radius: ${radius}px;
      box-shadow: 0 24px 54px rgba(15, 23, 42, 0.12);
      padding: ${Math.round(36 * scale)}px;
      display: grid;
      gap: ${Math.round(18 * scale)}px;
    }
    .row { display: flex; justify-content: space-between; font-size: ${rowSize}px; }
    .label { color: #64748b; }
    .value { font-weight: 650; }
    .footer { margin-top: auto; font-size: ${Math.round(22 * scale)}px; color: #64748b; }
    .service { font-size: ${Math.round(22 * scale)}px; color: #94a3b8; margin-top: ${Math.round(10 * scale)}px; }
  </style>
</head>
<body>
  <main class="wrap">
    <img class="logo" src="${OFFICIAL_ICON}" alt="Greffio logo" />
    <div class="tag">${escapedTag}</div>
    <p class="subtitle">${escapedSubtitle}</p>
    <section class="card">
      <div class="row"><span class="label">Entreprise</span><span class="value">Nova Atelier SAS</span></div>
      <div class="row"><span class="label">SIREN</span><span class="value">123 456 789</span></div>
      <div class="row"><span class="label">SIRET</span><span class="value">123 456 789 00012</span></div>
      <div class="row"><span class="label">Ville</span><span class="value">Paris</span></div>
      <div class="row"><span class="label">Statut</span><span class="value">Activée</span></div>
      <div class="row"><span class="label">Activité</span><span class="value">Conseil aux entreprises</span></div>
    </section>
    <div class="footer">${escapedTitle}</div>
    <div class="service">Service privé indépendant</div>
  </main>
</body>
</html>`;
}

function resolveCaptureMode(groupFolder) {
  if (groupFolder === 'phone') return 'phone';
  if (['tablet-7', 'tablet-10'].includes(groupFolder)) return 'tablet';
  return 'default';
}

async function captureSiteSourceHtml(browser, group, scene) {
  const captureMode = resolveCaptureMode(group.folder);
  const html = await loadSceneHtml(scene, { captureMode });
  const { viewport, deviceScaleFactor } = resolveCaptureProfile(group);
  const page = await browser.newPage({ viewport, deviceScaleFactor });
  await page.setContent(html, { waitUntil: 'networkidle', timeout: 20_000 });
  await page.waitForTimeout(400);
  return { page, resolvedUrl: `site-source:${scene.sourceHtml}`, usedFallback: false };
}

async function captureRouteOrFallback(browser, group, scene) {
  const viewport = { width: group.width, height: group.height };
  let page;
  let usedFallback = false;
  let resolvedUrl = `${baseUrl}${scene.route}`;

  if (USE_SITE_SOURCES && ['phone', 'tablet-7', 'tablet-10'].includes(group.folder)) {
    try {
      ({ page, resolvedUrl, usedFallback } = await captureSiteSourceHtml(browser, group, scene));
    } catch {
      page = undefined;
    }
  }

  if (!page) {
    page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    try {
      const response = await page.goto(resolvedUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 });
      if (!response || response.status() >= 400) {
        throw new Error(`Invalid response status for ${resolvedUrl}`);
      }
      await page.waitForTimeout(900);
      await page.evaluate(maskSensitiveDataInDom);
    } catch {
      usedFallback = true;
      resolvedUrl = `fallback:${scene.route}`;
      await page.close();
      page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
      const html = buildFallbackTemplate({
        title: scene.title,
        subtitle: scene.subtitle,
        tag: scene.fallbackTag,
        width: group.width,
        height: group.height,
      });
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
    }
  }

  const targetDir = path.join(outputRoot, group.folder);
  await fs.mkdir(targetDir, { recursive: true });
  const targetPath = path.join(targetDir, scene.file);
  await page.screenshot({ path: targetPath, fullPage: false });
  const stat = await fs.stat(targetPath);
  await page.close();
  return {
    file: scene.file,
    route: scene.route,
    group: group.folder,
    resolvedUrl,
    usedFallback,
    width: group.width,
    height: group.height,
    sizeBytes: stat.size,
  };
}

function ratioAllowed(width, height) {
  const ratio = width / height;
  const ratio16by9 = 16 / 9;
  const ratio9by16 = 9 / 16;
  return Math.abs(ratio - ratio16by9) < 0.01 || Math.abs(ratio - ratio9by16) < 0.01;
}

function validateResult(group, result) {
  const sideMin = Math.min(result.width, result.height);
  const sideMax = Math.max(result.width, result.height);
  const rulesOk = (
    ratioAllowed(result.width, result.height) &&
    sideMin >= group.minSide &&
    sideMax <= group.maxSide &&
    result.sizeBytes <= group.sizeLimitBytes
  );
  return rulesOk;
}

async function main() {
  await fs.mkdir(outputRoot, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  const results = [];
  for (const group of SCREEN_GROUPS) {
    for (const scene of SCENES) {
      const result = await captureRouteOrFallback(browser, group, scene);
      results.push(result);
    }
  }

  await browser.close();

  console.log('Play Store screenshots generated in: assets/play-store/screenshots/');
  for (const item of results) {
    const group = SCREEN_GROUPS.find((g) => g.folder === item.group);
    const valid = validateResult(group, item);
    const mode = item.usedFallback ? 'fallback-template' : 'site-source';
    const status = valid ? 'OK' : 'ERROR';
    console.log(`- [${status}] ${item.group}/${item.file} (${item.width}x${item.height}, ${(item.sizeBytes / 1024).toFixed(1)} KB, ${mode} -> ${item.resolvedUrl})`);
  }

  for (const group of SCREEN_GROUPS) {
    const count = results.filter((item) => item.group === group.folder).length;
    const withinCount = count >= group.minCount && count <= group.maxCount;
    if (!withinCount) {
      throw new Error(`Screenshot count for ${group.folder} is invalid (${count}, expected ${group.minCount}-${group.maxCount}).`);
    }
  }

  const invalid = results.some((item) => {
    const group = SCREEN_GROUPS.find((g) => g.folder === item.group);
    return !validateResult(group, item);
  });
  if (invalid) {
    throw new Error('At least one generated screenshot does not comply with Play Console constraints.');
  }
}

main().catch((error) => {
  console.error('Failed to generate Play Store screenshots.');
  console.error(error);
  process.exitCode = 1;
});

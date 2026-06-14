import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAppVersionConfig } from '../../config/appVersion.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

const parseReleaseVersionProperties = () => {
  const propsPath = path.join(repoRoot, 'android', 'release-version.properties');
  if (!fs.existsSync(propsPath)) return null;
  const raw = fs.readFileSync(propsPath, 'utf8');
  const versionName = raw.match(/^versionName=(.+)$/m)?.[1]?.trim();
  const versionCode = Number.parseInt(raw.match(/^versionCode=(.+)$/m)?.[1]?.trim() || '', 10);
  if (!versionName || !Number.isFinite(versionCode)) return null;
  return { versionName, versionCode };
};

const findLatestApkInReleases = () => {
  const releasesDir = path.join(repoRoot, 'releases', 'android');
  if (!fs.existsSync(releasesDir)) return null;
  const candidates = fs.readdirSync(releasesDir)
    .filter((name) => name.endsWith('.apk'))
    .map((name) => {
      const fullPath = path.join(releasesDir, name);
      const stat = fs.statSync(fullPath);
      return { name, fullPath, mtimeMs: stat.mtimeMs, sizeBytes: stat.size };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0] || null;
};

export const resolveAppDownloadApk = () => {
  const fromEnv = String(process.env.APP_DOWNLOAD_APK_PATH || '').trim();
  if (fromEnv) {
    const resolved = path.isAbsolute(fromEnv) ? fromEnv : path.join(repoRoot, fromEnv);
    if (fs.existsSync(resolved)) {
      const stat = fs.statSync(resolved);
      return {
        path: resolved,
        filename: path.basename(resolved),
        sizeBytes: stat.size,
        versionName: getAppVersionConfig().latestVersionName,
        versionCode: getAppVersionConfig().latestVersionCode,
      };
    }
  }

  const props = parseReleaseVersionProperties();
  const versionName = props?.versionName || getAppVersionConfig().latestVersionName;
  const versionCode = props?.versionCode || getAppVersionConfig().latestVersionCode;

  const bundledPath = path.join(repoRoot, 'server', 'assets', 'mobile', 'greffio-latest.apk');
  if (fs.existsSync(bundledPath)) {
    const stat = fs.statSync(bundledPath);
    return {
      path: bundledPath,
      filename: `greffio-${versionName}-${versionCode}.apk`,
      sizeBytes: stat.size,
      versionName,
      versionCode,
    };
  }

  const expectedName = `greffio-${versionName}-${versionCode}.apk`;
  const expectedPath = path.join(repoRoot, 'releases', 'android', expectedName);

  if (fs.existsSync(expectedPath)) {
    const stat = fs.statSync(expectedPath);
    return {
      path: expectedPath,
      filename: expectedName,
      sizeBytes: stat.size,
      versionName,
      versionCode,
    };
  }

  const latest = findLatestApkInReleases();
  if (latest) {
    const match = latest.name.match(/^greffio-(.+)-(\d+)\.apk$/);
    return {
      path: latest.fullPath,
      filename: latest.name,
      sizeBytes: latest.sizeBytes,
      versionName: match?.[1] || versionName,
      versionCode: match?.[2] ? Number.parseInt(match[2], 10) : versionCode,
    };
  }

  return {
    path: null,
    filename: expectedName,
    sizeBytes: 0,
    versionName,
    versionCode,
  };
};

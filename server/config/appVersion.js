/**
 * Configuration du système de mise à jour de l'application mobile Greffio.
 *
 * Règle ops : ne monter `PUBLISHED_*` que lorsque la version est **effectivement
 * publiée sur le Play Store** (confirmation explicite du porteur : « j'ai posté »).
 * Un AAB préparé en local ne doit jamais déclencher la modale.
 *
 * Consommé par `GET /api/app-version` :
 *  - `latestVersionCode` / `latestVersionName` : dernière version Play Store publiée ;
 *  - `minimumRequiredVersionCode` : en-dessous → MAJ obligatoire (bloquante) ;
 *  - `playStoreUrl`, `updateUrl`, `title`, `message`, `changelog` ;
 *  - `optionalReminderHours` : délai avant de réafficher une MAJ optionnelle.
 *
 * Les variables `APP_LATEST_VERSION_*` sont ignorées volontairement pour éviter
 * une annonce prématurée depuis le .env VPS.
 */

const PLAY_STORE_DEFAULT = 'https://play.google.com/store/apps/details?id=com.greffio.app';

/** Dernière version réellement publiée sur le Play Store — ne monter qu'après « j'ai posté ». */
const PUBLISHED_VERSION_CODE = 261510020;
const PUBLISHED_VERSION_NAME = '1.2.20';

const parseIntStrict = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseChangelog = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value)
    .split(/\r?\n|\|/g)
    .map((item) => item.trim())
    .filter(Boolean);
};

const DEFAULT_MIN_VERSION_CODE = 261422041;

const PUBLISHED_CHANGELOG = [
  'Connexion : messages d’erreur auth plus clairs',
  'Questionnaire mobile : avancement au tap plus fluide',
  'Paiement SASU : parcours checkout fiabilisé',
  'Éditeur ONLYOFFICE : conflits de version mieux signalés',
  'Signature : liens expirés avec renvoi facilité',
];

export const getAppVersionConfig = () => ({
  latestVersionCode: PUBLISHED_VERSION_CODE,
  latestVersionName: PUBLISHED_VERSION_NAME,
  publishedVersionCode: PUBLISHED_VERSION_CODE,
  publishedVersionName: PUBLISHED_VERSION_NAME,
  minimumRequiredVersionCode: parseIntStrict(process.env.APP_MIN_VERSION_CODE, DEFAULT_MIN_VERSION_CODE),
  playStoreUrl: process.env.APP_PLAY_STORE_URL || PLAY_STORE_DEFAULT,
  updateUrl: process.env.APP_UPDATE_URL || null,
  title: process.env.APP_UPDATE_TITLE || 'Nouvelle version disponible',
  message:
    process.env.APP_UPDATE_MESSAGE
    || "Une nouvelle version de Greffio est disponible avec des corrections et améliorations.",
  changelog: parseChangelog(process.env.APP_UPDATE_CHANGELOG) || PUBLISHED_CHANGELOG,
  optionalReminderHours: parseIntStrict(process.env.APP_UPDATE_OPTIONAL_REMINDER_HOURS, 24),
});

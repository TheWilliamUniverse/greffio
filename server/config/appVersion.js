/**
 * Configuration du système de mise à jour de l'application mobile Greffio.
 *
 * Cette configuration est consommée par la route `GET /api/app-version` et
 * pilote la stratégie de notification de mise à jour côté Android :
 *  - `latestVersionCode`        : dernier versionCode publié sur le Play Store ;
 *  - `minimumRequiredVersionCode` : versionCode en-dessous duquel la MAJ
 *                                   devient obligatoire (mode bloquant) ;
 *  - `latestVersionName`        : libellé sémantique affiché à l'utilisateur ;
 *  - `playStoreUrl`             : lien Play Store officiel (prioritaire) ;
 *  - `updateUrl`                : lien APK externe (fallback hors Play Store) ;
 *  - `title` / `message`        : copie affichée dans la modale ;
 *  - `changelog`                : liste de bullets affichées dans la modale ;
 *  - `optionalReminderHours`    : délai minimum avant de réafficher une MAJ
 *                                 optionnelle après un "Plus tard".
 *
 * Toutes les valeurs sont surchargeables par variable d'environnement, ce qui
 * permet aux ops de pousser une nouvelle version sans redéploiement de code.
 */

const PLAY_STORE_DEFAULT = 'https://play.google.com/store/apps/details?id=com.greffio.app';

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

const DEFAULT_LATEST_VERSION_CODE = 261510001;
const DEFAULT_MIN_VERSION_CODE = 261422041;
const DEFAULT_LATEST_VERSION_NAME = '1.2.2';

const DEFAULT_CHANGELOG = [
  'Liens profonds Android : domaine greffio.willentreprises.com associé à l’app',
  'Parcours démarches en grille 2 colonnes sur l’app mobile',
  'Connexion : affichage mot de passe et verrouillage après 30 min d’inactivité',
  'Statuts PDF personnalisés, copies certifiées à 1,49 €, page Documents simplifiée',
];

export const getAppVersionConfig = () => ({
  latestVersionCode: parseIntStrict(process.env.APP_LATEST_VERSION_CODE, DEFAULT_LATEST_VERSION_CODE),
  minimumRequiredVersionCode: parseIntStrict(process.env.APP_MIN_VERSION_CODE, DEFAULT_MIN_VERSION_CODE),
  latestVersionName: process.env.APP_LATEST_VERSION_NAME || DEFAULT_LATEST_VERSION_NAME,
  playStoreUrl: process.env.APP_PLAY_STORE_URL || PLAY_STORE_DEFAULT,
  updateUrl: process.env.APP_UPDATE_URL || null,
  title: process.env.APP_UPDATE_TITLE || 'Nouvelle version disponible',
  message:
    process.env.APP_UPDATE_MESSAGE
    || "Une nouvelle version de Greffio est disponible avec des corrections et améliorations.",
  changelog: parseChangelog(process.env.APP_UPDATE_CHANGELOG) || DEFAULT_CHANGELOG,
  optionalReminderHours: parseIntStrict(process.env.APP_UPDATE_OPTIONAL_REMINDER_HOURS, 24),
});

/**
 * Constantes et helpers de type pour le système de mise à jour applicative.
 *
 * On utilise un objet figé en JS (équivalent d'une `sealed class` Kotlin)
 * plutôt qu'un enum, afin de rester cohérent avec le reste du codebase JS
 * et de pouvoir sérialiser proprement les états sur le wire / les logs.
 */

export const UPDATE_KIND = Object.freeze({
  NO_UPDATE: 'NoUpdate',
  OPTIONAL: 'OptionalUpdate',
  REQUIRED: 'RequiredUpdate',
});

export const buildNoUpdate = (current) => ({
  kind: UPDATE_KIND.NO_UPDATE,
  currentVersionCode: current,
});

export const buildOptionalUpdate = ({ current, config }) => ({
  kind: UPDATE_KIND.OPTIONAL,
  currentVersionCode: current,
  latestVersionCode: config.latestVersionCode,
  latestVersionName: config.latestVersionName,
  title: config.title,
  message: config.message,
  changelog: config.changelog || [],
  playStoreUrl: config.playStoreUrl || null,
  updateUrl: config.updateUrl || null,
  blocking: false,
});

export const buildRequiredUpdate = ({ current, config }) => ({
  kind: UPDATE_KIND.REQUIRED,
  currentVersionCode: current,
  latestVersionCode: config.latestVersionCode,
  latestVersionName: config.latestVersionName,
  minimumRequiredVersionCode: config.minimumRequiredVersionCode,
  title: config.title,
  message: config.message,
  changelog: config.changelog || [],
  playStoreUrl: config.playStoreUrl || null,
  updateUrl: config.updateUrl || null,
  blocking: true,
});

export const isUpdateBlocking = (state) => state?.kind === UPDATE_KIND.REQUIRED;
export const isUpdateAvailable = (state) =>
  state?.kind === UPDATE_KIND.OPTIONAL || state?.kind === UPDATE_KIND.REQUIRED;

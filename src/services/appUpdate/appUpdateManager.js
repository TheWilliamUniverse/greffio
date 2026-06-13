/**
 * AppUpdateManager – abstraction sur le mécanisme de vérification / lancement
 * de mise à jour.
 *
 * Deux implémentations sont prévues :
 *  - `RemoteConfigUpdateManager` (actif aujourd'hui) : interroge un endpoint
 *    distant `/api/app-version` et compare avec le versionCode natif obtenu
 *    via `@capacitor/app`.
 *  - `PlayStoreUpdateManager` (placeholder) : à brancher quand on ajoutera
 *    Play Core In-App Updates côté Android natif. La surface est compatible
 *    avec un futur plugin Capacitor custom.
 *
 * Toute erreur est isolée : `checkForUpdate()` ne lance jamais une exception
 * non gérée vers l'appelant – il renvoie un état `NoUpdate` en cas de pépin.
 */

import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { resolveUpdateState } from './appUpdateLogic.js';
import { UPDATE_KIND, isUpdateAvailable } from './appUpdateTypes.js';
import { runtimeConfig } from '@/config/runtime.js';

const isNative = () => {
  try {
    return Capacitor?.isNativePlatform?.() === true;
  } catch (_error) {
    return false;
  }
};

const getCurrentVersionCode = async () => {
  if (!isNative()) return 0;
  try {
    const info = await CapApp.getInfo();
    const code = Number.parseInt(String(info?.build ?? ''), 10);
    return Number.isFinite(code) ? code : 0;
  } catch (_error) {
    return 0;
  }
};

const fetchRemoteConfig = async ({ signal } = {}) => {
  const base = runtimeConfig?.apiBaseUrl || '';
  const url = `${base}/api/app-version`;
  try {
    const response = await fetch(url, { signal, credentials: 'omit' });
    if (!response.ok) return null;
    const payload = await response.json();
    return payload && typeof payload === 'object' ? payload : null;
  } catch (_error) {
    return null;
  }
};

const openExternal = async (url) => {
  if (!url) return false;
  try {
    if (isNative()) {
      await CapApp.openUrl({ url });
      return true;
    }
  } catch (_error) {
    // fallback web
  }
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  } catch (_error) {
    return false;
  }
};

export const createRemoteConfigUpdateManager = () => ({
  name: 'RemoteConfigUpdateManager',

  async getCurrentVersionCode() {
    return getCurrentVersionCode();
  },

  async checkForUpdate({ signal } = {}) {
    const [current, remote] = await Promise.all([
      getCurrentVersionCode(),
      fetchRemoteConfig({ signal }),
    ]);
    return resolveUpdateState({ currentVersionCode: current, remoteConfig: remote });
  },

  async startUpdate(updateState) {
    if (!isUpdateAvailable(updateState)) return false;
    if (await openExternal(updateState.playStoreUrl)) return true;
    if (await openExternal(updateState.updateUrl)) return true;
    return false;
  },
});

/**
 * Placeholder pour une future intégration Play Core In-App Updates.
 * Tant qu'un plugin Capacitor natif n'est pas ajouté, on délègue au manager
 * distant.
 */
export const createPlayStoreUpdateManager = () => {
  const remote = createRemoteConfigUpdateManager();
  return {
    name: 'PlayStoreUpdateManager',
    getCurrentVersionCode: remote.getCurrentVersionCode,
    checkForUpdate: remote.checkForUpdate,
    startUpdate: remote.startUpdate,
    /**
     * Marqueur permettant à l'UI de switcher vers un flow Play Core
     * "flexible / immediate" quand le plugin natif sera disponible.
     */
    supportsInAppUpdate: false,
  };
};

export const defaultAppUpdateManager = createRemoteConfigUpdateManager();

export const __internals = { UPDATE_KIND, isNative };

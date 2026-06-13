/**
 * Hook React orchestrant la vérification de mise à jour applicative.
 *
 * Cycle :
 *  1. Au montage, attend un court délai pour ne pas peser sur le démarrage,
 *     puis interroge le manager d'update.
 *  2. Filtre via la persistance "snooze" – si l'utilisateur a cliqué sur
 *     "Plus tard" et que le délai n'est pas écoulé, ne déclenche pas la
 *     modale (sauf si une MAJ obligatoire est disponible).
 *  3. Expose un état stable + 3 actions : `startUpdate`, `dismiss`, `recheck`.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { defaultAppUpdateManager } from '@/services/appUpdate/appUpdateManager.js';
import { UPDATE_KIND, isUpdateBlocking } from '@/services/appUpdate/appUpdateTypes.js';
import {
  getSnoozeUntil,
  setSnoozeUntil,
} from '@/services/appUpdate/appUpdateStorage.js';

const STARTUP_DELAY_MS = 1500;

const log = (...args) => {
  if (typeof console !== 'undefined') {
    console.info('[appUpdate]', ...args);
  }
};

export const useAppUpdate = ({
  manager = defaultAppUpdateManager,
  enabled = true,
  reminderHours = 24,
} = {}) => {
  const [state, setState] = useState({ kind: UPDATE_KIND.NO_UPDATE });
  const [open, setOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const abortRef = useRef(null);

  const performCheck = useCallback(async () => {
    if (!enabled) return;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    try {
      const next = await manager.checkForUpdate({ signal: controller.signal });
      setState(next);

      if (next.kind === UPDATE_KIND.REQUIRED) {
        setOpen(true);
        return;
      }
      if (next.kind === UPDATE_KIND.OPTIONAL) {
        const snoozeUntil = await getSnoozeUntil(next.latestVersionCode);
        if (Date.now() >= snoozeUntil) {
          setOpen(true);
        } else {
          log('snooze actif jusqu\'à', new Date(snoozeUntil).toISOString());
        }
      }
    } catch (error) {
      log('check failed', error?.message || error);
    }
  }, [enabled, manager]);

  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setTimeout(() => {
      void performCheck();
    }, STARTUP_DELAY_MS);
    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [enabled, performCheck]);

  const startUpdate = useCallback(async () => {
    if (!state || state.kind === UPDATE_KIND.NO_UPDATE) return false;
    setStarting(true);
    try {
      const ok = await manager.startUpdate(state);
      if (!ok) {
        log('startUpdate sans cible exploitable');
      }
      return ok;
    } finally {
      setStarting(false);
    }
  }, [manager, state]);

  const dismiss = useCallback(async () => {
    if (isUpdateBlocking(state)) return false;
    if (state?.kind === UPDATE_KIND.OPTIONAL) {
      const reminderMs = Math.max(1, reminderHours) * 3600 * 1000;
      await setSnoozeUntil({
        versionCode: state.latestVersionCode,
        untilTs: Date.now() + reminderMs,
      });
    }
    setOpen(false);
    return true;
  }, [reminderHours, state]);

  return {
    state,
    open,
    starting,
    startUpdate,
    dismiss,
    recheck: performCheck,
  };
};

import { isCapacitorNative } from '@/utils/platform.js';

let hapticsModule;

const loadHaptics = async () => {
  if (!isCapacitorNative()) return null;
  if (hapticsModule !== undefined) return hapticsModule;
  try {
    hapticsModule = await import('@capacitor/haptics');
    return hapticsModule;
  } catch (_error) {
    hapticsModule = null;
    return null;
  }
};

export const triggerMobileHaptic = async (kind = 'light') => {
  const mod = await loadHaptics();
  if (!mod?.Haptics) return;

  try {
    const { Haptics, ImpactStyle, NotificationType } = mod;
    if (kind === 'success') {
      await Haptics.notification({ type: NotificationType.Success });
      return;
    }
    if (kind === 'warning') {
      await Haptics.notification({ type: NotificationType.Warning });
      return;
    }
    if (kind === 'medium') {
      await Haptics.impact({ style: ImpactStyle.Medium });
      return;
    }
    if (kind === 'heavy') {
      await Haptics.impact({ style: ImpactStyle.Heavy });
      return;
    }
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (_error) {
    // ignore – appareil sans vibreur ou permission refusée
  }
};

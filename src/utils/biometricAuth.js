import { Preferences } from '@capacitor/preferences';
import { NativeBiometric, BiometryType } from '@capgo/capacitor-native-biometric';
import { isCapacitorNative, getNativePlatform } from '@/utils/platform.js';

const BIOMETRIC_ENABLED_KEY = 'greffio_biometric_enabled';
const BIOMETRIC_SERVER = 'com.greffio.app';

export const isBiometricAvailable = async () => {
  if (!isCapacitorNative()) return false;
  try {
    const result = await NativeBiometric.isAvailable();
    return Boolean(result?.isAvailable);
  } catch (_error) {
    return false;
  }
};

export const getBiometryLabel = async () => {
  if (!isCapacitorNative()) return 'Biométrie';
  try {
    const result = await NativeBiometric.isAvailable();
    if (result?.biometryType === BiometryType.faceId || result?.biometryType === BiometryType.faceAuthentication) {
      return 'Face ID';
    }
    if (result?.biometryType === BiometryType.touchId || result?.biometryType === BiometryType.fingerprintAuthentication) {
      return getNativePlatform() === 'ios' ? 'Touch ID' : 'Empreinte digitale';
    }
    return 'Biométrie';
  } catch (_error) {
    return 'Biométrie';
  }
};

export const isBiometricUnlockEnabled = async () => {
  if (!isCapacitorNative()) return false;
  const payload = await Preferences.get({ key: BIOMETRIC_ENABLED_KEY });
  return payload?.value === 'true';
};

export const enableBiometricUnlock = async ({ email, refreshToken }) => {
  if (!email || !refreshToken) throw new Error('SESSION_REQUIRED');
  const available = await isBiometricAvailable();
  if (!available) throw new Error('BIOMETRIC_UNAVAILABLE');

  await NativeBiometric.verifyIdentity({
    reason: 'Activer le déverrouillage biométrique Greffio',
    title: 'Greffio',
    subtitle: 'Confirmez votre identité',
    description: 'Le refresh token sera stocké dans le coffre sécurisé natif.',
  });

  await NativeBiometric.setCredentials({
    username: String(email).toLowerCase().trim(),
    password: String(refreshToken),
    server: BIOMETRIC_SERVER,
  });
  await Preferences.set({ key: BIOMETRIC_ENABLED_KEY, value: 'true' });
  return true;
};

export const disableBiometricUnlock = async () => {
  if (isCapacitorNative()) {
    try {
      await NativeBiometric.deleteCredentials({ server: BIOMETRIC_SERVER });
    } catch (_error) {
      // ignore missing credentials
    }
  }
  await Preferences.set({ key: BIOMETRIC_ENABLED_KEY, value: 'false' });
};

export const unlockWithBiometric = async () => {
  const enabled = await isBiometricUnlockEnabled();
  if (!enabled) return { ok: true, skipped: true };

  await NativeBiometric.verifyIdentity({
    reason: 'Déverrouiller Greffio',
    title: 'Greffio',
    subtitle: 'Accès sécurisé',
    description: 'Utilisez votre biométrie pour continuer.',
  });

  const credentials = await NativeBiometric.getCredentials({ server: BIOMETRIC_SERVER });
  if (!credentials?.username || !credentials?.password) {
    throw new Error('BIOMETRIC_CREDENTIALS_MISSING');
  }

  return {
    ok: true,
    email: credentials.username,
    refreshToken: credentials.password,
  };
};

export const refreshBiometricCredentials = async ({ email, refreshToken }) => {
  const enabled = await isBiometricUnlockEnabled();
  if (!enabled || !email || !refreshToken) return;
  try {
    await NativeBiometric.setCredentials({
      username: String(email).toLowerCase().trim(),
      password: String(refreshToken),
      server: BIOMETRIC_SERVER,
    });
  } catch (_error) {
    // non-blocking
  }
};

export const syncBiometricRefreshToken = refreshBiometricCredentials;

const KEYS = Object.freeze({
  welcomeDone: 'greffio.native.welcomeDone',
  navCoachmarksDone: 'greffio.native.navCoachmarksDone',
  biometricPromptDone: 'greffio.native.biometricPromptDone',
  pushPromptReady: 'greffio.native.pushPromptReady',
  coldStartRouted: 'greffio.native.coldStartRouted',
});

const readFlag = (key) => {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch (_error) {
    return false;
  }
};

const writeFlag = (key, value = true) => {
  try {
    window.localStorage.setItem(key, value ? '1' : '0');
  } catch (_error) {
    // ignore
  }
};

export const hasCompletedNativeWelcome = () => readFlag(KEYS.welcomeDone);

export const markNativeWelcomeDone = () => writeFlag(KEYS.welcomeDone);

export const hasSeenNativeNavCoachmarks = () => readFlag(KEYS.navCoachmarksDone);

export const markNativeNavCoachmarksDone = () => writeFlag(KEYS.navCoachmarksDone);

export const hasCompletedNativeBiometricPrompt = () => readFlag(KEYS.biometricPromptDone);

export const markNativeBiometricPromptDone = () => writeFlag(KEYS.biometricPromptDone);

export const isNativePushPromptReady = () => readFlag(KEYS.pushPromptReady);

export const markNativePushPromptReady = () => writeFlag(KEYS.pushPromptReady);

export const hasNativeColdStartRouted = () => {
  try {
    return window.sessionStorage.getItem(KEYS.coldStartRouted) === '1';
  } catch (_error) {
    return false;
  }
};

export const markNativeColdStartRouted = () => {
  try {
    window.sessionStorage.setItem(KEYS.coldStartRouted, '1');
  } catch (_error) {
    // ignore
  }
};

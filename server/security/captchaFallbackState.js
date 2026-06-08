let turnstileDegradedUntil = 0;
let consecutiveTurnstileFailures = 0;
let lastTurnstileFailureAt = 0;

const FAILURE_WINDOW_MS = 10 * 60 * 1000;
const FAILURE_THRESHOLD = 3;
const DEGRADE_MINUTES = Number(process.env.TURNSTILE_DEGRADE_MINUTES || 30);

export const recordTurnstileProviderFailure = () => {
  const now = Date.now();
  if (now - lastTurnstileFailureAt > FAILURE_WINDOW_MS) {
    consecutiveTurnstileFailures = 0;
  }
  consecutiveTurnstileFailures += 1;
  lastTurnstileFailureAt = now;
  if (consecutiveTurnstileFailures >= FAILURE_THRESHOLD) {
    turnstileDegradedUntil = now + DEGRADE_MINUTES * 60 * 1000;
  }
};

export const isTurnstileDegraded = () => Date.now() < turnstileDegradedUntil;

export const __testOnlyResetCaptchaFallbackState = () => {
  turnstileDegradedUntil = 0;
  consecutiveTurnstileFailures = 0;
  lastTurnstileFailureAt = 0;
};

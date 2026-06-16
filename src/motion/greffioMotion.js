/** Tokens motion Greffio — bleu institutionnel, transitions subtiles. */
export const GREFFIO_DURATION = {
  instant: 0.12,
  fast: 0.18,
  normal: 0.28,
  slow: 0.52,
};

export const GREFFIO_EASE = [0.22, 1, 0.36, 1];
export const GREFFIO_EASE_OUT = [0.16, 1, 0.3, 1];

export const greffioPageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: GREFFIO_DURATION.fast, ease: GREFFIO_EASE },
};

export const greffioCardLift = {
  whileHover: { y: -3, transition: { duration: GREFFIO_DURATION.normal, ease: GREFFIO_EASE } },
  whileTap: { scale: 0.985, transition: { duration: GREFFIO_DURATION.instant } },
};

export const greffioTileTap = {
  whileTap: { scale: 0.98, transition: { duration: GREFFIO_DURATION.instant } },
};

export const greffioSlideIn = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: GREFFIO_DURATION.normal, ease: GREFFIO_EASE },
};

export const greffioFadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: GREFFIO_DURATION.normal, ease: GREFFIO_EASE },
};

export const greffioOrbBreathe = {
  animate: { scale: [1, 1.04, 1], opacity: [0.92, 1, 0.92] },
  transition: { repeat: Infinity, duration: 3.2, ease: 'easeInOut' },
};

export const greffioAutosavePulse = {
  animate: { opacity: [0.65, 1, 0.65] },
  transition: { repeat: Infinity, duration: 1.4, ease: 'easeInOut' },
};

export const greffioTimelinePulse = {
  animate: { scale: [1, 1.12, 1] },
  transition: { duration: 0.6, ease: GREFFIO_EASE_OUT },
};

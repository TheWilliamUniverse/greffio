import { useReducedMotion } from 'framer-motion';

export const MOBILE_EASE = [0.22, 1, 0.36, 1];

export const mobileViewport = { once: true, amount: 0.12 };

export function useMobileMotion() {
  const reduceMotion = useReducedMotion();

  const reveal = (delay = 0) => (reduceMotion
    ? {}
    : {
      initial: { opacity: 0, y: 24 },
      whileInView: { opacity: 1, y: 0 },
      viewport: mobileViewport,
      transition: { duration: 0.52, delay, ease: MOBILE_EASE },
    });

  const revealMount = (delay = 0) => (reduceMotion
    ? {}
    : {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.48, delay, ease: MOBILE_EASE },
    });

  const staggerItem = (index = 0) => (reduceMotion
    ? {}
    : {
      initial: { opacity: 0, y: 16 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.4, delay: index * 0.06, ease: MOBILE_EASE },
    });

  return { reduceMotion, reveal, revealMount, staggerItem };
}

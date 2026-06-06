import { useReducedMotion } from 'framer-motion';

export const PRICING_EASE = [0.22, 1, 0.36, 1];

export const usePricingMotion = () => {
  const reduceMotion = useReducedMotion();
  const viewport = { once: true, amount: 0.14 };

  const reveal = (delay = 0) => (reduceMotion
    ? {}
    : {
      initial: { opacity: 0, y: 24 },
      whileInView: { opacity: 1, y: 0 },
      viewport,
      transition: { duration: 0.55, delay, ease: PRICING_EASE },
    });

  const hoverLift = reduceMotion ? undefined : { y: -5, transition: { type: 'spring', stiffness: 320, damping: 22 } };

  return { reduceMotion, reveal, hoverLift };
};

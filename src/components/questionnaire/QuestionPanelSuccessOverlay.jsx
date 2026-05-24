import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

export const QuestionPanelSuccessOverlay = ({ phase }) => {
  if (!phase || phase === 'done') return null;

  const showIcon = phase === 'validated' || phase === 'closing';

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-md bg-white/75 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: phase === 'closing' ? 0.55 : 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {showIcon ? (
        <div className="relative flex items-center justify-center">
          <motion.span
            className="absolute h-20 w-20 rounded-full bg-primary/15"
            initial={{ scale: 0.35, opacity: 0.85 }}
            animate={{ scale: 1.75, opacity: 0 }}
            transition={{ duration: 0.85, ease: 'easeOut', delay: phase === 'validated' ? 0.05 : 0.2 }}
          />
          <motion.span
            className="absolute h-14 w-14 rounded-full border-2 border-primary/25"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1.15, opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.18 }}
          />
          <motion.div
            className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-[0_10px_30px_rgba(15,39,80,0.22)]"
            initial={{ scale: 0.55, opacity: 0, rotate: -12 }}
            animate={
              phase === 'validated'
                ? { scale: 1, opacity: 1, rotate: 0 }
                : { scale: 0.82, opacity: 0.65, rotate: -6 }
            }
            transition={{ type: 'spring', stiffness: 340, damping: 20, delay: phase === 'validated' ? 0.08 : 0 }}
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={phase === 'validated' ? { scale: 1, opacity: 1 } : { scale: 0.5, opacity: 0.4 }}
              transition={{ duration: 0.35, ease: 'easeOut', delay: phase === 'validated' ? 0.22 : 0 }}
            >
              <CheckCircle2 className="h-8 w-8" strokeWidth={2.4} />
            </motion.div>
          </motion.div>
        </div>
      ) : null}
    </motion.div>
  );
};

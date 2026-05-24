import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { getAgeYears, parseBirthDate } from '@/config/minorAssociateRules.js';

const isFutureBirthDate = (value) => {
  const parsed = parseBirthDate(value);
  if (!parsed) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return parsed.getTime() > today.getTime();
};

export const BirthDateMinorEncouragement = ({
  birthDate,
  showLegalHint = false,
  className = '',
}) => {
  const age = useMemo(() => {
    if (!birthDate || !parseBirthDate(birthDate) || isFutureBirthDate(birthDate)) return null;
    return getAgeYears(birthDate);
  }, [birthDate]);

  const visible = age != null && age >= 0 && age < 18;

  return (
    <AnimatePresence mode="wait">
      {visible ? (
        <motion.div
          key={`minor-msg-${age}`}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={`mt-2 space-y-1 ${className}`.trim()}
          role="status"
          aria-live="polite"
        >
          <p className="text-sm leading-6 text-[hsl(var(--greffio-blue-900))]/80">
            <Sparkles className="mr-1.5 inline h-4 w-4 shrink-0 text-[hsl(var(--greffio-citron))]" aria-hidden="true" />
            Tu t&apos;y intéresses déjà à {age} ans ? Bravo, on est là pour t&apos;aider à transformer ta curiosité en ambition.
          </p>
          {showLegalHint ? (
            <p className="pl-6 text-xs leading-5 text-muted-foreground/90">
              Certaines démarches peuvent nécessiter l&apos;accord ou l&apos;accompagnement d&apos;un représentant légal.
            </p>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

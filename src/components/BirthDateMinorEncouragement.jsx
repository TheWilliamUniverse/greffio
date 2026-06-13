import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { QuestionnaireNotice } from '@/components/questionnaire/QuestionnaireNotice.jsx';
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
          className={className}
          role="status"
          aria-live="polite"
        >
          <QuestionnaireNotice variant="tip" title={`Tu t’as lancé à ${age} ans – bravo.`}>
            On est là pour transformer ta curiosité en ambition.
            {showLegalHint ? (
              <span className="mt-2 block text-xs leading-5 opacity-90">
                Certaines démarches peuvent nécessiter l&apos;accord ou l&apos;accompagnement d&apos;un représentant légal.
              </span>
            ) : null}
          </QuestionnaireNotice>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

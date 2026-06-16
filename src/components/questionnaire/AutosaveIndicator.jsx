import React from 'react';
import { motion } from 'framer-motion';
import { Check, CloudOff, Loader2 } from 'lucide-react';
import { greffioAutosavePulse } from '@/motion/greffioMotion.js';

export const AutosaveIndicator = ({ status }) => {
  if (status === 'saving') {
    return (
      <motion.span
        {...greffioAutosavePulse}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden />
        Sauvegarde…
      </motion.span>
    );
  }
  if (status === 'saved') {
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.22 }}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700"
      >
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
        Enregistré
      </motion.span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800">
        <CloudOff className="h-3.5 w-3.5" aria-hidden />
        Erreur
      </span>
    );
  }
  return (
    <span className="text-xs text-muted-foreground">Sauvegarde automatique</span>
  );
};

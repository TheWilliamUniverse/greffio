import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

export const DossierVaultPickerOverlay = ({
  open,
  dossiers = [],
  onSelect,
  onClose,
}) => (
  <AnimatePresence>
    {open ? (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center bg-[hsl(var(--greffio-blue))]/95 p-6 text-white"
      >
        <motion.div
          initial={{ scale: 0.96, y: 12 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.98, opacity: 0 }}
          className="w-full max-w-lg rounded-2xl border border-white/15 bg-white/10 p-8 backdrop-blur"
        >
          <motion.div
            animate={{ rotate: [0, -6, 6, 0] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/15"
          >
            <FolderKanban className="h-8 w-8" />
          </motion.div>
          <h2 className="text-center text-2xl font-extrabold">Choisir le dossier à gérer</h2>
          <p className="mt-3 text-center text-sm leading-6 text-white/80">
            Vos documents dépendent du dossier sélectionné. Choisissez celui que vous souhaitez consulter ou compléter.
          </p>
          <div className="mt-6 max-h-[320px] space-y-2 overflow-y-auto">
            {dossiers.map((dossier) => (
              <button
                key={dossier.id}
                type="button"
                onClick={() => onSelect?.(dossier)}
                className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-left transition hover:bg-white/20"
              >
                <span>
                  <span className="block font-semibold">{dossier.companyName || dossier.denomination || 'Dossier'}</span>
                  <span className="mt-0.5 block text-xs text-white/70">{dossier.reference || dossier.id}</span>
                </span>
                <span className="text-xs font-bold uppercase text-white/80">Ouvrir</span>
              </button>
            ))}
          </div>
          {onClose ? (
            <Button
              type="button"
              variant="ghost"
              className="mt-4 w-full text-white hover:bg-white/10 hover:text-white"
              onClick={onClose}
            >
              Annuler
            </Button>
          ) : null}
        </motion.div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);

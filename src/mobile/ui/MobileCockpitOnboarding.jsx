import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, FolderKanban, PenLine, X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

const STORAGE_KEY = 'greffio.mobile.cockpitOnboardingDone';

const ONBOARDING_CARDS = [
  {
    icon: FolderKanban,
    title: 'Suivez votre dossier',
    text: 'Statuts, documents et dépôt au même endroit.',
  },
  {
    icon: PenLine,
    title: 'Signez depuis votre téléphone',
    text: 'Les documents requis sont préparés et centralisés.',
  },
  {
    icon: Bot,
    title: 'Demandez à Greffio',
    text: 'L’assistant et le pilotage restent dans le menu ☰.',
  },
];

export const hasCompletedMobileCockpitOnboarding = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch (_error) {
    return false;
  }
};

export const MobileCockpitOnboarding = () => {
  const [open, setOpen] = useState(() => !hasCompletedMobileCockpitOnboarding());
  const [index, setIndex] = useState(0);

  const finish = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch (_error) {
      // ignore
    }
    setOpen(false);
  };

  if (!open) return null;

  const card = ONBOARDING_CARDS[index];
  const Icon = card.icon;
  const isLast = index >= ONBOARDING_CARDS.length - 1;

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-[#0a1220]/50 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg rounded-3xl border border-border bg-white p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-onboarding-title"
      >
        <button
          type="button"
          onClick={finish}
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted"
          aria-label="Fermer l’introduction"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="text-xs font-bold uppercase tracking-wide text-primary">
          Bienvenue · {index + 1}/{ONBOARDING_CARDS.length}
        </p>
        <AnimatePresence mode="wait">
          <motion.div
            key={card.title}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
            className="mt-4"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
              <Icon className="h-6 w-6 text-primary" />
            </span>
            <h2 id="mobile-onboarding-title" className="mt-4 text-lg font-extrabold text-foreground">
              {card.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.text}</p>
          </motion.div>
        </AnimatePresence>
        <div className="mt-5 flex gap-2">
          {ONBOARDING_CARDS.map((item, dotIndex) => (
            <span
              key={item.title}
              className={`h-1.5 flex-1 rounded-full ${dotIndex === index ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          {!isLast ? (
            <>
              <Button type="button" variant="outline" className="h-11 flex-1 rounded-2xl bg-white" onClick={finish}>
                Passer
              </Button>
              <Button
                type="button"
                className="h-11 flex-1 rounded-2xl"
                onClick={() => setIndex((current) => current + 1)}
              >
                Suivant
              </Button>
            </>
          ) : (
            <Button type="button" className="h-11 w-full rounded-2xl" onClick={finish}>
              Commencer
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FolderKanban, Menu, Plus, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import {
  hasSeenNativeNavCoachmarks,
  markNativeNavCoachmarksDone,
} from '@/utils/nativeAppStorage.js';
import { hasCompletedMobileCockpitOnboarding } from '@/mobile/ui/MobileCockpitOnboarding.jsx';
import { isCapacitorNative } from '@/utils/platform.js';

const STEPS = [
  {
    icon: FolderKanban,
    title: 'Dossiers',
    text: 'Retrouvez toutes vos formalités en cours et leur statut.',
  },
  {
    icon: Plus,
    title: 'Nouveau',
    text: 'Démarrez une création, modification ou autre démarche guidée.',
  },
  {
    icon: UserRound,
    title: 'Compte',
    text: 'Profil, paramètres et messages via le menu ☰ en haut.',
  },
  {
    icon: Menu,
    title: 'Menu ☰',
    text: 'Assistant, pilotage, boutique et aide sont dans le drawer latéral.',
  },
];

export const MobileNavCoachmarks = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!isCapacitorNative() || hasSeenNativeNavCoachmarks()) return;
    if (!['/dashboard', '/dossiers', '/documents', '/mobile/account'].includes(location.pathname)) return;
    if (!hasCompletedMobileCockpitOnboarding()) return;
    setOpen(true);
  }, [location.pathname]);

  if (!open) return null;

  const step = STEPS[index];
  const Icon = step.icon;
  const isLast = index >= STEPS.length - 1;

  const finish = () => {
    markNativeNavCoachmarksDone();
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[94] flex items-end justify-center bg-[#0a1220]/55 p-4 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))]">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-white p-5 shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">
          Navigation · {index + 1}/{STEPS.length}
        </p>
        <span className="mt-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary">
          <Icon className="h-5 w-5 text-primary" />
        </span>
        <h2 className="mt-4 text-lg font-extrabold text-foreground">{step.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.text}</p>
        <div className="mt-5 flex gap-2">
          {!isLast ? (
            <>
              <Button type="button" variant="outline" className="h-11 flex-1 rounded-2xl bg-white" onClick={finish}>
                Passer
              </Button>
              <Button type="button" className="h-11 flex-1 rounded-2xl" onClick={() => setIndex((current) => current + 1)}>
                Suivant
              </Button>
            </>
          ) : (
            <Button type="button" className="h-11 w-full rounded-2xl" onClick={finish}>
              Compris
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

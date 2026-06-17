import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, FolderKanban, LogIn, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { markNativeWelcomeDone } from '@/utils/nativeAppStorage.js';

const SLIDES = [
  {
    icon: FolderKanban,
    title: 'Votre dossier, toujours avec vous',
    text: 'Questionnaire, pièces, signatures et dépôt du dossier – comme sur le site Greffio.',
  },
  {
    icon: PenLine,
    title: 'Connectez-vous pour continuer',
    text: 'Utilisez les mêmes identifiants que sur greffio.willentreprises.com pour reprendre votre dossier actif.',
  },
];

export const NativeAppWelcomePage = () => {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const Icon = slide.icon;
  const isLast = index >= SLIDES.length - 1;

  const finish = (target = '/app/home') => {
    markNativeWelcomeDone();
    navigate(target, { replace: true });
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background px-5 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <GreffioLogo variant="full" className="text-2xl" />
      <p className="mt-6 text-xs font-bold uppercase tracking-wide text-primary">
        Bienvenue · {index + 1}/{SLIDES.length}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={slide.title}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22 }}
          className="mt-8 flex-1"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
            <Icon className="h-7 w-7 text-primary" />
          </span>
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))]">
            {slide.title}
          </h1>
          <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">{slide.text}</p>
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex gap-2">
        {SLIDES.map((item, dotIndex) => (
          <span
            key={item.title}
            className={`h-1.5 flex-1 rounded-full ${dotIndex === index ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {!isLast ? (
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-12 flex-1 rounded-2xl bg-white" onClick={() => finish('/login')}>
              Me connecter
            </Button>
            <Button type="button" className="h-12 flex-1 rounded-2xl" onClick={() => setIndex((current) => current + 1)}>
              Suivant
            </Button>
          </div>
        ) : (
          <>
            <Button asChild className="h-12 w-full rounded-2xl">
              <Link to="/login">
                Me connecter
                <LogIn className="h-4 w-4" />
              </Link>
            </Button>
            <Button type="button" variant="outline" className="h-12 w-full rounded-2xl bg-white" onClick={() => finish()}>
              Découvrir sans compte
              <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

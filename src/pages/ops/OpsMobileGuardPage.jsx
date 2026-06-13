import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

export const OpsMobileGuardPage = () => (
  <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#f6f8fc] px-6 py-12">
    <div className="mx-auto w-full max-w-md rounded-2xl border border-[#dbe7f7] bg-white p-8 text-center shadow-[0_16px_48px_rgba(30,77,140,0.08)]">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--greffio-blue)/0.1)] text-primary">
        <Monitor className="h-7 w-7" />
      </span>
      <p className="mt-5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Cockpit opérations</p>
      <h1 className="mt-2 text-2xl font-extrabold text-[hsl(var(--greffio-blue-900))]">
        Interface optimisée pour ordinateur
      </h1>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        Le cockpit opérations est optimisé pour ordinateur. Pour garantir une lecture fiable des dossiers,
        ouvrez cette interface depuis un écran desktop.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <Button type="button" className="h-11 w-full" asChild>
          <Link to="/dashboard">
            Retour au tableau de bord
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <Button type="button" variant="outline" className="h-11 w-full bg-white" onClick={() => window.history.back()}>
          Revenir en arrière
        </Button>
      </div>
    </div>
  </div>
);

import React from 'react';
import { Link } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar.jsx';
import { Button } from '@/components/ui/button.jsx';

export const DocumentEditorLoadGate = ({
  status,
  errorMessage,
  onRetry,
  children,
}) => {
  if (status === 'ready') return children;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[var(--we-bg)]">
      <Sidebar />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        {status === 'loading' ? (
          <p className="text-muted-foreground">Chargement…</p>
        ) : (
          <>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              {errorMessage || 'Impossible d’ouvrir l’éditeur pour ce document.'}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {onRetry ? (
                <Button type="button" variant="outline" className="bg-white" onClick={onRetry}>
                  Réessayer
                </Button>
              ) : null}
              <Button type="button" variant="outline" className="bg-white" asChild>
                <Link to="/documents">Retour documents</Link>
              </Button>
              <Button type="button" asChild>
                <Link to="/dossiers">Mes dossiers</Link>
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

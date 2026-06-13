import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from '@/context/AuthContext.jsx';
import { getOpsCockpit } from '@/api/ops.js';
import { OpsSidebar } from '@/components/ops/OpsSidebar.jsx';
import { OpsTopbar } from '@/components/ops/OpsTopbar.jsx';
import { OpsSearchDialog } from '@/components/ops/OpsSearchDialog.jsx';

import { PUBLISHER_LEGAL_NAME } from '@/config/publisher.js';

const pageMeta = {
  '/ops/cockpit': {
    title: 'Cockpit ops',
    subtitle: 'Vue d’ensemble – priorités, SLA et actions immédiates.',
  },
  '/ops/dossiers': {
    title: 'Dossiers',
    subtitle: 'Tous les dossiers clients – filtres, risque et complétude.',
  },
  '/ops/documents': {
    title: 'Documents',
    subtitle: 'File de validation documentaire (Lot 2).',
  },
  '/ops/relances': {
    title: 'Relances',
    subtitle: 'Clients à relancer – suggestions automatiques (Lot 2).',
  },
  '/ops/depot': {
    title: 'Dépôt guichet unique',
    subtitle: 'Dossiers prêts au dépôt (Lot 2).',
  },
  '/ops/qualite': {
    title: 'Qualité',
    subtitle: 'Contrôles qualité et anti-rejet (Lot 2).',
  },
  '/ops/equipe': {
    title: 'Équipe Greffio',
    subtitle: 'Charge de travail et assignations formalistes (Lot 4).',
  },
  '/ops/audit': {
    title: 'Audit',
    subtitle: 'Journal des actions ops (Lot 3).',
  },
  '/ops/settings': {
    title: 'Paramètres ops',
    subtitle: 'Préférences cockpit interne.',
  },
};

export const OpsShell = () => {
  const { currentUser } = useContext(AuthContext);
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cockpitCache, setCockpitCache] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const loadCockpit = useCallback(async () => {
    setRefreshing(true);
    try {
      const payload = await getOpsCockpit();
      setCockpitCache(payload);
    } catch (_error) {
      setCockpitCache((current) => current);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadCockpit();
  }, [loadCockpit, refreshToken]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const metaKey = Object.keys(pageMeta).find((path) => location.pathname.startsWith(path))
    || (location.pathname.startsWith('/ops/dossiers/') ? '/ops/dossiers' : '/ops/cockpit');
  const meta = pageMeta[metaKey] || pageMeta['/ops/cockpit'];

  return (
    <div className="flex min-h-screen bg-slate-100 font-['Inter']">
      <OpsSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <OpsTopbar
          title={meta.title}
          subtitle={meta.subtitle}
          user={currentUser}
          onRefresh={() => setRefreshToken((value) => value + 1)}
          refreshing={refreshing}
          onOpenSearch={() => setSearchOpen(true)}
          headerSummary={location.pathname.startsWith('/ops/cockpit') ? cockpitCache?.headerSummary : null}
        />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet context={{
            cockpit: cockpitCache,
            refreshCockpit: () => setRefreshToken((value) => value + 1),
            refreshing,
          }} />
        </main>
      </div>
      <OpsSearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        dossiers={cockpitCache?.dossiers || []}
      />
    </div>
  );
};

import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from '@/context/AuthContext.jsx';
import { getOpsCockpit } from '@/api/ops.js';
import { OpsSidebar } from '@/components/ops/OpsSidebar.jsx';
import { OpsTopbar } from '@/components/ops/OpsTopbar.jsx';
import { OpsSearchDialog } from '@/components/ops/OpsSearchDialog.jsx';
import { isOpsMobileViewport } from '@/utils/platform.js';

import { PUBLISHER_LEGAL_NAME } from '@/config/publisher.js';

const pageMeta = {
  '/ops': {
    title: 'Cockpit Ops',
    subtitle: 'État système, file d’actions et accès rapides.',
  },
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
  '/ops/invoices': {
    title: 'Factures',
    subtitle: 'Validation ops avant envoi client (Qonto + email).',
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
  const mobileLayout = isOpsMobileViewport();
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cockpitCache, setCockpitCache] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

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
    closeSidebar();
  }, [location.pathname, closeSidebar]);

  useEffect(() => {
    if (!sidebarOpen) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

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

  const metaKey = location.pathname === '/ops' || location.pathname === '/ops/'
    ? '/ops'
    : Object.keys(pageMeta).find((path) => location.pathname.startsWith(path))
      || (location.pathname.startsWith('/ops/dossiers/') ? '/ops/dossiers' : '/ops');
  const meta = pageMeta[metaKey] || pageMeta['/ops'];

  return (
    <div className="flex min-h-[100dvh] bg-slate-100 font-['Inter']">
      {mobileLayout ? (
        sidebarOpen ? (
          <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
            <button
              type="button"
              aria-label="Fermer le menu ops"
              onClick={closeSidebar}
              className="absolute inset-0 bg-[#0a1220]/45 backdrop-blur-[2px]"
            />
            <OpsSidebar mobile onClose={closeSidebar} userRole={currentUser?.role} />
          </div>
        ) : null
      ) : (
        <OpsSidebar userRole={currentUser?.role} />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <OpsTopbar
          title={meta.title}
          subtitle={meta.subtitle}
          user={currentUser}
          onRefresh={() => setRefreshToken((value) => value + 1)}
          refreshing={refreshing}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenMenu={mobileLayout ? () => setSidebarOpen(true) : undefined}
          headerSummary={location.pathname.startsWith('/ops/cockpit') || location.pathname === '/ops' ? cockpitCache?.headerSummary : null}
        />
        <main className={`flex-1 overflow-y-auto overflow-x-hidden ${mobileLayout ? 'p-4' : 'p-6'}`}>
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

import React, { useEffect, useState } from 'react';
import { Globe, CreditCard, Database, Server, ShieldCheck } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar.jsx';
import { getInterfacesStatus } from '@/api/system.js';

const statusStyles = {
  healthy: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  unavailable: 'bg-red-100 text-red-700',
};

const interfaceMeta = {
  frontend: {
    title: 'Frontend',
    description: 'Interface client web et parcours public.',
    icon: Globe,
  },
  backend: {
    title: 'Backend API',
    description: 'Routes API, auth, dossiers, documents et workflow.',
    icon: Server,
  },
  payment: {
    title: 'Paiement',
    description: 'Google Pay, carte bancaire, webhooks PSP et statut transactionnel.',
    icon: CreditCard,
  },
  database: {
    title: 'Base de données',
    description: 'Postgres production ou fallback local dev.',
    icon: Database,
  },
};

export const InterfacesPage = () => {
  const [interfaces, setInterfaces] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const payload = await getInterfacesStatus();
        setInterfaces(payload.interfaces || []);
      } catch (err) {
        setError(err?.message || 'INTERFACES_STATUS_FAILED');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-5 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
            <p className="text-sm font-bold uppercase text-primary">Interfaces séparées</p>
            <h1 className="mt-2 text-3xl font-extrabold">Frontend, Backend, Paiement, Base de données</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Vue centralisée de l’état opérationnel des interfaces critiques Greffio.
            </p>
          </section>

          {loading ? <p className="text-sm text-muted-foreground">Chargement des interfaces...</p> : null}
          {error ? <p className="text-sm text-red-600">Impossible de récupérer l’état: {error}</p> : null}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {interfaces.map((entry) => {
              const meta = interfaceMeta[entry.key] || {
                title: entry.key,
                description: 'Interface métier',
                icon: ShieldCheck,
              };
              const ToneIcon = meta.icon;
              return (
                <article key={entry.key} className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary">
                      <ToneIcon className="h-5 w-5" />
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${statusStyles[entry.status] || statusStyles.warning}`}>
                      {entry.status}
                    </span>
                  </div>
                  <p className="text-sm font-bold uppercase text-muted-foreground">{meta.title}</p>
                  <p className="mt-1 text-sm text-foreground">{meta.description}</p>
                  <p className="mt-3 text-xs text-muted-foreground">{entry.detail}</p>
                </article>
              );
            })}
          </section>
        </div>
      </main>
    </div>
  );
};

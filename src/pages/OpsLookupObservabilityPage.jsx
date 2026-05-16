import React, { useEffect, useState } from 'react';
import { Activity, Database, Gauge, RefreshCw } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar.jsx';
import { Button } from '@/components/ui/button.jsx';
import { getCompanyLookupObservability } from '@/api/company.js';

export const OpsLookupObservabilityPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await getCompanyLookupObservability();
      setMetrics(payload.metrics || null);
    } catch (_error) {
      setError('Impossible de charger les métriques lookup.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const providers = Object.entries(metrics?.providers || {});

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-5 md:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase text-primary">Ops observabilité</p>
              <h1 className="mt-1 text-3xl font-extrabold">Company Lookup Metrics</h1>
            </div>
            <Button variant="outline" className="bg-white" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>

          {error ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {error}
            </div>
          ) : null}

          <section className="grid gap-4 md:grid-cols-4">
            {[
              ['Total requêtes', metrics?.total ?? 0, Activity],
              ['Cache hits', metrics?.cacheHits ?? 0, Database],
              ['Cache misses', metrics?.cacheMisses ?? 0, Gauge],
              ['Succès', metrics?.success ?? 0, Activity],
            ].map(([label, value, Icon]) => (
              <div key={label} className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-muted-foreground">{label}</p>
                <p className="mt-1 text-3xl font-extrabold">{value}</p>
              </div>
            ))}
          </section>

          <section className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
            <h2 className="text-xl font-extrabold">Configuration active</h2>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
              <p><strong>Timeout:</strong> {metrics?.config?.timeoutMs ?? 0} ms</p>
              <p><strong>Cache TTL:</strong> {metrics?.config?.cacheTtlMs ?? 0} ms</p>
              <p><strong>Secondary provider enabled:</strong> {String(metrics?.config?.secondaryProviderEnabled ?? false)}</p>
              <p><strong>Secondary provider:</strong> {metrics?.config?.secondaryProvider || 'N/A'}</p>
              <p><strong>Cache size:</strong> {metrics?.cacheSize ?? 0}</p>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            {providers.map(([provider, stat]) => (
              <article key={provider} className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
                <h3 className="text-lg font-extrabold">{provider}</h3>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  <p><strong>Attempts:</strong> {stat.attempts}</p>
                  <p><strong>Success:</strong> {stat.success}</p>
                  <p><strong>Failures:</strong> {stat.failures}</p>
                  <p><strong>Average latency:</strong> {stat.avgLatencyMs} ms</p>
                  <p><strong>Last latency:</strong> {stat.lastLatencyMs} ms</p>
                  <p><strong>Last error:</strong> {stat.lastError || 'N/A'}</p>
                  <p><strong>Last success:</strong> {stat.lastSuccessAt || 'N/A'}</p>
                </div>
              </article>
            ))}
            {!providers.length ? (
              <div className="rounded-md border border-border bg-white p-5 text-sm text-muted-foreground">
                Aucune métrique provider disponible pour le moment.
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
};

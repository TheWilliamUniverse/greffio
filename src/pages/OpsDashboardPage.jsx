import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, CircleDollarSign, FolderKanban, RefreshCw } from 'lucide-react';
import { runtimeConfig } from '@/config/runtime.js';
import { Button } from '@/components/ui/button.jsx';
import { getToken } from '@/utils/localStorage.js';

const Card = ({ title, value, icon: Icon, tone = 'default' }) => (
  <div className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-muted-foreground">{title}</p>
      <Icon className={`h-5 w-5 ${tone === 'success' ? 'text-emerald-600' : tone === 'warning' ? 'text-amber-600' : 'text-primary'}`} />
    </div>
    <p className="mt-3 text-3xl font-extrabold text-foreground">{value}</p>
  </div>
);

const fmtEuros = (cents) => `${(Number(cents || 0) / 100).toFixed(2)} €`;

export const OpsDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState('');
  const [error, setError] = useState('');
  const [dossiers, setDossiers] = useState([]);
  const [payments, setPayments] = useState([]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [dossiersRes, paymentsRes] = await Promise.all([
        fetch(`${runtimeConfig.apiBaseUrl}/api/ops/dossiers`, { headers }),
        fetch(`${runtimeConfig.apiBaseUrl}/api/ops/payments`, { headers }),
      ]);
      if (!dossiersRes.ok || !paymentsRes.ok) {
        throw new Error('OPS_API_UNAVAILABLE');
      }
      const dossiersPayload = await dossiersRes.json();
      const paymentsPayload = await paymentsRes.json();
      setDossiers(dossiersPayload.dossiers || []);
      setPayments(paymentsPayload.payments || []);
    } catch (_e) {
      setError("Impossible de charger les données Ops.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const paidPayments = payments.filter((item) => item.status === 'paid');
  const pendingPayments = payments.filter((item) => item.status !== 'paid');
  const paidVolume = paidPayments.reduce((sum, item) => sum + Number(item.amountTotalCents || 0), 0);

  const moveToPaid = async (dossierId) => {
    try {
      setIsTransitioning(dossierId);
      const token = getToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/dossiers/${dossierId}/transition`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          nextStatus: 'payment_confirmed',
          reason: 'ops_manual_transition',
        }),
      });
      if (!response.ok) throw new Error('TRANSITION_FAILED');
      await loadData();
    } catch (_e) {
      setError("Transition impossible pour ce dossier.");
    } finally {
      setIsTransitioning('');
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase text-primary">Ops</p>
            <h1 className="mt-1 text-3xl font-extrabold">Pilotage opérationnel Greffio</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Vue rapide dossiers/paiements branchée sur l’API.
            </p>
          </div>
          <Button type="button" variant="outline" className="bg-white" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <Card title="Dossiers" value={dossiers.length} icon={FolderKanban} />
          <Card title="Paiements totaux" value={payments.length} icon={CircleDollarSign} />
          <Card title="Paiements validés" value={paidPayments.length} icon={CheckCircle2} tone="success" />
          <Card title="Paiements en attente" value={pendingPayments.length} icon={AlertCircle} tone="warning" />
        </section>

        <section className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
          <p className="text-sm font-semibold text-muted-foreground">Volume encaissé</p>
          <p className="mt-2 text-2xl font-extrabold text-foreground">{fmtEuros(paidVolume)}</p>
        </section>

        <section className="rounded-md border border-border bg-white shadow-elevation-sm">
          <div className="border-b border-border p-4">
            <h2 className="text-lg font-extrabold">Dossiers</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-left">
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Société</th>
                  <th className="px-4 py-3 font-semibold">Forme</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {dossiers.map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-xs">{item.id}</td>
                    <td className="px-4 py-3">{item.companyName}</td>
                    <td className="px-4 py-3">{item.legalForm}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2 py-1 text-xs font-bold">{item.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="bg-white"
                        onClick={() => moveToPaid(item.id)}
                        disabled={item.status === 'paid' || isTransitioning === item.id}
                      >
                        {isTransitioning === item.id ? '...' : 'Passer paid'}
                      </Button>
                    </td>
                  </tr>
                ))}
                {!dossiers.length && (
                  <tr>
                    <td className="px-4 py-4 text-muted-foreground" colSpan={5}>Aucun dossier pour le moment.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
};

import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, FileText, Mail, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { AuthContext } from '@/context/AuthContext.jsx';
import { approveOpsInvoiceSend, getOpsInvoicesPendingReview } from '@/api/ops.js';
import { formatDateTime } from '@/components/ops/opsLabels.js';
import { PageLoadingState } from '@/components/patterns/PageLoadingState.jsx';
import { Button } from '@/components/ui/button.jsx';

const formatAmount = (cents, currency = 'EUR') => {
  const value = (Number(cents || 0) / 100).toFixed(2).replace('.', ',');
  return `${value} ${currency === 'EUR' ? '€' : currency}`;
};

const OPS_INVOICE_ROLES = new Set(['ADMIN', 'OPS']);

const REVIEW_CHECKLIST = [
  'Montant TTC conforme au paiement dossier',
  'Email client et raison sociale corrects',
  'Numéro de facture Qonto présent si émis',
  'Aucune anomalie signalée sur le dossier lié',
];

export const OpsInvoicesPage = () => {
  const { currentUser } = useContext(AuthContext);
  const [invoices, setInvoices] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approvingId, setApprovingId] = useState(null);

  const canManageInvoices = OPS_INVOICE_ROLES.has(String(currentUser?.role || '').toUpperCase());

  const loadInvoices = useCallback(async ({ silent = false } = {}) => {
    if (!canManageInvoices) {
      setInvoices([]);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const payload = await getOpsInvoicesPendingReview();
      const list = payload?.invoices || [];
      setInvoices(list);
      setSelectedId((current) => current || list[0]?.id || null);
    } catch (error) {
      setInvoices([]);
      toast.error('Impossible de charger la file factures.', {
        description: error?.message || 'Erreur réseau',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canManageInvoices]);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  const selectedInvoice = useMemo(
    () => invoices.find((item) => item.id === selectedId) || invoices[0] || null,
    [invoices, selectedId],
  );

  const handleApproveSend = async (invoice) => {
    if (!invoice?.id || approvingId) return;
    setApprovingId(invoice.id);
    try {
      await approveOpsInvoiceSend(invoice.id);
      toast.success('Facture validée et envoyée au client.');
      setInvoices((current) => current.filter((entry) => entry.id !== invoice.id));
      setSelectedId(null);
    } catch (error) {
      toast.error('Échec de l’envoi facture.', {
        description: error?.payload?.error || error?.message || 'Erreur serveur',
      });
    } finally {
      setApprovingId(null);
    }
  };

  if (!canManageInvoices) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Accès réservé à l’équipe ops facturation</p>
        <p className="mt-2 text-sm text-slate-600">
          Seuls les profils Admin et Ops peuvent valider les factures avant envoi client.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Greffio Ops · Facturation</p>
          <h2 className="mt-1 text-2xl font-extrabold text-slate-900">Factures en attente de validation</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Les factures générées après paiement dossier restent en file tant qu’un ops ne les valide pas.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="bg-white"
          disabled={refreshing}
          onClick={() => void loadInvoices({ silent: true })}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <PageLoadingState compact className="px-5 py-12" label="Chargement des factures…" />
        ) : invoices.length ? (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <ul className="divide-y divide-slate-100 border-b border-slate-100 lg:border-b-0 lg:border-r">
              {invoices.map((invoice) => {
                const active = invoice.id === selectedInvoice?.id;
                return (
                  <li key={invoice.id}>
                    <button
                      type="button"
                      className={`w-full px-5 py-4 text-left transition hover:bg-slate-50 ${active ? 'bg-primary/5' : ''}`}
                      onClick={() => setSelectedId(invoice.id)}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                          <FileText className="h-3.5 w-3.5" />
                          En attente
                        </span>
                        {invoice.invoiceNumber ? (
                          <span className="text-xs font-semibold text-slate-500">N° {invoice.invoiceNumber}</span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-base font-extrabold text-slate-900">
                        {formatAmount(invoice.amountTotalCents, invoice.currency)}
                      </p>
                      <p className="mt-1 truncate text-sm text-slate-600">
                        {invoice.customerName || invoice.customerEmail}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>

            {selectedInvoice ? (
              <div className="flex flex-col gap-4 p-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Aperçu facture</p>
                  <p className="mt-2 text-2xl font-extrabold text-slate-900">
                    {formatAmount(selectedInvoice.amountTotalCents, selectedInvoice.currency)}
                  </p>
                  <div className="mt-3 space-y-1 text-sm text-slate-600">
                    <p className="inline-flex items-center gap-1.5">
                      <Mail className="h-4 w-4 text-slate-400" />
                      {selectedInvoice.customerName ? `${selectedInvoice.customerName} · ` : ''}{selectedInvoice.customerEmail}
                    </p>
                    <p className="text-xs text-slate-500">
                      Créée le {formatDateTime(selectedInvoice.createdAt)}
                      {selectedInvoice.qontoInvoiceId ? ` · Qonto ${selectedInvoice.qontoInvoiceId}` : ''}
                    </p>
                    {selectedInvoice.dossierId ? (
                      <Link to={`/ops/dossiers/${selectedInvoice.dossierId}`} className="inline-block font-semibold text-primary hover:underline">
                        Ouvrir le dossier
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-bold text-slate-900">Checklist avant envoi</p>
                  <ul className="mt-3 space-y-2">
                    {REVIEW_CHECKLIST.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  type="button"
                  className="mt-auto"
                  disabled={approvingId === selectedInvoice.id}
                  onClick={() => void handleApproveSend(selectedInvoice)}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {approvingId === selectedInvoice.id ? 'Envoi…' : 'Valider et envoyer'}
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <p className="mt-3 text-sm font-semibold text-slate-900">Aucune facture en attente</p>
            <p className="mt-1 text-sm text-slate-500">La file se remplit automatiquement après un paiement dossier réussi.</p>
          </div>
        )}
      </div>
    </div>
  );
};

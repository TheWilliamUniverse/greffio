import React, { useCallback, useContext, useEffect, useState } from 'react';
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

export const OpsInvoicesPage = () => {
  const { currentUser } = useContext(AuthContext);
  const [invoices, setInvoices] = useState([]);
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
      setInvoices(payload?.invoices || []);
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

  const handleApproveSend = async (invoice) => {
    if (!invoice?.id || approvingId) return;
    setApprovingId(invoice.id);
    try {
      await approveOpsInvoiceSend(invoice.id);
      toast.success('Facture validée et envoyée au client.');
      setInvoices((current) => current.filter((entry) => entry.id !== invoice.id));
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
            L’envoi client et l’email « facture disponible » sont déclenchés à la validation.
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
          <ul className="divide-y divide-slate-100">
            {invoices.map((invoice) => (
              <li key={invoice.id} className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                      <FileText className="h-3.5 w-3.5" />
                      En attente ops
                    </span>
                    {invoice.invoiceNumber ? (
                      <span className="text-xs font-semibold text-slate-500">N° {invoice.invoiceNumber}</span>
                    ) : null}
                  </div>
                  <p className="text-base font-extrabold text-slate-900">
                    {formatAmount(invoice.amountTotalCents, invoice.currency)}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-4 w-4 text-slate-400" />
                      {invoice.customerName ? `${invoice.customerName} · ` : ''}{invoice.customerEmail}
                    </span>
                    {invoice.dossierId ? (
                      <Link to={`/ops/dossiers/${invoice.dossierId}`} className="font-semibold text-primary hover:underline">
                        Ouvrir le dossier
                      </Link>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-500">
                    Créée le {formatDateTime(invoice.createdAt)}
                    {invoice.qontoInvoiceId ? ` · Qonto ${invoice.qontoInvoiceId}` : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  className="shrink-0"
                  disabled={approvingId === invoice.id}
                  onClick={() => void handleApproveSend(invoice)}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {approvingId === invoice.id ? 'Envoi…' : 'Valider et envoyer'}
                </Button>
              </li>
            ))}
          </ul>
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

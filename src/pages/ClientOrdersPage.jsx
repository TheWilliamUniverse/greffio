import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Package, ShoppingBag } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar.jsx';
import { MobileSidebarDrawer, MobileSidebarTrigger } from '@/components/MobileSidebarDrawer.jsx';
import { Button } from '@/components/ui/button.jsx';
import { PageLoadingState } from '@/components/patterns/PageLoadingState.jsx';
import { listResourceOrders } from '@/api/resources.js';
import { formatResourcePrice } from '@/config/resourceServices.js';
import { formatOrderPublicReference, formatOrderStatusLabel } from '@/utils/orderReference.js';

const statusTone = (status) => {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (status === 'pending_payment') return 'bg-amber-50 text-amber-900 border-amber-200';
  if (status === 'cancelled') return 'bg-muted text-muted-foreground border-border';
  return 'bg-blue-50 text-blue-900 border-blue-200';
};

export const ClientOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const payload = await listResourceOrders();
        if (!cancelled) setOrders(payload?.orders || []);
      } catch (_error) {
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] bg-background">
      <Sidebar />
      <MobileSidebarDrawer open={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
      <main className="min-h-0 flex-1 overflow-y-auto p-5 pb-8 md:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-5 flex items-center justify-between gap-3 md:hidden">
            <MobileSidebarTrigger onClick={() => setIsMobileNavOpen(true)} />
            <p className="truncate text-sm font-semibold text-muted-foreground">Mes commandes</p>
          </div>

          <section className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary">
                  <Package className="h-4 w-4" />
                  Mes commandes
                </p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))]">
                  Suivi de vos achats boutique
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Historique et statut de vos documents commandés depuis la boutique Greffio.
                </p>
              </div>
              <Button asChild variant="outline" className="bg-white">
                <Link to="/boutique">
                  <ShoppingBag className="h-4 w-4" />
                  Retour boutique
                </Link>
              </Button>
            </div>
          </section>

          {loading ? (
            <PageLoadingState className="mt-8" label="Chargement de vos commandes…" />
          ) : !orders.length ? (
            <section className="mt-8 rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
              <p className="text-sm text-muted-foreground">Aucune commande pour le moment.</p>
              <Button asChild className="mt-4">
                <Link to="/boutique">Parcourir la boutique</Link>
              </Button>
            </section>
          ) : (
            <ul className="mt-8 space-y-3">
              {orders.map((order) => {
                const ref = formatOrderPublicReference(order);
                const created = order.createdAt
                  ? new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                  : null;
                return (
                  <li
                    key={order.id}
                    className="rounded-xl border border-border bg-white p-5 shadow-elevation-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-extrabold text-foreground">{order.serviceTitle}</p>
                        {ref ? (
                          <p className="mt-1 text-xs font-semibold text-primary">{ref}</p>
                        ) : null}
                        {order.companyName ? (
                          <p className="mt-1 text-sm text-muted-foreground">{order.companyName}</p>
                        ) : null}
                        {created ? (
                          <p className="mt-1 text-xs text-muted-foreground">Commandé le {created}</p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusTone(order.status)}`}>
                          {formatOrderStatusLabel(order.status)}
                        </span>
                        <p className="mt-2 text-lg font-extrabold">{formatResourcePrice(order.priceTtc)}</p>
                      </div>
                    </div>
                    {order.status === 'pending_payment' && Number(order.priceTtc) > 0 ? (
                      <Button asChild size="sm" className="mt-4">
                        <Link to={`/paiement?resourceOrder=${order.id}&service=${order.serviceId}`}>
                          Finaliser le paiement
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
};

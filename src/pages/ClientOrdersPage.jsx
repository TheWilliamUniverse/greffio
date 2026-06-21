import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Package, ShoppingBag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar.jsx';
import { MobileSidebarDrawer, MobileSidebarTrigger } from '@/components/MobileSidebarDrawer.jsx';
import { Button } from '@/components/ui/button.jsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog.jsx';
import { PageLoadingState } from '@/components/patterns/PageLoadingState.jsx';
import { deleteResourceOrder, listResourceOrders } from '@/api/resources.js';
import { formatResourcePrice } from '@/config/resourceServices.js';
import { formatOrderPublicReference, resolveOrderStatusDisplay, orderStatusDisplayToneClass } from '@/utils/orderReference.js';

const DELETABLE_STATUSES = new Set(['draft', 'pending_payment']);

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
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deletingOrderId, setDeletingOrderId] = useState(null);

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

  const confirmDelete = async () => {
    if (!orderToDelete) return;
    setDeletingOrderId(orderToDelete.id);
    try {
      await deleteResourceOrder(orderToDelete.id);
      setOrders((current) => current.filter((order) => order.id !== orderToDelete.id));
      toast.success('Commande supprimée');
      setOrderToDelete(null);
    } catch (error) {
      toast.error(error?.message === 'ORDER_NOT_CANCELLABLE'
        ? 'Cette commande ne peut plus être supprimée.'
        : 'Impossible de supprimer la commande.');
    } finally {
      setDeletingOrderId(null);
    }
  };

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
                const statusDisplay = resolveOrderStatusDisplay(order);
                const badgeTone = orderStatusDisplayToneClass(statusDisplay.tone) || statusTone(order.status);
                const created = order.createdAt
                  ? new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                  : null;
                const canDelete = DELETABLE_STATUSES.has(order.status);
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
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${badgeTone}`}>
                          {statusDisplay.label}
                        </span>
                        <p className="mt-2 text-lg font-extrabold">{formatResourcePrice(order.priceTtc)}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {order.status === 'pending_payment' && Number(order.priceTtc) > 0 ? (
                        <Button asChild size="sm">
                          <Link to={`/paiement?resourceOrder=${order.id}&service=${order.serviceId}`}>
                            Finaliser le paiement
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="bg-white text-red-700 hover:bg-red-50"
                          disabled={deletingOrderId === order.id}
                          onClick={() => setOrderToDelete(order)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Supprimer
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>

      <AlertDialog open={Boolean(orderToDelete)} onOpenChange={(open) => { if (!open) setOrderToDelete(null); }}>
        <AlertDialogContent className="max-w-[min(100vw-2rem,24rem)] rounded-2xl sm:rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette commande ?</AlertDialogTitle>
            <AlertDialogDescription>
              {orderToDelete?.serviceTitle
                ? `La commande « ${orderToDelete.serviceTitle} » sera définitivement supprimée. Cette action est irréversible.`
                : 'Cette commande sera définitivement supprimée. Cette action est irréversible.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel className="mt-0">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={Boolean(deletingOrderId)}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

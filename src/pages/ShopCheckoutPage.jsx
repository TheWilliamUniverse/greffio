import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar.jsx';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { CheckoutOrderSummary } from '@/components/payments/CheckoutOrderSummary.jsx';
import { GreffioPaymentTerminal } from '@/components/payments/GreffioPaymentTerminal.jsx';
import { ShopCartCompanyFields } from '@/components/shop/ShopCartCompanyFields.jsx';
import { formatResourcePrice } from '@/config/resourceServices.js';
import { prepareCartOrders, checkoutCartPayment } from '@/api/resources.js';
import { useShopCart } from '@/hooks/useShopCart.js';
import { useAuth } from '@/hooks/useAuth.js';
import { openPaymentCheckoutUrl } from '@/utils/paymentCheckoutNavigation.js';
import { resolvePaymentCheckoutErrorMessage } from '@/utils/paymentErrors.js';
import { GREFFIO_MARKETING_HOME } from '@/utils/greffioBrandNavigation.js';

export const ShopCheckoutPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const {
    items,
    totalTtc,
    setQuantity,
    removeLine,
    clearCart,
    updateLineMeta,
  } = useShopCart();
  const [showDetails, setShowDetails] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [orderIds, setOrderIds] = useState([]);

  const needsDetails = useMemo(
    () => items.some(
      (line) => line.catalog?.requiresSiren !== false || line.catalog?.requiresCompany !== false,
    ),
    [items],
  );

  useEffect(() => {
    if (!items.length) {
      navigate('/boutique', { replace: true });
    }
  }, [items.length, navigate]);

  const handlePrepareOrders = async () => {
    if (!currentUser) {
      toast.error('Connectez-vous pour commander.');
      return false;
    }
    if (needsDetails && !showDetails) {
      setShowDetails(true);
      return false;
    }
    if (orderIds.length) return true;

    setPreparing(true);
    try {
      const cartItems = items.map((line) => ({
        serviceId: line.serviceId,
        quantity: line.quantity || 1,
        companyName: line.companyName?.trim() || null,
        siren: line.siren?.replace(/\s/g, '') || null,
        dossierId: line.dossierId || null,
        notes: line.notes?.trim() || null,
      }));
      const payload = await prepareCartOrders(cartItems);
      const ids = payload?.orderIds || [];
      const payable = (payload?.orders || []).filter((order) => Number(order.priceTtc) > 0);
      if (!ids.length) {
        toast.error('Impossible de préparer le panier.');
        return false;
      }
      if (!payable.length) {
        clearCart();
        toast.success('Demande enregistrée. Notre équipe vous recontacte sous peu.');
        navigate('/boutique/commandes');
        return false;
      }
      setOrderIds(ids);
      return true;
    } catch (error) {
      toast.error(resolvePaymentCheckoutErrorMessage(error));
      return false;
    } finally {
      setPreparing(false);
    }
  };

  const handlePay = async ({ method, cardToken } = {}) => {
    const ready = await handlePrepareOrders();
    if (!ready) return;
    setPaying(true);
    try {
      const payload = await checkoutCartPayment({
        orderIds,
        mollieMethod: method,
        cardToken,
      });
      if (payload.checkoutUrl) {
        clearCart();
        await openPaymentCheckoutUrl(payload.checkoutUrl, { checkoutMode: payload.checkoutMode });
        return;
      }
      throw new Error('CHECKOUT_URL_MISSING');
    } catch (error) {
      toast.error(resolvePaymentCheckoutErrorMessage(error));
    } finally {
      setPaying(false);
    }
  };

  if (!items.length) {
    return null;
  }

  const amountCents = Math.round(totalTtc * 100);
  const isBusy = preparing || paying;
  const summaryLineItems = items.map((line) => ({
    id: line.id,
    label: `${line.catalog?.title} × ${line.quantity || 1}`,
    amount: formatResourcePrice(line.lineTotalTtc),
  }));

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[var(--we-bg)]">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="border-b border-border bg-white px-6 py-4">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <GreffioLogo variant="full" to={GREFFIO_MARKETING_HOME} className="hidden sm:block" />
              <div>
                <p className="text-sm font-bold uppercase text-primary">Boutique Greffio</p>
                <h1 className="text-xl font-extrabold">Finaliser ma commande</h1>
              </div>
            </div>
            <Button variant="outline" className="bg-white" asChild>
              <Link to="/boutique">
                <ArrowLeft className="h-4 w-4" />
                Retour boutique
              </Link>
            </Button>
          </div>
        </header>

        <main className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-8 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:px-8">
          <section className="space-y-6">
            <div className="space-y-3">
              {items.map((line) => (
                <div key={line.id} className="rounded-xl border border-border bg-white p-4 shadow-elevation-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground">{line.catalog?.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatResourcePrice(line.unitPriceTtc)} · {line.catalog?.estimatedDelay}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeLine(line.id)}
                      aria-label="Retirer du panier"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setQuantity(line.id, Number(line.quantity || 1) - 1)} aria-label="Diminuer">
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="min-w-[2rem] text-center text-sm font-bold">{line.quantity || 1}</span>
                      <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setQuantity(line.id, Number(line.quantity || 1) + 1)} aria-label="Augmenter">
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-sm font-extrabold text-primary">{formatResourcePrice(line.lineTotalTtc)}</p>
                  </div>
                  {showDetails && (line.catalog?.requiresSiren !== false || line.catalog?.requiresCompany !== false) ? (
                    <ShopCartCompanyFields
                      lineId={line.id}
                      siren={line.siren || ''}
                      companyName={line.companyName || ''}
                      requiresSiren={line.catalog?.requiresSiren !== false}
                      requiresCompany={line.catalog?.requiresCompany !== false}
                      onUpdate={updateLineMeta}
                    />
                  ) : null}
                </div>
              ))}
            </div>

            {showDetails || !needsDetails ? (
              <GreffioPaymentTerminal
                variant="panel"
                amountCents={amountCents}
                amountLabel={formatResourcePrice(totalTtc)}
                offerLabel={`Panier boutique (${items.length} article${items.length > 1 ? 's' : ''})`}
                onPay={handlePay}
                isCreatingPayment={isBusy}
                payButtonLabel={orderIds.length ? 'Payer via Mollie' : 'Valider et payer'}
              />
            ) : (
              <div className="rounded-xl border border-border bg-white p-5 shadow-elevation-sm">
                <p className="text-sm text-muted-foreground">
                  Complétez les informations entreprise pour chaque article avant le paiement.
                </p>
                <Button type="button" className="mt-4 w-full" disabled={isBusy} onClick={() => void handlePrepareOrders()}>
                  {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continuer vers le paiement
                </Button>
              </div>
            )}
          </section>

          <CheckoutOrderSummary
            lineItems={summaryLineItems}
            subtotalLabel="Sous-total TTC"
            subtotalAmount={formatResourcePrice(totalTtc)}
            totalAmount={formatResourcePrice(totalTtc)}
          >
            <Button type="button" variant="outline" className="w-full bg-white" asChild>
              <Link to="/boutique/commandes">Voir mes commandes</Link>
            </Button>
          </CheckoutOrderSummary>
        </main>

        {!items.length ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            <p className="font-bold">Panier vide</p>
            <Button asChild><Link to="/boutique">Retour à la boutique</Link></Button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

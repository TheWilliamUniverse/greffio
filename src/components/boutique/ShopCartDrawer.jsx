import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet.jsx';
import { Button } from '@/components/ui/button.jsx';
import { LegalAcceptanceCheckbox } from '@/components/payments/LegalAcceptanceCheckbox.jsx';
import { formatResourcePrice } from '@/config/resourceServices.js';
import { useAuth } from '@/hooks/useAuth.js';
import { cn } from '@/lib/utils.js';

export const ShopCartDrawer = ({
  open,
  onOpenChange,
  items,
  totalTtc,
  setQuantity,
  removeLine,
  clearCart,
  updateLineMeta,
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleCheckout = () => {
    if (!termsAccepted) {
      toast.error('Acceptez les CGU et CGV pour continuer.');
      return;
    }
    if (!currentUser) {
      toast.error('Connectez-vous pour commander.');
      return;
    }
    if (!items.length) return;

    const needsDetails = items.some(
      (line) => line.catalog?.requiresSiren !== false || line.catalog?.requiresCompany !== false,
    );
    if (needsDetails && !showDetails) {
      setShowDetails(true);
      return;
    }

    onOpenChange(false);
    navigate('/boutique/checkout');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-2xl">
        <div className="border-b border-border px-6 py-5">
          <SheetHeader className="text-left">
            <SheetTitle className="text-xl">Votre panier</SheetTitle>
            <SheetDescription>
              Documents et packs sélectionnés – règlement sécurisé via Mollie.
            </SheetDescription>
          </SheetHeader>
        </div>

        {!items.length ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <ShoppingBag className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-bold text-foreground">Votre panier est vide</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Parcourez la boutique pour ajouter des documents ou packs.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Continuer mes achats
            </Button>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1fr_280px]">
            <div className="space-y-3 overflow-y-auto px-6 py-4">
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
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setQuantity(line.id, Number(line.quantity || 1) - 1)}
                        aria-label="Diminuer la quantité"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="min-w-[2rem] text-center text-sm font-bold">{line.quantity || 1}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setQuantity(line.id, Number(line.quantity || 1) + 1)}
                        aria-label="Augmenter la quantité"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-sm font-extrabold text-primary">{formatResourcePrice(line.lineTotalTtc)}</p>
                  </div>
                  {showDetails && (line.catalog?.requiresSiren !== false || line.catalog?.requiresCompany !== false) ? (
                    <div className="mt-3 space-y-2 border-t border-border pt-3">
                      {line.catalog?.requiresSiren !== false ? (
                        <label className="block text-xs">
                          SIREN ou SIRET
                          <input
                            className="mt-1 h-9 w-full rounded-md border border-input px-3 text-sm"
                            value={line.siren || ''}
                            onChange={(event) => updateLineMeta(line.id, { siren: event.target.value })}
                            placeholder="123 456 789"
                          />
                        </label>
                      ) : null}
                      {line.catalog?.requiresCompany !== false ? (
                        <label className="block text-xs">
                          Nom de l&apos;entreprise
                          <input
                            className="mt-1 h-9 w-full rounded-md border border-input px-3 text-sm"
                            value={line.companyName || ''}
                            onChange={(event) => updateLineMeta(line.id, { companyName: event.target.value })}
                            placeholder="Dénomination sociale"
                          />
                        </label>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <aside className="flex flex-col border-t border-border bg-muted/30 md:border-l md:border-t-0">
              <div className="flex-1 space-y-4 px-5 py-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Récapitulatif
                </p>
                <ul className="space-y-2 text-sm">
                  {items.map((line) => (
                    <li key={`sum-${line.id}`} className="flex justify-between gap-2">
                      <span className="truncate text-muted-foreground">
                        {line.catalog?.title} × {line.quantity || 1}
                      </span>
                      <span className="shrink-0 font-semibold">{formatResourcePrice(line.lineTotalTtc)}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-border pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total TTC</span>
                    <span className="text-2xl font-extrabold text-[hsl(var(--greffio-blue-900))]">
                      {formatResourcePrice(totalTtc)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Paiement sécurisé via Mollie</p>
                </div>
              </div>
              <div className={cn('space-y-3 border-t border-border px-5 py-5')}>
                <LegalAcceptanceCheckbox checked={termsAccepted} onChange={setTermsAccepted} />
                <Button
                  type="button"
                  className="w-full"
                  disabled={submitting || !termsAccepted}
                  onClick={handleCheckout}
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {showDetails ? 'Aller au paiement' : 'Continuer la commande'}
                </Button>
                <Button type="button" variant="outline" className="w-full bg-white" asChild>
                  <Link to="/boutique/commandes">Voir mes commandes</Link>
                </Button>
              </div>
            </aside>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

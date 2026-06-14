import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Minus, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet.jsx';
import { Button } from '@/components/ui/button.jsx';
import { LegalAcceptanceCheckbox } from '@/components/payments/LegalAcceptanceCheckbox.jsx';
import { formatResourcePrice } from '@/config/resourceServices.js';
import { createResourceOrder } from '@/api/resources.js';
import { useAuth } from '@/hooks/useAuth.js';

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

  const handleCheckout = async () => {
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

    setSubmitting(true);
    try {
      const created = [];
      for (const line of items) {
        const payload = await createResourceOrder({
          serviceId: line.serviceId,
          companyName: line.companyName?.trim() || null,
          siren: line.siren?.replace(/\s/g, '') || null,
          dossierId: line.dossierId || null,
          email: currentUser.email,
          notes: line.notes?.trim() || null,
        });
        const order = payload?.order;
        if (order) {
          for (let i = 1; i < Number(line.quantity || 1); i += 1) {
            const extra = await createResourceOrder({
              serviceId: line.serviceId,
              companyName: line.companyName?.trim() || null,
              siren: line.siren?.replace(/\s/g, '') || null,
              dossierId: line.dossierId || null,
              email: currentUser.email,
              notes: line.notes?.trim() || null,
            });
            if (extra?.order) created.push(extra.order);
          }
          created.push(order);
        }
      }

      clearCart();
      onOpenChange(false);
      setShowDetails(false);
      setTermsAccepted(false);

      const payable = created.filter((order) => Number(order.priceTtc) > 0);
      if (payable.length === 1) {
        toast.success('Commande enregistrée. Finalisez le paiement.');
        navigate(`/paiement?resourceOrder=${payable[0].id}&service=${payable[0].serviceId}`);
        return;
      }
      if (payable.length > 1) {
        toast.success(`${created.length} commandes enregistrées. Réglez-les depuis Mes commandes.`);
        navigate('/boutique/commandes');
        return;
      }
      toast.success('Demande enregistrée. Notre équipe vous recontacte sous peu.');
      navigate('/boutique/commandes');
    } catch (_error) {
      toast.error('Impossible d’enregistrer la commande pour le moment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Votre panier</SheetTitle>
          <SheetDescription>
            Documents et packs sélectionnés – règlement sécurisé via Mollie.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto py-4">
          {!items.length ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Votre panier est vide. Parcourez la boutique pour ajouter des documents.
            </p>
          ) : items.map((line) => (
            <div key={line.id} className="rounded-xl border border-border bg-white p-4">
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
                <p className="text-sm font-extrabold">{formatResourcePrice(line.lineTotalTtc)}</p>
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

        {items.length > 0 ? (
          <SheetFooter className="flex-col gap-3 border-t border-border pt-4 sm:flex-col sm:space-x-0">
            <div className="flex w-full items-center justify-between text-sm">
              <span className="text-muted-foreground">Total TTC</span>
              <span className="text-xl font-extrabold">{formatResourcePrice(totalTtc)}</span>
            </div>
            <LegalAcceptanceCheckbox checked={termsAccepted} onChange={setTermsAccepted} />
            <Button
              type="button"
              className="w-full"
              disabled={submitting || !termsAccepted}
              onClick={() => void handleCheckout()}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {showDetails ? 'Valider et payer' : 'Continuer la commande'}
            </Button>
            <Button type="button" variant="outline" className="w-full" asChild>
              <Link to="/boutique/commandes">Voir mes commandes</Link>
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
};

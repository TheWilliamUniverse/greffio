import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet.jsx';
import { Button } from '@/components/ui/button.jsx';
import {
  formatResourcePrice,
  getProcessingLabel,
  isResourceOrderable,
  RESOURCE_PAYMENT_ENABLED,
} from '@/config/resourceServices.js';
import { createResourceOrder, fetchResourceConfig } from '@/api/resources.js';
import { useNavigate } from 'react-router-dom';
import { listDossiers } from '@/api/dossiers.js';
import { lookupCompanyBySiren } from '@/api/company.js';
import { sanitizeCompanyIdentifier } from '@/hooks/useCompanySirenLookup.js';
import { useAuth } from '@/hooks/useAuth.js';
import { LegalAcceptanceCheckbox } from '@/components/payments/LegalAcceptanceCheckbox.jsx';
import { toast } from 'sonner';

export const ServiceOrderDrawer = ({ open, onOpenChange, service }) => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const [paymentEnabled, setPaymentEnabled] = useState(RESOURCE_PAYMENT_ENABLED);
  const [companyName, setCompanyName] = useState('');
  const [siren, setSiren] = useState('');
  const [email, setEmail] = useState('');
  const [dossierId, setDossierId] = useState('');
  const [notes, setNotes] = useState('');
  const [dossiers, setDossiers] = useState([]);
  const [loadingDossiers, setLoadingDossiers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderSaved, setOrderSaved] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  // Lookup automatique : SIREN/SIRET saisi → dénomination préremplie (comme l'outil de recherche)
  const [lookupState, setLookupState] = useState('idle');
  const [lookupCompany, setLookupCompany] = useState(null);

  useEffect(() => {
    if (!open) return;
    void fetchResourceConfig()
      .then((cfg) => setPaymentEnabled(Boolean(cfg?.paymentEnabled)))
      .catch(() => setPaymentEnabled(RESOURCE_PAYMENT_ENABLED));
  }, [open]);

  useEffect(() => {
    if (!open || !service) return;
    setOrderSaved(false);
    setTermsAccepted(false);
    setCompanyName('');
    setSiren('');
    setNotes('');
    setDossierId('');
    setEmail(currentUser?.email || '');
    setLookupState('idle');
    setLookupCompany(null);
  }, [open, service, currentUser?.email]);

  useEffect(() => {
    const digits = sanitizeCompanyIdentifier(siren);
    if (digits.length !== 9 && digits.length !== 14) {
      setLookupState('idle');
      setLookupCompany(null);
      return undefined;
    }
    let cancelled = false;
    setLookupState('loading');
    const timer = setTimeout(() => {
      void lookupCompanyBySiren(digits)
        .then((payload) => {
          if (cancelled) return;
          const company = payload?.company || null;
          if (company?.denomination) {
            setLookupCompany(company);
            setLookupState('found');
            setCompanyName(company.denomination);
          } else {
            setLookupCompany(null);
            setLookupState('notfound');
          }
        })
        .catch(() => {
          if (cancelled) return;
          setLookupCompany(null);
          setLookupState('notfound');
        });
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [siren]);

  useEffect(() => {
    if (!open || !isAuthenticated) return;
    let cancelled = false;
    const load = async () => {
      setLoadingDossiers(true);
      try {
        const payload = await listDossiers();
        if (!cancelled) setDossiers(payload?.dossiers || payload || []);
      } catch (_error) {
        if (!cancelled) setDossiers([]);
      } finally {
        if (!cancelled) setLoadingDossiers(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [open, isAuthenticated]);

  const orderable = service && isResourceOrderable(service);
  const canPay = orderable && paymentEnabled;

  const handleSubmit = async () => {
    if (!isAuthenticated) return;
    if (!service) return;
    if (canPay && !termsAccepted) {
      toast.error('Acceptez les CGU et CGV pour continuer.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = await createResourceOrder({
        serviceId: service.id,
        companyName: companyName.trim() || null,
        siren: siren.replace(/\s/g, '') || null,
        dossierId: dossierId || null,
        email: email.trim() || currentUser?.email,
        notes: notes.trim() || null,
      });
      const order = payload?.order;
      setOrderSaved(true);
      const needsPay = order && Number(order.priceTtc) > 0 && paymentEnabled;
      if (needsPay) {
        toast.success('Commande enregistrée. Finalisez le paiement.');
        onOpenChange(false);
        navigate(`/paiement?resourceOrder=${order.id}&service=${service.id}`);
        return;
      }
      toast.success('Demande enregistrée. Notre équipe vous recontacte sous peu.');
    } catch (error) {
      toast.error('Impossible d’enregistrer la demande pour le moment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        {service && (
          <>
            <SheetHeader>
              <SheetTitle>{service.title}</SheetTitle>
              <SheetDescription>{service.description}</SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Prix</span>
                <span className="font-semibold">{formatResourcePrice(service.priceTtc)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Délai estimatif</span>
                <span className="font-semibold">{service.estimatedDelay}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Traitement</span>
                <span className="text-right font-semibold">{getProcessingLabel(service)}</span>
              </div>
            </div>

            {!isAuthenticated && (
              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-semibold">Connexion requise</p>
                <p className="mt-2 leading-6">
                  Connectez-vous pour commander ce document et le retrouver dans votre espace Greffio.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link to="/login">Se connecter</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/signup">Créer un compte</Link>
                  </Button>
                </div>
              </div>
            )}

            {isAuthenticated && !orderSaved && (
              <form
                className="mt-6 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSubmit();
                }}
              >
                {service.requiresSiren !== false && (
                  <div>
                    <label className="block text-sm">
                      SIREN ou SIRET
                      <input
                        className="mt-1 h-10 w-full rounded-md border border-input px-3"
                        value={siren}
                        onChange={(event) => setSiren(sanitizeCompanyIdentifier(event.target.value))}
                        placeholder="123 456 789"
                        inputMode="numeric"
                      />
                    </label>
                    {lookupState === 'loading' && (
                      <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        Recherche de l’entreprise…
                      </p>
                    )}
                    {lookupState === 'found' && lookupCompany && (
                      <div className="mt-2 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                        <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          <span className="font-bold">{lookupCompany.denomination}</span>
                          {lookupCompany.city ? ` – ${lookupCompany.city}` : ''}
                        </span>
                      </div>
                    )}
                    {lookupState === 'notfound' && (
                      <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        Entreprise introuvable avec cet identifiant. Vérifiez le SIREN/SIRET ou saisissez la dénomination manuellement.
                      </p>
                    )}
                  </div>
                )}
                {service.requiresCompany !== false && (
                  <label className="block text-sm">
                    Nom de l’entreprise
                    <input
                      className="mt-1 h-10 w-full rounded-md border border-input px-3"
                      value={companyName}
                      onChange={(event) => setCompanyName(event.target.value)}
                      placeholder="Dénomination sociale"
                    />
                  </label>
                )}
                <label className="block text-sm">
                  Email de contact
                  <input
                    type="email"
                    className="mt-1 h-10 w-full rounded-md border border-input px-3"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </label>
                <label className="block text-sm">
                  Dossier Greffio associé (optionnel)
                  <select
                    className="mt-1 h-10 w-full rounded-md border border-input px-3"
                    value={dossierId}
                    onChange={(event) => setDossierId(event.target.value)}
                    disabled={loadingDossiers}
                  >
                    <option value="">Aucun dossier</option>
                    {(Array.isArray(dossiers) ? dossiers : []).map((dossier) => (
                      <option key={dossier.id} value={dossier.id}>
                        {dossier.companyName || dossier.reference || dossier.id}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  Précisions (optionnel)
                  <textarea
                    className="mt-1 min-h-[80px] w-full rounded-md border border-input px-3 py-2"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Type de document, urgence, contexte…"
                  />
                </label>

                {!canPay && orderable && (
                  <p className="rounded-md bg-muted p-3 text-xs leading-5 text-muted-foreground">
                    Ce service sera bientôt disponible au paiement en ligne. Vous pouvez enregistrer votre demande dès maintenant.
                  </p>
                )}

                {canPay ? (
                  <LegalAcceptanceCheckbox checked={termsAccepted} onChange={setTermsAccepted} />
                ) : null}

                <SheetFooter className="mt-2 flex-col gap-2 sm:flex-col sm:space-x-0">
                  <Button type="submit" className="w-full" disabled={submitting || (canPay && !termsAccepted)}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {canPay ? 'Payer et commander' : orderable ? 'Enregistrer ma demande' : 'Demander une alerte'}
                  </Button>
                  <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                    Fermer
                  </Button>
                </SheetFooter>
              </form>
            )}

            {isAuthenticated && orderSaved && (
              <div className="mt-6 space-y-4">
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  Votre demande a été enregistrée. Vous la retrouverez dans votre espace dès que le traitement démarre.
                </p>
                <Button asChild className="w-full">
                  <Link to="/documents">Voir mon espace</Link>
                </Button>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, FileText, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth.js';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { COMPANY_FORM_CATALOG, LEGAL_SERVICES } from '@/utils/mockData.js';
import { getProjectDraft } from '@/utils/localStorage.js';
import { createDossier } from '@/api/dossiers.js';
import { saveCurrentDossierId } from '@/utils/sessionStore.js';

const profiles = [
  { id: 'client', label: 'Client entrepreneur', icon: FileText, text: 'Je veux créer ou gérer mon entreprise.' },
  { id: 'pro', label: 'Professionnel', icon: Users, text: 'Je traite des formalités pour mes clients.' },
];

const legalStructureGroups = COMPANY_FORM_CATALOG.reduce((groups, form) => {
  const group = groups.find((item) => item.category === form.family);
  if (group) {
    group.forms.push(form);
    return groups;
  }
  return [...groups, { category: form.family, forms: [form] }];
}, []);

const resolveServiceId = (value, legalForm) => {
  if (LEGAL_SERVICES.some((service) => service.id === value)) return value;
  if (value === 'modification') return 'modification';
  if (value === 'dissolution') return 'fermeture';
  if (legalForm === 'SA') return 'creation-sa';
  if (legalForm === 'SARL' || legalForm === 'EURL') return 'creation-sarl';
  if (legalForm === 'SCI') return 'creation-sci';
  if (legalForm.includes('Auto') || legalForm.includes('Micro')) return 'micro-entreprise';
  return 'creation-sas';
};

export const SignupPage = () => {
  const [searchParams] = useSearchParams();
  const initialService = searchParams.get('service') || 'creation-sas';
  const draft = getProjectDraft();
  const [step, setStep] = useState(1);
  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      profile: 'client',
      service: resolveServiceId(draft?.data?.journey || initialService, draft?.data?.legalForm),
      initiatorType: draft?.data?.initiatorType || 'personne_physique',
      initiatorName: draft?.data?.initiatorName || '',
      initiatorLegalForm: draft?.data?.initiatorLegalForm || 'SA',
      legalStructure: draft?.data?.legalForm || 'SAS',
      location: draft?.data?.city ? `${draft.data.city}, France` : 'France',
      companyName: draft?.data?.companyName || '',
      activity: draft?.data?.activity || '',
      email: draft?.data?.email || '',
    },
  });
  const { signup } = useAuth();
  const navigate = useNavigate();

  const selectedProfile = watch('profile');
  const selectedService = watch('service');
  const initiatorType = watch('initiatorType');
  const selectedOffer = useMemo(() => LEGAL_SERVICES.find((service) => service.id === selectedService), [selectedService]);

  const onSubmit = async (data) => {
    if (step < 4) {
      setStep((value) => value + 1);
      return;
    }

    const result = await signup(data);
    if (result.success) {
      try {
        const dossierPayload = await createDossier({
          userId: result.user?.id || null,
          companyName: data.companyName,
          legalForm: data.legalStructure,
          service: data.service,
        });
        if (dossierPayload?.dossier?.id) {
          saveCurrentDossierId(dossierPayload.dossier.id);
        }
      } catch (_e) {
        toast.warning('Compte créé, mais le dossier API sera finalisé au prochain écran.');
      }
      toast.success('Espace Greffio créé. Votre dossier est prêt à être piloté.');
      navigate('/dashboard');
    }
  };

  const stepVariants = {
    hidden: { opacity: 0, x: 18 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.25 } },
    exit: { opacity: 0, x: -18, transition: { duration: 0.18 } },
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/">
            <GreffioLogo variant="full" />
          </Link>
          <Button variant="outline" asChild className="bg-white">
            <Link to="/login">Connexion</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_390px] lg:px-8">
        <section className="rounded-md border border-border bg-white shadow-elevation-md">
          <div className="h-2 bg-muted">
            <div className="h-full bg-[hsl(var(--greffio-blue))] transition-all duration-300" style={{ width: `${(step / 4) * 100}%` }} />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-10">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-7">
                  <div>
                    <p className="text-sm font-bold uppercase text-primary">Profil</p>
                    <h1 className="mt-2 text-3xl font-extrabold">Qui utilisera Greffio </h1>
                    <p className="mt-2 text-muted-foreground">Le dashboard s’adapte à votre usage : client final ou professionnel qui suit plusieurs dossiers.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {profiles.map((profile) => (
                      <label key={profile.id} className={`cursor-pointer rounded-md border p-5 transition ${selectedProfile === profile.id ? 'border-primary bg-secondary shadow-elevation-sm' : 'border-border hover:bg-muted'}`}>
                        <input type="radio" value={profile.id} {...register('profile')} className="hidden" />
                        <profile.icon className="mb-4 h-7 w-7 text-primary" />
                        <span className="block text-lg font-bold">{profile.label}</span>
                        <span className="mt-2 block text-sm leading-6 text-muted-foreground">{profile.text}</span>
                      </label>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-7">
                  <div>
                    <p className="text-sm font-bold uppercase text-primary">Formalité</p>
                    <h1 className="mt-2 text-3xl font-extrabold">Choisissez le premier dossier.</h1>
                    <p className="mt-2 text-muted-foreground">Greffio créera automatiquement les tâches, pièces attendues et échanges d’équipe.</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {LEGAL_SERVICES.map((service) => (
                      <label key={service.id} className={`cursor-pointer rounded-md border p-4 transition ${selectedService === service.id ? 'border-primary bg-secondary' : 'border-border hover:bg-muted'}`}>
                        <input type="radio" value={service.id} {...register('service', { required: true })} className="hidden" />
                        <span className="text-sm font-bold">{service.title}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{service.description}</span>
                      </label>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-7">
                  <div>
                    <p className="text-sm font-bold uppercase text-primary">Identité</p>
                    <h1 className="mt-2 text-3xl font-extrabold">Créez le compte et l’entreprise.</h1>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>La démarche est faite par</Label>
                      <select {...register('initiatorType')} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                        <option value="personne_physique">Une personne physique</option>
                        <option value="personne_morale">Une personne morale</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>{initiatorType === 'personne_morale' ? 'Société demandeuse' : 'Nom du demandeur'}</Label>
                      <Input {...register('initiatorName')} placeholder={initiatorType === 'personne_morale' ? 'Ex : société porteuse du projet' : 'Nom complet du demandeur'} />
                    </div>
                    {initiatorType === 'personne_morale' && (
                      <div className="space-y-2">
                        <Label>Forme de la société demandeuse</Label>
                        <select {...register('initiatorLegalForm')} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                          {['SA', 'SAS', 'SASU', 'SARL', 'EURL', 'SCI', 'Association', 'Autre'].map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Prénom</Label>
                      <Input {...register('firstName', { required: true })} placeholder="Votre prénom" />
                    </div>
                    <div className="space-y-2">
                      <Label>Nom</Label>
                      <Input {...register('lastName', { required: true })} placeholder="Votre nom" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" {...register('email', { required: true })} placeholder="vous@entreprise.fr" />
                    </div>
                    <div className="space-y-2">
                      <Label>Mot de passe</Label>
                      <Input type="password" {...register('password', { required: true, minLength: 6 })} placeholder="Minimum 6 caractères" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Nom de l’entreprise ou du client</Label>
                      <Input {...register('companyName', { required: true })} placeholder="Nom du projet ou de l’entreprise" />
                    </div>
                    <div className="space-y-2">
                      <Label>Forme juridique</Label>
                      <select {...register('legalStructure')} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                        {legalStructureGroups.map((group) => (
                          <optgroup key={group.category} label={group.category}>
                            {group.forms.map((form) => (
                              <option key={form.key} value={form.label}>{form.label}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Ville / pays</Label>
                      <Input {...register('location')} placeholder="Paris, France" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Activité principale</Label>
                      <Input {...register('activity')} placeholder="Conseil, commerce, restauration, immobilier..." />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div key="step4" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-7">
                  <div>
                    <p className="text-sm font-bold uppercase text-primary">Validation</p>
                    <h1 className="mt-2 text-3xl font-extrabold">Votre espace est prêt.</h1>
                    <p className="mt-2 text-muted-foreground">En validant, vous accéderez au dashboard complet avec dossier, documents, équipe et pilotage.</p>
                  </div>
                  <div className="rounded-md border border-border bg-muted p-5 text-sm">
                    <div className="grid gap-3 md:grid-cols-2">
                      <p><span className="text-muted-foreground">Profil :</span> <strong>{selectedProfile === 'pro' ? 'Professionnel' : 'Client entrepreneur'}</strong></p>
                      <p><span className="text-muted-foreground">Formalité :</span> <strong>{selectedOffer.title}</strong></p>
                      <p><span className="text-muted-foreground">Compte :</span> <strong>{watch('firstName')} {watch('lastName')}</strong></p>
                      <p><span className="text-muted-foreground">Entreprise :</span> <strong>{watch('companyName')}</strong></p>
                    </div>
                  </div>
                  <label className="flex items-start gap-3 rounded-md border border-border bg-white p-4">
                    <input type="checkbox" required className="mt-1" />
                    <span className="text-sm leading-6 text-muted-foreground">
                      J’accepte les conditions d’utilisation, la politique de confidentialité et les mentions légales. Greffio est une marque déposée de William Establishments.
                    </span>
                  </label>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-9 flex items-center justify-between border-t border-border pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((value) => Math.max(1, value - 1))}
                className={step === 1 ? 'invisible bg-white' : 'bg-white'}
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
              <Button type="submit" size="lg" className="gap-2">
                {step === 4 ? 'Ouvrir mon dashboard' : 'Continuer'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
            <ShieldCheck className="mb-4 h-7 w-7 text-primary" />
            <h2 className="text-xl font-extrabold">Ce qui sera créé</h2>
            <div className="mt-5 space-y-3 text-sm text-muted-foreground">
              {['Dashboard client', 'Dossier initial', 'Checklist documentaire', 'Fil équipe-client', 'Planning de conformité'].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
            <CreditCard className="mb-4 h-7 w-7 text-primary" />
            <h2 className="text-xl font-extrabold">Paiement sécurisé</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Stripe Checkout : CB, Visa/Mastercard, Apple Pay, Google Pay, Link, virement ou prélèvement SEPA selon l’offre.</p>
          </div>
          <div className="rounded-md bg-[hsl(var(--greffio-blue))] p-5 text-white shadow-elevation-md">
            <p className="text-sm font-bold">Équipe Greffio</p>
            <p className="mt-2 text-sm leading-6 text-white/78">L’équipe Greffio peut demander une pièce, commenter un document et suivre l’avancement directement dans votre espace.</p>
          </div>
        </aside>
      </main>
    </div>
  );
};

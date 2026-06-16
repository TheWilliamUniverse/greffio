import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, FileText, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth.js';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { BrandName } from '@/components/BrandName.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { COMPANY_FORM_CATALOG, LEGAL_SERVICES } from '@/config/businessCatalog.js';
import { PUBLISHER_LEGAL_NAME } from '@/config/publisher.js';
import { LoginAlertsToggle } from '@/components/security/LoginAlertsToggle.jsx';
import { SecurityChallengeWidget } from '@/components/security/SecurityChallengeWidget.jsx';
import { useSecurityConfig } from '@/hooks/useSecurityConfig.js';
import { FieldError } from '@/components/patterns/FieldError.jsx';
import { cn } from '@/lib/utils.js';
import { getAuthInputClass } from '@/lib/authFormStyles.js';
import { MobileChoiceStep, MobileChoiceTile } from '@/components/questionnaire/MobileChoiceStep.jsx';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';
import { lightQuestionnaireHaptic } from '@/utils/questionnaireHaptics.js';
import { getProjectDraft, saveProjectDraft } from '@/utils/localStorage.js';
import { createDossier } from '@/api/dossiers.js';
import { saveCurrentDossierId } from '@/utils/sessionStore.js';
import { resolveServiceFromFormality } from '@/utils/formalityMapping.js';

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
  if (value === 'statuts') return 'creation-sasu';
  if (value === 'creation') {
    return resolveServiceFromFormality('creation_societe', legalForm);
  }
  if (legalForm === 'SA') return 'creation-sa';
  if (legalForm === 'SASU') return 'creation-sasu';
  if (legalForm === 'SAS') return 'creation-sas';
  if (legalForm === 'SARL' || legalForm === 'EURL') return 'creation-sarl';
  if (legalForm === 'SCI') return 'creation-sci';
  if (legalForm.includes('Auto') || legalForm.includes('Micro')) return 'micro-entreprise';
  return resolveServiceFromFormality('', legalForm);
};

const buildSignupSteps = () => [
  'profile',
  'service',
  'initiator',
  'firstName',
  'lastName',
  'email',
  'password',
  'company',
  'validation',
];

const STEP_FIELDS = {
  profile: [],
  service: ['service'],
  initiator: [],
  firstName: ['firstName'],
  lastName: ['lastName'],
  email: ['email'],
  password: ['password'],
  identity: ['firstName', 'lastName'],
  account: ['email', 'password'],
  company: ['companyName'],
  validation: [],
};

export const SignupPage = () => {
  const [searchParams] = useSearchParams();
  const initialService = searchParams.get('service') || 'creation-sas';
  const draft = getProjectDraft();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [captcha, setCaptcha] = useState({ provider: 'turnstile', turnstileToken: '', recaptchaToken: '' });
  const security = useSecurityConfig();
  const hasCaptchaToken = Boolean(captcha.turnstileToken || captcha.recaptchaToken);
  const showSignupChallenge = security.turnstileOnSignup && security.captchaProvider !== 'none';
  const mobileAuth = isCapacitorNative() || isMobileBrowserViewport();
  const authInputClass = getAuthInputClass(mobileAuth);
  const { register, watch, trigger, getValues, setValue, formState: { errors } } = useForm({
    shouldUnregister: false,
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
      firstName: draft?.data?.firstName || '',
      lastName: draft?.data?.lastName || '',
      phone: draft?.data?.phone || '',
      password: '',
      acceptedTerms: false,
      loginAlertsEnabled: true,
    },
  });
  const { signup } = useAuth();
  const navigate = useNavigate();

  const selectedProfile = watch('profile');
  const selectedService = watch('service');
  const initiatorType = watch('initiatorType');
  const acceptedTerms = watch('acceptedTerms');
  const loginAlertsEnabled = watch('loginAlertsEnabled');
  const selectedOffer = useMemo(() => LEGAL_SERVICES.find((service) => service.id === selectedService), [selectedService]);
  const signupSteps = useMemo(() => buildSignupSteps(), []);
  const stepCount = signupSteps.length;
  const currentStepId = signupSteps[step - 1] || 'profile';

  const resolveStepFields = (stepId) => {
    if (stepId === 'initiator' && initiatorType === 'personne_morale') {
      return ['initiatorName'];
    }
    return STEP_FIELDS[stepId] || [];
  };

  const findStepIndex = (stepId) => signupSteps.indexOf(stepId) + 1;

  const advanceStep = async () => {
    const fields = resolveStepFields(currentStepId);
    if (fields.length) {
      const valid = await trigger(fields);
      if (!valid) {
        toast.error('Complétez les champs obligatoires pour continuer.');
        return;
      }
    }
    setStep((value) => Math.min(stepCount, value + 1));
  };

  const selectProfile = (profileId) => {
    void lightQuestionnaireHaptic();
    setValue('profile', profileId, { shouldDirty: true });
  };

  const selectService = (serviceId) => {
    void lightQuestionnaireHaptic();
    setValue('service', serviceId, { shouldDirty: true, shouldValidate: true });
    if (mobileAuth) {
      window.setTimeout(() => { void advanceStep(); }, 220);
    }
  };

  const hideMobileContinue = mobileAuth && currentStepId === 'service';

  const completeSignup = async () => {
    const data = getValues();
    if (!data.acceptedTerms) {
      toast.error('Veuillez accepter les conditions d’utilisation pour continuer.');
      return;
    }
    if (!data.email || !data.password || !data.firstName || !data.lastName || !data.companyName) {
      toast.error('Certaines informations du compte sont manquantes. Revenez à l’étape identité.');
      setStep(findStepIndex('firstName'));
      return;
    }

    setSubmitting(true);
    try {
      const initiatorName = data.initiatorType === 'personne_morale'
        ? data.initiatorName
        : `${data.firstName || ''} ${data.lastName || ''}`.trim();

      const result = await signup({
        ...data,
        initiatorName,
        ...(showSignupChallenge && hasCaptchaToken ? captcha : {}),
      });
      if (!result.success) {
        toast.error(result.message || result.error || 'Création du compte impossible.');
        return;
      }
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
      saveProjectDraft({
        ...(draft || {}),
        data: {
          ...(draft?.data || {}),
          journey: data.service === 'modification'
            ? 'modification'
            : data.service === 'fermeture'
              ? 'dissolution'
              : 'creation',
          companyName: data.companyName,
          legalForm: data.legalStructure,
          activity: data.activity,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          initiatorType: data.initiatorType,
          initiatorName,
        },
      });
      toast.success('Espace Greffio créé. Votre dossier est prêt à être piloté.');
      navigate('/dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  const onFormSubmit = async (event) => {
    event.preventDefault();
    if (currentStepId !== 'validation') {
      await advanceStep();
      return;
    }
    await completeSignup();
  };

  const stepVariants = {
    hidden: { opacity: 0, x: 18 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.25 } },
    exit: { opacity: 0, x: -18, transition: { duration: 0.18 } },
  };

  const renderIdentityFields = (singleField = null) => {
    const showFirst = !singleField || singleField === 'firstName';
    const showLast = !singleField || singleField === 'lastName';
    return (
      <div className={`grid gap-5 ${singleField ? '' : 'md:grid-cols-2'}`}>
        {showFirst ? (
          <div className="space-y-2">
            <Label>Prénom</Label>
            <Input {...register('firstName', { required: true })} placeholder="Votre prénom" className={authInputClass} />
          </div>
        ) : null}
        {showLast ? (
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input {...register('lastName', { required: true })} placeholder="Votre nom" className={authInputClass} />
          </div>
        ) : null}
      </div>
    );
  };

  const renderAccountFields = (singleField = null) => {
    const showEmail = !singleField || singleField === 'email';
    const showPassword = !singleField || singleField === 'password';
    return (
      <div className={`grid gap-5 ${singleField ? '' : 'md:grid-cols-2'}`}>
        {showEmail ? (
          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
              type="email"
              className={authInputClass}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'signup-email-error' : undefined}
              {...register('email', { required: 'Indiquez votre email.' })}
              placeholder="vous@entreprise.fr"
            />
            <FieldError id="signup-email-error">{errors.email?.message}</FieldError>
          </div>
        ) : null}
        {showPassword ? (
          <div className="space-y-2">
            <Label htmlFor="signup-password">Mot de passe</Label>
            <Input
              id="signup-password"
              type="password"
              className={authInputClass}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'signup-password-error' : undefined}
              {...register('password', {
                required: 'Indiquez un mot de passe.',
                minLength: { value: 8, message: 'Minimum 8 caractères.' },
              })}
              placeholder="Minimum 8 caractères"
            />
            <FieldError id="signup-password-error">{errors.password?.message}</FieldError>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-background ${mobileAuth ? 'flex min-h-[100dvh] flex-col' : ''}`}>
      <header className="border-b border-border bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <GreffioLogo variant="full" to="/" />
          <Button variant="outline" asChild className="bg-white">
            <Link to="/login">Connexion</Link>
          </Button>
        </div>
      </header>

      <main className={`mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-10 sm:px-6 ${mobileAuth ? 'pb-[calc(env(safe-area-inset-bottom)+1rem)]' : 'lg:grid lg:grid-cols-[1fr_390px] lg:px-8'}`}>
        <section className={`rounded-md border border-border bg-white shadow-elevation-md ${mobileAuth ? 'w-full border-0 shadow-elevation-md sm:border sm:border-border' : ''}`}>
          <div className="h-2 bg-muted">
            <div className="h-full bg-[hsl(var(--greffio-blue))] transition-all duration-300" style={{ width: `${(step / stepCount) * 100}%` }} />
          </div>

          <form onSubmit={onFormSubmit} className="p-6 md:p-10 [&_input]:text-base md:[&_input]:text-sm [&_input]:min-h-12 md:[&_input]:min-h-10" noValidate>
            <AnimatePresence mode="wait">
              {currentStepId === 'profile' && (
                <motion.div key="profile" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-7">
                  {mobileAuth ? (
                    <MobileChoiceStep
                      kicker="Profil"
                      title={<>Qui utilisera <BrandName /></>}
                      subtitle="Le dashboard s’adapte à votre usage : client final ou professionnel qui suit plusieurs dossiers."
                      progressPercent={Math.round((step / stepCount) * 100)}
                      stepCurrent={step}
                      stepTotal={stepCount}
                      gridClassName="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3"
                    >
                      {profiles.map((profile) => (
                        <MobileChoiceTile
                          key={profile.id}
                          title={profile.label}
                          description={profile.text}
                          icon={profile.icon}
                          selected={selectedProfile === profile.id}
                          onSelect={() => selectProfile(profile.id)}
                        />
                      ))}
                    </MobileChoiceStep>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm font-bold uppercase text-primary">Profil</p>
                        <h1 className="mt-2 text-3xl font-extrabold">Qui utilisera <BrandName /> </h1>
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
                    </>
                  )}
                </motion.div>
              )}

              {currentStepId === 'service' && (
                <motion.div key="service" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-7">
                  {mobileAuth ? (
                    <MobileChoiceStep
                      kicker="Formalité"
                      title="Choisissez le premier dossier."
                      subtitle={<> <BrandName /> créera automatiquement les tâches, pièces attendues et échanges d’équipe.</>}
                      hint={isCapacitorNative()
                        ? 'Touchez une formalité pour continuer.'
                        : 'Sélectionnez une formalité pour continuer.'}
                      progressPercent={Math.round((step / stepCount) * 100)}
                      stepCurrent={step}
                      stepTotal={stepCount}
                      gridClassName="grid grid-cols-1 gap-2.5"
                    >
                      {LEGAL_SERVICES.map((service) => (
                        <MobileChoiceTile
                          key={service.id}
                          title={service.title}
                          description={service.description}
                          selected={selectedService === service.id}
                          onSelect={() => selectService(service.id)}
                          compact
                        />
                      ))}
                    </MobileChoiceStep>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm font-bold uppercase text-primary">Formalité</p>
                        <h1 className="mt-2 text-3xl font-extrabold">Choisissez le premier dossier.</h1>
                        <p className="mt-2 text-muted-foreground"><BrandName /> créera automatiquement les tâches, pièces attendues et échanges d’équipe.</p>
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
                    </>
                  )}
                </motion.div>
              )}

              {currentStepId === 'initiator' && (
                <motion.div key="initiator" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-7">
                  <div>
                    <p className="text-sm font-bold uppercase text-primary">Porteur de projet</p>
                    <h1 className="mt-2 text-3xl font-extrabold">Qui porte la démarche ?</h1>
                  </div>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label>La démarche est faite par</Label>
                      <select {...register('initiatorType')} className={`h-12 w-full rounded-md border border-input bg-background px-3 text-base md:h-9 md:text-sm`}>
                        <option value="personne_physique">Une personne physique</option>
                        <option value="personne_morale">Une personne morale</option>
                      </select>
                    </div>
                    {initiatorType === 'personne_morale' ? (
                      <>
                        <div className="space-y-2">
                          <Label>Société demandeuse</Label>
                          <Input {...register('initiatorName', { required: true })} placeholder="Ex : société porteuse du projet" className={authInputClass} />
                        </div>
                        <div className="space-y-2">
                          <Label>Forme de la société demandeuse</Label>
                          <select {...register('initiatorLegalForm')} className="h-12 w-full rounded-md border border-input bg-background px-3 text-base md:h-9 md:text-sm">
                            {['SA', 'SAS', 'SASU', 'SARL', 'EURL', 'SCI', 'Association', 'Autre'].map((item) => (
                              <option key={item} value={item}>{item}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm leading-6 text-muted-foreground">
                        Votre identité sera renseignée aux étapes suivantes (prénom et nom séparés).
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {currentStepId === 'firstName' && (
                <motion.div key="firstName" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-7">
                  <div>
                    <p className="text-sm font-bold uppercase text-primary">Identité</p>
                    <h1 className="mt-2 text-3xl font-extrabold">Votre prénom</h1>
                  </div>
                  {renderIdentityFields('firstName')}
                </motion.div>
              )}

              {currentStepId === 'lastName' && (
                <motion.div key="lastName" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-7">
                  <div>
                    <p className="text-sm font-bold uppercase text-primary">Identité</p>
                    <h1 className="mt-2 text-3xl font-extrabold">Votre nom</h1>
                  </div>
                  {renderIdentityFields('lastName')}
                </motion.div>
              )}

              {currentStepId === 'identity' && (
                <motion.div key="identity" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-7">
                  <div>
                    <p className="text-sm font-bold uppercase text-primary">Identité</p>
                    <h1 className="mt-2 text-3xl font-extrabold">Vos coordonnées personnelles</h1>
                  </div>
                  {renderIdentityFields()}
                </motion.div>
              )}

              {currentStepId === 'email' && (
                <motion.div key="email" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-7">
                  <div>
                    <p className="text-sm font-bold uppercase text-primary">Compte</p>
                    <h1 className="mt-2 text-3xl font-extrabold">Votre email</h1>
                  </div>
                  {renderAccountFields('email')}
                </motion.div>
              )}

              {currentStepId === 'password' && (
                <motion.div key="password" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-7">
                  <div>
                    <p className="text-sm font-bold uppercase text-primary">Compte</p>
                    <h1 className="mt-2 text-3xl font-extrabold">Choisissez un mot de passe</h1>
                  </div>
                  {renderAccountFields('password')}
                </motion.div>
              )}

              {currentStepId === 'account' && (
                <motion.div key="account" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-7">
                  <div>
                    <p className="text-sm font-bold uppercase text-primary">Compte</p>
                    <h1 className="mt-2 text-3xl font-extrabold">Identifiants de connexion</h1>
                  </div>
                  {renderAccountFields()}
                </motion.div>
              )}

              {currentStepId === 'company' && (
                <motion.div key="company" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-7">
                  <div>
                    <p className="text-sm font-bold uppercase text-primary">Entreprise</p>
                    <h1 className="mt-2 text-3xl font-extrabold">Créez le dossier initial.</h1>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Nom de l’entreprise ou du client</Label>
                      <Input {...register('companyName', { required: true })} placeholder="Nom du projet ou de l’entreprise" className={authInputClass} />
                    </div>
                    <div className="space-y-2">
                      <Label>Forme juridique</Label>
                      <select {...register('legalStructure')} className="h-12 w-full rounded-md border border-input bg-background px-3 text-base md:h-9 md:text-sm">
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
                      <Input {...register('location')} placeholder="Paris, France" className={authInputClass} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Activité principale</Label>
                      <Input {...register('activity')} placeholder="Conseil, commerce, restauration, immobilier..." className={authInputClass} />
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStepId === 'validation' && (
                <motion.div key="validation" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-7">
                  <div>
                    <p className="text-sm font-bold uppercase text-primary">Validation</p>
                    <h1 className="mt-2 text-3xl font-extrabold">Votre espace est prêt.</h1>
                    <p className="mt-2 text-muted-foreground">En validant, vous accéderez au dashboard complet avec dossier, documents, équipe et pilotage.</p>
                  </div>
                  <div className="rounded-md border border-border bg-muted p-5 text-sm">
                    <div className="grid gap-3 md:grid-cols-2">
                      <p><span className="text-muted-foreground">Profil :</span> <strong>{selectedProfile === 'pro' ? 'Professionnel' : 'Client entrepreneur'}</strong></p>
                      <p><span className="text-muted-foreground">Formalité :</span> <strong>{selectedOffer?.title}</strong></p>
                      <p><span className="text-muted-foreground">Compte :</span> <strong>{watch('firstName')} {watch('lastName')}</strong></p>
                      <p><span className="text-muted-foreground">Entreprise :</span> <strong>{watch('companyName')}</strong></p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-bold uppercase text-primary">Sécurité du compte</p>
                    <LoginAlertsToggle
                      id="signup-login-alerts"
                      enabled={loginAlertsEnabled}
                      onEnabledChange={(value) => setValue('loginAlertsEnabled', value, { shouldDirty: true })}
                    />
                  </div>
                  <label className="flex items-start gap-3 rounded-md border border-border bg-white p-4">
                    <input type="checkbox" className="mt-1" {...register('acceptedTerms', { required: true })} />
                    <span className="text-sm leading-6 text-muted-foreground">
                      J’accepte les conditions d’utilisation, la politique de confidentialité et les mentions légales. <BrandName /> est une marque déposée de {PUBLISHER_LEGAL_NAME}.
                    </span>
                  </label>
                  {errors.acceptedTerms ? (
                    <p className="text-sm text-destructive">L’acceptation des conditions est requise pour ouvrir votre espace.</p>
                  ) : null}
                  {showSignupChallenge ? (
                    <SecurityChallengeWidget action="signup" onTokens={setCaptcha} />
                  ) : null}
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
              <Button
                type="submit"
                size="lg"
                disabled={submitting || (currentStepId === 'validation' && !acceptedTerms) || (currentStepId === 'validation' && showSignupChallenge && !hasCaptchaToken)}
                className={cn(
                  'gap-2 shadow-[0_8px_20px_rgba(30,77,140,0.18)] hover:translate-y-0 hover:shadow-[0_10px_24px_rgba(30,77,140,0.2)]',
                  hideMobileContinue && 'hidden',
                )}
              >
                {submitting ? 'Création en cours…' : currentStepId === 'validation' ? 'Ouvrir mon dashboard' : 'Continuer'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </section>

        {!mobileAuth ? (
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
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Paiement sécurisé Google Pay ou carte bancaire, avec retour sécurisé dans votre espace Greffio.</p>
            </div>
            <div className="rounded-md bg-[hsl(var(--greffio-blue))] p-5 text-white shadow-elevation-md">
              <p className="text-sm font-bold">Équipe <BrandName /></p>
              <p className="mt-2 text-sm leading-6 text-white/92">L’équipe <BrandName /> peut demander une pièce, commenter un document et suivre l’avancement directement dans votre espace.</p>
            </div>
          </aside>
        ) : null}
      </main>
    </div>
  );
};

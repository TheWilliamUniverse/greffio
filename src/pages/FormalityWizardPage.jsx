import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Download,
  FileSignature,
  FileText,
  Info,
  Mail,
  PenLine,
  ShieldAlert,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { COMPANY_FORM_CATALOG } from '@/utils/mockData.js';
import {
  QUESTION_MODES,
  buildDocumentPreview,
  downloadPreview,
  getCompletion,
  getQuestionnaire,
  getWarnings,
} from '@/utils/formalityEngine.js';
import { getProjectDraft, saveProjectDraft } from '@/utils/localStorage.js';
import { GREFFIO_CONTACT } from '@/config/legalFlow.js';

const journeys = [
  {
    id: 'statuts',
    title: 'Générer mes statuts gratuitement',
    icon: FileSignature,
    color: 'bg-[hsl(var(--greffio-citron))]',
    pitch: 'Offre d’appel : génération gratuite des statuts et résumé par email.',
  },
  {
    id: 'creation',
    title: 'Créer une entreprise',
    icon: Building2,
    color: 'bg-secondary',
    pitch: 'Toutes formes classiques : SAS, SARL, SA, SCI, associations, libérales, coopératives et agricoles.',
  },
  {
    id: 'modification',
    title: 'Modifier une société',
    icon: PenLine,
    color: 'bg-blue-100',
    pitch: 'Siège, dirigeant, activité, capital, dénomination ou transformation.',
  },
  {
    id: 'dissolution',
    title: 'Dissoudre ou fermer',
    icon: Trash2,
    color: 'bg-rose-100',
    pitch: 'Dissolution-liquidation, radiation, mise en sommeil ou clôture.',
  },
];

const offers = [
  {
    name: 'Statuts gratuits',
    price: '0€',
    badge: 'Offre d’appel',
    description: 'Génération du projet de statuts, checklist des pièces et envoi du résumé par email.',
    features: ['Questionnaire guidé', 'Projet de statuts', 'Checklist greffe', 'Emails de suivi'],
  },
  {
    name: 'Dossier Standard',
    price: '99€ HT',
    badge: 'Autonome',
    description: 'Documents générés, vérification de cohérence et tableau de bord de dépôt.',
    features: ['Statuts et formulaires', 'Contrôle documentaire', 'Dossier partagé', 'Support email'],
  },
  {
    name: 'Équipe Greffio Premium',
    price: '199€ HT',
    badge: 'Conseillé',
    description: 'Équipe Greffio assignée, publication, anti-rejet et dépôt sur le Guichet Unique.',
    features: ['Équipe Greffio', 'Annonce légale', 'Envoi au greffe', 'Suivi Kbis'],
    highlighted: true,
  },
];

const steps = ['Démarche', 'Projet', 'Dirigeants', 'Synthèse'];
const targetFormGroups = COMPANY_FORM_CATALOG.reduce((groups, form) => {
  const group = groups.find((item) => item.category === form.family);
  if (group) {
    group.forms.push(form);
    return groups;
  }
  return [...groups, { category: form.family, forms: [form] }];
}, []);
const fieldClass = 'rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring';

export const FormalityWizardPage = () => {
  const [searchParams] = useSearchParams();
  const wizardTopRef = useRef(null);
  const draft = getProjectDraft();
  const initialJourney = searchParams.get('type') || 'statuts';
  const [step, setStep] = useState(0);
  const [showOffers, setShowOffers] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState('Formes les plus courantes');
  const [questionMode, setQuestionMode] = useState('avance');
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [contactStep, setContactStep] = useState(0);
  const [dossierReference] = useState(`F${Math.floor(10000000 + (Math.random() * 90000000))}`);
  const [answers, setAnswers] = useState(draft?.answers || {
    capitalType: 'Fixe',
    apportsNumeraire: 'Oui',
    clauseAgrement: 'Oui',
    confidentialite: 'Oui',
    mediationArbitrage: 'Médiation seule',
  });
  const [data, setData] = useState({
    journey: draft?.data?.journey || initialJourney,
    initiatorType: draft?.data?.initiatorType || 'personne_physique',
    initiatorName: draft?.data?.initiatorName || '',
    initiatorLegalForm: draft?.data?.initiatorLegalForm || 'SA',
    legalForm: draft?.data?.legalForm || 'SAS',
    urgency: draft?.data?.urgency || 'Cette semaine',
    companyName: draft?.data?.companyName || '',
    activity: draft?.data?.activity || '',
    city: draft?.data?.city || '',
    firstName: draft?.data?.firstName || '',
    lastName: draft?.data?.lastName || '',
    capital: draft?.data?.capital || '',
    shareholders: draft?.data?.shareholders || '1',
    president: draft?.data?.president || '',
    email: draft?.data?.email || '',
    phone: draft?.data?.phone || '',
    marketingConsent: true,
  });

  const selectedJourney = useMemo(() => journeys.find((journey) => journey.id === data.journey) || journeys[0], [data.journey]);
  const progress = ((step + 1) / steps.length) * 100;
  const selectedForm = useMemo(() => COMPANY_FORM_CATALOG.find((form) => form.label === data.legalForm), [data.legalForm]);
  const questionnaire = useMemo(() => getQuestionnaire(selectedForm?.label || data.legalForm, questionMode), [selectedForm?.label, data.legalForm, questionMode]);
  const flattenedQuestions = useMemo(
    () => questionnaire.flatMap((section) => section.fields
      .filter((field) => !field.condition || field.condition(answers))
      .map((field) => ({ ...field, sectionTitle: section.title, sectionNote: section.note }))),
    [questionnaire, answers]
  );
  const activeQuestion = flattenedQuestions[activeQuestionIndex] || null;
  const completion = useMemo(() => getCompletion(data, answers, questionnaire), [data, answers, questionnaire]);
  const warnings = useMemo(() => getWarnings(data, answers), [data, answers]);
  const documentPreview = useMemo(() => buildDocumentPreview(data, answers, selectedForm), [data, answers, selectedForm]);
  const visibleForms = useMemo(
    () => targetFormGroups.find((group) => group.category === selectedFamily).forms || targetFormGroups[0].forms || [],
    [selectedFamily],
  );

  useEffect(() => {
    saveProjectDraft({ data, answers });
  }, [data, answers]);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      wizardTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [step, showOffers]);

  useEffect(() => {
    setActiveQuestionIndex(0);
  }, [questionMode, data.legalForm, data.journey]);

  const update = (key, value) => {
    setData((current) => ({ ...current, [key]: value }));
  };

  const updateAnswer = (key, value) => {
    setAnswers((current) => ({ ...current, [key]: value }));
  };

  const contactFields = [
    { key: 'firstName', label: 'Prenom', type: 'text', placeholder: 'Votre prenom' },
    { key: 'lastName', label: 'Nom', type: 'text', placeholder: 'Votre nom' },
    { key: 'email', label: 'Email', type: 'email', placeholder: 'vous@entreprise.fr' },
    { key: 'phone', label: 'Numero joignable', type: 'tel', placeholder: GREFFIO_CONTACT.supportPhone },
  ];
  const activeContactField = contactFields[contactStep];
  const contactCompletion = Math.round(((contactStep + 1) / contactFields.length) * 100);
  const canContinueContact = () => {
    const value = String(data[activeContactField.key] || '').trim();
    if (!value) return false;
    if (activeContactField.key === 'email') return value.includes('@');
    return true;
  };

  const chooseFamily = (category) => {
    const group = targetFormGroups.find((item) => item.category === category);
    setSelectedFamily(category);
    if (group.forms.length && !group.forms.some((form) => form.label === data.legalForm)) {
      update('legalForm', group.forms[0].label);
    }
  };

  const next = () => {
    if (step === steps.length - 1) {
      setShowOffers(true);
      return;
    }
    setStep((value) => value + 1);
  };

  const previous = () => {
    if (showOffers) {
      setShowOffers(false);
      return;
    }
    setStep((value) => Math.max(0, value - 1));
  };

  const generatedClauses = [
    selectedForm?.hasStatutes
      ?
      `Forme : ${data.legalForm}, statuts préparés selon le droit français.`
      : `Forme : ${data.legalForm}, dossier déclaratif adapté sans statuts sociaux à déposer selon l’organisme compétent.`,
    `Dénomination : ${data.companyName || 'à compléter'}.`,
    `Objet : ${data.activity || 'activité à préciser'} et opérations connexes.`,
    `Siège : ${data.city || 'France'}, avec faculté de transfert selon décision compétente.`,
    `Demandeur : ${data.initiatorType === 'personne_morale' ? `${data.initiatorName || 'société demandeuse'} (${data.initiatorLegalForm})` : data.initiatorName || 'personne physique à compléter'}.`,
    `Capital : ${data.capital || '1'} euros, réparti entre ${data.shareholders || '1'} associé(s) ou actionnaire(s).`,
    `Direction : ${data.president || 'dirigeant à nommer'}.`,
  ];

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

      <main ref={wizardTopRef} className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
        <section className="overflow-hidden rounded-md border border-border bg-white shadow-elevation-lg">
          <div className="border-b border-border bg-muted px-6 py-4">
            <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase text-muted-foreground">
              <span>Simulation Greffio</span>
              <span>{showOffers ? 'Offres' : `${step + 1}/${steps.length}`}</span>
            </div>
            <div className="h-2 rounded-full bg-white">
              <div className="h-2 rounded-full bg-primary transition-all" style={{ width: showOffers ? '100%' : `${progress}%` }} />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!showOffers ? (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 22 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -22 }}
                transition={{ duration: 0.22 }}
                className="p-6 md:p-10"
              >
                {step === 0 && (
                  <div className="space-y-7">
                    <div>
                      <p className="text-sm font-bold uppercase text-primary">Démarche</p>
                      <h1 className="mt-2 text-3xl font-extrabold">Que souhaitez-vous faire </h1>
                      <p className="mt-2 text-muted-foreground">Le questionnaire adapte les pièces, les statuts, les relances et les offres proposées.</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {journeys.map((journey) => (
                        <button
                          type="button"
                          key={journey.id}
                          onClick={() => update('journey', journey.id)}
                          className={`rounded-md border p-5 text-left transition hover:-translate-y-1 hover:shadow-elevation-sm ${data.journey === journey.id ? 'border-primary bg-secondary' : 'border-border bg-white'}`}
                        >
                          <span className={`mb-4 flex h-11 w-11 items-center justify-center rounded-md ${journey.color}`}>
                            <journey.icon className="h-5 w-5 text-primary" />
                          </span>
                          <span className="block text-lg font-extrabold">{journey.title}</span>
                          <span className="mt-2 block text-sm leading-6 text-muted-foreground">{journey.pitch}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-7">
                    <div>
                      <p className="text-sm font-bold uppercase text-primary">Projet</p>
                      <h1 className="mt-2 text-3xl font-extrabold">Décrivez la structure.</h1>
                      <p className="mt-2 text-muted-foreground">Une personne physique ou morale peut porter la demande, y compris une société qui crée une SA.</p>
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-4 md:col-span-2 rounded-md border border-border bg-muted p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold uppercase text-primary">Ref. : {dossierReference}</p>
                            <p className="text-xs text-muted-foreground">{contactCompletion}%</p>
                          </div>
                          <div className="relative h-16 w-16">
                            <svg viewBox="0 0 36 36" className="h-16 w-16">
                              <path className="stroke-white" fill="none" strokeWidth="3" d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31" />
                              <path
                                className="stroke-primary"
                                fill="none"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeDasharray={`${contactCompletion}, 100`}
                                d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31"
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{contactCompletion}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-lg font-extrabold">C est parti ! Qui effectue la demarche sur Greffio ?</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Ces informations nous permettent de vous assister pendant toute la creation et seront necessaires pour votre dossier.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>{activeContactField.label}</Label>
                          <Input
                            type={activeContactField.type}
                            value={data[activeContactField.key]}
                            onChange={(event) => update(activeContactField.key, event.target.value)}
                            placeholder={activeContactField.placeholder}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Button
                            type="button"
                            variant="outline"
                            className="bg-white"
                            disabled={contactStep === 0}
                            onClick={() => setContactStep((value) => Math.max(0, value - 1))}
                          >
                            Retour
                          </Button>
                          <Button
                            type="button"
                            disabled={contactStep >= contactFields.length - 1 || !canContinueContact()}
                            onClick={() => setContactStep((value) => Math.min(contactFields.length - 1, value + 1))}
                          >
                            Continuer
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Vos donnees sont en securite et transmises uniquement a l administration francaise pour enregistrer votre entreprise.
                        </p>
                        {contactStep >= contactFields.length - 1 && (
                          <p className="text-xs font-semibold text-primary">
                            Coordonnees completes. Vous pouvez continuer vers la suite du questionnaire.
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Qui effectue la démarche </Label>
                        <select className={fieldClass} value={data.initiatorType} onChange={(event) => update('initiatorType', event.target.value)}>
                          <option value="personne_physique">Personne physique</option>
                          <option value="personne_morale">Personne morale</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>{data.initiatorType === 'personne_morale' ? 'Nom de la société demandeuse' : 'Nom du fondateur'}</Label>
                        <Input value={data.initiatorName} onChange={(event) => update('initiatorName', event.target.value)} />
                      </div>
                      {data.initiatorType === 'personne_morale' && (
                        <div className="space-y-2">
                          <Label>Forme de la société demandeuse</Label>
                          <select className={fieldClass} value={data.initiatorLegalForm} onChange={(event) => update('initiatorLegalForm', event.target.value)}>
                            {['SA', 'SAS', 'SASU', 'SARL', 'EURL', 'SCI', 'Association', 'Autre personne morale'].map((item) => (
                              <option key={item} value={item}>{item}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="space-y-3 md:col-span-2">
                        <Label>Forme juridique visée</Label>
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          {targetFormGroups.map((group) => (
                            <motion.button
                              type="button"
                              key={group.category}
                              whileHover={{ y: -2 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => chooseFamily(group.category)}
                              className={`rounded-md border p-3 text-left transition ${selectedFamily === group.category ? 'border-primary bg-secondary shadow-elevation-sm' : 'border-border bg-white hover:border-primary/40'}`}
                            >
                              <span className="block text-sm font-extrabold">{group.category}</span>
                              <span className="mt-1 block text-xs text-muted-foreground">{group.forms.length} formes disponibles</span>
                            </motion.button>
                          ))}
                        </div>

                        <AnimatePresence mode="wait">
                          <motion.div
                            key={selectedFamily}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                            className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
                          >
                            {visibleForms.map((form) => (
                              <motion.button
                                type="button"
                                key={form.key}
                                layout
                                onClick={() => update('legalForm', form.label)}
                                className={`rounded-md border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-elevation-sm ${data.legalForm === form.label ? 'border-primary bg-[hsl(var(--greffio-citron))]' : 'border-border bg-white'}`}
                              >
                                <span className="flex items-start justify-between gap-2">
                                  <strong className="text-base">{form.label}</strong>
                                  <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold uppercase text-primary">
                                    {form.hasStatutes ? 'Statuts' : 'Dossier'}
                                  </span>
                                </span>
                                <span className="mt-2 block text-xs leading-5 text-muted-foreground">{form.description}</span>
                              </motion.button>
                            ))}
                          </motion.div>
                        </AnimatePresence>
                      </div>
                      <div className="space-y-2">
                        <Label>Délai souhaité</Label>
                        <select className={fieldClass} value={data.urgency} onChange={(event) => update('urgency', event.target.value)}>
                          {['Aujourd’hui', 'Cette semaine', 'Ce mois-ci', 'Je compare encore'].map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Nom envisagé</Label>
                        <Input value={data.companyName} onChange={(event) => update('companyName', event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Ville du siège</Label>
                        <Input value={data.city} onChange={(event) => update('city', event.target.value)} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Activité principale</Label>
                        <Input value={data.activity} onChange={(event) => update('activity', event.target.value)} />
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-7">
                    <div>
                      <p className="text-sm font-bold uppercase text-primary">Dirigeants et capital</p>
                      <h1 className="mt-2 text-3xl font-extrabold">Les informations utiles aux statuts.</h1>
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Président, dirigeant ou PDG</Label>
                        <Input value={data.president} onChange={(event) => update('president', event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Nombre d’associés/actionnaires</Label>
                        <Input type="number" min="1" value={data.shareholders} onChange={(event) => update('shareholders', event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Capital social en euros</Label>
                        <Input type="number" min="1" value={data.capital} onChange={(event) => update('capital', event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Email de réception</Label>
                        <Input type="email" value={data.email} onChange={(event) => update('email', event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Numero joignable</Label>
                        <Input type="tel" value={data.phone} onChange={(event) => update('phone', event.target.value)} placeholder={GREFFIO_CONTACT.supportPhone} />
                      </div>
                    </div>
                    <div className="rounded-md border border-border bg-white p-5">
                      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                        <div>
                          <p className="text-sm font-bold uppercase text-primary">Questionnaire intelligent</p>
                          <h2 className="mt-1 text-2xl font-extrabold">Clauses et informations adaptées à {data.legalForm}</h2>
                          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                            Greffio affiche uniquement les questions utiles à la forme choisie : capital, associés, gouvernance, clauses sensibles, greffe et fin de vie.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {QUESTION_MODES.map((mode) => (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => setQuestionMode(mode.id)}
                              className={`rounded-md border px-3 py-2 text-sm font-bold transition ${questionMode === mode.id ? 'border-primary bg-primary text-white' : 'border-border bg-muted text-primary hover:border-primary/50'}`}
                            >
                              {mode.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
                        <div className="rounded-md border border-border bg-secondary p-4">
                          <div className="flex items-center justify-between gap-3 text-sm font-bold">
                            <span>Complétude du dossier</span>
                            <span>{completion}%</span>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${completion}%` }} />
                          </div>
                          <p className="mt-3 text-xs leading-5 text-muted-foreground">
                            Plus le score est élevé, plus le document généré sera précis et prêt à relire par l’équipe Greffio.
                          </p>
                        </div>
                        <div className="rounded-md border border-border bg-muted p-4">
                          <div className="mb-2 flex items-center gap-2 font-bold">
                            <ShieldAlert className="h-4 w-4 text-primary" />
                            Contrôles automatiques
                          </div>
                          <div className="space-y-2 text-sm leading-5 text-muted-foreground">
                            {warnings.map((warning) => (
                              <p key={warning}>{warning}</p>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-md border border-border bg-white p-5">
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="relative h-16 w-16">
                              <svg viewBox="0 0 36 36" className="h-16 w-16">
                                <path className="stroke-muted" fill="none" strokeWidth="3" d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31" />
                                <path
                                  className="stroke-primary"
                                  fill="none"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeDasharray={`${completion}, 100`}
                                  d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31"
                                />
                              </svg>
                              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{completion}%</span>
                            </div>
                            <div>
                              <p className="text-sm font-bold uppercase text-primary">Réf. : {dossierReference}</p>
                              <p className="text-xs text-muted-foreground">{activeQuestionIndex + 1}/{Math.max(flattenedQuestions.length, 1)} question(s)</p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">Vos données sont en sécurité et transmises uniquement pour votre formalité.</p>
                        </div>

                        {activeQuestion ? (
                          <div className="space-y-4">
                            <div className="rounded-md bg-muted p-4">
                              <div className="flex gap-3">
                                <Info className="mt-1 h-4 w-4 shrink-0 text-primary" />
                                <div>
                                  <p className="text-xs font-bold uppercase text-primary">{activeQuestion.sectionTitle}</p>
                                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{activeQuestion.sectionNote}</p>
                                </div>
                              </div>
                            </div>
                            <div>
                              <Label>
                                {activeQuestion.label}
                                {activeQuestion.required ? <span className="text-primary"> *</span> : null}
                              </Label>
                              {activeQuestion.type === 'select' ? (
                                <select className={`${fieldClass} mt-1 w-full`} value={answers[activeQuestion.key] || ''} onChange={(event) => updateAnswer(activeQuestion.key, event.target.value)}>
                                  <option value="">À compléter</option>
                                  {activeQuestion.options.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                  ))}
                                </select>
                              ) : activeQuestion.type === 'textarea' ? (
                                <textarea
                                  className={`${fieldClass} mt-1 min-h-[110px] w-full`}
                                  value={answers[activeQuestion.key] || ''}
                                  placeholder={activeQuestion.placeholder || ''}
                                  onChange={(event) => updateAnswer(activeQuestion.key, event.target.value)}
                                />
                              ) : (
                                <Input
                                  className="mt-1"
                                  value={answers[activeQuestion.key] || ''}
                                  placeholder={activeQuestion.placeholder || ''}
                                  onChange={(event) => updateAnswer(activeQuestion.key, event.target.value)}
                                />
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <Button
                                type="button"
                                variant="outline"
                                className="bg-white"
                                disabled={activeQuestionIndex === 0}
                                onClick={() => setActiveQuestionIndex((current) => Math.max(0, current - 1))}
                              >
                                <ArrowLeft className="h-4 w-4" />
                                Retour
                              </Button>
                              <Button
                                type="button"
                                disabled={activeQuestionIndex >= flattenedQuestions.length - 1}
                                onClick={() => setActiveQuestionIndex((current) => Math.min(flattenedQuestions.length - 1, current + 1))}
                              >
                                Continuer
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Numéro joignable : {GREFFIO_CONTACT.supportPhone}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Aucune question affichable avec cette configuration.</p>
                        )}
                      </div>
                    </div>
                    <label className="flex items-start gap-3 rounded-md border border-border bg-muted p-4">
                      <input type="checkbox" checked={data.marketingConsent} onChange={(event) => update('marketingConsent', event.target.checked)} className="mt-1" />
                      <span className="text-sm leading-6 text-muted-foreground">
                        J’accepte de recevoir par email mon résumé, mes statuts générés et les relances liées à ma formalité.
                      </span>
                    </label>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-7">
                    <div>
                      <p className="text-sm font-bold uppercase text-primary">Synthèse</p>
                      <h1 className="mt-2 text-3xl font-extrabold">Greffio a préparé votre projet.</h1>
                      <p className="mt-2 text-muted-foreground">La version finale sera disponible dans votre espace avec les champs dynamiques complétés.</p>
                    </div>
                    <div className="rounded-md border border-border bg-muted p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <p className="font-extrabold">Aperçu des statuts générés</p>
                      </div>
                      <div className="space-y-3">
                        {generatedClauses.map((clause) => (
                          <div key={clause} className="flex gap-3 rounded-md bg-white p-3 text-sm">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                            <span>{clause}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-md border border-border bg-white p-5">
                      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                        <div>
                          <p className="text-sm font-bold uppercase text-primary">Document Greffio</p>
                          <h2 className="mt-1 text-xl font-extrabold">{documentPreview.title}</h2>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {['pdf', 'odt', 'docx'].map((format) => (
                            <Button key={format} type="button" variant="outline" className="bg-white" onClick={() => void downloadPreview(documentPreview, format)}>
                              <Download className="h-4 w-4" />
                              {format.toUpperCase()}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-5 rounded-md border border-border bg-muted p-4">
                        <div className="mb-4 flex items-center gap-3">
                          <FileText className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-extrabold">{documentPreview.subtitle}</p>
                            <p className="text-xs text-muted-foreground">Document structuré et prêt à compléter dans l’espace sécurisé.</p>
                          </div>
                        </div>
                        <div className="max-h-72 space-y-3 overflow-auto pr-2">
                          {documentPreview.sections.map((section, index) => (
                            <section key={section.title} className="rounded-md bg-white p-4">
                              <h3 className="font-extrabold">{index + 1}. {section.title}</h3>
                              <div className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">
                                {section.lines.map((line) => (
                                  <p key={line}>{line}</p>
                                ))}
                              </div>
                            </section>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="offers" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -22 }} transition={{ duration: 0.24 }} className="p-6 md:p-10">
                <div className="mb-8">
                  <p className="text-sm font-bold uppercase text-primary">Offres recommandées</p>
                  <h1 className="mt-2 text-3xl font-extrabold">Choisissez la suite de votre démarche.</h1>
                  <p className="mt-2 text-muted-foreground">La génération gratuite reste disponible. Les offres payantes ajoutent la vérification, l’équipe et le dépôt.</p>
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  {offers.map((offer) => (
                    <div key={offer.name} className={`rounded-md border p-5 ${offer.highlighted ? 'border-primary bg-secondary shadow-elevation-md' : 'border-border bg-white'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="text-lg font-extrabold">{offer.name}</h2>
                        <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-primary">{offer.badge}</span>
                      </div>
                      <p className="mt-3 text-3xl font-extrabold">{offer.price}</p>
                      <p className="mt-3 min-h-[72px] text-sm leading-6 text-muted-foreground">{offer.description}</p>
                      <div className="mt-5 space-y-2">
                        {offer.features.map((feature) => (
                          <div key={feature} className="flex items-center gap-2 text-sm">
                            <BadgeCheck className="h-4 w-4 text-emerald-600" />
                            {feature}
                          </div>
                        ))}
                      </div>
                      <Button asChild className="mt-6 w-full" variant={offer.highlighted ? 'default' : 'outline'}>
                        <Link to={offer.price === '0€' ? `/signup?service=${data.journey}` : `/paiement?offer=${encodeURIComponent(offer.name)}&service=${data.journey}`}>
                          Choisir
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between border-t border-border px-6 py-5">
            <Button variant="outline" className="bg-white" onClick={previous} disabled={step === 0 && !showOffers}>
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            {!showOffers && (
              <Button onClick={next}>
                {step === steps.length - 1 ? 'Voir les offres' : 'Continuer'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-md ${selectedJourney.color}`}>
              <selectedJourney.icon className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-extrabold">{selectedJourney.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedJourney.pitch}</p>
          </div>

          <div className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
            <h3 className="font-extrabold">Ce que Greffio prépare</h3>
            <div className="mt-4 space-y-3 text-sm">
              {['Projet de statuts', 'Liste des pièces', 'Estimation frais légaux', 'Email récapitulatif', 'Dossier dashboard'].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md bg-[hsl(var(--greffio-blue))] p-5 text-white shadow-elevation-md">
            <Mail className="mb-4 h-6 w-6 text-[hsl(var(--greffio-citron))]" />
            <p className="font-extrabold">Offre gratuite utile</p>
            <p className="mt-2 text-sm leading-6 text-white/78">Les statuts générés gratuitement permettent à Greffio de vous envoyer votre résumé, vos relances et les offres adaptées à votre situation.</p>
          </div>
        </aside>
      </main>
    </div>
  );
};

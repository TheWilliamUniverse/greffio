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
import { NavbarDropdown } from '@/components/NavbarDropdown.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { ProgressiveStepChips } from '@/components/ProgressiveStepChips.jsx';
import { QuestionPanelSuccessOverlay } from '@/components/questionnaire/QuestionPanelSuccessOverlay.jsx';
import { WizardNavButtons } from '@/components/WizardNavButtons.jsx';
import { CompanyLookupCard } from '@/components/CompanyLookupCard.jsx';
import { COMPANY_FORM_CATALOG, getFormAvailability, SERVICE_AVAILABILITY } from '@/config/businessCatalog.js';
import {
  QUESTION_MODES,
  buildDocumentPreview,
  downloadPreview,
  getCompletion,
  getQuestionnaire,
  getWarnings,
} from '@/utils/formalityEngine.js';
import { getProjectDraft, saveProjectDraft, getUser } from '@/utils/localStorage.js';
import { GREFFIO_CONTACT } from '@/config/legalFlow.js';
import { getFormalityRule, isEiLikeFormality } from '@/config/formalities.js';
import { lookupCompanyBySiren } from '@/api/company.js';
import { useAuth } from '@/hooks/useAuth.js';
import {
  contactDetailsFromUser,
  hasCompleteUserContact,
  isContactDetailValid,
} from '@/utils/userProfile.js';

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
    name: 'Dossier gratuit',
    price: '0€',
    badge: 'Offre d’appel',
    description: 'Questionnaire guidé, checklist des pièces et envoi du résumé par email.',
    features: ['Questionnaire guidé', 'Checklist greffe', 'Emails de suivi'],
  },
  {
    name: 'Dossier Standard',
    price: '99€ HT',
    badge: 'Autonome',
    description: 'Documents générés, vérification de cohérence et tableau de bord de dépôt.',
    features: ['Formulaires et pièces', 'Contrôle documentaire', 'Dossier partagé', 'Support email'],
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

const MANUAL_QUOTE_LOCK_COPY = {
  title: 'Accompagnement sur devis',
  description: "Cette formalité nécessite une qualification manuelle avant engagement. L'équipe Greffio vous recontacte avec un périmètre, un calendrier et un devis adapté.",
  cta: "Demander un devis",
};

const FORMS_WITHOUT_STATUTES = new Set([
  'MICRO-ENTREPRISE',
  'AUTO-ENTREPRENEUR',
  'ENTREPRISE INDIVIDUELLE (EI)',
  'EI',
  'EXPLOITATION AGRICOLE INDIVIDUELLE',
]);

const steps = ['Démarche', 'Projet', 'Dirigeants', 'Synthèse'];
const PROGRESSIVE_WIZARD_STEPS = steps.map((label, index) => ({ id: String(index), label }));
const PROJECT_SUB_STEPS = [
  { id: 'contact', label: 'Coordonnées' },
  { id: 'initiator', label: 'Demandeur' },
  { id: 'form_family', label: 'Famille juridique' },
  { id: 'form_choice', label: 'Forme' },
  { id: 'project_details', label: 'Projet' },
];
const contactFields = [
  { key: 'firstName', label: 'Prenom', type: 'text', placeholder: 'Votre prenom' },
  { key: 'lastName', label: 'Nom', type: 'text', placeholder: 'Votre nom' },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'vous@entreprise.fr' },
  { key: 'phone', label: 'Numero joignable', type: 'tel', placeholder: GREFFIO_CONTACT.supportPhone },
];
const targetFormGroups = COMPANY_FORM_CATALOG.reduce((groups, form) => {
  const group = groups.find((item) => item.category === form.family);
  if (group) {
    group.forms.push(form);
    return groups;
  }
  return [...groups, { category: form.family, forms: [form] }];
}, []);
const fieldClass = 'rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring';

const typePresetByQuery = Object.freeze({
  statuts: 'statuts',
  charges: 'creation',
  acre: 'creation',
  nom: 'creation',
  mentions: 'creation',
  creation: 'creation',
  modification: 'modification',
  dissolution: 'dissolution',
});

const DIRECT_JOURNEY_TYPES = new Set(['creation', 'modification', 'dissolution']);

const compareModules = Object.freeze({
  charges: {
    title: 'Comparateur de charges',
    description: 'Estimation rapide des charges selon votre profil de dirigeant et votre forme.',
    bullets: [
      'Assimilé salarié (SAS/SASU) : charges plus élevées, protection sociale plus complète.',
      'TNS (SARL/EURL) : charges souvent plus basses, couverture différente.',
      'Micro-entreprise : calcul simplifié, plafonds spécifiques.',
    ],
    cta: '/questionnaire',
    ctaLabel: 'Passer au dossier réel',
  },
  acre: {
    title: "Comparateur d'éligibilité ACRE",
    description: "Pré-vérification des critères de base avant constitution d'un dossier complet.",
    bullets: [
      "Situation du demandeur d'emploi et création/reprise.",
      "Historique d'aides déjà perçues.",
      "Calendrier conseillé pour déposer la demande.",
    ],
    cta: '/questionnaire',
    ctaLabel: 'Démarrer mon questionnaire',
  },
  nom: {
    title: 'Comparateur disponibilité du nom',
    description: 'Checklist de contrôle avant dépôt (raison sociale, marque, domaine web).',
    bullets: [
      'Vérifier confusion avec sociétés existantes.',
      'Vérifier la marque et la disponibilité de domaine.',
      'Préparer 2 à 3 variantes de dénomination.',
    ],
    cta: '/questionnaire',
    ctaLabel: 'Créer le dossier avec ce nom',
  },
  mentions: {
    title: 'Comparateur mentions légales',
    description: 'Repères pour préparer vos pages légales avant mise en ligne.',
    bullets: [
      "Mentions légales (éditeur, hébergeur, contact).",
      'CGU/CGV selon votre modèle de service.',
      'Politique de confidentialité et suppression des données.',
    ],
    cta: '/guide',
    ctaLabel: 'Voir le guide conformité',
  },
});

export const FormalityWizardPage = () => {
  const [searchParams] = useSearchParams();
  const { currentUser, isAuthenticated } = useAuth();
  const wizardTopRef = useRef(null);
  const draft = getProjectDraft();
  const requestedType = String(searchParams.get('type') || 'statuts').toLowerCase();
  const initialJourney = typePresetByQuery[requestedType] || 'statuts';
  const accountContact = contactDetailsFromUser(getUser());
  const skipJourneyPicker = DIRECT_JOURNEY_TYPES.has(requestedType) && !compareModules[requestedType];
  const initialSkipContact = hasCompleteUserContact(getUser());
  const [step, setStep] = useState(skipJourneyPicker ? 1 : 0);
  const [projectSubStep, setProjectSubStep] = useState(skipJourneyPicker && initialSkipContact ? 1 : 0);
  const [showOffers, setShowOffers] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState('Formes les plus courantes');
  const [questionMode, setQuestionMode] = useState('avance');
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [questionExitPhase, setQuestionExitPhase] = useState(null);
  const [questionnaireFinished, setQuestionnaireFinished] = useState(false);
  const [contactStep, setContactStep] = useState(0);
  const [existingCompanyIdentifier, setExistingCompanyIdentifier] = useState('');
  const [existingCompanyState, setExistingCompanyState] = useState('idle');
  const [existingCompanyError, setExistingCompanyError] = useState('');
  const [existingCompany, setExistingCompany] = useState(null);
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
    initiatorName: draft?.data?.initiatorName || (accountContact?.firstName
      ? `${accountContact.firstName} ${accountContact.lastName || ''}`.trim()
      : ''),
    initiatorLegalForm: draft?.data?.initiatorLegalForm || 'SA',
    legalForm: draft?.data?.legalForm || 'SAS',
    urgency: draft?.data?.urgency || 'Cette semaine',
    companyName: draft?.data?.companyName || '',
    activity: draft?.data?.activity || '',
    city: draft?.data?.city || '',
    firstName: accountContact?.firstName || draft?.data?.firstName || '',
    lastName: accountContact?.lastName || draft?.data?.lastName || '',
    capital: draft?.data?.capital || '',
    shareholders: draft?.data?.shareholders || '1',
    president: draft?.data?.president || '',
    email: accountContact?.email || draft?.data?.email || '',
    phone: accountContact?.phone || draft?.data?.phone || '',
    marketingConsent: true,
  });

  const selectedJourney = useMemo(() => journeys.find((journey) => journey.id === data.journey) || journeys[0], [data.journey]);
  const skipContactStep = useMemo(
    () => isAuthenticated && hasCompleteUserContact(currentUser),
    [isAuthenticated, currentUser],
  );
  const visibleProjectSubSteps = useMemo(
    () => (skipContactStep ? PROJECT_SUB_STEPS.filter((item) => item.id !== 'contact') : PROJECT_SUB_STEPS),
    [skipContactStep],
  );
  const activeProjectSubIndex = skipContactStep ? Math.max(0, projectSubStep - 1) : projectSubStep;
  const activeCompareModule = compareModules[requestedType] || null;
  const selectedLegalFormUpper = String(data.legalForm || '').toUpperCase();
  const selectedRule = useMemo(() => getFormalityRule({ legalForm: data.legalForm }), [data.legalForm]);
  const eiLike = useMemo(() => isEiLikeFormality({ legalForm: data.legalForm }), [data.legalForm]);
  const requiresStatutes = selectedRule.requiresStatutes && !FORMS_WITHOUT_STATUTES.has(selectedLegalFormUpper);
  const progress = ((step + 1) / steps.length) * 100;
  const selectedForm = useMemo(() => COMPANY_FORM_CATALOG.find((form) => form.label === data.legalForm), [data.legalForm]);
  const selectedFormAvailability = useMemo(
    () => (selectedForm ? getFormAvailability(selectedForm.key) : SERVICE_AVAILABILITY.AVAILABLE_NOW),
    [selectedForm],
  );
  const questionnaire = useMemo(() => getQuestionnaire(selectedForm?.label || data.legalForm, questionMode), [selectedForm?.label, data.legalForm, questionMode]);
  const flattenedQuestions = useMemo(
    () => questionnaire.flatMap((section) => section.fields
      .filter((field) => !field.condition || field.condition(answers))
      .map((field) => ({ ...field, sectionTitle: section.title, sectionNote: section.note }))),
    [questionnaire, answers]
  );
  const activeQuestion = flattenedQuestions[activeQuestionIndex] || null;
  const isLastQuestion = Boolean(
    activeQuestion && flattenedQuestions.length > 0 && activeQuestionIndex === flattenedQuestions.length - 1,
  );
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
    if (!currentUser) return;
    const contact = contactDetailsFromUser(currentUser);
    if (!contact) return;
    setData((current) => {
      const next = { ...current };
      let changed = false;
      for (const key of ['firstName', 'lastName', 'email', 'phone']) {
        if (contact[key] && current[key] !== contact[key]) {
          next[key] = contact[key];
          changed = true;
        }
      }
      const initiatorName = `${next.firstName || ''} ${next.lastName || ''}`.trim();
      if (initiatorName && !next.initiatorName) {
        next.initiatorName = initiatorName;
        changed = true;
      }
      return changed ? next : current;
    });
  }, [currentUser]);

  useEffect(() => {
    if (!skipContactStep || step !== 1 || projectSubStep !== 0) return;
    setProjectSubStep(1);
  }, [skipContactStep, step, projectSubStep]);

  useEffect(() => {
    if (skipContactStep || !currentUser) return;
    const firstIncomplete = contactFields.findIndex((field) => !isContactDetailValid(field.key, data[field.key]));
    if (firstIncomplete > 0) {
      setContactStep(firstIncomplete);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, skipContactStep]);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      wizardTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [step, projectSubStep, contactStep, showOffers]);

  useEffect(() => {
    setActiveQuestionIndex(0);
    setQuestionExitPhase(null);
    setQuestionnaireFinished(false);
  }, [questionMode, data.legalForm, data.journey]);

  useEffect(() => {
    if (questionExitPhase !== 'closing') return undefined;
    const validatedTimer = window.setTimeout(() => setQuestionExitPhase('validated'), 520);
    const doneTimer = window.setTimeout(() => {
      setQuestionExitPhase('done');
      setQuestionnaireFinished(true);
    }, 1450);
    return () => {
      window.clearTimeout(validatedTimer);
      window.clearTimeout(doneTimer);
    };
  }, [questionExitPhase]);

  const update = (key, value) => {
    setData((current) => ({ ...current, [key]: value }));
  };

  const updateAnswer = (key, value) => {
    setAnswers((current) => ({ ...current, [key]: value }));
  };

  const activeContactField = contactFields[contactStep];
  const contactCompletion = Math.round(((contactStep + 1) / contactFields.length) * 100);
  const canContinueContact = () => {
    const value = String(data[activeContactField.key] || '').trim();
    if (!value) return false;
    if (activeContactField.key === 'email') return value.includes('@');
    return true;
  };

  const canAdvanceActiveQuestion = () => {
    if (!activeQuestion) return false;
    if (!activeQuestion.required) return true;
    return Boolean(String(answers[activeQuestion.key] || '').trim());
  };

  const advanceActiveQuestion = () => {
    if (!canAdvanceActiveQuestion()) return;
    if (isLastQuestion) {
      completeLastQuestion();
      return;
    }
    setActiveQuestionIndex((current) => Math.min(flattenedQuestions.length - 1, current + 1));
  };

  const completeLastQuestion = () => {
    if (!canAdvanceActiveQuestion() || !isLastQuestion || questionExitPhase) return;
    setQuestionExitPhase('closing');
  };

  const tryWizardContinue = () => {
    if (showOffers) return;
    if (step === 2 && activeQuestion && isLastQuestion && canAdvanceActiveQuestion() && !questionnaireFinished) {
      completeLastQuestion();
      return;
    }
    if (step === 2 && activeQuestion && !questionnaireFinished) {
      advanceActiveQuestion();
      return;
    }
    if (step === 1 && !canContinueProjectSubStep()) return;
    next();
  };

  const handleWizardKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
    const tagName = String(event.target?.tagName || '').toUpperCase();
    if (tagName === 'TEXTAREA' || tagName === 'BUTTON' || tagName === 'SELECT') return;
    event.preventDefault();
    tryWizardContinue();
  };

  const chooseFamily = (category) => {
    const group = targetFormGroups.find((item) => item.category === category);
    setSelectedFamily(category);
    if (group.forms.length && !group.forms.some((form) => form.label === data.legalForm)) {
      update('legalForm', group.forms[0].label);
    }
    setProjectSubStep(3);
  };

  const chooseLegalForm = (label) => {
    update('legalForm', label);
    setProjectSubStep(4);
  };

  const canContinueProjectSubStep = () => {
    if (projectSubStep === 0) {
      if (skipContactStep) return true;
      return canContinueContact();
    }
    if (projectSubStep === 1) return Boolean(String(data.initiatorName || '').trim());
    if (projectSubStep === 2) return Boolean(selectedFamily);
    if (projectSubStep === 3) return Boolean(data.legalForm);
    return Boolean(String(data.companyName || '').trim() && String(data.city || '').trim());
  };

  const advanceProjectFlow = () => {
    if (projectSubStep === 0) {
      if (skipContactStep) {
        setProjectSubStep(1);
        return;
      }
      if (contactStep < contactFields.length - 1) {
        setContactStep((value) => value + 1);
        return;
      }
    }
    if (projectSubStep < PROJECT_SUB_STEPS.length - 1) {
      setProjectSubStep((value) => value + 1);
      return;
    }
    setStep(2);
  };

  const retreatProjectFlow = () => {
    if (projectSubStep === 0 && contactStep > 0) {
      setContactStep((value) => value - 1);
      return;
    }
    if (projectSubStep > (skipContactStep ? 1 : 0)) {
      setProjectSubStep((value) => value - 1);
      return;
    }
    setStep(0);
  };

  const next = () => {
    if (step === 0) {
      setProjectSubStep(skipContactStep ? 1 : 0);
      setContactStep(0);
      setStep(1);
      return;
    }
    if (step === 1) {
      advanceProjectFlow();
      return;
    }
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
    if (step === 1) {
      retreatProjectFlow();
      return;
    }
    if (step === 2) {
      setStep(1);
      setProjectSubStep(PROJECT_SUB_STEPS.length - 1);
      return;
    }
    setStep((value) => Math.max(0, value - 1));
  };

  const isProjectBackDisabled = step === 1 && projectSubStep === (skipContactStep ? 1 : 0) && contactStep === 0;

  const detectJourneyFromCompany = (company) => {
    if (!company) return 'modification';
    const label = String(company.administrativeStatus || '').toUpperCase();
    if (label.includes('CESSEE') || label.includes('RADI')) return 'dissolution';
    return 'modification';
  };

  const lookupExistingCompany = async () => {
    const digits = String(existingCompanyIdentifier || '').replace(/\D/g, '');
    if (digits.length !== 9 && digits.length !== 14) {
      setExistingCompanyError('Saisissez un SIREN (9) ou SIRET (14).');
      return;
    }
    try {
      setExistingCompanyState('loading');
      setExistingCompanyError('');
      const payload = await lookupCompanyBySiren(digits);
      const company = payload?.company || null;
      setExistingCompany(company);
      if (company) {
        const nextJourney = detectJourneyFromCompany(company);
        update('journey', nextJourney);
        update('companyName', company.denomination || data.companyName);
        update('city', company.city || data.city);
        update('activity', company.apeCode || data.activity);
      }
      setExistingCompanyState('done');
    } catch (_error) {
      setExistingCompany(null);
      setExistingCompanyState('error');
      setExistingCompanyError("Entreprise introuvable avec cet identifiant.");
    }
  };

  const generatedClauses = [
    (selectedForm?.hasStatutes && requiresStatutes)
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
    <div className="min-h-screen bg-[var(--we-bg)]">
      <NavbarDropdown />

      <main ref={wizardTopRef} className="mx-auto grid max-w-7xl gap-8 px-4 pb-10 pt-28 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
        <section className="we-panel overflow-hidden">
          <div className="border-b border-[var(--we-border)] bg-white px-6 py-4">
            <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase text-muted-foreground">
              <span>Simulation Greffio</span>
              <span>{showOffers ? 'Offres' : `${step + 1}/${steps.length}`}</span>
            </div>
            <div className="h-2 rounded-full bg-white">
              <div className="h-2 rounded-full bg-primary transition-all" style={{ width: showOffers ? '100%' : `${progress}%` }} />
            </div>
            {!showOffers ? (
              <div className="mt-4 space-y-3">
                <ProgressiveStepChips steps={PROGRESSIVE_WIZARD_STEPS} activeIndex={step} />
                {step === 1 ? (
                  <ProgressiveStepChips steps={visibleProjectSubSteps} activeIndex={activeProjectSubIndex} />
                ) : null}
              </div>
            ) : null}
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
                onKeyDown={handleWizardKeyDown}
              >
                {step === 0 && (
                  <div className="space-y-7">
                    {activeCompareModule ? (
                      <div className="rounded-md border border-primary/20 bg-secondary p-5">
                        <p className="text-sm font-bold uppercase text-primary">Module comparateur</p>
                        <h2 className="mt-1 text-2xl font-extrabold">{activeCompareModule.title}</h2>
                        <p className="mt-2 text-sm text-muted-foreground">{activeCompareModule.description}</p>
                        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                          {activeCompareModule.bullets.map((item) => (
                            <li key={item} className="flex items-start gap-2">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                        <Button asChild className="mt-4">
                          <Link to={activeCompareModule.cta}>
                            {activeCompareModule.ctaLabel}
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    ) : null}
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
                          className={`we-card rounded-[22px] p-5 text-left ${data.journey === journey.id ? 'border-primary ring-2 ring-primary/20' : ''}`}
                        >
                          <span className={`mb-4 flex h-11 w-11 items-center justify-center rounded-md ${journey.color}`}>
                            <journey.icon className="h-5 w-5 text-primary" />
                          </span>
                          <span className="block text-lg font-extrabold">{journey.title}</span>
                          <span className="mt-2 block text-sm leading-6 text-muted-foreground">{journey.pitch}</span>
                        </button>
                      ))}
                    </div>
                    {data.journey !== 'creation' ? (
                      <div className="rounded-md border border-border bg-white p-5">
                        <p className="text-sm font-bold uppercase text-primary">
                          Signature électronique qualifiée nécessaire
                        </p>
                        <h3 className="mt-1 text-xl font-extrabold">Modification, cessation, dépôt d’actes ou correction</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Rechercher une entreprise par SIREN ou SIRET pour précharger le dossier.
                        </p>
                        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                          <Input
                            value={existingCompanyIdentifier}
                            onChange={(event) => {
                              setExistingCompanyIdentifier(event.target.value);
                              setExistingCompanyError('');
                              setExistingCompany(null);
                              setExistingCompanyState('idle');
                            }}
                            placeholder="SIREN (9) ou SIRET (14)"
                          />
                          <Button type="button" onClick={() => void lookupExistingCompany()} disabled={existingCompanyState === 'loading'}>
                            {existingCompanyState === 'loading' ? 'Recherche…' : 'Rechercher'}
                          </Button>
                        </div>
                        {existingCompanyError ? <p className="mt-2 text-xs text-red-600">{existingCompanyError}</p> : null}
                        {existingCompany ? (
                          <div className="mt-4">
                            <CompanyLookupCard company={existingCompany} onUse={() => next()} />
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-7">
                    <div>
                      <p className="text-sm font-bold uppercase text-primary">Projet</p>
                      <h1 className="mt-2 text-3xl font-extrabold">
                        {projectSubStep === 0 && 'Vos coordonnées'}
                        {projectSubStep === 1 && 'Qui effectue la démarche ?'}
                        {projectSubStep === 2 && 'Forme juridique visée'}
                        {projectSubStep === 3 && 'Choisissez votre forme'}
                        {projectSubStep === 4 && 'Précisez votre projet'}
                      </h1>
                      <p className="mt-2 text-muted-foreground">
                        {projectSubStep === 0 && 'Une question à la fois — vos coordonnées servent au dossier et aux relances Greffio.'}
                        {projectSubStep === 1 && 'Une personne physique ou morale peut porter la demande, y compris une société qui crée une filiale.'}
                        {projectSubStep === 2 && 'Sélectionnez la catégorie la plus proche de votre situation, puis continuez.'}
                        {projectSubStep === 3 && 'Comparez les formes disponibles dans cette catégorie.'}
                        {projectSubStep === 4 && 'Ces éléments alimentent le questionnaire et l’aperçu documentaire.'}
                      </p>
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`project-${projectSubStep}-${projectSubStep === 0 ? contactStep : 'static'}`}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.22 }}
                        className="min-h-[320px]"
                      >
                        {projectSubStep === 0 && (
                          <div className="rounded-2xl border border-border bg-muted p-6 md:p-8">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-sm font-bold uppercase text-primary">Réf. : {dossierReference}</p>
                                <p className="text-xs text-muted-foreground">
                                  {contactStep + 1}/{contactFields.length} — {contactCompletion}%
                                </p>
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
                            <form
                              className="mt-6 space-y-2"
                              onSubmit={(event) => {
                                event.preventDefault();
                                if (canContinueContact()) tryWizardContinue();
                              }}
                            >
                              <Label>{activeContactField.label}</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type={activeContactField.type}
                                  value={data[activeContactField.key]}
                                  onChange={(event) => update(activeContactField.key, event.target.value)}
                                  placeholder={activeContactField.placeholder}
                                  className="flex-1 rounded-xl"
                                />
                                <Button
                                  type="submit"
                                  disabled={!canContinueContact()}
                                  className="h-11 w-11 shrink-0 rounded-full p-0 sm:hidden"
                                  aria-label="Continuer"
                                >
                                  <ArrowRight className="h-5 w-5" />
                                </Button>
                              </div>
                            </form>
                            <p className="mt-4 text-xs leading-5 text-muted-foreground">
                              Vos données sont en sécurité et transmises uniquement à l’administration française pour enregistrer votre entreprise.
                            </p>
                          </div>
                        )}

                        {projectSubStep === 1 && (
                          <div className="grid gap-5 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Qui effectue la démarche</Label>
                              <select className={`${fieldClass} w-full rounded-xl`} value={data.initiatorType} onChange={(event) => update('initiatorType', event.target.value)}>
                                <option value="personne_physique">Personne physique</option>
                                <option value="personne_morale">Personne morale</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label>{data.initiatorType === 'personne_morale' ? 'Nom de la société demandeuse' : 'Nom du fondateur'}</Label>
                              <Input className="rounded-xl" value={data.initiatorName} onChange={(event) => update('initiatorName', event.target.value)} />
                            </div>
                            {data.initiatorType === 'personne_morale' && (
                              <div className="space-y-2 md:col-span-2">
                                <Label>Forme de la société demandeuse</Label>
                                <select className={`${fieldClass} w-full rounded-xl`} value={data.initiatorLegalForm} onChange={(event) => update('initiatorLegalForm', event.target.value)}>
                                  {['SA', 'SAS', 'SASU', 'SARL', 'EURL', 'SCI', 'Association', 'Autre personne morale'].map((item) => (
                                    <option key={item} value={item}>{item}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        )}

                        {projectSubStep === 2 && (
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {targetFormGroups.map((group) => (
                              <motion.button
                                type="button"
                                key={group.category}
                                whileHover={{ y: -3 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => chooseFamily(group.category)}
                                className={`rounded-2xl border p-4 text-left transition ${selectedFamily === group.category ? 'border-primary bg-secondary shadow-elevation-md' : 'border-border bg-white hover:border-primary/40 hover:shadow-elevation-sm'}`}
                              >
                                <span className="block text-sm font-extrabold">{group.category}</span>
                                <span className="mt-1 block text-xs text-muted-foreground">{group.forms.length} formes disponibles</span>
                              </motion.button>
                            ))}
                          </div>
                        )}

                        {projectSubStep === 3 && (
                          <div className="space-y-4">
                            <p className="rounded-2xl border border-primary/20 bg-secondary px-4 py-3 text-sm font-semibold text-primary">
                              {selectedFamily}
                            </p>
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                              {visibleForms.map((form) => {
                                const availability = getFormAvailability(form.key);
                                const availabilityLabel = availability === SERVICE_AVAILABILITY.AVAILABLE_NOW
                                  ? 'Disponible'
                                  : availability === SERVICE_AVAILABILITY.COMING_SOON
                                    ? 'Bientôt'
                                    : 'Sur devis';
                                return (
                                  <motion.button
                                    type="button"
                                    key={form.key}
                                    whileHover={{ y: -3 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => chooseLegalForm(form.label)}
                                    className={`rounded-2xl border p-4 text-left transition ${data.legalForm === form.label ? 'border-primary bg-[hsl(var(--greffio-citron))] shadow-elevation-md' : 'border-border bg-white hover:border-primary/40 hover:shadow-elevation-sm'}`}
                                  >
                                    <span className="flex items-start justify-between gap-2">
                                      <strong className="text-base">{form.label}</strong>
                                      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold uppercase text-primary">
                                        {availabilityLabel}
                                      </span>
                                    </span>
                                    <span className="mt-2 block text-xs leading-5 text-muted-foreground">{form.description}</span>
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {projectSubStep === 4 && (
                          <div className="grid gap-5 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Délai souhaité</Label>
                              <select className={`${fieldClass} w-full rounded-xl`} value={data.urgency} onChange={(event) => update('urgency', event.target.value)}>
                                {['Aujourd’hui', 'Cette semaine', 'Ce mois-ci', 'Je compare encore'].map((item) => (
                                  <option key={item} value={item}>{item}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label>Nom envisagé</Label>
                              <Input className="rounded-xl" value={data.companyName} onChange={(event) => update('companyName', event.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label>Ville du siège</Label>
                              <Input className="rounded-xl" value={data.city} onChange={(event) => update('city', event.target.value)} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Activité principale</Label>
                              <Input className="rounded-xl" value={data.activity} onChange={(event) => update('activity', event.target.value)} />
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
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

                      <AnimatePresence mode="wait">
                        {!questionnaireFinished ? (
                          <motion.div
                            key="question-panel-active"
                            className="relative mt-5 overflow-hidden rounded-md border border-border bg-white p-5"
                            initial={{ opacity: 1, scale: 1, y: 0 }}
                            animate={
                              questionExitPhase
                                ? {
                                    opacity: questionExitPhase === 'validated' ? 0.35 : 0.72,
                                    scale: questionExitPhase === 'validated' ? 0.94 : 0.97,
                                    y: questionExitPhase === 'validated' ? -10 : -4,
                                  }
                                : { opacity: 1, scale: 1, y: 0 }
                            }
                            exit={{ opacity: 0, scale: 0.95, y: -12 }}
                            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                          >
                            <QuestionPanelSuccessOverlay phase={questionExitPhase} />
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
                              <motion.form
                                className="space-y-4"
                                animate={
                                  questionExitPhase
                                    ? { opacity: questionExitPhase === 'validated' ? 0.15 : 0.55, y: -2 }
                                    : { opacity: 1, y: 0 }
                                }
                                transition={{ duration: 0.45, ease: 'easeOut' }}
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  advanceActiveQuestion();
                                }}
                              >
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
                                    <select
                                      className={`${fieldClass} mt-1 w-full`}
                                      value={answers[activeQuestion.key] || ''}
                                      disabled={Boolean(questionExitPhase)}
                                      onChange={(event) => updateAnswer(activeQuestion.key, event.target.value)}
                                    >
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
                                      disabled={Boolean(questionExitPhase)}
                                      onChange={(event) => updateAnswer(activeQuestion.key, event.target.value)}
                                    />
                                  ) : (
                                    <Input
                                      className="mt-1"
                                      value={answers[activeQuestion.key] || ''}
                                      placeholder={activeQuestion.placeholder || ''}
                                      disabled={Boolean(questionExitPhase)}
                                      onChange={(event) => updateAnswer(activeQuestion.key, event.target.value)}
                                    />
                                  )}
                                </div>
                                <div className="flex items-center justify-between">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="bg-white"
                                    disabled={activeQuestionIndex === 0 || Boolean(questionExitPhase)}
                                    onClick={() => setActiveQuestionIndex((current) => Math.max(0, current - 1))}
                                  >
                                    <ArrowLeft className="h-4 w-4" />
                                    Retour
                                  </Button>
                                  <Button
                                    type="submit"
                                    disabled={!canAdvanceActiveQuestion() || Boolean(questionExitPhase)}
                                  >
                                    {isLastQuestion ? 'Valider' : 'Continuer'}
                                    <ArrowRight className="h-4 w-4" />
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Numéro joignable : {GREFFIO_CONTACT.supportPhone}
                                </p>
                              </motion.form>
                            ) : (
                              <p className="text-sm text-muted-foreground">Aucune question affichable avec cette configuration.</p>
                            )}
                          </motion.div>
                        ) : (
                          <motion.div
                            key="question-panel-complete"
                            className="mt-5 rounded-md border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-secondary/40 p-5 shadow-[0_8px_24px_rgba(16,185,129,0.08)]"
                            initial={{ opacity: 0, y: 14, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                          >
                            <div className="flex items-start gap-3">
                              <motion.span
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm"
                                initial={{ scale: 0.6, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 360, damping: 18, delay: 0.05 }}
                              >
                                <CheckCircle2 className="h-5 w-5" strokeWidth={2.4} />
                              </motion.span>
                              <div>
                                <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">Étape validée</p>
                                <h3 className="mt-1 text-lg font-extrabold text-[hsl(var(--greffio-blue-900))]">
                                  Questionnaire complété
                                </h3>
                                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                  {activeQuestion?.sectionTitle === 'Finances et fin de vie' || answers.affectationResultat
                                    ? 'Le bloc « Finances et fin de vie » est enregistré. Vous pouvez passer à la synthèse Greffio.'
                                    : 'Toutes les questions utiles ont été enregistrées. Vous pouvez passer à la synthèse Greffio.'}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
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
                        <p className="font-extrabold">{requiresStatutes ? 'Aperçu des statuts générés' : 'Aperçu du dossier déclaratif'}</p>
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
                  <p className="mt-2 text-muted-foreground">
                    {eiLike
                      ? "Le parcours EI/micro ne génère pas de statuts. Les offres portent sur la déclaration d'activité, les pièces et le suivi administratif."
                      : 'La génération gratuite reste disponible. Les offres payantes ajoutent la vérification, l’équipe et le dépôt.'}
                  </p>
                </div>
                {selectedFormAvailability === SERVICE_AVAILABILITY.MANUAL_QUOTE && (
                  <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-5">
                    <p className="text-sm font-bold uppercase text-amber-800">Validation humaine requise</p>
                    <h2 className="mt-1 text-xl font-extrabold text-amber-900">{MANUAL_QUOTE_LOCK_COPY.title}</h2>
                    <p className="mt-2 text-sm text-amber-900/80">{MANUAL_QUOTE_LOCK_COPY.description}</p>
                    <Button asChild className="mt-4">
                      <Link to={`/contact?service=${encodeURIComponent(data.journey)}&form=${encodeURIComponent(data.legalForm)}&mode=devis`}>
                        {MANUAL_QUOTE_LOCK_COPY.cta}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                )}

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
                      {selectedFormAvailability === SERVICE_AVAILABILITY.MANUAL_QUOTE ? (
                        <Button asChild className="mt-6 w-full" variant="outline">
                          <Link to={`/contact?service=${encodeURIComponent(data.journey)}&form=${encodeURIComponent(data.legalForm)}&offer=${encodeURIComponent(offer.name)}&mode=devis`}>
                            {MANUAL_QUOTE_LOCK_COPY.cta}
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild className="mt-6 w-full" variant={offer.highlighted ? 'default' : 'outline'}>
                          <Link to={offer.price === '0€' ? `/signup?service=${data.journey}` : `/paiement?offer=${encodeURIComponent(offer.name)}&service=${data.journey}`}>
                            Choisir
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!showOffers ? (
            <div className="border-t border-border px-6 py-5">
              <WizardNavButtons
                onBack={previous}
                onContinue={next}
                backDisabled={step === 0 || isProjectBackDisabled}
                continueDisabled={step === 1 && !canContinueProjectSubStep()}
                showContinue={!(step === 1 && (projectSubStep === 2 || projectSubStep === 3))}
                continueLabel={
                  step === steps.length - 1
                    ? 'Voir les offres'
                    : step === 1 && projectSubStep === 0 && contactStep < contactFields.length - 1
                      ? 'Question suivante'
                      : step === 1 && projectSubStep === PROJECT_SUB_STEPS.length - 1
                        ? 'Passer aux dirigeants'
                        : 'Continuer'
                }
              />
            </div>
          ) : (
            <div className="border-t border-border px-6 py-5">
              <WizardNavButtons onBack={previous} backLabel="Retour à la synthèse" showContinue={false} />
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="we-card rounded-[22px] p-5">
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-md ${selectedJourney.color}`}>
              <selectedJourney.icon className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-extrabold">{selectedJourney.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedJourney.pitch}</p>
          </div>

          <div className="we-card rounded-[22px] p-5">
            <h3 className="font-extrabold">Ce que Greffio prépare</h3>
            <div className="mt-4 space-y-3 text-sm">
              {[
                requiresStatutes ? 'Projet de statuts' : 'Dossier déclaratif adapté',
                'Liste des pièces',
                'Estimation frais légaux',
                'Email récapitulatif',
                'Dossier dashboard',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] bg-[var(--we-blue-dark)] p-5 text-white shadow-[0_24px_70px_rgba(7,10,18,0.35)]">
            <Mail className="mb-4 h-6 w-6 text-[hsl(var(--greffio-citron))]" />
            <p className="font-extrabold">Offre gratuite utile</p>
            <p className="mt-2 text-sm font-medium leading-6 text-white/92">Les statuts générés gratuitement permettent à Greffio de vous envoyer votre résumé, vos relances et les offres adaptées à votre situation.</p>
          </div>
        </aside>
      </main>
    </div>
  );
};

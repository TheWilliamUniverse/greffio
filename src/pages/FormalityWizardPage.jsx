import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  Lock,
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
import { MobileChoiceStep, MobileChoiceTile } from '@/components/questionnaire/MobileChoiceStep.jsx';
import { MobileInputStep } from '@/components/questionnaire/MobileInputStep.jsx';
import { FormalityCategoryBackButton } from '@/components/questionnaire/FormalityCategoryPicker.jsx';
import { LegalFormFamilyPicker } from '@/components/questionnaire/LegalFormFamilyPicker.jsx';
import { QUESTIONNAIRE_FORM_FAMILY_AUTRES, getCatalogFormsForFamily } from '@/lib/questionnaireFormFamilies.js';
import { QuestionPanelSuccessOverlay } from '@/components/questionnaire/QuestionPanelSuccessOverlay.jsx';
import { ProgressCircle } from '@/components/questionnaire/ProgressCircle.jsx';
import { QuestionSectionHint } from '@/components/questionnaire/QuestionSectionHint.jsx';
import { QuestionSelect } from '@/components/questionnaire/QuestionSelect.jsx';
import { WizardNavButtons } from '@/components/WizardNavButtons.jsx';
import { CompanyLookupCard } from '@/components/CompanyLookupCard.jsx';
import { COMPANY_FORM_CATALOG, getFormAvailability, SERVICE_AVAILABILITY } from '@/config/businessCatalog.js';
import {
  QUESTION_MODES,
  buildDocumentPreview,
  downloadPreview,
  getCompletion,
  getFormProfile,
  getQuestionnaire,
  getWarnings,
} from '@/utils/formalityEngine.js';
import { fetchStatutesPreviewDraft } from '@/api/statutes.js';
import { toast } from 'sonner';
import { fullPreviewToDocumentPreview, isWilliamStatutesForm } from '@/utils/statutesPreview.js';
import { getProjectDraft, saveProjectDraft, getUser } from '@/utils/localStorage.js';
import { GREFFIO_CONTACT } from '@/config/legalFlow.js';
import { getFormalityRule, isEiLikeFormality } from '@/config/formalities.js';
import { lookupCompanyBySiren } from '@/api/company.js';
import { useAuth } from '@/hooks/useAuth.js';
import { SecurityChallengeWidget } from '@/components/security/SecurityChallengeWidget.jsx';
import { SeoHead } from '@/components/seo/SeoHead.jsx';
import { SEO_PAGE_META } from '@/config/seoContent.js';
import { useSecurityConfig } from '@/hooks/useSecurityConfig.js';
import {
  contactDetailsFromUser,
  hasCompleteUserContact,
  isContactDetailValid,
} from '@/utils/userProfile.js';
import { resolveSimulatorFormFromQuery } from '@/utils/formalityMapping.js';
import { useMobileKeyboardOffset } from '@/hooks/useMobileKeyboardOffset.js';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';
import { QUESTIONNAIRE_NEW_PATH } from '@/utils/questionnaireNavigation.js';
import { cn } from '@/lib/utils.js';
import { LegalFormComparatorPromoCard } from '@/components/comparator/LegalFormComparatorPromoCard.jsx';

const mobileFieldClass = 'box-border h-12 min-w-0 w-full max-w-full rounded-xl border-2 border-border bg-white px-3.5 text-base font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/12';

const resolveAutoComplete = (key) => ({
  firstName: 'given-name',
  lastName: 'family-name',
  email: 'email',
  phone: 'tel',
  companyName: 'organization',
  city: 'address-level2',
}[key] || 'off');

const resolveInputMode = (key) => ({
  email: 'email',
  phone: 'tel',
  capital: 'decimal',
  postalCode: 'numeric',
  companySiren: 'numeric',
}[key] || undefined);

const resolveOfferLink = ({ offer, journey, isAuthenticated }) => {
  if (offer.price === '0€') {
    if (isAuthenticated) {
      return journey === 'statuts' ? '/statuts-gratuits' : '/questionnaire?fromSimulator=1';
    }
    return `/signup?service=${encodeURIComponent(journey)}`;
  }
  return `/paiement?offer=${encodeURIComponent(offer.name)}&service=${encodeURIComponent(journey)}`;
};

const journeys = [
  {
    id: 'statuts',
    title: 'Générer mes statuts gratuitement',
    icon: FileSignature,
    color: 'bg-[hsl(var(--greffio-citron))]',
    pitch: 'Recevez vos statuts personnalisés et un résumé clair par email.',
  },
  {
    id: 'creation',
    title: 'Créer une entreprise',
    icon: Building2,
    color: 'bg-secondary',
    pitch: 'SAS, SARL, SCI, association, activité libérale ou autre structure.',
  },
  {
    id: 'modification',
    title: 'Modifier une société',
    icon: PenLine,
    color: 'bg-secondary',
    pitch: 'Siège, dirigeant, activité, capital, dénomination ou transformation.',
  },
  {
    id: 'dissolution',
    title: 'Dissoudre ou fermer',
    icon: Trash2,
    color: 'bg-secondary',
    pitch: 'Dissolution, liquidation, radiation, mise en sommeil ou clôture.',
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
  { key: 'firstName', label: 'Prénom', type: 'text', placeholder: 'Votre prénom' },
  { key: 'lastName', label: 'Nom', type: 'text', placeholder: 'Votre nom' },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'vous@entreprise.fr' },
  { key: 'phone', label: 'Numéro joignable', type: 'tel', placeholder: GREFFIO_CONTACT.supportPhone },
];
const PROJECT_DETAIL_FIELDS = [
  {
    key: 'urgency',
    label: 'Délai souhaité',
    type: 'select',
    options: ['Aujourd’hui', 'Cette semaine', 'Ce mois-ci', 'Je compare encore'],
  },
  { key: 'companyName', label: 'Nom envisagé', type: 'text', placeholder: 'Ex. Ma Société SAS', required: true },
  { key: 'city', label: 'Ville du siège', type: 'text', placeholder: 'Ex. Paris', required: true },
  { key: 'activity', label: 'Activité principale', type: 'text', placeholder: 'Ex. conseil en gestion', required: true },
];
const INITIATOR_LEGAL_FORMS = ['SA', 'SAS', 'SASU', 'SARL', 'EURL', 'SCI', 'Association', 'Autre personne morale'];
const fieldClass = `${mobileFieldClass}`;

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
const JOURNEYS_WITH_COMPANY_LOOKUP = new Set(['modification', 'dissolution']);

const compareModules = Object.freeze({
  charges: {
    title: 'Comparateur de charges',
    description: 'Estimation rapide des charges selon votre profil de dirigeant et votre forme.',
    bullets: [
      'Assimilé salarié (SAS/SASU) : charges plus élevées, protection sociale plus complète.',
      'TNS (SARL/EURL) : charges souvent plus basses, couverture différente.',
      'Micro-entreprise : calcul simplifié, plafonds spécifiques.',
    ],
    cta: QUESTIONNAIRE_NEW_PATH,
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
    cta: QUESTIONNAIRE_NEW_PATH,
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
    cta: QUESTIONNAIRE_NEW_PATH,
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

export const FormalityWizardPage = ({ presentation = 'auto' }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, signup } = useAuth();
  const security = useSecurityConfig();
  const isMobilePresentation = presentation === 'mobile'
    || (presentation === 'auto' && (isCapacitorNative() || isMobileBrowserViewport()));
  const wizardPanelRef = useRef(null);
  const wizardNavRef = useRef(null);
  const keyboardOffset = useMobileKeyboardOffset();
  const questionAnimationTimersRef = useRef([]);
  const wizardNextRef = useRef(() => {});
  const wizardTransitionLockRef = useRef(false);
  const draft = getProjectDraft();
  const requestedType = String(searchParams.get('type') || 'statuts').toLowerCase();
  const formalityPreset = resolveSimulatorFormFromQuery(searchParams.get('formality'));
  const initialJourney = formalityPreset?.journey || typePresetByQuery[requestedType] || 'statuts';
  const accountContact = contactDetailsFromUser(getUser());
  const skipJourneyPicker = DIRECT_JOURNEY_TYPES.has(requestedType) && !compareModules[requestedType];
  const initialSkipContact = hasCompleteUserContact(getUser());
  const [step, setStep] = useState(skipJourneyPicker ? 1 : 0);
  const [journeyChosen, setJourneyChosen] = useState(() => skipJourneyPicker || Boolean(draft?.data?.journey));
  const [journeyStepError, setJourneyStepError] = useState('');
  const [projectSubStep, setProjectSubStep] = useState(skipJourneyPicker && initialSkipContact ? 1 : 0);
  const [showOffers, setShowOffers] = useState(false);
  const [selectedFormFamilyPrimary, setSelectedFormFamilyPrimary] = useState('');
  const [selectedFormFamily, setSelectedFormFamily] = useState('');
  const [formFamilyPickerTier, setFormFamilyPickerTier] = useState('primary');
  const [questionMode, setQuestionMode] = useState('avance');
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [questionExitPhase, setQuestionExitPhase] = useState(null);
  const [questionnaireFinished, setQuestionnaireFinished] = useState(false);
  const [contactStep, setContactStep] = useState(0);
  const [initiatorFieldStep, setInitiatorFieldStep] = useState(0);
  const [projectDetailIndex, setProjectDetailIndex] = useState(0);
  // Création d'espace inline (mobile, nouveau client) : none → offer → creating | skipped
  const [accountPhase, setAccountPhase] = useState('none');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountError, setAccountError] = useState('');
  const [accountCaptcha, setAccountCaptcha] = useState({ provider: 'turnstile', turnstileToken: '', recaptchaToken: '' });
  const [existingCompanyIdentifier, setExistingCompanyIdentifier] = useState('');
  const [existingCompanyState, setExistingCompanyState] = useState('idle');
  const [existingCompanyError, setExistingCompanyError] = useState('');
  const [existingCompany, setExistingCompany] = useState(null);
  const [companyLookupConfirmed, setCompanyLookupConfirmed] = useState(false);
  const [step2Phase, setStep2Phase] = useState('profile');
  const [profileQuestionIndex, setProfileQuestionIndex] = useState(0);
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
    initiatorRepresentative: draft?.data?.initiatorRepresentative || '',
    initiatorLegalForm: draft?.data?.initiatorLegalForm || 'SA',
    legalForm: formalityPreset?.legalForm || draft?.data?.legalForm || 'SASU',
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
  const needsExistingCompanyLookup = JOURNEYS_WITH_COMPANY_LOOKUP.has(data.journey);
  const isCompanyLookupStep = step === 1 && needsExistingCompanyLookup && !companyLookupConfirmed;
  const skipContactStep = useMemo(
    () => isAuthenticated && hasCompleteUserContact(currentUser),
    [isAuthenticated, currentUser],
  );
  // La simulation reste publique : pas de création de compte obligatoire avant la synthèse.
  const shouldCreateAccountInline = false;
  const isAccountCreationStep = step === 1
    && !isCompanyLookupStep
    && projectSubStep === 0
    && (accountPhase === 'offer' || accountPhase === 'creating');
  const showAccountChallenge = !isCapacitorNative()
    && security.turnstileOnSignup
    && security.captchaProvider !== 'none';
  const hasAccountCaptchaToken = Boolean(accountCaptcha.turnstileToken || accountCaptcha.recaptchaToken);
  const visibleProjectSubSteps = useMemo(() => {
    let subSteps = skipContactStep
      ? PROJECT_SUB_STEPS.filter((item) => item.id !== 'contact')
      : PROJECT_SUB_STEPS;
    if (needsExistingCompanyLookup) {
      subSteps = [{ id: 'company_lookup', label: 'Entreprise' }, ...subSteps];
    }
    return subSteps;
  }, [skipContactStep, needsExistingCompanyLookup]);
  const activeProjectSubIndex = useMemo(() => {
    let index = skipContactStep ? Math.max(0, projectSubStep - 1) : projectSubStep;
    if (needsExistingCompanyLookup) {
      if (!companyLookupConfirmed) return 0;
      index += 1;
    }
    return index;
  }, [skipContactStep, projectSubStep, needsExistingCompanyLookup, companyLookupConfirmed]);
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
  const profileQuestions = useMemo(() => {
    const base = eiLike
      ? [
          { key: 'president', label: "Nom de l'entrepreneur", type: 'text', placeholder: 'Nom et prénom', required: true },
        ]
      : [
          { key: 'president', label: 'Président, dirigeant ou PDG', type: 'text', placeholder: 'Nom et prénom', required: true },
          { key: 'shareholders', label: "Nombre d'associés/actionnaires", type: 'number', placeholder: 'Ex. 1', required: true },
          { key: 'capital', label: 'Capital social en euros', type: 'number', placeholder: 'Ex. 1000', required: true },
        ];
    return [
      ...base,
      { key: 'email', label: 'Email de réception', type: 'email', placeholder: 'vous@entreprise.fr', required: true },
      { key: 'phone', label: 'Numéro joignable', type: 'tel', placeholder: GREFFIO_CONTACT.supportPhone, required: true },
    ];
  }, [eiLike]);
  const activeProfileQuestion = profileQuestions[profileQuestionIndex] || profileQuestions[0];
  const [williamStatutesPreview, setWilliamStatutesPreview] = useState(null);
  const [williamStatutesLoading, setWilliamStatutesLoading] = useState(false);
  const williamStatutesForm = useMemo(
    () => (requiresStatutes && selectedForm?.hasStatutes !== false
      ? isWilliamStatutesForm(selectedForm?.label || data.legalForm)
      : null),
    [requiresStatutes, selectedForm, data.legalForm],
  );

  useEffect(() => {
    if (!williamStatutesForm || step !== 3) {
      setWilliamStatutesPreview(null);
      setWilliamStatutesLoading(false);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        setWilliamStatutesLoading(true);
        try {
          const payload = await fetchStatutesPreviewDraft({ data, answers });
          if (cancelled) return;
          setWilliamStatutesPreview(fullPreviewToDocumentPreview(payload?.preview));
        } catch (_error) {
          if (!cancelled) {
            setWilliamStatutesPreview(null);
          }
        } finally {
          if (!cancelled) setWilliamStatutesLoading(false);
        }
      })();
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [data, answers, williamStatutesForm, step]);

  const documentPreview = useMemo(() => {
    if (williamStatutesPreview) return williamStatutesPreview;
    return buildDocumentPreview(data, answers, selectedForm);
  }, [williamStatutesPreview, data, answers, selectedForm]);

  const handleExportPreview = async (format) => {
    try {
      await downloadPreview(documentPreview, format, { data, answers });
    } catch (_error) {
      toast.error(`Export ${format.toUpperCase()} impossible. Réessayez dans quelques instants.`);
    }
  };
  const visibleForms = useMemo(
    () => getCatalogFormsForFamily(selectedFormFamily),
    [selectedFormFamily],
  );

  useEffect(() => {
    saveProjectDraft({ data, answers });
  }, [data, answers]);

  // PC : un visiteur non connecté qui lance une vraie formalité (création, modification,
  // dissolution) crée d'abord son espace Greffio, puis entame la démarche depuis le dashboard.
  const requiresAccountFirst = !isMobilePresentation
    && !isAuthenticated
    && !activeCompareModule
    && journeyChosen
    && DIRECT_JOURNEY_TYPES.has(data.journey);
  useEffect(() => {
    if (!requiresAccountFirst) return;
    navigate(`/signup?service=${encodeURIComponent(data.journey)}`, { replace: true });
  }, [requiresAccountFirst, data.journey, navigate]);

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
    if (firstIncomplete === -1 && step === 1 && projectSubStep === 0 && !isAccountCreationStep) {
      setProjectSubStep(1);
      setInitiatorFieldStep(0);
      return;
    }
    if (firstIncomplete > 0) {
      setContactStep(firstIncomplete);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, skipContactStep, step, projectSubStep, data.firstName, data.lastName, data.email, data.phone]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nav = wizardNavRef.current;
      const panel = wizardPanelRef.current;
      const headerOffset = 112;

      if (nav) {
        const navRect = nav.getBoundingClientRect();
        const navVisible = navRect.bottom <= window.innerHeight - 8 && navRect.top >= headerOffset;
        if (!navVisible) {
          nav.scrollIntoView({ behavior: 'smooth', block: 'end' });
          return;
        }
      }

      if (panel) {
        const panelRect = panel.getBoundingClientRect();
        if (panelRect.top < headerOffset) {
          window.scrollTo({
            top: Math.max(0, window.scrollY + panelRect.top - headerOffset),
            behavior: 'smooth',
          });
        }
      }
    }, 140);

    return () => window.clearTimeout(timer);
  }, [step, projectSubStep, contactStep, initiatorFieldStep, projectDetailIndex, step2Phase, showOffers]);

  useEffect(() => {
    setActiveQuestionIndex(0);
    setQuestionExitPhase(null);
    setQuestionnaireFinished(false);
  }, [questionMode, data.legalForm, data.journey]);

  useEffect(() => () => {
    questionAnimationTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    questionAnimationTimersRef.current = [];
  }, []);

  const update = (key, value) => {
    setData((current) => ({ ...current, [key]: value }));
  };

  const selectJourney = (journeyId) => {
    update('journey', journeyId);
    setJourneyChosen(true);
    setJourneyStepError('');
    window.setTimeout(() => wizardNextRef.current(), 220);
  };

  const updateAnswer = (key, value) => {
    setAnswers((current) => ({ ...current, [key]: value }));
  };

  const activeContactField = contactFields[contactStep];
  const contactCompletion = Math.round(((contactStep + 1) / contactFields.length) * 100);
  const initiatorMobileSteps = useMemo(() => {
    const stepsList = [{ id: 'type', kind: 'choice' }, { id: 'name', kind: 'input', key: 'initiatorName' }];
    if (data.initiatorType === 'personne_morale') {
      stepsList.push(
        { id: 'representative', kind: 'input', key: 'initiatorRepresentative' },
        { id: 'legal_form', kind: 'select', key: 'initiatorLegalForm' },
      );
    }
    return stepsList;
  }, [data.initiatorType]);
  const activeInitiatorStep = initiatorMobileSteps[initiatorFieldStep] || initiatorMobileSteps[0];
  const activeProjectDetailField = PROJECT_DETAIL_FIELDS[projectDetailIndex] || PROJECT_DETAIL_FIELDS[0];
  const isProjectDetailSelectStep = activeProjectDetailField?.type === 'select';
  const hideProjectStepHeader = isMobilePresentation && (
    (projectSubStep === 0 && !isAccountCreationStep)
    || (projectSubStep === 1 && initiatorFieldStep === 0)
    || projectSubStep === 2
    || projectSubStep === 3
    || (projectSubStep === 4 && !isProjectDetailSelectStep)
  );
  const selectInitiatorType = (nextType) => {
    update('initiatorType', nextType);
    if (isMobilePresentation) {
      window.setTimeout(() => setInitiatorFieldStep(1), 220);
    }
  };

  const isInitiatorStepValid = (stepDef = activeInitiatorStep) => {
    if (!stepDef) return false;
    if (stepDef.kind === 'choice') return Boolean(data.initiatorType);
    const value = String(data[stepDef.key] || '').trim();
    if (!value) return false;
    return true;
  };

  const isProjectDetailFieldValid = (field = activeProjectDetailField) => {
    if (!field) return false;
    if (field.type === 'select') return Boolean(data[field.key]);
    if (!field.required) return true;
    return Boolean(String(data[field.key] || '').trim());
  };

  const advanceInitiatorFieldStep = () => {
    if (!isInitiatorStepValid()) return;
    if (initiatorFieldStep < initiatorMobileSteps.length - 1) {
      setInitiatorFieldStep((current) => current + 1);
      return;
    }
    setProjectSubStep(2);
    setInitiatorFieldStep(0);
  };

  const advanceProjectDetailField = () => {
    if (!isProjectDetailFieldValid()) return;
    if (projectDetailIndex < PROJECT_DETAIL_FIELDS.length - 1) {
      setProjectDetailIndex((current) => current + 1);
      return;
    }
    setStep(2);
  };

  const selectProjectDetailOption = (value) => {
    update(activeProjectDetailField.key, value);
    if (isMobilePresentation) {
      window.setTimeout(() => {
        if (projectDetailIndex < PROJECT_DETAIL_FIELDS.length - 1) {
          setProjectDetailIndex((current) => current + 1);
        } else {
          setStep(2);
        }
      }, 220);
    }
  };
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

  const handleSelectQuestionAnswer = (key, value) => {
    updateAnswer(key, value);
    if (!String(value || '').trim() || questionExitPhase) return;
    window.setTimeout(() => {
      if (isLastQuestion) completeLastQuestion();
      else advanceActiveQuestion();
    }, 220);
  };

  const completeLastQuestion = () => {
    if (!canAdvanceActiveQuestion() || !isLastQuestion || questionExitPhase) return;
    questionAnimationTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    questionAnimationTimersRef.current = [];
    setQuestionExitPhase('closing');
    questionAnimationTimersRef.current.push(
      window.setTimeout(() => setQuestionExitPhase('validated'), 520),
      window.setTimeout(() => {
        setQuestionExitPhase('done');
        setQuestionnaireFinished(true);
      }, 1450),
    );
  };

  const tryWizardContinue = () => {
    if (showOffers) return;
    if (step === 0 && !journeyChosen) {
      setJourneyStepError('Choisissez une démarche pour passer à l’étape suivante.');
      return;
    }
    if (step === 2 && step2Phase === 'profile') {
      advanceProfileQuestion();
      return;
    }
    if (step === 2 && step2Phase === 'questionnaire' && (questionnaireFinished || questionExitPhase === 'done')) {
      next();
      return;
    }
    if (step === 2 && step2Phase === 'questionnaire' && activeQuestion && isLastQuestion && canAdvanceActiveQuestion() && !questionnaireFinished) {
      completeLastQuestion();
      return;
    }
    if (step === 2 && step2Phase === 'questionnaire' && activeQuestion && !questionnaireFinished) {
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

  const scheduleWizardAdvance = (advanceFn, delayMs = 320) => {
    if (wizardTransitionLockRef.current) return;
    wizardTransitionLockRef.current = true;
    window.setTimeout(() => {
      advanceFn();
      wizardTransitionLockRef.current = false;
    }, delayMs);
  };

  const selectFormFamilyPrimary = (primary) => {
    setSelectedFormFamilyPrimary(primary);
    if (primary === QUESTIONNAIRE_FORM_FAMILY_AUTRES) {
      setFormFamilyPickerTier('secondary');
      setSelectedFormFamily('');
      return;
    }
    setFormFamilyPickerTier('primary');
    setSelectedFormFamily(primary);
    const forms = getCatalogFormsForFamily(primary);
    if (forms.length && !forms.some((form) => form.label === data.legalForm)) {
      update('legalForm', forms[0].label);
    }
    const advance = () => setProjectSubStep(3);
    if (isMobilePresentation) scheduleWizardAdvance(advance);
    else setProjectSubStep(3);
  };

  const selectFormFamilySecondary = (secondary) => {
    setSelectedFormFamily(secondary);
    setFormFamilyPickerTier('primary');
    const forms = getCatalogFormsForFamily(secondary);
    if (forms.length && !forms.some((form) => form.label === data.legalForm)) {
      update('legalForm', forms[0].label);
    }
    const advance = () => setProjectSubStep(3);
    if (isMobilePresentation) scheduleWizardAdvance(advance);
    else setProjectSubStep(3);
  };

  const resetFormFamilySelection = () => {
    setFormFamilyPickerTier('primary');
    setSelectedFormFamilyPrimary('');
    setSelectedFormFamily('');
  };

  const chooseLegalForm = (label) => {
    if (wizardTransitionLockRef.current) return;
    update('legalForm', label);
    const profile = getFormProfile(label);
    if (profile === 'INDIVIDUAL') {
      setQuestionMode('simple');
    }
    setActiveQuestionIndex(0);
    setQuestionnaireFinished(false);
    const advance = () => {
      setProjectSubStep(4);
      setProjectDetailIndex(0);
    };
    if (isMobilePresentation) scheduleWizardAdvance(advance);
  };

  useEffect(() => {
    setActiveQuestionIndex(0);
    setQuestionnaireFinished(false);
    setQuestionExitPhase(null);
    if (eiLike) setQuestionMode('simple');
  }, [data.legalForm, eiLike]);

  useEffect(() => {
    setCompanyLookupConfirmed(false);
    setExistingCompany(null);
    setExistingCompanyIdentifier('');
    setExistingCompanyError('');
    setExistingCompanyState('idle');
  }, [data.journey]);

  useEffect(() => {
    if (initiatorFieldStep >= initiatorMobileSteps.length) {
      setInitiatorFieldStep(Math.max(0, initiatorMobileSteps.length - 1));
    }
  }, [initiatorFieldStep, initiatorMobileSteps.length]);

  useEffect(() => {
    if (projectDetailIndex >= PROJECT_DETAIL_FIELDS.length) {
      setProjectDetailIndex(Math.max(0, PROJECT_DETAIL_FIELDS.length - 1));
    }
  }, [projectDetailIndex]);

  useEffect(() => {
    if (step === 2) {
      setStep2Phase('profile');
      setProfileQuestionIndex(0);
      setActiveQuestionIndex(0);
      setQuestionnaireFinished(false);
      setQuestionExitPhase(null);
    }
  }, [step]);

  const isProfileQuestionValid = (question = activeProfileQuestion) => {
    if (!question) return false;
    const value = String(data[question.key] || '').trim();
    if (!question.required) return true;
    if (!value) return false;
    if (question.key === 'email') return value.includes('@');
    if (question.key === 'phone') return value.length >= 8;
    return true;
  };

  const advanceProfileQuestion = () => {
    if (!isProfileQuestionValid()) return;
    if (profileQuestionIndex < profileQuestions.length - 1) {
      setProfileQuestionIndex((current) => Math.min(profileQuestions.length - 1, current + 1));
      return;
    }
    setStep2Phase('questionnaire');
  };

  const canContinueAccountCreation = () => {
    if (accountPhase === 'creating') return false;
    if (String(accountPassword).length < 8) return false;
    if (showAccountChallenge && !hasAccountCaptchaToken) return false;
    return true;
  };

  const createAccountSpace = async () => {
    if (accountPhase === 'creating') return;
    if (String(accountPassword).length < 8) {
      setAccountError('Choisissez un mot de passe d’au moins 8 caractères.');
      return;
    }
    setAccountPhase('creating');
    setAccountError('');
    const result = await signup({
      email: String(data.email || '').trim(),
      password: accountPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      companyName: data.companyName,
      legalForm: data.legalForm,
      city: data.city,
      activity: data.activity,
      initiatorType: data.initiatorType,
      initiatorName: data.initiatorName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
      ...(showAccountChallenge && hasAccountCaptchaToken ? accountCaptcha : {}),
    });
    if (!result.success) {
      setAccountPhase('offer');
      setAccountError(result.message || result.error || 'Création du compte impossible. Réessayez.');
      return;
    }
    setAccountPassword('');
    toast.success('Votre espace Greffio est créé !');
    navigate('/dashboard');
  };

  const skipAccountCreation = () => {
    setAccountPhase('skipped');
    setAccountError('');
    setProjectSubStep(1);
  };

  const canContinueProjectSubStep = () => {
    if (isCompanyLookupStep) return Boolean(existingCompany);
    if (isAccountCreationStep) return canContinueAccountCreation();
    if (projectSubStep === 0) {
      if (skipContactStep) return true;
      return canContinueContact();
    }
    if (projectSubStep === 1) {
      if (isMobilePresentation) return isInitiatorStepValid();
      if (data.initiatorType === 'personne_morale') {
        return Boolean(String(data.initiatorName || '').trim() && String(data.initiatorRepresentative || '').trim());
      }
      return Boolean(String(data.initiatorName || '').trim());
    }
    if (projectSubStep === 2) {
      if (formFamilyPickerTier === 'secondary') return Boolean(selectedFormFamily);
      if (selectedFormFamilyPrimary === QUESTIONNAIRE_FORM_FAMILY_AUTRES) return false;
      return Boolean(selectedFormFamilyPrimary);
    }
    if (projectSubStep === 3) return Boolean(data.legalForm);
    if (isMobilePresentation) return isProjectDetailFieldValid();
    return Boolean(String(data.companyName || '').trim() && String(data.city || '').trim());
  };

  const advanceProjectFlow = () => {
    if (isCompanyLookupStep) {
      if (!existingCompany) return;
      setCompanyLookupConfirmed(true);
      setProjectSubStep(skipContactStep ? 1 : 0);
      setContactStep(0);
      setInitiatorFieldStep(0);
      return;
    }
    if (projectSubStep === 0) {
      if (skipContactStep) {
        setProjectSubStep(1);
        setInitiatorFieldStep(0);
        return;
      }
      if (isAccountCreationStep) {
        void createAccountSpace();
        return;
      }
      if (contactStep < contactFields.length - 1) {
        setContactStep((value) => value + 1);
        return;
      }
      setProjectSubStep(1);
      setInitiatorFieldStep(0);
      return;
    }
    if (projectSubStep === 1 && isMobilePresentation) {
      advanceInitiatorFieldStep();
      return;
    }
    if (projectSubStep === 4 && isMobilePresentation) {
      advanceProjectDetailField();
      return;
    }
    if (projectSubStep < PROJECT_SUB_STEPS.length - 1) {
      setProjectSubStep(projectSubStep + 1);
      if (projectSubStep + 1 === 4) setProjectDetailIndex(0);
      return;
    }
    setStep(2);
  };

  const retreatProjectFlow = () => {
    if (isCompanyLookupStep) {
      setStep(0);
      return;
    }
    if (isAccountCreationStep) {
      setAccountPhase('none');
      setAccountError('');
      return;
    }
    if (needsExistingCompanyLookup && companyLookupConfirmed && projectSubStep === (skipContactStep ? 1 : 0) && contactStep === 0) {
      setCompanyLookupConfirmed(false);
      return;
    }
    if (projectSubStep === 4 && isMobilePresentation && projectDetailIndex > 0) {
      setProjectDetailIndex((value) => value - 1);
      return;
    }
    if (projectSubStep === 1 && isMobilePresentation && initiatorFieldStep > 0) {
      setInitiatorFieldStep((value) => value - 1);
      return;
    }
    if (projectSubStep === 0 && contactStep > 0) {
      setContactStep((value) => value - 1);
      return;
    }
    if (projectSubStep > (skipContactStep ? 1 : 0)) {
      setProjectSubStep(projectSubStep - 1);
      if (projectSubStep - 1 === 4) setProjectDetailIndex(PROJECT_DETAIL_FIELDS.length - 1);
      if (projectSubStep - 1 === 1) setInitiatorFieldStep(Math.max(0, initiatorMobileSteps.length - 1));
      if (projectSubStep - 1 === 2 && selectedFormFamilyPrimary === QUESTIONNAIRE_FORM_FAMILY_AUTRES) {
        setFormFamilyPickerTier('secondary');
      }
      return;
    }
    setStep(0);
  };

  const next = () => {
    if (step === 0) {
      setProjectSubStep(skipContactStep ? 1 : 0);
      setContactStep(0);
      setInitiatorFieldStep(0);
      setProjectDetailIndex(0);
      setCompanyLookupConfirmed(false);
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
  wizardNextRef.current = next;

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
      if (step2Phase === 'profile' && profileQuestionIndex > 0) {
        setProfileQuestionIndex((current) => Math.max(0, current - 1));
        return;
      }
      if (step2Phase === 'questionnaire' && activeQuestionIndex > 0 && !questionnaireFinished) {
        setActiveQuestionIndex((current) => Math.max(0, current - 1));
        return;
      }
      if (step2Phase === 'questionnaire') {
        setStep2Phase('profile');
        setProfileQuestionIndex(profileQuestions.length - 1);
        setActiveQuestionIndex(0);
        setQuestionnaireFinished(false);
        setQuestionExitPhase(null);
        return;
      }
      setStep(1);
      if (needsExistingCompanyLookup) {
        setCompanyLookupConfirmed(true);
        setProjectSubStep(PROJECT_SUB_STEPS.length - 1);
      } else {
        setProjectSubStep(PROJECT_SUB_STEPS.length - 1);
      }
      return;
    }
    setStep((value) => Math.max(0, value - 1));
  };

  const isProjectBackDisabled = step === 1
    && !isCompanyLookupStep
    && projectSubStep === (skipContactStep ? 1 : 0)
    && contactStep === 0;

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

  const generatedClauses = useMemo(() => {
    const williamClauses = williamStatutesPreview?.williamPreview?.allClauses;
    if (williamClauses?.length) {
      return williamClauses.map((clause) => clause.title);
    }
    return [
      (selectedForm?.hasStatutes && requiresStatutes)
        ? `Forme : ${data.legalForm}, statuts préparés selon le droit français.`
        : `Forme : ${data.legalForm}, dossier déclaratif adapté sans statuts sociaux à déposer selon l’organisme compétent.`,
      `Dénomination : ${data.companyName || 'à compléter'}.`,
      `Objet : ${data.activity || 'activité à préciser'} et opérations connexes.`,
      `Siège : ${data.city || 'France'}, avec faculté de transfert selon décision compétente.`,
      `Demandeur : ${data.initiatorType === 'personne_morale' ? `${data.initiatorName || 'société demandeuse'} (${data.initiatorLegalForm})` : data.initiatorName || 'personne physique à compléter'}.`,
      `Capital : ${data.capital || '1'} euros, réparti entre ${data.shareholders || '1'} associé(s) ou actionnaire(s).`,
      `Direction : ${data.president || 'dirigeant à nommer'}.`,
    ];
  }, [williamStatutesPreview, selectedForm, requiresStatutes, data]);

  const stepperVariant = isMobilePresentation ? 'compact' : 'default';
  const mobileActionBarPosition = isCapacitorNative()
    ? 'bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))]'
    : 'bottom-[calc(var(--bottom-nav-height-web)+env(safe-area-inset-bottom))]';

  const choiceTapNoContinue = isMobilePresentation && (
    step === 0
    || (step === 1 && projectSubStep === 2)
    || (step === 1 && projectSubStep === 3)
    || (step === 1 && projectSubStep === 0 && !isAccountCreationStep)
    || (step === 1 && projectSubStep === 1 && (
      activeInitiatorStep?.kind === 'choice'
      || activeInitiatorStep?.kind === 'select'
      || activeInitiatorStep?.kind === 'input'
    ))
    || (step === 1 && projectSubStep === 4)
    || (step === 2 && step2Phase === 'profile')
    || (step === 2 && step2Phase === 'questionnaire' && activeQuestion?.type === 'select' && !questionnaireFinished && !questionExitPhase)
  );

  return (
    <>
      <SeoHead
        title={SEO_PAGE_META.simulateur.title}
        description={SEO_PAGE_META.simulateur.description}
        path={SEO_PAGE_META.simulateur.path}
        jsonLdId="simulateur"
      />
    <div className={cn('min-h-screen w-full min-w-0 max-w-[100vw] overflow-x-hidden', isMobilePresentation ? 'bg-[var(--we-bg)]' : 'bg-[var(--we-bg)]')}>
      {!isMobilePresentation ? <NavbarDropdown /> : null}

      <main className={cn(
        'mx-auto grid w-full min-w-0 max-w-full',
        isMobilePresentation
          ? 'gap-0 px-0 pb-[calc(6.5rem+var(--bottom-nav-height-web)+env(safe-area-inset-bottom))] pt-0'
          : 'max-w-7xl gap-8 px-4 pb-10 pt-28 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8',
      )}>
        <section
          ref={wizardPanelRef}
          className={cn(isMobilePresentation ? 'simulator-mobile bg-[var(--we-bg)]' : 'we-panel')}
        >
          <div className={cn(
            isMobilePresentation
              ? 'border-b border-border/90 bg-[var(--we-bg)]/95 px-4 py-2.5 backdrop-blur-sm'
              : 'border-b border-[var(--we-border)] bg-white px-6 py-4',
          )}
          >
            <div className={cn(
              'flex items-center justify-between font-bold uppercase text-muted-foreground',
              isMobilePresentation ? 'mb-2 text-[10px] tracking-wide' : 'mb-3 text-xs',
            )}
            >
              {!isMobilePresentation ? <span>Simulation Greffio</span> : <span className="text-primary/80">Étape</span>}
              <span className={isMobilePresentation ? 'rounded-full bg-white px-2 py-0.5 text-[10px] ring-1 ring-border' : ''}>
                {showOffers ? 'Offres' : `${step + 1}/${steps.length}`}
              </span>
            </div>
            <div className={cn('overflow-hidden rounded-full bg-[#e8f0fa]', isMobilePresentation ? 'h-1.5' : 'h-2')}>
              <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: showOffers ? '100%' : `${progress}%` }} />
            </div>
            {!showOffers ? (
              <div className={cn(isMobilePresentation ? 'mt-2 space-y-1.5' : 'mt-4 space-y-3')}>
                <ProgressiveStepChips steps={PROGRESSIVE_WIZARD_STEPS} activeIndex={step} variant={stepperVariant} />
                {step === 1 ? (
                  isMobilePresentation ? (
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      {visibleProjectSubSteps[activeProjectSubIndex]?.label || 'Projet'}
                      {' · '}
                      {activeProjectSubIndex + 1}/{visibleProjectSubSteps.length}
                    </p>
                  ) : (
                    <ProgressiveStepChips steps={visibleProjectSubSteps} activeIndex={activeProjectSubIndex} variant={stepperVariant} />
                  )
                ) : null}
              </div>
            ) : null}
          </div>

          <AnimatePresence mode="wait">
            {!showOffers ? (
              <motion.div
                key={step}
                initial={isMobilePresentation ? { opacity: 0, y: 10 } : { opacity: 0, x: 22 }}
                animate={isMobilePresentation ? { opacity: 1, y: 0 } : { opacity: 1, x: 0 }}
                exit={isMobilePresentation ? { opacity: 0, y: -10 } : { opacity: 0, x: -22 }}
                transition={{ duration: 0.22 }}
                className={cn(
                  isMobilePresentation ? 'simulator-mobile-content w-full min-w-0 max-w-full px-3.5 py-3' : 'p-4 sm:p-6 md:p-10',
                )}
                onKeyDown={handleWizardKeyDown}
              >
                {step === 0 && (
                  <div className={cn(isMobilePresentation ? 'space-y-4' : 'space-y-7')}>
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
                    ) : (
                      <MobileChoiceStep
                        kicker="Démarche"
                        title="Que souhaitez-vous faire ?"
                        subtitle="Greffio adapte automatiquement les pièces, les statuts, les relances et les offres selon votre démarche."
                        hint={isCapacitorNative()
                          ? 'Touchez une démarche pour continuer.'
                          : 'Sélectionnez une démarche pour continuer.'}
                        progressPercent={Math.round(progress)}
                        gridClassName="simulator-journey-grid w-full max-w-none sm:grid-cols-2"
                      >
                        {journeys.map((journey) => (
                          <MobileChoiceTile
                            key={journey.id}
                            title={journey.title}
                            description={journey.pitch}
                            icon={journey.icon}
                            iconTone={journey.color}
                            selected={journeyChosen && data.journey === journey.id}
                            onSelect={() => selectJourney(journey.id)}
                            compact
                          />
                        ))}
                      </MobileChoiceStep>
                    )}
                    {!activeCompareModule && !isMobilePresentation ? (
                      <p className="text-sm text-muted-foreground">
                        Simulation gratuite, sans engagement.
                      </p>
                    ) : null}
                    {journeyStepError ? (
                      <p className="text-sm text-destructive" role="alert">{journeyStepError}</p>
                    ) : null}
                  </div>
                )}

                {step === 1 && (
                  <div className={cn(isMobilePresentation ? 'min-w-0 space-y-3' : 'space-y-7')}>
                    {!hideProjectStepHeader && !(isCompanyLookupStep || isAccountCreationStep) ? (
                    <div className="min-w-0">
                      <p className={cn('font-bold uppercase text-primary', isMobilePresentation ? 'text-[10px] tracking-wide' : 'text-sm')}>
                        {isCompanyLookupStep ? 'Entreprise existante' : isAccountCreationStep ? 'Votre espace' : 'Projet'}
                      </p>
                      <h1 className={cn('font-extrabold', isMobilePresentation ? 'mt-1 text-lg' : 'mt-2 text-3xl')}>
                        {isCompanyLookupStep && 'Identifier votre société'}
                        {!isCompanyLookupStep && isAccountCreationStep && 'Créez votre espace Greffio'}
                        {!isCompanyLookupStep && !isAccountCreationStep && projectSubStep === 0 && 'Vos coordonnées'}
                        {!isCompanyLookupStep && projectSubStep === 1 && 'Qui effectue la démarche ?'}
                        {!isCompanyLookupStep && projectSubStep === 2 && 'Forme juridique visée'}
                        {!isCompanyLookupStep && projectSubStep === 3 && 'Choisissez votre forme'}
                        {!isCompanyLookupStep && projectSubStep === 4 && 'Précisez votre projet'}
                      </h1>
                      <p className={cn('text-muted-foreground', isMobilePresentation ? 'simulator-step-subtitle mt-1.5' : 'mt-2')}>
                        {isCompanyLookupStep && 'Signature électronique qualifiée nécessaire pour modifier, cesser ou corriger une société existante.'}
                        {!isCompanyLookupStep && isAccountCreationStep && 'Un mot de passe suffit : votre dossier, vos documents et votre suivi seront réunis au même endroit.'}
                        {!isCompanyLookupStep && !isAccountCreationStep && projectSubStep === 0 && 'Une question à la fois – vos coordonnées servent au dossier et aux relances Greffio.'}
                        {!isCompanyLookupStep && projectSubStep === 1 && 'Une personne physique ou morale peut porter la demande, y compris une société qui crée une filiale.'}
                        {!isCompanyLookupStep && projectSubStep === 2 && 'Sélectionnez la catégorie la plus proche de votre situation, puis continuez.'}
                        {!isCompanyLookupStep && projectSubStep === 3 && 'Comparez les formes disponibles dans cette catégorie.'}
                        {!isCompanyLookupStep && projectSubStep === 4 && 'Ces éléments alimentent le questionnaire et l’aperçu documentaire.'}
                      </p>
                    </div>
                    ) : null}

                    {isCompanyLookupStep ? (
                      <div className="rounded-md border border-border bg-white p-5">
                        <p className="text-sm font-bold uppercase text-primary">
                          Signature électronique qualifiée nécessaire
                        </p>
                        <h3 className="mt-1 text-xl font-extrabold">Modification, cessation, dépôt d’actes ou correction</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Rechercher une entreprise par SIREN ou SIRET pour précharger le dossier.
                        </p>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
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
                        {existingCompanyError ? <p className="mt-2 text-xs text-destructive">{existingCompanyError}</p> : null}
                        {existingCompany ? (
                          <div className="mt-4">
                            <CompanyLookupCard
                              company={existingCompany}
                              onUse={() => {
                                setCompanyLookupConfirmed(true);
                                setProjectSubStep(skipContactStep ? 1 : 0);
                                setContactStep(0);
                              }}
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`project-${projectSubStep}-${projectSubStep === 0 ? (isAccountCreationStep ? 'account' : contactStep) : projectSubStep === 1 ? initiatorFieldStep : projectSubStep === 4 ? projectDetailIndex : 'static'}`}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.22 }}
                        className={cn(isMobilePresentation ? 'min-h-[280px] w-full min-w-0 overflow-hidden' : 'min-h-[320px]')}
                      >
                        {projectSubStep === 0 && isAccountCreationStep && (
                          <div className={cn('simulator-contact-card rounded-2xl border border-primary/25 bg-gradient-to-br from-white via-secondary/40 to-white shadow-elevation-sm', isMobilePresentation ? 'p-4' : 'p-6 md:p-8')}>
                            <div className="flex items-center gap-3">
                              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                                <Lock className="h-5 w-5 text-primary" />
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-extrabold text-[hsl(var(--greffio-blue-900))]">
                                  {data.firstName} {data.lastName}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">{data.email}</p>
                              </div>
                            </div>
                            <form
                              className="simulator-field-stack mt-4 space-y-2"
                              onSubmit={(event) => {
                                event.preventDefault();
                                if (canContinueAccountCreation()) void createAccountSpace();
                              }}
                            >
                              <Label className="text-sm">Choisissez un mot de passe</Label>
                              <Input
                                type="password"
                                value={accountPassword}
                                onChange={(event) => {
                                  setAccountPassword(event.target.value);
                                  setAccountError('');
                                }}
                                placeholder="8 caractères minimum"
                                autoComplete="new-password"
                                disabled={accountPhase === 'creating'}
                                className={cn(isMobilePresentation ? mobileFieldClass : 'min-w-0 w-full rounded-xl')}
                              />
                              {accountError ? (
                                <p className="text-xs font-semibold text-destructive" role="alert">{accountError}</p>
                              ) : null}
                              {showAccountChallenge ? (
                                <SecurityChallengeWidget action="signup" onTokens={setAccountCaptcha} />
                              ) : null}
                              {isMobilePresentation ? (
                                <Button
                                  type="button"
                                  className="mt-4 h-12 w-full rounded-2xl text-base font-bold"
                                  disabled={!canContinueAccountCreation() || accountPhase === 'creating'}
                                  onClick={() => void createAccountSpace()}
                                >
                                  {accountPhase === 'creating' ? 'Création…' : 'Créer mon espace'}
                                </Button>
                              ) : null}
                            </form>
                            <ul className="mt-4 space-y-1.5 text-xs leading-5 text-muted-foreground">
                              {[
                                'Votre projet est enregistré, rien à ressaisir.',
                                'Dossier, documents et relances réunis dans votre cockpit.',
                                'Gratuit et sans engagement.',
                              ].map((item) => (
                                <li key={item} className="flex items-start gap-2">
                                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                            <button
                              type="button"
                              onClick={skipAccountCreation}
                              disabled={accountPhase === 'creating'}
                              className="mt-4 w-full text-center text-xs font-semibold text-muted-foreground underline underline-offset-2"
                            >
                              Continuer sans créer mon espace pour l’instant
                            </button>
                          </div>
                        )}

                        {projectSubStep === 0 && !isAccountCreationStep && isMobilePresentation ? (
                          <MobileInputStep
                            kicker="Projet"
                            title={activeContactField.label}
                            subtitle="Une question à la fois – vos coordonnées servent au dossier et aux relances Greffio."
                            progressPercent={contactCompletion}
                            stepCurrent={contactStep + 1}
                            stepTotal={contactFields.length}
                            fieldId={`simulator-contact-${activeContactField.key}`}
                            value={data[activeContactField.key] || ''}
                            placeholder={activeContactField.placeholder || ''}
                            inputMode={resolveInputMode(activeContactField.key)}
                            inputType={activeContactField.type}
                            compact
                            showProgressBar={false}
                            showStepMeta={false}
                            canAdvance={canContinueContact()}
                            onChange={(nextValue) => update(activeContactField.key, nextValue)}
                            onAdvance={tryWizardContinue}
                            hint="Touchez la flèche pour continuer."
                          />
                        ) : null}

                        {projectSubStep === 0 && !isAccountCreationStep && !isMobilePresentation ? (
                          <div className={cn('simulator-contact-card rounded-2xl border border-border bg-muted', isMobilePresentation ? 'p-3.5' : 'p-6 md:p-8')}>
                            <div className={cn('flex gap-3', isMobilePresentation ? 'flex-col items-stretch' : 'items-center justify-between gap-4')}>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold uppercase text-primary sm:text-sm">Réf. : {dossierReference}</p>
                                <p className="text-[11px] text-muted-foreground sm:text-xs">
                                  {contactStep + 1}/{contactFields.length} – {contactCompletion}%
                                </p>
                              </div>
                              <div className={cn('relative shrink-0 self-end', isMobilePresentation ? 'h-12 w-12' : 'h-16 w-16')}>
                                <svg viewBox="0 0 36 36" className={isMobilePresentation ? 'h-12 w-12' : 'h-16 w-16'}>
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
                              className="simulator-field-stack mt-4 space-y-2 sm:mt-6"
                              onSubmit={(event) => {
                                event.preventDefault();
                                if (canContinueContact()) tryWizardContinue();
                              }}
                            >
                              <Label className="text-sm">{activeContactField.label}</Label>
                              <div className={cn(
                                'simulator-field-stack grid w-full min-w-0 max-w-full grid-cols-1 gap-2',
                                !isMobilePresentation && 'flex items-center gap-2',
                              )}
                              >
                                <Input
                                  type={activeContactField.type}
                                  value={data[activeContactField.key]}
                                  onChange={(event) => update(activeContactField.key, event.target.value)}
                                  placeholder={activeContactField.placeholder}
                                  autoComplete={resolveAutoComplete(activeContactField.key)}
                                  inputMode={resolveInputMode(activeContactField.key)}
                                  className={cn(isMobilePresentation ? mobileFieldClass : 'min-w-0 flex-1 rounded-xl')}
                                />
                                {!isMobilePresentation ? (
                                  <Button
                                    type="submit"
                                    disabled={!canContinueContact()}
                                    className="h-11 w-11 shrink-0 rounded-full p-0 sm:hidden"
                                    aria-label="Continuer"
                                  >
                                    <ArrowRight className="h-5 w-5" />
                                  </Button>
                                ) : null}
                              </div>
                            </form>
                            <p className="mt-4 text-xs leading-5 text-muted-foreground">
                              Vos données sont en sécurité et transmises uniquement à l’administration française pour enregistrer votre entreprise.
                            </p>
                          </div>
                        ) : null}

                        {projectSubStep === 1 && (
                          isMobilePresentation ? (
                            <div className="space-y-4">
                              {activeInitiatorStep?.kind === 'choice' ? (
                                <MobileChoiceStep
                                  kicker="Projet"
                                  title="Qui effectue la démarche ?"
                                  subtitle="Une personne physique ou morale peut porter la demande, y compris une société qui crée une filiale."
                                  hint={isCapacitorNative()
                                    ? 'Touchez votre réponse pour continuer.'
                                    : 'Sélectionnez une réponse pour continuer.'}
                                  progressPercent={Math.round(((initiatorFieldStep + 1) / initiatorMobileSteps.length) * 100)}
                                  stepCurrent={initiatorFieldStep + 1}
                                  stepTotal={initiatorMobileSteps.length}
                                  gridClassName="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3"
                                >
                                  <MobileChoiceTile
                                    title="Personne physique"
                                    selected={data.initiatorType === 'personne_physique'}
                                    onSelect={() => selectInitiatorType('personne_physique')}
                                  />
                                  <MobileChoiceTile
                                    title="Personne morale"
                                    selected={data.initiatorType === 'personne_morale'}
                                    onSelect={() => selectInitiatorType('personne_morale')}
                                  />
                                </MobileChoiceStep>
                              ) : null}
                              {activeInitiatorStep?.kind === 'input' ? (
                                <MobileInputStep
                                  kicker="Projet"
                                  title={activeInitiatorStep.key === 'initiatorName'
                                    ? (data.initiatorType === 'personne_morale' ? 'Dénomination / raison sociale' : 'Nom du fondateur')
                                    : 'Représentant légal'}
                                  subtitle="Une question à la fois, sur la même logique que le questionnaire Greffio."
                                  progressPercent={Math.round(((initiatorFieldStep + 1) / initiatorMobileSteps.length) * 100)}
                                  stepCurrent={initiatorFieldStep + 1}
                                  stepTotal={initiatorMobileSteps.length}
                                  fieldId={`simulator-initiator-${activeInitiatorStep.key}`}
                                  value={data[activeInitiatorStep.key] || ''}
                                  compact
                                  showProgressBar={false}
                                  showStepMeta={false}
                                  canAdvance={isInitiatorStepValid()}
                                  onChange={(nextValue) => update(activeInitiatorStep.key, nextValue)}
                                  onAdvance={advanceInitiatorFieldStep}
                                  hint="Touchez la flèche pour continuer."
                                />
                              ) : null}
                              {activeInitiatorStep?.kind === 'select' ? (
                                <MobileChoiceStep
                                  kicker="Projet"
                                  title="Forme de la société demandeuse"
                                  subtitle="Sélectionnez la forme juridique de la personne morale qui porte la demande."
                                  hint={isCapacitorNative()
                                    ? 'Touchez une forme pour continuer.'
                                    : 'Sélectionnez une forme pour continuer.'}
                                  progressPercent={Math.round(((initiatorFieldStep + 1) / initiatorMobileSteps.length) * 100)}
                                  stepCurrent={initiatorFieldStep + 1}
                                  stepTotal={initiatorMobileSteps.length}
                                  gridClassName="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3"
                                >
                                  {INITIATOR_LEGAL_FORMS.map((item) => (
                                    <MobileChoiceTile
                                      key={item}
                                      title={item}
                                      selected={data.initiatorLegalForm === item}
                                      onSelect={() => {
                                        update('initiatorLegalForm', item);
                                        window.setTimeout(() => {
                                          setProjectSubStep(2);
                                          setInitiatorFieldStep(0);
                                        }, 220);
                                      }}
                                    />
                                  ))}
                                </MobileChoiceStep>
                              ) : null}
                            </div>
                          ) : (
                          <div className={cn(isMobilePresentation ? 'simulator-field-stack grid min-w-0 grid-cols-1 gap-3' : 'grid gap-5 md:grid-cols-2')}>
                            <div className="space-y-2">
                              <Label>Qui effectue la démarche</Label>
                              <select className={`${fieldClass} w-full rounded-xl`} value={data.initiatorType} onChange={(event) => update('initiatorType', event.target.value)}>
                                <option value="personne_physique">Personne physique</option>
                                <option value="personne_morale">Personne morale</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label>{data.initiatorType === 'personne_morale' ? 'Dénomination / raison sociale' : 'Nom du fondateur'}</Label>
                              <Input className={cn(isMobilePresentation ? mobileFieldClass : 'w-full rounded-xl')} value={data.initiatorName} onChange={(event) => update('initiatorName', event.target.value)} />
                            </div>
                            {data.initiatorType === 'personne_morale' && (
                              <>
                                <div className="space-y-2">
                                  <Label>Représentant légal</Label>
                                  <Input className="w-full rounded-xl" value={data.initiatorRepresentative} onChange={(event) => update('initiatorRepresentative', event.target.value)} />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                  <Label>Forme de la société demandeuse</Label>
                                  <select className={`${fieldClass} w-full rounded-xl`} value={data.initiatorLegalForm} onChange={(event) => update('initiatorLegalForm', event.target.value)}>
                                    {['SA', 'SAS', 'SASU', 'SARL', 'EURL', 'SCI', 'Association', 'Autre personne morale'].map((item) => (
                                      <option key={item} value={item}>{item}</option>
                                    ))}
                                  </select>
                                </div>
                              </>
                            )}
                          </div>
                          )
                        )}

                        {projectSubStep === 2 && (
                          formFamilyPickerTier === 'secondary' ? (
                            <LegalFormFamilyPicker
                              tier="secondary"
                              value={selectedFormFamily}
                              mobilePresentation
                              onSelect={selectFormFamilySecondary}
                            />
                          ) : (
                            <LegalFormFamilyPicker
                              tier="primary"
                              value={selectedFormFamilyPrimary}
                              mobilePresentation
                              onSelect={selectFormFamilyPrimary}
                            />
                          )
                        )}

                        {projectSubStep === 3 && (
                          <div className="space-y-3">
                            <FormalityCategoryBackButton
                              onClick={() => {
                                setProjectSubStep(2);
                                if (selectedFormFamilyPrimary === QUESTIONNAIRE_FORM_FAMILY_AUTRES) {
                                  setFormFamilyPickerTier('secondary');
                                } else {
                                  resetFormFamilySelection();
                                }
                              }}
                            />
                            <MobileChoiceStep
                              kicker={selectedFormFamily || 'Projet'}
                              title="Choisissez votre forme juridique"
                              subtitle="Comparez les formes disponibles dans cette catégorie."
                              hint={isCapacitorNative()
                                ? 'Touchez une forme pour continuer.'
                                : 'Sélectionnez une forme pour continuer.'}
                              gridClassName="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
                            >
                              {visibleForms.map((form) => {
                                const availability = getFormAvailability(form.key);
                                const availabilityLabel = availability === SERVICE_AVAILABILITY.AVAILABLE_NOW
                                  ? 'Disponible'
                                  : availability === SERVICE_AVAILABILITY.COMING_SOON
                                    ? 'Bientôt'
                                    : 'Sur devis';
                                return (
                                  <MobileChoiceTile
                                    key={form.key}
                                    title={form.label}
                                    description={availabilityLabel}
                                    selected={data.legalForm === form.label}
                                    onSelect={() => chooseLegalForm(form.label)}
                                  />
                                );
                              })}
                            </MobileChoiceStep>
                          </div>
                        )}

                        {projectSubStep === 4 && (
                          isMobilePresentation ? (
                            <div className="space-y-4">
                              {isProjectDetailSelectStep ? (
                                <MobileChoiceStep
                                  kicker="Projet"
                                  title={activeProjectDetailField.label}
                                  subtitle="Ces éléments alimentent le questionnaire et l’aperçu documentaire."
                                  hint={isCapacitorNative()
                                    ? 'Touchez un délai pour continuer.'
                                    : 'Sélectionnez un délai pour continuer.'}
                                  progressPercent={Math.round(((projectDetailIndex + 1) / PROJECT_DETAIL_FIELDS.length) * 100)}
                                  stepCurrent={projectDetailIndex + 1}
                                  stepTotal={PROJECT_DETAIL_FIELDS.length}
                                  gridClassName="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3"
                                >
                                  {(activeProjectDetailField.options || []).map((item) => (
                                    <MobileChoiceTile
                                      key={item}
                                      title={item}
                                      selected={data.urgency === item}
                                      onSelect={() => selectProjectDetailOption(item)}
                                    />
                                  ))}
                                </MobileChoiceStep>
                              ) : (
                                <MobileInputStep
                                  kicker="Projet"
                                  title={`${activeProjectDetailField.label}${activeProjectDetailField.required ? ' *' : ''}`}
                                  subtitle="Ces éléments alimentent le questionnaire et l’aperçu documentaire."
                                  progressPercent={Math.round(((projectDetailIndex + 1) / PROJECT_DETAIL_FIELDS.length) * 100)}
                                  stepCurrent={projectDetailIndex + 1}
                                  stepTotal={PROJECT_DETAIL_FIELDS.length}
                                  fieldId={`simulator-project-${activeProjectDetailField.key}`}
                                  value={data[activeProjectDetailField.key] || ''}
                                  placeholder={activeProjectDetailField.placeholder || ''}
                                  compact
                                  showProgressBar={false}
                                  showStepMeta={false}
                                  canAdvance={isProjectDetailFieldValid()}
                                  onChange={(nextValue) => update(activeProjectDetailField.key, nextValue)}
                                  onAdvance={advanceProjectDetailField}
                                  hint="Touchez la flèche pour continuer."
                                />
                              )}
                            </div>
                          ) : (
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
                          )
                        )}
                      </motion.div>
                    </AnimatePresence>
                    )}
                  </div>
                )}

                {step === 2 && (
                  <div className={cn('space-y-6', isMobilePresentation && 'space-y-4')}>
                    {(!isMobilePresentation || step2Phase !== 'profile') ? (
                    <div>
                      <p className={cn('font-bold uppercase text-primary', isMobilePresentation ? 'text-[10px] tracking-wide' : 'text-sm')}>Questionnaire intelligent</p>
                      <h1 className={cn('font-extrabold', isMobilePresentation ? 'mt-1 text-lg' : 'mt-2 text-3xl')}>
                        {step2Phase === 'profile' && (eiLike
                          ? `Coordonnées – ${data.legalForm}`
                          : 'Dirigeants, capital et coordonnées')}
                        {step2Phase === 'questionnaire' && `Clauses adaptées à ${data.legalForm}`}
                      </h1>
                      <p className={cn('max-w-3xl leading-6 text-muted-foreground', isMobilePresentation ? 'simulator-step-subtitle mt-1.5 text-xs' : 'mt-2 text-sm')}>
                        {step2Phase === 'profile' && (eiLike
                          ? 'Complétez d’abord vos coordonnées. Le questionnaire ciblé s’affichera ensuite, une question à la fois.'
                          : 'Complétez les informations de dirigeants et de capital. Les clauses statutaires suivront, une question à la fois.')}
                        {step2Phase === 'questionnaire' && (eiLike
                          ? 'Greffio n’affiche que les questions utiles à votre forme – pas de statuts ni de capital social.'
                          : `${flattenedQuestions.length} questions pour ${data.legalForm}. Répondez puis validez pour passer à la synthèse.`)}
                      </p>
                    </div>
                    ) : null}

                    {step2Phase === 'profile' ? (
                    <div className={cn(!isMobilePresentation && 'rounded-[1.35rem] border border-border bg-white p-6 shadow-[0_14px_40px_rgba(15,31,61,0.07)]')}>
                      <MobileInputStep
                        key={activeProfileQuestion.key}
                        kicker={eiLike ? 'Identité et coordonnées' : 'Dirigeants et capital'}
                        title={`${activeProfileQuestion.label}${activeProfileQuestion.required ? ' *' : ''}`}
                        subtitle={eiLike
                          ? 'Complétez les informations utiles à votre formalité.'
                          : 'Une question à la fois, sur la même logique que le questionnaire Greffio.'}
                        progressPercent={Math.round(((profileQuestionIndex + 1) / profileQuestions.length) * 100)}
                        stepCurrent={profileQuestionIndex + 1}
                        stepTotal={profileQuestions.length}
                        fieldId={`simulator-${activeProfileQuestion.key}`}
                        value={data[activeProfileQuestion.key] || ''}
                        placeholder={activeProfileQuestion.placeholder || ''}
                        inputMode={resolveInputMode(activeProfileQuestion.key)}
                        inputType={activeProfileQuestion.type === 'number' ? 'text' : activeProfileQuestion.type}
                        compact={isMobilePresentation}
                        showProgressBar={!isMobilePresentation}
                        showStepMeta={!isMobilePresentation}
                        canAdvance={isProfileQuestionValid()}
                        onChange={(nextValue) => {
                          update(activeProfileQuestion.key, activeProfileQuestion.type === 'number'
                            ? String(nextValue || '').replace(/[^\d.,]/g, '').replace(',', '.')
                            : nextValue);
                          if (activeProfileQuestion.key === 'president' && eiLike) {
                            updateAnswer('nomEntrepreneur', nextValue);
                          }
                        }}
                        onAdvance={advanceProfileQuestion}
                        hint="Touchez la flèche pour continuer."
                      >
                        {activeProfileQuestion.key === 'email' ? (
                          <label className="mx-auto mt-4 flex max-w-md items-start gap-3 rounded-2xl border border-border bg-white p-4 text-left">
                            <input
                              type="checkbox"
                              checked={data.marketingConsent}
                              onChange={(event) => update('marketingConsent', event.target.checked)}
                              className="mt-1"
                            />
                            <span className="text-xs leading-5 text-muted-foreground">
                              J’accepte de recevoir mon résumé, mes statuts générés et les relances liées à ma formalité.
                            </span>
                          </label>
                        ) : null}
                      </MobileInputStep>
                    </div>
                    ) : (
                    <div className="rounded-md border border-border bg-white p-5">
                      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                        <div>
                          <h2 className="text-lg font-extrabold">Clauses et informations – {data.legalForm}</h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {flattenedQuestions.length} question{flattenedQuestions.length > 1 ? 's' : ''} pour cette forme
                            {eiLike ? ' (parcours allégé).' : '.'}
                          </p>
                        </div>
                        {!eiLike ? (
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
                        ) : null}
                      </div>

                      <div className={`mt-5 grid gap-4 ${isMobilePresentation ? '' : 'lg:grid-cols-[1fr_320px]'}`}>
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
                        {!isMobilePresentation ? (
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
                        ) : null}
                      </div>

                      <AnimatePresence mode="wait">
                        {!questionnaireFinished ? (
                          <motion.div
                            key="question-panel-active"
                            className="relative mt-5 overflow-hidden rounded-[1.35rem] border border-border bg-white p-6 shadow-[0_14px_40px_rgba(15,31,61,0.07)] md:p-7"
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
                            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
                              <div className="flex items-center gap-4">
                                <ProgressCircle percent={completion} size="lg" />
                                <div>
                                  <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Réf. : {dossierReference}</p>
                                  <p className="mt-0.5 text-sm font-semibold text-foreground">
                                    Question {activeQuestionIndex + 1}
                                    <span className="font-medium text-muted-foreground"> / {Math.max(flattenedQuestions.length, 1)}</span>
                                  </p>
                                </div>
                              </div>
                              <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                                Vos données sont sécurisées et utilisées uniquement pour votre formalité.
                              </p>
                            </div>

                            {activeQuestion ? (
                              <motion.form
                                className="space-y-5"
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
                                <QuestionSectionHint
                                  title={activeQuestion.sectionTitle}
                                  note={activeQuestion.sectionNote}
                                />
                                <div className="rounded-2xl border border-border bg-muted/30 p-5">
                                  <Label className="text-base font-extrabold text-[hsl(var(--greffio-blue-900))]">
                                    {activeQuestion.label}
                                    {activeQuestion.required ? <span className="text-primary"> *</span> : null}
                                  </Label>
                                  {activeQuestion.type === 'select' ? (
                                    <MobileChoiceStep
                                      title={activeQuestion.label}
                                      subtitle={activeQuestion.sectionTitle}
                                      hint={isCapacitorNative()
                                        ? 'Touchez votre réponse pour continuer.'
                                        : 'Sélectionnez une réponse pour continuer.'}
                                      gridClassName="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3"
                                    >
                                      {(activeQuestion.options || []).map((option) => {
                                        const optionValue = typeof option === 'string' ? option : option.value;
                                        const optionLabel = typeof option === 'string' ? option : option.label;
                                        return (
                                          <MobileChoiceTile
                                            key={optionValue}
                                            title={optionLabel}
                                            selected={String(answers[activeQuestion.key] || '') === String(optionValue)}
                                            disabled={Boolean(questionExitPhase)}
                                            onSelect={() => handleSelectQuestionAnswer(activeQuestion.key, optionValue)}
                                          />
                                        );
                                      })}
                                    </MobileChoiceStep>
                                  ) : activeQuestion.type === 'textarea' ? (
                                    <textarea
                                      className={`${fieldClass} mt-2 min-h-[120px] w-full py-3`}
                                      value={answers[activeQuestion.key] || ''}
                                      placeholder={activeQuestion.placeholder || ''}
                                      disabled={Boolean(questionExitPhase)}
                                      onChange={(event) => updateAnswer(activeQuestion.key, event.target.value)}
                                    />
                                  ) : (
                                    <Input
                                      className={cn(fieldClass, 'mt-2 w-full min-w-0 max-w-full')}
                                      value={answers[activeQuestion.key] || ''}
                                      placeholder={activeQuestion.placeholder || ''}
                                      disabled={Boolean(questionExitPhase)}
                                      autoComplete={resolveAutoComplete(activeQuestion.key)}
                                      inputMode={resolveInputMode(activeQuestion.key)}
                                      onChange={(event) => updateAnswer(activeQuestion.key, event.target.value)}
                                    />
                                  )}
                                </div>
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
                    )}
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
                        <p className="font-extrabold">
                          {requiresStatutes
                            ? (williamStatutesLoading ? 'Génération des statuts complets…' : 'Statuts complets (modèle William)')
                            : 'Aperçu du dossier déclaratif'}
                        </p>
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
                            <Button key={format} type="button" variant="outline" className="bg-white" onClick={() => void handleExportPreview(format)}>
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
                            <p className="text-xs text-muted-foreground">
                              {documentPreview.isFullStatutes
                                ? (documentPreview.previewMetaLine || `${documentPreview.clauseCount || 0} articles rédigés – document prêt à relire et exporter.`)
                                : 'Document structuré et prêt à compléter dans l’espace sécurisé.'}
                            </p>
                          </div>
                        </div>
                        <div className={`space-y-3 overflow-auto pr-2 ${documentPreview.isFullStatutes ? 'max-h-[32rem]' : 'max-h-72'}`}>
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
                          <Link to={resolveOfferLink({ offer, journey: data.journey, isAuthenticated })}>
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
            <div
              ref={wizardNavRef}
              className={cn(
                'z-30 border-t border-border bg-white/96 backdrop-blur-sm',
                isMobilePresentation
                  ? cn('fixed inset-x-0 px-3.5 py-2.5 shadow-[0_-4px_18px_rgba(15,23,42,0.05)]', mobileActionBarPosition)
                  : 'sticky bottom-0 px-4 py-4 shadow-[0_-10px_28px_rgba(15,23,42,0.06)] sm:px-6 sm:py-5 supports-[padding:max(0px)]:pb-[max(1rem,env(safe-area-inset-bottom))]',
              )}
              style={isMobilePresentation && keyboardOffset ? { transform: `translateY(-${keyboardOffset}px)` } : undefined}
            >
              <WizardNavButtons
                variant={isMobilePresentation ? 'mobile' : 'default'}
                hideBack={isMobilePresentation && step === 0}
                onBack={previous}
                onContinue={tryWizardContinue}
                backDisabled={step === 0 || isProjectBackDisabled}
                continueDisabled={
                  (step === 0 && !journeyChosen)
                  || (step === 1 && !canContinueProjectSubStep())
                  || (step === 2 && step2Phase === 'profile' && !isProfileQuestionValid())
                  || (step === 2 && step2Phase === 'questionnaire' && Boolean(questionExitPhase) && questionExitPhase !== 'done')
                  || (step === 2 && step2Phase === 'questionnaire' && !questionnaireFinished && !questionExitPhase && !canAdvanceActiveQuestion())
                }
                showContinue={!choiceTapNoContinue}
                continueLabel={
                  step === steps.length - 1
                    ? 'Voir les offres'
                    : isCompanyLookupStep
                      ? 'Continuer'
                    : step === 2 && step2Phase === 'profile'
                      ? (profileQuestionIndex < profileQuestions.length - 1 ? 'Question suivante' : 'Passer au questionnaire')
                    : step === 2 && step2Phase === 'questionnaire' && (questionnaireFinished || questionExitPhase === 'done')
                      ? 'Passer à la synthèse'
                    : step === 2 && step2Phase === 'questionnaire' && questionExitPhase
                      ? 'Validation…'
                    : step === 2 && step2Phase === 'questionnaire'
                      ? (isLastQuestion ? 'Étape suivante' : 'Continuer')
                    : isAccountCreationStep
                      ? (accountPhase === 'creating' ? 'Création…' : 'Créer mon espace')
                    : step === 1 && projectSubStep === 0 && contactStep < contactFields.length - 1
                      ? 'Question suivante'
                    : step === 1 && projectSubStep === 1 && isMobilePresentation && initiatorFieldStep < initiatorMobileSteps.length - 1
                      ? 'Question suivante'
                    : step === 1 && projectSubStep === 4 && isMobilePresentation && projectDetailIndex < PROJECT_DETAIL_FIELDS.length - 1
                      ? 'Question suivante'
                      : step === 1 && projectSubStep === PROJECT_SUB_STEPS.length - 1
                        ? 'Passer aux dirigeants'
                        : 'Continuer'
                }
              />
            </div>
          ) : (
            <div
              ref={wizardNavRef}
              className={cn(
                'z-30 border-t border-border bg-white/96 backdrop-blur-sm',
                isMobilePresentation
                  ? cn('fixed inset-x-0 px-5 py-3 shadow-[0_-4px_18px_rgba(15,23,42,0.05)]', mobileActionBarPosition)
                  : 'sticky bottom-0 px-4 py-4 shadow-[0_-10px_28px_rgba(15,23,42,0.06)] sm:px-6 sm:py-5 supports-[padding:max(0px)]:pb-[max(1rem,env(safe-area-inset-bottom))]',
              )}
            >
              <WizardNavButtons
                variant={isMobilePresentation ? 'mobile' : 'default'}
                onBack={previous}
                backLabel="Retour à la synthèse"
                showContinue={false}
              />
            </div>
          )}
        </section>

        {!isMobilePresentation ? (
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
            <p className="mt-2 text-sm font-medium leading-6 text-white/92">
              {eiLike
                ? 'Greffio vous envoie un résumé de votre démarche, les relances utiles et les offres adaptées à votre situation.'
                : 'Les statuts générés gratuitement permettent à Greffio de vous envoyer votre résumé, vos relances et les offres adaptées à votre situation.'}
            </p>
          </div>
        </aside>
        ) : null}
      </main>
    </div>
    </>
  );
};

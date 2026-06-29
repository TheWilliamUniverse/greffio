import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { ProgressCircle } from '@/components/questionnaire/ProgressCircle.jsx';
import { StepLayout } from '@/components/questionnaire/StepLayout.jsx';
import { QuestionBackButton } from '@/components/questionnaire/QuestionBackButton.jsx';
import { DemarchePicker } from '@/components/questionnaire/DemarchePicker.jsx';
import {
  MobileChoiceStep,
  MobileChoiceTile,
} from '@/components/questionnaire/MobileChoiceStep.jsx';
import { MobileInputStep } from '@/components/questionnaire/MobileInputStep.jsx';
import { MobileTextareaStep } from '@/components/questionnaire/MobileTextareaStep.jsx';
import { MobileCompositeStep } from '@/components/questionnaire/MobileCompositeStep.jsx';
import { LegalFormFamilyPicker } from '@/components/questionnaire/LegalFormFamilyPicker.jsx';
import { QuestionnaireComparatorStep } from '@/components/questionnaire/QuestionnaireComparatorStep.jsx';
import { AutosaveIndicator } from '@/components/questionnaire/AutosaveIndicator.jsx';
import { SecurityNotice } from '@/components/questionnaire/SecurityNotice.jsx';
import { QuestionnaireNotice } from '@/components/questionnaire/QuestionnaireNotice.jsx';
import { ProgressiveStepChips } from '@/components/ProgressiveStepChips.jsx';
import { AnimatePresence, motion } from 'framer-motion';
import {
  analyzeStepFieldStates,
  EXISTING_BUSINESS_FORMALITIES,
  QUESTIONNAIRE_FLOW,
  findPriorMissingBlockingField,
  getApplicableFlowSteps,
  getFieldValidationMessage,
  getFlowStepIndexById,
  getQuestionnaireProgressPercent,
  getVisibleFieldsForStep,
  groupIndexFromFieldKey,
  fieldIndexFromGroupIndex,
  inferDemarcheCategory,
  isFieldValueValid,
  isStepComplete,
  resolveMissingFieldCtaLabel,
  resolveMobileFieldGroups,
  resolveNextGroupWithPendingReturn,
  resolvePriorFieldBlockNotice,
  resolveResumePosition,
  resolveContinueBlockMessage,
} from '@/lib/questionnaireFlow.js';
import { PriorFieldGuide } from '@/components/questionnaire/PriorFieldGuide.jsx';
import {
  completeQuestionnaireStep,
  getQuestionnaireState,
  patchQuestionnaireState,
} from '@/api/questionnaire.js';
import { lookupCompanyBySiren } from '@/api/company.js';
import { createDossier, listDossiers } from '@/api/dossiers.js';
import { clearCurrentDossierId, getCurrentDossierId, saveCurrentDossierId } from '@/utils/sessionStore.js';
import { buildDossierBootstrap, isDossierQuestionnaireResumable, pickResumableDraftDossier } from '@/utils/dossierBootstrap.js';
import { isQuestionnaireExplicitResume, isQuestionnaireNewIntent } from '@/utils/questionnaireNavigation.js';
import { getProjectDraft } from '@/utils/localStorage.js';
import { runtimeConfig } from '@/config/runtime.js';
import { isEiLikeFormality, isStatutesSupportedForm } from '@/config/formalities.js';
import { AssociatesMobileWizard } from '@/components/questionnaire/AssociatesMobileWizard.jsx';
import { BeneficialOwnersPicker } from '@/components/questionnaire/BeneficialOwnersPicker.jsx';
import { CapitalLiberationPicker } from '@/components/questionnaire/CapitalLiberationPicker.jsx';
import { MobileBirthDatePicker } from '@/components/questionnaire/MobileBirthDatePicker.jsx';
import { BirthDateMinorEncouragement } from '@/components/BirthDateMinorEncouragement.jsx';
import { validateDirectorEligibility } from '@/config/minorAssociateRules.js';
import { syncDirigeantFromAssociates } from '@/utils/officerFromAssociates.js';
import { cn } from '@/lib/utils.js';
import { useAuth } from '@/hooks/useAuth.js';
import { isCapacitorNative, isCompactQuestionnaireViewport, isUnifiedQuestionnairePresentation } from '@/utils/platform.js';
import { fetchUserProfile } from '@/api/profile.js';
import { contactDetailsFromUser } from '@/utils/userProfile.js';
import {
  useQuestionnairePresentation,
  resolveFieldInputMode,
  resolveQuestionMode,
} from '@/hooks/useQuestionnairePresentation.js';
import { lightQuestionnaireHaptic } from '@/utils/questionnaireHaptics.js';
import {
  loadQuestionnaireDraftOffline,
  saveQuestionnaireDraftOffline,
} from '@/utils/mobileOffline.js';
import {
  getCatalogFormsForFamily,
  normalizeQuestionnaireFormFamilyFields,
  QUESTIONNAIRE_FORM_FAMILY_AUTRES,
} from '@/lib/questionnaireFormFamilies.js';
import { getFormAvailability, SERVICE_AVAILABILITY } from '@/config/catalog.js';
import {
  resolveDemarchePreset,
  resolveLegalFormFromContext,
  resolveServiceFromFormality,
  mapSimulatorDraftToQuestionnaire,
} from '@/utils/formalityMapping.js';

const QuestionnaireRecapPanel = lazy(() => import('@/components/questionnaire/QuestionnaireRecapPanel.jsx').then((module) => ({
  default: module.QuestionnaireRecapPanel,
})));

const defaultData = {
  initiatorType: 'personne_physique',
  firstName: '',
  lastName: '',
  nationality: 'Française',
  companyCountry: 'France',
  companySiren: '',
  companyName: '',
  companyRepresentative: '',
  existingBusinessSiren: '',
  existingBusinessName: '',
  email: '',
  phone: '',
  typeFormalite: '',
  formeJuridiqueFamillePrimary: '',
  formeJuridiqueFamilleSecondary: '',
  formeJuridiqueFamille: '',
  connaissezFormeJuridique: '',
  comparateurIgnore: false,
  formeJuridique: '',
  denomination: '',
  adresseSiege: '',
  codePostal: '',
  villeSiege: '',
  activite: '',
  capital: '',
  liberationCapital: '',
  apportsNature: '',
  detailApportsNature: '',
  repartition: '',
  associates: [],
  associesSummary: '',
  dirigeant: '',
  birthDate: '',
  beneficiairesEffectifs: '',
  beneficiairesEffectifsSelected: [],
  beneficiairesEffectifsAutre: '',
  validationConfirmed: false,
  recapAcknowledged: false,
};

const fieldClass = 'h-14 rounded-2xl border-2 border-border bg-white px-4 text-base font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/12';

const getFormAvailabilityLabel = (formKey) => {
  const availability = getFormAvailability(formKey);
  if (availability === SERVICE_AVAILABILITY.AVAILABLE_NOW) return 'Disponible';
  if (availability === SERVICE_AVAILABILITY.COMING_SOON) return 'Bientôt';
  return 'Sur devis';
};
const PROGRESSIVE_STEP_LABELS = Object.freeze({
  contact: 'Type de déclarant',
  demarche: 'Entreprise concernée',
  forme: 'Structure',
  entreprise: 'Informations',
  gouvernance: 'Associés',
  beneficiaires: 'Bénéficiaires',
  recap: 'Récapitulatif',
  validation: 'Validation',
});

const normalizeFormalityToService = (typeFormalite, formeJuridique) => (
  resolveServiceFromFormality(typeFormalite, formeJuridique)
);

const sanitizeSiren = (value) => String(value || '').replace(/\D/g, '').slice(0, 9);
const sanitizeCompanyIdentifier = (value) => String(value || '').replace(/\D/g, '').slice(0, 14);
const sanitizeAmountInput = (value) => String(value || '').replace(/[^\d.,]/g, '').replace(',', '.');
const makeUiReference = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let block = '';
  for (let index = 0; index < 6; index += 1) {
    block += chars[Math.floor(Math.random() * chars.length)];
  }
  return `GF-${block}`;
};
const isModernReference = (value) => /^GF-[A-Z0-9]{4,8}$/.test(String(value || ''));

export const QuestionnairePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [dossierId, setDossierId] = useState(getCurrentDossierId());
  const [reference, setReference] = useState(makeUiReference());
  const [formData, setFormData] = useState(defaultData);
  const [stepIndex, setStepIndex] = useState(0);
  const [groupIndex, setGroupIndex] = useState(0);
  const [autosaveState, setAutosaveState] = useState('idle');
  const wizardTopRef = useRef(null);
  const associatesWizardRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [stepError, setStepError] = useState('');
  const [priorFieldBlock, setPriorFieldBlock] = useState(null);
  const [pendingReturnPosition, setPendingReturnPosition] = useState(null);
  const [demarcheCategory, setDemarcheCategory] = useState('');
  const [demarcheCategoryConfirmed, setDemarcheCategoryConfirmed] = useState(false);
  const [touchedFields, setTouchedFields] = useState({});
  const pendingTapAdvanceRef = useRef(null);
  const [tapAdvanceSignal, setTapAdvanceSignal] = useState(0);
  const forceAdvanceAfterIgnoreRef = useRef(false);
  const navigationLockRef = useRef(false);

  const useUnifiedPresentation = isUnifiedQuestionnairePresentation();
  const isCompactViewport = isCompactQuestionnaireViewport();
  const step = QUESTIONNAIRE_FLOW[stepIndex];
  const visibleStepFields = useMemo(
    () => getVisibleFieldsForStep(step, formData),
    [step, formData],
  );
  const fieldGroups = useMemo(
    () => (useUnifiedPresentation
      ? resolveMobileFieldGroups(step, formData)
      : visibleStepFields.map((field) => [field])),
    [step, formData, visibleStepFields, useUnifiedPresentation],
  );
  const safeGroupIndex = fieldGroups.length
    ? Math.min(groupIndex, fieldGroups.length - 1)
    : 0;
  const activeGroup = fieldGroups[safeGroupIndex] || [];
  const activeField = activeGroup[0] || null;
  const isLastGroupInStep = fieldGroups.length > 0 && safeGroupIndex === fieldGroups.length - 1;
  const progressFieldIndex = safeGroupIndex;
  const progress = getQuestionnaireProgressPercent(
    formData,
    stepIndex,
    progressFieldIndex,
    { mobilePresentation: useUnifiedPresentation },
  );
  const canAdvanceCurrentGroup = useMemo(() => {
    if (!activeGroup.length) return false;
    return activeGroup.every((field) => {
      const valid = isFieldValueValid(field, formData[field.key], formData);
      if (field.key === 'dirigeant') {
        return valid && validateDirectorEligibility(formData).ok;
      }
      return valid;
    });
  }, [activeGroup, formData]);
  const stepFieldStates = useMemo(
    () => analyzeStepFieldStates(step, formData),
    [step, formData],
  );
  const canCompleteStep = (step.id === 'recap' || stepFieldStates.continueAllowed)
    && (step.id !== 'gouvernance' || validateDirectorEligibility(formData).ok || stepFieldStates.continueAllowed);
  const canContinue = isLastGroupInStep ? canCompleteStep : canAdvanceCurrentGroup;
  const presentation = useQuestionnairePresentation({
    activeGroup,
    step,
    formData,
    progressPercent: progress,
    safeGroupIndex,
    fieldGroups,
  });
  const hideContinueOnUnified = presentation.shouldHideStickyContinue;
  const isCompactStep = isCompactViewport && hideContinueOnUnified && activeGroup.length === 1;
  const isUnifiedFormalitePickerStep = useUnifiedPresentation
    && activeField?.key === 'typeFormalite'
    && activeGroup.length === 1;
  const choiceAdvanceHint = isCapacitorNative()
    ? 'Touchez votre réponse pour continuer.'
    : 'Cliquez votre réponse pour continuer.';
  const continueLabel = isLastGroupInStep && stepIndex >= QUESTIONNAIRE_FLOW.length - 1
    ? 'Terminer le questionnaire'
    : isLastGroupInStep
      ? 'Étape suivante'
      : 'Continuer';
  const progressiveSteps = useMemo(
    () => getApplicableFlowSteps(formData).map((flowStep) => ({
      id: flowStep.id,
      label: PROGRESSIVE_STEP_LABELS[flowStep.id] || flowStep.title,
    })),
    [formData],
  );
  const progressiveStepIndex = Math.max(
    0,
    progressiveSteps.findIndex((entry) => entry.id === step.id),
  );
  const stepTitle = activeField?.key === 'typeFormalite'
    ? 'Formalité'
    : (PROGRESSIVE_STEP_LABELS[step.id] || step.title);

  const contactPayload = useMemo(() => ({
    initiatorType: formData.initiatorType,
    firstName: formData.firstName,
    lastName: formData.lastName,
    nationality: formData.nationality,
    companyCountry: formData.companyCountry,
    companySiren: formData.companySiren,
    companyName: formData.companyName,
    companyRepresentative: formData.companyRepresentative,
    email: formData.email,
    phone: formData.phone,
  }), [
    formData.initiatorType,
    formData.firstName,
    formData.lastName,
    formData.nationality,
    formData.companyCountry,
    formData.companySiren,
    formData.companyName,
    formData.companyRepresentative,
    formData.email,
    formData.phone,
  ]);
  const eiLike = isEiLikeFormality({
    typeFormalite: formData.typeFormalite,
    formeJuridique: formData.formeJuridique,
  });

  const [sirenLookupState, setSirenLookupState] = useState('idle');
  const [sirenLookupMessage, setSirenLookupMessage] = useState('');
  const [foundCompany, setFoundCompany] = useState(null);
  const [foundCompanyFieldKey, setFoundCompanyFieldKey] = useState('companySiren');
  const lastAutoLookup = useRef('');
  const autosaveRequestId = useRef(0);
  const newQuestionnaireRef = useRef(isQuestionnaireNewIntent(searchParams));

  const ensureDossier = async ({ forceNew = false } = {}) => {
    const wantNew = forceNew || newQuestionnaireRef.current;
    if (!wantNew) {
      const existing = dossierId || getCurrentDossierId();
      if (existing) return existing;
    }
    const created = await createDossier({
      ...buildDossierBootstrap(
        {
          ...formData,
          legalForm: resolveLegalFormFromContext({
            formeJuridique: formData.formeJuridique,
            typeFormalite: formData.typeFormalite,
          }) || 'SASU',
          service: normalizeFormalityToService(formData.typeFormalite, formData.formeJuridique),
        },
        isAuthenticated ? user?.id || null : null,
        reference,
      ),
      forceNew: Boolean(wantNew),
    });
    const id = created?.dossier?.id || null;
    if (id) {
      saveCurrentDossierId(id);
      setDossierId(id);
      newQuestionnaireRef.current = false;
    }
    return id;
  };

  const syncDossierIdFromSave = (result, fallbackId) => {
    const resolvedId = result?.dossier?.id || fallbackId || null;
    if (resolvedId) {
      saveCurrentDossierId(resolvedId);
      setDossierId(resolvedId);
    }
    return resolvedId;
  };

  const buildPersistPayload = (data, resumeMeta = {}) => ({
    ...data,
    _resume: {
      ...(data._resume || {}),
      stepId: step?.id,
      fieldKey: activeField?.key || '',
      demarcheCategory: resumeMeta.demarcheCategory ?? demarcheCategory,
      categoryConfirmed: resumeMeta.categoryConfirmed ?? demarcheCategoryConfirmed,
      pendingReturn: pendingReturnPosition || null,
      ...(resumeMeta.associatesAssociateIndex != null
        ? { associatesAssociateIndex: resumeMeta.associatesAssociateIndex }
        : {}),
      ...(resumeMeta.associatesLocalStepIndex != null
        ? { associatesLocalStepIndex: resumeMeta.associatesLocalStepIndex }
        : {}),
    },
  });

  const persistQuestionnaire = async ({
    dataPatch,
    progressPercent,
    allowRecovery = true,
  }) => {
    let targetId = dossierId || getCurrentDossierId();
    if (!targetId) {
      targetId = await ensureDossier();
    }
    if (!targetId) {
      const error = new Error('DOSSIER_MISSING');
      error.code = 'DOSSIER_MISSING';
      throw error;
    }
    try {
      const result = await patchQuestionnaireState({
        dossierId: targetId,
        dataPatch,
        progressPercent,
      });
      const resolvedId = syncDossierIdFromSave(result, targetId);
      return { ...result, dossierId: resolvedId };
    } catch (error) {
      if (allowRecovery && (error?.status === 403 || error?.status === 404)) {
        clearCurrentDossierId();
        setDossierId(null);
        targetId = await ensureDossier({ forceNew: true });
        if (targetId) {
          const result = await patchQuestionnaireState({
            dossierId: targetId,
            dataPatch,
            progressPercent,
          });
          const resolvedId = syncDossierIdFromSave(result, targetId);
          return { ...result, dossierId: resolvedId };
        }
      }
      throw error;
    }
  };

  const mergeCompanyLookup = (current, company, fieldKey) => {
    const denomination = String(company?.denomination || '').trim();
    return {
      ...current,
      ...(fieldKey === 'existingBusinessSiren'
        ? {
            existingBusinessSiren: company.siren || current.existingBusinessSiren,
            existingBusinessName: denomination || current.existingBusinessName,
          }
        : {
            companySiren: company.siren || current.companySiren,
            companyName: denomination || current.companyName,
          }),
      ...(denomination ? { denomination } : {}),
      companyCountry: company.country || current.companyCountry,
      villeSiege: current.villeSiege || company.city || '',
      adresseSiege: current.adresseSiege || company.addressSiege || '',
      activite: current.activite || company.apeCode || '',
    };
  };

  const lookupSiren = async (fieldKey = 'companySiren') => {
    const value = sanitizeCompanyIdentifier(formData[fieldKey]);
    if (value.length !== 9 && value.length !== 14) return;
    try {
      setSirenLookupState('loading');
      setSirenLookupMessage('');
      const payload = await lookupCompanyBySiren(value);
      const company = payload?.company;
      if (company) {
        setFoundCompany(company);
        setFoundCompanyFieldKey(fieldKey);
        setFormData((current) => mergeCompanyLookup(current, company, fieldKey));
        setSirenLookupMessage(`${company.denomination || 'Entreprise trouvée'} (${company.siretSiege || company.siren || value})`);
      }
      setSirenLookupState('done');
    } catch (_error) {
      setSirenLookupState('error');
      setSirenLookupMessage(`Aucune entreprise trouvée pour ${value}. Essayez avec SIREN (9) ou SIRET (14).`);
    }
  };

  useEffect(() => {
    const autoLookupKey = formData.initiatorType === 'personne_morale'
      ? `company:${String(formData.companySiren || '').trim()}`
      : (EXISTING_BUSINESS_FORMALITIES.has(String(formData.typeFormalite || ''))
        ? `existing:${String(formData.existingBusinessSiren || '').trim()}`
        : '');
    if (!autoLookupKey) return;
    const [, siren] = autoLookupKey.split(':');
    if (!/^\d{9}$/.test(siren) && !/^\d{14}$/.test(siren)) return;
    if (lastAutoLookup.current === autoLookupKey) return;
    lastAutoLookup.current = autoLookupKey;
    const timeout = window.setTimeout(() => {
      void lookupSiren(autoLookupKey.startsWith('company:') ? 'companySiren' : 'existingBusinessSiren');
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [formData.initiatorType, formData.companySiren, formData.existingBusinessSiren, formData.typeFormalite]);

  useEffect(() => {
    const boot = async () => {
      try {
        let userForContact = null;
        if (isAuthenticated) {
          try {
            const profilePayload = await fetchUserProfile();
            userForContact = profilePayload?.user || null;
          } catch (_profileError) {
            userForContact = null;
          }
        }

        const startNewQuestionnaire = isQuestionnaireNewIntent(searchParams);
        const queryDossierId = isQuestionnaireExplicitResume(searchParams)
          ? String(searchParams.get('dossierId') || '').trim()
          : '';

        newQuestionnaireRef.current = startNewQuestionnaire;

        let mergedData = { ...defaultData };
        // Réponses déjà données (simulateur, signup) : préremplies pour ne jamais reposer
        // les mêmes questions. L'état du dossier (chargé plus bas) reste prioritaire.
        const simulatorDraft = getProjectDraft();
        if (simulatorDraft) {
          const mapped = mapSimulatorDraftToQuestionnaire(simulatorDraft);
          const nonEmpty = Object.fromEntries(
            Object.entries(mapped).filter(([, value]) => value !== '' && value != null),
          );
          mergedData = { ...mergedData, ...nonEmpty };
        }

        let currentDossierId = null;

        if (startNewQuestionnaire) {
          clearCurrentDossierId();
          setDossierId(null);
          setReference(makeUiReference());
        } else if (queryDossierId) {
          currentDossierId = queryDossierId;
          saveCurrentDossierId(queryDossierId);
          setDossierId(queryDossierId);
        } else {
          const storedId = getCurrentDossierId();
          if (storedId && isAuthenticated) {
            try {
              const payload = await listDossiers();
              const storedEntry = (payload?.dossiers || []).find((entry) => entry.id === storedId);
              if (storedEntry && isDossierQuestionnaireResumable(storedEntry)) {
                currentDossierId = storedId;
              } else {
                clearCurrentDossierId();
              }
            } catch (_storedError) {
              clearCurrentDossierId();
            }
          }
          if (!currentDossierId && isAuthenticated) {
            try {
              const payload = await listDossiers();
              const resumable = pickResumableDraftDossier(payload?.dossiers || []);
              if (resumable?.id) {
                currentDossierId = resumable.id;
              }
            } catch (_listError) {
              // Pas bloquant : le dossier sera créé au premier enregistrement.
            }
          }
          if (currentDossierId) {
            saveCurrentDossierId(currentDossierId);
            setDossierId(currentDossierId);
          }
        }

        if (currentDossierId) {
          let state;
          try {
            state = await getQuestionnaireState(currentDossierId);
          } catch (loadError) {
            if (loadError?.status === 403 || loadError?.status === 404) {
              clearCurrentDossierId();
              setDossierId(null);
              currentDossierId = null;
            } else {
              throw loadError;
            }
          }
          if (!currentDossierId) {
            // Ne pas créer de dossier fantôme au simple chargement : création au premier enregistrement via ensureDossier().
          }
          if (currentDossierId && state) {
            const fromApi = state.reference || state?.dossier?.reference || '';
            setReference(isModernReference(fromApi) ? fromApi : makeUiReference());
            let offlineQuestionnaire = null;
            if (isCapacitorNative()) {
              try {
                const draft = await loadQuestionnaireDraftOffline({
                  userId: userForContact?.id || user?.id || 'anonymous',
                  dossierId: currentDossierId,
                });
                if (draft?.data && typeof draft.data === 'object') {
                  offlineQuestionnaire = draft.data;
                }
              } catch (_offlineError) {
                offlineQuestionnaire = null;
              }
            }
            mergedData = {
              ...mergedData,
              ...(state.questionnaire || {}),
              ...(offlineQuestionnaire || {}),
            };
          }
        }

        const prefillSiren = String(searchParams.get('prefillSiren') || '').replace(/\D/g, '');
        if (prefillSiren.length === 9 || prefillSiren.length === 14) {
          mergedData = {
            ...mergedData,
            companySiren: prefillSiren,
            initiatorType: 'personne_morale',
          };
        }

        const accountContact = contactDetailsFromUser(userForContact);
        if (accountContact) {
          mergedData = {
            ...mergedData,
            firstName: accountContact.firstName || mergedData.firstName,
            lastName: accountContact.lastName || mergedData.lastName,
            email: accountContact.email || mergedData.email,
            phone: accountContact.phone || (isAuthenticated ? '' : mergedData.phone),
          };
        }

        // Nouveau questionnaire : on saute les questions d'identité déjà connues
        // (compte, simulateur, signup) pour aller droit aux questions primordiales.
        // Le type de déclarant n'est sauté que s'il a été choisi explicitement (signup/simulateur).
        const initiatorTypeExplicit = Boolean(simulatorDraft?.data?.initiatorType);
        const resolveNewStartPosition = (data) => {
          if (!initiatorTypeExplicit) return { stepIndex: 0, fieldIndex: 0 };
          const contactStep = QUESTIONNAIRE_FLOW[0];
          const contactStepFields = getVisibleFieldsForStep(contactStep, data);
          const firstInvalid = contactStepFields.findIndex(
            (field) => !isFieldValueValid(field, data[field.key], data),
          );
          if (firstInvalid >= 0) {
            const groups = resolveMobileFieldGroups(contactStep, data);
            const groupIdx = groupIndexFromFieldKey(
              groups,
              contactStepFields[firstInvalid]?.key,
            );
            return { stepIndex: 0, fieldIndex: groupIdx };
          }
          const applicable = getApplicableFlowSteps(data);
          const contactPos = applicable.findIndex((entry) => entry.id === 'contact');
          const nextStep = contactPos >= 0 ? applicable[contactPos + 1] : null;
          const nextStepIndex = nextStep
            ? QUESTIONNAIRE_FLOW.findIndex((entry) => entry.id === nextStep.id)
            : 0;
          return { stepIndex: Math.max(nextStepIndex, 0), fieldIndex: 0 };
        };

        const resume = mergedData._resume || {};
        mergedData = normalizeQuestionnaireFormFamilyFields(mergedData);
        const resumeResult = startNewQuestionnaire
          ? { ...resolveNewStartPosition(mergedData), demarcheCategory: inferDemarcheCategory(mergedData.typeFormalite), categoryConfirmed: false }
          : resolveResumePosition(mergedData, resume);

        if (resumeResult.questionnaireAlreadyValidated && currentDossierId) {
          const form = String(mergedData.formeJuridique || '').toUpperCase();
          const eiLikeResume = isEiLikeFormality(mergedData);
          if (!eiLikeResume && isStatutesSupportedForm(form)) {
            navigate(`/statuts?dossierId=${encodeURIComponent(currentDossierId)}`, { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
          return;
        }

        const {
          stepIndex: resumeStep,
          fieldIndex: resumeField,
          demarcheCategory: resumeCategory,
          categoryConfirmed,
        } = resumeResult;

        const resumeStepDef = QUESTIONNAIRE_FLOW[resumeStep] || QUESTIONNAIRE_FLOW[0];
        const resumeGroups = resolveMobileFieldGroups(resumeStepDef, mergedData);
        const resumeGroupIndex = groupIndexFromFieldKey(
            resumeGroups,
            resume.fieldKey || getVisibleFieldsForStep(resumeStepDef, mergedData)[resumeField]?.key,
          );

        setFormData(mergedData);
        setStepIndex(resumeStep);
        setGroupIndex(resumeGroupIndex);
        if (resume.pendingReturn) {
          setPendingReturnPosition(resume.pendingReturn);
        }
        setDemarcheCategory(resumeCategory || inferDemarcheCategory(mergedData.typeFormalite));
        setDemarcheCategoryConfirmed(startNewQuestionnaire ? false : categoryConfirmed);
      } catch (_error) {
        // Keep graceful UI fallback.
      } finally {
        setLoading(false);
      }
    };
    void boot();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isAuthenticated]);

  useEffect(() => {
    if (!useUnifiedPresentation || loading || !activeField?.key || priorFieldBlock) return undefined;
    if (!isLastGroupInStep || canCompleteStep) return undefined;
    const priorMissing = findPriorMissingBlockingField(
      formData,
      step.id,
      activeField.key,
      { mobilePresentation: useUnifiedPresentation },
    );
    if (priorMissing) {
      setPriorFieldBlock(priorMissing);
    }
    return undefined;
  }, [
    useUnifiedPresentation,
    loading,
    activeField?.key,
    priorFieldBlock,
    isLastGroupInStep,
    canCompleteStep,
    formData,
    step.id,
  ]);

  useEffect(() => {
    if (!dossierId || loading) return undefined;
    const timeout = window.setTimeout(async () => {
      const requestId = autosaveRequestId.current + 1;
      autosaveRequestId.current = requestId;
      try {
        setAutosaveState('saving');
        await persistQuestionnaire({
          dataPatch: buildPersistPayload(formData),
          progressPercent: progress,
        });
        if (isCapacitorNative()) {
          await saveQuestionnaireDraftOffline({
            userId: user?.id || 'anonymous',
            dossierId,
            data: buildPersistPayload(formData),
          });
        }
        if (autosaveRequestId.current !== requestId) return;
        setAutosaveState('saved');
        setStepError((current) => (
          current && current.includes('enregistrement') ? '' : current
        ));
      } catch (error) {
        if (autosaveRequestId.current !== requestId) return;
        if (error?.status === 401) {
          setAutosaveState('idle');
          return;
        }
        if (isCapacitorNative()) {
          try {
            await saveQuestionnaireDraftOffline({
              userId: user?.id || 'anonymous',
              dossierId,
              data: buildPersistPayload(formData),
            });
            setAutosaveState('saved');
            return;
          } catch (_offlineError) {
            // Keep visible save error if local fallback also fails.
          }
        }
        setAutosaveState('error');
      }
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [dossierId, formData, progress, loading]);

  useEffect(() => {
    if (groupIndex !== safeGroupIndex) {
      setGroupIndex(safeGroupIndex);
    }
  }, [groupIndex, safeGroupIndex]);

  useEffect(() => {
    if (loading || fieldGroups.length > 0) return;
    let next = stepIndex + 1;
    while (next < QUESTIONNAIRE_FLOW.length) {
      const nextStep = QUESTIONNAIRE_FLOW[next];
      if (getVisibleFieldsForStep(nextStep, formData).length) {
        setStepIndex(next);
        setGroupIndex(0);
        return;
      }
      next += 1;
    }
  }, [loading, stepIndex, fieldGroups.length, formData]);

  useEffect(() => {
    wizardTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [stepIndex, safeGroupIndex]);

  useEffect(() => {
    const pendingKey = pendingTapAdvanceRef.current;
    if (!pendingKey || !useUnifiedPresentation) return undefined;
    if (navigationLockRef.current) return undefined;
    if (!activeGroup.some((field) => field.key === pendingKey)) return undefined;
    if (!canAdvanceCurrentGroup) return undefined;
    pendingTapAdvanceRef.current = null;
    const timer = window.setTimeout(() => {
      if (navigationLockRef.current) return;
      void goNext();
    }, 320);
    return () => window.clearTimeout(timer);
  }, [formData, activeGroup, canAdvanceCurrentGroup, useUnifiedPresentation, tapAdvanceSignal]);

  useEffect(() => {
    if (!forceAdvanceAfterIgnoreRef.current || !formData.comparateurIgnore || step.id !== 'forme') return undefined;
    if (!isStepComplete(step, formData)) return undefined;
    forceAdvanceAfterIgnoreRef.current = false;
    const timer = window.setTimeout(() => {
      void goNext();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [formData, formData.comparateurIgnore, step]);

  const updateField = (field, value) => {
    if ((field.key === 'companySiren' || field.key === 'existingBusinessSiren') && String(value || '').trim() !== String(formData[field.key] || '').trim()) {
      setFoundCompany(null);
      setSirenLookupMessage('');
      setSirenLookupState('idle');
    }
    setFormData((current) => {
      const next = {
        ...current,
        [field.key]: field.type === 'checkbox' ? Boolean(value) : value,
      };
      if (field.key === 'typeFormalite') {
        const preset = resolveDemarchePreset(value);
        if (preset.formeJuridique) next.formeJuridique = preset.formeJuridique;
        next.formeJuridiqueFamillePrimary = '';
        next.formeJuridiqueFamilleSecondary = '';
        next.formeJuridiqueFamille = '';
        next.connaissezFormeJuridique = '';
        next.comparateurIgnore = false;
      }
      if (field.key === 'formeJuridiqueFamillePrimary') {
        next.connaissezFormeJuridique = '';
        next.comparateurIgnore = false;
        next.formeJuridique = '';
        next.formeJuridiqueFamilleSecondary = '';
        if (value === QUESTIONNAIRE_FORM_FAMILY_AUTRES) {
          next.formeJuridiqueFamille = '';
        } else {
          next.formeJuridiqueFamille = value;
        }
      }
      if (field.key === 'formeJuridiqueFamilleSecondary') {
        next.formeJuridiqueFamille = value;
        next.formeJuridiqueFamilleSecondary = value;
        next.connaissezFormeJuridique = '';
        next.comparateurIgnore = false;
        next.formeJuridique = '';
      }
      if (field.key === 'connaissezFormeJuridique') {
        next.comparateurIgnore = false;
        if (value !== 'oui') next.formeJuridique = '';
      }
      if (field.key === 'apportsNature' && String(value || '').trim() !== 'Oui') {
        next.detailApportsNature = '';
      }
      return next;
    });
  };

  const requestTapAdvance = (fieldKey) => {
    if (!useUnifiedPresentation) return;
    pendingTapAdvanceRef.current = fieldKey;
    setTapAdvanceSignal((current) => current + 1);
  };

  const handleTapFieldUpdate = (field, value) => {
    if (navigationLockRef.current) return;
    void lightQuestionnaireHaptic();
    updateField(field, value);
    requestTapAdvance(field.key);
  };

  const goToField = (targetStepId, targetFieldKey) => {
    const targetStepIndex = getFlowStepIndexById(targetStepId);
    const targetStep = QUESTIONNAIRE_FLOW[targetStepIndex];
    if (!targetStep) return;
    const targetGroups = useUnifiedPresentation
      ? resolveMobileFieldGroups(targetStep, formData)
      : getVisibleFieldsForStep(targetStep, formData).map((field) => [field]);
    const targetGroupIndex = groupIndexFromFieldKey(targetGroups, targetFieldKey);
    setStepError('');
    setPriorFieldBlock(null);
    setTouchedFields({});
    setStepIndex(targetStepIndex);
    setGroupIndex(targetGroupIndex);
  };

  const navigateToPriorField = () => {
    if (!priorFieldBlock) return;
    void lightQuestionnaireHaptic();
    if (!pendingReturnPosition && activeField?.key) {
      setPendingReturnPosition({ stepId: step.id, fieldKey: activeField.key });
    }
    goToField(priorFieldBlock.stepId, priorFieldBlock.fieldKey);
  };

  const goNext = async () => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    try {
      setStepError('');
      setPriorFieldBlock(null);
      if (!canContinue) {
        if (isLastGroupInStep && useUnifiedPresentation && activeField?.key) {
          const priorMissing = findPriorMissingBlockingField(
            formData,
            step.id,
            activeField.key,
            { mobilePresentation: useUnifiedPresentation },
          );
          if (priorMissing) {
            setPendingReturnPosition((current) => current || {
              stepId: step.id,
              fieldKey: activeField.key,
            });
            setPriorFieldBlock(priorMissing);
            return;
          }
        }
        const message = resolveContinueBlockMessage(step, formData, activeField, visibleStepFields);
        setStepError(message);
        if (activeField?.key) {
          setTouchedFields((current) => ({ ...current, [activeField.key]: true }));
        }
        if (message) toast.error(message);
        return;
      }
      if (!isLastGroupInStep) {
        const advancePlan = resolveNextGroupWithPendingReturn(
          formData,
          step,
          safeGroupIndex,
          pendingReturnPosition,
          { mobilePresentation: useUnifiedPresentation },
        );
        setTouchedFields({});
        if (advancePlan.type === 'return') {
          setGroupIndex(advancePlan.groupIndex);
          setPendingReturnPosition(null);
          return;
        }
        if (advancePlan.type === 'skip-to') {
          setGroupIndex(advancePlan.groupIndex);
          return;
        }
        setGroupIndex((current) => Math.min(current + 1, fieldGroups.length - 1));
        return;
      }
      try {
        setAutosaveState('saving');
        const basePayload = step.id === 'contact' ? { ...formData, ...contactPayload } : formData;
        const persistData = step.id === 'recap'
          ? { ...basePayload, recapAcknowledged: true }
          : basePayload;
        const saveResult = await persistQuestionnaire({
          dataPatch: buildPersistPayload(persistData),
          progressPercent: progress,
        });
        const activeDossierId = saveResult?.dossierId || getCurrentDossierId();
        if (!activeDossierId) {
          setStepError('Impossible de créer le dossier. Rechargez la page.');
          setAutosaveState('error');
          return;
        }
        await completeQuestionnaireStep({
          dossierId: activeDossierId,
          stepId: step.id,
          dataPatch: buildPersistPayload(persistData),
          progressPercent: progress,
          continueWithWarnings: stepFieldStates.missingButContinueAllowed,
          missingFieldKeys: stepFieldStates.softMissing.map((item) => item.key),
        });
        setAutosaveState('saved');
      } catch (error) {
        const apiError = error?.payload?.error || error?.message;
        if (apiError === 'DOSSIER_FORBIDDEN') {
          clearCurrentDossierId();
          setDossierId(null);
          setStepError('Ce dossier n’est pas rattaché à votre compte. Réessayez : un nouveau dossier sera créé.');
        } else if (apiError === 'QUESTIONNAIRE_SOFT_MISSING') {
          setStepError('Certains champs facultatifs restent à compléter – vous pouvez continuer et les finaliser plus tard.');
        } else if (apiError === 'QUESTIONNAIRE_BLOCKING_FIELDS') {
          setStepError('Des informations essentielles manquent pour constituer le dossier.');
        } else if (apiError === 'IDENTITY_VERIFICATION_REQUIRED') {
          setStepError("La vérification d'identité sera demandée avant le dépôt officiel, pas à cette étape.");
        } else if (apiError === 'QUESTIONNAIRE_SAVE_FAILED') {
          setStepError(error?.payload?.message || "L'enregistrement a échoué côté serveur. Réessayez dans un instant.");
        } else if (apiError === 'AUTH_TOKEN_MISSING' || error?.status === 401) {
          setStepError('Session expirée. Reconnectez-vous puis réessayez.');
        } else {
          setStepError("Une erreur est survenue pendant l'enregistrement. Réessayez.");
        }
        setAutosaveState('error');
        toast.error('Enregistrement impossible pour le moment.');
        return;
      }

      if (stepIndex >= QUESTIONNAIRE_FLOW.length - 1) {
        const resolvedDossierId = dossierId || getCurrentDossierId();
        toast.success('Questionnaire validé – vos données sont enregistrées.');
        const form = String(formData.formeJuridique || '').toUpperCase();
        if (!eiLike && isStatutesSupportedForm(form) && resolvedDossierId) {
          navigate(`/statuts?dossierId=${encodeURIComponent(resolvedDossierId)}`);
        } else {
          navigate('/dashboard');
        }
        return;
      }
      if (pendingReturnPosition) {
        const returnStepIndex = getFlowStepIndexById(pendingReturnPosition.stepId);
        const returnStep = QUESTIONNAIRE_FLOW[returnStepIndex];
        if (returnStep) {
          const stillMissing = findPriorMissingBlockingField(
            formData,
            pendingReturnPosition.stepId,
            pendingReturnPosition.fieldKey,
            { mobilePresentation: useUnifiedPresentation },
          );
          if (!stillMissing) {
            const returnGroups = useUnifiedPresentation
              ? resolveMobileFieldGroups(returnStep, formData)
              : getVisibleFieldsForStep(returnStep, formData).map((field) => [field]);
            const returnGroupIndex = groupIndexFromFieldKey(
              returnGroups,
              pendingReturnPosition.fieldKey,
            );
            setTouchedFields({});
            setStepIndex(returnStepIndex);
            setGroupIndex(returnGroupIndex);
            setPendingReturnPosition(null);
            return;
          }
          goToField(stillMissing.stepId, stillMissing.fieldKey);
          return;
        }
      }
      let nextIndex = stepIndex + 1;
      const applicableSteps = getApplicableFlowSteps(formData);
      while (nextIndex < QUESTIONNAIRE_FLOW.length) {
        const nextStep = QUESTIONNAIRE_FLOW[nextIndex];
        if (!applicableSteps.some((entry) => entry.id === nextStep.id)) {
          nextIndex += 1;
          continue;
        }
        const visibleFields = getVisibleFieldsForStep(nextStep, formData);
        if (visibleFields.length) break;
        nextIndex += 1;
      }
      setTouchedFields({});
      setStepIndex(nextIndex);
      setGroupIndex(0);
    } finally {
      navigationLockRef.current = false;
    }
  };

  const goBack = () => {
    if (
      step.id === 'gouvernance'
      && activeField?.type === 'associates_minor_panel'
      && associatesWizardRef.current?.canGoBackLocally?.()
    ) {
      associatesWizardRef.current.goBackLocally();
      return;
    }
    if (
      (step.id === 'contact' || step.id === 'demarche')
      && isAuthenticated
      && demarcheCategoryConfirmed
      && activeField?.key === 'typeFormalite'
    ) {
      setDemarcheCategoryConfirmed(false);
      if (demarcheCategory === 'creation') {
        setDemarcheCategory('');
      }
      setFormData((current) => ({ ...current, typeFormalite: '' }));
      return;
    }
    if (safeGroupIndex > 0) {
      setGroupIndex((current) => Math.max(0, current - 1));
      return;
    }
    if (stepIndex <= 0) return;
    let prev = stepIndex - 1;
    const applicableSteps = getApplicableFlowSteps(formData);
    while (prev >= 0) {
      const prevStep = QUESTIONNAIRE_FLOW[prev];
      if (!applicableSteps.some((entry) => entry.id === prevStep.id)) {
        prev -= 1;
        continue;
      }
      const prevGroups = useUnifiedPresentation
        ? resolveMobileFieldGroups(prevStep, formData)
        : getVisibleFieldsForStep(prevStep, formData).map((field) => [field]);
      if (prevGroups.length) {
        setStepIndex(prev);
        setGroupIndex(prevGroups.length - 1);
        return;
      }
      prev -= 1;
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-md border border-border bg-white p-8 text-sm text-muted-foreground">Chargement du questionnaire...</div>
      </div>
    );
  }

  const renderMobileInputStep = (field, {
    value,
    invalid,
    inlineMessage,
    inputType = 'text',
    inputMode,
    subtitle,
    hint = isCompactStep ? 'Touchez la flèche pour continuer.' : 'Appuyez sur Suivant lorsque c’est prêt.',
    extra,
    onChangeOverride,
  }) => {
    const isNumericField = field.type === 'number' || field.key === 'capital';
    const validationValue = formData[field.key] ?? value;
    return (
    <MobileInputStep
      key={field.key}
      kicker={PROGRESSIVE_STEP_LABELS[step.id] || step.title}
      title={`${field.label}${field.required ? ' *' : ''}`}
      subtitle={subtitle}
      hint={hint}
      progressPercent={progress}
      stepCurrent={presentation.stepCurrent}
      stepTotal={presentation.stepTotal}
      fieldId={field.key}
      value={value}
      placeholder={field.placeholder || ''}
      inputMode={inputMode || (isNumericField ? 'decimal' : resolveFieldInputMode(field))}
      inputType={isNumericField ? 'text' : inputType}
      compact={isCompactStep}
      showProgressBar={!isCompactStep}
      showStepMeta={!isCompactStep}
      canAdvance={!invalid && isFieldValueValid(field, validationValue, formData)}
      invalid={invalid}
      errorMessage={invalid ? inlineMessage : ''}
      onChange={(nextValue) => {
        if (onChangeOverride) {
          onChangeOverride(nextValue);
          return;
        }
        const sanitized = field.key === 'companySiren' || field.key === 'existingBusinessSiren'
          ? sanitizeCompanyIdentifier(nextValue)
          : isNumericField
            ? sanitizeAmountInput(nextValue)
            : nextValue;
        updateField(field, sanitized);
      }}
      onAdvance={goNext}
    >
      {extra}
    </MobileInputStep>
    );
  };

  const renderQuestionField = (field) => {
    if (!field) return null;

    if (field.type === 'recap_summary') {
      return (
        <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement du récapitulatif…</p>}>
          <QuestionnaireRecapPanel formData={formData} />
        </Suspense>
      );
    }

    if (field.type === 'form_family_picker' || field.type === 'form_family_secondary_picker') {
      const isSecondary = field.type === 'form_family_secondary_picker';
      const pickerValue = isSecondary
        ? (formData.formeJuridiqueFamilleSecondary || formData.formeJuridiqueFamille || '')
        : (formData.formeJuridiqueFamillePrimary || '');
      return (
        <div key={field.key}>
          <LegalFormFamilyPicker
            tier={isSecondary ? 'secondary' : 'primary'}
            value={pickerValue}
            onSelect={(family) => handleTapFieldUpdate(field, family)}
            mobilePresentation={useUnifiedPresentation}
            progressPercent={progress}
            stepCurrent={presentation.stepCurrent}
            stepTotal={presentation.stepTotal}
          />
        </div>
      );
    }

    if (field.type === 'comparateur_cta') {
      return (
        <QuestionnaireComparatorStep
          key={field.key}
          mobilePresentation={useUnifiedPresentation}
          progressPercent={progress}
          stepCurrent={presentation.stepCurrent}
          stepTotal={presentation.stepTotal}
          onIgnore={() => {
            forceAdvanceAfterIgnoreRef.current = true;
            setFormData((current) => ({
              ...current,
              comparateurIgnore: true,
              formeJuridique: current.formeJuridique || 'AUTRE',
            }));
          }}
        />
      );
    }

    if (field.type === 'capital_liberation_picker') {
      return (
        <CapitalLiberationPicker
          key={field.key}
          value={formData.liberationCapital || ''}
          capitalAmount={formData.capital || ''}
          onChange={(nextValue) => updateField(field, nextValue)}
          onAdvance={() => requestTapAdvance(field.key)}
          mobilePresentation={useUnifiedPresentation}
          kicker={PROGRESSIVE_STEP_LABELS[step.id] || step.title}
          label={field.label}
          required={field.required}
          progressPercent={progress}
          stepCurrent={presentation.stepCurrent}
          stepTotal={presentation.stepTotal}
        />
      );
    }

    if (field.key === 'formeJuridique' && formData.formeJuridiqueFamille) {
      const forms = getCatalogFormsForFamily(formData.formeJuridiqueFamille);
      return (
        <MobileChoiceStep
          key={field.key}
          kicker={formData.formeJuridiqueFamille}
          title={`${field.label}${field.required ? ' *' : ''}`}
          subtitle="Choisissez la forme qui correspond le mieux à votre projet."
          hint={choiceAdvanceHint}
          progressPercent={progress}
          stepCurrent={presentation.stepCurrent}
          stepTotal={presentation.stepTotal}
          gridClassName="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {forms.map((form) => {
            const availabilityLabel = getFormAvailabilityLabel(form.key);
            return (
              <MobileChoiceTile
                key={form.key}
                title={form.label}
                description={`${availabilityLabel} · ${form.description}`}
                selected={String(formData.formeJuridique || '') === String(form.label)}
                onSelect={() => handleTapFieldUpdate(field, form.label)}
              />
            );
          })}
        </MobileChoiceStep>
      );
    }

    if (field.type === 'select') {
      const options = field.options || [];
      const normalizedOptions = options.map((option) => (
        typeof option === 'string'
          ? { value: option, label: option }
          : { value: option.key, label: option.label }
      ));

      if (field.key === 'typeFormalite') {
        return (
          <div key={field.key}>
            <DemarchePicker
              value={formData.typeFormalite}
              onChange={(nextValue) => updateField(field, nextValue)}
              categoryFirst={isAuthenticated}
              primaryCategory={demarcheCategory}
              onPrimaryCategoryChange={setDemarcheCategory}
              categoryConfirmed={demarcheCategoryConfirmed}
              onCategoryConfirmedChange={setDemarcheCategoryConfirmed}
              mobilePresentation={useUnifiedPresentation}
              onAdvance={() => requestTapAdvance('typeFormalite')}
              progressPercent={progress}
              stepCurrent={fieldGroups.length > 1 ? safeGroupIndex + 1 : undefined}
              stepTotal={fieldGroups.length > 1 ? fieldGroups.length : undefined}
            />
          </div>
        );
      }

      return (
        <MobileChoiceStep
          key={field.key}
          kicker={PROGRESSIVE_STEP_LABELS[step.id] || step.title}
          title={`${field.label}${field.required ? ' *' : ''}`}
          subtitle={step.description}
          hint={choiceAdvanceHint}
          progressPercent={progress}
          stepCurrent={fieldGroups.length > 1 ? safeGroupIndex + 1 : undefined}
          stepTotal={fieldGroups.length > 1 ? fieldGroups.length : undefined}
          gridClassName={normalizedOptions.length === 2
            ? 'grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3'
            : 'grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3'}
        >
          {normalizedOptions.map((option) => (
            <MobileChoiceTile
              key={option.value}
              title={option.label}
              selected={String(formData[field.key] || '') === String(option.value)}
              onSelect={() => handleTapFieldUpdate(field, option.value)}
            />
          ))}
        </MobileChoiceStep>
      );
    }

    if (field.type === 'checkbox') {
      const yesSelected = Boolean(formData[field.key]);
      return (
        <MobileChoiceStep
          key={field.key}
          kicker={PROGRESSIVE_STEP_LABELS[step.id] || step.title}
          title={field.label}
          subtitle={step.description}
          hint={choiceAdvanceHint}
          progressPercent={progress}
          stepCurrent={fieldGroups.length > 1 ? safeGroupIndex + 1 : undefined}
          stepTotal={fieldGroups.length > 1 ? fieldGroups.length : undefined}
          gridClassName="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3"
        >
          <MobileChoiceTile
            title="Oui"
            selected={yesSelected}
            onSelect={() => handleTapFieldUpdate(field, true)}
          />
          <MobileChoiceTile
            title="Non"
            selected={!yesSelected && formData[field.key] === false}
            onSelect={() => handleTapFieldUpdate(field, false)}
          />
        </MobileChoiceStep>
      );
    }

    if (field.type === 'beneficial_owners_picker') {
      return (
        <BeneficialOwnersPicker
          key={field.key}
          formData={formData}
          selectedIds={formData.beneficiairesEffectifsSelected || []}
          summaryText={formData.beneficiairesEffectifs || ''}
          otherName={formData.beneficiairesEffectifsAutre || ''}
          fieldClass={fieldClass}
          mobilePresentation={useUnifiedPresentation}
          compositeStepProps={useUnifiedPresentation ? {
            kicker: PROGRESSIVE_STEP_LABELS[step.id] || step.title,
            title: `${field.label}${field.required ? ' *' : ''}`,
            subtitle: step.description,
            progressPercent: progress,
            stepCurrent: presentation.stepCurrent,
            stepTotal: presentation.stepTotal,
          } : null}
          onAdvance={() => { void goNext(); }}
          onChange={(patch) => setFormData((current) => ({ ...current, ...patch }))}
        />
      );
    }

    if (field.type === 'associates_minor_panel') {
      const handleAssociatesChange = (patch) => setFormData((current) => {
        const associates = patch.associates ?? current.associates;
        return {
          ...current,
          ...patch,
          dirigeant: syncDirigeantFromAssociates(associates, current.dirigeant),
          repartition: patch.associesSummary || current.repartition,
        };
      });

      return (
        <AssociatesMobileWizard
          ref={associatesWizardRef}
          key={field.key}
          value={formData.associates}
          resumePosition={formData._resume}
          onResumePositionChange={(patch) => setFormData((current) => ({
            ...current,
            _resume: { ...(current._resume || {}), ...patch },
          }))}
          onChange={handleAssociatesChange}
          progressPercent={progress}
          stepCurrent={presentation.stepCurrent}
          stepTotal={presentation.stepTotal}
          onComplete={() => { void goNext(); }}
        />
      );
    }

    if (field.key === 'dirigeant') {
      const directorCheck = validateDirectorEligibility(formData);
      const showDirectorError = touchedFields.dirigeant && !directorCheck.ok;
      const directorValue = formData.dirigeant || '';
      const directorInvalid = field.required && !isFieldValueValid(field, directorValue, formData);
      return renderMobileInputStep(field, {
        value: directorValue,
        invalid: showDirectorError || (touchedFields.dirigeant && directorInvalid),
        inlineMessage: showDirectorError ? directorCheck.message : getFieldValidationMessage(field, directorValue, formData),
      });
    }

    if (field.type === 'date') {
      const dateValue = formData[field.key] || '';
      const showLegalHint = field.key === 'birthDate';
      const dateInvalid = field.required && !isFieldValueValid(field, dateValue, formData);
      const showInlineError = touchedFields[field.key] && dateInvalid;
      const inlineMessage = getFieldValidationMessage(field, dateValue, formData);
      if (field.key === 'birthDate') {
        return (
          <MobileBirthDatePicker
            key={field.key}
            value={dateValue}
            invalid={showInlineError}
            errorMessage={showInlineError ? inlineMessage : ''}
            canAdvance={!dateInvalid}
            onChange={(nextValue) => updateField(field, nextValue)}
            onAdvance={goNext}
            extra={showLegalHint ? <BirthDateMinorEncouragement birthDate={dateValue} showLegalHint /> : null}
          />
        );
      }
      return renderMobileInputStep(field, {
        value: dateValue,
        invalid: showInlineError,
        inlineMessage,
        inputType: 'date',
        extra: showLegalHint ? <BirthDateMinorEncouragement birthDate={dateValue} showLegalHint /> : null,
      });
    }

    const value = formData[field.key] ?? '';
    const invalid = field.required && !isFieldValueValid(field, value, formData);
    const showInlineError = touchedFields[field.key] && invalid;
    const inlineMessage = getFieldValidationMessage(field, value, formData);
    const isSirenField = field.key === 'companySiren' || field.key === 'existingBusinessSiren';
    const mobileInputHint = field.key === 'email'
      ? 'Utilisé pour suivre votre dossier.'
      : field.key === 'phone'
        ? 'Utile uniquement si une précision est nécessaire.'
        : isSirenField
          ? 'Nous l’utilisons pour retrouver les informations de la société.'
          : undefined;

    if (useUnifiedPresentation && resolveQuestionMode(field) === 'input') {
      return renderMobileInputStep(field, {
        value,
        invalid: showInlineError,
        inlineMessage,
        subtitle: mobileInputHint,
        inputType: field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : 'text',
        extra: (
          <>
            {isSirenField && sirenLookupState === 'loading' ? (
              <p className="mx-auto mt-3 max-w-md text-xs text-muted-foreground">Recherche de l’entreprise…</p>
            ) : null}
            {isSirenField && sirenLookupMessage ? (
              <p className={`mx-auto mt-3 max-w-md text-xs ${sirenLookupState === 'error' ? 'text-destructive' : 'text-emerald-600'}`}>
                {sirenLookupMessage}
              </p>
            ) : null}
          </>
        ),
      });
    }

    if (field.type === 'textarea') {
      const minLength = field.key === 'activite' ? 12 : 8;
      const trimmedLength = String(value || '').trim().length;
      const canAdvanceTextarea = trimmedLength >= minLength && !invalid;
      return (
        <MobileTextareaStep
          key={field.key}
          kicker={PROGRESSIVE_STEP_LABELS[step.id] || step.title}
          title={`${field.label}${field.required ? ' *' : ''}`}
          subtitle={step.description}
          progressPercent={progress}
          stepCurrent={presentation.stepCurrent}
          stepTotal={presentation.stepTotal}
          fieldId={field.key}
          value={value}
          placeholder={field.placeholder || ''}
          minLength={minLength}
          compact={isCompactStep}
          showProgressBar={!isCompactStep}
          showStepMeta={!isCompactStep}
          hint={isCompactStep ? 'Touchez la flèche pour continuer.' : undefined}
          onChange={(nextValue) => updateField(field, nextValue)}
          onAdvance={goNext}
          canAdvance={canAdvanceTextarea}
          invalid={showInlineError}
          errorMessage={showInlineError ? inlineMessage : ''}
        />
      );
    }

    return (
      <div key={field.key} className="space-y-2">
        <Label>{field.label}{field.required ? ' *' : ''}</Label>
        <Input
          type={field.type === 'number' ? 'number' : field.type}
          value={value}
          placeholder={field.placeholder || ''}
          onChange={(event) => {
            const nextValue = field.key === 'companySiren' || field.key === 'existingBusinessSiren'
              ? sanitizeCompanyIdentifier(event.target.value)
              : event.target.value;
            updateField(field, nextValue);
          }}
          inputMode={field.key === 'companySiren' || field.key === 'existingBusinessSiren' || field.key === 'codePostal' ? 'numeric' : undefined}
          pattern={field.key === 'companySiren' || field.key === 'existingBusinessSiren' ? '[0-9]*' : undefined}
          className={`${fieldClass} ${showInlineError ? 'border-red-400' : ''}`}
        />
        {isSirenField && sirenLookupState === 'loading' ? (
          <p className="text-xs text-muted-foreground">Recherche de l&apos;entreprise…</p>
        ) : null}
        {isSirenField && sirenLookupMessage ? (
          <p className={`text-xs ${sirenLookupState === 'error' ? 'text-destructive' : 'text-emerald-600'}`}>
            {sirenLookupMessage}
          </p>
        ) : null}
        {showInlineError ? (
          <p className="text-xs text-destructive">{inlineMessage}</p>
        ) : null}
      </div>
    );
  };

  if (isUnifiedFormalitePickerStep) {
    return (
      <div
        ref={wizardTopRef}
        className="mx-auto max-w-4xl min-h-[100dvh] px-3 py-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <QuestionBackButton
            type="button"
            onClick={goBack}
            disabled={stepIndex <= 0 && safeGroupIndex <= 0}
            className="h-10 px-4 text-xs"
          />
          <AutosaveIndicator status={autosaveState} />
        </div>
        {priorFieldBlock ? (
          <PriorFieldGuide
            message={resolvePriorFieldBlockNotice(priorFieldBlock)}
            ctaLabel={resolveMissingFieldCtaLabel(priorFieldBlock.field)}
            onNavigate={navigateToPriorField}
            className="mb-3"
          />
        ) : null}
        {stepError ? (
          <QuestionnaireNotice variant="error" title="Enregistrement" className="mb-3">
            {stepError}
          </QuestionnaireNotice>
        ) : null}
        <AnimatePresence mode="wait">
          <motion.div
            key="typeFormalite-mobile"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {renderQuestionField(activeField)}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div
      ref={wizardTopRef}
      className={cn(
        'mx-auto max-w-4xl',
        isCompactStep
          ? 'px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]'
          : 'px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-10 lg:px-8',
      )}
    >
      <StepLayout
        title={stepTitle}
        description={step.description}
        reference={reference}
        progress={progress}
        progressNode={<ProgressCircle percent={progress} />}
        autosaveNode={<AutosaveIndicator status={autosaveState} />}
        securityNode={<SecurityNotice />}
        onBack={goBack}
        onNext={goNext}
        onEnterNext={goNext}
        canGoBack={stepIndex > 0 || safeGroupIndex > 0}
        canGoNext={canContinue}
        continueLabel={continueLabel}
        hideContinueButton={hideContinueOnUnified}
        compactMobile={isCompactStep}
      >
        {priorFieldBlock ? (
          <PriorFieldGuide
            message={resolvePriorFieldBlockNotice(priorFieldBlock)}
            ctaLabel={resolveMissingFieldCtaLabel(priorFieldBlock.field)}
            onNavigate={navigateToPriorField}
            className="mb-3"
          />
        ) : null}
        {stepError ? (
          <QuestionnaireNotice variant="error" title="Enregistrement">
            {stepError}
          </QuestionnaireNotice>
        ) : null}

        {stepFieldStates.missingButContinueAllowed ? (
          <QuestionnaireNotice variant="info" title="À compléter plus tard" className="mt-3">
            {stepFieldStates.softMissing.length === 1
              ? `« ${stepFieldStates.softMissing[0].label} » peut être complété ultérieurement.`
              : `${stepFieldStates.softMissing.length} informations secondaires peuvent être complétées plus tard.`}
            {' '}Vous pouvez continuer – Greffio vous rappellera de les finaliser.
          </QuestionnaireNotice>
        ) : null}
        {!isCompactStep ? (
          <ProgressiveStepChips
            steps={progressiveSteps}
            activeIndex={progressiveStepIndex}
            revealThroughIndex={progressiveStepIndex}
          />
        ) : null}

        {fieldGroups.length > 1 && !isCompactStep ? (
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Question {safeGroupIndex + 1} sur {fieldGroups.length}
            <span className="mx-2 text-border">·</span>
            {stepTitle}
          </p>
        ) : null}


        <AnimatePresence mode="wait">
          <motion.div
            key={`${step.id}-${activeGroup.map((field) => field.key).join('-') || safeGroupIndex}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
            className={cn(
              useUnifiedPresentation && hideContinueOnUnified
                ? 'min-h-0 border-0 bg-transparent p-0 shadow-none'
                : 'min-h-[12rem] rounded-xl border border-border bg-muted/30 p-5 md:p-6',
            )}
          >
            <div className={cn(activeGroup.length > 1 && 'space-y-4')}>
              {activeGroup.map((field) => renderQuestionField(field))}
            </div>
          </motion.div>
        </AnimatePresence>

        {(activeField?.key === 'companySiren' || activeField?.key === 'existingBusinessSiren')
          && (formData.initiatorType === 'personne_morale'
            || EXISTING_BUSINESS_FORMALITIES.has(String(formData.typeFormalite || ''))) ? (
          <QuestionnaireNotice variant="info" title="Vérification entreprise">
            Source : Annuaire des entreprises (Data.gouv).
            {EXISTING_BUSINESS_FORMALITIES.has(String(formData.typeFormalite || '')) ? (
              <span className="mt-2 block">
                Hors création, une signature électronique qualifiée ou FranceConnect+ pourra être demandée.
              </span>
            ) : null}
          </QuestionnaireNotice>
        ) : null}

        {step.id === 'validation' ? (
          <QuestionnaireNotice variant="document" title="Prochaine étape">
            Après validation, vous accéderez à la génération de vos documents (statuts si votre forme le prévoit).
          </QuestionnaireNotice>
        ) : null}

        {!eiLike && step.id === 'beneficiaires' ? (
          <QuestionnaireNotice variant="info" title="Bénéficiaires effectifs">
            L&apos;extrait Kbis et la déclaration des bénéficiaires effectifs pourront être demandés ultérieurement selon votre dossier.
          </QuestionnaireNotice>
        ) : null}
      </StepLayout>

      {!isCompactStep ? (
        <>
          <div className="mt-4 rounded-md border border-border bg-white p-4 text-xs text-muted-foreground">
            Contact Greffio: {runtimeConfig.supportPhone} – {runtimeConfig.supportEmail}
          </div>
          {!canContinue && !stepError && !hideContinueOnUnified ? (
            <QuestionnaireNotice variant="vigilance" title="Pour continuer" className="mt-3">
              Répondez à la question ci-dessus, puis cliquez sur « {continueLabel} ».
            </QuestionnaireNotice>
          ) : null}
          {!canContinue && !stepError && hideContinueOnUnified ? (
            <QuestionnaireNotice variant="vigilance" title="Pour continuer" className="mt-3">
              {isCompactViewport
                ? 'Touchez votre réponse pour passer à la suite.'
                : 'Cliquez votre réponse pour passer à la suite.'}
            </QuestionnaireNotice>
          ) : null}
          <div className="mt-3 rounded-md border border-border bg-muted p-3 text-xs text-muted-foreground">
            Greffio est un service privé indépendant d’assistance aux démarches administratives des entreprises. Greffio n’est pas un service officiel de l’État, des greffes des tribunaux de commerce ou d’Infogreffe.
          </div>
        </>
      ) : null}
    </div>
  );
};

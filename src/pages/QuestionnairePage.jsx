import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Button } from '@/components/ui/button.jsx';
import { ProgressCircle } from '@/components/questionnaire/ProgressCircle.jsx';
import { StepLayout } from '@/components/questionnaire/StepLayout.jsx';
import { ChoiceCard } from '@/components/questionnaire/ChoiceCard.jsx';
import { DemarchePicker } from '@/components/questionnaire/DemarchePicker.jsx';
import { SegmentedChoice } from '@/components/questionnaire/SegmentedChoice.jsx';
import { AutosaveIndicator } from '@/components/questionnaire/AutosaveIndicator.jsx';
import { SecurityNotice } from '@/components/questionnaire/SecurityNotice.jsx';
import { QuestionnaireNotice } from '@/components/questionnaire/QuestionnaireNotice.jsx';
import { ProgressiveStepChips } from '@/components/ProgressiveStepChips.jsx';
import { CompanyLookupCard } from '@/components/CompanyLookupCard.jsx';
import { AnimatePresence, motion } from 'framer-motion';
import {
  EXISTING_BUSINESS_FORMALITIES,
  QUESTIONNAIRE_FLOW,
  getQuestionnaireProgressPercent,
  getVisibleFieldsForStep,
  isFieldValueValid,
  isStepComplete,
} from '@/lib/questionnaireFlow.js';
import {
  completeQuestionnaireStep,
  getQuestionnaireState,
  patchQuestionnaireState,
} from '@/api/questionnaire.js';
import { lookupCompanyBySiren } from '@/api/company.js';
import { createDossier } from '@/api/dossiers.js';
import { clearCurrentDossierId, getCurrentDossierId, saveCurrentDossierId } from '@/utils/sessionStore.js';
import { runtimeConfig } from '@/config/runtime.js';
import { isEiLikeFormality, isStatutesSupportedForm } from '@/config/formalities.js';
import { AssociatesMinorPanel } from '@/components/questionnaire/AssociatesMinorPanel.jsx';
import { BeneficialOwnersPicker } from '@/components/questionnaire/BeneficialOwnersPicker.jsx';
import { BirthDateMinorEncouragement } from '@/components/BirthDateMinorEncouragement.jsx';
import { validateDirectorEligibility } from '@/config/minorAssociateRules.js';
import { syncDirigeantFromAssociates } from '@/utils/officerFromAssociates.js';
import { useAuth } from '@/hooks/useAuth.js';
import { fetchUserProfile } from '@/api/profile.js';
import { contactDetailsFromUser } from '@/utils/userProfile.js';
import { getIntelligentPrefill } from '@/api/intelligentIntake.js';

const defaultData = {
  initiatorType: 'personne_physique',
  firstName: '',
  lastName: '',
  nationality: 'Française',
  companyCountry: 'France',
  companySiren: '',
  companyName: '',
  existingBusinessSiren: '',
  existingBusinessName: '',
  email: '',
  phone: '04 11 81 86 70',
  typeFormalite: '',
  formeJuridique: '',
  denomination: '',
  adresseSiege: '',
  codePostal: '',
  villeSiege: '',
  activite: '',
  capital: '',
  repartition: '',
  associates: [],
  associesSummary: '',
  dirigeant: '',
  birthDate: '',
  beneficiairesEffectifs: '',
  beneficiairesEffectifsSelected: [],
  beneficiairesEffectifsAutre: '',
  validationConfirmed: false,
};

const fieldClass = 'h-14 rounded-2xl border-2 border-[#d4e2f5] bg-white px-4 text-base font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/12';
const STEP_TITLES_BY_ID = Object.freeze({
  contact: 'Type de déclarant',
  demarche: 'Type de formalité',
  forme: 'Structure',
  entreprise: 'Informations',
  gouvernance: 'Associés',
  beneficiaires: 'Bénéficiaires',
  validation: 'Validation',
});
const PROGRESSIVE_STEPS = QUESTIONNAIRE_FLOW.map((flowStep) => ({
  id: flowStep.id,
  label: STEP_TITLES_BY_ID[flowStep.id] || flowStep.title,
}));

const normalizeFormalityToService = (typeFormalite, formeJuridique) => {
  if (typeFormalite === 'etablissement_secondaire_creation') return 'creation-etablissement-secondaire';
  if (typeFormalite === 'transfert_siege') return 'transfert-siege';
  if (typeFormalite === 'dissolution_liquidation_radiation') return 'dissolution-liquidation-radiation';
  if (typeFormalite === 'depot_comptes_annuels') return 'depot-comptes-annuels';
  if (typeFormalite === 'modification_entreprise') return 'modification';
  if (typeFormalite === 'micro_entreprise') return 'micro-entreprise';
  if (typeFormalite === 'entreprise_individuelle' || String(formeJuridique || '').toUpperCase() === 'EI') return 'creation-ei';
  if (formeJuridique === 'SCI') return 'creation-sci';
  if (formeJuridique === 'SARL' || formeJuridique === 'EURL') return 'creation-sarl';
  return 'creation-sasu';
};

const sanitizeSiren = (value) => String(value || '').replace(/\D/g, '').slice(0, 9);
const sanitizeCompanyIdentifier = (value) => String(value || '').replace(/\D/g, '').slice(0, 14);
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
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const [dossierId, setDossierId] = useState(getCurrentDossierId());
  const [reference, setReference] = useState(makeUiReference());
  const [formData, setFormData] = useState(defaultData);
  const [stepIndex, setStepIndex] = useState(0);
  const [fieldIndex, setFieldIndex] = useState(0);
  const [autosaveState, setAutosaveState] = useState('idle');
  const wizardTopRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [intakeHints, setIntakeHints] = useState({ score: null, warnings: [], issues: [] });
  const [stepError, setStepError] = useState('');

  const step = QUESTIONNAIRE_FLOW[stepIndex];
  const visibleStepFields = useMemo(
    () => getVisibleFieldsForStep(step, formData),
    [step, formData],
  );
  const safeFieldIndex = visibleStepFields.length
    ? Math.min(fieldIndex, visibleStepFields.length - 1)
    : 0;
  const activeField = visibleStepFields[safeFieldIndex] || null;
  const isLastFieldInStep = visibleStepFields.length > 0 && safeFieldIndex === visibleStepFields.length - 1;
  const progress = getQuestionnaireProgressPercent(formData, stepIndex, safeFieldIndex);
  const canAdvanceCurrentField = useMemo(() => {
    if (!activeField) return false;
    const valid = isFieldValueValid(activeField, formData[activeField.key], formData);
    if (activeField.key === 'dirigeant') {
      return valid && validateDirectorEligibility(formData).ok;
    }
    return valid;
  }, [activeField, formData]);
  const canCompleteStep = isStepComplete(step, formData)
    && (step.id !== 'gouvernance' || validateDirectorEligibility(formData).ok);
  const canContinue = isLastFieldInStep ? canCompleteStep : canAdvanceCurrentField;
  const continueLabel = isLastFieldInStep && stepIndex >= QUESTIONNAIRE_FLOW.length - 1
    ? 'Valider et continuer'
    : isLastFieldInStep
      ? 'Étape suivante'
      : 'Continuer';

  const contactPayload = useMemo(() => ({
    initiatorType: formData.initiatorType,
    firstName: formData.firstName,
    lastName: formData.lastName,
    nationality: formData.nationality,
    companyCountry: formData.companyCountry,
    companySiren: formData.companySiren,
    companyName: formData.companyName,
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

  const ensureDossier = async ({ forceNew = false } = {}) => {
    if (!forceNew) {
      const existing = dossierId || getCurrentDossierId();
      if (existing) return existing;
    }
    const created = await createDossier({
      userId: null,
      companyName: formData.denomination || 'Projet Greffio',
      legalForm: formData.formeJuridique || 'SASU',
      service: normalizeFormalityToService(formData.typeFormalite, formData.formeJuridique),
    });
    const id = created?.dossier?.id || null;
    if (id) {
      saveCurrentDossierId(id);
      setDossierId(id);
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
        setFormData((current) => ({
          ...current,
          ...(fieldKey === 'existingBusinessSiren'
            ? { existingBusinessName: company.denomination || current.existingBusinessName }
            : { companyName: company.denomination || current.companyName }),
          companyCountry: company.country || current.companyCountry,
        }));
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

        let currentDossierId = dossierId;
        if (!currentDossierId) {
          const created = await createDossier({
            userId: null,
            companyName: 'Projet Greffio',
            legalForm: 'SASU',
            service: 'creation-sasu',
          });
          currentDossierId = created?.dossier?.id || null;
          if (currentDossierId) {
            saveCurrentDossierId(currentDossierId);
            setDossierId(currentDossierId);
          }
        }

        let mergedData = { ...defaultData };
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
            const created = await createDossier({
              userId: null,
              companyName: 'Projet Greffio',
              legalForm: 'SASU',
              service: 'creation-sasu',
            });
            currentDossierId = created?.dossier?.id || null;
            if (currentDossierId) {
              saveCurrentDossierId(currentDossierId);
              setDossierId(currentDossierId);
            }
          }
          if (!currentDossierId) {
            setFormData(mergedData);
            setLoading(false);
            return;
          }
          if (!state) {
            state = await getQuestionnaireState(currentDossierId);
          }
          const fromApi = state.reference || state?.dossier?.reference || '';
          const finalReference = isModernReference(fromApi)
            ? fromApi
            : makeUiReference();
          setReference(finalReference);
          mergedData = {
            ...mergedData,
            ...(state.questionnaire || {}),
          };
          const prefillSiren = String(searchParams.get('prefillSiren') || '').replace(/\D/g, '');
          if (prefillSiren.length === 9 || prefillSiren.length === 14) {
            mergedData = {
              ...mergedData,
              companySiren: prefillSiren,
              initiatorType: 'personne_morale',
            };
          }
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

        setFormData(mergedData);

        const contactFlowStep = QUESTIONNAIRE_FLOW[0];
        if (isAuthenticated && isStepComplete(contactFlowStep, mergedData)) {
          setStepIndex(1);
        }
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
    if (!dossierId || loading) return;
    const timeout = window.setTimeout(async () => {
      const requestId = autosaveRequestId.current + 1;
      autosaveRequestId.current = requestId;
      try {
        setAutosaveState('saving');
        await persistQuestionnaire({
          dataPatch: formData,
          progressPercent: progress,
        });
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
        setAutosaveState('error');
      }
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [dossierId, formData, progress, loading]);

  useEffect(() => {
    setFieldIndex(0);
  }, [stepIndex]);

  useEffect(() => {
    if (fieldIndex !== safeFieldIndex) {
      setFieldIndex(safeFieldIndex);
    }
  }, [fieldIndex, safeFieldIndex]);

  useEffect(() => {
    if (loading || visibleStepFields.length > 0) return;
    let next = stepIndex + 1;
    while (next < QUESTIONNAIRE_FLOW.length) {
      const nextStep = QUESTIONNAIRE_FLOW[next];
      if (getVisibleFieldsForStep(nextStep, formData).length) {
        setStepIndex(next);
        setFieldIndex(0);
        return;
      }
      next += 1;
    }
  }, [loading, stepIndex, visibleStepFields.length, formData]);

  useEffect(() => {
    wizardTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [stepIndex, safeFieldIndex]);

  const updateField = (field, value) => {
    if ((field.key === 'companySiren' || field.key === 'existingBusinessSiren') && String(value || '').trim() !== String(formData[field.key] || '').trim()) {
      setFoundCompany(null);
      setSirenLookupMessage('');
      setSirenLookupState('idle');
    }
    setFormData((current) => ({
      ...current,
      [field.key]: field.type === 'checkbox' ? Boolean(value) : value,
    }));
  };

  const goNext = async () => {
    setStepError('');
    if (!canContinue) {
      const label = activeField?.label || 'ce champ';
      setStepError(`Complétez « ${label} » avant de continuer.`);
      toast.error('Répondez à la question affichée pour continuer.');
      return;
    }
    if (!isLastFieldInStep) {
      setFieldIndex((current) => Math.min(current + 1, visibleStepFields.length - 1));
      return;
    }
    try {
      setAutosaveState('saving');
      const saveResult = await persistQuestionnaire({
        dataPatch: step.id === 'contact' ? contactPayload : formData,
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
        dataPatch: step.id === 'contact' ? contactPayload : formData,
        progressPercent: progress,
      });
      setAutosaveState('saved');
    } catch (error) {
      const apiError = error?.payload?.error || error?.message;
      if (apiError === 'DOSSIER_FORBIDDEN') {
        clearCurrentDossierId();
        setDossierId(null);
        setStepError('Ce dossier n’est pas rattaché à votre compte. Réessayez : un nouveau dossier sera créé.');
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
      toast.success('Questionnaire enregistré.');
      const form = String(formData.formeJuridique || '').toUpperCase();
      if (!eiLike && isStatutesSupportedForm(form)) {
        navigate('/statuts');
      } else {
        navigate('/dashboard');
      }
      return;
    }
    let nextIndex = stepIndex + 1;
    while (nextIndex < QUESTIONNAIRE_FLOW.length) {
      const nextStep = QUESTIONNAIRE_FLOW[nextIndex];
      const visibleFields = nextStep.fields.filter((field) => !field.condition || field.condition(formData));
      if (visibleFields.length) break;
      nextIndex += 1;
    }
    setStepIndex(nextIndex);
    setFieldIndex(0);
  };

  const goBack = () => {
    if (safeFieldIndex > 0) {
      setFieldIndex((current) => Math.max(0, current - 1));
      return;
    }
    if (stepIndex <= 0) return;
    let prev = stepIndex - 1;
    while (prev >= 0) {
      const prevStep = QUESTIONNAIRE_FLOW[prev];
      const fields = getVisibleFieldsForStep(prevStep, formData);
      if (fields.length) {
        setStepIndex(prev);
        setFieldIndex(fields.length - 1);
        return;
      }
      prev -= 1;
    }
  };

  const applyFoundCompany = () => {
    if (!foundCompany) return;
    setFormData((current) => ({
      ...current,
      ...(foundCompanyFieldKey === 'existingBusinessSiren'
        ? {
            existingBusinessSiren: foundCompany.siren || current.existingBusinessSiren,
            existingBusinessName: foundCompany.denomination || current.existingBusinessName,
          }
        : {
            companySiren: foundCompany.siren || current.companySiren,
            companyName: foundCompany.denomination || current.companyName,
          }),
      companyCountry: foundCompany.country || current.companyCountry,
      city: current.city || foundCompany.city || '',
      adresseSiege: current.adresseSiege || foundCompany.addressSiege || '',
      activite: current.activite || foundCompany.apeCode || '',
    }));
    toast.success("Informations de l'entreprise injectées. Vous pouvez modifier chaque champ.");
  };

  const applyIntelligentPrefill = async () => {
    if (!dossierId) return;
    try {
      const payload = await getIntelligentPrefill(dossierId);
      const prefill = payload?.prefill || {};
      setFormData((current) => ({
        ...current,
        ...Object.fromEntries(
          Object.entries(prefill).filter(([, value]) => value !== null && value !== undefined && value !== ''),
        ),
      }));
      setIntakeHints({
        score: payload?.coherence?.score ?? null,
        warnings: payload?.coherence?.warnings || [],
        issues: payload?.coherence?.issues || [],
      });
      toast.success('Préremplissage intelligent appliqué.');
    } catch (_error) {
      toast.error('Préremplissage intelligent indisponible.');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-md border border-border bg-white p-8 text-sm text-muted-foreground">Chargement du questionnaire...</div>
      </div>
    );
  }

  const renderQuestionField = (field) => {
    if (!field) return null;
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
            <Label className="text-base font-semibold">{field.label}{field.required ? ' *' : ''}</Label>
            <div className="mt-3">
              <DemarchePicker
                value={formData.typeFormalite}
                onChange={(nextValue) => updateField(field, nextValue)}
              />
            </div>
          </div>
        );
      }

      const isBinaryChoice = normalizedOptions.length === 2;
      return (
        <div key={field.key}>
          <Label className={isBinaryChoice ? 'text-base font-semibold' : ''}>
            {field.label}{field.required ? ' *' : ''}
          </Label>
          <div className={`mt-2 ${isBinaryChoice ? '' : 'grid gap-2 sm:grid-cols-2 xl:grid-cols-3'}`}>
            {isBinaryChoice ? (
              <SegmentedChoice
                options={options}
                value={formData[field.key]}
                onChange={(nextValue) => updateField(field, nextValue)}
              />
            ) : normalizedOptions.map((option) => (
              <ChoiceCard
                key={option.value}
                compact
                selected={String(formData[field.key] || '') === String(option.value)}
                title={option.label}
                onClick={() => updateField(field, option.value)}
              />
            ))}
          </div>
        </div>
      );
    }

    if (field.type === 'checkbox') {
      return (
        <label key={field.key} className="flex items-start gap-3 rounded-xl border border-[#d4e2f5] bg-muted/40 p-5">
          <input
            type="checkbox"
            checked={Boolean(formData[field.key])}
            onChange={(event) => updateField(field, event.target.checked)}
            className="mt-1"
          />
          <span className="text-sm leading-6 text-muted-foreground">{field.label}</span>
        </label>
      );
    }

    if (field.type === 'beneficial_owners_picker') {
      return (
        <div key={field.key} className="space-y-3">
          <Label className="text-base font-semibold">
            {field.label}{field.required ? ' *' : ''}
          </Label>
          <BeneficialOwnersPicker
            formData={formData}
            selectedIds={formData.beneficiairesEffectifsSelected || []}
            summaryText={formData.beneficiairesEffectifs || ''}
            otherName={formData.beneficiairesEffectifsAutre || ''}
            fieldClass={fieldClass}
            onChange={(patch) => setFormData((current) => ({ ...current, ...patch }))}
          />
        </div>
      );
    }

    if (field.type === 'associates_minor_panel') {
      return (
        <div key={field.key}>
          <AssociatesMinorPanel
            value={formData.associates}
            includeDirector={false}
            onChange={(patch) => setFormData((current) => {
              const associates = patch.associates ?? current.associates;
              return {
                ...current,
                ...patch,
                dirigeant: syncDirigeantFromAssociates(associates, current.dirigeant),
                repartition: patch.associesSummary || current.repartition,
              };
            })}
          />
        </div>
      );
    }

    if (field.key === 'dirigeant') {
      const directorCheck = validateDirectorEligibility(formData);
      return (
        <div key={field.key} className="space-y-3">
          <Label>{field.label}{field.required ? ' *' : ''}</Label>
          <Input
            value={formData.dirigeant || ''}
            onChange={(event) => setFormData((current) => ({ ...current, dirigeant: event.target.value }))}
            placeholder={field.placeholder || ''}
            className={`${fieldClass} ${!directorCheck.ok ? 'border-red-400' : ''}`}
          />
          {!directorCheck.ok ? (
            <QuestionnaireNotice variant="error" title="Fonction de direction">
              {directorCheck.message}
            </QuestionnaireNotice>
          ) : null}
        </div>
      );
    }

    if (field.type === 'date') {
      const dateValue = formData[field.key] || '';
      const showLegalHint = field.key === 'birthDate';
      return (
        <div key={field.key} className="space-y-2">
          <Label htmlFor={field.key}>{field.label}{field.required ? ' *' : ''}</Label>
          <Input
            id={field.key}
            type="date"
            value={dateValue}
            onChange={(event) => updateField(field, event.target.value)}
            className={fieldClass}
          />
          {showLegalHint ? (
            <BirthDateMinorEncouragement birthDate={dateValue} showLegalHint />
          ) : null}
        </div>
      );
    }

    const value = formData[field.key] ?? '';
    const invalid = field.required && !isFieldValueValid(field, value, formData);

    if (field.type === 'textarea') {
      return (
        <div key={field.key} className="space-y-2">
          <Label>{field.label}{field.required ? ' *' : ''}</Label>
          <textarea
            value={value}
            placeholder={field.placeholder || ''}
            rows={4}
            onChange={(event) => updateField(field, event.target.value)}
            className={`${fieldClass} min-h-[110px] w-full ${invalid && String(value).length > 0 ? 'border-red-400' : ''}`}
          />
        </div>
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
          className={`${fieldClass} ${invalid && String(value).length > 0 ? 'border-red-400' : ''}`}
        />
        {field.key === 'companySiren' && formData.initiatorType === 'personne_morale' ? (
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="bg-white" onClick={() => lookupSiren('companySiren')} disabled={![9, 14].includes(String(formData.companySiren || '').trim().length) || sirenLookupState === 'loading'}>
              Recherche automatique annuaire
            </Button>
            {sirenLookupState === 'loading' ? <span className="text-xs text-muted-foreground">Recherche...</span> : null}
            {sirenLookupState === 'done' ? <span className="text-xs text-emerald-600">Entreprise trouvée</span> : null}
            {sirenLookupState === 'error' ? <span className="text-xs text-red-600">Aucune correspondance</span> : null}
          </div>
        ) : null}
        {field.key === 'existingBusinessSiren' && EXISTING_BUSINESS_FORMALITIES.has(String(formData.typeFormalite || '')) ? (
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="bg-white" onClick={() => lookupSiren('existingBusinessSiren')} disabled={![9, 14].includes(String(formData.existingBusinessSiren || '').trim().length) || sirenLookupState === 'loading'}>
              Recherche automatique annuaire
            </Button>
            {sirenLookupState === 'loading' ? <span className="text-xs text-muted-foreground">Recherche...</span> : null}
            {sirenLookupState === 'done' ? <span className="text-xs text-emerald-600">Entreprise trouvée</span> : null}
            {sirenLookupState === 'error' ? <span className="text-xs text-red-600">Aucune correspondance</span> : null}
          </div>
        ) : null}
        {(field.key === 'companySiren' || field.key === 'existingBusinessSiren') && sirenLookupMessage ? (
          <p className={`text-xs ${sirenLookupState === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
            {sirenLookupMessage}
          </p>
        ) : null}
        {(field.key === 'companySiren' || field.key === 'existingBusinessSiren') && foundCompany && foundCompanyFieldKey === field.key ? (
          <CompanyLookupCard company={foundCompany} onUse={applyFoundCompany} />
        ) : null}
        {invalid && String(value).length > 0 ? (
          <p className="text-xs text-red-600">Ce champ est requis.</p>
        ) : null}
      </div>
    );
  };

  return (
    <div ref={wizardTopRef} className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <StepLayout
        title={step.title}
        description={step.description}
        reference={reference}
        progress={progress}
        progressNode={<ProgressCircle percent={progress} />}
        autosaveNode={<AutosaveIndicator status={autosaveState} />}
        securityNode={<SecurityNotice />}
        onBack={goBack}
        onNext={goNext}
        onEnterNext={goNext}
        canGoBack={stepIndex > 0 || safeFieldIndex > 0}
        canGoNext={canContinue}
        continueLabel={continueLabel}
      >
        {stepError ? (
          <QuestionnaireNotice variant="error" title="Enregistrement">
            {stepError}
          </QuestionnaireNotice>
        ) : null}

        <ProgressiveStepChips
          steps={PROGRESSIVE_STEPS}
          activeIndex={stepIndex}
          revealThroughIndex={stepIndex}
        />

        {visibleStepFields.length > 1 ? (
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Question {safeFieldIndex + 1} sur {visibleStepFields.length}
            <span className="mx-2 text-border">·</span>
            {STEP_TITLES_BY_ID[step.id] || step.title}
          </p>
        ) : null}

        {step.id === 'contact' && safeFieldIndex === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/15 bg-secondary/40 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Auto-collecte intelligente</p>
              <p className="text-xs text-muted-foreground">Préremplissage depuis SIREN/SIRET ou documents OCR</p>
            </div>
            <Button type="button" variant="outline" className="h-9 rounded-xl bg-white text-xs" onClick={applyIntelligentPrefill}>
              Préremplir
            </Button>
          </div>
        ) : null}

        <AnimatePresence mode="wait">
          <motion.div
            key={`${step.id}-${activeField?.key || safeFieldIndex}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
            className="min-h-[12rem] rounded-xl border border-[#d4e2f5] bg-[#fafcff] p-5 md:p-6"
          >
            {renderQuestionField(activeField)}
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

      <div className="mt-4 rounded-md border border-border bg-white p-4 text-xs text-muted-foreground">
        Contact Greffio: {runtimeConfig.supportPhone} — {runtimeConfig.supportEmail}
      </div>
      {!canContinue && !stepError ? (
        <QuestionnaireNotice variant="vigilance" title="Pour continuer" className="mt-3">
          Répondez à la question ci-dessus, puis cliquez sur « {continueLabel} ».
        </QuestionnaireNotice>
      ) : null}
      <div className="mt-3 rounded-md border border-border bg-muted p-3 text-xs text-muted-foreground">
        Greffio est un service privé indépendant d’assistance aux démarches administratives des entreprises. Greffio n’est pas un service officiel de l’État, des greffes des tribunaux de commerce ou d’Infogreffe.
      </div>
    </div>
  );
};

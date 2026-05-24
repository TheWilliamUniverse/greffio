import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Button } from '@/components/ui/button.jsx';
import { ProgressCircle } from '@/components/questionnaire/ProgressCircle.jsx';
import { StepLayout } from '@/components/questionnaire/StepLayout.jsx';
import { ChoiceCard } from '@/components/questionnaire/ChoiceCard.jsx';
import { AutosaveIndicator } from '@/components/questionnaire/AutosaveIndicator.jsx';
import { SecurityNotice } from '@/components/questionnaire/SecurityNotice.jsx';
import { ProgressiveStepChips } from '@/components/ProgressiveStepChips.jsx';
import { CompanyLookupCard } from '@/components/CompanyLookupCard.jsx';
import { AnimatePresence, motion } from 'framer-motion';
import {
  DEMARCHE_CATALOG,
  EXISTING_BUSINESS_FORMALITIES,
  QUESTIONNAIRE_FLOW,
  getProgressPercent,
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
import { getCurrentDossierId, saveCurrentDossierId } from '@/utils/sessionStore.js';
import { runtimeConfig } from '@/config/runtime.js';
import { isEiLikeFormality } from '@/config/formalities.js';
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
  associesSummary: '',
  dirigeant: '',
  beneficiairesEffectifs: '',
  validationConfirmed: false,
};

const fieldClass = 'rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring';
const STEP_TITLES_BY_ID = Object.freeze({
  contact: 'Type de déclarant',
  demarche: 'Type de formalité',
  forme: 'Structure',
  entreprise: 'Informations',
  gouvernance: 'Gouvernance',
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
  const [searchParams] = useSearchParams();
  const [dossierId, setDossierId] = useState(getCurrentDossierId());
  const [reference, setReference] = useState(makeUiReference());
  const [formData, setFormData] = useState(defaultData);
  const [stepIndex, setStepIndex] = useState(0);
  const [autosaveState, setAutosaveState] = useState('idle');
  const [loading, setLoading] = useState(true);
  const [demarcheQuery, setDemarcheQuery] = useState('');
  const [intakeHints, setIntakeHints] = useState({ score: null, warnings: [], issues: [] });
  const [stepError, setStepError] = useState('');

  const step = QUESTIONNAIRE_FLOW[stepIndex];
  const progress = getProgressPercent(stepIndex);
  const visibleStepFields = useMemo(
    () => step.fields.filter((field) => !field.condition || field.condition(formData)),
    [step.fields, formData],
  );
  const missingRequiredFields = useMemo(
    () => visibleStepFields
      .filter((field) => field.required && !isFieldValueValid(field, formData[field.key]))
      .map((field) => field.label),
    [visibleStepFields, formData],
  );
  const canGoNext = isStepComplete(step, formData);

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

        if (currentDossierId) {
          const state = await getQuestionnaireState(currentDossierId);
          const fromApi = state.reference || state?.dossier?.reference || '';
          const finalReference = isModernReference(fromApi)
            ? fromApi
            : makeUiReference();
          setReference(finalReference);
          setFormData((current) => ({
            ...current,
            ...(state.questionnaire || {}),
          }));
          const prefillSiren = String(searchParams.get('prefillSiren') || '').replace(/\D/g, '');
          if (prefillSiren.length === 9 || prefillSiren.length === 14) {
            setFormData((current) => ({
              ...current,
              companySiren: prefillSiren,
              initiatorType: 'personne_morale',
            }));
          }
        }
      } catch (_error) {
        // Keep graceful UI fallback.
      } finally {
        setLoading(false);
      }
    };
    void boot();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (!dossierId || loading) return;
    const timeout = window.setTimeout(async () => {
      try {
        setAutosaveState('saving');
        await patchQuestionnaireState({
          dossierId,
          dataPatch: formData,
          progressPercent: progress,
        });
        setAutosaveState('saved');
      } catch (_error) {
        setAutosaveState('error');
      }
    }, 650);
    return () => window.clearTimeout(timeout);
  }, [dossierId, formData, progress, loading]);

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
    if (!canGoNext) {
      const details = missingRequiredFields.length
        ? `Champs manquants: ${missingRequiredFields.join(', ')}.`
        : 'Complétez les champs requis avant de continuer.';
      setStepError(details);
      toast.error('Complétez les champs requis avant de continuer.');
      return;
    }
    if (!dossierId) return;
    try {
      setAutosaveState('saving');
      await completeQuestionnaireStep({
        dossierId,
        stepId: step.id,
        dataPatch: step.id === 'contact' ? contactPayload : formData,
        progressPercent: progress,
      });
      setAutosaveState('saved');
    } catch (_error) {
      if (_error?.message === 'IDENTITY_VERIFICATION_REQUIRED') {
        setStepError("La vérification d'identité est requise pour finaliser le dossier (dernière étape).");
        toast.error("Finalisation bloquée: vérification d'identité requise.");
      } else {
        setStepError("Une erreur est survenue pendant l'enregistrement. Réessayez.");
      }
      setAutosaveState('error');
      return;
    }

    if (stepIndex >= QUESTIONNAIRE_FLOW.length - 1) {
      navigate('/dashboard');
      return;
    }
    setStepIndex((current) => current + 1);
  };

  const goBack = () => setStepIndex((current) => Math.max(0, current - 1));

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

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
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
        canGoBack={stepIndex > 0}
        canGoNext={canGoNext}
      >
        {stepError ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            {stepError}
          </div>
        ) : null}
        <div className="rounded-md border border-border bg-muted p-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-foreground">Auto-collecte intelligente</span>
            <Button type="button" variant="outline" className="h-8 bg-white text-xs" onClick={applyIntelligentPrefill}>
              Préremplir depuis SIREN/SIRET + OCR
            </Button>
            {typeof intakeHints.score === 'number' ? (
              <span className="rounded-full bg-white px-2 py-1 font-bold text-primary">
                Score cohérence: {intakeHints.score}/100
              </span>
            ) : null}
          </div>
          {intakeHints.issues.length ? (
            <p className="mt-2 text-red-600">Blocages: {intakeHints.issues.join(' · ')}</p>
          ) : null}
          {intakeHints.warnings.length ? (
            <p className="mt-2 text-amber-700">A vérifier: {intakeHints.warnings.join(' · ')}</p>
          ) : null}
        </div>
        <ProgressiveStepChips steps={PROGRESSIVE_STEPS} activeIndex={stepIndex} />
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid gap-4"
          >
          {step.fields
            .filter((field) => !field.condition || field.condition(formData))
            .map((field) => {
            if (field.type === 'select') {
              const options = field.options || [];
              return (
                <div key={field.key}>
                  <Label>{field.label}{field.required ? ' *' : ''}</Label>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {options
                      .map((option) => {
                        if (typeof option === 'string') {
                          return { value: option, label: option };
                        }
                        return { value: option.key, label: option.label };
                      })
                      .filter((option) => {
                        if (field.key !== 'typeFormalite' || !demarcheQuery.trim()) return true;
                        return option.label.toLowerCase().includes(demarcheQuery.trim().toLowerCase());
                      })
                      .map((option) => (
                      <ChoiceCard
                        key={option.value}
                        selected={String(formData[field.key] || '') === String(option.value)}
                        title={option.label}
                        onClick={() => updateField(field, option.value)}
                      />
                    ))}
                  </div>
                  {field.key === 'typeFormalite' ? (
                    <div className="mt-3 space-y-2">
                      <Input
                        type="text"
                        value={demarcheQuery}
                        placeholder="Rechercher une autre démarche (ex: établissement secondaire)"
                        onChange={(event) => setDemarcheQuery(event.target.value)}
                        className={fieldClass}
                      />
                      {demarcheQuery.trim().length > 2
                      && !DEMARCHE_CATALOG.some((item) => item.label.toLowerCase().includes(demarcheQuery.trim().toLowerCase())) ? (
                        <p className="text-xs text-muted-foreground">
                          Démarche précise non proposée automatiquement pour le moment. Contactez notre équipe pour un traitement dédié.
                        </p>
                        ) : null}
                    </div>
                  ) : null}
                  {field.key === 'typeFormalite' ? (
                    <div className="mt-3 rounded-md border border-border bg-muted p-3 text-xs text-muted-foreground">
                      Certaines demandes très spécifiques peuvent être traitées via des partenaires (dont Infogreffe et autres) dans le cadre de notre sous-traitance opérationnelle. Les autres formalités sont réalisées via le Guichet unique (INPI).
                    </div>
                  ) : null}
                </div>
              );
            }

            if (field.type === 'checkbox') {
              return (
                <label key={field.key} className="flex items-start gap-3 rounded-md border border-border bg-muted p-4">
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

            const value = formData[field.key] ?? '';
            const invalid = !isFieldValueValid(field, value);

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
          })}
          </motion.div>
        </AnimatePresence>
        {(formData.initiatorType === 'personne_morale'
          || EXISTING_BUSINESS_FORMALITIES.has(String(formData.typeFormalite || ''))) ? (
          <div className="space-y-2 rounded-md border border-border bg-white p-3 text-xs text-muted-foreground">
            <p>Source de vérification entreprise : Annuaire des entreprises (Data.gouv).</p>
            {EXISTING_BUSINESS_FORMALITIES.has(String(formData.typeFormalite || '')) ? (
              <div className="rounded-md border border-primary/20 bg-secondary p-2">
                <p className="font-bold text-foreground">Signature électronique qualifiée nécessaire</p>
                <p className="mt-1">
                  Hors formalité de création, la finalisation nécessite une signature qualifiée ou FranceConnect+.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
        {missingRequiredFields.length > 0 ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Champs requis restants: {missingRequiredFields.join(', ')}
          </div>
        ) : null}
        <div className="rounded-md border border-border bg-muted p-3 text-xs text-muted-foreground">
          <strong className="mr-1">i</strong>
          {eiLike
            ? "Pour EI/micro-entreprise, le parcours ne comporte pas de statuts ni d'exigence d'associés ou de capital social."
            : 'L’extrait Kbis et la déclaration des bénéficiaires effectifs pourront être demandés ultérieurement selon votre dossier.'}
        </div>
      </StepLayout>

      <div className="mt-4 rounded-md border border-border bg-white p-4 text-xs text-muted-foreground">
        Contact Greffio: {runtimeConfig.supportPhone} — {runtimeConfig.supportEmail}
      </div>
      {!canGoNext && !stepError ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Complétez tous les champs requis de cette étape pour continuer.
        </div>
      ) : null}
      <div className="mt-3 rounded-md border border-border bg-muted p-3 text-xs text-muted-foreground">
        Greffio est un service privé indépendant d’assistance aux démarches administratives des entreprises. Greffio n’est pas un service officiel de l’État, des greffes des tribunaux de commerce ou d’Infogreffe.
      </div>
    </div>
  );
};

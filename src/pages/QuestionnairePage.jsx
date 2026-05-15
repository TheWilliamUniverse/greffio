import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Button } from '@/components/ui/button.jsx';
import { ProgressCircle } from '@/components/questionnaire/ProgressCircle.jsx';
import { StepLayout } from '@/components/questionnaire/StepLayout.jsx';
import { ChoiceCard } from '@/components/questionnaire/ChoiceCard.jsx';
import { AutosaveIndicator } from '@/components/questionnaire/AutosaveIndicator.jsx';
import { SecurityNotice } from '@/components/questionnaire/SecurityNotice.jsx';
import {
  DEMARCHE_CATALOG,
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

const defaultData = {
  initiatorType: 'personne_physique',
  firstName: '',
  lastName: '',
  nationality: 'Française',
  companyCountry: 'France',
  companySiren: '',
  companyName: '',
  email: '',
  phone: '04 11 81 86 70',
  typeFormalite: '',
  formeJuridique: '',
  denomination: '',
  adresseSiege: '',
  activite: '',
  capital: '',
  associesSummary: '',
  dirigeant: '',
  beneficiairesEffectifs: '',
  validationConfirmed: false,
};

const fieldClass = 'rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring';

const normalizeFormalityToService = (typeFormalite, formeJuridique) => {
  if (typeFormalite === 'etablissement_secondaire_creation') return 'creation-etablissement-secondaire';
  if (typeFormalite === 'transfert_siege') return 'transfert-siege';
  if (typeFormalite === 'dissolution_liquidation_radiation') return 'dissolution-liquidation-radiation';
  if (typeFormalite === 'depot_comptes_annuels') return 'depot-comptes-annuels';
  if (typeFormalite === 'modification_entreprise') return 'modification';
  if (typeFormalite === 'micro_entreprise') return 'micro-entreprise';
  if (formeJuridique === 'SCI') return 'creation-sci';
  if (formeJuridique === 'SARL' || formeJuridique === 'EURL') return 'creation-sarl';
  return 'creation-sasu';
};

export const QuestionnairePage = () => {
  const navigate = useNavigate();
  const [dossierId, setDossierId] = useState(getCurrentDossierId());
  const [reference, setReference] = useState('F00000000');
  const [formData, setFormData] = useState(defaultData);
  const [stepIndex, setStepIndex] = useState(0);
  const [autosaveState, setAutosaveState] = useState('idle');
  const [loading, setLoading] = useState(true);
  const [demarcheQuery, setDemarcheQuery] = useState('');

  const step = QUESTIONNAIRE_FLOW[stepIndex];
  const progress = getProgressPercent(stepIndex);
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

  const [sirenLookupState, setSirenLookupState] = useState('idle');

  const lookupSiren = async () => {
    const value = String(formData.companySiren || '').trim();
    if (value.length !== 9) return;
    try {
      setSirenLookupState('loading');
      const payload = await lookupCompanyBySiren(value);
      const company = payload?.company;
      if (company) {
        setFormData((current) => ({
          ...current,
          companyName: company.denomination || current.companyName,
          companyCountry: company.country || current.companyCountry,
        }));
      }
      setSirenLookupState('done');
    } catch (_error) {
      setSirenLookupState('error');
    }
  };

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
          setReference(state.reference || state?.dossier?.reference || 'F00000000');
          setFormData((current) => ({
            ...current,
            ...(state.questionnaire || {}),
          }));
        }
      } catch (_error) {
        // Keep graceful UI fallback.
      } finally {
        setLoading(false);
      }
    };
    void boot();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setFormData((current) => ({
      ...current,
      [field.key]: field.type === 'checkbox' ? Boolean(value) : value,
    }));
  };

  const goNext = async () => {
    if (!canGoNext) return;
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
      setAutosaveState('error');
    }

    if (stepIndex >= QUESTIONNAIRE_FLOW.length - 1) {
      navigate('/dashboard');
      return;
    }
    setStepIndex((current) => current + 1);
  };

  const goBack = () => setStepIndex((current) => Math.max(0, current - 1));

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
        canGoBack={stepIndex > 0}
        canGoNext={canGoNext}
      >
        <div className="grid gap-4">
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
            return (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}{field.required ? ' *' : ''}</Label>
                <Input
                  type={field.type === 'number' ? 'number' : field.type}
                  value={value}
                  placeholder={field.placeholder || ''}
                  onChange={(event) => updateField(field, event.target.value)}
                  className={`${fieldClass} ${invalid && String(value).length > 0 ? 'border-red-400' : ''}`}
                />
                {field.key === 'companySiren' && formData.initiatorType === 'personne_morale' ? (
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" className="bg-white" onClick={lookupSiren} disabled={String(formData.companySiren || '').trim().length !== 9 || sirenLookupState === 'loading'}>
                      Recherche automatique annuaire
                    </Button>
                    {sirenLookupState === 'loading' ? <span className="text-xs text-muted-foreground">Recherche...</span> : null}
                    {sirenLookupState === 'done' ? <span className="text-xs text-emerald-600">Entreprise trouvée</span> : null}
                    {sirenLookupState === 'error' ? <span className="text-xs text-red-600">Aucune correspondance</span> : null}
                  </div>
                ) : null}
                {invalid && String(value).length > 0 ? (
                  <p className="text-xs text-red-600">Ce champ est requis.</p>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="rounded-md border border-border bg-muted p-3 text-xs text-muted-foreground">
          <strong className="mr-1">i</strong>
          L’extrait Kbis et la déclaration des bénéficiaires effectifs pourront être demandés ultérieurement selon votre dossier.
        </div>
      </StepLayout>

      <div className="mt-4 rounded-md border border-border bg-white p-4 text-xs text-muted-foreground">
        Contact Greffio: {runtimeConfig.supportPhone} — {runtimeConfig.supportEmail}
      </div>
      <div className="mt-3 rounded-md border border-border bg-muted p-3 text-xs text-muted-foreground">
        Greffio est un service privé indépendant d’assistance aux démarches administratives des entreprises. Greffio n’est pas un service officiel de l’État, des greffes des tribunaux de commerce ou d’Infogreffe.
      </div>
    </div>
  );
};

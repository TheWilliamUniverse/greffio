import React, { useMemo, useState } from 'react';
import { Building2, ChevronDown, Plus, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { SegmentedChoice } from '@/components/questionnaire/SegmentedChoice.jsx';
import {
  getMinorAssociateWarnings,
  isLegallyMinor,
  validateDirectorEligibility,
} from '@/config/minorAssociateRules.js';
import { BirthDateMinorEncouragement } from '@/components/BirthDateMinorEncouragement.jsx';
import { QuestionnaireNotice } from '@/components/questionnaire/QuestionnaireNotice.jsx';
import {
  ASSOCIATE_TYPES,
  buildAssociateDisplayName,
  buildAssociatesSummary,
  createEmptyAssociate,
} from '@/utils/associateEntry.js';
import {
  ASSOCIATE_ROLE_OPTIONS,
  isOfficerRole,
  LEGAL_ENTITY_SIGNATORY_QUALITIES,
} from '@/utils/officerFromAssociates.js';

const fieldClass = 'h-12 rounded-xl border-2 border-[#d4e2f5] bg-white px-3 text-sm font-medium focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/12';

export const AssociatesMinorPanel = ({
  value = [],
  onChange,
  dirigeant = '',
  onDirigeantChange,
  includeDirector = false,
}) => {
  const associates = Array.isArray(value) && value.length ? value : [createEmptyAssociate()];
  const [expandedId, setExpandedId] = useState(associates[0]?.id || null);

  const updateAssociate = (index, patch) => {
    const next = associates.map((item, i) => {
      if (i !== index) return item;
      const merged = { ...item, ...patch };
      if (merged.associateType === ASSOCIATE_TYPES.COMPANY) {
        merged.isMinorEmancipated = false;
        merged.legalRepresentatives = '';
        merged.birthDate = '';
        merged.firstName = '';
        merged.lastName = '';
      } else {
        const minor = isLegallyMinor(merged.birthDate);
        if (!minor) {
          merged.isMinorEmancipated = false;
          merged.legalRepresentatives = '';
        }
        if (minor && !merged.isMinorEmancipated && ['Président désigné', 'Directeur Général'].includes(merged.roleLabel)) {
          merged.roleLabel = 'Associé';
        }
      }
      return merged;
    });
    onChange({ associates: next, associesSummary: buildAssociatesSummary(next) });
  };

  const addAssociate = () => {
    const entry = createEmptyAssociate();
    setExpandedId(entry.id);
    onChange({
      associates: [...associates, entry],
      associesSummary: buildAssociatesSummary([...associates, entry]),
    });
  };

  const removeAssociate = (index) => {
    const next = associates.filter((_, i) => i !== index);
    const fallback = next.length ? next : [createEmptyAssociate()];
    if (!fallback.some((a) => a.id === expandedId)) {
      setExpandedId(fallback[0]?.id || null);
    }
    onChange({ associates: fallback, associesSummary: buildAssociatesSummary(fallback) });
  };

  const warnings = useMemo(
    () => getMinorAssociateWarnings({ associates, dirigeant }),
    [associates, dirigeant],
  );
  const directorCheck = useMemo(
    () => validateDirectorEligibility({ associates, dirigeant }),
    [associates, dirigeant],
  );

  return (
    <div className="space-y-4">
      <QuestionnaireNotice variant="info" title="Associés de la société">
        Ajoutez chaque associé en <strong>personne physique</strong> ou <strong>personne morale</strong>.
        Une personne morale peut être <strong>Présidente</strong> ou <strong>Directeur Général</strong> : indiquez alors le représentant légal qui signera.
        Pour un mineur, précisez s&apos;il est légalement émancipé ou représenté par ses parents/tuteur.
      </QuestionnaireNotice>

      {associates.map((associate, index) => {
        const isCompany = associate.associateType === ASSOCIATE_TYPES.COMPANY;
        const minor = !isCompany && isLegallyMinor(associate.birthDate);
        const roleOptions = isCompany
          ? ASSOCIATE_ROLE_OPTIONS.COMPANY
          : (minor && !associate.isMinorEmancipated
            ? ['Associé', 'Associée']
            : ASSOCIATE_ROLE_OPTIONS.PERSON);
        const needsRepresentative = isCompany;
        const displayName = buildAssociateDisplayName(associate) || `Associé ${index + 1}`;
        const isExpanded = expandedId === associate.id || associates.length === 1;

        return (
          <div key={associate.id || index} className="overflow-hidden rounded-xl border border-[#d4e2f5] bg-white shadow-sm">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/20"
              onClick={() => setExpandedId(isExpanded ? null : associate.id)}
            >
              <div className="flex min-w-0 items-center gap-2">
                {isCompany ? <Building2 className="h-4 w-4 shrink-0 text-primary" /> : <User className="h-4 w-4 shrink-0 text-primary" />}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {isCompany ? 'Personne morale' : 'Personne physique'}
                    {associate.share ? ` · ${associate.share} %` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {associates.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeAssociate(index);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
                <ChevronDown className={`h-4 w-4 transition ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {isExpanded ? (
              <div className="space-y-4 border-t border-[#d4e2f5] px-4 pb-4 pt-3">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type d&apos;associé</Label>
                  <div className="mt-2">
                    <SegmentedChoice
                      options={[
                        { key: ASSOCIATE_TYPES.PERSON, label: 'Personne physique' },
                        { key: ASSOCIATE_TYPES.COMPANY, label: 'Personne morale' },
                      ]}
                      value={associate.associateType || ASSOCIATE_TYPES.PERSON}
                      onChange={(nextType) => updateAssociate(index, { associateType: nextType })}
                    />
                  </div>
                </div>

                {isCompany ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label>Dénomination sociale *</Label>
                      <Input
                        className={fieldClass}
                        value={associate.companyName || ''}
                        onChange={(e) => updateAssociate(index, { companyName: e.target.value })}
                        placeholder="Ex. William Establishments SAS"
                      />
                    </div>
                    <div>
                      <Label>SIREN *</Label>
                      <Input
                        className={fieldClass}
                        value={associate.siren || ''}
                        onChange={(e) => updateAssociate(index, { siren: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                        placeholder="9 chiffres"
                      />
                    </div>
                    <div>
                      <Label>Forme juridique *</Label>
                      <select
                        className={`${fieldClass} w-full`}
                        value={associate.legalForm || 'SAS'}
                        onChange={(e) => updateAssociate(index, { legalForm: e.target.value })}
                      >
                        {['SAS', 'SASU', 'SARL', 'EURL', 'SCI'].map((form) => (
                          <option key={form} value={form}>{form}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>{needsRepresentative ? 'Représentant légal *' : 'Représentant légal'}</Label>
                      <Input
                        className={fieldClass}
                        value={associate.representativeName || ''}
                        onChange={(e) => updateAssociate(index, { representativeName: e.target.value })}
                        placeholder="Nom et prénom du signataire"
                      />
                    </div>
                    <div>
                      <Label>Qualité du signataire *</Label>
                      <select
                        className={`${fieldClass} w-full`}
                        value={associate.representativeQuality || ''}
                        onChange={(e) => updateAssociate(index, { representativeQuality: e.target.value })}
                      >
                        <option value="">Choisir la qualité du signataire</option>
                        {LEGAL_ENTITY_SIGNATORY_QUALITIES.map((quality) => (
                          <option key={quality} value={quality}>{quality}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Ville RCS (optionnel)</Label>
                      <Input
                        className={fieldClass}
                        value={associate.rcsCity || ''}
                        onChange={(e) => updateAssociate(index, { rcsCity: e.target.value })}
                        placeholder="Ex. Nice"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Siège social / adresse *</Label>
                      <Input
                        className={fieldClass}
                        value={associate.address || ''}
                        onChange={(e) => updateAssociate(index, { address: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Quote-part (%)</Label>
                      <Input
                        className={fieldClass}
                        value={associate.share || ''}
                        onChange={(e) => updateAssociate(index, { share: e.target.value })}
                        placeholder="Ex. 50"
                      />
                    </div>
                    <div>
                      <Label>Rôle dans la société</Label>
                      <select
                        className={`${fieldClass} w-full`}
                        value={associate.roleLabel || 'Associé'}
                        onChange={(e) => updateAssociate(index, { roleLabel: e.target.value })}
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                    {needsRepresentative && !String(associate.representativeName || '').trim() ? (
                      <p className="sm:col-span-2 text-sm text-amber-800">
                        Personne morale : le représentant légal signataire est obligatoire pour générer les documents.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Prénom *</Label>
                      <Input className={fieldClass} value={associate.firstName || ''} onChange={(e) => updateAssociate(index, { firstName: e.target.value })} />
                    </div>
                    <div>
                      <Label>Nom *</Label>
                      <Input className={fieldClass} value={associate.lastName || ''} onChange={(e) => updateAssociate(index, { lastName: e.target.value })} />
                    </div>
                    <div>
                      <Label>Date de naissance</Label>
                      <Input
                        type="date"
                        className={fieldClass}
                        value={associate.birthDate?.includes('/') ? '' : (associate.birthDate || '')}
                        onChange={(e) => updateAssociate(index, { birthDate: e.target.value })}
                      />
                      <BirthDateMinorEncouragement birthDate={associate.birthDate} showLegalHint />
                    </div>
                    <div>
                      <Label>Quote-part (%)</Label>
                      <Input className={fieldClass} value={associate.share || ''} onChange={(e) => updateAssociate(index, { share: e.target.value })} placeholder="Ex. 50" />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Adresse</Label>
                      <Input className={fieldClass} value={associate.address || ''} onChange={(e) => updateAssociate(index, { address: e.target.value })} />
                    </div>
                    <div>
                      <Label>Rôle dans la société</Label>
                      <select
                        className={`${fieldClass} w-full`}
                        value={associate.roleLabel || 'Associé'}
                        onChange={(e) => updateAssociate(index, { roleLabel: e.target.value })}
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {minor ? (
                  <div className="space-y-3 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 to-white p-4">
                    <p className="text-sm font-bold text-amber-950">Associé mineur</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: true, label: 'Oui – ordonnance d’émancipation à joindre' },
                        { value: false, label: 'Non – représenté(e) par ses représentants légaux' },
                      ].map((option) => (
                        <button
                          key={String(option.value)}
                          type="button"
                          className={`rounded-xl border px-3 py-2 text-sm ${associate.isMinorEmancipated === option.value ? 'border-primary bg-white font-semibold shadow-sm' : 'border-border bg-white/80'}`}
                          onClick={() => updateAssociate(index, { isMinorEmancipated: option.value })}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    {!associate.isMinorEmancipated ? (
                      <div>
                        <Label>Représentants légaux</Label>
                        <Input
                          className={fieldClass}
                          value={associate.legalRepresentatives || ''}
                          onChange={(e) => updateAssociate(index, { legalRepresentatives: e.target.value })}
                          placeholder="Ex. Mme X et M. Y"
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}

      <Button type="button" variant="outline" className="h-12 w-full rounded-xl border-2 border-dashed border-primary/30 bg-white text-primary hover:bg-secondary/40" onClick={addAssociate}>
        <Plus className="mr-2 h-4 w-4" />
        Ajouter un associé
      </Button>

      {includeDirector ? (
        <div className="rounded-xl border border-[#d4e2f5] bg-white p-4">
          <Label>Président / dirigeant *</Label>
          <Input
            value={dirigeant}
            onChange={(e) => onDirigeantChange?.(e.target.value)}
            placeholder="Nom et prénom du dirigeant"
            className={`${fieldClass} mt-2 ${!directorCheck.ok ? 'border-red-500' : ''}`}
          />
          {!directorCheck.ok ? (
            <p className="mt-2 text-sm text-red-600">{directorCheck.message}</p>
          ) : null}
        </div>
      ) : null}

      {warnings.length ? (
        <QuestionnaireNotice variant="vigilance" title="Points de vigilance" items={warnings} />
      ) : null}
    </div>
  );
};

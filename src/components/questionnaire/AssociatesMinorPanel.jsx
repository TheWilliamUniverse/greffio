import React, { useMemo } from 'react';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import {
  getMinorAssociateWarnings,
  isLegallyMinor,
  validateDirectorEligibility,
} from '@/config/minorAssociateRules.js';
import { BirthDateMinorEncouragement } from '@/components/BirthDateMinorEncouragement.jsx';

const emptyAssociate = () => ({
  id: `associate_${Math.random().toString(36).slice(2, 8)}`,
  firstName: '',
  lastName: '',
  birthDate: '',
  address: '',
  share: '',
  roleLabel: 'Associé',
  isMinorEmancipated: false,
  legalRepresentatives: '',
});

const ROLE_OPTIONS = ['Associé', 'Associée', 'Président désigné', 'Directeur Général'];

const buildSummary = (associates) => associates
  .filter((a) => a.firstName || a.lastName)
  .map((a) => {
    const name = [a.firstName, a.lastName].filter(Boolean).join(' ');
    const parts = [name, a.address, a.share ? `${a.share} %` : ''].filter(Boolean);
    return parts.join(', ');
  })
  .join('\n');

export const AssociatesMinorPanel = ({ value = [], onChange, dirigeant = '', onDirigeantChange }) => {
  const associates = Array.isArray(value) && value.length ? value : [emptyAssociate()];

  const updateAssociate = (index, patch) => {
    const next = associates.map((item, i) => {
      if (i !== index) return item;
      const merged = { ...item, ...patch };
      const minor = isLegallyMinor(merged.birthDate);
      if (!minor) {
        merged.isMinorEmancipated = false;
        merged.legalRepresentatives = '';
        if (merged.roleLabel !== 'Associé' && merged.roleLabel !== 'Associée') {
          merged.roleLabel = 'Associé';
        }
      }
      if (minor && !merged.isMinorEmancipated && ['Président désigné', 'Directeur Général'].includes(merged.roleLabel)) {
        merged.roleLabel = 'Associé';
      }
      return merged;
    });
    onChange({ associates: next, associesSummary: buildSummary(next) });
  };

  const addAssociate = () => {
    onChange({ associates: [...associates, emptyAssociate()], associesSummary: buildSummary([...associates, emptyAssociate()]) });
  };

  const removeAssociate = (index) => {
    const next = associates.filter((_, i) => i !== index);
    onChange({ associates: next.length ? next : [emptyAssociate()], associesSummary: buildSummary(next) });
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
      <div className="rounded-md border border-border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
        Pour chaque associé mineur, indiquez s&apos;il ou elle est <strong>légalement émancipé(e)</strong>.
        {' '}Un mineur émancipé pourra exercer des fonctions de direction et devra joindre son ordonnance d&apos;émancipation.
        {' '}Un mineur non émancipé pourra être associé (représenté par ses parents ou tuteur) mais pas dirigeant ; une autorisation parentale sera demandée.
      </div>

      {associates.map((associate, index) => {
        const minor = isLegallyMinor(associate.birthDate);
        const roleOptions = minor && !associate.isMinorEmancipated
          ? ['Associé', 'Associée']
          : ROLE_OPTIONS;

        return (
          <div key={associate.id || index} className="rounded-md border border-border bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-bold">Associé {index + 1}</p>
              {associates.length > 1 ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeAssociate(index)}>
                  <Trash2 className="mr-1 h-4 w-4" />
                  Retirer
                </Button>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Prénom</Label>
                <Input value={associate.firstName || ''} onChange={(e) => updateAssociate(index, { firstName: e.target.value })} />
              </div>
              <div>
                <Label>Nom</Label>
                <Input value={associate.lastName || ''} onChange={(e) => updateAssociate(index, { lastName: e.target.value })} />
              </div>
              <div>
                <Label>Date de naissance</Label>
                <Input
                  type="date"
                  value={associate.birthDate?.includes('/') ? '' : (associate.birthDate || '')}
                  onChange={(e) => updateAssociate(index, { birthDate: e.target.value })}
                />
                <BirthDateMinorEncouragement birthDate={associate.birthDate} showLegalHint />
              </div>
              <div>
                <Label>Quote-part (%)</Label>
                <Input value={associate.share || ''} onChange={(e) => updateAssociate(index, { share: e.target.value })} placeholder="Ex. 50" />
              </div>
              <div className="sm:col-span-2">
                <Label>Adresse</Label>
                <Input value={associate.address || ''} onChange={(e) => updateAssociate(index, { address: e.target.value })} />
              </div>
              <div>
                <Label>Rôle dans la société</Label>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={associate.roleLabel || 'Associé'}
                  onChange={(e) => updateAssociate(index, { roleLabel: e.target.value })}
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
            </div>

            {minor ? (
              <div className="mt-4 space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-semibold text-amber-900">Associé mineur</p>
                <div>
                  <Label>Légalement émancipé(e) ?</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      { value: true, label: 'Oui — ordonnance d’émancipation à joindre' },
                      { value: false, label: 'Non — représenté(e) par ses représentants légaux' },
                    ].map((option) => (
                      <button
                        key={String(option.value)}
                        type="button"
                        className={`rounded-md border px-3 py-2 text-sm ${associate.isMinorEmancipated === option.value ? 'border-primary bg-secondary font-semibold' : 'border-border bg-white'}`}
                        onClick={() => updateAssociate(index, { isMinorEmancipated: option.value })}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                {!associate.isMinorEmancipated ? (
                  <div>
                    <Label>Représentants légaux (parents, tuteur)</Label>
                    <Input
                      value={associate.legalRepresentatives || ''}
                      onChange={(e) => updateAssociate(index, { legalRepresentatives: e.target.value })}
                      placeholder="Ex. Mme X et M. Y, en qualité de parents"
                    />
                  </div>
                ) : (
                  <p className="text-xs leading-5 text-amber-800">
                    Après validation du dossier, déposez l&apos;ordonnance ou le jugement d&apos;émancipation dans votre espace Documents.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        );
      })}

      <Button type="button" variant="outline" onClick={addAssociate}>
        <Plus className="mr-2 h-4 w-4" />
        Ajouter un associé
      </Button>

      <div>
        <Label>Président / dirigeant *</Label>
        <Input
          value={dirigeant}
          onChange={(e) => onDirigeantChange?.(e.target.value)}
          placeholder="Nom et prénom du dirigeant"
          className={!directorCheck.ok ? 'border-red-500' : ''}
        />
        {!directorCheck.ok ? (
          <p className="mt-2 text-sm text-red-600">{directorCheck.message}</p>
        ) : null}
      </div>

      {warnings.length ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <AlertCircle className="h-4 w-4" />
            Points de vigilance
          </div>
          <ul className="list-disc space-y-1 pl-5">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

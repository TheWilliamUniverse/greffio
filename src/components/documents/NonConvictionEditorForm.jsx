import React from 'react';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';

export const NonConvictionEditorForm = ({ fields, updateField }) => (
  <>
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <Label>Prénom(s)</Label>
        <Input className="mt-1" value={fields.declarantFirstName || ''} onChange={(e) => updateField('declarantFirstName', e.target.value)} />
      </div>
      <div>
        <Label>Nom de naissance</Label>
        <Input
          className="mt-1"
          value={fields.declarantBirthName || fields.declarantLastName || ''}
          onChange={(e) => {
            const value = e.target.value;
            updateField('declarantBirthName', value);
            updateField('declarantLastName', value);
          }}
        />
      </div>
      <div>
        <Label>Date de naissance</Label>
        <Input type="date" className="mt-1" value={fields.declarantBirthDate || ''} onChange={(e) => updateField('declarantBirthDate', e.target.value)} />
      </div>
      <div>
        <Label>Lieu de naissance</Label>
        <Input className="mt-1" value={fields.declarantBirthCity || ''} onChange={(e) => updateField('declarantBirthCity', e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <Label>Adresse</Label>
        <Input className="mt-1" value={fields.addressLine1 || ''} onChange={(e) => updateField('addressLine1', e.target.value)} />
      </div>
      <div>
        <Label>Code postal</Label>
        <Input className="mt-1" value={fields.postalCode || ''} onChange={(e) => updateField('postalCode', e.target.value)} />
      </div>
      <div>
        <Label>Ville</Label>
        <Input className="mt-1" value={fields.city || ''} onChange={(e) => updateField('city', e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <Label>Père – nom et prénom(s)</Label>
        <Input className="mt-1" value={fields.parent1FullName || ''} onChange={(e) => updateField('parent1FullName', e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <Label>Mère – nom et prénom(s)</Label>
        <Input className="mt-1" value={fields.parent2FullName || ''} onChange={(e) => updateField('parent2FullName', e.target.value)} />
      </div>
      <div>
        <Label>Fait à</Label>
        <Input className="mt-1" value={fields.statementCity || ''} onChange={(e) => updateField('statementCity', e.target.value)} />
      </div>
      <div>
        <Label>Le</Label>
        <Input type="date" className="mt-1" value={fields.statementDate || ''} onChange={(e) => updateField('statementDate', e.target.value)} />
      </div>
    </div>

    <div className="mt-5 space-y-3 rounded-xl border border-[var(--we-border)] bg-[#fafcff] p-4">
      <p className="text-xs font-bold uppercase text-primary">Attestations</p>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={Boolean(fields.declarationNonCondamnation)}
          onChange={(e) => updateField('declarationNonCondamnation', e.target.checked)}
        />
        <span>Je déclare sur l&apos;honneur ne pas faire l&apos;objet d&apos;une condamnation m&apos;interdisant de gérer une entreprise.</span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={Boolean(fields.declarationFiliation)}
          onChange={(e) => updateField('declarationFiliation', e.target.checked)}
        />
        <span>Je certifie l&apos;exactitude des renseignements de filiation ci-dessus.</span>
      </label>
    </div>
  </>
);

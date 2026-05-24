import React from 'react';
import { Plus, Star, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Button } from '@/components/ui/button.jsx';
import { createPhoneEntry } from '@/utils/userProfile.js';

export const PhoneNumbersField = ({
  phones,
  onChange,
  errors = {},
}) => {
  const list = phones?.length ? phones : [createPhoneEntry({ isPrimary: true })];

  const updateList = (next) => {
    onChange(next.filter((entry) => entry.number || next.length === 1));
  };

  const patchPhone = (index, patch) => {
    const next = list.map((entry, i) => (i === index ? { ...entry, ...patch } : entry));
    updateList(next);
  };

  const setPrimary = (index) => {
    onChange(list.map((entry, i) => ({ ...entry, isPrimary: i === index })));
  };

  const removePhone = (index) => {
    if (list.length <= 1) {
      onChange([createPhoneEntry({ isPrimary: true })]);
      return;
    }
    const next = list.filter((_, i) => i !== index);
    if (!next.some((entry) => entry.isPrimary)) {
      next[0] = { ...next[0], isPrimary: true };
    }
    onChange(next);
  };

  const addPhone = () => {
    onChange([...list, createPhoneEntry({ label: 'secondaire' })]);
  };

  return (
    <div className="space-y-4">
      {list.map((phone, index) => (
        <div key={phone.id} className="interactive-hover rounded-xl border border-[var(--we-border)] bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">
              {phone.isPrimary ? 'Téléphone principal' : `Téléphone ${index + 1}`}
            </p>
            <div className="flex items-center gap-2">
              {!phone.isPrimary ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-white"
                  onClick={() => setPrimary(index)}
                  aria-label={`Définir le numéro ${index + 1} comme principal`}
                >
                  <Star className="mr-1 h-3.5 w-3.5" />
                  Principal
                </Button>
              ) : (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">Principal</span>
              )}
              {list.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removePhone(index)}
                  aria-label={`Supprimer le numéro ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              ) : null}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[140px_1fr]">
            <div className="space-y-2">
              <Label htmlFor={`phone-label-${phone.id}`}>Type</Label>
              <select
                id={`phone-label-${phone.id}`}
                className="flex h-10 w-full rounded-md border border-input bg-white px-3 text-sm font-medium"
                value={phone.label}
                onChange={(event) => patchPhone(index, { label: event.target.value })}
              >
                <option value="mobile">Mobile</option>
                <option value="fixe">Fixe</option>
                <option value="secondaire">Secondaire</option>
                <option value="pro">Professionnel</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`phone-number-${phone.id}`}>
                Numéro {phone.isPrimary ? <span className="text-destructive">*</span> : null}
              </Label>
              <Input
                id={`phone-number-${phone.id}`}
                type="tel"
                inputMode="tel"
                autoComplete={phone.isPrimary ? 'tel' : 'tel-national'}
                value={phone.number}
                onChange={(event) => patchPhone(index, { number: event.target.value })}
                placeholder="+33 6 12 34 56 78"
              />
              {errors[`phone_${index}`] ? (
                <p className="text-xs text-destructive">{errors[`phone_${index}`]}</p>
              ) : null}
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" className="bg-white" onClick={addPhone}>
        <Plus className="mr-2 h-4 w-4" />
        Ajouter un numéro
      </Button>
    </div>
  );
};

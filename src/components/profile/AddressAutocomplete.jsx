import React, { useEffect, useId, useRef, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Button } from '@/components/ui/button.jsx';
import { searchAddresses } from '@/api/profile.js';

export const AddressAutocomplete = ({
  address,
  onChange,
  errors = {},
}) => {
  const listId = useId();
  const debounceRef = useRef(null);
  const [query, setQuery] = useState(address.searchQuery || address.line1 || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [manualMode, setManualMode] = useState(Boolean(address.manualEntry));

  useEffect(() => {
    setQuery(address.searchQuery || address.line1 || '');
    setManualMode(Boolean(address.manualEntry));
  }, [address.searchQuery, address.line1, address.manualEntry]);

  const patchAddress = (patch) => {
    onChange({ ...address, ...patch });
  };

  const runSearch = (value) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (value.trim().length < 3) {
        setSuggestions([]);
        return;
      }
      try {
        setLoading(true);
        const payload = await searchAddresses(value);
        setSuggestions(Array.isArray(payload?.results) ? payload.results : []);
      } catch (_error) {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 280);
  };

  const selectSuggestion = (item) => {
    patchAddress({
      searchQuery: item.label,
      line1: item.line1,
      line2: address.line2 || '',
      city: item.city,
      postalCode: item.postalCode,
      country: item.country || 'France',
      latitude: item.latitude,
      longitude: item.longitude,
      manualEntry: false,
    });
    setQuery(item.label);
    setSuggestions([]);
  };

  return (
    <div className="space-y-4">
      {!manualMode ? (
        <div className="space-y-2">
          <Label htmlFor={`${listId}-search`}>
            Rechercher une adresse <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id={`${listId}-search`}
              value={query}
              onChange={(event) => {
                const value = event.target.value;
                setQuery(value);
                patchAddress({ searchQuery: value });
                runSearch(value);
              }}
              placeholder="Commencez à taper votre adresse…"
              className="pl-10"
              autoComplete="street-address"
              role="combobox"
              aria-expanded={suggestions.length > 0}
              aria-controls={`${listId}-suggestions`}
            />
          </div>
          {loading ? <p className="text-xs text-muted-foreground">Recherche en cours…</p> : null}
          {suggestions.length > 0 ? (
            <ul
              id={`${listId}-suggestions`}
              className="overflow-hidden rounded-xl border border-[var(--we-border)] bg-white shadow-elevation-sm"
              role="listbox"
            >
              {suggestions.map((item) => (
                <li key={item.id} role="option">
                  <button
                    type="button"
                    className="interactive-hover flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition hover:bg-[#f5f9ff]"
                    onClick={() => selectSuggestion(item)}
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <Button type="button" variant="outline" className="bg-white" onClick={() => {
            setManualMode(true);
            patchAddress({ manualEntry: true });
            setSuggestions([]);
          }}>
            Saisir l&apos;adresse manuellement
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--we-border)] bg-[#fafcff] p-4">
          <p className="text-sm font-semibold text-foreground">Saisie manuelle activée</p>
          <p className="mt-1 text-xs text-muted-foreground">Complétez chaque champ ci-dessous.</p>
          <Button
            type="button"
            variant="link"
            className="mt-2 h-auto p-0"
            onClick={() => {
              setManualMode(false);
              patchAddress({ manualEntry: false });
            }}
          >
            Revenir à la recherche automatique
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`${listId}-line1`}>Adresse</Label>
          <Input
            id={`${listId}-line1`}
            value={address.line1}
            onChange={(event) => patchAddress({ line1: event.target.value })}
            placeholder="Numéro et voie"
          />
          {errors.line1 ? <p className="text-xs text-destructive">{errors.line1}</p> : null}
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`${listId}-line2`}>Complément d&apos;adresse</Label>
          <Input
            id={`${listId}-line2`}
            value={address.line2}
            onChange={(event) => patchAddress({ line2: event.target.value })}
            placeholder="Bâtiment, étage, boîte…"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${listId}-city`}>Ville</Label>
          <Input
            id={`${listId}-city`}
            value={address.city}
            onChange={(event) => patchAddress({ city: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${listId}-postal`}>Code postal</Label>
          <Input
            id={`${listId}-postal`}
            value={address.postalCode}
            onChange={(event) => patchAddress({ postalCode: event.target.value })}
          />
          {errors.postalCode ? <p className="text-xs text-destructive">{errors.postalCode}</p> : null}
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`${listId}-country`}>Pays</Label>
          <Input
            id={`${listId}-country`}
            value={address.country}
            onChange={(event) => patchAddress({ country: event.target.value })}
          />
        </div>
      </div>
    </div>
  );
};

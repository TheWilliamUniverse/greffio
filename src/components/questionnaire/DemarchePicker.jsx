import React, { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Input } from '@/components/ui/input.jsx';
import { FormalityChoiceCard } from '@/components/questionnaire/FormalityChoiceCard.jsx';
import { DEMARCHE_CATALOG, DEMARCHE_CATEGORIES } from '@/lib/questionnaireFlow.js';

const normalize = (value) => String(value || '').trim().toLowerCase();

export const DemarchePicker = ({ value, onChange }) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredItems = useMemo(() => {
    const q = normalize(query);
    return DEMARCHE_CATALOG.filter((item) => {
      const matchesQuery = !q
        || normalize(item.label).includes(q)
        || normalize(item.key).replace(/_/g, ' ').includes(q);
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      return matchesQuery && matchesCategory;
    });
  }, [query, activeCategory]);

  const groupedItems = useMemo(() => {
    if (query.trim() || activeCategory !== 'all') {
      return [{ category: null, items: filteredItems }];
    }
    return DEMARCHE_CATEGORIES
      .map((category) => ({
        category,
        items: DEMARCHE_CATALOG.filter((item) => item.category === category.id),
      }))
      .filter((group) => group.items.length > 0);
  }, [query, activeCategory, filteredItems]);

  const selectedLabel = DEMARCHE_CATALOG.find((item) => item.key === value)?.label;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          placeholder="Rechercher une démarche (ex. SASU, transfert, Kbis…)"
          onChange={(event) => setQuery(event.target.value)}
          className="h-11 rounded-xl border-border bg-white pl-9 text-sm shadow-sm"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            activeCategory === 'all'
              ? 'bg-primary text-white shadow-sm'
              : 'border border-border bg-white text-muted-foreground hover:border-primary/30 hover:text-foreground'
          }`}
        >
          Toutes
        </button>
        {DEMARCHE_CATEGORIES.map((category) => (
          <button
            type="button"
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              activeCategory === category.id
                ? 'bg-primary text-white shadow-sm'
                : 'border border-border bg-white text-muted-foreground hover:border-primary/30 hover:text-foreground'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {selectedLabel ? (
        <div className="flex items-center gap-2 rounded-xl border border-primary/25 bg-secondary/60 px-3 py-2 text-sm">
          <Check className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-muted-foreground">Sélection :</span>
          <span className="font-semibold text-foreground">{selectedLabel}</span>
        </div>
      ) : null}

      <div className="max-h-[min(62vh,680px)] space-y-6 overflow-y-auto pr-1">
        {groupedItems.map(({ category, items }) => (
          <div key={category?.id || 'flat'}>
            {category ? (
              <div className="mb-3">
                <p className="text-xs font-bold uppercase tracking-wide text-primary">{category.label}</p>
                <p className="text-xs text-muted-foreground">{category.description}</p>
              </div>
            ) : null}
            <ul className="grid gap-4 sm:grid-cols-2">
              {items.map((item) => (
                <li key={item.key}>
                  <FormalityChoiceCard
                    item={item}
                    selected={value === item.key}
                    onClick={() => onChange(item.key)}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
        {!filteredItems.length ? (
          <p className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
            Aucune démarche ne correspond à votre recherche. Contactez notre équipe pour un traitement dédié.
          </p>
        ) : null}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        La plupart des formalités passent par le Guichet unique (INPI). Certaines demandes spécifiques peuvent être traitées via des partenaires dans le cadre de notre sous-traitance opérationnelle.
      </p>
    </div>
  );
};

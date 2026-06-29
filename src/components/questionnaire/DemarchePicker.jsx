import React, { useEffect, useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Input } from '@/components/ui/input.jsx';
import { FormalityChoiceCard } from '@/components/questionnaire/FormalityChoiceCard.jsx';
import {
  FormalityCategoryBackButton,
  FormalityCategoryPicker,
} from '@/components/questionnaire/FormalityCategoryPicker.jsx';
import {
  MobileChoiceStep,
  MobileChoiceTile,
  MOBILE_CHOICE_TWO_COL_GRID,
} from '@/components/questionnaire/MobileChoiceStep.jsx';
import {
  DEMARCHE_CATALOG,
  DEMARCHE_CATEGORIES,
  PRIMARY_FORMALITY_CATEGORIES,
} from '@/lib/questionnaireFlow.js';

const normalize = (value) => String(value || '').trim().toLowerCase();

/** Après « Immatriculer une nouvelle structure », la forme est choisie via familles juridiques. */
const CREATION_AUTO_FORMALITY = 'creation_societe';

export const DemarchePicker = ({
  value,
  onChange,
  categoryFirst = false,
  primaryCategory: controlledCategory,
  onPrimaryCategoryChange,
  categoryConfirmed: controlledConfirmed,
  onCategoryConfirmedChange,
  mobilePresentation = false,
  onAdvance,
  onSkipCreationTiles,
  progressPercent,
  stepCurrent,
  stepTotal,
}) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [localPrimaryCategory, setLocalPrimaryCategory] = useState('');
  const [localCategoryConfirmed, setLocalCategoryConfirmed] = useState(false);

  const primaryCategory = controlledCategory ?? localPrimaryCategory;
  const categoryConfirmed = controlledConfirmed ?? localCategoryConfirmed;
  const setPrimaryCategory = onPrimaryCategoryChange || setLocalPrimaryCategory;
  const setCategoryConfirmed = onCategoryConfirmedChange || setLocalCategoryConfirmed;

  const categoryFilterIds = useMemo(() => {
    if (!primaryCategory) return null;
    const primary = PRIMARY_FORMALITY_CATEGORIES.find((item) => item.id === primaryCategory);
    return primary?.categories || null;
  }, [primaryCategory]);

  const filteredItems = useMemo(() => {
    const q = normalize(query);
    return DEMARCHE_CATALOG.filter((item) => {
      const matchesQuery = !q
        || normalize(item.label).includes(q)
        || normalize(item.key).replace(/_/g, ' ').includes(q);
      const matchesChipCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesPrimary = !categoryFilterIds || categoryFilterIds.includes(item.category);
      return matchesQuery && matchesChipCategory && matchesPrimary;
    });
  }, [query, activeCategory, categoryFilterIds]);

  const groupedItems = useMemo(() => {
    if (query.trim() || activeCategory !== 'all' || categoryFilterIds) {
      return [{ category: null, items: filteredItems }];
    }
    return DEMARCHE_CATEGORIES
      .map((category) => ({
        category,
        items: DEMARCHE_CATALOG.filter((item) => item.category === category.id),
      }))
      .filter((group) => group.items.length > 0);
  }, [query, activeCategory, categoryFilterIds, filteredItems]);

  const selectedLabel = DEMARCHE_CATALOG.find((item) => item.key === value)?.label;
  const shouldSkipCreationTiles = categoryFirst && categoryConfirmed && primaryCategory === 'creation';

  const resetPrimaryCategory = () => {
    setCategoryConfirmed(false);
    setActiveCategory('all');
    onChange('');
  };

  useEffect(() => {
    if (!shouldSkipCreationTiles || value === CREATION_AUTO_FORMALITY) return;
    onChange(CREATION_AUTO_FORMALITY);
  }, [shouldSkipCreationTiles, value, onChange]);

  if (categoryFirst && !categoryConfirmed) {
    return (
      <FormalityCategoryPicker
        value={primaryCategory}
        onChange={setPrimaryCategory}
        onContinue={(selectedCategoryId) => {
          const categoryId = selectedCategoryId || primaryCategory;
          if (categoryId === 'creation') {
            onChange(CREATION_AUTO_FORMALITY);
            onSkipCreationTiles?.();
          }
          if (categoryId) setCategoryConfirmed(true);
        }}
        onAdvance={mobilePresentation ? onAdvance : undefined}
        mobilePresentation={mobilePresentation}
        progressPercent={progressPercent}
        stepCurrent={stepCurrent}
        stepTotal={stepTotal}
      />
    );
  }

  const handleDemarcheSelect = (key) => {
    onChange(key);
    if (mobilePresentation) onAdvance?.();
  };

  if (shouldSkipCreationTiles) {
    const confirmationCard = (
      <div className="flex items-center gap-2 rounded-xl border border-primary/25 bg-secondary/60 px-3 py-3 text-sm">
        <Check className="h-4 w-4 shrink-0 text-primary" />
        <span>
          <span className="font-semibold text-foreground">Créer une société</span>
          <span className="text-muted-foreground"> – la forme juridique sera choisie à l&apos;étape suivante.</span>
        </span>
      </div>
    );

    if (mobilePresentation) {
      return (
        <div className="space-y-3">
          <FormalityCategoryBackButton onClick={resetPrimaryCategory} />
          <MobileChoiceStep
            kicker="Votre démarche"
            title="Créer une société"
            subtitle="La forme juridique sera choisie à l'étape suivante."
            hint="La forme juridique sera choisie à l'étape suivante."
            gridClassName={MOBILE_CHOICE_TWO_COL_GRID}
          >
            {confirmationCard}
          </MobileChoiceStep>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {categoryFirst && categoryConfirmed ? (
          <FormalityCategoryBackButton onClick={resetPrimaryCategory} />
        ) : null}
        {confirmationCard}
      </div>
    );
  }

  if (mobilePresentation) {
    return (
      <div className="space-y-3">
        {categoryFirst && categoryConfirmed ? (
          <FormalityCategoryBackButton onClick={resetPrimaryCategory} />
        ) : null}
        <MobileChoiceStep
          kicker="Formalité"
          title="Quelle démarche ?"
          subtitle="Greffio adapte le questionnaire et les documents à votre situation."
          hint="Touchez une démarche pour continuer."
          progressPercent={progressPercent}
          stepCurrent={stepCurrent}
          stepTotal={stepTotal}
          gridClassName={MOBILE_CHOICE_TWO_COL_GRID}
        >
          {filteredItems.map((item) => (
            <MobileChoiceTile
              key={item.key}
              title={item.label}
              description={item.hint || ''}
              selected={value === item.key}
              compact
              onSelect={() => handleDemarcheSelect(item.key)}
            />
          ))}
        </MobileChoiceStep>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {categoryFirst && categoryConfirmed ? (
        <FormalityCategoryBackButton onClick={resetPrimaryCategory} />
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          placeholder="Rechercher une démarche (ex. SASU, transfert, Kbis…)"
          onChange={(event) => setQuery(event.target.value)}
          className="h-11 rounded-xl border-border bg-white pl-9 text-base shadow-sm"
        />
      </div>

      {!categoryFilterIds ? (
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
      ) : null}

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
            <ul className="grid grid-cols-2 gap-3 sm:gap-4">
              {items.map((item) => (
                <li key={item.key} className="min-w-0">
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
      </div>
    </div>
  );
};

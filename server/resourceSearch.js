import {
  getAllCatalogItems,
  LEGACY_ESTIMATORS,
  RESOURCE_KIND_LABELS,
} from './config/resourceServices.js';

const normalize = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim();

const scoreItem = (item, tokens) => {
  const haystack = normalize([
    item.title,
    item.description,
    ...(item.searchTerms || []),
    item.id,
  ].join(' '));

  let score = 0;
  for (const token of tokens) {
    if (!token) continue;
    if (haystack === token) score += 12;
    else if (haystack.startsWith(token)) score += 8;
    else if (haystack.includes(token)) score += 4;
  }
  if (['service', 'document', 'pack'].includes(item.kind) && Number(item.priceTtc) > 0) {
    score += 1;
  }
  return score;
};

const mapResult = (item, score) => ({
  id: item.id,
  title: item.title,
  description: item.description,
  kind: item.kind,
  kindLabel: RESOURCE_KIND_LABELS[item.kind] || item.kind,
  category: item.category,
  priceTtc: item.priceTtc,
  estimatedDelay: item.estimatedDelay,
  actionLabel: item.actionLabel,
  available: item.available,
  processingMode: item.processingMode,
  score,
  item,
});

export const searchResources = (query) => {
  const trimmed = String(query || '').trim();
  if (!trimmed) {
    return { groups: [], total: 0, query: trimmed, flat: [] };
  }

  const tokens = normalize(trimmed).split(/\s+/).filter(Boolean);
  const catalogHits = getAllCatalogItems()
    .map((item) => ({ item, score: scoreItem(item, tokens) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item, score }) => mapResult(item, score));

  const legacyHits = LEGACY_ESTIMATORS
    .map((legacy) => {
      const pseudo = {
        id: legacy.id,
        title: legacy.title,
        description: legacy.text,
        kind: 'tool',
        category: 'tool',
        priceTtc: 0,
        estimatedDelay: 'Immédiat',
        actionLabel: 'Ouvrir',
        available: true,
        processingMode: 'available',
        searchTerms: [legacy.title, legacy.text],
      };
      const score = scoreItem(pseudo, tokens);
      return score > 0 ? mapResult(pseudo, score) : null;
    })
    .filter(Boolean);

  const merged = [...catalogHits, ...legacyHits].sort((a, b) => b.score - a.score);
  const groupsMap = new Map();
  for (const result of merged) {
    if (!groupsMap.has(result.kind)) {
      groupsMap.set(result.kind, { kind: result.kind, label: result.kindLabel, items: [] });
    }
    groupsMap.get(result.kind).items.push(result);
  }

  return {
    query: trimmed,
    total: merged.length,
    groups: Array.from(groupsMap.values()),
    flat: merged,
  };
};

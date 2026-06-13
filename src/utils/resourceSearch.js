import { getAllCatalogItems, LEGACY_ESTIMATORS, RESOURCE_KIND_LABELS } from '@/config/resourceServices.js';

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
  if (item.kind === 'service' || item.kind === 'document' || item.kind === 'pack') {
    if (Number(item.priceTtc) > 0) score += 1;
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

export const searchResources = (query, { userDossiers = [] } = {}) => {
  const trimmed = String(query || '').trim();
  if (!trimmed) {
    return { groups: [], total: 0, query: trimmed };
  }

  const tokens = normalize(trimmed).split(/\s+/).filter(Boolean);
  const catalogHits = getAllCatalogItems()
    .map((item) => ({ item, score: scoreItem(item, tokens) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item, score }) => mapResult(item, score));

  const legacyHits = LEGACY_ESTIMATORS
    .map((item) => {
      const pseudo = {
        id: item.id,
        title: item.title,
        description: item.text,
        kind: 'tool',
        category: 'tool',
        priceTtc: 0,
        estimatedDelay: 'Immédiat',
        actionLabel: 'Ouvrir',
        available: true,
        processingMode: 'available',
        toolRoute: item.to,
        searchTerms: [item.title, item.text],
      };
      const score = scoreItem(pseudo, tokens);
      return score > 0 ? mapResult({ ...pseudo, legacyLink: item.to }, score) : null;
    })
    .filter(Boolean);

  const dossierHits = (userDossiers || [])
    .map((dossier) => {
      const pseudo = {
        id: `dossier-${dossier.id}`,
        title: dossier.companyName || dossier.reference || 'Dossier',
        description: `Dossier Greffio – ${dossier.legalForm || 'formalité'}`,
        kind: 'dossier',
        kindLabel: 'Mon dossier',
        category: 'dossier',
        priceTtc: 0,
        estimatedDelay: '–',
        actionLabel: 'Ouvrir le dossier',
        available: true,
        processingMode: 'available',
        dossierId: dossier.id,
        searchTerms: [dossier.companyName, dossier.reference, dossier.legalForm],
      };
      const score = scoreItem(pseudo, tokens);
      return score > 0 ? mapResult(pseudo, score) : null;
    })
    .filter(Boolean);

  const merged = [...catalogHits, ...legacyHits, ...dossierHits]
    .sort((a, b) => b.score - a.score);

  const groupsMap = new Map();
  for (const result of merged) {
    const key = result.kind;
    if (!groupsMap.has(key)) {
      groupsMap.set(key, { kind: key, label: result.kindLabel, items: [] });
    }
    groupsMap.get(key).items.push(result);
  }

  return {
    query: trimmed,
    total: merged.length,
    groups: Array.from(groupsMap.values()),
    flat: merged,
  };
};

import { ASSOCIATE_TYPES, isAssociateEntryComplete } from '@/utils/associateEntry.js';
import { formatAssociateOfficerLabel } from '@/utils/officerFromAssociates.js';

const normalize = (value = '') => String(value).trim().toLowerCase();

export const buildBeneficialOwnerCandidates = (formData = {}) => {
  const candidates = [];
  const seen = new Set();
  const push = (candidate) => {
    const key = normalize(candidate.label);
    if (!key || seen.has(key)) return;
    seen.add(key);
    candidates.push(candidate);
  };

  const associates = Array.isArray(formData.associates) ? formData.associates : [];
  associates.forEach((associate, index) => {
    if (!isAssociateEntryComplete(associate)) return;
    const label = formatAssociateOfficerLabel(associate);
    if (!label) return;
    const role = String(associate.roleLabel || '').trim();
    push({
      id: `associate:${index}`,
      label,
      subtitle: role || (associate.associateType === ASSOCIATE_TYPES.COMPANY ? 'Personne morale' : 'Associé'),
      source: 'associate',
    });
  });

  const dirigeant = String(formData.dirigeant || '').trim();
  if (dirigeant) {
    push({
      id: 'dirigeant',
      label: dirigeant,
      subtitle: 'Président / dirigeant',
      source: 'officer',
    });
  }

  return candidates;
};

export const formatBeneficialOwnersSummary = (selectedIds = [], candidates = []) => {
  const ids = Array.isArray(selectedIds) ? selectedIds : [];
  const labels = ids
    .map((id) => candidates.find((c) => c.id === id)?.label)
    .filter(Boolean);
  if (!labels.length) return '';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} et ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')} et ${labels[labels.length - 1]}`;
};

export const parseBeneficialOwnersSelection = (summaryText = '', candidates = []) => {
  const text = String(summaryText || '').trim();
  if (!text || !candidates.length) return [];
  const matched = new Set();
  candidates.forEach((candidate) => {
    const labelNorm = normalize(candidate.label);
    if (!labelNorm) return;
    if (normalize(text).includes(labelNorm) || text.split(/\s+et\s+|,\s*/i).some((part) => {
      const partNorm = normalize(part);
      return partNorm && (labelNorm.includes(partNorm) || partNorm.includes(labelNorm));
    })) {
      matched.add(candidate.id);
    }
  });
  return [...matched];
};

export const defaultBeneficialOwnersSelection = () => [];

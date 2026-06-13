import { randomUUID } from 'node:crypto';
import { matchAdministrativeKeyword, normalizeFrenchLabel } from '../frenchAdministrativeKeywords.js';
import { hasFilledValueInRow } from './bboxHelpers.js';

const LABEL_COLUMN_MAX_X = 175;
const VALUE_COLUMN_START_X = 178;
const VALUE_COLUMN_END_MARGIN = 32;
const ROW_Y_TOLERANCE = 8;

const GRID_ROW_SKIP_PATTERNS = [
  /^fiche de renseignements/i,
  /^identification commercant/i,
  /^identification de la boutique/i,
  /^identification de l.?installateur/i,
  /^offre choisie$/i,
  /^solution technique/i,
  /^garantie 3d secure/i,
  /^pour information/i,
  /^une page de paiement/i,
  /^avant installation/i,
  /^joomla\./i,
  /^incompatibilite technique/i,
  /^a l.?usage ou par abonnement/i,
];

const CHECKBOX_ROW_PATTERN = /(\[\s*\]|□|☐|\(\s*\)|1 seul choix)/i;
const OFFER_CHOICE_PATTERN = /offre choisie|par abonnement|a l.?usage/i;

const buildCandidate = ({
  page,
  label,
  type,
  bbox,
  confidence,
  reason,
  matchedText,
  semantic,
}) => ({
  id: randomUUID(),
  pageIndex: page.pageIndex,
  pageNumber: page.pageNumber,
  type,
  label,
  placeholder: label,
  bbox: {
    ...bbox,
    coordinateSystem: 'pdf_points_bottom_left',
  },
  detection: {
    source: 'text_grid_form_row',
    confidence,
    reason,
    matchedText,
    nearbyLabel: label,
  },
  semantic: semantic || { category: 'unknown' },
});

const shouldSkipGridRowLabel = (label) => {
  const normalized = normalizeFrenchLabel(label);
  if (!normalized || normalized.length < 2) return true;
  if (GRID_ROW_SKIP_PATTERNS.some((pattern) => pattern.test(normalized))) return true;
  if (normalized.length > 90) return true;
  return false;
};

const mergeRowLabelBlocks = (blocks) => {
  const labelBlocks = blocks
    .filter((block) => block.x <= LABEL_COLUMN_MAX_X)
    .sort((a, b) => a.x - b.x);
  if (!labelBlocks.length) return null;
  const label = labelBlocks.map((block) => block.text).join(' ').replace(/\s+/g, ' ').trim();
  const rowY = labelBlocks.reduce((sum, block) => sum + block.y, 0) / labelBlocks.length;
  const labelEndX = Math.max(...labelBlocks.map((block) => block.x + block.width));
  return { label, rowY, labelEndX, labelBlocks };
};

const defaultGridFieldSize = (pageWidth, type) => {
  const startX = VALUE_COLUMN_START_X;
  const width = pageWidth - startX - VALUE_COLUMN_END_MARGIN;
  if (type === 'checkbox') return { x: startX, width: 16, height: 16 };
  if (type === 'textarea') return { x: startX, width, height: 36 };
  return { x: startX, width, height: 18 };
};

export const detectGridFormFields = ({ pages = [] }) => {
  const candidates = [];

  for (const page of pages) {
    const rowMap = new Map();
    for (const block of page.blocks) {
      const bucket = Math.round(block.y / ROW_Y_TOLERANCE);
      if (!rowMap.has(bucket)) rowMap.set(bucket, []);
      rowMap.get(bucket).push(block);
    }

    for (const blocks of rowMap.values()) {
      const merged = mergeRowLabelBlocks(blocks);
      if (!merged) continue;
      const { label, rowY, labelEndX } = merged;
      if (shouldSkipGridRowLabel(label)) continue;

      const rowText = blocks.map((block) => block.text).join(' ');
      if (CHECKBOX_ROW_PATTERN.test(rowText) || OFFER_CHOICE_PATTERN.test(rowText)) {
        const checkboxBlocks = blocks
          .filter((block) => CHECKBOX_ROW_PATTERN.test(block.text) || /par abonnement|a l.?usage/i.test(block.text))
          .sort((a, b) => a.x - b.x);
        for (const block of checkboxBlocks.slice(0, 6)) {
          const optionLabel = block.text.replace(/(\[\s*\]|□|☐|\(\s*\))/g, '').trim() || label;
          candidates.push(buildCandidate({
            page,
            label: optionLabel.slice(0, 60),
            type: 'checkbox',
            bbox: {
              x: block.x,
              y: block.y,
              width: 16,
              height: 16,
            },
            confidence: 0.82,
            reason: 'Ligne de choix multiples (grille administrative)',
            matchedText: block.text,
          }));
        }
        continue;
      }

      if (hasFilledValueInRow(page.blocks, rowY, VALUE_COLUMN_START_X)) continue;

      const admin = matchAdministrativeKeyword(label);
      const type = admin?.type || 'text';
      const size = defaultGridFieldSize(page.width, type);
      const startX = Math.max(size.x, labelEndX + 10);
      const width = Math.max(80, page.width - startX - VALUE_COLUMN_END_MARGIN);

      candidates.push(buildCandidate({
        page,
        label: admin?.matchedLabel || label.replace(/[:：]\s*$/, '').trim(),
        type,
        bbox: {
          x: startX,
          y: rowY,
          width,
          height: size.height,
        },
        confidence: 0.8 + (admin?.confidenceBoost || 0),
        reason: 'Ligne de formulaire administratif en grille (libellé + cellule vide)',
        matchedText: label,
        semantic: admin ? { category: admin.category, normalizedKey: admin.normalizedKey } : undefined,
      }));
    }
  }

  return candidates;
};

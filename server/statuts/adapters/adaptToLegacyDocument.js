import { buildStandardAnnexes } from '../../legal/statutes/shared/annexes.js';
import { buildWilliamCover, buildWilliamSignatures } from '../../legal/statutes/reference/williamHelpers.js';
import { estimatePageCount, countWilliamArticles } from '../renderers/renderWilliamSas2026.js';

const articleTitleFromHeading = (heading, number) => {
  const match = String(heading || '').match(/Article\s+\d+\s*[-–]\s*(.+)/i);
  return match ? match[1].trim() : `Article ${number}`;
};

const legalFormShortLabel = (legalForm) => {
  const f = String(legalForm || 'SAS').toUpperCase();
  if (f === 'SASU') return 'Société par Actions Simplifiée Unipersonnelle';
  if (f === 'SAS') return 'Société par Actions Simplifiée';
  return f;
};

export const adaptRenderedBlocksToLegacyDocument = ({
  blocks = [],
  statutesData = {},
  templateId = 'william-establishments-sas-2026',
}) => {
  const legalForm = String(statutesData.legalForm || 'SAS').toUpperCase();
  const seat = statutesData.seat || {};

  const cover = buildWilliamCover({
    ...statutesData,
    legalFormLabel: statutesData.legalFormLabel || (legalForm === 'SASU'
      ? 'Société par Actions Simplifiée Unipersonnelle (SASU)'
      : 'Société par Actions Simplifiée (SAS)'),
    legalFormShort: legalFormShortLabel(legalForm),
    seat,
    greffe: statutesData.greffe,
    isRegistered: Boolean(statutesData.isRegistered),
    reference: statutesData.reference,
    dateDocument: statutesData.dateDocument,
  });

  const articleBodies = new Map();
  const legacyBlocks = [];

  blocks.forEach((block) => {
    if (block.kind === 'cover' || block.kind === 'signature') return;
    if (block.kind === 'preamble') {
      legacyBlocks.push({ kind: 'paragraph', text: block.text });
      return;
    }
    if (block.kind === 'title') {
      legacyBlocks.push({ kind: 'legal-title', text: block.text });
      return;
    }
    if (block.kind === 'article' && typeof block.articleNumber === 'number') {
      if (block.heading && block.text === block.heading) {
        if (!articleBodies.has(block.articleNumber)) {
          articleBodies.set(block.articleNumber, {
            number: block.articleNumber,
            title: articleTitleFromHeading(block.heading, block.articleNumber),
            paragraphs: [],
          });
        }
        return;
      }
      const entry = articleBodies.get(block.articleNumber) || {
        number: block.articleNumber,
        title: articleTitleFromHeading(block.heading, block.articleNumber),
        paragraphs: [],
      };
      if (block.text) entry.paragraphs.push(block.text);
      articleBodies.set(block.articleNumber, entry);
    }
  });

  const articles = [...articleBodies.values()]
    .sort((a, b) => a.number - b.number)
    .map((article) => ({
      kind: 'article',
      number: article.number,
      title: article.title,
      body: article.paragraphs.join('\n\n'),
    }));

  const titleOneIndex = legacyBlocks.findIndex(
    (b) => b.kind === 'legal-title' && String(b.text).includes('TITRE I'),
  );
  if (titleOneIndex >= 0) {
    legacyBlocks.splice(titleOneIndex + 1, 0, ...articles);
  } else {
    legacyBlocks.push(...articles);
  }

  const signatures = buildWilliamSignatures(statutesData);

  const articleCount = articles.length || countWilliamArticles(blocks);
  const pageCount = estimatePageCount(blocks);

  return {
    cover,
    blocks: legacyBlocks,
    annexes: buildStandardAnnexes(statutesData),
    signatures,
    footerNotice: '',
    metadata: {
      legalForm,
      template: templateId,
      templateId,
      articleCount,
      pageCount,
      draftingEngine: 'william_canon_v2026',
      strictTemplate: true,
      ...(statutesData.metadataBundle || {}),
    },
  };
};

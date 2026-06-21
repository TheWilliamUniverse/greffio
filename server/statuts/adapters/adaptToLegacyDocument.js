import { buildStandardAnnexes } from '../../legal/statutes/shared/annexes.js';
import { buildWilliamCover, buildWilliamSignatures } from '../../legal/statutes/reference/williamHelpers.js';
import { resolveLegalFormLabel } from '../../legal/statutes/shared/formatting.js';
import { formatFrEuros } from '../shared/numberFormat.js';
import { joinStatutesArticleBody } from '../shared/normalizeStatutesParagraphs.js';
import { estimatePageCount, countWilliamArticles } from '../renderers/renderWilliamSas2026.js';
import { todayStatutesFrenchDate } from '../shared/statutesDates.js';

const articleTitleFromHeading = (heading, number) => {
  const match = String(heading || '').match(/Article\s+\d+\s*[-–]\s*(.+)/i);
  return match ? match[1].trim() : `Article ${number}`;
};

const legalFormShortLabel = (legalForm) => resolveLegalFormLabel(legalForm);

const buildArticleBodiesMap = (blocks = []) => {
  const articleBodies = new Map();

  blocks.forEach((block) => {
    if (block.kind !== 'article' || typeof block.articleNumber !== 'number') return;
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
  });

  return articleBodies;
};

export const adaptRenderedBlocksToLegacyDocument = ({
  blocks = [],
  statutesData = {},
  templateId = 'william-establishments-sas-2026',
}) => {
  const legalForm = String(statutesData.legalForm || 'SAS').toUpperCase();
  const seat = statutesData.seat || {};
  const capitalLabel = formatFrEuros(statutesData.capital || statutesData.capitalRaw) || formatFrEuros(statutesData.capitalAmount);

  const cover = buildWilliamCover({
    ...statutesData,
    capital: capitalLabel ? capitalLabel.replace(/\s+euros$/i, '') : statutesData.capital,
    legalFormLabel: statutesData.legalFormLabel || resolveLegalFormLabel(legalForm, { withAcronym: true }),
    legalFormShort: legalFormShortLabel(legalForm),
    seat,
    greffe: statutesData.greffe,
    isRegistered: statutesData.isRegistered !== false,
    reference: statutesData.reference,
    dateDocument: statutesData.dateDocument,
  });

  const articleBodies = buildArticleBodiesMap(blocks);
  const legacyBlocks = [];
  const emittedArticles = new Set();
  let preliminaryTitleAdded = false;

  blocks.forEach((block) => {
    if (block.kind === 'cover' || block.kind === 'signature') return;

    if (block.kind === 'preamble') {
      const text = String(block.text || '').trim();
      if (!text) return;
      const isPreliminaryHeading = /^(Définitions|Objet du présent acte|IL A ÉTÉ CONVENU)/i.test(text);
      if (isPreliminaryHeading && !preliminaryTitleAdded) {
        legacyBlocks.push({ kind: 'legal-title', text: 'DISPOSITIONS PRÉLIMINAIRES' });
        preliminaryTitleAdded = true;
      }
      legacyBlocks.push({
        kind: 'paragraph',
        text,
        subheading: isPreliminaryHeading,
      });
      return;
    }

    if (block.kind === 'title') {
      legacyBlocks.push({ kind: 'legal-title', text: block.text });
      return;
    }

    if (block.kind === 'article' && typeof block.articleNumber === 'number') {
      if (block.heading && block.text === block.heading) return;
      if (emittedArticles.has(block.articleNumber)) return;

      const entry = articleBodies.get(block.articleNumber);
      if (!entry || !entry.paragraphs.length) return;

      legacyBlocks.push({
        kind: 'article',
        number: entry.number,
        title: entry.title,
        body: joinStatutesArticleBody(entry.paragraphs),
      });
      emittedArticles.add(block.articleNumber);
    }
  });

  const generationDate = todayStatutesFrenchDate();
  const signatures = buildWilliamSignatures({
    ...statutesData,
    signatureDate: generationDate,
    dateDocument: generationDate,
    minorRepresentationNote: null,
  });
  const articleCount = articleBodies.size || countWilliamArticles(blocks);
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

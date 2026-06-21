import { resolveStatutesCoverCompanyLine } from '../../legal/statutes/shared/formatting.js';

export const COVER_FONT_SIZE_PT = 18;
export const COVER_REFERENCE_FONT_SIZE_PT = 10;

const normalizeLine = (value) => String(value || '').replace(/\s+/g, ' ').trim();

export const formatCoverSeatLines = (seatBlock) => {
  const rawLines = String(seatBlock || '')
    .split('\n')
    .map((line) => normalizeLine(line))
    .filter(Boolean);

  if (!rawLines.length) return [];

  const header = rawLines[0];
  const isSeatHeader = /^siège social/i.test(header);
  if (!isSeatHeader || rawLines.length === 1) return rawLines;

  const addressParts = rawLines.slice(1);
  const headerLabel = header.replace(/\s*:?\s*$/, '');
  const inlineSeat = `${headerLabel} : ${addressParts.join(', ')}`;

  if (inlineSeat.length <= 105) return [inlineSeat];

  return [
    header.endsWith(':') ? header : `${headerLabel} :`,
    ...addressParts,
  ];
};

const estimateTextHeight = (text, { fontSize, lineGap, maxCharsPerLine = 52 }) => {
  const normalized = normalizeLine(text);
  if (!normalized) return 0;
  const wrappedLines = Math.max(1, Math.ceil(normalized.length / maxCharsPerLine));
  return wrappedLines * fontSize * 1.18 + Math.max(0, wrappedLines - 1) * lineGap;
};

/**
 * Calcule la page de garde (bloc haut, espace flexible, bloc bas) pour PDF / ODT / DOCX.
 */
export const layoutStatutesCover = (cover = {}, pageMetrics = {}) => {
  const fontSize = COVER_FONT_SIZE_PT;
  const lineGap = 6;
  let sectionGap = 14;
  const pageHeight = pageMetrics.pageHeight || 842;
  const marginTop = pageMetrics.marginTop ?? 62;
  const marginBottom = pageMetrics.marginBottom ?? 58;
  const contentHeight = pageHeight - marginTop - marginBottom;

  const companyLine = resolveStatutesCoverCompanyLine(cover);
  const topLines = [
    { text: cover.title || 'STATUTS', bold: true },
    ...(companyLine ? [{ text: companyLine, bold: true }] : []),
  ].filter((line) => line.text);

  if (cover.sigle) topLines.push({ text: `(${cover.sigle})`, bold: false });
  if (cover.capitalLine) topLines.push({ text: cover.capitalLine, bold: false });
  formatCoverSeatLines(cover.seatBlock).forEach((text) => {
    topLines.push({ text, bold: false });
  });

  const bottomLines = [];
  if (cover.registryLine) bottomLines.push({ text: cover.registryLine, bold: false });

  const measureBlock = (lines, gap) => (
    lines.reduce((total, line, index) => {
      const block = estimateTextHeight(line.text, { fontSize, lineGap });
      const spacing = index < lines.length - 1 ? gap : 0;
      return total + block + spacing;
    }, 0)
  );

  const referenceHeight = cover.reference
    ? COVER_REFERENCE_FONT_SIZE_PT * 1.4 + sectionGap
    : 0;

  let topHeight = measureBlock(topLines, sectionGap);
  let bottomHeight = measureBlock(bottomLines, sectionGap) + referenceHeight;
  const minFlexGap = sectionGap * 2;
  const topOffset = 24;

  let flexGap = Math.max(
    minFlexGap,
    contentHeight - topOffset - topHeight - bottomHeight,
  );

  const maxAllowed = contentHeight - topOffset - topHeight - bottomHeight;
  if (flexGap > maxAllowed) flexGap = Math.max(minFlexGap, maxAllowed);

  while (topOffset + topHeight + flexGap + bottomHeight > contentHeight && sectionGap > 6) {
    sectionGap -= 2;
    topHeight = measureBlock(topLines, sectionGap);
    bottomHeight = measureBlock(bottomLines, sectionGap) + referenceHeight;
    flexGap = Math.max(minFlexGap, contentHeight - topOffset - topHeight - bottomHeight);
  }

  const flexParagraphs = Math.max(
    4,
    Math.min(14, Math.round(flexGap / (fontSize * 0.72))),
  );

  return {
    fontSize,
    lineGap,
    sectionGap,
    topOffset,
    topHeight,
    bottomHeight,
    topLines,
    bottomLines,
    flexGap,
    flexParagraphs,
    reference: cover.reference ? `Référence dossier : ${cover.reference}` : null,
  };
};

export const buildStatutesCoverExportElements = (cover = {}) => {
  const layout = layoutStatutesCover(cover);
  const elements = [];

  layout.topLines.forEach((line, index) => {
    elements.push({
      type: index === 0 ? 'cover-title' : 'cover-line',
      text: line.text,
      bold: line.bold,
    });
  });

  for (let i = 0; i < layout.flexParagraphs; i += 1) {
    elements.push({ type: 'cover-spacer' });
  }

  layout.bottomLines.forEach((line) => {
    elements.push({ type: 'cover-line', text: line.text, bold: false });
  });

  if (layout.reference) {
    elements.push({ type: 'cover-reference', text: layout.reference });
  }

  elements.push({ type: 'page-break' });
  return elements;
};

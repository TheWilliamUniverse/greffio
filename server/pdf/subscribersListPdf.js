import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { formatFrenchDate } from '../pdf/nonConvictionPdf.js';
import { SUBSCRIBERS_LIST_SIGNATURE_LINE_Y } from './pdfLegalConstants.js';

const outputDir = path.resolve(process.cwd(), 'server', 'data', 'generated', 'subscribers-list');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_H = 56;
const MARGIN_TOP = 52;
const COLOR_TEXT = rgb(0, 0, 0);
const COLOR_MUTED = rgb(0.25, 0.25, 0.25);
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_H * 2;
const LABEL_COL_X = MARGIN_H + 168;

const HEADER_HEIGHT = 78;
const CONTENT_TOP_Y = PAGE_HEIGHT - MARGIN_TOP - HEADER_HEIGHT;
const LINE_Y = SUBSCRIBERS_LIST_SIGNATURE_LINE_Y;
const PARA_LINE_HEIGHT = 12;
const PARA_GAP = 8;

const wrapParagraph = (text, maxChars = 92) => {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [''];
};

const getSubscriberRows = (subscriber, securitiesUnit) => (
  subscriber.isLegalEntity
    ? [
      ['Type', 'Personne morale'],
      ['Dénomination sociale', subscriber.fullName || '–'],
      ['Forme juridique', subscriber.legalFormLabel || '–'],
      ['SIREN', subscriber.siren || '–'],
      ['Siège social', subscriber.address || '–'],
      ['Représentant légal', subscriber.legalRepresentativeName || '–'],
      ['Qualité du représentant', subscriber.legalRepresentativeQuality || '–'],
      [`${securitiesUnit} souscrites`, subscriber.titlesCount || '–'],
      ['% du capital', subscriber.sharePercent || '–'],
      ['Apport en numéraire', subscriber.contributionCash || '0 €'],
      ['Apport en nature', subscriber.contributionInKind || '0 €'],
      ['Montant libéré à la constitution', subscriber.liberationAmount || '0 €'],
      ['Observations', subscriber.observations || '–'],
    ]
    : [
      ['Titre', subscriber.roleTitle || 'Associé'],
      ['Nom et Prénom', subscriber.fullName || '–'],
      ['Date et lieu de naissance', subscriber.birthDatePlace || '–'],
      ['Nationalité', subscriber.nationality || 'Française'],
      ['Adresse', subscriber.address || '–'],
      [`${securitiesUnit} souscrites`, subscriber.titlesCount || '–'],
      ['% du capital', subscriber.sharePercent || '–'],
      ['Apport en numéraire', subscriber.contributionCash || '0 €'],
      ['Apport en nature', subscriber.contributionInKind || '0 €'],
      ['Montant libéré à la constitution', subscriber.liberationAmount || '0 €'],
      ['Observations', subscriber.observations || '–'],
    ]
);

const estimateSubscribersHeight = (subscribers, securitiesUnit, metrics) => subscribers.reduce((total, subscriber, index) => {
  const rows = getSubscriberRows(subscriber, securitiesUnit).length;
  const sectionGap = index < subscribers.length - 1 ? metrics.sectionGap : 0;
  return total + metrics.headingGap + rows * metrics.rowStep + sectionGap;
}, 0);

const resolveLayoutMetrics = (subscribers, securitiesUnit, depositLines, certLines) => {
  const faitY = LINE_Y + 66;
  const certStartY = faitY + 14 + Math.max(0, certLines.length - 1) * PARA_LINE_HEIGHT;
  const depositStartY = certStartY + certLines.length * PARA_LINE_HEIGHT + PARA_GAP;
  const contentBottomY = depositStartY + depositLines.length * PARA_LINE_HEIGHT + 6;
  const availableHeight = CONTENT_TOP_Y - contentBottomY;

  const base = {
    rowStep: 13,
    headingGap: 14,
    sectionGap: 7,
    fontSize: 10,
    headingSize: 10.5,
  };

  const required = estimateSubscribersHeight(subscribers, securitiesUnit, base);
  if (required <= availableHeight) {
    return base;
  }

  const scale = Math.max(0.62, availableHeight / required);
  return {
    rowStep: Math.max(9, base.rowStep * scale),
    headingGap: Math.max(10, base.headingGap * scale),
    sectionGap: Math.max(4, base.sectionGap * scale),
    fontSize: Math.max(8.5, base.fontSize * Math.sqrt(scale)),
    headingSize: Math.max(9, base.headingSize * Math.sqrt(scale)),
  };
};

const drawCentered = (page, font, y, text, size) => {
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (PAGE_WIDTH - textWidth) / 2, y, size, font, color: COLOR_TEXT });
  return y - size * 1.45;
};

const drawLabelValue = (page, font, fontBold, y, label, value, metrics) => {
  page.drawText(label, {
    x: MARGIN_H,
    y,
    size: metrics.fontSize,
    font: fontBold,
    color: COLOR_TEXT,
  });
  page.drawText(String(value || '–'), {
    x: LABEL_COL_X,
    y,
    size: metrics.fontSize,
    font,
    color: COLOR_TEXT,
    maxWidth: CONTENT_WIDTH - (LABEL_COL_X - MARGIN_H),
  });
  return y - metrics.rowStep;
};

export const generateSubscribersListPdf = async ({ filename, fields = {} }) => {
  const targetPath = path.join(outputDir, filename);
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const securitiesUnit = String(fields.securitiesUnit || 'Actions');
  const subscribers = Array.isArray(fields.subscribers) ? fields.subscribers : [];
  const depositLines = wrapParagraph(fields.depositParagraph);
  const certLines = wrapParagraph(fields.certificationParagraph);
  const metrics = resolveLayoutMetrics(subscribers, securitiesUnit, depositLines, certLines);

  let y = PAGE_HEIGHT - MARGIN_TOP;
  y = drawCentered(page, fontBold, y, 'LISTE DES SOUSCRIPTEURS', 13.5);
  y -= 4;
  y = drawCentered(page, fontBold, y, String(fields.legalFormHeader || 'SOCIÉTÉ'), 10.5);
  y -= 3;
  y = drawCentered(page, fontBold, y, String(fields.companyName || 'Dénomination').toUpperCase(), 11.5);
  y = CONTENT_TOP_Y;

  subscribers.forEach((subscriber, index) => {
    const heading = subscriber.sectionHeading || `${subscriber.roleTitle || 'Associé'} – ${subscriber.fullName || ''}`;
    page.drawText(heading, {
      x: MARGIN_H,
      y,
      size: metrics.headingSize,
      font: fontBold,
      color: COLOR_TEXT,
    });
    y -= metrics.headingGap;

    getSubscriberRows(subscriber, securitiesUnit).forEach(([label, value]) => {
      y = drawLabelValue(page, font, fontBold, y, label, value, metrics);
    });

    if (index < subscribers.length - 1) {
      y -= metrics.sectionGap;
    }
  });

  const faitY = LINE_Y + 66;
  let paraY = faitY + 14 + Math.max(0, certLines.length - 1) * PARA_LINE_HEIGHT;
  certLines.forEach((line) => {
    page.drawText(line, {
      x: MARGIN_H,
      y: paraY,
      size: metrics.fontSize,
      font,
      color: COLOR_TEXT,
      maxWidth: CONTENT_WIDTH,
    });
    paraY -= PARA_LINE_HEIGHT;
  });
  paraY -= PARA_GAP;
  depositLines.forEach((line) => {
    page.drawText(line, {
      x: MARGIN_H,
      y: paraY,
      size: metrics.fontSize,
      font,
      color: COLOR_TEXT,
      maxWidth: CONTENT_WIDTH,
    });
    paraY -= PARA_LINE_HEIGHT;
  });

  const city = String(fields.statementCity || '______________________');
  const dateFr = formatFrenchDate(fields.statementDate) || '____ / ____ / ______';
  page.drawText(`Fait à ${city}, le ${dateFr}.`, {
    x: MARGIN_H,
    y: faitY,
    size: metrics.fontSize,
    font,
    color: COLOR_TEXT,
  });

  if (fields.signatureIsLegalEntity) {
    const signatureLines = Array.isArray(fields.signatureLines) && fields.signatureLines.length
      ? fields.signatureLines
      : [
        `Pour ${fields.signatureCompanyName || fields.companyName || 'la personne morale'}`,
        fields.signatureRepresentativeName ? `Représentée par ${fields.signatureRepresentativeName}` : 'Représentée par [représentant légal]',
        `Qualité : ${fields.signatureRepresentativeQuality || 'à compléter'}`,
      ];
    let entityY = LINE_Y + 48;
    signatureLines.forEach((line) => {
      page.drawText(String(line), { x: MARGIN_H, y: entityY, size: metrics.fontSize, font, color: COLOR_TEXT });
      entityY -= PARA_LINE_HEIGHT;
    });
  } else {
    page.drawText(`${fields.presidentName || fields.signatureFullName || 'Le Président'},`, {
      x: MARGIN_H,
      y: LINE_Y + 42,
      size: metrics.fontSize,
      font,
      color: COLOR_TEXT,
    });
  }
  page.drawText(String(fields.presidentSignatureLabel || 'Le Président'), {
    x: MARGIN_H,
    y: LINE_Y + 28,
    size: metrics.fontSize,
    font: fontBold,
    color: COLOR_TEXT,
  });
  page.drawLine({
    start: { x: MARGIN_H, y: LINE_Y },
    end: { x: MARGIN_H + 220, y: LINE_Y },
    thickness: 0.6,
    color: COLOR_TEXT,
  });

  page.drawText('Liste des souscripteurs', { x: MARGIN_H, y: 28, size: 8.5, font, color: COLOR_MUTED });

  fs.writeFileSync(targetPath, await pdfDoc.save());
  return targetPath;
};

export { validateSubscribersListFields } from '../documents/subscribersList/buildFields.js';

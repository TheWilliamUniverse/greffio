import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { formatFrenchDate } from './nonConvictionPdf.js';

const outputDir = path.resolve(process.cwd(), 'server', 'data', 'generated', 'formality-powers');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_H = 56;
const MARGIN_TOP = 62;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_H * 2;
const COLOR_TEXT = rgb(0, 0, 0);

const wrapText = (text, maxChars = 88) => {
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
  return lines;
};

export const generateFormalityPowersPdf = async ({ filename, fields = {} }) => {
  const targetPath = path.join(outputDir, filename);
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  let y = PAGE_HEIGHT - MARGIN_TOP;
  const title = String(fields.title || 'POUVOIRS POUR FORMALITÉS');
  const titleWidth = fontBold.widthOfTextAtSize(title, 14);
  page.drawText(title, { x: (PAGE_WIDTH - titleWidth) / 2, y, size: 14, font: fontBold, color: COLOR_TEXT });
  y -= 28;

  page.drawText(String(fields.annexTitle || 'Annexe — Pouvoirs pour formalités'), {
    x: MARGIN_H,
    y,
    size: 11,
    font: fontBold,
    color: COLOR_TEXT,
  });
  y -= 18;

  page.drawText(`Société : ${fields.companyName || '—'} (${fields.legalForm || '—'})`, {
    x: MARGIN_H,
    y,
    size: 10.5,
    font,
    color: COLOR_TEXT,
  });
  y -= 16;
  page.drawText(`Greffe compétent : ${fields.greffe || '—'}`, {
    x: MARGIN_H,
    y,
    size: 10.5,
    font,
    color: COLOR_TEXT,
  });
  y -= 22;

  (fields.paragraphs || []).forEach((paragraph) => {
    wrapText(paragraph).forEach((line) => {
      page.drawText(line, { x: MARGIN_H, y, size: 10.5, font, color: COLOR_TEXT, maxWidth: CONTENT_WIDTH });
      y -= 14;
    });
    y -= 6;
  });

  y -= 10;
  const city = String(fields.statementCity || '______________________');
  const dateFr = formatFrenchDate(fields.statementDate) || '____ / ____ / ______';
  page.drawText(`Fait à ${city}, le ${dateFr}.`, { x: MARGIN_H, y, size: 10.5, font, color: COLOR_TEXT });
  y -= 32;

  if (fields.signatureIsLegalEntity) {
    const signatureLines = Array.isArray(fields.signatureLines) && fields.signatureLines.length
      ? fields.signatureLines
      : [
        `Pour ${fields.signatureCompanyName || fields.companyName || 'la personne morale'}`,
        fields.signatureRepresentativeName ? `Représentée par ${fields.signatureRepresentativeName}` : 'Représentée par [représentant légal]',
        `Qualité : ${fields.signatureRepresentativeQuality || 'à compléter'}`,
      ];
    signatureLines.forEach((line) => {
      page.drawText(String(line), { x: MARGIN_H, y, size: 10.5, font, color: COLOR_TEXT });
      y -= 14;
    });
  } else {
    page.drawText(`${fields.signatoryName || fields.signatureFullName || 'Le signataire'},`, {
      x: MARGIN_H,
      y,
      size: 10.5,
      font,
      color: COLOR_TEXT,
    });
    y -= 14;
  }
  page.drawText(String(fields.signatoryTitle || 'Le Président'), {
    x: MARGIN_H,
    y,
    size: 10.5,
    font: fontBold,
    color: COLOR_TEXT,
  });
  y -= 24;
  page.drawLine({
    start: { x: MARGIN_H, y },
    end: { x: MARGIN_H + 220, y },
    thickness: 0.6,
    color: COLOR_TEXT,
  });

  fs.writeFileSync(targetPath, await pdfDoc.save());
  return targetPath;
};

export { validateFormalityPowersFields } from '../documents/formalityPowers/buildFields.js';

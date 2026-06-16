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
const MARGIN_TOP = 62;
const MARGIN_BOTTOM = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_H * 2;
const COLOR_TEXT = rgb(0, 0, 0);
const COLOR_MUTED = rgb(0.25, 0.25, 0.25);

const drawCentered = (page, font, y, text, size, bold = false) => {
  const f = font;
  const textWidth = f.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (PAGE_WIDTH - textWidth) / 2, y, size, font: f, color: COLOR_TEXT });
  return y - size * 1.6;
};

const drawLabelValue = (page, font, fontBold, y, label, value) => {
  page.drawText(label, { x: MARGIN_H, y, size: 10.5, font: fontBold, color: COLOR_TEXT });
  page.drawText(String(value || '–'), {
    x: MARGIN_H + 175,
    y,
    size: 10.5,
    font,
    color: COLOR_TEXT,
    maxWidth: CONTENT_WIDTH - 180,
  });
  return y - 16;
};

export const generateSubscribersListPdf = async ({ filename, fields = {} }) => {
  const targetPath = path.join(outputDir, filename);
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  let y = PAGE_HEIGHT - MARGIN_TOP;
  y = drawCentered(page, fontBold, y, 'LISTE DES SOUSCRIPTEURS', 14, true);
  y -= 6;
  y = drawCentered(page, fontBold, y, String(fields.legalFormHeader || 'SOCIÉTÉ'), 11, true);
  y -= 4;
  y = drawCentered(page, fontBold, y, String(fields.companyName || 'Dénomination').toUpperCase(), 12, true);
  y -= 22;

  const securitiesUnit = String(fields.securitiesUnit || 'Actions');
  const subscribers = Array.isArray(fields.subscribers) ? fields.subscribers : [];

  subscribers.forEach((subscriber, index) => {
    if (y < MARGIN_BOTTOM + 180) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN_TOP;
    }
    const heading = subscriber.sectionHeading || `${subscriber.roleTitle || 'Associé'} – ${subscriber.fullName || ''}`;
    page.drawText(heading, { x: MARGIN_H, y, size: 11, font: fontBold, color: COLOR_TEXT });
    y -= 18;

    const rows = subscriber.isLegalEntity
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
      ];
    rows.forEach(([label, value]) => {
      if (y < MARGIN_BOTTOM + 40) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN_TOP;
      }
      y = drawLabelValue(page, font, fontBold, y, label, value);
    });
    y -= index < subscribers.length - 1 ? 14 : 8;
  });

  const wrapParagraph = (text) => {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';
    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (next.length > 92) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = next;
      }
    });
    if (current) lines.push(current);
    return lines;
  };

  const signatureBlockTopY = SUBSCRIBERS_LIST_SIGNATURE_LINE_Y + 90;
  if (y < signatureBlockTopY + 40) {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN_TOP;
  }

  wrapParagraph(fields.depositParagraph).forEach((line) => {
    if (y < signatureBlockTopY) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN_TOP;
    }
    page.drawText(line, { x: MARGIN_H, y, size: 10.5, font, color: COLOR_TEXT, maxWidth: CONTENT_WIDTH });
    y -= 14;
  });
  y -= 10;

  wrapParagraph(fields.certificationParagraph).forEach((line) => {
    if (y < signatureBlockTopY) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN_TOP;
    }
    page.drawText(line, { x: MARGIN_H, y, size: 10.5, font, color: COLOR_TEXT, maxWidth: CONTENT_WIDTH });
    y -= 14;
  });

  const lineY = SUBSCRIBERS_LIST_SIGNATURE_LINE_Y;
  const city = String(fields.statementCity || '______________________');
  const dateFr = formatFrenchDate(fields.statementDate) || '____ / ____ / ______';
  page.drawText(`Fait à ${city}, le ${dateFr}.`, { x: MARGIN_H, y: lineY + 66, size: 10.5, font, color: COLOR_TEXT });

  if (fields.signatureIsLegalEntity) {
    const signatureLines = Array.isArray(fields.signatureLines) && fields.signatureLines.length
      ? fields.signatureLines
      : [
        `Pour ${fields.signatureCompanyName || fields.companyName || 'la personne morale'}`,
        fields.signatureRepresentativeName ? `Représentée par ${fields.signatureRepresentativeName}` : 'Représentée par [représentant légal]',
        `Qualité : ${fields.signatureRepresentativeQuality || 'à compléter'}`,
      ];
    let entityY = lineY + 48;
    signatureLines.forEach((line) => {
      page.drawText(String(line), { x: MARGIN_H, y: entityY, size: 10.5, font, color: COLOR_TEXT });
      entityY -= 14;
    });
  } else {
    page.drawText(`${fields.presidentName || fields.signatureFullName || 'Le Président'},`, {
      x: MARGIN_H,
      y: lineY + 42,
      size: 10.5,
      font,
      color: COLOR_TEXT,
    });
  }
  page.drawText(String(fields.presidentSignatureLabel || 'Le Président'), {
    x: MARGIN_H,
    y: lineY + 28,
    size: 10.5,
    font: fontBold,
    color: COLOR_TEXT,
  });
  page.drawLine({
    start: { x: MARGIN_H, y: lineY },
    end: { x: MARGIN_H + 220, y: lineY },
    thickness: 0.6,
    color: COLOR_TEXT,
  });

  const footer = 'Liste des souscripteurs';
  page.drawText(footer, { x: MARGIN_H, y: 28, size: 8.5, font, color: COLOR_MUTED });

  fs.writeFileSync(targetPath, await pdfDoc.save());
  return targetPath;
};

export { validateSubscribersListFields } from '../documents/subscribersList/buildFields.js';

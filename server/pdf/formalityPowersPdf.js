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
const MARGIN_LEFT = 70.87; // 25 mm
const MARGIN_RIGHT = 70.87;
const MARGIN_TOP = 62.36; // 22 mm
const MARGIN_BOTTOM = 68.03; // 24 mm
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const COLOR_TEXT = rgb(0.08, 0.08, 0.08);
const COLOR_MUTED = rgb(0.35, 0.35, 0.35);

const mmFromTopToY = (mmFromTop) => PAGE_HEIGHT - MARGIN_TOP - (mmFromTop * 2.834645669);

const pdfSafe = (value) => String(value ?? '')
  .normalize('NFC')
  .replace(/\u202f/g, ' ')
  .replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, (char) => {
    const ascii = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return ascii || '?';
  });

const LEGAL_FORM_LABELS = {
  SAS: 'société par actions simplifiée',
  SASU: 'société par actions simplifiée unipersonnelle',
  SARL: 'société à responsabilité limitée',
  EURL: 'entreprise unipersonnelle à responsabilité limitée',
  SA: 'société anonyme',
  SCI: 'société civile immobilière',
};

const resolveLegalFormLabel = (code, companyName) => {
  const key = String(code || '').trim().toUpperCase();
  const label = LEGAL_FORM_LABELS[key];
  if (label) return label;
  return key || 'forme sociale';
};

const wrapLines = (text, maxChars = 92) => {
  const words = pdfSafe(text).split(/\s+/).filter(Boolean);
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

const drawLines = ({
  page,
  lines,
  x,
  yStart,
  font,
  size,
  color = COLOR_TEXT,
  lineHeight,
  maxWidth = CONTENT_WIDTH,
}) => {
  let y = yStart;
  lines.forEach((line) => {
    page.drawText(pdfSafe(line), {
      x,
      y,
      size,
      font,
      color,
      maxWidth,
    });
    y -= lineHeight;
  });
  return y;
};

export const generateFormalityPowersPdf = async ({ filename, fields = {} }) => {
  const targetPath = path.join(outputDir, filename);
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const companyName = pdfSafe(fields.companyName || '—');
  const legalFormCode = String(fields.legalForm || 'SAS').trim().toUpperCase();
  const legalFormLabel = resolveLegalFormLabel(legalFormCode, companyName);
  const greffe = pdfSafe(fields.greffe || '—');
  const mandataire = pdfSafe(fields.mandataire || 'WILLIAM ESTABLISHMENTS / Greffio');
  const city = pdfSafe(fields.statementCity || '______________________');
  const dateFr = formatFrenchDate(fields.statementDate) || '____ / ____ / ______';
  const signatoryName = pdfSafe(fields.signatoryName || fields.signatureFullName || 'Le signataire');
  const signatoryTitle = pdfSafe(fields.signatoryTitle || 'Le Président');

  // Titre principal centré (~26 mm du haut)
  const title = pdfSafe(fields.title || 'POUVOIRS POUR FORMALITÉS');
  const titleSize = 15.5;
  const titleWidth = fontBold.widthOfTextAtSize(title, titleSize);
  page.drawText(title, {
    x: (PAGE_WIDTH - titleWidth) / 2,
    y: mmFromTopToY(26),
    size: titleSize,
    font: fontBold,
    color: COLOR_TEXT,
  });

  // Annexe 3
  let y = mmFromTopToY(42);
  page.drawText('Annexe 3', { x: MARGIN_LEFT, y, size: 10.5, font: fontBold, color: COLOR_TEXT });
  y -= 14;
  page.drawText('Pouvoirs pour formalités', {
    x: MARGIN_LEFT,
    y,
    size: 10.5,
    font: fontItalic,
    color: COLOR_MUTED,
  });

  // Bloc société (~62 mm)
  y = mmFromTopToY(62);
  page.drawText('Société concernée : ', {
    x: MARGIN_LEFT,
    y,
    size: 10.5,
    font: fontBold,
    color: COLOR_TEXT,
  });
  const companyLabel = `${companyName}, ${legalFormLabel}`;
  page.drawText(companyLabel, {
    x: MARGIN_LEFT + fontBold.widthOfTextAtSize('Société concernée : ', 10.5),
    y,
    size: 10.5,
    font,
    color: COLOR_TEXT,
    maxWidth: CONTENT_WIDTH - 95,
  });
  y -= 15;
  page.drawText('Greffe compétent : ', {
    x: MARGIN_LEFT,
    y,
    size: 10.5,
    font: fontBold,
    color: COLOR_TEXT,
  });
  page.drawText(greffe, {
    x: MARGIN_LEFT + fontBold.widthOfTextAtSize('Greffe compétent : ', 10.5),
    y,
    size: 10.5,
    font,
    color: COLOR_TEXT,
  });

  // Introduction pouvoirs (~84 mm)
  y = mmFromTopToY(84);
  const introPrefix = 'Les pouvoirs sont expressément conférés à ';
  const introSuffix = ', ou à toute personne qu\'elle désignera, aux fins notamment de :';
  page.drawText(introPrefix, {
    x: MARGIN_LEFT,
    y,
    size: 10.5,
    font,
    color: COLOR_TEXT,
  });
  const prefixWidth = font.widthOfTextAtSize(introPrefix, 10.5);
  page.drawText(mandataire, {
    x: MARGIN_LEFT + prefixWidth,
    y,
    size: 10.5,
    font: fontBold,
    color: COLOR_TEXT,
  });
  const mandataireWidth = fontBold.widthOfTextAtSize(mandataire, 10.5);
  wrapLines(introSuffix, 88).forEach((line, index) => {
    page.drawText(line, {
      x: index === 0 ? MARGIN_LEFT + prefixWidth + mandataireWidth : MARGIN_LEFT,
      y: index === 0 ? y : y - (index * 14),
      size: 10.5,
      font,
      color: COLOR_TEXT,
      maxWidth: CONTENT_WIDTH,
    });
  });
  y -= 28;

  const bullets = (fields.paragraphs && fields.paragraphs.length > 1)
    ? fields.paragraphs.slice(1).map((item) => String(item).replace(/^•\s*/, '').trim())
    : [
      'procéder à la signature électronique des pièces lorsque la loi l\'autorise ;',
      'effectuer le dépôt au greffe compétent et les formalités au guichet unique ;',
      'publier l\'annonce légale et accomplir toute publicité requise ;',
      'demander l\'immatriculation et répondre aux demandes de compléments du greffe ;',
      'corriger, compléter ou regulariser le dossier dans l\'intérêt de la Société.',
    ];

  y = mmFromTopToY(102);
  bullets.forEach((bullet) => {
    const lines = wrapLines(bullet, 86);
    page.drawText('-', { x: MARGIN_LEFT + 4, y, size: 10.5, font, color: COLOR_TEXT });
    lines.forEach((line, lineIndex) => {
      page.drawText(line, {
        x: MARGIN_LEFT + 16,
        y: y - (lineIndex * 14),
        size: 10.5,
        font,
        color: COLOR_TEXT,
        maxWidth: CONTENT_WIDTH - 20,
      });
    });
    y -= Math.max(lines.length * 14, 14) + 4;
  });

  // Bloc signature — dernier tiers de page
  y = mmFromTopToY(188);
  page.drawText(`Fait à ${city}, le ${pdfSafe(dateFr)}.`, {
    x: MARGIN_LEFT,
    y,
    size: 10.5,
    font,
    color: COLOR_TEXT,
  });

  y = mmFromTopToY(206);
  page.drawText(`${signatoryName},`, {
    x: MARGIN_LEFT,
    y,
    size: 10.5,
    font,
    color: COLOR_TEXT,
  });
  y -= 15;
  page.drawText(signatoryTitle, {
    x: MARGIN_LEFT,
    y,
    size: 10.5,
    font: fontBold,
    color: COLOR_TEXT,
  });

  y = mmFromTopToY(232);
  page.drawText('Signature :', {
    x: MARGIN_LEFT,
    y,
    size: 10.5,
    font,
    color: COLOR_TEXT,
  });
  const lineY = mmFromTopToY(250);
  page.drawLine({
    start: { x: MARGIN_LEFT + 58, y: lineY },
    end: { x: MARGIN_LEFT + 58 + 200, y: lineY },
    thickness: 0.6,
    color: COLOR_MUTED,
  });

  fs.writeFileSync(targetPath, await pdfDoc.save());
  return targetPath;
};

export { validateFormalityPowersFields } from '../documents/formalityPowers/buildFields.js';

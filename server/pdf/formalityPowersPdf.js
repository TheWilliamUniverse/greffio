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
const MARGIN_LEFT = 56.69; // 20 mm
const MARGIN_RIGHT = 56.69;
const MARGIN_TOP = 56.69;
const MARGIN_BOTTOM = 62.36;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const BODY_SIZE = 10;
const BODY_LINE_HEIGHT = 13;
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

const resolveLegalFormLabel = (code) => {
  const key = String(code || '').trim().toUpperCase();
  return LEGAL_FORM_LABELS[key] || key || 'forme sociale';
};

const wrapTextByWidth = (text, font, size, maxWidth) => {
  const words = pdfSafe(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  words.forEach((word) => {
    const trial = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(trial, size);
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else if (width > maxWidth) {
      lines.push(word);
      current = '';
    } else {
      current = trial;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [''];
};

const drawWrappedBlock = ({
  page,
  lines,
  x,
  yStart,
  font,
  size = BODY_SIZE,
  color = COLOR_TEXT,
  lineHeight = BODY_LINE_HEIGHT,
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

const drawLabelValue = ({
  page,
  label,
  value,
  y,
  font,
  fontBold,
  size = BODY_SIZE,
}) => {
  const labelText = pdfSafe(label);
  const labelWidth = fontBold.widthOfTextAtSize(labelText, size);
  page.drawText(labelText, {
    x: MARGIN_LEFT,
    y,
    size,
    font: fontBold,
    color: COLOR_TEXT,
  });
  const valueLines = wrapTextByWidth(value, font, size, CONTENT_WIDTH - labelWidth - 4);
  valueLines.forEach((line, index) => {
    page.drawText(pdfSafe(line), {
      x: MARGIN_LEFT + (index === 0 ? labelWidth : 0),
      y: y - (index * BODY_LINE_HEIGHT),
      size,
      font,
      color: COLOR_TEXT,
      maxWidth: CONTENT_WIDTH - (index === 0 ? labelWidth : 0),
    });
  });
  return y - (valueLines.length * BODY_LINE_HEIGHT);
};

export const generateFormalityPowersPdf = async ({ filename, fields = {} }) => {
  const targetPath = path.join(outputDir, filename);
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const companyName = pdfSafe(fields.companyName || '–');
  const legalFormCode = String(fields.legalForm || 'SAS').trim().toUpperCase();
  const legalFormLabel = resolveLegalFormLabel(legalFormCode);
  const greffe = pdfSafe(fields.greffe || '–');
  const mandataire = pdfSafe(fields.mandataire || 'WILLIAM ESTABLISHMENTS / Greffio');
  const city = pdfSafe(fields.statementCity || '______________________');
  const dateFr = formatFrenchDate(fields.statementDate) || '____ / ____ / ______';
  const signatoryName = pdfSafe(fields.signatoryName || fields.signatureFullName || 'Le signataire');
  const signatoryTitle = pdfSafe(fields.signatoryTitle || 'Le Président');

  const title = pdfSafe(fields.title || 'POUVOIRS POUR FORMALITÉS');
  const titleSize = 14.5;
  const titleWidth = fontBold.widthOfTextAtSize(title, titleSize);
  page.drawText(title, {
    x: (PAGE_WIDTH - titleWidth) / 2,
    y: mmFromTopToY(24),
    size: titleSize,
    font: fontBold,
    color: COLOR_TEXT,
  });

  let y = mmFromTopToY(40);
  page.drawText('Annexe 3', { x: MARGIN_LEFT, y, size: BODY_SIZE, font: fontBold, color: COLOR_TEXT });
  y -= BODY_LINE_HEIGHT;
  page.drawText('Pouvoirs pour formalités', {
    x: MARGIN_LEFT,
    y,
    size: BODY_SIZE,
    font: fontItalic,
    color: COLOR_MUTED,
  });

  y = mmFromTopToY(58);
  y = drawLabelValue({
    page,
    label: 'Société concernée : ',
    value: companyName,
    y,
    font,
    fontBold,
  });
  y -= 2;
  const formLines = wrapTextByWidth(legalFormLabel, fontItalic, BODY_SIZE - 0.5, CONTENT_WIDTH - 12);
  formLines.forEach((line, index) => {
    page.drawText(pdfSafe(line), {
      x: MARGIN_LEFT + 12,
      y: y - (index * (BODY_LINE_HEIGHT - 1)),
      size: BODY_SIZE - 0.5,
      font: fontItalic,
      color: COLOR_MUTED,
      maxWidth: CONTENT_WIDTH - 12,
    });
  });
  y -= (formLines.length * (BODY_LINE_HEIGHT - 1)) + 4;

  y = drawLabelValue({
    page,
    label: 'Greffe compétent : ',
    value: greffe,
    y,
    font,
    fontBold,
  });
  y -= 10;

  const introLead = `Les pouvoirs sont expressément conférés à ${mandataire}, ou à toute personne qu'elle désignera, aux fins notamment de :`;
  const introLines = wrapTextByWidth(introLead, font, BODY_SIZE, CONTENT_WIDTH);
  y = drawWrappedBlock({
    page,
    lines: introLines,
    x: MARGIN_LEFT,
    yStart: y,
    font,
  });
  y -= 8;

  const bullets = (fields.paragraphs && fields.paragraphs.length > 1)
    ? fields.paragraphs.slice(1).map((item) => String(item).replace(/^•\s*/, '').trim())
    : [
      'procéder à la signature électronique des pièces lorsque la loi l\'autorise ;',
      'effectuer le dépôt au greffe compétent et les formalités au guichet unique ;',
      'publier l\'annonce légale et accomplir toute publicité requise ;',
      'demander l\'immatriculation et répondre aux demandes de compléments du greffe ;',
      'corriger, compléter ou regulariser le dossier dans l\'intérêt de la Société.',
    ];

  bullets.forEach((bullet) => {
    const lines = wrapTextByWidth(bullet, font, BODY_SIZE, CONTENT_WIDTH - 18);
    page.drawText('-', { x: MARGIN_LEFT + 2, y, size: BODY_SIZE, font, color: COLOR_TEXT });
    lines.forEach((line, lineIndex) => {
      page.drawText(pdfSafe(line), {
        x: MARGIN_LEFT + 14,
        y: y - (lineIndex * BODY_LINE_HEIGHT),
        size: BODY_SIZE,
        font,
        color: COLOR_TEXT,
        maxWidth: CONTENT_WIDTH - 18,
      });
    });
    y -= Math.max(lines.length * BODY_LINE_HEIGHT, BODY_LINE_HEIGHT) + 3;
  });

  y = mmFromTopToY(188);
  page.drawText(`Fait à ${city}, le ${pdfSafe(dateFr)}.`, {
    x: MARGIN_LEFT,
    y,
    size: BODY_SIZE,
    font,
    color: COLOR_TEXT,
    maxWidth: CONTENT_WIDTH,
  });

  y = mmFromTopToY(206);
  const signNameLines = wrapTextByWidth(`${signatoryName},`, font, BODY_SIZE, CONTENT_WIDTH);
  y = drawWrappedBlock({
    page,
    lines: signNameLines,
    x: MARGIN_LEFT,
    yStart: y,
    font,
  });
  y -= 2;
  page.drawText(signatoryTitle, {
    x: MARGIN_LEFT,
    y,
    size: BODY_SIZE,
    font: fontBold,
    color: COLOR_TEXT,
    maxWidth: CONTENT_WIDTH,
  });

  y = mmFromTopToY(232);
  page.drawText('Signature :', {
    x: MARGIN_LEFT,
    y,
    size: BODY_SIZE,
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

import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const outputDir = path.resolve(process.cwd(), 'server', 'data', 'generated', 'declarations');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MARGIN = 56;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLOR_TEXT = rgb(0.067, 0.094, 0.153);
const COLOR_MUTED = rgb(0.42, 0.45, 0.51);
const COLOR_LINE = rgb(0.898, 0.906, 0.922);

const INVALID_DISPLAY_VALUES = new Set([
  'undefined', 'null', 'nan', 'invalid date', '[object object]',
  'true', 'false', 'w', 'g', 'l', 'test', 'parent',
]);

export const formatFrenchDate = (value) => {
  if (!value) return '';
  const raw = String(value).trim();
  let date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(raw);
  }
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getDate()} ${MONTHS_FR[date.getMonth()]} ${date.getFullYear()}`;
};

const capitalizeWords = (value) => String(value || '')
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
  .join(' ');

const sanitizeDisplayValue = (value, { fallback = '________________________________________', minLength = 2 } = {}) => {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  const lowered = raw.toLowerCase();
  if (INVALID_DISPLAY_VALUES.has(lowered)) return fallback;
  if (raw.length < minLength) return fallback;
  return raw;
};

const splitFullName = (fields = {}) => {
  if (fields.declarantFirstName || fields.declarantLastName) {
    return {
      firstName: capitalizeWords(fields.declarantFirstName),
      lastName: String(fields.declarantLastName || '').trim().toUpperCase(),
    };
  }
  const full = String(fields.declarantFullName || '').trim();
  const parts = full.split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: '', lastName: '' };
  if (parts.length === 1) {
    return { firstName: capitalizeWords(parts[0]), lastName: parts[0].toUpperCase() };
  }
  return {
    firstName: capitalizeWords(parts.slice(0, -1).join(' ')),
    lastName: parts[parts.length - 1].toUpperCase(),
  };
};

const buildFullAddress = (fields = {}) => {
  const line1 = fields.addressLine1 || fields.declarantAddress || '';
  const line2 = fields.addressLine2 || '';
  const postal = fields.postalCode || '';
  const city = fields.city || '';
  const country = fields.country || 'France';
  return [line1, line2, [postal, city].filter(Boolean).join(' '), country].filter(Boolean).join(', ');
};

const wrapText = (text, maxChars = 78) => {
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

const drawLine = (page, y) => {
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.6,
    color: COLOR_LINE,
  });
};

const drawSectionTitle = (page, fontBold, y, title) => {
  page.drawText(title, {
    x: MARGIN,
    y,
    size: 11,
    font: fontBold,
    color: COLOR_TEXT,
  });
  return y - 22;
};

const drawLabelValue = (page, font, y, label, value) => {
  page.drawText(label, {
    x: MARGIN,
    y,
    size: 8.5,
    font,
    color: COLOR_MUTED,
  });
  page.drawText(value, {
    x: MARGIN,
    y: y - 14,
    size: 10.5,
    font,
    color: COLOR_TEXT,
    maxWidth: CONTENT_WIDTH,
  });
  return y - 34;
};

const drawParagraph = (page, font, y, text, { size = 10.5, lineHeight = 15, indent = 0 } = {}) => {
  const lines = wrapText(text, 82);
  lines.forEach((line) => {
    page.drawText(line, {
      x: MARGIN + indent,
      y,
      size,
      font,
      color: COLOR_TEXT,
      maxWidth: CONTENT_WIDTH - indent,
    });
    y -= lineHeight;
  });
  return y;
};

export const generateNonConvictionPdf = async ({ filename, fields = {}, documentId = '' }) => {
  const targetPath = path.join(outputDir, filename);
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { firstName, lastName } = splitFullName(fields);
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()
    || sanitizeDisplayValue(fields.declarantFullName, { fallback: '________________________________________' });
  const fullAddress = sanitizeDisplayValue(buildFullAddress(fields));
  const birthDateFr = sanitizeDisplayValue(formatFrenchDate(fields.declarantBirthDate), {
    fallback: '____ / ____ / ______',
    minLength: 4,
  });
  const birthCity = sanitizeDisplayValue(fields.declarantBirthCity);
  const birthPlace = birthDateFr === '____ / ____ / ______' && birthCity.startsWith('_')
    ? '____ / ____ / ______ — ________________________________'
    : `${birthDateFr} — ${birthCity}`;
  const parent1 = sanitizeDisplayValue(fields.parent1FullName || fields.fatherFullName);
  const parent2 = sanitizeDisplayValue(fields.parent2FullName || fields.motherFullName);
  const statementCity = sanitizeDisplayValue(fields.statementCity, { fallback: '______________________', minLength: 2 });
  const signatureDateFr = sanitizeDisplayValue(formatFrenchDate(fields.statementDate), {
    fallback: '____ / ____ / ______',
    minLength: 4,
  });
  const reference = sanitizeDisplayValue(documentId, { fallback: '', minLength: 3 });

  let y = 790;

  page.drawText('Greffio', {
    x: MARGIN,
    y,
    size: 11,
    font: fontBold,
    color: COLOR_TEXT,
  });
  page.drawText('Formalité RCS / RNE', {
    x: MARGIN,
    y: y - 14,
    size: 9,
    font,
    color: COLOR_MUTED,
  });
  if (reference && !reference.startsWith('_')) {
    const refText = `Réf. ${reference}`;
    const refWidth = font.widthOfTextAtSize(refText, 8.5);
    page.drawText(refText, {
      x: PAGE_WIDTH - MARGIN - refWidth,
      y,
      size: 8.5,
      font,
      color: COLOR_MUTED,
    });
  }

  y -= 34;
  drawLine(page, y);
  y -= 28;

  page.drawText('DÉCLARATION DE NON-CONDAMNATION', {
    x: MARGIN,
    y,
    size: 16,
    font: fontBold,
    color: COLOR_TEXT,
  });
  page.drawText('ET DE FILIATION', {
    x: MARGIN,
    y: y - 20,
    size: 16,
    font: fontBold,
    color: COLOR_TEXT,
  });
  y -= 48;

  y = drawSectionTitle(page, fontBold, y, 'Déclarant');
  y = drawLabelValue(page, font, y, 'Nom complet', fullName);
  y = drawLabelValue(page, font, y, 'Date et lieu de naissance', birthPlace);
  y = drawLabelValue(page, font, y, 'Adresse', fullAddress);

  y -= 8;
  y = drawSectionTitle(page, fontBold, y, 'Filiation');
  y = drawLabelValue(page, font, y, 'Parent 1', parent1);
  y = drawLabelValue(page, font, y, 'Parent 2', parent2);

  y -= 8;
  y = drawSectionTitle(page, fontBold, y, 'Déclaration');
  y = drawParagraph(page, font, y, 'Je déclare sur l’honneur n’avoir fait l’objet d’aucune condamnation pénale, ni d’aucune sanction civile ou administrative de nature à m’interdire :', { lineHeight: 16 });
  y -= 4;
  y = drawParagraph(page, font, y, '— de gérer, administrer, diriger ou contrôler une personne morale ;', { lineHeight: 16 });
  y = drawParagraph(page, font, y, '— ou d’exercer une activité commerciale.', { lineHeight: 16 });

  y -= 12;
  page.drawText(`Fait à ${statementCity}, le ${signatureDateFr}`, {
    x: MARGIN,
    y,
    size: 10.5,
    font,
    color: COLOR_TEXT,
  });
  y -= 28;
  page.drawText('Signature du déclarant', {
    x: MARGIN,
    y,
    size: 10.5,
    font: fontBold,
    color: COLOR_TEXT,
  });
  y -= 52;
  page.drawLine({
    start: { x: MARGIN, y: y + 8 },
    end: { x: MARGIN + 240, y: y + 8 },
    thickness: 0.8,
    color: COLOR_MUTED,
  });
  page.drawText('Signature manuscrite ou électronique', {
    x: MARGIN,
    y: y - 8,
    size: 8,
    font,
    color: COLOR_MUTED,
  });

  drawLine(page, 92);
  page.drawText('Rappel légal', {
    x: MARGIN,
    y: 78,
    size: 8.5,
    font: fontBold,
    color: COLOR_MUTED,
  });
  wrapText(
    'Conformément à l’article L.123-5 du Code de commerce, le fait de donner de mauvaise foi des indications inexactes ou incomplètes en vue d’une formalité au registre du commerce et des sociétés est puni des sanctions prévues par la loi.',
    96,
  ).forEach((chunk, index) => {
    page.drawText(chunk, {
      x: MARGIN,
      y: 64 - index * 10,
      size: 8,
      font,
      color: COLOR_MUTED,
      maxWidth: CONTENT_WIDTH,
    });
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(targetPath, pdfBytes);
  return targetPath;
};

export const validateNonConvictionFields = (fields = {}) => {
  const { firstName, lastName } = splitFullName(fields);
  if (!firstName || !lastName) {
    return { ok: false, error: 'DOCUMENT_EDITOR_IDENTITY_REQUIRED' };
  }
  if (!fields.declarantBirthDate || !fields.declarantBirthCity) {
    return { ok: false, error: 'DOCUMENT_EDITOR_IDENTITY_REQUIRED' };
  }
  if (!fields.parent1FullName && !fields.fatherFullName) {
    return { ok: false, error: 'DOCUMENT_EDITOR_PARENTS_REQUIRED' };
  }
  if (!fields.parent2FullName && !fields.motherFullName) {
    return { ok: false, error: 'DOCUMENT_EDITOR_PARENTS_REQUIRED' };
  }
  const address = buildFullAddress(fields);
  if (!address || address.length < 8) {
    return { ok: false, error: 'DOCUMENT_EDITOR_ADDRESS_REQUIRED' };
  }
  if (!fields.statementCity || !fields.statementDate) {
    return { ok: false, error: 'DOCUMENT_EDITOR_SIGNATURE_PLACE_DATE_REQUIRED' };
  }
  const signatureFullName = String(fields.signatureFullName || '').trim()
    || `${firstName} ${lastName}`.trim();
  if (!signatureFullName) {
    return { ok: false, error: 'DOCUMENT_EDITOR_SIGNATURE_REQUIRED' };
  }
  if (!fields.declarationNonCondamnation) {
    return { ok: false, error: 'DOCUMENT_EDITOR_NON_CONDAMNATION_REQUIRED' };
  }
  if (fields.declarationFiliation === false) {
    return { ok: false, error: 'DOCUMENT_EDITOR_FILIATION_REQUIRED' };
  }
  return { ok: true };
};

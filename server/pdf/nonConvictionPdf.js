import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import {
  formatAddress,
  formatDeclarantName,
  formatFiliationClause,
  normalizeDeclarationFields,
} from '../documents/declarationNonCondamnation/formatters.js';

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
  if (fields.declarantFirstName || fields.declarantBirthName || fields.declarantLastName) {
    return {
      firstName: capitalizeWords(fields.declarantFirstName),
      lastName: String(fields.declarantBirthName || fields.declarantLastName || '').trim().toUpperCase(),
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

const formatBirthPlace = (birthDateFr, birthCity) => {
  const datePart = birthDateFr.startsWith('_') ? '____ / ____ / ______' : birthDateFr;
  const cityPart = birthCity.startsWith('_') ? '_______________________________' : birthCity;
  return `${datePart} à ${cityPart}`;
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

const drawParagraph = (page, font, y, text, { lineHeight = 15, indent = 0 } = {}) => {
  const lines = wrapText(text, 82);
  lines.forEach((line) => {
    page.drawText(line, {
      x: MARGIN + indent,
      y,
      size: 10.5,
      font,
      color: COLOR_TEXT,
      maxWidth: CONTENT_WIDTH - indent,
    });
    y -= lineHeight;
  });
  return y;
};

export const generateNonConvictionPdf = async ({ filename, fields: rawFields = {} }) => {
  const fields = normalizeDeclarationFields(rawFields);
  const targetPath = path.join(outputDir, filename);
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const declarantLine = formatDeclarantName({
    firstNames: fields.declarantFirstName,
    birthName: fields.declarantBirthName,
    usageName: fields.declarantUsageName,
    legacyLastName: fields.declarantLastName,
  }) || sanitizeDisplayValue(fields.declarantFullName, { fallback: '________________________________________' });
  const fullAddress = sanitizeDisplayValue(formatAddress({
    line1: fields.addressLine1 || fields.declarantAddress,
    line2: fields.addressLine2,
    postalCode: fields.postalCode,
    city: fields.city,
    country: fields.country || 'France',
  }));
  const birthDateFr = sanitizeDisplayValue(formatFrenchDate(fields.declarantBirthDate), {
    fallback: '____ / ____ / ______',
    minLength: 4,
  });
  const birthCity = sanitizeDisplayValue(fields.declarantBirthCity);
  const parent1 = sanitizeDisplayValue(fields.parent1FullName || fields.fatherFullName);
  const parent2 = sanitizeDisplayValue(fields.parent2FullName || fields.motherFullName);
  const filiationClause = formatFiliationClause({ parent1, parent2 });
  const statementCity = sanitizeDisplayValue(fields.statementCity, { fallback: '______________________', minLength: 2 });
  const signatureDateFr = sanitizeDisplayValue(formatFrenchDate(fields.statementDate), {
    fallback: '____ / ____ / ______',
    minLength: 4,
  });

  let y = 780;

  page.drawText('DÉCLARATION SUR L’HONNEUR', {
    x: MARGIN,
    y,
    size: 15,
    font: fontBold,
    color: COLOR_TEXT,
  });
  page.drawText('DE NON-CONDAMNATION ET DE FILIATION', {
    x: MARGIN,
    y: y - 18,
    size: 15,
    font: fontBold,
    color: COLOR_TEXT,
  });
  y -= 38;
  page.drawText(
    'Document établi dans le cadre d’une formalité d’immatriculation, de modification ou de déclaration d’entreprise.',
    {
      x: MARGIN,
      y,
      size: 8.5,
      font,
      color: COLOR_MUTED,
      maxWidth: CONTENT_WIDTH,
    },
  );
  y -= 24;
  drawLine(page, y);
  y -= 24;

  const bodyParts = [
    `Je soussigné(e) ${declarantLine},`,
    `né(e) le ${birthDateFr} à ${birthCity},`,
    `demeurant ${fullAddress},`,
    '',
    filiationClause ? `${filiationClause},` : null,
    '',
    'déclare sur l’honneur, en application de l’article A. 123-51 du Code de commerce,',
    'n’avoir fait l’objet d’aucune condamnation pénale ni d’aucune sanction civile ou administrative',
    'de nature à m’interdire :',
    '',
    '— de gérer, administrer, diriger ou contrôler une personne morale ;',
    '— ou d’exercer une activité commerciale.',
    '',
    'Je reconnais avoir été informé(e) que toute indication inexacte ou incomplète donnée de mauvaise foi',
    'dans le cadre d’une formalité au registre du commerce et des sociétés est susceptible d’entraîner',
    'les sanctions prévues par l’article L. 123-5 du Code de commerce.',
  ].filter((line) => line !== null);

  bodyParts.forEach((line) => {
    if (line === '') {
      y -= 8;
      return;
    }
    y = drawParagraph(page, font, y, line, { lineHeight: 14 });
  });

  y -= 12;
  page.drawText(`Fait à ${statementCity}, le ${signatureDateFr}`, {
    x: MARGIN,
    y,
    size: 10.5,
    font,
    color: COLOR_TEXT,
  });
  y -= 28;
  page.drawText('Signature du déclarant :', {
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

  drawLine(page, 92);
  page.drawText('Rappel légal', {
    x: MARGIN,
    y: 78,
    size: 8.5,
    font: fontBold,
    color: COLOR_MUTED,
  });
  wrapText(
    'Rappel légal — Le fait de donner, de mauvaise foi, des indications inexactes ou incomplètes en vue d’une formalité au registre du commerce et des sociétés est puni des sanctions prévues par l’article L. 123-5 du Code de commerce.',
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
  const normalized = normalizeDeclarationFields(fields);
  const { firstName, lastName } = splitFullName(normalized);
  if (!firstName || !lastName) {
    return { ok: false, error: 'DOCUMENT_EDITOR_IDENTITY_REQUIRED' };
  }
  if (!normalized.declarantBirthDate || !normalized.declarantBirthCity) {
    return { ok: false, error: 'DOCUMENT_EDITOR_IDENTITY_REQUIRED' };
  }
  if (!normalized.parent1FullName && !normalized.fatherFullName) {
    return { ok: false, error: 'DOCUMENT_EDITOR_PARENTS_REQUIRED' };
  }
  const hasParent2 = Boolean(
    normalized.parent2FullName
    || normalized.motherFullName
    || normalized.parent2BirthName,
  );
  if (!hasParent2) {
    return { ok: false, error: 'DOCUMENT_EDITOR_PARENTS_REQUIRED' };
  }
  const address = buildFullAddress(normalized);
  if (!address || address.length < 8) {
    return { ok: false, error: 'DOCUMENT_EDITOR_ADDRESS_REQUIRED' };
  }
  if (!normalized.statementCity || !normalized.statementDate) {
    return { ok: false, error: 'DOCUMENT_EDITOR_SIGNATURE_PLACE_DATE_REQUIRED' };
  }
  const signatureFullName = String(normalized.signatureFullName || '').trim()
    || formatDeclarantName({
      firstNames: normalized.declarantFirstName,
      birthName: normalized.declarantBirthName,
      usageName: normalized.declarantUsageName,
      legacyLastName: normalized.declarantLastName,
    });
  if (!signatureFullName) {
    return { ok: false, error: 'DOCUMENT_EDITOR_SIGNATURE_REQUIRED' };
  }
  if (!normalized.declarationNonCondamnation) {
    return { ok: false, error: 'DOCUMENT_EDITOR_NON_CONDAMNATION_REQUIRED' };
  }
  if (normalized.declarationFiliation === false) {
    return { ok: false, error: 'DOCUMENT_EDITOR_FILIATION_REQUIRED' };
  }
  return { ok: true, normalized };
};

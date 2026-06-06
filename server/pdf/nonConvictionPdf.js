import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import {
  formatAddress,
  formatDeclarantName,
  normalizeDeclarationFields,
} from '../documents/declarationNonCondamnation/formatters.js';

const outputDir = path.resolve(process.cwd(), 'server', 'data', 'generated', 'declarations');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MARGIN = 72;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLOR_TEXT = rgb(0.067, 0.094, 0.153);
const COLOR_MUTED = rgb(0.42, 0.45, 0.51);

const INVALID_DISPLAY_VALUES = new Set([
  'undefined', 'null', 'nan', 'invalid date', '[object object]',
  'true', 'false', 'w', 'g', 'l', 'test', 'parent',
]);

const LEGAL_FOOTER = 'Article L. 123-5 du code de commerce (alinéa 1) — « Le fait de donner, de mauvaise foi, des indications inexactes ou incomplètes en vue d’une immatriculation, d’une radiation ou d’une mention complémentaire ou rectificative au registre du commerce et des sociétés est puni d’une amende de 4 500 € et d’un emprisonnement de 6 mois. »';

const DECLARATION_BODY = 'Conformément à l’article A. 123-51 du code de commerce, n’avoir fait l’objet d’aucune condamnation pénale ni de sanction civile ou administrative de nature à m’interdire de gérer, administrer, diriger ou contrôler une personne morale, ou d’exercer une activité commerciale.';

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

const formatFiliationInline = (parent1, parent2) => {
  const p1 = sanitizeDisplayValue(parent1, { fallback: '______________________________', minLength: 2 });
  const p2 = sanitizeDisplayValue(parent2, { fallback: '______________________________', minLength: 2 });
  return `de ${p1} et de ${p2}`;
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

const drawWrappedLines = (page, font, y, text, { size = 11, lineHeight = 20, indent = 0, color = COLOR_TEXT } = {}) => {
  const lines = wrapText(text, 82);
  lines.forEach((line) => {
    page.drawText(line, {
      x: MARGIN + indent,
      y,
      size,
      font,
      color,
      maxWidth: CONTENT_WIDTH - indent,
    });
    y -= lineHeight;
  });
  return y;
};

const drawCenteredText = (page, font, y, text, size) => {
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (PAGE_WIDTH - textWidth) / 2,
    y,
    size,
    font,
    color: COLOR_TEXT,
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
  const parent1 = fields.parent1FullName || fields.fatherFullName;
  const parent2 = fields.parent2FullName || fields.motherFullName;
  const filiationInline = formatFiliationInline(parent1, parent2);
  const statementCity = sanitizeDisplayValue(fields.statementCity, { fallback: '______________________', minLength: 2 });
  const signatureDateFr = sanitizeDisplayValue(formatFrenchDate(fields.statementDate), {
    fallback: '____ / ____ / ______',
    minLength: 4,
  });
  const signatureName = sanitizeDisplayValue(
    fields.signatureFullName || declarantLine,
    { fallback: '________________________________________', minLength: 2 },
  );

  let y = 760;

  y = drawCenteredText(page, fontBold, y, 'DÉCLARATION DE NON-CONDAMNATION ET DE FILIATION', 14);
  y -= 28;
  y = drawCenteredText(
    page,
    font,
    y,
    'En application des dispositions de l’article A. 123-51 du code de commerce',
    10,
  );
  y -= 40;

  const identityParagraph = `Je soussigné(e) ${declarantLine}, né(e) le ${birthDateFr} à ${birthCity}, ${filiationInline}, demeurant ${fullAddress}.`;
  y = drawWrappedLines(page, font, y, identityParagraph, { size: 11, lineHeight: 22 });
  y -= 24;

  page.drawText('Déclare', {
    x: MARGIN,
    y,
    size: 12,
    font: fontBold,
    color: COLOR_TEXT,
  });
  y -= 28;

  y = drawWrappedLines(page, font, y, DECLARATION_BODY, { size: 11, lineHeight: 22 });
  y -= 36;

  page.drawText(`Fait à ${statementCity}, le ${signatureDateFr}`, {
    x: MARGIN,
    y,
    size: 11,
    font,
    color: COLOR_TEXT,
  });
  y -= 40;

  page.drawText('Signature :', {
    x: MARGIN,
    y,
    size: 10.5,
    font: fontBold,
    color: COLOR_TEXT,
  });
  y -= 56;
  page.drawLine({
    start: { x: MARGIN, y: y + 12 },
    end: { x: MARGIN + 220, y: y + 12 },
    thickness: 0.8,
    color: COLOR_MUTED,
  });
  page.drawText(signatureName, {
    x: MARGIN,
    y: y - 6,
    size: 10,
    font,
    color: COLOR_TEXT,
  });

  wrapText(LEGAL_FOOTER, 96).forEach((chunk, index) => {
    page.drawText(chunk, {
      x: MARGIN,
      y: 72 - index * 11,
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

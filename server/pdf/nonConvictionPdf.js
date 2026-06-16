import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import {
  formatAddress,
  formatDeclarantName,
  formatFiliationClause,
  normalizeDeclarationFields,
} from '../documents/declarationNonCondamnation/formatters.js';
import {
  LEGAL_RAPPEL_BOTTOM_Y,
  NON_CONVICTION_SIGNATURE_LABEL_OFFSET,
  NON_CONVICTION_SIGNATURE_LINE_Y,
} from './pdfLegalConstants.js';

const outputDir = path.resolve(process.cwd(), 'server', 'data', 'generated', 'declarations');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_TOP = 71;
const MARGIN_BOTTOM = 57;
const MARGIN_H = 71;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_H * 2;
const FOOTER_Y = 28;
const SIGNATURE_COL_WIDTH = 204;

const COLOR_TEXT = rgb(0, 0, 0);
const COLOR_MUTED = rgb(0.2, 0.2, 0.2);

const SIZE_OVERLINE = 11;
const SIZE_TITLE = 15.5;
const SIZE_BODY = 11.5;
const SIZE_LEGAL = 9.8;
const SIZE_FOOTER = 8.8;

const LINE_BODY = SIZE_BODY * 1.5;
const GAP_SECTION = 31;
const GAP_AFTER_HEADER = 48;
const GAP_AFTER_H2 = 11;
const GAP_PARAGRAPH = 10;
const GAP_BULLET = 8;

const INVALID_DISPLAY_VALUES = new Set([
  'undefined', 'null', 'nan', 'invalid date', '[object object]',
  'true', 'false', 'w', 'g', 'l', 'test', 'parent',
]);

const DECLARATION_INTRO = 'Déclare sur l’honneur, conformément à l’article A. 123-51 du Code de commerce, n’avoir fait l’objet d’aucune condamnation pénale ni d’aucune sanction civile ou administrative de nature à m’interdire :';
const BULLET_ITEMS = [
  'de gérer, administrer, diriger ou contrôler une personne morale ;',
  'ou d’exercer une activité commerciale.',
];
const LEGAL_INFO = 'Je reconnais avoir été informé que toute indication inexacte ou incomplète donnée de mauvaise foi dans le cadre d’une formalité au registre du commerce et des sociétés est susceptible d’entraîner les sanctions prévues par l’article L. 123-5 du Code de commerce.';
const LEGAL_REMINDER = 'Rappel légal. Le fait de donner, de mauvaise foi, des indications inexactes ou incomplètes en vue d’une formalité au registre du commerce et des sociétés est puni des sanctions prévues par l’article L. 123-5 du Code de commerce.';

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

const wrapText = (text, maxChars = 82) => {
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

const drawCentered = (page, font, y, text, size) => {
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

const drawLeftLines = (page, font, y, text, { size = SIZE_BODY, lineHeight = LINE_BODY, indent = 0 } = {}) => {
  wrapText(text).forEach((line) => {
    page.drawText(line, {
      x: MARGIN_H + indent,
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

const drawSectionHeading = (page, fontBold, y, title) => {
  page.drawText(title.toUpperCase(), {
    x: MARGIN_H,
    y,
    size: SIZE_BODY,
    font: fontBold,
    color: COLOR_TEXT,
  });
  return y - GAP_AFTER_H2;
};

const drawParagraphGap = (y) => y - GAP_PARAGRAPH;

const drawBulletList = (page, font, y, items) => {
  const bulletIndent = 25;
  items.forEach((item) => {
    page.drawText('•', {
      x: MARGIN_H + 6,
      y,
      size: SIZE_BODY,
      font,
      color: COLOR_TEXT,
    });
    y = drawLeftLines(page, font, y, item, { indent: bulletIndent });
    y -= GAP_BULLET;
  });
  return y;
};

export const generateNonConvictionPdf = async ({ filename, fields: rawFields = {} }) => {
  const fields = normalizeDeclarationFields(rawFields);
  const targetPath = path.join(outputDir, filename);
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

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
  const filiationClause = formatFiliationClause({ parent1, parent2 })
    || 'enfant de ______________________________ et de ______________________________';
  const statementCity = sanitizeDisplayValue(fields.statementCity, { fallback: '______________________', minLength: 2 });
  const signatureDateFr = sanitizeDisplayValue(formatFrenchDate(fields.statementDate), {
    fallback: '____ / ____ / ______',
    minLength: 4,
  });

  let y = PAGE_HEIGHT - MARGIN_TOP;

  y = drawCentered(page, fontBold, y, 'DÉCLARATION SUR L’HONNEUR', SIZE_OVERLINE);
  y -= SIZE_TITLE * 1.25 + 4;
  y = drawCentered(page, fontBold, y, 'DE NON-CONDAMNATION ET DE FILIATION', SIZE_TITLE);
  y -= GAP_AFTER_HEADER;

  y = drawSectionHeading(page, fontBold, y, 'Identité du déclarant');
  y = drawLeftLines(page, font, y, `Je soussigné, ${declarantLine},`);
  y = drawParagraphGap(y);
  y = drawLeftLines(page, font, y, `né le ${birthDateFr} à ${birthCity},`);
  y = drawParagraphGap(y);
  y = drawLeftLines(page, font, y, `demeurant ${fullAddress},`);
  y = drawParagraphGap(y);
  y = drawLeftLines(page, font, y, `${filiationClause}.`);
  y -= GAP_SECTION;

  y = drawSectionHeading(page, fontBold, y, 'Déclaration');
  y = drawLeftLines(page, font, y, DECLARATION_INTRO);
  y = drawParagraphGap(y);
  y = drawBulletList(page, font, y, BULLET_ITEMS);
  y -= GAP_SECTION;

  y = drawSectionHeading(page, fontBold, y, 'Information légale');
  y = drawLeftLines(page, font, y, LEGAL_INFO);
  y -= 40;

  const signatureColX = PAGE_WIDTH - MARGIN_H - SIGNATURE_COL_WIDTH;
  const lineY = NON_CONVICTION_SIGNATURE_LINE_Y;
  const faitY = lineY + NON_CONVICTION_SIGNATURE_LABEL_OFFSET;
  page.drawText(`Fait à ${statementCity}, le ${signatureDateFr}`, {
    x: MARGIN_H,
    y: faitY,
    size: SIZE_BODY,
    font,
    color: COLOR_TEXT,
  });
  page.drawText('Signature du déclarant :', {
    x: signatureColX,
    y: faitY,
    size: SIZE_BODY,
    font,
    color: COLOR_TEXT,
  });
  page.drawLine({
    start: { x: signatureColX, y: lineY },
    end: { x: signatureColX + SIGNATURE_COL_WIDTH, y: lineY },
    thickness: 0.7,
    color: COLOR_TEXT,
  });

  const rappelLines = wrapText(LEGAL_REMINDER);
  const rappelLineHeight = SIZE_LEGAL * 1.35;
  let rappelY = LEGAL_RAPPEL_BOTTOM_Y + (rappelLines.length - 1) * rappelLineHeight;
  rappelLines.forEach((line) => {
    page.drawText(line, {
      x: MARGIN_H,
      y: rappelY,
      size: SIZE_LEGAL,
      font,
      color: COLOR_TEXT,
      maxWidth: CONTENT_WIDTH,
    });
    rappelY += rappelLineHeight;
  });

  page.drawText('Déclaration de non-condamnation et de filiation', {
    x: MARGIN_H,
    y: FOOTER_Y,
    size: SIZE_FOOTER,
    font,
    color: COLOR_MUTED,
  });
  const pageLabel = 'Page 1 sur 1';
  page.drawText(pageLabel, {
    x: PAGE_WIDTH - MARGIN_H - font.widthOfTextAtSize(pageLabel, SIZE_FOOTER),
    y: FOOTER_Y,
    size: SIZE_FOOTER,
    font,
    color: COLOR_MUTED,
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

import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const outputDir = path.resolve(process.cwd(), 'server', 'data', 'generated', 'declarations');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

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
  if (Number.isNaN(date.getTime())) return raw;
  return `${date.getDate()} ${MONTHS_FR[date.getMonth()]} ${date.getFullYear()}`;
};

const formatDisplayDate = (value) => {
  if (!value) return '';
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [, , day, month, year] = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/) || [];
    return `${day}/${month}/${year}`;
  }
  return raw;
};

const splitFullName = (fields = {}) => {
  if (fields.declarantFirstName || fields.declarantLastName) {
    return {
      firstName: String(fields.declarantFirstName || '').trim(),
      lastName: String(fields.declarantLastName || '').trim().toUpperCase(),
    };
  }
  const full = String(fields.declarantFullName || '').trim();
  const parts = full.split(/\s+/);
  if (!parts.length) return { firstName: '', lastName: '' };
  return {
    firstName: parts.slice(0, -1).join(' ') || parts[0],
    lastName: (parts.length > 1 ? parts[parts.length - 1] : parts[0]).toUpperCase(),
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

const wrapText = (text, maxChars = 88) => {
  const words = String(text || '').split(/\s+/);
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

const addTextField = (form, page, name, value, rect, font) => {
  const field = form.createTextField(name);
  field.setText(String(value || ''));
  field.enableReadOnly();
  field.addToPage(page, rect);
  field.updateAppearances(font);
};

export const generateNonConvictionPdf = async ({ filename, fields = {}, documentId = '' }) => {
  const targetPath = path.join(outputDir, filename);
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const form = pdfDoc.getForm();

  const { firstName, lastName } = splitFullName(fields);
  const fullAddress = buildFullAddress(fields);
  const birthDateFr = formatFrenchDate(fields.declarantBirthDate);
  const signatureDateFr = formatFrenchDate(fields.statementDate);
  const father = fields.parent1FullName || fields.fatherFullName || '';
  const mother = fields.parent2FullName || fields.motherFullName || '';

  page.drawText('Greffio — Déclaration RCS / RNE', {
    x: 50, y: 790, size: 9, font, color: rgb(0.45, 0.45, 0.45),
  });
  if (documentId) {
    page.drawText(`Réf. ${documentId}`, {
      x: 420, y: 790, size: 8, font, color: rgb(0.55, 0.58, 0.62),
    });
  }

  page.drawText('DÉCLARATION DE NON-CONDAMNATION ET DE FILIATION', {
    x: 50, y: 755, size: 14, font: fontBold, color: rgb(0.08, 0.12, 0.2),
  });
  page.drawText('(formulaire administratif — zones remplissables)', {
    x: 50, y: 738, size: 9, font, color: rgb(0.35, 0.42, 0.52),
  });

  const bodyIntro = [
    `Je soussigné(e) ${firstName} ${lastName},`,
    `né(e) le ${birthDateFr || '…………'} à ${fields.declarantBirthCity || '…………'},`,
    `fils/fille de ${father || '…………'},`,
    `et de ${mother || '…………'},`,
    `demeurant ${fullAddress || '…………'},`,
    '',
    'déclare sur l’honneur, conformément aux dispositions applicables relatives à l’inscription au Registre du commerce et des sociétés (RCS) et au Registre national des entreprises (RNE), n’avoir jamais fait l’objet d’aucune condamnation pénale, ni d’aucune sanction civile ou administrative de nature à m’interdire de gérer, administrer, diriger ou contrôler une personne morale, ou d’exercer une activité commerciale.',
    '',
    `Fait à ${fields.statementCity || '…………'}, le ${signatureDateFr || '…………'}.`,
    '',
    'Signature :',
  ];

  let y = 710;
  bodyIntro.forEach((line) => {
    if (!line) {
      y -= 8;
      return;
    }
    const lines = wrapText(line, 90);
    lines.forEach((chunk) => {
      page.drawText(chunk, { x: 50, y, size: 10.5, font, color: rgb(0.1, 0.12, 0.16), maxWidth: 495 });
      y -= 14;
    });
  });

  page.drawRectangle({
    x: 50, y: 145, width: 240, height: 55,
    borderColor: rgb(0.65, 0.72, 0.82), borderWidth: 1,
  });
  page.drawText('Zone de signature électronique', {
    x: 58, y: 182, size: 8, font, color: rgb(0.4, 0.48, 0.58),
  });
  addTextField(form, page, 'signatureFullName', fields.signatureFullName || `${firstName} ${lastName}`.trim(), {
    x: 58, y: 152, width: 220, height: 22,
  }, font);

  const legal = 'Rappel : Article L. 123-5 du code de commerce. Le fait de donner, de mauvaise foi, des indications inexactes ou incomplètes en vue d’une immatriculation, d’une radiation ou d’une mention complémentaire ou rectificative au registre du commerce et des sociétés est puni d’une amende de 4 500 euros et d’un emprisonnement de six mois.';
  wrapText(legal, 95).forEach((chunk, index) => {
    page.drawText(chunk, {
      x: 50, y: 95 - index * 11, size: 8, font, color: rgb(0.45, 0.48, 0.52), maxWidth: 495,
    });
  });

  page.drawText('Référence simulateur officiel : service-public.gouv.fr — Déclaration de non-condamnation et de filiation', {
    x: 50, y: 42, size: 7, font, color: rgb(0.55, 0.58, 0.62),
  });

  addTextField(form, page, 'declarantFirstName', firstName, { x: 50, y: 30, width: 1, height: 1 }, font);
  addTextField(form, page, 'declarantLastName', lastName, { x: 52, y: 30, width: 1, height: 1 }, font);
  addTextField(form, page, 'declarantBirthDate', formatDisplayDate(fields.declarantBirthDate), { x: 54, y: 30, width: 1, height: 1 }, font);
  addTextField(form, page, 'declarantBirthCity', fields.declarantBirthCity, { x: 56, y: 30, width: 1, height: 1 }, font);
  addTextField(form, page, 'parent1FullName', father, { x: 58, y: 30, width: 1, height: 1 }, font);
  addTextField(form, page, 'parent2FullName', mother, { x: 60, y: 30, width: 1, height: 1 }, font);
  addTextField(form, page, 'declarantAddress', fullAddress, { x: 62, y: 30, width: 1, height: 1 }, font);
  addTextField(form, page, 'statementCity', fields.statementCity, { x: 64, y: 30, width: 1, height: 1 }, font);
  addTextField(form, page, 'statementDate', formatDisplayDate(fields.statementDate), { x: 66, y: 30, width: 1, height: 1 }, font);

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
  if (!fields.signatureFullName || !String(fields.signatureFullName).trim()) {
    return { ok: false, error: 'DOCUMENT_EDITOR_SIGNATURE_REQUIRED' };
  }
  if (fields.declarationNonCondamnation === false) {
    return { ok: false, error: 'DOCUMENT_EDITOR_NON_CONDAMNATION_REQUIRED' };
  }
  return { ok: true };
};

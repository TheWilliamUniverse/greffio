import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const outputDir = path.resolve(process.cwd(), 'server', 'data', 'generated', 'declarations');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const formatDisplayDate = (value) => {
  if (!value) return '';
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-');
    return `${day}/${month}/${year}`;
  }
  return raw;
};

const drawSectionTitle = (page, fontBold, text, x, y) => {
  page.drawText(text, { x, y, size: 11, font: fontBold, color: rgb(0.13, 0.25, 0.51) });
};

const addTextField = (form, page, name, value, rect, font) => {
  const field = form.createTextField(name);
  field.setText(String(value || ''));
  field.enableReadOnly();
  field.addToPage(page, rect);
  field.updateAppearances(font);
  return field;
};

const addCheckbox = (form, page, name, checked, rect) => {
  const field = form.createCheckBox(name);
  if (checked) field.check();
  else field.uncheck();
  field.enableReadOnly();
  field.addToPage(page, rect);
  return field;
};

export const generateNonConvictionPdf = async ({ filename, fields = {} }) => {
  const targetPath = path.join(outputDir, filename);
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const form = pdfDoc.getForm();

  const useCaseSelf = fields.useCase === 'self' || fields.useCase === 'both' || Boolean(fields.useCaseSelf);
  const useCaseParents = fields.useCase === 'parents' || fields.useCase === 'both' || Boolean(fields.useCaseParents);

  page.drawText('Greffio — William Establishments', {
    x: 50,
    y: 790,
    size: 9,
    font,
    color: rgb(0.45, 0.45, 0.45),
  });
  page.drawText('DECLARATION SUR L\'HONNEUR', {
    x: 50,
    y: 760,
    size: 16,
    font: fontBold,
    color: rgb(0.08, 0.12, 0.2),
  });
  page.drawText('Non-condamnation et filiation (formulaire remplissable)', {
    x: 50,
    y: 742,
    size: 10,
    font,
    color: rgb(0.25, 0.35, 0.5),
  });

  drawSectionTitle(page, fontBold, 'Cas d\'usage', 50, 715);
  addCheckbox(form, page, 'useCaseSelf', useCaseSelf, { x: 50, y: 695, width: 14, height: 14 });
  page.drawText('Pour moi (dirigeant / associé)', { x: 70, y: 697, size: 10, font });
  addCheckbox(form, page, 'useCaseParents', useCaseParents, { x: 280, y: 695, width: 14, height: 14 });
  page.drawText('Filiation (parents)', { x: 300, y: 697, size: 10, font });

  drawSectionTitle(page, fontBold, 'Identité du déclarant', 50, 665);
  page.drawText('Nom et prénom', { x: 50, y: 648, size: 8, font, color: rgb(0.35, 0.4, 0.48) });
  addTextField(form, page, 'declarantFullName', fields.declarantFullName, { x: 50, y: 624, width: 240, height: 20 }, font);
  page.drawText('Date de naissance', { x: 310, y: 648, size: 8, font, color: rgb(0.35, 0.4, 0.48) });
  addTextField(form, page, 'declarantBirthDate', formatDisplayDate(fields.declarantBirthDate), { x: 310, y: 624, width: 220, height: 20 }, font);
  page.drawText('Lieu de naissance', { x: 50, y: 598, size: 8, font, color: rgb(0.35, 0.4, 0.48) });
  addTextField(form, page, 'declarantBirthCity', fields.declarantBirthCity, { x: 50, y: 574, width: 240, height: 20 }, font);
  page.drawText('Adresse', { x: 310, y: 598, size: 8, font, color: rgb(0.35, 0.4, 0.48) });
  addTextField(form, page, 'declarantAddress', fields.declarantAddress, { x: 310, y: 574, width: 220, height: 20 }, font);

  drawSectionTitle(page, fontBold, 'Déclarations', 50, 540);
  addCheckbox(form, page, 'declarationNonCondamnation', Boolean(fields.declarationNonCondamnation), { x: 50, y: 520, width: 14, height: 14 });
  page.drawText('Je déclare sur l\'honneur ne faire l\'objet d\'aucune condamnation pénale', {
    x: 70,
    y: 522,
    size: 9,
    font,
    maxWidth: 470,
  });
  page.drawText('me privant du droit de diriger, gérer, administrer ou contrôler une personne morale.', {
    x: 70,
    y: 508,
    size: 9,
    font,
    maxWidth: 470,
  });

  addCheckbox(form, page, 'declarationFiliation', Boolean(fields.declarationFiliation), { x: 50, y: 482, width: 14, height: 14 });
  page.drawText('Je confirme les informations de filiation ci-dessous.', { x: 70, y: 484, size: 9, font });

  drawSectionTitle(page, fontBold, 'Filiation', 50, 455);
  page.drawText('Parent 1 (père ou titulaire parental)', { x: 50, y: 438, size: 8, font, color: rgb(0.35, 0.4, 0.48) });
  addTextField(form, page, 'parent1FullName', fields.parent1FullName, { x: 50, y: 414, width: 480, height: 20 }, font);
  page.drawText('Parent 2 (mère ou titulaire parental)', { x: 50, y: 388, size: 8, font, color: rgb(0.35, 0.4, 0.48) });
  addTextField(form, page, 'parent2FullName', fields.parent2FullName, { x: 50, y: 364, width: 480, height: 20 }, font);

  drawSectionTitle(page, fontBold, 'Signature', 50, 325);
  page.drawText('Fait à', { x: 50, y: 308, size: 8, font, color: rgb(0.35, 0.4, 0.48) });
  addTextField(form, page, 'statementCity', fields.statementCity, { x: 50, y: 284, width: 200, height: 20 }, font);
  page.drawText('Le', { x: 270, y: 308, size: 8, font, color: rgb(0.35, 0.4, 0.48) });
  addTextField(form, page, 'statementDate', formatDisplayDate(fields.statementDate), { x: 270, y: 284, width: 120, height: 20 }, font);
  page.drawText('Nom du signataire', { x: 50, y: 258, size: 8, font, color: rgb(0.35, 0.4, 0.48) });
  addTextField(form, page, 'signatureFullName', fields.signatureFullName, { x: 50, y: 234, width: 300, height: 20 }, font);

  page.drawRectangle({
    x: 50,
    y: 170,
    width: 220,
    height: 50,
    borderColor: rgb(0.7, 0.75, 0.82),
    borderWidth: 1,
  });
  page.drawText('Signature manuscrite', { x: 58, y: 205, size: 8, font, color: rgb(0.45, 0.5, 0.58) });

  page.drawText('Document généré via Greffio — greffio.willentreprises.com', {
    x: 50,
    y: 40,
    size: 8,
    font,
    color: rgb(0.55, 0.58, 0.62),
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(targetPath, pdfBytes);
  return targetPath;
};

export const validateNonConvictionFields = (fields = {}) => {
  const useCaseSelf = fields.useCase === 'self' || fields.useCase === 'both' || Boolean(fields.useCaseSelf);
  const useCaseParents = fields.useCase === 'parents' || fields.useCase === 'both' || Boolean(fields.useCaseParents);

  if (!useCaseSelf && !useCaseParents) {
    return { ok: false, error: 'DOCUMENT_EDITOR_USE_CASE_REQUIRED' };
  }
  if (!fields.signatureFullName || !String(fields.signatureFullName).trim()) {
    return { ok: false, error: 'DOCUMENT_EDITOR_SIGNATURE_REQUIRED' };
  }
  if (useCaseSelf) {
    if (!fields.declarantFullName || !fields.declarantBirthDate) {
      return { ok: false, error: 'DOCUMENT_EDITOR_IDENTITY_REQUIRED' };
    }
    if (!fields.declarationNonCondamnation) {
      return { ok: false, error: 'DOCUMENT_EDITOR_NON_CONDAMNATION_REQUIRED' };
    }
  }
  if (useCaseParents) {
    if (!fields.declarationFiliation) {
      return { ok: false, error: 'DOCUMENT_EDITOR_FILIATION_REQUIRED' };
    }
    if (!fields.parent1FullName || !fields.parent2FullName) {
      return { ok: false, error: 'DOCUMENT_EDITOR_PARENTS_REQUIRED' };
    }
  }
  return { ok: true };
};

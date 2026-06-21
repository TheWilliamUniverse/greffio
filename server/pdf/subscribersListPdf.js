import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { formatFrenchDate } from './nonConvictionPdf.js';
import {
  LEGAL_RAPPEL_BOTTOM_Y,
  SUBSCRIBERS_LIST_CONTENT_BOTTOM_Y,
  SUBSCRIBERS_LIST_SIGNATURE_HEADING_ABOVE_LINE,
  SUBSCRIBERS_LIST_SIGNATURE_CAPACITY_ABOVE_LINE,
  SUBSCRIBERS_LIST_SIGNATURE_FAIT_ABOVE_LINE,
  SUBSCRIBERS_LIST_SIGNATURE_LABEL_ABOVE_LINE,
  SUBSCRIBERS_LIST_SIGNATURE_LINE_Y,
  SUBSCRIBERS_LIST_SIGNATURE_NAME_ABOVE_LINE,
} from './pdfLegalConstants.js';

const outputDir = path.resolve(process.cwd(), 'server', 'data', 'generated', 'subscribers-list');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_TOP = 71;
const MARGIN_BOTTOM = 57;
const MARGIN_H = 71;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_H * 2;
const FOOTER_Y = 28;
const LABEL_COL_X = MARGIN_H + 248;

const COLOR_TEXT = rgb(0, 0, 0);
const COLOR_MUTED = rgb(0.2, 0.2, 0.2);

const SIZE_OVERLINE = 11;
const SIZE_TITLE = 14;
const SIZE_BODY = 11;
const SIZE_SMALL = 9.5;
const LINE_BODY = SIZE_BODY * 1.5;
const GAP_SECTION = 24;
const GAP_AFTER_H2 = 12;
const GAP_PARAGRAPH = 10;
const GAP_ROW = 13;

export { SUBSCRIBERS_LIST_SIGNATURE_LINE_Y } from './pdfLegalConstants.js';

const pdfSafe = (value) => String(value ?? '')
  .normalize('NFC')
  .replace(/\u202f/g, ' ')
  .replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, (char) => {
    const ascii = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return ascii || '?';
  });

const wrapText = (text, maxChars = 84) => {
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
  return lines.length ? lines : [''];
};

const drawCentered = (page, font, y, text, size) => {
  const safe = pdfSafe(text);
  const textWidth = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, {
    x: (PAGE_WIDTH - textWidth) / 2,
    y,
    size,
    font,
    color: COLOR_TEXT,
  });
  return y;
};

const drawSectionHeading = (page, fontBold, y, heading) => {
  page.drawText(pdfSafe(heading).toUpperCase(), {
    x: MARGIN_H,
    y,
    size: SIZE_BODY,
    font: fontBold,
    color: COLOR_TEXT,
  });
  return y - GAP_AFTER_H2;
};

const drawLeftLines = (page, font, y, text, { size = SIZE_BODY, lineHeight = LINE_BODY } = {}) => {
  wrapText(text).forEach((line) => {
    page.drawText(line, {
      x: MARGIN_H,
      y,
      size,
      font,
      color: COLOR_TEXT,
      maxWidth: CONTENT_WIDTH,
    });
    y -= lineHeight;
  });
  return y;
};

const securitiesCountLabel = (unit) => (
  unit.toLowerCase() === 'actions' ? "Nombre d'actions souscrites" : 'Nombre de parts sociales souscrites'
);

const securitiesTotalCountLabel = (unit) => (
  unit.toLowerCase() === 'actions' ? "Nombre total d'actions souscrites" : 'Nombre total de parts sociales souscrites'
);

const drawLabelValue = (page, font, fontBold, y, label, value, gapRow = GAP_ROW) => {
  const labelText = pdfSafe(label);
  const labelWidth = fontBold.widthOfTextAtSize(labelText, SIZE_BODY);
  const valueX = Math.max(LABEL_COL_X, MARGIN_H + labelWidth + 14);
  page.drawText(labelText, {
    x: MARGIN_H,
    y,
    size: SIZE_BODY,
    font: fontBold,
    color: COLOR_TEXT,
  });
  page.drawText(pdfSafe(value || '–'), {
    x: valueX,
    y,
    size: SIZE_BODY,
    font,
    color: COLOR_TEXT,
    maxWidth: CONTENT_WIDTH - (valueX - MARGIN_H),
  });
  return y - gapRow;
};

const getSubscriberRows = (subscriber, securitiesUnit) => (
  subscriber.isLegalEntity
    ? [
      ['Qualité', subscriber.qualityLabel || subscriber.roleTitle || 'Associé (personne morale)'],
      ['Dénomination sociale', subscriber.fullName || '–'],
      ['Forme juridique', subscriber.legalFormLabel || '–'],
      ['SIREN', subscriber.siren || '–'],
      ['Siège social', subscriber.address || '–'],
      ['Représentant légal', subscriber.legalRepresentativeName || '–'],
      ['Qualité du représentant', subscriber.legalRepresentativeQuality || '–'],
      [securitiesCountLabel(securitiesUnit), subscriber.titlesCount || '–'],
      ['Pourcentage du capital', subscriber.sharePercent || '–'],
      ['Apport en numéraire', subscriber.contributionCash || '0 €'],
      ['Apport en nature', subscriber.contributionInKind || 'Néant'],
      ['Montant libéré à la constitution', subscriber.liberationAmount || '0 €'],
      ['Observations', subscriber.observations || '–'],
    ]
    : [
      ['Qualité', subscriber.qualityLabel || subscriber.roleTitle || 'Associé'],
      ['Nom et prénom', subscriber.fullName || '–'],
      ['Date et lieu de naissance', subscriber.birthDatePlace || '–'],
      ['Nationalité', subscriber.nationality || 'Française'],
      ['Adresse', subscriber.address || '–'],
      [securitiesCountLabel(securitiesUnit), subscriber.titlesCount || '–'],
      ['Pourcentage du capital', subscriber.sharePercent || '–'],
      ['Apport en numéraire', subscriber.contributionCash || '0 €'],
      ['Apport en nature', subscriber.contributionInKind || 'Néant'],
      ['Montant libéré à la constitution', subscriber.liberationAmount || '0 €'],
      ['Observations', subscriber.observations || '–'],
    ]
);

const estimateSubscriberBlockHeight = (subscriber, securitiesUnit) => (
  GAP_AFTER_H2 + getSubscriberRows(subscriber, securitiesUnit).length * GAP_ROW + 8
);

const drawPinnedRappel = (targetPage, font, fontBold, text) => {
  const lines = wrapText(text);
  const headingHeight = SIZE_BODY + GAP_AFTER_H2;
  const bodyHeight = lines.length * LINE_BODY;
  let blockY = LEGAL_RAPPEL_BOTTOM_Y + bodyHeight + headingHeight;
  blockY = drawSectionHeading(targetPage, fontBold, blockY, 'Rappel');
  lines.forEach((line) => {
    targetPage.drawText(line, {
      x: MARGIN_H,
      y: blockY,
      size: SIZE_SMALL,
      font,
      color: COLOR_MUTED,
      maxWidth: CONTENT_WIDTH,
    });
    blockY -= LINE_BODY;
  });
};

const drawSignatureBlock = (page, font, fontBold, fields, dateFr) => {
  const lineY = SUBSCRIBERS_LIST_SIGNATURE_LINE_Y;
  const lineX = MARGIN_H;
  const city = pdfSafe(fields.statementCity || '______________________');
  const signatoryName = pdfSafe(fields.signatureFullName || fields.presidentName || 'Le signataire');
  const signatoryCapacity = pdfSafe(fields.presidentSignatureLabel || fields.signatoryTitle || 'Président désigné');
  const blockHeading = pdfSafe(fields.signatureBlockHeading || 'SIGNATURE DU PRÉSIDENT DÉSIGNÉ');

  page.drawText(blockHeading, {
    x: MARGIN_H,
    y: lineY + SUBSCRIBERS_LIST_SIGNATURE_HEADING_ABOVE_LINE,
    size: SIZE_BODY,
    font: fontBold,
    color: COLOR_TEXT,
  });
  page.drawText(pdfSafe(`Fait à ${city}, le ${dateFr}.`), {
    x: MARGIN_H,
    y: lineY + SUBSCRIBERS_LIST_SIGNATURE_FAIT_ABOVE_LINE,
    size: SIZE_BODY,
    font,
    color: COLOR_TEXT,
  });

  if (fields.signatureIsLegalEntity) {
    const signatureLines = Array.isArray(fields.signatureLines) && fields.signatureLines.length
      ? fields.signatureLines
      : [
        `Pour ${fields.signatureCompanyName || fields.companyName || 'la personne morale'}`,
        fields.signatureRepresentativeName ? `Représentée par ${fields.signatureRepresentativeName}` : 'Représentée par [représentant légal]',
        `Qualité : ${fields.signatureRepresentativeQuality || 'à compléter'}`,
      ];
    let entityY = lineY + SUBSCRIBERS_LIST_SIGNATURE_NAME_ABOVE_LINE;
    signatureLines.forEach((line) => {
      page.drawText(pdfSafe(line), { x: MARGIN_H, y: entityY, size: SIZE_BODY, font, color: COLOR_TEXT });
      entityY -= LINE_BODY;
    });
  } else {
    page.drawText(signatoryName, {
      x: MARGIN_H,
      y: lineY + SUBSCRIBERS_LIST_SIGNATURE_NAME_ABOVE_LINE,
      size: SIZE_BODY,
      font: fontBold,
      color: COLOR_TEXT,
    });
    page.drawText(signatoryCapacity, {
      x: MARGIN_H,
      y: lineY + SUBSCRIBERS_LIST_SIGNATURE_CAPACITY_ABOVE_LINE,
      size: SIZE_BODY,
      font,
      color: COLOR_TEXT,
    });
  }

  page.drawText('Signature :', {
    x: MARGIN_H,
    y: lineY + SUBSCRIBERS_LIST_SIGNATURE_LABEL_ABOVE_LINE,
    size: SIZE_BODY,
    font,
    color: COLOR_TEXT,
  });
  page.drawLine({
    start: { x: lineX, y: lineY },
    end: { x: lineX + 220, y: lineY },
    thickness: 0.7,
    color: COLOR_TEXT,
  });
};

export const generateSubscribersListPdf = async ({ filename, fields = {} }) => {
  const targetPath = path.join(outputDir, filename);
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const securitiesUnit = String(fields.securitiesUnit || 'Actions');
  const subscribers = Array.isArray(fields.subscribers) ? fields.subscribers : [];
  const singleSubscriber = Boolean(fields.singleSubscriber) || subscribers.length <= 1;
  const recap = fields.recap || {};
  const dateFr = formatFrenchDate(fields.statementDate) || '____ / ____ / ______';
  const signatureReservedTop = SUBSCRIBERS_LIST_SIGNATURE_LINE_Y
    + SUBSCRIBERS_LIST_SIGNATURE_HEADING_ABOVE_LINE
    + 16;
  const gapSection = singleSubscriber ? 28 : GAP_SECTION;
  const gapRow = singleSubscriber ? 16 : GAP_ROW;
  const gapParagraph = singleSubscriber ? 14 : GAP_PARAGRAPH;

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let pageNumber = 1;
  let y = PAGE_HEIGHT - MARGIN_TOP;

  const drawFooter = (targetPage, num, total) => {
    const label = `Liste des souscripteurs – Page ${num} sur ${total}`;
    targetPage.drawText(label, {
      x: MARGIN_H,
      y: FOOTER_Y,
      size: 8.5,
      font,
      color: COLOR_MUTED,
    });
  };

  const startNewPage = () => {
    pageNumber += 1;
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN_TOP;
  };

  const getContentFloor = ({ signatureZone = false } = {}) => {
    if (signatureZone) return signatureReservedTop;
    if (singleSubscriber && pageNumber === 1) return MARGIN_BOTTOM + 16;
    return SUBSCRIBERS_LIST_CONTENT_BOTTOM_Y;
  };

  const ensureSpace = (needed, options = {}) => {
    const floorY = getContentFloor(options);
    if (y - needed < floorY) startNewPage();
  };

  y = drawCentered(page, fontBold, y, 'LISTE DES SOUSCRIPTEURS', SIZE_TITLE);
  y -= SIZE_TITLE * 0.9;
  y = drawCentered(page, font, y, String(fields.legalFormHeader || 'Société en formation'), SIZE_OVERLINE);
  y -= gapSection;

  ensureSpace(120);
  y = drawSectionHeading(page, fontBold, y, 'Société concernée');
  [
    ['Dénomination sociale', fields.companyName],
    ['Forme juridique', fields.companyLegalFormLabel || fields.legalFormHeader],
    ['Capital social', fields.companyCapital],
    ['Siège social', fields.companyRegisteredOffice],
    ['Statut', fields.companyFormationStatus || 'Société en cours de constitution'],
    [fields.officerDesignationLabel || 'Président désigné', fields.presidentDesignated || fields.signatureFullName],
  ].forEach(([label, value]) => {
    ensureSpace(gapRow + 4);
    y = drawLabelValue(page, font, fontBold, y, label, value, gapRow);
  });
  y -= singleSubscriber ? 10 : 6;

  ensureSpace(estimateBlockHeight(fields.introParagraph));
  y = drawLeftLines(page, font, y, fields.introParagraph || 'Le présent état récapitule les souscriptions effectuées dans le cadre de la constitution de la société désignée ci-dessus.');
  y -= gapParagraph;

  subscribers.forEach((subscriber, index) => {
    const heading = singleSubscriber
      ? 'Souscripteur unique'
      : `Souscripteur ${index + 1}`;
    ensureSpace(estimateSubscriberBlockHeight(subscriber, securitiesUnit) + 10);
    y = drawSectionHeading(page, fontBold, y, heading);
    getSubscriberRows(subscriber, securitiesUnit).forEach(([label, value]) => {
      ensureSpace(gapRow + 4);
      y = drawLabelValue(page, font, fontBold, y, label, value, gapRow);
    });
    y -= singleSubscriber ? 12 : 8;
  });

  if (singleSubscriber) {
    startNewPage();
  }

  ensureSpace(90);
  y = drawSectionHeading(page, fontBold, y, 'Récapitulatif des souscriptions');
  [
    [securitiesTotalCountLabel(securitiesUnit), recap.totalShares || '0'],
    ['Montant total des apports en numéraire', recap.totalCash || '0 €'],
    ['Montant total des apports en nature', recap.totalInKind || 'Néant'],
    ['Montant total libéré à la constitution', recap.totalLiberated || '0 €'],
    ['Pourcentage du capital souscrit', recap.totalPercent || '100 %'],
  ].forEach(([label, value]) => {
    ensureSpace(gapRow + 4);
    y = drawLabelValue(page, font, fontBold, y, label, value, gapRow);
  });
  y -= singleSubscriber ? 10 : 6;

  ensureSpace(60, { signatureZone: true });
  y = drawSectionHeading(page, fontBold, y, 'Certification');
  wrapText(fields.certificationParagraph || '').forEach((line) => {
    ensureSpace(LINE_BODY, { signatureZone: true });
    page.drawText(line, { x: MARGIN_H, y, size: SIZE_BODY, font, color: COLOR_TEXT, maxWidth: CONTENT_WIDTH });
    y -= LINE_BODY;
  });
  y -= gapParagraph;

  ensureSpace(40, { signatureZone: true });
  y = drawSectionHeading(page, fontBold, y, 'Dépôt des fonds');
  wrapText(fields.depositParagraph || '').forEach((line) => {
    ensureSpace(LINE_BODY, { signatureZone: true });
    page.drawText(line, { x: MARGIN_H, y, size: SIZE_BODY, font, color: COLOR_TEXT, maxWidth: CONTENT_WIDTH });
    y -= LINE_BODY;
  });

  if (!singleSubscriber) {
    const signatureBlockHeight = SUBSCRIBERS_LIST_SIGNATURE_HEADING_ABOVE_LINE + 24;
    if (y < signatureReservedTop + signatureBlockHeight) {
      startNewPage();
    }
  }

  drawSignatureBlock(page, font, fontBold, fields, dateFr);
  drawPinnedRappel(
    page,
    font,
    fontBold,
    fields.signatureReminder || "Le président désigné est tenu de conserver les justificatifs des apports et de leur libération pendant la durée légale.",
  );

  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  pages.forEach((targetPage, index) => {
    drawFooter(targetPage, index + 1, totalPages);
  });

  fs.writeFileSync(targetPath, await pdfDoc.save());
  return targetPath;
};

const estimateBlockHeight = (text) => wrapText(text).length * LINE_BODY + GAP_PARAGRAPH;

export { validateSubscribersListFields } from '../documents/subscribersList/buildFields.js';

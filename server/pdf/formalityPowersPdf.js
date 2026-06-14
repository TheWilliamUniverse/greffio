import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb } from 'pdf-lib';
import { formatFrenchDate } from './nonConvictionPdf.js';
import { buildDocumentVerifyUrl } from '../services/documentIntegrityService.js';
import {
  CONTENT_WIDTH,
  COLOR_MUTED,
  COLOR_TEXT,
  drawHeaderBand,
  drawLabelValue,
  drawPageFooter,
  drawVerificationBlock,
  drawWrappedBlock,
  embedQrCode,
  loadStandardFonts,
  MARGIN_PT,
  mmFromTopToY,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  pdfSafe,
  SIZE_BODY,
  LINE_BODY,
  wrapTextByWidth,
} from './pdfLayoutPremium.js';

const outputDir = path.resolve(process.cwd(), 'server', 'data', 'generated', 'formality-powers');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

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

export const generateFormalityPowersPdf = async ({
  filename,
  fields = {},
  documentId = null,
  verifyToken = null,
  appUrl = null,
}) => {
  const targetPath = path.join(outputDir, filename);
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const { font, fontBold, fontItalic } = await loadStandardFonts(pdfDoc);

  const companyName = pdfSafe(fields.companyName || '–');
  const legalFormCode = String(fields.legalForm || 'SAS').trim().toUpperCase();
  const legalFormLabel = resolveLegalFormLabel(legalFormCode);
  const greffe = pdfSafe(fields.greffe || '–');
  const mandataire = pdfSafe(fields.mandataire || 'WILLIAM ESTABLISHMENTS / Greffio');
  const city = pdfSafe(fields.statementCity || '______________________');
  const dateFr = formatFrenchDate(fields.statementDate) || '____ / ____ / ______';
  const signatoryName = pdfSafe(fields.signatoryName || fields.signatureFullName || 'Le signataire');
  const signatoryTitle = pdfSafe(fields.signatoryTitle || 'Le Président');
  const verifyUrl = buildDocumentVerifyUrl({ appUrl, documentId, verifyToken });
  const qrImage = await embedQrCode(pdfDoc, verifyUrl);

  const title = pdfSafe(fields.title || 'POUVOIRS POUR FORMALITÉS');

  drawHeaderBand({
    page,
    font,
    fontBold,
    title,
    subtitle: 'Annexe 3 – Pouvoirs pour formalités',
    reference: fields.dossierReference ? pdfSafe(fields.dossierReference) : null,
  });

  let y = mmFromTopToY(38);
  y = drawLabelValue({
    page,
    label: 'Société concernée : ',
    value: companyName,
    y,
    font,
    fontBold,
  });
  y -= 2;
  const formLines = wrapTextByWidth(legalFormLabel, fontItalic, SIZE_BODY - 0.5, CONTENT_WIDTH - 12);
  formLines.forEach((line, index) => {
    page.drawText(pdfSafe(line), {
      x: MARGIN_PT + 12,
      y: y - (index * (LINE_BODY - 1)),
      size: SIZE_BODY - 0.5,
      font: fontItalic,
      color: COLOR_MUTED,
      maxWidth: CONTENT_WIDTH - 12,
    });
  });
  y -= (formLines.length * (LINE_BODY - 1)) + 4;

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
  const introLines = wrapTextByWidth(introLead, font, SIZE_BODY, CONTENT_WIDTH);
  y = drawWrappedBlock({
    page,
    lines: introLines,
    x: MARGIN_PT,
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
      'corriger, compléter ou régulariser le dossier dans l\'intérêt de la Société.',
    ];

  bullets.forEach((bullet) => {
    const lines = wrapTextByWidth(bullet, font, SIZE_BODY, CONTENT_WIDTH - 18);
    page.drawText('-', { x: MARGIN_PT + 2, y, size: SIZE_BODY, font, color: COLOR_TEXT });
    lines.forEach((line, lineIndex) => {
      page.drawText(pdfSafe(line), {
        x: MARGIN_PT + 14,
        y: y - (lineIndex * LINE_BODY),
        size: SIZE_BODY,
        font,
        color: COLOR_TEXT,
        maxWidth: CONTENT_WIDTH - 18,
      });
    });
    y -= Math.max(lines.length * LINE_BODY, LINE_BODY) + 3;
  });

  y = Math.min(y, mmFromTopToY(188));
  page.drawText(`Fait à ${city}, le ${pdfSafe(dateFr)}.`, {
    x: MARGIN_PT,
    y,
    size: SIZE_BODY,
    font,
    color: COLOR_TEXT,
    maxWidth: CONTENT_WIDTH,
  });

  y -= LINE_BODY + 6;
  const signNameLines = wrapTextByWidth(`${signatoryName},`, font, SIZE_BODY, CONTENT_WIDTH);
  y = drawWrappedBlock({
    page,
    lines: signNameLines,
    x: MARGIN_PT,
    yStart: y,
    font,
  });
  y -= 2;
  page.drawText(signatoryTitle, {
    x: MARGIN_PT,
    y,
    size: SIZE_BODY,
    font: fontBold,
    color: COLOR_TEXT,
    maxWidth: CONTENT_WIDTH,
  });

  y -= LINE_BODY + 8;
  page.drawText('Signature :', {
    x: MARGIN_PT,
    y,
    size: SIZE_BODY,
    font,
    color: COLOR_TEXT,
  });
  const lineY = y - 18;
  page.drawLine({
    start: { x: MARGIN_PT + 58, y: lineY },
    end: { x: MARGIN_PT + 58 + 200, y: lineY },
    thickness: 0.6,
    color: COLOR_MUTED,
  });

  if (documentId || verifyUrl) {
    drawVerificationBlock({
      page,
      pdfDoc,
      qrImage,
      verifyUrl,
      proofId: documentId,
      font,
      fontBold,
      yBottom: MARGIN_PT + 18,
    });
  }

  drawPageFooter({
    page,
    font,
    pageNumber: 1,
    pageTotal: 1,
    leftText: 'Greffio · Pouvoirs pour formalités · Annexe 3',
  });

  fs.writeFileSync(targetPath, await pdfDoc.save());
  return targetPath;
};

export { validateFormalityPowersFields } from '../documents/formalityPowers/buildFields.js';

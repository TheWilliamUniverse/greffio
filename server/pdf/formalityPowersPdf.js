import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { formatFrenchDate } from './nonConvictionPdf.js';
import { buildDocumentVerifyUrl } from '../services/documentIntegrityService.js';
import {
  CONTENT_WIDTH,
  COLOR_MUTED,
  COLOR_TEXT,
  applyDraftWatermarkToAllPages,
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
  isDraft = true,
}) => {
  const targetPath = path.join(outputDir, filename);
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const { font, fontBold, fontItalic } = await loadStandardFonts(pdfDoc);

  const companyName = pdfSafe(fields.companyName || '–');
  const legalFormCode = String(fields.legalForm || 'SAS').trim().toUpperCase();
  const legalFormLabel = resolveLegalFormLabel(legalFormCode);
  const greffe = pdfSafe(fields.greffe || '–');
  const mandataire = pdfSafe(fields.mandataire || 'WILLIAM ESTABLISHMENTS');
  const city = pdfSafe(fields.statementCity || '______________________');
  const dateFr = formatFrenchDate(fields.statementDate) || '____ / ____ / ______';
  const signatoryName = pdfSafe(fields.signatoryName || fields.signatureFullName || 'Le signataire');
  const signatoryTitle = pdfSafe(fields.signatoryTitle || fields.signatoryCapacity || 'Personne habilitée');
  const clientFullName = pdfSafe(fields.clientFullName || signatoryName);
  const clientBirthDate = pdfSafe(formatFrenchDate(fields.clientBirthDate) || fields.clientBirthDate || '____ / ____ / ______');
  const clientBirthPlace = pdfSafe(fields.clientBirthPlace || '______________________');
  const clientAddress = pdfSafe(fields.clientAddress || 'Adresse complète à compléter');
  const registeredOffice = pdfSafe(fields.companyRegisteredOffice || fields.registeredOffice || 'siège social à compléter');
  const companyIdentifier = pdfSafe(fields.companySirenOrSiret || fields.companySiren || 'non renseigné');
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
    label: 'Mandant : ',
    value: `${clientFullName}, né(e) le ${clientBirthDate} à ${clientBirthPlace}, demeurant ${clientAddress}`,
    y,
    font,
    fontBold,
  });
  y -= 4;
  y = drawLabelValue({
    page,
    label: 'Société concernée : ',
    value: `${companyName}, ${legalFormLabel}, siège social : ${registeredOffice}, SIREN/SIRET : ${companyIdentifier}`,
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

  drawPageFooter({
    page,
    font,
    pageNumber: 1,
    pageTotal: 2,
    leftText: 'Greffio · Pouvoirs pour formalités et procuration',
  });

  const signaturePage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHeaderBand({
    page: signaturePage,
    font,
    fontBold,
    title,
    subtitle: 'Pouvoirs pour formalités et procuration du client',
    reference: fields.dossierReference ? pdfSafe(fields.dossierReference) : null,
  });
  let y2 = mmFromTopToY(40);
  const drawSection = (heading, paragraphs) => {
    signaturePage.drawText(pdfSafe(heading.toUpperCase()), {
      x: MARGIN_PT,
      y: y2,
      size: SIZE_BODY,
      font: fontBold,
      color: COLOR_TEXT,
    });
    y2 -= LINE_BODY + 4;
    paragraphs.forEach((paragraph) => {
      const lines = wrapTextByWidth(paragraph, font, SIZE_BODY, CONTENT_WIDTH);
      lines.forEach((line) => {
        signaturePage.drawText(pdfSafe(line), {
          x: MARGIN_PT,
          y: y2,
          size: SIZE_BODY,
          font,
          color: COLOR_TEXT,
          maxWidth: CONTENT_WIDTH,
        });
        y2 -= LINE_BODY;
      });
      y2 -= 8;
    });
    y2 -= 6;
  };

  drawSection('Exclusion des annonces légales', [
    `La présente procuration n'autorise pas ${mandataire} à publier, commander, valider, modifier, renouveler, payer ou faire publier une annonce légale au nom et pour le compte du Mandant.`,
    'Toute intervention relative à une annonce légale devra faire l’objet d’un mandat écrit distinct, exprès et spécifique, ou être accomplie directement par le Mandant ou par le professionnel qu’il aura choisi.',
    'Aucune mention du présent document ne doit être interprétée comme conférant au Mandataire un pouvoir général de publicité légale.',
  ]);
  drawSection('Déclarations, limites et responsabilité du mandant', [
    'Le Mandant déclare que les informations, documents, justificatifs, décisions, autorisations et pièces transmis au Mandataire sont exacts, complets, sincères et à jour.',
    'La présente procuration est limitée aux actes strictement nécessaires ou utiles à l’accomplissement des formalités confiées. Elle ne permet pas au Mandataire d’ouvrir un compte bancaire, de contracter un emprunt, de céder des titres sociaux, de prendre une décision sociale relevant des associés ou dirigeants, ni d’engager la société dans une opération étrangère au dossier de formalités.',
    'La présente procuration prend effet à compter de sa signature et demeure valable jusqu’à l’accomplissement complet de la formalité confiée, sauf révocation écrite.',
  ]);

  y2 = Math.min(y2, mmFromTopToY(200));
  signaturePage.drawText(`Fait à ${city}, le ${pdfSafe(dateFr)}.`, {
    x: MARGIN_PT,
    y: y2,
    size: SIZE_BODY,
    font,
    color: COLOR_TEXT,
    maxWidth: CONTENT_WIDTH,
  });

  y2 -= LINE_BODY + 6;
  const signNameLines = wrapTextByWidth(`${signatoryName},`, font, SIZE_BODY, CONTENT_WIDTH);
  y2 = drawWrappedBlock({
    page: signaturePage,
    lines: signNameLines,
    x: MARGIN_PT,
    yStart: y2,
    font,
  });
  y2 -= 2;
  signaturePage.drawText(signatoryTitle, {
    x: MARGIN_PT,
    y: y2,
    size: SIZE_BODY,
    font: fontBold,
    color: COLOR_TEXT,
    maxWidth: CONTENT_WIDTH,
  });

  y2 -= LINE_BODY + 8;
  signaturePage.drawText('Signature du Mandant :', {
    x: MARGIN_PT,
    y: y2,
    size: SIZE_BODY,
    font,
    color: COLOR_TEXT,
  });
  const lineY = y2 - 18;
  signaturePage.drawLine({
    start: { x: MARGIN_PT + 58, y: lineY },
    end: { x: MARGIN_PT + 58 + 200, y: lineY },
    thickness: 0.6,
    color: COLOR_MUTED,
  });

  if (documentId || verifyUrl) {
    drawVerificationBlock({
      page: signaturePage,
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
    page: signaturePage,
    font,
    pageNumber: 2,
    pageTotal: 2,
    leftText: 'Greffio · Pouvoirs pour formalités et procuration',
  });

  if (isDraft) {
    applyDraftWatermarkToAllPages(pdfDoc, { font, fontBold });
  }

  fs.writeFileSync(targetPath, await pdfDoc.save());
  return targetPath;
};

export { validateFormalityPowersFields } from '../documents/formalityPowers/buildFields.js';

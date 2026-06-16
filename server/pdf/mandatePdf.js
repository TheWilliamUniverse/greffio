import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb } from 'pdf-lib';
import { resolveFormalityPublicLabel } from '../domain/formalityLabels.js';
import { buildDocumentVerifyUrl } from '../services/documentIntegrityService.js';
import { MANDATE_SIGNATURE_LINE_Y } from './pdfLegalConstants.js';
import {
  CONTENT_WIDTH,
  COLOR_MUTED,
  COLOR_TEXT,
  drawCard,
  drawHeaderBand,
  drawPageFooter,
  drawVerificationBlock,
  drawWrappedBlock,
  embedQrCode,
  formatFrenchDateTime,
  loadStandardFonts,
  MARGIN_PT,
  mmFromTopToY,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  pdfSafe,
  SIZE_BODY,
  SIZE_SMALL,
  wrapTextByWidth,
  LINE_BODY,
} from './pdfLayoutPremium.js';

const mandateDir = path.resolve(process.cwd(), 'server', 'data', 'generated', 'mandates');
if (!fs.existsSync(mandateDir)) {
  fs.mkdirSync(mandateDir, { recursive: true });
}

const LEGAL_FORM_LABELS = {
  SAS: 'SAS',
  SASU: 'SASU',
  SARL: 'SARL',
  EURL: 'EURL',
  SA: 'SA',
  SCI: 'SCI',
};

const resolveLegalFormLabel = (code) => {
  const key = String(code || '').trim().toUpperCase();
  return LEGAL_FORM_LABELS[key] || key || 'À préciser';
};

const generateMandatePdf = async ({
  filename,
  dossier = {},
  signerFullName = '',
  signedAtIso = null,
  evidence = {},
  appUrl = null,
}) => {
  const targetPath = path.join(mandateDir, filename);
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const { font, fontBold, fontItalic } = await loadStandardFonts(pdfDoc);

  const reference = pdfSafe(dossier.reference || dossier.id || 'N/A');
  const company = pdfSafe(dossier.companyName || dossier.denomination || 'Société en formation');
  const formalityLabel = pdfSafe(resolveFormalityPublicLabel({
    service: dossier.service,
    typeFormalite: dossier.typeFormalite,
    formeJuridique: dossier.formeJuridique || dossier.legalForm,
    legalForm: dossier.legalForm,
  }));
  const legalForm = resolveLegalFormLabel(dossier.legalForm || dossier.formeJuridique);
  const signer = pdfSafe(signerFullName);
  const signedAtFr = formatFrenchDateTime(signedAtIso || evidence?.signedAt);
  const documentHash = evidence?.documentHash || '';
  const verifyUrl = buildDocumentVerifyUrl({
    appUrl,
    documentId: evidence?.documentId,
    verifyToken: evidence?.verifyToken,
  });
  const qrImage = await embedQrCode(pdfDoc, verifyUrl);

  drawHeaderBand({
    page,
    font,
    fontBold,
    title: 'PROCURATION / MANDAT GREFFIO',
    subtitle: 'Mandat d\'accompagnement aux formalités d\'entreprise',
    reference,
  });

  const cardWidth = (CONTENT_WIDTH - 12) / 2;
  const cardTop = mmFromTopToY(38);
  const cardHeight = 52;
  drawCard({
    page,
    x: MARGIN_PT,
    yTop: cardTop,
    width: cardWidth,
    height: cardHeight,
    title: 'MANDANT',
    lines: [{ label: 'Nom : ', value: signer }],
    font,
    fontBold,
  });
  drawCard({
    page,
    x: MARGIN_PT + cardWidth + 12,
    yTop: cardTop,
    width: cardWidth,
    height: cardHeight,
    title: 'MANDATAIRE',
    lines: [
      { label: '', value: 'WILLIAM ESTABLISHMENTS' },
      { label: 'SIREN : ', value: '102 230 414' },
    ],
    font,
    fontBold,
  });

  let y = mmFromTopToY(98);
  page.drawText('OBJET DU MANDAT', {
    x: MARGIN_PT,
    y,
    size: SIZE_SMALL,
    font: fontBold,
    color: COLOR_TEXT,
  });
  y -= LINE_BODY;
  const objetLines = wrapTextByWidth(
    'Le Mandant autorise Greffio à préparer, déposer, suivre et, si nécessaire, régulariser la formalité d\'entreprise concernée.',
    font,
    SIZE_BODY,
    CONTENT_WIDTH,
  );
  y = drawWrappedBlock({ page, lines: objetLines, x: MARGIN_PT, yStart: y, font });
  y -= 10;

  page.drawText('FORMALITÉ', {
    x: MARGIN_PT,
    y,
    size: SIZE_SMALL,
    font: fontBold,
    color: COLOR_TEXT,
  });
  y -= LINE_BODY;
  const tableTop = y;
  page.drawRectangle({
    x: MARGIN_PT,
    y: tableTop - 52,
    width: CONTENT_WIDTH,
    height: 52,
    borderColor: rgb(0.82, 0.87, 0.93),
    borderWidth: 0.75,
  });
  const rows = [
    { label: 'Entreprise : ', value: company },
    { label: 'Type : ', value: formalityLabel },
    { label: 'Forme juridique : ', value: legalForm },
  ];
  let rowY = tableTop - 14;
  rows.forEach(({ label, value }) => {
    const labelW = fontBold.widthOfTextAtSize(pdfSafe(label), SIZE_BODY);
    page.drawText(pdfSafe(label), { x: MARGIN_PT + 10, y: rowY, size: SIZE_BODY, font: fontBold, color: COLOR_MUTED });
    const valueLines = wrapTextByWidth(value, font, SIZE_BODY, CONTENT_WIDTH - labelW - 24);
    valueLines.forEach((line, index) => {
      page.drawText(pdfSafe(line), {
        x: MARGIN_PT + 10 + (index === 0 ? labelW : 0),
        y: rowY - (index * LINE_BODY),
        size: SIZE_BODY,
        font,
        color: COLOR_TEXT,
      });
    });
    rowY -= Math.max(valueLines.length * LINE_BODY, LINE_BODY) + 2;
  });
  y = tableTop - 62;

  page.drawText('LIMITES', {
    x: MARGIN_PT,
    y,
    size: SIZE_SMALL,
    font: fontBold,
    color: COLOR_TEXT,
  });
  y -= LINE_BODY;
  const limitesLines = wrapTextByWidth(
    'Greffio intervient en accompagnement administratif et technique. Greffio ne se substitue pas à un avocat, notaire ou expert-comptable.',
    fontItalic,
    SIZE_BODY,
    CONTENT_WIDTH,
  );
  y = drawWrappedBlock({ page, lines: limitesLines, x: MARGIN_PT, yStart: y, font: fontItalic, color: COLOR_MUTED });
  y -= 10;

  page.drawText('CONSENTEMENT', {
    x: MARGIN_PT,
    y,
    size: SIZE_SMALL,
    font: fontBold,
    color: COLOR_TEXT,
  });
  y -= LINE_BODY;
  const consentLines = wrapTextByWidth(
    'Je reconnais avoir lu et compris la procuration ci-dessus. J\'autorise WILLIAM ESTABLISHMENTS, opérant sous le nom Greffio, à préparer, déposer, suivre et, si nécessaire, régulariser mon dossier de formalité d\'entreprise auprès du Guichet unique, du greffe compétent et des organismes concernés, sur la base des informations et documents que je fournis.',
    font,
    SIZE_BODY,
    CONTENT_WIDTH,
  );
  y = drawWrappedBlock({ page, lines: consentLines, x: MARGIN_PT, yStart: y, font });
  y -= 14;

  page.drawText('SIGNATURE', {
    x: MARGIN_PT,
    y,
    size: SIZE_SMALL,
    font: fontBold,
    color: COLOR_TEXT,
  });
  y -= LINE_BODY;
  page.drawText(`Signataire : ${signer}`, {
    x: MARGIN_PT,
    y,
    size: SIZE_BODY,
    font,
    color: COLOR_TEXT,
  });
  y -= LINE_BODY;
  if (signedAtFr) {
    page.drawText(`Date de signature : ${signedAtFr}`, {
      x: MARGIN_PT,
      y,
      size: SIZE_BODY,
      font,
      color: COLOR_TEXT,
    });
    y -= LINE_BODY;
  }

  page.drawLine({
    start: { x: MARGIN_PT, y: MANDATE_SIGNATURE_LINE_Y },
    end: { x: MARGIN_PT + 220, y: MANDATE_SIGNATURE_LINE_Y },
    thickness: 0.7,
    color: COLOR_TEXT,
  });

  if (evidence?.documentHash || signedAtFr) {
    y = Math.min(y, MANDATE_SIGNATURE_LINE_Y - 24);
    y -= 6;
    page.drawText('Preuve de signature', {
      x: MARGIN_PT,
      y,
      size: SIZE_SMALL,
      font: fontBold,
      color: COLOR_TEXT,
    });
    y -= LINE_BODY;
    page.drawText(`Signé électroniquement par ${signer} le ${signedAtFr}`, {
      x: MARGIN_PT,
      y,
      size: SIZE_BODY,
      font,
      color: COLOR_TEXT,
      maxWidth: CONTENT_WIDTH,
    });
    y -= LINE_BODY + 4;
    if (evidence.documentHash) {
      page.drawText(`Hash : ${pdfSafe(evidence.documentHash)}`, {
        x: MARGIN_PT,
        y,
        size: 7,
        font,
        color: COLOR_MUTED,
        maxWidth: CONTENT_WIDTH,
      });
      y -= 10;
    }
    if (evidence.ipAddress) {
      page.drawText(`IP : ${pdfSafe(evidence.ipAddress)}`, { x: MARGIN_PT, y, size: 7, font, color: COLOR_MUTED });
      y -= 10;
    }
    page.drawText('Signature électronique simple (SES) – Greffio', {
      x: MARGIN_PT,
      y,
      size: 7,
      font: fontItalic,
      color: COLOR_MUTED,
    });
  }

  drawVerificationBlock({
    page,
    pdfDoc,
    qrImage,
    verifyUrl,
    proofId: evidence?.documentId || documentHash,
    font,
    fontBold,
    yBottom: MARGIN_PT + 18,
  });

  drawPageFooter({
    page,
    font,
    pageNumber: 1,
    pageTotal: 1,
    leftText: `Greffio · Procuration · ${reference}`,
  });

  fs.writeFileSync(targetPath, await pdfDoc.save());
  return targetPath;
};

export {
  generateMandatePdf,
};

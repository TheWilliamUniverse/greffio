import fs from 'node:fs';
import { PDFDocument, rgb } from 'pdf-lib';
import { formatParisFrenchDateTime } from '../../utils/parisDateTime.js';
import { loadPdfFonts } from '../../pdf/pdfFonts.js';

const drawLine = (page, font, text, y, size = 10) => {
  page.drawText(String(text || ''), {
    x: 56,
    y,
    size,
    font,
    color: rgb(0.1, 0.15, 0.25),
    maxWidth: 480,
  });
};

export const generateSignatureProofCertificatePdf = async ({
  outputPath,
  signatureRequest,
  signatureMeta = {},
  auditEvents = [],
}) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const { font, fontBold } = await loadPdfFonts(pdfDoc);

  page.drawText('Greffio', { x: 56, y: 780, size: 22, font: fontBold, color: rgb(0.05, 0.2, 0.45) });
  page.drawText('Certificat de preuve de signature électronique', {
    x: 56, y: 752, size: 14, font: fontBold, color: rgb(0.1, 0.15, 0.25),
  });
  page.drawText('Signature électronique simple renforcée (SES)', {
    x: 56, y: 732, size: 10, font, color: rgb(0.35, 0.4, 0.48),
  });

  let y = 690;
  const section = (title) => {
    y -= 18;
    page.drawText(title, { x: 56, y, size: 11, font: fontBold, color: rgb(0.05, 0.2, 0.45) });
    y -= 16;
  };

  section('Document');
  drawLine(page, font, `Titre : ${signatureMeta.documentTitle || signatureRequest.docKey}`, y); y -= 14;
  drawLine(page, font, `Type : ${signatureRequest.docKey}`, y); y -= 14;
  drawLine(page, font, `Dossier : ${signatureRequest.dossierId}`, y); y -= 14;
  drawLine(page, font, `Hash SHA-256 (brouillon) : ${signatureRequest.sha256Draft || '–'}`, y); y -= 14;
  drawLine(page, font, `Hash SHA-256 (signé) : ${signatureRequest.sha256Signed || signatureMeta.sha256Signed || '–'}`, y); y -= 20;

  section('Signataire');
  drawLine(page, font, `Nom : ${signatureMeta.signerFullName || signatureRequest.signerFullName}`, y); y -= 14;
  drawLine(page, font, `Email : ${signatureMeta.signerEmail || signatureRequest.signerEmail}`, y); y -= 14;
  drawLine(page, font, `OTP vérifié : ${signatureMeta.otpVerified ? 'Oui' : 'Non'}`, y); y -= 20;

  section('Signature');
  drawLine(page, font, `Provider : ${signatureMeta.provider || 'greffio_internal'}`, y); y -= 14;
  drawLine(page, font, `Niveau : ${signatureMeta.level || 'ses_reinforced'}`, y); y -= 14;
  drawLine(page, font, `Preuve : ${signatureMeta.proofId || signatureRequest.proofId || '–'}`, y); y -= 14;
  const signedAtLabel = formatParisFrenchDateTime(signatureMeta.signedAt || signatureRequest.signedAt) || '–';
  drawLine(page, font, `Signé le : ${signedAtLabel}`, y); y -= 14;
  drawLine(page, font, signatureMeta.proofLine || '', y); y -= 20;

  section('Consentement');
  drawLine(page, font, `Version : ${signatureMeta.consentVersion || signatureRequest.consentTextVersion || '–'}`, y); y -= 14;
  const consentLines = String(signatureMeta.consentSnapshot || signatureRequest.consentTextSnapshot || '').slice(0, 280);
  drawLine(page, font, consentLines, y); y -= 20;

  section('Chronologie');
  auditEvents.slice(0, 12).forEach((event) => {
    drawLine(page, font, `${event.createdAt || event.at} – ${event.eventType || event.type}`, y);
    y -= 12;
  });

  y = 72;
  page.drawText(
    'Ce certificat est généré automatiquement par Greffio afin de documenter les éléments techniques et déclaratifs associés à la signature électronique simple du document.',
    { x: 56, y, size: 8, font, color: rgb(0.4, 0.45, 0.52), maxWidth: 480 },
  );

  const bytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, bytes);
  return outputPath;
};

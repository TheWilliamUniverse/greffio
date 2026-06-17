import fs from 'node:fs';
import { PDFDocument, rgb } from 'pdf-lib';
import { loadPdfFonts } from './pdfFonts.js';
import { replaceDraftWatermarkWithSignedBadge } from './pdfLayoutPremium.js';
import { formatParisStampTimestamp } from '../utils/parisDateTime.js';
import {
  FORMALITY_POWERS_SIGNATURE_LINE_Y,
  FORMALITY_POWERS_STAMP_MAX_HEIGHT,
  MANDATE_SIGNATURE_LINE_Y,
  NON_CONVICTION_SIGNATURE_LINE_Y,
  SUBSCRIBERS_LIST_SIGNATURE_LINE_Y,
  formalityPowersElectronicStampY,
  formalityPowersSignatureStampY,
  nonConvictionElectronicStampY,
  nonConvictionSignatureStampY,
  signatureStampY,
  subscribersListSignatureStampY,
  subscribersListElectronicStampY,
} from './pdfLegalConstants.js';

const stampColor = rgb(0.35, 0.4, 0.48);

const pdfSafeText = (value, fallback = '') => {
  const raw = String(value ?? fallback);
  return raw
    .normalize('NFC')
    .replace(/\u202f/g, ' ')
    .replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, (char) => {
      const ascii = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return ascii || '?';
    });
};

const formatSignatureTimestampFr = (signedAtIso) => pdfSafeText(formatParisStampTimestamp(signedAtIso));

export const stampSignatureOnPdf = async ({
  inputPath,
  outputPath,
  signerFullName,
  signedAtIso,
  documentId: _documentId,
  signatureImagePngBase64 = null,
  proofLines: _proofLines = [],
  layout = 'default',
}) => {
  const bytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(bytes);
  const pages = pdfDoc.getPages();
  const page = pages[pages.length - 1];
  const { width } = page.getSize();
  const { font, fontBold } = await loadPdfFonts(pdfDoc);

  const isSubscribersLayout = layout === 'subscribers_list_official';
  const isFormalityPowersLayout = layout === 'formality_powers_official';
  const isOfficialLayout = layout === 'non_conviction_official';
  const marginH = isSubscribersLayout || isFormalityPowersLayout ? 70.87 : 71;
  const signatureColWidth = 204;
  const signatureOnRight = isOfficialLayout;
  const signatureX = isFormalityPowersLayout
    ? marginH + 52
    : (signatureOnRight ? width - marginH - signatureColWidth : marginH);
  const yBase = isFormalityPowersLayout
    ? formalityPowersSignatureStampY(FORMALITY_POWERS_SIGNATURE_LINE_Y)
    : (isSubscribersLayout
      ? subscribersListSignatureStampY(SUBSCRIBERS_LIST_SIGNATURE_LINE_Y)
      : (isOfficialLayout
        ? nonConvictionSignatureStampY(NON_CONVICTION_SIGNATURE_LINE_Y)
        : signatureStampY(MANDATE_SIGNATURE_LINE_Y)));
  const electronicStampY = isFormalityPowersLayout
    ? formalityPowersElectronicStampY(FORMALITY_POWERS_SIGNATURE_LINE_Y)
    : (isSubscribersLayout
      ? subscribersListElectronicStampY(SUBSCRIBERS_LIST_SIGNATURE_LINE_Y)
      : (isOfficialLayout
        ? nonConvictionElectronicStampY(NON_CONVICTION_SIGNATURE_LINE_Y)
        : Math.max(34, yBase - 18)));

  const safeSignerName = pdfSafeText(signerFullName, 'Signataire');

  pages.forEach((pdfPage) => {
    replaceDraftWatermarkWithSignedBadge({
      page: pdfPage,
      font,
      fontBold,
      pageWidth: pdfPage.getWidth(),
      pageHeight: pdfPage.getHeight(),
    });
  });

  const signedLabel = formatSignatureTimestampFr(signedAtIso);

  const signatureMaxWidth = signatureOnRight ? 180 : 220;
  const signatureMaxHeight = isFormalityPowersLayout
    ? FORMALITY_POWERS_STAMP_MAX_HEIGHT
    : 60;

  if (signatureImagePngBase64) {
    const match = String(signatureImagePngBase64).match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i);
    if (!match) {
      throw new Error('INVALID_SIGNATURE_FORMAT');
    }
    const imageBytes = Buffer.from(match[2], 'base64');
    if (match[1].toLowerCase() === 'png') {
      const png = await pdfDoc.embedPng(imageBytes);
      const dims = png.scale(0.35);
      page.drawImage(png, {
        x: signatureX,
        y: yBase,
        width: Math.min(dims.width, signatureMaxWidth),
        height: Math.min(dims.height, signatureMaxHeight),
      });
    } else {
      const jpeg = await pdfDoc.embedJpg(imageBytes);
      const dims = jpeg.scale(0.35);
      page.drawImage(jpeg, {
        x: signatureX,
        y: yBase,
        width: Math.min(dims.width, signatureMaxWidth),
        height: Math.min(dims.height, signatureMaxHeight),
      });
    }
  } else {
    page.drawText(safeSignerName, {
      x: signatureX,
      y: isOfficialLayout ? yBase + 14 : yBase + 20,
      size: isOfficialLayout ? 16 : 18,
      font: fontBold,
      color: rgb(0.08, 0.12, 0.2),
    });
  }

  page.drawText(pdfSafeText(`Signé électroniquement le ${signedLabel}`), {
    x: signatureX,
    y: electronicStampY,
    size: 7,
    font,
    color: stampColor,
    maxWidth: signatureColWidth,
  });

  const outBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, outBytes);
  return outputPath;
};

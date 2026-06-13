import fs from 'node:fs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const buildProofFingerprint = (documentId = '') => {
  const seed = String(documentId || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'GRF';
  const parts = [];
  for (let i = 0; i < 6; i += 1) {
    const slice = seed.slice(i * 2, i * 2 + 2).padEnd(2, '0');
    parts.push(`GRF-${slice}${String(i).padStart(2, '0')}`);
  }
  return parts.join('');
};

const stampColor = rgb(0.35, 0.4, 0.48);
const proofColor = rgb(0.2, 0.35, 0.65);

const drawWhiteTextBlock = (page, {
  x,
  y,
  width,
  lines,
  font,
  size = 8,
  lineHeight = 11,
  padding = 5,
}) => {
  const safeLines = (lines || []).filter(Boolean);
  if (!safeLines.length) return y;

  const blockHeight = safeLines.length * lineHeight + padding * 2;
  page.drawRectangle({
    x: x - padding,
    y: y - padding,
    width: width + padding * 2,
    height: blockHeight,
    color: rgb(1, 1, 1),
    borderWidth: 0,
  });

  let cursorY = y + blockHeight - padding - size;
  safeLines.forEach((line) => {
    page.drawText(line, {
      x,
      y: cursorY,
      size,
      font,
      color: stampColor,
      maxWidth: width,
    });
    cursorY -= lineHeight;
  });

  return y - padding;
};

const pdfSafeText = (value, fallback = '') => {
  const raw = String(value ?? fallback);
  return raw
    .normalize('NFC')
    .replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, (char) => {
      const ascii = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return ascii || '?';
    });
};

export const stampSignatureOnPdf = async ({
  inputPath,
  outputPath,
  signerFullName,
  signedAtIso,
  documentId,
  signatureImagePngBase64 = null,
  proofLines = [],
  layout = 'default',
}) => {
  const bytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(bytes);
  const pages = pdfDoc.getPages();
  const page = pages[pages.length - 1];
  const { width } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const isSubscribersLayout = layout === 'subscribers_list_official';
  const isFormalityPowersLayout = layout === 'formality_powers_official';
  const isOfficialLayout = layout === 'non_conviction_official';
  const marginH = isSubscribersLayout || isFormalityPowersLayout ? 56 : 71;
  const signatureColWidth = 204;
  const signatureOnRight = isOfficialLayout;
  const signatureX = isFormalityPowersLayout
    ? marginH
    : (signatureOnRight ? width - marginH - signatureColWidth : marginH);
  const yBase = isFormalityPowersLayout
    ? 108
    : (isSubscribersLayout ? 118 : (isOfficialLayout ? 228 : 168));

  const safeSignerName = pdfSafeText(signerFullName, 'Signataire');

  const proof = buildProofFingerprint(documentId);
  const signedLabel = new Date(signedAtIso).toLocaleString('fr-FR');

  // Empreinte GRF — position validée (bas de page, marge blanche).
  page.drawText(proof, {
    x: marginH,
    y: 42,
    size: 7,
    font,
    color: proofColor,
    maxWidth: width - marginH * 2,
  });

  const signatureMaxWidth = signatureOnRight ? 180 : 220;
  const signatureMaxHeight = 60;

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
      y: yBase + 20,
      size: isOfficialLayout ? 16 : 18,
      font: fontBold,
      color: rgb(0.08, 0.12, 0.2),
    });
  }

  const metaX = signatureOnRight ? signatureX : Math.max(marginH, width - marginH - signatureColWidth);
  const metaWidth = signatureColWidth;
  const metaLines = [
    `Signé électroniquement par ${safeSignerName}`,
    `Le ${signedLabel}`,
  ];
  const metaBaseY = yBase - 42;
  drawWhiteTextBlock(page, {
    x: metaX,
    y: metaBaseY,
    width: metaWidth,
    lines: metaLines,
    font,
    size: 8,
    lineHeight: 11,
  });

  const footerLines = [
    `Document signé le ${signedLabel}`,
    ...(proofLines || []).slice(0, 2),
  ];
  if (footerLines.length) {
    drawWhiteTextBlock(page, {
      x: marginH,
      y: 24,
      width: Math.min(280, width - marginH * 2),
      lines: footerLines,
      font,
      size: 7,
      lineHeight: 10,
      padding: 4,
    });
  }

  const outBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, outBytes);
  return outputPath;
};

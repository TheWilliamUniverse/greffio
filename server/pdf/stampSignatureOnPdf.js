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

export const stampSignatureOnPdf = async ({
  inputPath,
  outputPath,
  signerFullName,
  signedAtIso,
  documentId,
  signatureImagePngBase64 = null,
  proofLines = [],
}) => {
  const bytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(bytes);
  const pages = pdfDoc.getPages();
  const page = pages[pages.length - 1];
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const yBase = 168;

  const proof = buildProofFingerprint(documentId);
  page.drawText(proof, {
    x: 50,
    y: yBase + 70,
    size: 7,
    font,
    color: rgb(0.2, 0.35, 0.65),
    maxWidth: width - 100,
  });

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
        x: 50,
        y: yBase,
        width: Math.min(dims.width, 220),
        height: Math.min(dims.height, 60),
      });
    } else {
      const jpeg = await pdfDoc.embedJpg(imageBytes);
      const dims = jpeg.scale(0.35);
      page.drawImage(jpeg, {
        x: 50,
        y: yBase,
        width: Math.min(dims.width, 220),
        height: Math.min(dims.height, 60),
      });
    }
  } else {
    page.drawText(signerFullName, {
      x: 50,
      y: yBase + 20,
      size: 18,
      font: fontBold,
      color: rgb(0.08, 0.12, 0.2),
    });
  }

  page.drawText(`Signé électroniquement par ${signerFullName}`, {
    x: 50,
    y: yBase - 18,
    size: 9,
    font,
    color: rgb(0.35, 0.4, 0.48),
  });
  page.drawText(`Le ${new Date(signedAtIso).toLocaleString('fr-FR')}`, {
    x: 50,
    y: yBase - 32,
    size: 9,
    font,
    color: rgb(0.35, 0.4, 0.48),
  });

  (proofLines || []).slice(0, 3).forEach((line, index) => {
    page.drawText(line, {
      x: 50,
      y: 30 - index * 12,
      size: 7,
      font,
      color: rgb(0.5, 0.52, 0.56),
    });
  });

  const outBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, outBytes);
  return outputPath;
};

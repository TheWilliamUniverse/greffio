import QRCode from 'qrcode';
import { degrees, rgb } from 'pdf-lib';
import { formatFrenchDate } from './nonConvictionPdf.js';
import { loadPdfFonts } from './pdfFonts.js';
import { formatParisFrenchDateTime } from '../utils/parisDateTime.js';

export const PAGE_WIDTH = 595.28;
export const PAGE_HEIGHT = 841.89;
export const MARGIN_MM = 18;
export const MARGIN_PT = MARGIN_MM * 2.834645669;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_PT * 2;

export const COLOR_TEXT = rgb(0.08, 0.1, 0.14);
export const COLOR_MUTED = rgb(0.38, 0.42, 0.48);
export const COLOR_BRAND = rgb(0.12, 0.35, 0.62);
export const COLOR_CARD_BORDER = rgb(0.82, 0.87, 0.93);
export const COLOR_CARD_FILL = rgb(0.97, 0.98, 0.99);

export const SIZE_TITLE = 15;
export const SIZE_SUBTITLE = 10.5;
export const SIZE_BODY = 10;
export const SIZE_SMALL = 8;
export const LINE_BODY = 13;
export const LINE_SMALL = 11;

export const mmFromTopToY = (mmFromTop) => PAGE_HEIGHT - MARGIN_PT - (mmFromTop * 2.834645669);

export const pdfSafe = (value) => String(value ?? '')
  .normalize('NFC')
  .replace(/\u202f/g, ' ')
  .replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, (char) => {
    const ascii = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return ascii || '?';
  });

export const formatFrenchDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatFrenchDate(value);
  return formatParisFrenchDateTime(value);
};

export const wrapTextByWidth = (text, font, size, maxWidth) => {
  const words = pdfSafe(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  words.forEach((word) => {
    const trial = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(trial, size);
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else if (width > maxWidth) {
      lines.push(word);
      current = '';
    } else {
      current = trial;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [''];
};

export const drawWrappedBlock = ({
  page,
  lines,
  x,
  yStart,
  font,
  size = SIZE_BODY,
  color = COLOR_TEXT,
  lineHeight = LINE_BODY,
  maxWidth = CONTENT_WIDTH,
  fontBold = null,
}) => {
  let y = yStart;
  lines.forEach((line) => {
    page.drawText(pdfSafe(line), {
      x,
      y,
      size,
      font: fontBold || font,
      color,
      maxWidth,
    });
    y -= lineHeight;
  });
  return y;
};

export const drawLabelValue = ({
  page,
  label,
  value,
  y,
  font,
  fontBold,
  x = MARGIN_PT,
  maxWidth = CONTENT_WIDTH,
  size = SIZE_BODY,
}) => {
  const labelText = pdfSafe(label);
  const labelWidth = fontBold.widthOfTextAtSize(labelText, size);
  page.drawText(labelText, {
    x,
    y,
    size,
    font: fontBold,
    color: COLOR_TEXT,
  });
  const valueLines = wrapTextByWidth(value, font, size, maxWidth - labelWidth - 4);
  valueLines.forEach((line, index) => {
    page.drawText(pdfSafe(line), {
      x: x + (index === 0 ? labelWidth : 0),
      y: y - (index * LINE_BODY),
      size,
      font,
      color: COLOR_TEXT,
      maxWidth: maxWidth - (index === 0 ? labelWidth : 0),
    });
  });
  return y - (valueLines.length * LINE_BODY);
};

export const drawCard = ({
  page,
  x,
  yTop,
  width,
  height,
  title,
  lines = [],
  font,
  fontBold,
}) => {
  page.drawRectangle({
    x,
    y: yTop - height,
    width,
    height,
    color: COLOR_CARD_FILL,
    borderColor: COLOR_CARD_BORDER,
    borderWidth: 0.75,
  });
  page.drawText(pdfSafe(title), {
    x: x + 10,
    y: yTop - 16,
    size: SIZE_SMALL,
    font: fontBold,
    color: COLOR_BRAND,
  });
  let cursorY = yTop - 30;
  lines.forEach(({ label, value }) => {
    const labelW = fontBold.widthOfTextAtSize(pdfSafe(label), SIZE_BODY);
    page.drawText(pdfSafe(label), {
      x: x + 10,
      y: cursorY,
      size: SIZE_BODY,
      font: fontBold,
      color: COLOR_MUTED,
    });
    const valueLines = wrapTextByWidth(value, font, SIZE_BODY, width - labelW - 22);
    valueLines.forEach((line, index) => {
      page.drawText(pdfSafe(line), {
        x: x + 10 + (index === 0 ? labelW + 2 : 0),
        y: cursorY - (index * LINE_BODY),
        size: SIZE_BODY,
        font,
        color: COLOR_TEXT,
        maxWidth: width - 20,
      });
    });
    cursorY -= Math.max(valueLines.length * LINE_BODY, LINE_BODY) + 4;
  });
  return yTop - height;
};

export const drawHeaderBand = ({
  page,
  font,
  fontBold,
  title,
  subtitle,
  reference,
}) => {
  page.drawRectangle({
    x: MARGIN_PT,
    y: mmFromTopToY(28),
    width: CONTENT_WIDTH,
    height: 42,
    color: rgb(0.94, 0.97, 1),
    borderColor: COLOR_CARD_BORDER,
    borderWidth: 0.5,
  });
  const titleWidth = fontBold.widthOfTextAtSize(pdfSafe(title), SIZE_TITLE);
  page.drawText(pdfSafe(title), {
    x: (PAGE_WIDTH - titleWidth) / 2,
    y: mmFromTopToY(14),
    size: SIZE_TITLE,
    font: fontBold,
    color: COLOR_BRAND,
  });
  if (subtitle) {
    const subWidth = font.widthOfTextAtSize(pdfSafe(subtitle), SIZE_SUBTITLE);
    page.drawText(pdfSafe(subtitle), {
      x: (PAGE_WIDTH - subWidth) / 2,
      y: mmFromTopToY(20),
      size: SIZE_SUBTITLE,
      font,
      color: COLOR_MUTED,
    });
  }
  if (reference) {
    page.drawText(pdfSafe(`Réf. ${reference}`), {
      x: MARGIN_PT + 10,
      y: mmFromTopToY(24),
      size: SIZE_SMALL,
      font: fontBold,
      color: COLOR_MUTED,
    });
  }
};

export const drawPageFooter = ({
  page,
  font,
  pageNumber = 1,
  pageTotal = 1,
  leftText = 'Document préparé via Greffio',
}) => {
  const y = MARGIN_PT - 6;
  page.drawLine({
    start: { x: MARGIN_PT, y: y + 14 },
    end: { x: PAGE_WIDTH - MARGIN_PT, y: y + 14 },
    thickness: 0.4,
    color: COLOR_CARD_BORDER,
  });
  page.drawText(pdfSafe(leftText), {
    x: MARGIN_PT,
    y,
    size: 7,
    font,
    color: COLOR_MUTED,
  });
  const pageLabel = pdfSafe(`${pageNumber} / ${pageTotal}`);
  const labelW = font.widthOfTextAtSize(pageLabel, 7);
  page.drawText(pageLabel, {
    x: PAGE_WIDTH - MARGIN_PT - labelW,
    y,
    size: 7,
    font,
    color: COLOR_MUTED,
  });
};

export const embedQrCode = async (pdfDoc, verifyUrl) => {
  if (!verifyUrl) return null;
  try {
    const dataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 120,
      color: { dark: '#1e4d8c', light: '#ffffff' },
    });
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    return pdfDoc.embedPng(Buffer.from(base64, 'base64'));
  } catch {
    return null;
  }
};

export const drawVerificationBlock = ({
  page,
  pdfDoc,
  qrImage,
  verifyUrl,
  proofId,
  font,
  fontBold,
  yBottom = MARGIN_PT + 52,
}) => {
  const blockHeight = 58;
  const yTop = yBottom + blockHeight;
  page.drawRectangle({
    x: MARGIN_PT,
    y: yBottom,
    width: CONTENT_WIDTH,
    height: blockHeight,
    color: rgb(0.98, 0.99, 1),
    borderColor: COLOR_CARD_BORDER,
    borderWidth: 0.5,
  });
  page.drawText('Vérification document', {
    x: MARGIN_PT + 10,
    y: yTop - 14,
    size: SIZE_SMALL,
    font: fontBold,
    color: COLOR_BRAND,
  });
  const metaLines = [
    proofId ? `Empreinte : ${pdfSafe(proofId.slice(0, 24))}${proofId.length > 24 ? '…' : ''}` : null,
    verifyUrl ? pdfSafe(verifyUrl.replace(/^https?:\/\//, '')) : null,
  ].filter(Boolean);
  let metaY = yTop - 28;
  metaLines.forEach((line) => {
    page.drawText(line, {
      x: MARGIN_PT + 10,
      y: metaY,
      size: 7,
      font,
      color: COLOR_MUTED,
      maxWidth: CONTENT_WIDTH - 80,
    });
    metaY -= 10;
  });
  if (qrImage) {
    page.drawImage(qrImage, {
      x: PAGE_WIDTH - MARGIN_PT - 52,
      y: yBottom + 6,
      width: 46,
      height: 46,
    });
  }
};

export const loadStandardFonts = loadPdfFonts;

export const drawDraftWatermark = ({
  page,
  font,
  fontBold,
  pageWidth = PAGE_WIDTH,
  pageHeight = PAGE_HEIGHT,
}) => {
  const watermarkColor = rgb(0.78, 0.82, 0.88);
  const subColor = rgb(0.72, 0.76, 0.82);
  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;

  page.drawText('BROUILLON', {
    x: centerX - 108,
    y: centerY + 18,
    size: 48,
    font: fontBold,
    color: watermarkColor,
    rotate: degrees(45),
    opacity: 0.28,
  });
  page.drawText('NON SIGNÉ', {
    x: centerX - 62,
    y: centerY - 28,
    size: 18,
    font,
    color: subColor,
    rotate: degrees(45),
    opacity: 0.32,
  });
};

export const applyDraftWatermarkToAllPages = (pdfDoc, fonts) => {
  pdfDoc.getPages().forEach((page) => {
    drawDraftWatermark({
      page,
      font: fonts.font,
      fontBold: fonts.fontBold,
      pageWidth: page.getWidth(),
      pageHeight: page.getHeight(),
    });
  });
};

export const replaceDraftWatermarkWithSignedBadge = ({
  page: _page,
  font: _font,
  fontBold: _fontBold,
  pageWidth: _pageWidth = PAGE_WIDTH,
  pageHeight: _pageHeight = PAGE_HEIGHT,
}) => {
  // Les documents signés doivent rester lisibles : la preuve de signature est
  // portée par le certificat et les métadonnées, pas par un filigrane visible.
};

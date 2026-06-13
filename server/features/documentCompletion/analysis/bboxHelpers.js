import { clampBboxToPage, isBboxOnPage, toPdfLibBottomLeftBbox } from '../export/pdfCoordinates.js';

export const estimateTextRunBbox = (block, pageWidth, startIndex, runLength, minWidth = 40) => {
  const text = String(block.text || '');
  const safeLength = Math.max(text.length, 1);
  const charWidth = block.width / safeLength;
  const x = block.x + Math.max(0, startIndex) * charWidth;
  const width = Math.min(Math.max(runLength * charWidth, minWidth), pageWidth - x - 8);
  return {
    x,
    y: block.y,
    width,
    height: Math.max(block.height, 16),
    coordinateSystem: 'pdf_points_bottom_left',
  };
};

export const isPlausibleAcroFormRect = (rect, pageWidth, pageHeight) => {
  const width = Number(rect?.width || rect?.w || 0);
  const height = Number(rect?.height || rect?.h || 0);
  const x = Number(rect?.x || 0);
  const y = Number(rect?.y || 0);
  if (width < 24 || height < 10) return false;
  if (height > pageHeight * 0.35) return false;
  if (width > pageWidth * 0.92) return false;
  if (x < -2 || y < -2) return false;
  if (x + width > pageWidth + 2) return false;
  if (y + height > pageHeight + 2) return false;
  return true;
};

export const normalizeFieldBbox = (bbox, pageWidth, pageHeight) => {
  const clamped = clampBboxToPage(bbox, pageWidth, pageHeight);
  const converted = toPdfLibBottomLeftBbox(clamped, pageWidth, pageHeight);
  if (!isBboxOnPage(converted, pageWidth, pageHeight)) return null;
  return clamped;
};

export const hasFilledValueInRow = (blocks, rowY, valueStartX, tolerance = 8) => {
  const valueBlocks = blocks.filter((block) => (
    Math.abs(block.y - rowY) <= tolerance
    && block.x >= valueStartX
    && String(block.text || '').trim().length >= 4
    && !/^(_{2,}|\.{2,})$/.test(String(block.text || '').trim())
  ));
  return valueBlocks.some((block) => /[0-9A-Za-zÀ-ÿ]{4,}/.test(block.text));
};

import PDFParser from 'pdf2json';
import { PDFDocument } from 'pdf-lib';

const safeDecodePdfRun = (value) => {
  const raw = String(value || '');
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch (_error) {
    try {
      return decodeURIComponent(raw.replace(/%(?![0-9A-Fa-f]{2})/g, '%25'));
    } catch (_fallbackError) {
      return raw;
    }
  }
};

const parsePdf2Json = (pdfBuffer) => new Promise((resolve, reject) => {
  const parser = new PDFParser(null, 1);
  parser.on('pdfParser_dataError', (errorData) => {
    reject(new Error(errorData?.parserError || 'PDF_PARSE_FAILED'));
  });
  parser.on('pdfParser_dataReady', (pdfData) => resolve(pdfData));
  parser.parseBuffer(pdfBuffer);
});

export const parsePdfDocument = async (pdfBytes) => {
  const buffer = Buffer.isBuffer(pdfBytes) ? pdfBytes : Buffer.from(pdfBytes);
  let pdfDoc;
  let isEncrypted = false;
  try {
    pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  } catch (error) {
    const message = String(error?.message || error || '');
    if (/encrypt/i.test(message)) {
      isEncrypted = true;
    } else {
      throw new Error('PDF_PARSE_FAILED');
    }
  }

  let pdf2json;
  try {
    pdf2json = await parsePdf2Json(buffer);
  } catch (error) {
    if (!pdfDoc) throw error;
    pdf2json = { Pages: [] };
  }

  const pagesRaw = Array.isArray(pdf2json?.Pages) ? pdf2json.Pages : [];
  const pdfLibPages = pdfDoc?.getPages?.() || [];
  const pageCount = pdfDoc?.getPageCount?.() || pagesRaw.length || 0;

  const pages = pagesRaw.map((page, pageIndex) => {
    const pdfLibPage = pdfLibPages[pageIndex];
    const width = Number(pdfLibPage?.getWidth?.() || page.Width || page.width || 595.28);
    const height = Number(pdfLibPage?.getHeight?.() || page.Height || page.height || 841.89);
    const jsonWidth = Number(page.Width || page.width || width);
    const jsonHeight = Number(page.Height || page.height || height);
    const scaleX = jsonWidth > 0 ? width / jsonWidth : 1;
    const scaleY = jsonHeight > 0 ? height / jsonHeight : 1;
    const texts = Array.isArray(page.Texts) ? page.Texts : [];
    const blocks = texts.flatMap((item, blockIndex) => {
      const runs = Array.isArray(item.R) ? item.R : [];
      const text = runs.map((run) => safeDecodePdfRun(run.T)).join('').trim();
      if (!text) return [];
      const x = Number(item.x || 0) * scaleX;
      const yFromTop = Number(item.y || 0) * scaleY;
      const w = Number(item.w || 0.01) * scaleX;
      const h = Math.max(Number(item.sw || 0.012) * scaleY, 10);
      const charWidth = text.length > 0 ? Math.max(w / text.length, 3) : 4;
      const estimatedWidth = Math.max(w, charWidth * text.length);
      const cappedWidth = Math.min(Math.max(estimatedWidth, 4), Math.max(4, width - x));
      return [{
        id: `p${pageIndex}-b${blockIndex}`,
        text,
        x,
        y: height - yFromTop - h,
        width: cappedWidth,
        height: h,
        rawX: item.x,
        rawY: item.y,
      }];
    });
    const fullText = blocks.map((block) => block.text).join(' ');
    return { pageIndex, pageNumber: pageIndex + 1, width, height, blocks, fullText };
  });

  const allText = pages.map((page) => page.fullText).join('\n');
  const textCharCount = allText.replace(/\s+/g, '').length;
  const hasTextLayer = textCharCount > 40;
  const requiresOcr = !hasTextLayer || textCharCount < 120;

  let hasExistingFormFields = false;
  if (pdfDoc) {
    try {
      const form = pdfDoc.getForm?.();
      const fields = form?.getFields?.() || [];
      hasExistingFormFields = fields.length > 0;
    } catch (_error) {
      hasExistingFormFields = false;
    }
  }

  let sourceType = 'unknown';
  if (hasExistingFormFields && hasTextLayer) sourceType = 'pdf_mixed';
  else if (hasExistingFormFields) sourceType = 'pdf_form';
  else if (requiresOcr) sourceType = 'pdf_scan';
  else sourceType = 'pdf_text';

  return {
    pdfDoc,
    pdfBytes: buffer,
    pageCount,
    pages,
    allText,
    hasTextLayer,
    hasExistingFormFields,
    requiresOcr,
    isEncrypted,
    sourceType,
  };
};

export const buildTextLayerBlocks = (pages = []) => pages.flatMap((page) => (
  page.blocks.map((block) => ({
    pageIndex: page.pageIndex,
    pageNumber: page.pageNumber,
    pageWidth: page.width,
    pageHeight: page.height,
    text: block.text,
    bbox: {
      x: block.x,
      y: block.y,
      width: block.width,
      height: block.height,
      coordinateSystem: 'pdf_points_bottom_left',
    },
  }))
));

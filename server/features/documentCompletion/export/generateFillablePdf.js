import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { GREFFIO_BLUE } from '../config.js';
import { uniquePdfFieldNames } from './sanitizePdfFieldNames.js';
import { isBboxOnPage, toPdfLibBottomLeftBbox } from './pdfCoordinates.js';

const toRgb = (color) => rgb(color.r, color.g, color.b);

export const generateFillableCompletionPdf = async ({
  originalPdfBytes,
  fields = [],
  options = {},
}) => {
  const includeVisualBlueHints = options.includeVisualBlueHints !== false;
  const includeInteractivePdfFields = options.includeInteractivePdfFields !== false;
  const pdfDoc = await PDFDocument.load(originalPdfBytes, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const normalizedFields = uniquePdfFieldNames(fields);
  let form;

  if (includeInteractivePdfFields) {
    try {
      form = pdfDoc.getForm();
    } catch (_error) {
      form = null;
    }
  }

  let placedVisual = 0;
  let placedInteractive = 0;
  let skipped = 0;

  for (const field of normalizedFields) {
    const page = pages[field.pageIndex];
    if (!page) {
      skipped += 1;
      continue;
    }

    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    const bbox = toPdfLibBottomLeftBbox(field.bbox, pageWidth, pageHeight);
    const { x, y, width, height } = bbox;

    if (!isBboxOnPage(bbox, pageWidth, pageHeight)) {
      skipped += 1;
      continue;
    }

    const fieldWidth = Math.max(12, width);
    const fieldHeight = Math.max(10, field.type === 'signature' ? Math.max(height, 40) : height);

    const isCompactGridField = fieldHeight <= 22 && fieldWidth >= 120;
    const hintOpacity = isCompactGridField ? 0.48 : 0.35;

    if (includeVisualBlueHints) {
      page.drawRectangle({
        x,
        y,
        width: fieldWidth,
        height: fieldHeight,
        borderColor: toRgb(GREFFIO_BLUE.border),
        borderWidth: 1,
        color: toRgb(GREFFIO_BLUE.fill),
        opacity: hintOpacity,
      });
      const label = String(field.placeholder || field.label || '').slice(0, 42);
      if (label) {
        page.drawText(label, {
          x: x + 3,
          y: y + Math.max(2, fieldHeight - 11),
          size: 7.5,
          font,
          color: toRgb(GREFFIO_BLUE.text),
          opacity: 0.95,
        });
      }
      placedVisual += 1;
    }

    if (!includeInteractivePdfFields || !form) continue;

    const fieldName = field.name;
    try {
      if (field.type === 'checkbox') {
        const checkbox = form.createCheckBox(fieldName);
        checkbox.addToPage(page, {
          x,
          y,
          width: Math.max(fieldWidth, 14),
          height: Math.max(fieldHeight, 14),
        });
      } else {
        const textField = form.createTextField(fieldName);
        textField.setText('');
        textField.addToPage(page, {
          x,
          y,
          width: fieldWidth,
          height: fieldHeight,
        });
      }
      placedInteractive += 1;
    } catch (_error) {
      skipped += 1;
    }
  }

  if (form) {
    try {
      form.updateFieldAppearances(font);
    } catch (_error) {
      // noop
    }
  }

  if (placedVisual === 0 && normalizedFields.length > 0) {
    console.warn('DOCUMENT_COMPLETION_EXPORT_NO_FIELDS_PLACED', {
      inputFields: normalizedFields.length,
      skipped,
    });
  }

  const bytes = await pdfDoc.save({ useObjectStreams: false, updateFieldAppearances: false });
  return new Uint8Array(bytes);
};

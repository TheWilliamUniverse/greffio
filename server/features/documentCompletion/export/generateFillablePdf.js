import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { GREFFIO_BLUE } from '../config.js';
import { uniquePdfFieldNames } from './sanitizePdfFieldNames.js';

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

  for (const field of normalizedFields) {
    const page = pages[field.pageIndex];
    if (!page) continue;
    const pageHeight = page.getHeight();
    const x = field.bbox.x;
    const y = field.bbox.y;
    const width = Math.max(12, field.bbox.width);
    const height = Math.max(10, field.bbox.height);

    if (x + width > page.getWidth() + 2 || y + height > pageHeight + 2) continue;

    if (includeVisualBlueHints) {
      page.drawRectangle({
        x,
        y,
        width,
        height,
        borderColor: toRgb(GREFFIO_BLUE.border),
        borderWidth: 1,
        color: toRgb(GREFFIO_BLUE.fill),
        opacity: 0.28,
      });
      const label = String(field.placeholder || field.label || '').slice(0, 42);
      if (label) {
        page.drawText(label, {
          x: x + 3,
          y: y + Math.max(2, height - 11),
          size: 7.5,
          font,
          color: toRgb(GREFFIO_BLUE.text),
          opacity: 0.95,
        });
      }
    }

    if (!includeInteractivePdfFields || !form) continue;

    const fieldName = field.name;
    try {
      if (field.type === 'checkbox') {
        const checkbox = form.createCheckBox(fieldName);
        checkbox.addToPage(page, { x, y, width: Math.max(width, 14), height: Math.max(height, 14) });
      } else {
        const textField = form.createTextField(fieldName);
        textField.setText('');
        if (field.placeholder || field.label) {
          try {
            textField.setText('');
          } catch (_error) {
            // noop
          }
        }
        textField.addToPage(page, {
          x,
          y,
          width,
          height: field.type === 'signature' ? Math.max(height, 40) : height,
        });
      }
    } catch (_error) {
      // Continue if a specific widget cannot be created
    }
  }

  const bytes = await pdfDoc.save({ useObjectStreams: false });
  return new Uint8Array(bytes);
};

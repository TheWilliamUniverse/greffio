import { randomUUID } from 'node:crypto';
import { isPlausibleAcroFormRect } from './bboxHelpers.js';

const mapPdfFieldType = (field) => {
  const name = String(field?.constructor?.name || field?.name || '').toLowerCase();
  if (name.includes('checkbox')) return 'checkbox';
  if (name.includes('radio')) return 'radio';
  if (name.includes('dropdown') || name.includes('option')) return 'select';
  if (name.includes('signature')) return 'signature';
  return 'text';
};

export const detectExistingPdfFields = async ({ pdfDoc, pages = [] }) => {
  if (!pdfDoc) return [];
  let form;
  try {
    form = pdfDoc.getForm();
  } catch (_error) {
    return [];
  }
  const fields = form.getFields?.() || [];
  const candidates = [];

  for (const field of fields) {
    const fieldName = field.getName?.() || field.acroField?.getPartialName?.() || 'field';
    const widgets = field.acroField?.getWidgets?.() || [];
    for (const widget of widgets) {
      const rect = widget.getRectangle?.();
      if (!rect) continue;
      const pageRef = widget.P?.();
      const pageIndex = Math.max(0, pdfDoc.getPages().findIndex((page) => page.ref === pageRef));
      const page = pages[pageIndex] || pages[0];
      const pageWidth = page?.width || 595.28;
      const pageHeight = page?.height || 841.89;
      if (!isPlausibleAcroFormRect(rect, pageWidth, pageHeight)) continue;
      const x = Number(rect.x || 0);
      const y = Number(rect.y || 0);
      const width = Math.max(20, Number(rect.width || rect.w || 80));
      const height = Math.max(12, Number(rect.height || rect.h || 18));
      candidates.push({
        id: randomUUID(),
        pageIndex,
        pageNumber: pageIndex + 1,
        type: mapPdfFieldType(field),
        label: fieldName.replace(/[_\-.]+/g, ' ').trim(),
        placeholder: fieldName,
        bbox: {
          x,
          y,
          width,
          height,
          coordinateSystem: 'pdf_points_bottom_left',
        },
        detection: {
          source: 'existing_pdf_form_field',
          confidence: 0.97,
          reason: 'Champ AcroForm existant dans le PDF',
          originalPdfFieldName: fieldName,
        },
        semantic: { category: 'unknown', normalizedKey: fieldName },
      });
    }
  }

  return candidates;
};

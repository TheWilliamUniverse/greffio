import fs from 'node:fs';
import { getEditableDocumentConfig } from '../documents/editableDocumentRegistry.js';
import { generateNonConvictionPdf, validateNonConvictionFields } from '../pdf/nonConvictionPdf.js';

const readPreviewBuffer = async (generatePdf, args) => {
  const pdfPath = await generatePdf(args);
  try {
    return fs.readFileSync(pdfPath);
  } finally {
    try {
      fs.unlinkSync(pdfPath);
    } catch (_error) {
      // ignore temp cleanup errors
    }
  }
};

export const buildDocumentPreviewBuffer = async ({ docKey, fields = {} } = {}) => {
  const key = String(docKey || '');
  const editableConfig = getEditableDocumentConfig(key);

  if (key === 'manager_non_conviction') {
    const validation = validateNonConvictionFields(fields);
    if (!validation.ok) {
      const error = new Error(validation.error);
      error.code = validation.error;
      throw error;
    }
    return readPreviewBuffer(generateNonConvictionPdf, {
      filename: `preview_non_conviction_${Date.now()}.pdf`,
      fields: validation.normalized || fields,
    });
  }

  if (!editableConfig) {
    const error = new Error('DOCUMENT_EDITOR_NOT_SUPPORTED');
    error.code = 'DOCUMENT_EDITOR_NOT_SUPPORTED';
    throw error;
  }

  const validation = editableConfig.validateFields(fields);
  if (!validation.ok) {
    const error = new Error(validation.error);
    error.code = validation.error;
    throw error;
  }

  return readPreviewBuffer(editableConfig.generatePdf, {
    filename: `preview_${key}_${Date.now()}.pdf`,
    fields: validation.normalized || fields,
  });
};

import { STATUTES_SUPPORTED_FORMS, usesActions } from './shared/formatting.js';
import { buildWilliamDocumentByForm } from './reference/williamAdaptations.js';
import { documentToFullPreview } from './previewMapper.js';
import { generateStatutesDocument } from '../../statuts/index.js';

export const buildStatutesByLegalForm = (data) => {
  const legalForm = String(data.legalForm || '').toUpperCase();
  if (!STATUTES_SUPPORTED_FORMS.includes(legalForm)) {
    throw new Error(`Unsupported legal form for statutes generation: ${legalForm}`);
  }
  if (usesActions(legalForm)) {
    return generateStatutesDocument(data);
  }
  return buildWilliamDocumentByForm(data);
};

export const isStatutesSupportedForm = (legalForm) => (
  STATUTES_SUPPORTED_FORMS.includes(String(legalForm || '').toUpperCase())
);

export const normalizeAiClauses = (rawClauses = []) => rawClauses
  .map((item) => {
    if (typeof item === 'string') {
      const match = item.match(/^(Article\s+\d+\s*[––-]\s*[^:––-]+:?)\s*(.+)$/i);
      if (match) {
        return { kind: 'article', number: null, title: match[1].replace(/:$/, '').trim(), body: match[2].trim() };
      }
      return { kind: 'paragraph', text: item.trim() };
    }
    if (item?.title && item?.body) {
      return { kind: 'article', number: null, title: String(item.title), body: String(item.body) };
    }
    return null;
  })
  .filter(Boolean);

export const documentToPreview = (document) => documentToFullPreview(document);

export { buildWilliamDocumentByForm, STATUTES_SUPPORTED_FORMS, documentToFullPreview };

import { STATUTES_SUPPORTED_FORMS } from './shared/formatting.js';
import { buildWilliamDocumentByForm } from './reference/williamAdaptations.js';

export const buildStatutesByLegalForm = (data) => {
  const legalForm = String(data.legalForm || '').toUpperCase();
  if (!STATUTES_SUPPORTED_FORMS.includes(legalForm)) {
    throw new Error(`Unsupported legal form for statutes generation: ${legalForm}`);
  }
  return buildWilliamDocumentByForm(data);
};

export const isStatutesSupportedForm = (legalForm) => (
  STATUTES_SUPPORTED_FORMS.includes(String(legalForm || '').toUpperCase())
);

export const normalizeAiClauses = (rawClauses = []) => rawClauses
  .map((item) => {
    if (typeof item === 'string') {
      const match = item.match(/^(Article\s+\d+\s*[—–-]\s*[^:—–-]+:?)\s*(.+)$/i);
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

export const documentToPreview = (document) => ({
  cover: document.cover,
  preamble: {
    title: 'Préambule',
    paragraphs: document.blocks
      ?.filter((b) => b.kind === 'section-title' || b.kind === 'paragraph')
      ?.slice(0, 12)
      ?.map((b) => b.text || b.title) || [],
  },
  structure: extractStructure(document),
  clauseCount: document.blocks?.filter((b) => b.kind === 'article').length || 0,
  sampleClauses: document.blocks
    ?.filter((b) => b.kind === 'article')
    ?.slice(0, 4)
    ?.map((b) => ({ title: `Article ${b.number} — ${b.title}`, body: b.body })) || [],
  annexes: document.annexes?.map((a) => ({ title: a.title, paragraphs: a.paragraphs })) || [],
  signatures: document.signatures,
  metadata: document.metadata,
});

const extractStructure = (document) => {
  const titles = document.blocks?.filter((b) => b.kind === 'legal-title').map((b) => b.text) || [];
  return {
    sections: titles,
    annexCount: document.annexes?.length || 0,
    template: document.metadata?.template,
    legalForm: document.metadata?.legalForm,
  };
};

export { buildWilliamDocumentByForm, STATUTES_SUPPORTED_FORMS };

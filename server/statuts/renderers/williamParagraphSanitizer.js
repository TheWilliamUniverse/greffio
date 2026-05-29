import { personalizeTribunalMentions } from '../shared/resolveTribunalCommerce.js';
const SAMPLE_DOSSIER_RE = /\b(William|Ibtissam|Nobatène|Anissati)\s+ABDOU\b/i;
const SAMPLE_COMPANY_RE = /\bWILLIAM\s+ESTABLISHMENTS\b|\bWilliam Establishments\b|\(\s*WX\s*\)/gi;
const SIGNATURE_LINE_RE = /Lu et approuvé|Établi à|exemplaires originaux|Signatures des associés/i;
const MINOR_REPRESENTATION_BOILERPLATE_RE = /mineur(e)?\s+non\s+émancipé(e)?\s+au jour de la constitution.*(?:représenté|administrateurs légaux|articles 382)/i;
const SIGNATURE_GRID_RE = /Président désigné\s+Directeur Général|William ABDOU\s+Nobatène ABDOU\s+Ibtissam/i;

export const sanitizeWilliamTemplateParagraphs = (paragraphs = []) => (
  paragraphs.filter((paragraph) => {
    const text = String(paragraph || '').trim();
    if (!text) return false;
    if (SAMPLE_DOSSIER_RE.test(text)) return false;
    if (SIGNATURE_LINE_RE.test(text)) return false;
    if (MINOR_REPRESENTATION_BOILERPLATE_RE.test(text)) return false;
    if (SIGNATURE_GRID_RE.test(text)) return false;
    if (/^Le Président est\s/i.test(text) && SAMPLE_DOSSIER_RE.test(text)) return false;
    if (/^Le Directeur Général est\s/i.test(text) && SAMPLE_DOSSIER_RE.test(text)) return false;
    if (/^7\.\d+\s+Apports de\s/i.test(text) && SAMPLE_DOSSIER_RE.test(text)) return false;
    if (/:\s*\d+% des actions/i.test(text) && SAMPLE_DOSSIER_RE.test(text)) return false;
    return true;
  })
);

export const personalizeWilliamTemplateParagraphs = (paragraphs = [], context = {}) => {
  const companyName = String(context?.company?.name || 'la Société').trim();
  const sigle = String(context?.company?.sigle || '').trim();
  const tribunalLabel = context?.jurisdiction?.tribunalCommerce;
  return sanitizeWilliamTemplateParagraphs(paragraphs).map((paragraph) => {
    let text = String(paragraph || '');
    text = text.replace(SAMPLE_COMPANY_RE, (match) => {
      if (/^\(\s*WX\s*\)$/i.test(match)) return sigle ? `(${sigle})` : '';
      return companyName;
    });
    text = text.replace(/\bWX\b/g, sigle || companyName);
    if (tribunalLabel) text = personalizeTribunalMentions(text, tribunalLabel);
    return text.replace(/\s{2,}/g, ' ').replace(/\(\s*\)/g, '').trim();
  }).filter(Boolean);
};

export const blocksContainSampleParasiteText = (blocks = []) => (
  blocks.some((block) => {
    const text = String(block.text || block.body || '');
    return MINOR_REPRESENTATION_BOILERPLATE_RE.test(text)
      && SAMPLE_DOSSIER_RE.test(text)
      && !block._allowSampleNames;
  })
);

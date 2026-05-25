/** Lignes issues du dossier William Establishments (échantillon) — à exclure du rendu data-driven. */
const SAMPLE_DOSSIER_RE = /\b(William|Ibtissam|Nobatène|Anissati)\s+ABDOU\b/i;
const SIGNATURE_LINE_RE = /Lu et approuvé|Établi à|exemplaires originaux|Signatures des associés/i;
const MINOR_REPRESENTATION_BOILERPLATE_RE = /mineur(e)?\s+non\s+émancipé(e)?\s+au jour de la constitution.*représenté/i;

export const sanitizeWilliamTemplateParagraphs = (paragraphs = []) => (
  paragraphs.filter((paragraph) => {
    const text = String(paragraph || '').trim();
    if (!text) return false;
    if (SAMPLE_DOSSIER_RE.test(text)) return false;
    if (SIGNATURE_LINE_RE.test(text)) return false;
    if (MINOR_REPRESENTATION_BOILERPLATE_RE.test(text)) return false;
    if (/^Le Président est\s/i.test(text) && SAMPLE_DOSSIER_RE.test(text)) return false;
    if (/^Le Directeur Général est\s/i.test(text) && SAMPLE_DOSSIER_RE.test(text)) return false;
    if (/^7\.\d+\s+Apports de\s/i.test(text) && SAMPLE_DOSSIER_RE.test(text)) return false;
    if (/:\s*\d+% des actions/i.test(text) && SAMPLE_DOSSIER_RE.test(text)) return false;
    return true;
  })
);

export const blocksContainSampleParasiteText = (blocks = []) => (
  blocks.some((block) => {
    const text = String(block.text || block.body || '');
    return MINOR_REPRESENTATION_BOILERPLATE_RE.test(text)
      && SAMPLE_DOSSIER_RE.test(text)
      && !block._allowSampleNames;
  })
);

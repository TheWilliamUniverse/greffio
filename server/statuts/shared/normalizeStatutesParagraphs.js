const SENTENCE_END_RE = /[.!?;:»")\]]\s*$/u;
const LOWER_START_RE = /^[a-zàâäéèêëïîôùûüç0-9(«"—-]/u;

const normalizeInline = (value) => String(value || '').replace(/\s+/g, ' ').trim();

/**
 * Fusionne les fragments issus de césures PDF / saisies multi-lignes
 * lorsque la ligne suivante continue la phrase précédente.
 */
export const mergeWrapFragments = (lines = []) => {
  const merged = [];

  lines.forEach((raw) => {
    const line = normalizeInline(raw);
    if (!line) return;

    if (!merged.length) {
      merged.push(line);
      return;
    }

    const previous = merged[merged.length - 1];
    const continuesSentence = !SENTENCE_END_RE.test(previous) || LOWER_START_RE.test(line);

    if (continuesSentence) {
      merged[merged.length - 1] = `${previous} ${line}`;
      return;
    }

    merged.push(line);
  });

  return merged;
};

export const joinStatutesArticleBody = (paragraphs = []) => (
  mergeWrapFragments(paragraphs).join('\n\n')
);

export const normalizeStatutesBodyText = (body = '') => (
  joinStatutesArticleBody(String(body || '').split(/\n+/))
);

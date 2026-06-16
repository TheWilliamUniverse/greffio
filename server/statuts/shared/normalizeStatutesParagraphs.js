const SENTENCE_END_RE = /[.!?;:»")\]]\s*$/u;
const LOWER_START_RE = /^[a-zàâäéèêëïîôùûüç0-9(«"–-]/u;
const NUMBERED_SUBSECTION_RE = /^\d+\.\d+\s+/;

const normalizeInline = (value) => String(value || '').replace(/\s+/g, ' ').trim();

export const classifyStatutesSubheading = (text) => {
  const trimmed = normalizeInline(text);
  if (!NUMBERED_SUBSECTION_RE.test(trimmed)) return null;
  if (/:\s*$/.test(trimmed)) return 'underline';
  return 'bold';
};

const isNumberedSubsectionTitle = (line) => NUMBERED_SUBSECTION_RE.test(normalizeInline(line));

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

    if (isNumberedSubsectionTitle(line)) {
      merged.push(line);
      return;
    }

    if (isNumberedSubsectionTitle(previous) && !SENTENCE_END_RE.test(previous)) {
      merged.push(line);
      return;
    }

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

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_KNOWLEDGE_PATH = join(__dirname, 'knowledge', 'greffio_ia_clients.txt');

const FIELD_MAP = {
  INTENT: 'intent',
  VISIBILITE: 'visibility',
  QUESTION_CLIENT: 'question',
  REPONSE_CANONIQUE: 'canonicalAnswer',
  ACTION_RECOMMANDEE: 'recommendedAction',
  REPONSE_A_EVITER: 'avoidAnswer',
};

let knowledgeIndex = null;
let loadStats = { total: 0, skipped: 0, loadedAt: null };

const parseFieldLine = (line) => {
  const match = String(line || '').match(/^([A-Z_]+):\s*(.*)$/);
  if (!match) return null;
  const key = FIELD_MAP[match[1]];
  if (!key) return null;
  return { key, value: match[2].trim() };
};

/**
 * @param {string} rawContent
 * @returns {{ entries: object[], skipped: number }}
 */
export const parseKnowledgeContent = (rawContent) => {
  const entries = [];
  let skipped = 0;
  const blocks = String(rawContent || '').split(/\n(?=\[GREF-QA-)/);

  for (const block of blocks) {
    const idMatch = block.match(/^\[(GREF-QA-[^\]]+)\]/);
    if (!idMatch) continue;

    const entry = {
      id: idMatch[1],
      intent: '',
      visibility: 'CLIENT',
      question: '',
      canonicalAnswer: '',
      recommendedAction: '',
      avoidAnswer: '',
    };

    for (const line of block.split('\n').slice(1)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('===') || trimmed.startsWith('DIRECTIVE_PAGE:')) continue;
      const parsed = parseFieldLine(trimmed);
      if (parsed) entry[parsed.key] = parsed.value;
    }

    if (!entry.question.trim() || !entry.canonicalAnswer.trim()) {
      skipped += 1;
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[assistant/knowledge] Skipping incomplete block ${entry.id}`);
      }
      continue;
    }

    entries.push(entry);
  }

  return { entries, skipped };
};

export const loadKnowledgeFile = (filePath = DEFAULT_KNOWLEDGE_PATH) => {
  const rawContent = readFileSync(filePath, 'utf8');
  const { entries, skipped } = parseKnowledgeContent(rawContent);
  knowledgeIndex = entries;
  loadStats = {
    total: entries.length,
    skipped,
    loadedAt: new Date().toISOString(),
  };
  if (process.env.NODE_ENV !== 'production') {
    console.info(`[assistant/knowledge] Loaded ${entries.length} entries (${skipped} skipped)`);
  }
  return { entries, skipped };
};

export const getKnowledgeIndex = () => {
  if (!knowledgeIndex) {
    loadKnowledgeFile();
  }
  return knowledgeIndex;
};

export const getKnowledgeLoadStats = () => {
  if (!knowledgeIndex) {
    loadKnowledgeFile();
  }
  return { ...loadStats };
};

export const initializeKnowledgeIndex = () => {
  loadKnowledgeFile();
  return getKnowledgeLoadStats();
};

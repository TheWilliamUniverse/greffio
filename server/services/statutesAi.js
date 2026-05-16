import { askGreffioAssistant } from './assistant.js';

const buildPrompt = (input) => `
Tu rediges des statuts juridiques en francais pour ${input.legalForm}.
Contrainte: produire 10 a 14 clauses courtes, directement exploitables pour generation PDF.
Format strict JSON:
{
  "clauses": ["Article 1 ...", "Article 2 ..."]
}
Contexte:
- denomination: ${input.denomination}
- objet social: ${input.objetSocial}
- siege: ${input.siege}
- duree: ${input.duree}
- capital: ${input.capital}
- president: ${input.president}
`.trim();

export const generateAiStatutesClauses = async (statutesData, legalForm) => {
  const response = await askGreffioAssistant({
    message: buildPrompt({
      ...statutesData,
      legalForm,
    }),
    userContext: {
      role: 'SYSTEM',
      purpose: 'statutes_generation',
      legalForm,
    },
    history: [],
  });
  const text = String(response?.answer || '').trim();
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) return null;
  const payload = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  if (!Array.isArray(payload?.clauses)) return null;
  const clauses = payload.clauses
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  return clauses.length >= 6 ? clauses : null;
};

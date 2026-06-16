import { askGreffioAssistant } from './assistant.js';

const buildPrompt = (input) => `
Tu rédiges des statuts juridiques en français pour une ${input.legalForm}.
Contraintes impératives :
- intégrer explicitement la dénomination, l'objet social, le siège, le capital, le président et la répartition ;
- produire entre 24 et 30 articles numérotés, rédigés de façon professionnelle ;
- chaque article doit commencer par "Article X – Titre" suivi du corps juridique ;
- inclure préambule des soussignés, clauses de gouvernance, annexes de capital et pouvoirs pour formalités.

Format strict JSON :
{
  "clauses": ["Article 1 – Forme : ...", "Article 2 – Dénomination sociale : ..."]
}

Contexte dossier :
- dénomination: ${input.denomination}
- objet social: ${input.objetSocial}
- siège: ${input.seat?.full || input.siege}
- durée: ${input.duree}
- capital: ${input.capital} euros
- répartition: ${input.repartition}
- président: ${input.president}
- bénéficiaires effectifs: ${input.beneficiairesEffectifs}
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

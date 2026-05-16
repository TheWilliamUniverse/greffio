import OpenAI from 'openai';

const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || '').trim();
const OPENAI_MODEL = String(process.env.OPENAI_MODEL || 'gpt-5.1-mini').trim();

const hasOpenAi = Boolean(OPENAI_API_KEY);
const client = hasOpenAi ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

const baseSystemPrompt = `
Tu es l'assistant officiel de Greffio, propulse par ChatGPT.
Tu aides les utilisateurs a accomplir leurs formalites dans la plateforme.
Regles:
- Reponds en francais.
- Style clair, court, actionnable.
- Ne revele jamais d'informations confidentielles.
- Respecte strictement les permissions utilisateur.
- Pour EI/micro-entreprise, ne demande jamais statuts/capital/associes.
`.trim();

const fallbackAnswer = ({ message, userContext }) => {
  const text = String(message || '').toLowerCase();
  const legalStructure = userContext?.legalStructure || userContext?.company?.legalStructure || '';
  if (text.includes('document') || text.includes('piece')) {
    return 'Je peux vous guider sur les pieces prioritaires de votre dossier. Ouvrez l’onglet Documents, puis je vous donne une checklist precise selon votre formalite.';
  }
  if (text.includes('ei') || text.includes('micro')) {
    return 'Pour EI/micro-entreprise: pas de statuts ni capital social. Concentrez-vous sur identite, adresse, activite, date de debut et pieces justificatives.';
  }
  return `Je suis l'assistant Greffio propulse par ChatGPT. Je peux vous aider sur votre formalite${legalStructure ? ` (${legalStructure})` : ''}: prochaines etapes, checklist, et actions prioritaires.`;
};

export const isAssistantConfigured = () => hasOpenAi;

export const askGreffioAssistant = async ({
  message,
  userContext = {},
  history = [],
}) => {
  if (!hasOpenAi || !client) {
    return {
      answer: fallbackAnswer({ message, userContext }),
      provider: 'local_fallback',
      model: null,
    };
  }

  const recentHistory = Array.isArray(history) ? history.slice(-10) : [];
  const input = [
    {
      role: 'developer',
      content: [
        { type: 'input_text', text: baseSystemPrompt },
      ],
    },
    {
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: `Contexte utilisateur: ${JSON.stringify(userContext || {})}`,
        },
      ],
    },
    ...recentHistory
      .filter((item) => item?.role === 'user' || item?.role === 'assistant')
      .map((item) => ({
        role: item.role,
        content: [{ type: 'input_text', text: String(item.content || '') }],
      })),
    {
      role: 'user',
      content: [{ type: 'input_text', text: String(message || '') }],
    },
  ];

  const response = await client.responses.create({
    model: OPENAI_MODEL,
    input,
    max_output_tokens: 450,
  });

  const answer = response?.output_text?.trim()
    || fallbackAnswer({ message, userContext });

  return {
    answer,
    provider: 'openai',
    model: OPENAI_MODEL,
  };
};

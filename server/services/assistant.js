import OpenAI from 'openai';

const baseSystemPrompt = `
Tu es l'assistant officiel de Greffio, propulsé par ChatGPT.
Tu aides les utilisateurs à accomplir leurs formalités dans la plateforme.
Règles:
- Réponds en français.
- Style clair, court, actionnable.
- Ne révèle jamais d'informations confidentielles.
- Respecte strictement les permissions utilisateur.
- Pour EI/micro-entreprise, ne demande jamais statuts/capital/associés.
`.trim();

const readOpenAiKey = () => String(process.env.OPENAI_API_KEY || '').trim();

const readOpenAiModel = () => {
  const configured = String(process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();
  return configured || 'gpt-4o-mini';
};

const getOpenAiClient = () => {
  const apiKey = readOpenAiKey();
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
};

const fallbackAnswer = ({ message, userContext }) => {
  const text = String(message || '').toLowerCase();
  const legalStructure = userContext?.legalStructure || userContext?.company?.legalStructure || '';

  if (text.includes('sas') && text.includes('sarl')) {
    return [
      'SAS vs SARL — résumé actionnable :',
      '• SAS : grande souplesse statutaire, président (personne physique ou morale), associés avec actions, régime social du dirigeant variable selon statuts.',
      '• SARL : cadre plus codifié, gérant majoritaire/sminoritaire, parts sociales, capital minimum 1 €, régime TNS fréquent pour le gérant.',
      '• Greffio : choisissez la forme dans le questionnaire, puis complétez identité, siège, capital et gouvernance.',
    ].join('\n');
  }

  if (text.includes('frais') || text.includes('coût') || text.includes('cout') || text.includes('tarif')) {
    return [
      'Frais à prévoir (ordre de grandeur) :',
      '• Greffio : offre plateforme selon votre parcours (ex. Jeune Entrepreneur ou formule standard).',
      '• Annonce légale : variable selon département et forme juridique.',
      '• Greffe / INPI : frais d’immatriculation selon la formalité.',
      '• Ouvrez l’onglet Paiement ou le simulateur sur la landing pour une estimation personnalisée.',
    ].join('\n');
  }

  if (text.includes('document') || text.includes('pièce') || text.includes('piece')) {
    return 'Je peux vous guider sur les pièces prioritaires de votre dossier. Ouvrez l’onglet Documents, puis je vous donne une checklist précise selon votre formalité.';
  }

  if (text.includes('ei') || text.includes('micro')) {
    return 'Pour EI/micro-entreprise : pas de statuts ni capital social. Concentrez-vous sur identité, adresse, activité, date de début et pièces justificatives.';
  }

  return `Je suis l'assistant Greffio propulsé par ChatGPT. Je peux vous aider sur votre formalité${legalStructure ? ` (${legalStructure})` : ''} : prochaines étapes, checklist et actions prioritaires.`;
};

export const isAssistantConfigured = () => Boolean(readOpenAiKey());

export const askGreffioAssistant = async ({
  message,
  userContext = {},
  history = [],
}) => {
  const client = getOpenAiClient();
  const model = readOpenAiModel();
  const cleanMessage = String(message || '').trim();

  if (!client) {
    return {
      answer: fallbackAnswer({ message: cleanMessage, userContext }),
      provider: 'local_fallback',
      model: null,
    };
  }

  const recentHistory = Array.isArray(history) ? history.slice(-10) : [];
  const messages = [
    { role: 'system', content: baseSystemPrompt },
    {
      role: 'user',
      content: `Contexte utilisateur: ${JSON.stringify(userContext || {})}`,
    },
    ...recentHistory
      .filter((item) => item?.role === 'user' || item?.role === 'assistant')
      .map((item) => ({
        role: item.role,
        content: String(item.content || ''),
      })),
    { role: 'user', content: cleanMessage },
  ];

  try {
    const response = await client.chat.completions.create({
      model,
      messages,
      max_tokens: 500,
      temperature: 0.35,
    });

    const answer = response.choices?.[0]?.message?.content?.trim()
      || fallbackAnswer({ message: cleanMessage, userContext });

    return {
      answer,
      provider: 'openai',
      model,
    };
  } catch (error) {
    console.warn('ASSISTANT_OPENAI_FAILED', error?.message || error);
    return {
      answer: fallbackAnswer({ message: cleanMessage, userContext }),
      provider: 'local_fallback',
      model,
      degraded: true,
    };
  }
};

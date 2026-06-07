import OpenAI from 'openai';
import { assistantConfig, readOpenAiKey } from '../config.js';

const SYSTEM_PROMPT = `
Tu es l'assistant officiel Greffio pour les formalités d'entreprise en France.
Règles :
- Réponds en français, clair, structuré, actionnable.
- Ne donne jamais de conseil juridique définitif : reste pédagogique et prudente.
- Ne mentionne jamais OpenAI, quota, API, billing, clés, modèles internes ou erreurs techniques.
- Pour EI/micro : pas de statuts, capital ou associés.
- Oriente vers les onglets Greffio (Documents, Dossiers, Statuts) quand c'est pertinent.
`.trim();

let quotaBlockedUntil = 0;

export const isOpenAiConfigured = () => Boolean(readOpenAiKey());

export const askOpenAi = async ({ message, history = [], userContext = {} }) => {
  const apiKey = readOpenAiKey();
  if (!apiKey) return null;
  if (Date.now() < quotaBlockedUntil) return { degraded: true, reason: 'quota' };

  const client = new OpenAI({ apiKey });
  const recentHistory = Array.isArray(history) ? history.slice(-10) : [];
  const contextLines = [
    `Intent : ${userContext.intentLabel || userContext.intent || 'general'}`,
    `Dossier : ${JSON.stringify(userContext.dossier || {})}`,
  ];
  if (userContext.knowledgeSnippets?.length) {
    contextLines.push(`Connaissances :\n- ${userContext.knowledgeSnippets.join('\n- ')}`);
  }
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: contextLines.join('\n') },
    ...recentHistory
      .filter((item) => item?.role === 'user' || item?.role === 'assistant')
      .map((item) => ({ role: item.role, content: String(item.content || '') })),
    { role: 'user', content: String(message || '') },
  ];

  try {
    const response = await client.chat.completions.create({
      model: assistantConfig.primaryModel,
      messages,
      max_tokens: assistantConfig.maxTokens,
      temperature: assistantConfig.temperature,
    });
    return {
      answer: response.choices?.[0]?.message?.content?.trim() || '',
      provider: 'openai',
      model: assistantConfig.primaryModel,
    };
  } catch (error) {
    const messageText = String(error?.message || error || '');
    if (error?.status === 429 || messageText.includes('429') || messageText.toLowerCase().includes('quota')) {
      quotaBlockedUntil = Date.now() + (15 * 60 * 1000);
      return { degraded: true, reason: 'quota' };
    }
    console.warn('ASSISTANT_OPENAI_FAILED', messageText);
    return { degraded: true, reason: 'error' };
  }
};

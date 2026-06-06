const TECHNICAL_PATTERNS = [
  /insufficient_quota/gi,
  /rate limit/gi,
  /openai/gi,
  /api key/gi,
  /billing/gi,
  /429/g,
  /provider unavailable/gi,
  /quota exceeded/gi,
  /ECONNREFUSED/gi,
];

export const sanitizeAssistantAnswer = (answer = '') => {
  let text = String(answer || '').trim();
  if (!text) return '';

  TECHNICAL_PATTERNS.forEach((pattern) => {
    text = text.replace(pattern, '');
  });

  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text;
};

export const professionalFallbackAnswer = ({ legalStructure = '' } = {}) => (
  `Je suis l’assistant Greffio. Je peux vous guider sur votre formalité${legalStructure ? ` (${legalStructure})` : ''}, vos documents, vos prochaines étapes et les points de vigilance. Reformulez votre question ou ouvrez l’onglet Documents pour avancer concrètement.`
);

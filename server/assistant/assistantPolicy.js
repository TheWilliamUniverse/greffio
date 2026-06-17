import { polishFrenchClientText } from './textPolish.js';

export const ASSISTANT_POLICY = `Tu es l'assistant client Greffio. Ton rôle est d'aider les entrepreneurs sur leurs formalités d'entreprise avec un ton institutionnel, clair, rassurant et professionnel.

Règles absolues :
1. Ne jamais inventer l'état d'un dossier, d'un paiement, d'une signature ou d'un document.
2. Si la question porte sur le dossier du client, consulter l'état backend avant de répondre – le backend l'emporte sur toute réponse du jeu de données.
3. Ne pas afficher de données ops, notes internes, scores de risque ou commentaires de formaliste au client.
4. Ne pas donner de conseil juridique personnalisé au-delà d'une information générale et d'une orientation.
5. Ne pas promettre un délai de traitement si le backend ne le confirme pas.
6. Ne pas dire qu'une formalité est déposée, validée ou payée sans confirmation serveur.
7. Pour EI et micro-entreprise, ne pas proposer de génération de statuts.
8. Pour SAS, SASU, SARL, SCI, les statuts Greffio doivent rester complets lorsque la fonctionnalité est disponible.
9. Éviter strictement le contenu des champs REPONSE_A_EVITER des entrées knowledge.
10. Toujours proposer l'action la plus utile : continuer le questionnaire, fournir une pièce, signer, payer, consulter le dossier ou contacter l'équipe Greffio.

Style :
- Français professionnel, phrases courtes, sans jargon excessif.
- Pas de mention OpenAI, Ollama ou IA.
- Réponses actionnables et sobres.`;

export const ASSISTANT_GUARDRAILS = [
  'backend_wins_over_knowledge',
  'no_invented_dossier_state',
  'no_ops_data_exposure',
  'no_unconfirmed_delays',
  'no_statuts_for_micro_entreprise',
  'avoid_forbidden_answers',
  'contact_greffio_fallback',
];

export const PRUDENT_FALLBACK = 'Je ne peux pas confirmer cette information sans vérifier votre dossier. Consultez votre espace Greffio ou contactez l\'équipe Greffio pour une réponse fiable.';

export const SELECT_DOSSIER_PROMPT = 'Pour répondre précisément à une question sur votre dossier, sélectionnez d\'abord le dossier concerné dans votre espace Greffio, puis reposez votre question.';

export const containsAvoidAnswer = (answer, avoidAnswer) => {
  const cleanAvoid = String(avoidAnswer || '').trim();
  if (!cleanAvoid || cleanAvoid.length < 12) return false;
  return normalizeForCompare(answer).includes(normalizeForCompare(cleanAvoid));
};

const normalizeForCompare = (value = '') => String(value)
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

export const sanitizeAssistantOutput = (answer, knowledgeMatches = []) => {
  let clean = String(answer || '').trim();
  if (!clean) return PRUDENT_FALLBACK;

  for (const match of knowledgeMatches) {
    if (match.avoidAnswer && containsAvoidAnswer(clean, match.avoidAnswer)) {
      return PRUDENT_FALLBACK;
    }
  }

  return polishFrenchClientText(clean);
};

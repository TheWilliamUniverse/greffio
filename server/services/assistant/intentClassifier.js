const normalize = (value = '') => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const INTENTS = [
  { id: 'documents', label: 'Documents et pièces', patterns: ['document', 'piece', 'justificatif', 'manque', 'manquant', 'fournir', 'upload', 'deposer', 'coffre'] },
  { id: 'dossier_status', label: 'Statut du dossier', patterns: ['statut', 'avancement', 'ou en suis', 'progression', 'mon dossier'] },
  { id: 'next_steps', label: 'Prochaines étapes', patterns: ['prochaine', 'etape', 'suite', 'faire maintenant', 'comment avancer'] },
  { id: 'legal_form', label: 'Forme juridique', patterns: ['sas', 'sarl', 'sasu', 'eurl', 'sci', 'ei', 'micro', 'forme'] },
  { id: 'statutes', label: 'Statuts', patterns: ['statuts', 'articles', 'generer statut', 'william'] },
  { id: 'signature', label: 'Signature', patterns: ['signer', 'signature', 'signe'] },
  { id: 'pricing', label: 'Tarifs et frais', patterns: ['frais', 'tarif', 'prix', 'cout', 'budget', 'payer', 'jeune', '70'] },
  { id: 'deposit', label: 'Dépôt greffe', patterns: ['greffe', 'depot', 'guichet', 'inpi', 'immatriculation'] },
  { id: 'capital', label: 'Capital social', patterns: ['capital', 'depot de capital', 'attestation'] },
  { id: 'ubo', label: 'Bénéficiaires effectifs', patterns: ['beneficiaire', 'ubo', 'rbe'] },
  { id: 'mandate', label: 'Procuration', patterns: ['procuration', 'mandat', 'greffio'] },
  { id: 'general', label: 'Question générale', patterns: [] },
];

export const classifyDossierIntent = ({ message = '', dossierContext = null } = {}) => {
  const text = normalize(message);
  let best = INTENTS.find((item) => item.id === 'general');
  let bestScore = 0;

  for (const intent of INTENTS) {
    if (intent.id === 'general') continue;
    let score = 0;
    for (const pattern of intent.patterns) {
      if (text.includes(normalize(pattern))) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = intent;
    }
  }

  if (dossierContext?.hasDossier && bestScore === 0) {
    if (dossierContext.pendingDocuments?.length) {
      return INTENTS.find((item) => item.id === 'documents');
    }
    if (dossierContext.status) {
      return INTENTS.find((item) => item.id === 'dossier_status');
    }
  }

  return best || INTENTS.find((item) => item.id === 'general');
};

export const listAssistantIntents = () => INTENTS.map(({ id, label }) => ({ id, label }));

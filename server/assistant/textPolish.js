const FRENCH_WORD_FIXES = [
  ['completes', 'complètes'],
  ['incompletes', 'incomplètes'],
  ['complete', 'complète'],
  ['generalement', 'généralement'],
  ['etape', 'étape'],
  ['etapes', 'étapes'],
  ['formalite', 'formalité'],
  ['formalites', 'formalités'],
  ['demarche', 'démarche'],
  ['demarches', 'démarches'],
  ['immatriculees', 'immatriculées'],
  ['immatriculee', 'immatriculée'],
  ['donnees', 'données'],
  ['verifiee', 'vérifiée'],
  ['verifiees', 'vérifiées'],
  ['validee', 'validée'],
  ['validees', 'validées'],
  ['equipe', 'équipe'],
  ['parametres', 'paramètres'],
  ['parametre', 'paramètre'],
  ['deja', 'déjà'],
  ['depot', 'dépôt'],
  ['depots', 'dépôts'],
  ['echeance', 'échéance'],
  ['echeances', 'échéances'],
  ['refuse', 'refusé'],
  ['refusee', 'refusée'],
  ['refusees', 'refusées'],
  ['piece', 'pièce'],
  ['pieces', 'pièces'],
  ['reponse', 'réponse'],
  ['reponses', 'réponses'],
  ['prochaine', 'prochaine'],
  ['calculee', 'calculée'],
  ['calculees', 'calculées'],
  ['evoluer', 'évoluer'],
  ['presente', 'présente'],
  ['presenter', 'présenter'],
  ['particulier', 'particulier'],
  ['specifique', 'spécifique'],
  ['specifiques', 'spécifiques'],
  ['activite', 'activité'],
  ['activites', 'activités'],
  ['societe', 'société'],
  ['societes', 'sociétés'],
  ['creer', 'créer'],
  ['cree', 'créé'],
  ['creee', 'créée'],
  ['creees', 'créées'],
  ['numero', 'numéro'],
  ['numeros', 'numéros'],
  ['telephone', 'téléphone'],
  ['telephoner', 'téléphoner'],
  ['reglementation', 'réglementation'],
  ['reglementaire', 'réglementaire'],
  ['delai', 'délai'],
  ['delais', 'délais'],
  ['verifier', 'vérifier'],
  ['verifie', 'vérifie'],
  ['verifiez', 'vérifiez'],
  ['necessaire', 'nécessaire'],
  ['necessaires', 'nécessaires'],
  ['prealable', 'préalable'],
  ['prealables', 'préalables'],
  ['eligible', 'éligible'],
  ['eligibles', 'éligibles'],
  ['beneficiaire', 'bénéficiaire'],
  ['beneficiaires', 'bénéficiaires'],
  ['etat', 'état'],
  ['etats', 'états'],
  ['civil', 'civil'],
  ['associe', 'associé'],
  ['associes', 'associés'],
  ['dirigeant', 'dirigeant'],
  ['dirigeants', 'dirigeants'],
  ['reel', 'réel'],
  ['reelle', 'réelle'],
  ['reelles', 'réelles'],
  ['reels', 'réels'],
  ['apres', 'après'],
  ['aupres', 'auprès'],
  ['debut', 'début'],
  ['debuter', 'débuter'],
  ['preparer', 'préparer'],
  ['prepare', 'prépare'],
  ['preparee', 'préparée'],
  ['preparees', 'préparées'],
  ['prepares', 'préparés'],
  ['modifie', 'modifié'],
  ['modifiee', 'modifiée'],
  ['modifiees', 'modifiées'],
  ['modifies', 'modifiés'],
  ['transmises', 'transmises'],
  ['transmise', 'transmise'],
  ['transmis', 'transmis'],
  ['mise a jour', 'mise à jour'],
  ['mises a jour', 'mises à jour'],
];

const INTERNAL_ACTION_PATTERNS = [
  /\bbackend\b/i,
  /\/api\//i,
  /action-state/i,
  /\bsi le backend\b/i,
  /\bafficher le bouton\b/i,
  /\bconsulter le statut backend\b/i,
  /\blire \/api\b/i,
  /\butiliser \/api\b/i,
  /\bne pas exposer\b/i,
  /\bdetails seulement ops\b/i,
  /\bapp-context\b/i,
];

export const isInternalRecommendedAction = (label = '') => {
  const clean = String(label || '').trim();
  if (!clean) return true;
  return INTERNAL_ACTION_PATTERNS.some((pattern) => pattern.test(clean));
};

export const polishFrenchClientText = (text = '') => {
  let output = String(text || '');
  if (!output.trim()) return output;

  for (const [ascii, accented] of FRENCH_WORD_FIXES) {
    const pattern = new RegExp(`\\b${ascii}\\b`, 'gi');
    output = output.replace(pattern, (match) => {
      if (match === match.toUpperCase()) return accented.toUpperCase();
      if (match[0] === match[0].toUpperCase()) {
        return accented.charAt(0).toUpperCase() + accented.slice(1);
      }
      return accented;
    });
  }

  return output
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();
};

export const resolveClientFacingActionLabel = (label = '', actionState = null) => {
  const clean = polishFrenchClientText(label);
  if (!clean || isInternalRecommendedAction(clean)) {
    return null;
  }
  if (actionState?.label && clean.toLowerCase() === String(actionState.label).toLowerCase()) {
    return null;
  }
  return clean;
};

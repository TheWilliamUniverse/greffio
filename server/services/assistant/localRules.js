const normalize = (value = '') => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const tryLocalRulesAnswer = ({ message = '', userContext = {} } = {}) => {
  const text = normalize(message);
  const legalStructure = userContext?.legalStructure || userContext?.company?.legalForm || '';

  if (!text.trim()) return null;

  if (text.includes('document') && (text.includes('manque') || text.includes('manquant') || text.includes('fournir'))) {
    return [
      'Checklist documents Greffio (priorité client) :',
      '• Pièce d’identité et justificatif de domicile',
      '• Déclaration de non-condamnation et filiation (si dirigeant)',
      '• Liste des souscripteurs et pouvoirs pour formalités (SAS/SARL)',
      '• Statuts signés, attestation de dépôt de capital et annonce légale selon votre dossier',
      '',
      'Ouvrez l’onglet Documents ou le détail de votre dossier pour voir le statut exact de chaque pièce.',
    ].join('\n');
  }

  if (text.includes('prochaine') || text.includes('etape') || text.includes('suite')) {
    return [
      'Prochaines étapes type dans Greffio :',
      '1. Compléter le questionnaire et vérifier la dénomination, le siège et le capital.',
      '2. Générer puis relire les statuts et les annexes (souscripteurs, pouvoirs, non-condamnation).',
      '3. Déposer les justificatifs et signer les documents requis.',
      '4. Laisser l’équipe Greffio contrôler le dossier avant dépôt au guichet unique.',
    ].join('\n');
  }

  if (text.includes('sas') && (text.includes('sarl') || text.includes('>') || text.includes('vs'))) {
    return [
      'SAS vs SARL — repères rapides :',
      '• SAS : grande souplesse statutaire, président, actions, régime social du dirigeant variable.',
      '• SARL : cadre plus codifié, parts sociales, gérant, régime TNS fréquent.',
      '• Dans Greffio : choisissez la forme au questionnaire, puis complétez gouvernance, capital et documents annexes.',
    ].join('\n');
  }

  if (text.includes('relance') || text.includes('relancer')) {
    return [
      'Modèle de relance client (Greffio) :',
      '« Bonjour, votre dossier avance bien. Il nous manque encore [pièce ou validation] pour poursuivre le dépôt. Vous pouvez compléter depuis votre espace Greffio ou répondre ici. L’équipe reste disponible. »',
      '',
      'Adaptez le libellé entre crochets selon le statut réel du dossier (Documents ou Messages).',
    ].join('\n');
  }

  if (text.includes('sasu') && (text.includes('document') || text.includes('manque'))) {
    return [
      'Checklist SASU dans Greffio :',
      '• Identité et domicile du dirigeant',
      '• Statuts générés et signés',
      '• Attestation de dépôt de capital',
      '• Déclaration de non-condamnation',
      '• Liste des souscripteurs et pouvoirs pour formalités',
      'Consultez l’onglet Documents pour le statut exact de chaque pièce.',
    ].join('\n');
  }

  if (text.includes('frais') || text.includes('cout') || text.includes('tarif') || text.includes('prix')) {
    return [
      'Budget à prévoir (ordre de grandeur) :',
      '• Offre Greffio selon votre parcours',
      '• Annonce légale (variable selon département)',
      '• Frais d’immatriculation greffe / guichet unique',
      'Consultez la page Tarifs ou le simulateur landing pour une estimation adaptée.',
    ].join('\n');
  }

  if (text.includes('ei') || text.includes('micro')) {
    return 'Pour EI ou micro-entreprise : pas de statuts ni de capital social. Concentrez-vous sur identité, adresse, activité, date de début et pièces justificatives.';
  }

  if (text.includes('signer') || text.includes('signature')) {
    return 'Dans Greffio, ouvrez le document concerné (non-condamnation, liste des souscripteurs ou pouvoirs), générez l’aperçu PDF, vérifiez les informations puis cliquez sur « Signer maintenant » ou « Envoyer pour signature ».';
  }

  if (text.includes('statut')) {
    return `Pour les statuts${legalStructure ? ` (${legalStructure})` : ''}, utilisez l’éditeur Greffio ou le parcours « Générer mes statuts ». Le document complet (27 articles pour une SAS type William) se génère après validation du questionnaire.`;
  }

  return null;
};

/** Glossaire statuts client — libellés sans clés techniques. */
export const STATUS_GLOSSARY = Object.freeze({
  BROUILLON: 'Votre dossier est en cours de création.',
  EN_COURS: 'Des informations restent à compléter.',
  ATTENTE_DOCS: 'Des pièces justificatives sont attendues.',
  EN_ANALYSE: 'L’équipe Greffio vérifie vos éléments.',
  A_SIGNER: 'Un document doit être relu puis signé.',
  VALIDE: 'Cette étape est validée.',
  URGENT: 'Une action rapide est requise de votre part.',
  PLANIFIE: 'Le dépôt est programmé ou en préparation.',
  TERMINE: 'La formalité est clôturée.',
  REJETE: 'Un retour administratif nécessite une correction.',
});

export const getStatusGlossary = (badgeStatus) => (
  STATUS_GLOSSARY[String(badgeStatus || '').toUpperCase()]
  || 'Suivez les indications affichées dans votre espace.'
);

/** Glossaire statuts client – libellés sans clés techniques. */
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
  // Statuts document (alignés moteur documentaire)
  REQUESTED: 'Cette pièce doit encore être fournie ou générée.',
  UPLOADED: 'La pièce a été déposée et attend une vérification.',
  PENDING_REVIEW: 'L’équipe Greffio contrôle cette pièce.',
  UNDER_REVIEW: 'L’équipe Greffio contrôle cette pièce.',
  VALIDATED: 'Cette pièce est validée pour le dossier.',
  VALID: 'Cette pièce est validée pour le dossier.',
  REJECTED: 'Cette pièce doit être corrigée ou remplacée.',
  INVALID: 'Cette pièce doit être corrigée ou remplacée.',
  SIGNED: 'Le document est signé et enregistré dans le dossier.',
  GENERATED: 'Le document a été généré ; vérifiez-le puis signez si nécessaire.',
  MODELE: 'Modèle disponible – complétez ou déposez la version finale.',
});

export const getStatusGlossary = (badgeStatus) => (
  STATUS_GLOSSARY[String(badgeStatus || '').toUpperCase()]
  || 'Suivez les indications affichées dans votre espace.'
);

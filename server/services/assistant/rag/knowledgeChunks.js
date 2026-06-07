/** Base de connaissances Greffio (RAG local, sans secrets). */
export const GREFFIO_KNOWLEDGE_CHUNKS = [
  {
    id: 'docs-checklist',
    topics: ['documents', 'pieces', 'justificatifs'],
    text: 'Pièces fréquentes Greffio : pièce d’identité, justificatif de domicile, déclaration de non-condamnation et filiation, liste des souscripteurs, pouvoirs pour formalités, statuts signés, attestation de dépôt de capital, annonce légale selon le dossier. Le statut exact de chaque pièce est visible dans l’onglet Documents.',
  },
  {
    id: 'workflow-steps',
    topics: ['etapes', 'prochaine', 'suite', 'dossier_status'],
    text: 'Parcours type Greffio : 1) questionnaire et vérification dénomination/siège/capital ; 2) génération et relecture des statuts et annexes ; 3) dépôt des justificatifs et signatures ; 4) contrôle par l’équipe Greffio ; 5) dépôt guichet unique et instruction.',
  },
  {
    id: 'ei-micro',
    topics: ['ei', 'micro', 'auto_entrepreneur'],
    text: 'EI et micro-entreprise : pas de statuts ni de capital social. Le parcours porte sur identité, adresse, activité, date de début et pièces justificatives adaptées.',
  },
  {
    id: 'sas-sarl',
    topics: ['sas', 'sarl', 'forme_juridique'],
    text: 'SAS : souplesse statutaire, président, actions. SARL : cadre codifié, parts sociales, gérant. Dans Greffio, la forme est choisie au questionnaire ; compléter ensuite gouvernance, capital et documents annexes.',
  },
  {
    id: 'statuts-william',
    topics: ['statuts', 'articles'],
    text: 'Statuts SAS Greffio : modèle William 2026, 27 articles complets. Génération après validation du questionnaire via l’éditeur statuts ou « Générer mes statuts ». Relire avant signature.',
  },
  {
    id: 'signature',
    topics: ['signature', 'signer'],
    text: 'Signature Greffio : ouvrir le document (non-condamnation, souscripteurs, pouvoirs), générer l’aperçu PDF, vérifier les informations, puis « Signer maintenant » ou « Envoyer pour signature ».',
  },
  {
    id: 'pricing',
    topics: ['frais', 'tarif', 'prix', 'cout'],
    text: 'Budget : offre Greffio selon parcours, annonce légale (variable par département), frais d’immatriculation greffe/guichet unique. Estimation via page Tarifs ou simulateur.',
  },
  {
    id: 'dossier-status',
    topics: ['dossier_status', 'statut', 'avancement'],
    text: 'Statuts dossier Greffio : intake, questionnaire, documents, mandat, statuts, paiement, préparation, validation client, dépôt, instruction, complément, acceptation ou rejet, clôture. Le dashboard indique l’étape en cours.',
  },
  {
    id: 'document-status',
    topics: ['documents', 'validation', 'rejet'],
    text: 'Statuts pièce jointe : requested (à fournir), uploaded (déposé), under_review (en vérification), valid (accepté), invalid (rejeté). En cas de rejet, corriger et redéposer depuis Documents.',
  },
  {
    id: 'guichet-unique',
    topics: ['depot', 'greffe', 'inpi'],
    text: 'Greffio prépare le dossier pour dépôt au guichet unique (INPI). L’équipe ops contrôle la complétude avant envoi. Le client suit l’avancement dans son espace.',
  },
];

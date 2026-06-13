/** Libellés FR des docKey pour l’assistant (alignés produit). */
export const DOC_KEY_LABELS = Object.freeze({
  identity_proof: 'Pièce d’identité',
  address_proof: 'Justificatif de domicile',
  manager_non_conviction: 'Déclaration de non-condamnation',
  subscribers_list: 'Liste des souscripteurs',
  formality_powers: 'Pouvoirs pour formalités',
  signed_statutes: 'Statuts signés',
  capital_certificate: 'Attestation de dépôt de capital',
  legal_announcement: 'Annonce légale',
  mandate_greffio: 'Procuration Greffio',
  ubo_declaration: 'Déclaration des bénéficiaires effectifs',
});

export const formatDocKeys = (keys = []) => keys
  .map((key) => DOC_KEY_LABELS[key] || key.replace(/_/g, ' '))
  .join(', ');

const STATUS_HINTS = Object.freeze({
  draft: 'Complétez le questionnaire pour lancer le dossier.',
  questionnaire_in_progress: 'Reprenez le questionnaire là où vous l’avez laissé.',
  questionnaire_completed: 'Vérifiez vos réponses puis choisissez l’offre adaptée.',
  documents_requested: 'Déposez les pièces demandées dans l’onglet Documents.',
  documents_missing_or_invalid: 'Corrigez les documents signalés par l’équipe Greffio.',
  mandate_required: 'Signez la procuration Greffio.',
  mandate_pending_signature: 'Finalisez la signature de la procuration.',
  statutes_generated: 'Relisez les statuts générés avant signature.',
  payment_pending: 'Réglez les frais Greffio pour poursuivre.',
  client_validation_required: 'Validez le dossier avant dépôt.',
  filed_to_guichet_unique: 'Votre dossier est déposé – suivi en cours par Greffio.',
  under_administration_review: 'Instruction administrative en cours, aucune action urgente.',
  regularization_requested: 'Répondez à la demande de complément dans Messages ou Documents.',
  accepted: 'Formalité acceptée – téléchargez vos documents officiels.',
  completed: 'Dossier clôturé, documents conservés dans votre coffre.',
});

export const hintForDossierStatus = (status) => (
  STATUS_HINTS[String(status || '').toLowerCase()] || 'Consultez votre tableau de bord pour la prochaine action.'
);

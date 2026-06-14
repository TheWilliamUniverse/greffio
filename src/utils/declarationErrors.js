export const getDeclarationErrorMessage = (code = '', payload = null) => {
  if (payload?.message) return payload.message;
  switch (String(code || '').trim()) {
    case 'AUTH_TOKEN_MISSING':
    case 'AUTH_TOKEN_INVALID':
    case 'UNAUTHORIZED':
      return 'Votre session a expiré. Veuillez vous reconnecter.';
    case 'FORBIDDEN':
    case 'DOSSIER_FORBIDDEN':
      return 'Vous n’avez pas accès à ce dossier.';
    case 'DOSSIER_NOT_FOUND':
      return 'Le dossier concerné est introuvable. Rouvrez-le depuis « Dossiers » ou « Documents ».';
    case 'DOCUMENT_EDITOR_NOT_SUPPORTED':
      return 'Cet éditeur n’est pas encore disponible sur le serveur. Réessayez dans quelques minutes.';
    case 'DOCUMENT_EDITOR_LOAD_FAILED':
      return 'Impossible de charger l’éditeur. Réessayez ou contactez l’équipe Greffio.';
    case 'DOCUMENT_EDITOR_IDENTITY_REQUIRED':
      return 'Renseignez l’identité du déclarant (prénoms, nom de naissance, date et lieu de naissance).';
    case 'DOCUMENT_EDITOR_PARENTS_REQUIRED':
      return 'Renseignez la filiation des deux parents (nom de naissance et prénoms).';
    case 'DOCUMENT_EDITOR_ADDRESS_REQUIRED':
      return 'Renseignez l’adresse complète du déclarant.';
    case 'DOCUMENT_EDITOR_SIGNATURE_PLACE_DATE_REQUIRED':
      return 'Indiquez le lieu et la date de la déclaration.';
    case 'DOCUMENT_EDITOR_SIGNATURE_REQUIRED':
      return 'Indiquez le nom du signataire.';
    case 'DOCUMENT_EDITOR_NON_CONDAMNATION_REQUIRED':
    case 'DOCUMENT_EDITOR_FILIATION_REQUIRED':
      return 'Cochez les attestations obligatoires avant de signer.';
    case 'SIGNATURE_CONSENT_REQUIRED':
      return 'Acceptez l’apposition de la signature électronique pour continuer.';
    case 'SIGNER_EMAIL_REQUIRED':
    case 'INVALID_EMAIL':
      return 'L’adresse email du signataire est invalide.';
    case 'INVALID_SIGNATURE_FORMAT':
    case 'MISSING_SIGNATURE_DATA':
      return 'Le format de la signature est invalide. Générez ou dessinez une nouvelle signature.';
    case 'SIGNATURE_PREVIEW_REQUIRED':
      return 'Consultez le document avant de le signer.';
    case 'PREVIEW_STALE':
      return 'Le document a été modifié depuis le dernier aperçu. Regénérez l’aperçu avant signature.';
    case 'PDF_SIGNATURE_FAILED':
    case 'SIGN_NOW_FAILED':
      return 'La signature n’a pas pu être apposée sur le document.';
    case 'PDF_GENERATION_FAILED':
    case 'DOCUMENT_EDITOR_GENERATION_FAILED':
      return 'La génération du document a échoué.';
    case 'STORAGE_UPLOAD_FAILED':
    case 'STORAGE_DOWNLOAD_FAILED':
    case 'STORAGE_URL_MISSING':
    case 'FILE_BUFFER_REQUIRED':
      return 'Le document signé n’a pas pu être enregistré. Vérifiez le stockage documents (S3) côté serveur.';
    case 'DOCUMENT_FILE_NOT_FOUND':
    case 'DOCUMENT_DOWNLOAD_FAILED':
      return 'Le document a été traité mais le fichier n’est pas encore accessible. Rechargez la page ou ouvrez « Documents ».';
    case 'SIGNWELL_SEND_FAILED':
    case 'SIGNWELL_SIGN_NOW_FAILED':
    case 'SIGNWELL_NOT_CONFIGURED':
      return 'La signature n’a pas pu être envoyée. Réessayez ou contactez le support Greffio.';
    case 'SIGNWELL_API_ERROR':
    case 'not_authorized_error':
      return payload?.message || 'La signature n’a pas pu être finalisée. Réessayez ou contactez le support Greffio.';
    case 'SEND_SIGNATURE_REQUEST_FAILED':
      return 'L’envoi du lien de signature a échoué.';
    case 'PUBLIC_SIGN_FAILED':
      return 'La signature n’a pas pu être enregistrée. Réessayez ou demandez un nouveau lien.';
    case 'API_ERROR':
      return 'Une erreur est survenue. Veuillez réessayer.';
    default:
      return 'Une erreur est survenue. Veuillez réessayer.';
  }
};

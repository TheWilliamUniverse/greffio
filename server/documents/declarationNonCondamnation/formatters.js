const normalizeText = (value = '') => String(value || '').trim().replace(/\s+/g, ' ');

const normalizeUpperName = (value = '') => normalizeText(value).toUpperCase();

export const formatDeclarantName = ({
  firstNames = '',
  birthName = '',
  usageName = '',
  legacyLastName = '',
} = {}) => {
  const first = normalizeText(firstNames);
  const birth = normalizeUpperName(birthName || legacyLastName);
  const usage = normalizeUpperName(usageName);
  if (!first && !birth) return '';
  const base = [first, birth].filter(Boolean).join(' ');
  if (usage) return `${base}, utilisant le nom d'usage ${usage}`;
  return base;
};

export const formatParentDisplayName = ({
  firstNames = '',
  birthName = '',
  usageName = '',
  legacyFullName = '',
} = {}) => {
  if (legacyFullName && !birthName && !firstNames) return normalizeText(legacyFullName);
  const first = normalizeText(firstNames);
  const birth = normalizeUpperName(birthName);
  const usage = normalizeUpperName(usageName);
  const base = [first, birth].filter(Boolean).join(' ');
  if (!base) return '';
  if (usage) return `${base}, nom d'usage ${usage}`;
  return base;
};

export const formatAddress = ({
  line1 = '',
  line2 = '',
  postalCode = '',
  city = '',
  country = 'France',
} = {}) => [line1, line2, [postalCode, city].filter(Boolean).join(' '), country]
  .map(normalizeText)
  .filter(Boolean)
  .join(', ');

export const formatFiliationClause = ({ parent1 = '', parent2 = '' } = {}) => {
  const p1 = normalizeText(parent1);
  const p2 = normalizeText(parent2);
  if (p1 && p2) return `enfant de ${p1} et de ${p2}`;
  if (p1) return `enfant de ${p1}`;
  if (p2) return `enfant de ${p2}`;
  return '';
};

export const normalizeDeclarationFields = (fields = {}) => {
  const declarantBirthName = fields.declarantBirthName || fields.declarantLastName || '';
  const parent2Display = formatParentDisplayName({
    firstNames: fields.parent2FirstNames,
    birthName: fields.parent2BirthName,
    usageName: fields.parent2UsageName,
    legacyFullName: fields.parent2FullName || fields.motherBirthNameAndFirstNames || fields.motherFullName,
  });
  const parent1Display = normalizeText(fields.parent1FullName || fields.fatherFullName);
  const signatureFullName = normalizeText(fields.signatureFullName)
    || formatDeclarantName({
      firstNames: fields.declarantFirstName,
      birthName: declarantBirthName,
      usageName: fields.declarantUsageName,
    });

  return {
    ...fields,
    declarantBirthName,
    parent1FullName: parent1Display || fields.parent1FullName,
    parent2FullName: parent2Display || fields.parent2FullName,
    signatureFullName,
  };
};

export const getDeclarationErrorMessage = (code = '') => {
  switch (String(code || '').trim()) {
    case 'AUTH_TOKEN_MISSING':
    case 'UNAUTHORIZED':
      return 'Votre session a expiré. Veuillez vous reconnecter.';
    case 'FORBIDDEN':
    case 'DOSSIER_FORBIDDEN':
      return 'Vous n’avez pas accès à ce dossier.';
    case 'DOSSIER_NOT_FOUND':
      return 'Le dossier concerné est introuvable.';
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
    case 'PREVIEW_STALE':
      return 'Le document a été modifié depuis le dernier aperçu. Regénérez l’aperçu avant signature.';
    case 'PDF_SIGNATURE_FAILED':
    case 'SIGN_NOW_FAILED':
      return 'La signature n’a pas pu être apposée sur le document.';
    case 'PDF_GENERATION_FAILED':
    case 'DOCUMENT_EDITOR_GENERATION_FAILED':
      return 'La génération du document a échoué.';
    case 'STORAGE_UPLOAD_FAILED':
      return 'Le document signé n’a pas pu être enregistré.';
    case 'SEND_SIGNATURE_REQUEST_FAILED':
      return 'L’envoi du lien de signature a échoué.';
    default:
      return 'Une erreur est survenue. Veuillez réessayer.';
  }
};

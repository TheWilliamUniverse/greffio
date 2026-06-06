export const validateSiren = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 9) {
    return { ok: false, code: 'SIREN_INVALID_LENGTH', message: 'Un SIREN comporte 9 chiffres.' };
  }
  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    let digit = Number(digits[i]);
    if ((i + 1) % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  if (sum % 10 !== 0) {
    return { ok: false, code: 'SIREN_LUHN_FAILED', message: 'Le SIREN ne passe pas la validation Luhn.' };
  }
  return { ok: true, siren: digits };
};

export const validateSiret = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 14) {
    return { ok: false, code: 'SIRET_INVALID_LENGTH', message: 'Un SIRET comporte 14 chiffres.' };
  }
  const sirenCheck = validateSiren(digits.slice(0, 9));
  if (!sirenCheck.ok) return sirenCheck;
  let sum = 0;
  for (let i = 0; i < 14; i += 1) {
    let digit = Number(digits[i]);
    if ((i + 1) % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  if (sum % 10 !== 0) {
    return { ok: false, code: 'SIRET_LUHN_FAILED', message: 'Le SIRET ne passe pas la validation Luhn.' };
  }
  return { ok: true, siret: digits, siren: digits.slice(0, 9) };
};

export const validateIban = (value) => {
  const iban = String(value || '').replace(/\s+/g, '').toUpperCase();
  if (iban.length < 15 || iban.length > 34) {
    return { ok: false, code: 'IBAN_INVALID_LENGTH', message: 'Format IBAN invalide.' };
  }
  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
  const converted = rearranged.replace(/[A-Z]/g, (char) => String(char.charCodeAt(0) - 55));
  let remainder = converted;
  while (remainder.length > 2) {
    const block = remainder.slice(0, 9);
    remainder = String(Number(block) % 97) + remainder.slice(block.length);
  }
  if (Number(remainder) % 97 !== 1) {
    return { ok: false, code: 'IBAN_CHECKSUM_FAILED', message: 'IBAN invalide (checksum).' };
  }
  return { ok: true, iban };
};

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'yopmail.com',
  'guerrillamail.com',
  'tempmail.com',
  '10minutemail.com',
]);

export const isDisposableEmail = (email) => {
  const domain = String(email || '').split('@')[1]?.toLowerCase();
  return Boolean(domain && DISPOSABLE_DOMAINS.has(domain));
};

export const validateEmailSyntax = (email) => {
  const value = String(email || '').trim();
  if (!value.includes('@') || value.length < 5) {
    return { ok: false, code: 'EMAIL_INVALID', message: 'Adresse email invalide.' };
  }
  if (isDisposableEmail(value)) {
    return { ok: false, code: 'EMAIL_DISPOSABLE', message: 'Les adresses jetables ne sont pas acceptées.' };
  }
  return { ok: true, email: value };
};

export const normalizePhone = (phone, country = 'FR') => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (country === 'FR' && digits.length >= 10) {
    const normalized = digits.startsWith('33') ? `+${digits}` : `+33${digits.replace(/^0/, '')}`;
    return { ok: true, phone: normalized };
  }
  if (digits.length >= 8) return { ok: true, phone: digits };
  return { ok: false, code: 'PHONE_INVALID', message: 'Numéro de téléphone invalide.' };
};

export const computeCompleteness = (dossier = {}, questionnaire = {}) => {
  const fields = [
    questionnaire.companyName || dossier.companyName,
    questionnaire.city || dossier.city,
    questionnaire.email || dossier.email,
    questionnaire.phone || dossier.phone,
    questionnaire.legalForm || dossier.legalForm,
  ];
  const filled = fields.filter((value) => String(value || '').trim()).length;
  const score = Math.round((filled / fields.length) * 100);
  return { score, missingCount: fields.length - filled };
};

export const detectDossierInconsistencies = ({ dossier = {}, questionnaire = {} } = {}) => {
  const issues = [];
  const legalForm = String(questionnaire.legalForm || dossier.legalForm || '').toUpperCase();
  const typeFormalite = String(questionnaire.typeFormalite || dossier.typeFormalite || '').toLowerCase();
  if (typeFormalite.includes('micro') && legalForm.includes('SAS')) {
    issues.push({ code: 'FORMALITY_FORM_MISMATCH', weight: 20, message: 'La forme juridique ne correspond pas à la formalité micro-entreprise.' });
  }
  if (!String(questionnaire.email || dossier.email || '').includes('@')) {
    issues.push({ code: 'EMAIL_MISSING', weight: 10, message: 'Email manquant.' });
  }
  return issues;
};

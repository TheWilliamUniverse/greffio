/** Champs greffe bloquants – aligné avec server/domain/questionnaireStepValidation.js */

export const GREFFE_BLOCKING_FIELD_KEYS = new Set([
  'initiatorType',
  'firstName',
  'lastName',
  'email',
  'phone',
  'nationality',
  'companyName',
  'companyCountry',
  'companyRepresentative',
  'typeFormalite',
  'formeJuridique',
  'formeJuridiqueFamillePrimary',
  'formeJuridiqueFamilleSecondary',
  'formeJuridiqueFamille',
  'connaissezFormeJuridique',
  'denomination',
  'capital',
  'dirigeant',
  'associates',
  'activite',
  'adresseSiege',
  'codePostal',
  'villeSiege',
  'adressePersonnelle',
  'dateDebutActivite',
  'regimeEi',
  'validationConfirmed',
  'recapAcknowledged',
]);

export const isGreffeBlockingField = (field) => {
  if (!field?.required) return false;
  if (field.missingButContinueAllowed === true) return false;
  if (field.greffeBlocking === false) return false;
  return GREFFE_BLOCKING_FIELD_KEYS.has(field.key);
};

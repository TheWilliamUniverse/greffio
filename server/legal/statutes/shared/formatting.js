export const LEGAL_FORM_LABELS = Object.freeze({
  SAS: 'Société par Actions Simplifiée',
  SASU: 'Société par Actions Simplifiée Unipersonnelle',
  SARL: 'Société à Responsabilité Limitée',
  EURL: 'Entreprise Unipersonnelle à Responsabilité Limitée',
  SCI: 'Société Civile Immobilière',
});

export const SECURITY_LABELS = Object.freeze({
  SAS: { singular: 'action', plural: 'actions', unit: 'actions' },
  SASU: { singular: 'action', plural: 'actions', unit: 'actions' },
  SARL: { singular: 'part sociale', plural: 'parts sociales', unit: 'parts sociales' },
  EURL: { singular: 'part sociale', plural: 'parts sociales', unit: 'parts sociales' },
  SCI: { singular: 'part sociale', plural: 'parts sociales', unit: 'parts sociales' },
});

export const DIRECTOR_LABELS = Object.freeze({
  SAS: 'Président',
  SASU: 'Président',
  SARL: 'Gérant',
  EURL: 'Gérant',
  SCI: 'Gérant',
});

export const isUniqueAssociateForm = (legalForm) => ['SASU', 'EURL'].includes(String(legalForm || '').toUpperCase());

export const usesActions = (legalForm) => ['SAS', 'SASU'].includes(String(legalForm || '').toUpperCase());

export const STATUTES_SUPPORTED_FORMS = Object.freeze(['SAS', 'SASU', 'SARL', 'EURL', 'SCI']);

export const article = (number, title, body) => ({
  kind: 'article',
  number,
  title,
  body,
});

export const sectionTitle = (text) => ({ kind: 'section-title', text });

export const legalTitle = (text) => ({ kind: 'legal-title', text });

export const paragraph = (text) => ({ kind: 'paragraph', text });

export const blankLine = () => ({ kind: 'blank' });

/** Formes à capital en actions (sociétés par actions). */
export const ACTION_BASED_LEGAL_FORMS = Object.freeze(['SAS', 'SASU', 'SA']);

/** Formes à capital en parts sociales. */
export const SHARE_BASED_LEGAL_FORMS = Object.freeze(['SARL', 'EURL', 'SCI']);

export const usesActionsSecurities = (legalForm) => (
  ACTION_BASED_LEGAL_FORMS.includes(String(legalForm || '').toUpperCase())
);

export const usesShareSecurities = (legalForm) => (
  SHARE_BASED_LEGAL_FORMS.includes(String(legalForm || '').toUpperCase())
);

export const resolveSecuritiesUnit = (legalForm) => (
  usesActionsSecurities(legalForm) ? 'actions' : 'parts sociales'
);

/** Règles injectées dans l'analyse IA de complétion documentaire. */
export const DOCUMENT_COMPLETION_SECURITIES_RULES = `
Terminologie des titres de capital (ne jamais mélanger actions / parts sociales) :
- Actions : SAS, SASU, SA (sociétés par actions). Libellés attendus : "actions", "nombre d'actions", "souscription d'actions", "cession d'actions".
- Parts sociales : SARL, EURL, SCI. Libellés attendus : "parts sociales", "nombre de parts sociales", "souscription de parts sociales", "cession de parts sociales".
- Si la forme juridique est identifiable, aligne les libellés de champs détectés sur la terminologie correcte.
- Ne remplace jamais "parts sociales" par "actions" (ni l'inverse) sans cohérence avec la forme juridique du document.
`.trim();

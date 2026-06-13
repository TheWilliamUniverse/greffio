/** Parcours questionnaire – démarrage explicite vs reprise d’un dossier existant. */

export const QUESTIONNAIRE_NEW_PATH = '/questionnaire?new=1';

export const questionnaireResumePath = (dossierId) => (
  `/questionnaire?dossierId=${encodeURIComponent(String(dossierId || '').trim())}`
);

export const isQuestionnaireNewIntent = (searchParams) => {
  const source = searchParams?.get ? searchParams : null;
  if (!source) return false;
  return source.get('new') === '1'
    || source.get('forceNew') === '1'
    || source.get('fromSimulator') === '1';
};

export const isQuestionnaireExplicitResume = (searchParams) => (
  Boolean(String(searchParams?.get?.('dossierId') || '').trim())
);

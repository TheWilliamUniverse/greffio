import { getCurrentDossierId, saveCurrentDossierId } from '@/utils/sessionStore.js';
import { getDeclarationErrorMessage } from '@/utils/declarationErrors.js';

export const getDocumentEditorLoadErrorMessage = (error) => {
  const code = String(error?.code || error?.message || error?.payload?.error || '').trim();
  return getDeclarationErrorMessage(code, error?.payload);
};

/** Réaligne le dossier actif sur un ID encore valide côté API. */
export const syncCurrentDossierId = (dossierIds = []) => {
  const validIds = dossierIds.filter(Boolean);
  if (!validIds.length) return null;
  const stored = getCurrentDossierId();
  if (stored && validIds.includes(stored)) return stored;
  saveCurrentDossierId(validIds[0]);
  return validIds[0];
};

import { getCurrentDossierId, saveCurrentDossierId } from '@/utils/sessionStore.js';
import { getDeclarationErrorMessage } from '@/utils/declarationErrors.js';

export const getDocumentEditorLoadErrorMessage = (error) => {
  const code = String(error?.code || error?.payload?.error || error?.message || '').trim();
  if (code === 'Failed to fetch') {
    return 'Connexion à l’API impossible. Vérifiez votre réseau ou réessayez dans quelques instants.';
  }
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

import { getCurrentDossierId, saveCurrentDossierId } from '@/utils/sessionStore.js';

export const readDossierIdFromSearchParams = (searchParams) => {
  const raw = String(searchParams?.get?.('dossierId') || '').trim();
  return raw || null;
};

/** Résout le dossier actif pour /documents (query ?dossierId= prioritaire). */
export const resolveDocumentsDossierId = ({
  searchParams,
  dossierIds = [],
  fallbackId = getCurrentDossierId(),
} = {}) => {
  const fromUrl = readDossierIdFromSearchParams(searchParams);
  const validIds = dossierIds.filter(Boolean);

  if (fromUrl) {
    if (!validIds.length || validIds.includes(fromUrl)) {
      saveCurrentDossierId(fromUrl);
      return fromUrl;
    }
  }

  if (fallbackId && validIds.includes(fallbackId)) {
    return fallbackId;
  }

  if (validIds.length === 1) {
    saveCurrentDossierId(validIds[0]);
    return validIds[0];
  }

  return fromUrl || fallbackId || null;
};

/** Ouvre le sélecteur de dossier seulement si plusieurs dossiers et aucun dossierId explicite. */
export const shouldOpenDocumentsDossierPicker = ({
  searchParams,
  dossierCount = 0,
  internalView = false,
} = {}) => {
  if (internalView) return false;
  if (readDossierIdFromSearchParams(searchParams)) return false;
  return dossierCount > 1;
};

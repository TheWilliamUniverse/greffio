import { Preferences } from '@capacitor/preferences';

const prefix = (userId, key) => `greffio_mobile_${userId}_${key}`;

const readJson = async (storageKey) => {
  const payload = await Preferences.get({ key: storageKey });
  if (!payload?.value) return null;
  try {
    return JSON.parse(payload.value);
  } catch (_error) {
    return null;
  }
};

const writeJson = async (storageKey, value) => {
  await Preferences.set({ key: storageKey, value: JSON.stringify(value) });
};

export const saveQuestionnaireDraftOffline = async ({ userId, dossierId, data }) => {
  if (!userId || !dossierId) return;
  await writeJson(prefix(userId, `draft_${dossierId}`), {
    data,
    savedAt: new Date().toISOString(),
  });
};

export const loadQuestionnaireDraftOffline = async ({ userId, dossierId }) => {
  if (!userId || !dossierId) return null;
  return readJson(prefix(userId, `draft_${dossierId}`));
};

export const cacheDossiersSnapshot = async ({ userId, dossiers }) => {
  if (!userId) return;
  await writeJson(prefix(userId, 'dossiers_cache'), {
    dossiers: Array.isArray(dossiers) ? dossiers : [],
    cachedAt: new Date().toISOString(),
  });
};

export const loadDossiersSnapshot = async (userId) => {
  if (!userId) return null;
  return readJson(prefix(userId, 'dossiers_cache'));
};

export const cacheDocumentBlobMeta = async ({ userId, documentId, meta }) => {
  if (!userId || !documentId) return;
  await writeJson(prefix(userId, `doc_${documentId}`), {
    ...meta,
    cachedAt: new Date().toISOString(),
  });
};

export const loadDocumentBlobMeta = async ({ userId, documentId }) => {
  if (!userId || !documentId) return null;
  return readJson(prefix(userId, `doc_${documentId}`));
};

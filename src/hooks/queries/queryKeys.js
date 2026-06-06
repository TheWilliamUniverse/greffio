export const queryKeys = {
  profile: () => ['profile'],
  dossiers: () => ['dossiers'],
  dossier: (id) => ['dossier', id],
  trashedDossiers: () => ['dossiers', 'trash'],
  documents: (dossierId) => ['documents', dossierId],
};

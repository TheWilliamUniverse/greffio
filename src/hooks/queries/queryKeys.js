export const queryKeys = {
  profile: () => ['profile'],
  dossiers: (userId = null) => (userId ? ['dossiers', userId] : ['dossiers']),
  dossier: (id) => ['dossier', id],
  dossierActionState: (id) => ['dossier', id, 'action-state'],
  trashedDossiers: () => ['dossiers', 'trash'],
  documents: (dossierId) => ['documents', dossierId],
};

const INITIATOR_TYPE_LABELS = Object.freeze({
  personne_physique: 'Personne physique',
  personne_morale: 'Personne morale',
});

export const formatInitiatorType = (value) => {
  const key = String(value || '').trim();
  if (!key) return '–';
  return INITIATOR_TYPE_LABELS[key] || key.replace(/_/g, ' ');
};

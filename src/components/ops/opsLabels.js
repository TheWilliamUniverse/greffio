export const slaTone = (status) => {
  if (status === 'critical') return 'critical';
  if (status === 'late') return 'late';
  if (status === 'watch') return 'watch';
  return 'ok';
};

export const riskTone = (score) => {
  if (score >= 70) return 'critical';
  if (score >= 45) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
};

export const completionTone = (score) => {
  if (score >= 85) return 'ok';
  if (score >= 55) return 'watch';
  return 'late';
};

export const formatRelativeTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '–';
  const diffMs = Date.now() - date.getTime();
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  if (hours < 1) return 'À l’instant';
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

export const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '–';
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

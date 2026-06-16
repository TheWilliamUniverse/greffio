import { getAllDossiers } from '../store.js';
import { isInternalRole } from '../authMiddleware.js';

export const buildMobileNotifications = async ({ userId, role }) => {
  const all = await getAllDossiers();
  const dossiers = isInternalRole(role)
    ? all
    : all.filter((dossier) => dossier.userId && dossier.userId === userId);

  const notifications = [];

  dossiers.slice(0, 8).forEach((dossier) => {
    const progress = Number(dossier.progressPercent || 0);
    notifications.push({
      id: `dossier-${dossier.id}`,
      title: dossier.companyName || 'Dossier Greffio',
      body: `${dossier.service || 'Formalité'} – ${dossier.status || 'En cours'} (${progress}%)`,
      tone: progress < 100 ? 'action' : 'info',
      path: `/dossier/${dossier.id}`,
      createdAt: dossier.updatedAt || dossier.createdAt || new Date().toISOString(),
    });
  });

  if (!notifications.length) {
    notifications.push({
      id: 'welcome',
      title: 'Bienvenue sur Greffio mobile',
      body: 'Lancez une formalité ou consultez l’assistant pour démarrer.',
      tone: 'info',
      path: '/questionnaire?new=1',
      createdAt: new Date().toISOString(),
    });
  }

  return notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 12);
};

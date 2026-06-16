import { getAllDossiers } from '../store.js';
import { isInternalRole } from '../authMiddleware.js';

const normalize = (value) => String(value || '').trim().toLowerCase();

export const buildMobileSearchResponse = async ({ userId, role, query }) => {
  const q = normalize(query);
  if (!q) {
    return {
      summary: 'Saisissez une question ou un mot-clé pour lancer la recherche.',
      results: [],
      actions: [
        { label: 'Voir mes dossiers', path: '/dossiers' },
        { label: 'Mes documents', path: '/documents' },
      ],
    };
  }

  const all = await getAllDossiers();
  const dossiers = isInternalRole(role)
    ? all
    : all.filter((dossier) => dossier.userId && dossier.userId === userId);

  const dossierMatches = dossiers.filter((item) => [
    item.companyName,
    item.service,
    item.status,
    item.legalForm,
    item.id,
  ].some((part) => normalize(part).includes(q))).slice(0, 5);

  const actions = [];
  if (/dossier|formalit|statut|où en|ou en/.test(q)) {
    actions.push({ label: 'Voir mes dossiers', path: '/dossiers' });
  }
  if (/document|pi[eè]ce|pdf|kbis|statut/.test(q)) {
    actions.push({ label: 'Mes documents', path: '/documents' });
  }
  if (/cr[eé]er|sasu|sarl|sas|micro|nouvelle/.test(q)) {
    actions.push({ label: 'Nouvelle démarche', path: '/questionnaire?new=1' });
  }
  if (/assistant|aide|question/.test(q)) {
    actions.push({ label: 'Assistant Greffio', path: '/chat' });
  }
  if (!actions.length) {
    actions.push({ label: 'Assistant Greffio', path: '/mobile/search' });
  }

  const primary = dossierMatches[0];
  let summary = 'Aucun dossier correspondant trouvé pour cette recherche.';
  if (primary) {
    summary = `Dossier trouvé : ${primary.companyName || 'Formalité'} – statut ${primary.status || 'en cours'}, progression ${Number(primary.progressPercent || 0)}%.`;
    actions.unshift({ label: 'Ouvrir le dossier', path: `/dossier/${primary.id}` });
  } else if (/où en|ou en/.test(q)) {
    summary = 'Je n’ai pas identifié de dossier actif. Lancez une nouvelle formalité ou consultez la liste des dossiers.';
  } else {
    summary = 'Recherche locale effectuée. Utilisez les actions proposées ou l’assistant conversationnel pour une réponse enrichie.';
  }

  return {
    summary,
    results: dossierMatches.map((item) => ({
      id: item.id,
      label: item.companyName || 'Dossier Greffio',
      hint: `${item.service || 'Formalité'} · ${item.status || 'En cours'}`,
      path: `/dossier/${item.id}`,
    })),
    actions: actions.slice(0, 4),
    provider: 'greffio_local_search',
  };
};

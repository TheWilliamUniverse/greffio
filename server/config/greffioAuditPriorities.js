/**
 * Priorités produit Greffio – source unique pour l'audit remote (API / assistant / ops).
 * Dernière revue : 16 juin 2026.
 */

export const GREFFIO_AUDIT_META = Object.freeze({
  id: 'greffio-audit-2026-06-16',
  title: 'Audit priorités Greffio – site web & app remote',
  updatedAt: '2026-06-16T08:45:00.000Z',
  overallScore: 7.8,
  strategy: 'App Android remote-first (Capacitor → greffio.willentreprises.com) · API VPS · déploiement web sans AAB sauf changement natif',
});

export const GREFFIO_AUDIT_P0 = Object.freeze([
  {
    id: 'questionnaire',
    label: 'Questionnaire & création dossier',
    score: 8,
    status: 'OK',
    summary: 'Cœur business : flux interactif mobile, formalité, associés pas à pas, navigation Retour corrigée (16/06).',
  },
  {
    id: 'documents-pdf',
    label: 'Documents, PDF, signature',
    score: 7.5,
    status: 'RISK',
    summary: 'Filigranes signés retirés, procuration refondue ; signature native encore moins aboutie que procuration sur mobile.',
  },
  {
    id: 'auth-biometric',
    label: 'Auth, session, biométrie',
    score: 8,
    status: 'OK',
    summary: 'JWT + refresh, MFA, biométrie native après login ; idle web seulement sur navigateur.',
  },
  {
    id: 'payment-mollie',
    label: 'Paiement Mollie B2C',
    score: 8,
    status: 'OK',
    summary: 'PSP actif Mollie, 3-D Secure, retour native Custom Tabs.',
  },
  {
    id: 'app-version-remote',
    label: 'App mobile remote & version',
    score: 9,
    status: 'OK',
    summary: '/api/app-version pilote MAJ optionnelle/obligatoire sans nouvel AAB pour le web remote.',
  },
]);

export const GREFFIO_AUDIT_P1 = Object.freeze([
  { id: 'statuts', label: 'Statuts William 27 articles', score: 8.5, status: 'OK', summary: 'Génération serveur + tests ; vérifier storageUrl sur dossiers anciens.' },
  { id: 'ops', label: 'Ops & back-office', score: 7.5, status: 'OK', summary: 'Cockpit, anti-rejet, assignation ; smoke mobile ops limité.' },
  { id: 'security-ci', label: 'Sécurité & CI', score: 6.5, status: 'RISK', summary: 'CSP report-only ; test:security hors pipeline CI.' },
  { id: 'signature-internal', label: 'Signature interne Greffio', score: 8, status: 'OK', summary: 'Signature électronique simple (SES) via greffio_internal uniquement — prestataires tiers retirés.' },
  { id: 'push-offline', label: 'Push & offline', score: 6.5, status: 'GAP', summary: 'FCM branché partiellement ; brouillon questionnaire offline actif.' },
  { id: 'landing-seo', label: 'Landing, SEO, conversion', score: 8, status: 'OK', summary: 'Identité figée ; acquisition stable, pas de refonte globale.' },
]);

export const GREFFIO_AUDIT_ACTIONS = Object.freeze([
  { priority: 'P0', action: 'Parité mobile signature document (/documents/:id/sign)', area: 'documents-pdf' },
  { priority: 'P0', action: 'Smoke prod post-deploy : paiement + signature + PDF externe', area: 'observability' },
  { priority: 'P0', action: 'Coupler deploy web Hostinger + vérif API VPS à chaque release remote', area: 'app-version-remote' },
  { priority: 'P1', action: 'Ajouter test:security et paiements au CI GitHub (voir greffioAuditPriorities — wiring CI optionnel)', area: 'security-ci' },
  { priority: 'P1', action: 'Refactor ciblé QuestionnairePage (réduire régressions navigation)', area: 'questionnaire' },
]);

export const GREFFIO_REMOTE_DEPLOY_MATRIX = Object.freeze([
  { change: 'UI questionnaire, paiement, shell mobile', hostinger: true, vps: false, aab: false },
  { change: 'PDF signés, procuration, webhooks Mollie', hostinger: false, vps: true, aab: false },
  { change: 'Changelog / seuil app-version', hostinger: false, vps: true, aab: false },
  { change: 'FileOpener, icône, plugins Capacitor', hostinger: false, vps: false, aab: true },
]);

export const GREFFIO_REMOTE_CHANGELOG = Object.freeze([
  'Navigation questionnaire : Retour et avance écran par écran (associés inclus)',
  'Documents signés : filigranes BROUILLON / DOCUMENT SIGNÉ retirés',
  'Procuration formalités : layout aéré, identité mandant, signature',
  'Questionnaire SA : capital minimum 37 000 € avec message bienveillant',
  'Associés mineurs : blocage dirigeant corrigé si représentants légaux saisis',
  'Choix type de formalité restauré en début de parcours',
]);

export const getGreffioAuditContext = () => ({
  ...GREFFIO_AUDIT_META,
  p0: GREFFIO_AUDIT_P0,
  p1: GREFFIO_AUDIT_P1,
  actions: GREFFIO_AUDIT_ACTIONS,
  remoteDeployMatrix: GREFFIO_REMOTE_DEPLOY_MATRIX,
  remoteChangelog: GREFFIO_REMOTE_CHANGELOG,
});

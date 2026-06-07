import { PUBLISHER_BRAND_LINE, PUBLISHER_LEGAL_NAME } from '@/config/publisher.js';

export const GREFFIO_COMPANY = Object.freeze({
  name: PUBLISHER_LEGAL_NAME,
  email: 'contact@willentreprises.com',
  legalLabel: PUBLISHER_BRAND_LINE,
});

export const GREFFIO_OPS_TEAM = Object.freeze([
  {
    id: 'william',
    name: 'William ABDOU',
    email: 'william@willentreprises.com',
    role: 'ADMIN',
    initials: 'WA',
    title: 'Direction & pilotage ops',
  },
  {
    id: 'nobatene',
    name: 'Nobatène ABDOU',
    email: 'nobatene@willentreprises.com',
    role: 'OPS',
    initials: 'NA',
    title: 'Coordination formalités',
  },
  {
    id: 'ibtissam',
    name: 'Ibtissam ABDOU',
    email: 'ibtissam@willentreprises.com',
    role: 'FORMALISTE',
    initials: 'IA',
    title: 'Revue documentaire',
  },
]);

export const OPS_QUEUE_LABELS = Object.freeze({
  blocked: 'Bloqué ops',
  waiting_client: 'En attente client',
  ready_to_file: 'Prêt au dépôt',
});

export const OPS_PRIORITY_LABELS = Object.freeze({
  low: 'Basse',
  normal: 'Normale',
  high: 'Haute',
  urgent: 'Urgente',
});

export const findOpsMemberByEmail = (email = '') => (
  GREFFIO_OPS_TEAM.find((member) => member.email.toLowerCase() === String(email).toLowerCase()) || null
);

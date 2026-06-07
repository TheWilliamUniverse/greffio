import { apiGet, apiPost } from './client.js';

export const fetchDossierMessages = async (dossierId) => {
  const payload = await apiGet(`/api/dossiers/${dossierId}/messages`);
  return payload?.messages || [];
};

export const postDossierMessage = async (dossierId, body) => {
  const payload = await apiPost(`/api/dossiers/${dossierId}/messages`, { body });
  return payload;
};

export const fetchOpsDossierMessages = async (dossierId) => {
  const payload = await apiGet(`/api/ops/dossiers/${dossierId}/messages`);
  return payload?.messages || [];
};

export const postOpsDossierMessage = async (dossierId, body) => {
  const payload = await apiPost(`/api/ops/dossiers/${dossierId}/messages`, { body });
  return payload;
};

export const sendOpsDossierMessageEmail = async (dossierId, {
  body,
  toEmail,
  subject,
  force = false,
}) => {
  const payload = await apiPost(`/api/ops/dossiers/${dossierId}/messages/send-email`, {
    body,
    toEmail,
    subject,
    force,
  });
  return payload;
};

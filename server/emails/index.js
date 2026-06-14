import { sendTransactionalEmail } from '../services/emailService.js';
import { getDossier } from '../store.js';
import { shouldSendDossierEmail } from './dossierEmailPolicy.js';
import { resolveMinReminderDays, shouldSendReminderForUser } from './dossierReminderPolicy.js';

const defaultClientUrl = process.env.GREFFIO_APP_URL || process.env.APP_URL || 'https://greffio.willentreprises.com';

const resolveReference = (dossier) => dossier?.reference || dossier?.id || 'DOSSIER';

const sendDossierEmail = async ({
  templateId,
  dossier,
  userId = null,
  toEmail,
  variables = {},
  daysSinceAction = 0,
}) => {
  if (!toEmail) {
    return { ok: false, error: 'RECIPIENT_EMAIL_REQUIRED' };
  }

  const policy = await shouldSendDossierEmail({
    templateId,
    dossierId: dossier?.id || null,
    recipientEmail: toEmail,
    force: variables?.forceEmail === true,
  });
  if (!policy.ok) {
    return { ok: true, skipped: true, reason: policy.reason, templateId };
  }

  const reminderPolicy = await shouldSendReminderForUser({
    userId,
    templateId,
    dossierId: dossier?.id || null,
    recipientEmail: toEmail,
    daysSinceAction,
    minDays: resolveMinReminderDays(),
  });
  if (!reminderPolicy.ok) {
    return { ok: true, skipped: true, reason: reminderPolicy.reason, templateId };
  }

  const mergedVariables = {
    reference_dossier: resolveReference(dossier),
    dossierNumber: resolveReference(dossier),
    lien_espace_client: `${defaultClientUrl}/dashboard`,
    dashboardUrl: `${defaultClientUrl}/dashboard`,
    continueUrl: `${defaultClientUrl}/dossier/${dossier?.id || ''}`,
    trackingUrl: `${defaultClientUrl}/dossier/${dossier?.id || ''}`,
    documentsUrl: `${defaultClientUrl}/documents`,
    ...variables,
  };

  return sendTransactionalEmail({
    to: { email: toEmail, name: mergedVariables.firstName || mergedVariables.prenom || '' },
    templateKey: templateId,
    variables: mergedVariables,
    userId,
    dossierId: dossier?.id || null,
    tags: ['dossier'],
  });
};

const sendDossierEmailById = async ({
  templateId,
  dossierId,
  userId = null,
  toEmail,
  variables = {},
}) => {
  const dossier = await getDossier(dossierId);
  if (!dossier) {
    return { ok: false, error: 'DOSSIER_NOT_FOUND' };
  }
  return sendDossierEmail({
    templateId,
    dossier,
    userId,
    toEmail,
    variables,
  });
};

export {
  sendDossierEmail,
  sendDossierEmailById,
};

import { addEmailEvent } from '../emailStore.js';
import { getDossier } from '../store.js';
import { templates } from './templates.js';
import { renderTemplate, validateTemplateVariables } from './renderTemplate.js';
import { sendWithProvider } from './provider.js';

const defaultClientUrl = process.env.APP_URL || 'https://greffio.willentreprises.com';

const resolveReference = (dossier) => dossier?.reference || dossier?.id || 'DOSSIER';

const sendDossierEmail = async ({
  templateId,
  dossier,
  userId = null,
  toEmail,
  variables = {},
}) => {
  const template = templates[templateId];
  if (!template) {
    return {
      ok: false,
      error: 'TEMPLATE_NOT_FOUND',
    };
  }

  const mergedVariables = {
    reference_dossier: resolveReference(dossier),
    lien_espace_client: `${defaultClientUrl}/dashboard`,
    ...variables,
  };

  const validation = validateTemplateVariables(template, mergedVariables);
  if (!validation.ok) {
    await addEmailEvent({
      dossierId: dossier?.id || null,
      userId,
      templateId,
      recipientEmail: toEmail,
      subject: template.subject,
      status: 'failed',
      errorMessage: `MISSING_TEMPLATE_VARIABLES:${validation.missing.join(',')}`,
      payload: { missing: validation.missing },
    });
    return {
      ok: false,
      error: 'MISSING_TEMPLATE_VARIABLES',
      missing: validation.missing,
    };
  }

  const rendered = renderTemplate(template, mergedVariables);
  const sent = await sendWithProvider({
    to: toEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });

  await addEmailEvent({
    dossierId: dossier?.id || null,
    userId,
    templateId,
    recipientEmail: toEmail,
    subject: rendered.subject,
    status: sent.ok ? 'sent' : 'failed',
    providerMessageId: sent.providerMessageId || null,
    errorMessage: sent.errorMessage || null,
    payload: { mode: sent.mode },
    sentAt: sent.ok ? new Date().toISOString() : null,
  });

  return {
    ok: sent.ok,
    providerMessageId: sent.providerMessageId || null,
    error: sent.errorMessage || null,
  };
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
  if (!toEmail) {
    return { ok: false, error: 'RECIPIENT_EMAIL_REQUIRED' };
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

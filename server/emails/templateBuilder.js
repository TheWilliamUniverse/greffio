import { resolveFormalityPublicLabel } from '../domain/formalityLabels.js';
import { PUBLISHER_LEGAL_NAME } from '../config/publisher.js';

const apiPublicUrl = String(process.env.API_PUBLIC_URL || process.env.API_URL || 'https://api.greffio.willentreprises.com').replace(/\/$/, '');
const logoUrl = process.env.EMAIL_LOGO_URL || `${apiPublicUrl}/assets/email/greffio-wordmark-white.png`;
const logoWidth = 154;
const logoHeight = 36;
const appUrl = process.env.APP_URL || 'https://greffio.willentreprises.com';
const supportUrl = `${appUrl}/contact`;
const securityUrl = `${appUrl}/settings`;
const dashboardUrl = `${appUrl}/dashboard`;

const footerText = [
  `Greffio est un service de ${PUBLISHER_LEGAL_NAME}.`,
  'Cet email vous est envoyé dans le cadre de l’utilisation de votre compte ou de votre dossier Greffio.',
  '',
  'Cordialement,',
  'L’équipe Greffio',
  'greffio.willentreprises.com',
  'greffio@willentreprises.com',
  '04 11 81 86 70',
].join('\n');

const ctaButton = (label, url) => `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 8px;">
    <tr>
      <td style="border-radius:999px;background:#214082;">
        <a href="${url}" target="_blank" rel="noopener noreferrer"
          style="display:inline-block;padding:14px 28px;font-family:Inter,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>
`;

const simpleNotificationText = (message) => [
  'Bonjour {{prenom}},',
  '',
  message,
  '',
  'Nous vous remercions.',
].join('\n');

const simpleNotificationBody = (messageHtml) => `
  <p style="margin:0 0 16px;">Bonjour {{prenom}},</p>
  <p style="margin:0 0 16px;">${messageHtml}</p>
  <p style="margin:0;">Nous vous remercions.</p>
`;

const wrapGreffioEmail = ({ preheader = '', bodyHtml }) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Greffio</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Inter,Arial,sans-serif;color:#0f172a;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f6f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:#214082;padding:22px 28px;">
              <img src="${logoUrl}" alt="Greffio" width="${logoWidth}" height="${logoHeight}" style="display:block;width:${logoWidth}px;height:${logoHeight}px;max-width:${logoWidth}px;border:0;outline:none;text-decoration:none;" />
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px 12px;font-size:16px;line-height:1.65;color:#1e293b;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;font-size:12px;line-height:1.6;color:#64748b;border-top:1px solid #e2e8f0;">
              <p style="margin:16px 0 0;">Greffio est un service de ${PUBLISHER_LEGAL_NAME}.<br/>
              Cet email vous est envoyé dans le cadre de l’utilisation de votre compte ou de votre dossier Greffio.</p>
              <p style="margin:12px 0 0;">L’équipe Greffio – greffio.willentreprises.com</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const defineTemplate = ({
  subject,
  tags = [],
  requiredVariables = [],
  preheader = '',
  textLines = [],
  bodyHtml,
}) => ({
  subject,
  tags,
  requiredVariables,
  text: [...textLines, '', footerText].join('\n'),
  html: wrapGreffioEmail({ preheader, bodyHtml }),
});

const normalizeEmailVariables = (variables = {}) => {
  const firstName = variables.firstName || variables.prenom || 'Client';
  return {
    ...variables,
    firstName,
    prenom: firstName,
    dashboardUrl: variables.dashboardUrl || dashboardUrl,
    supportUrl: variables.supportUrl || supportUrl,
    securityUrl: variables.securityUrl || securityUrl,
    resetUrl: variables.resetUrl || variables.reset_link || '',
    reset_link: variables.reset_link || variables.resetUrl || '',
    expirationMinutes: variables.expirationMinutes || variables.expiration_minutes || '30',
    expiration_minutes: variables.expiration_minutes || variables.expirationMinutes || '30',
    verificationUrl: variables.verificationUrl || variables.verification_link || '',
    deviceLabel: variables.deviceLabel || 'Appareil non identifié',
    ipAddress: variables.ipAddress || 'Non disponible',
    locationApproximation: variables.locationApproximation || 'Non disponible',
    attemptTime: variables.attemptTime || variables.loginTime || '',
    loginTime: variables.loginTime || variables.attemptTime || '',
    changedAt: variables.changedAt || '',
    oldEmail: variables.oldEmail || '',
    newEmail: variables.newEmail || '',
    expectedResponseTime: variables.expectedResponseTime || 'Réponse dans l’heure pendant les horaires ouvrés',
    ticketNumber: variables.ticketNumber || variables.reference_dossier || '',
    missingItems: variables.missingItems || variables.liste_documents_requis || '',
    rejectionReason: variables.rejectionReason || variables.motif_complement || '',
    blockReason: variables.blockReason || variables.motif_complement || '',
    actionRequired: variables.actionRequired || '',
    deadline: variables.deadline || 'Dès que possible',
    disclaimer: variables.disclaimer || 'Merci de relire attentivement vos statuts avant signature ou dépôt.',
    companyName: variables.companyName || '',
    companyNameSuffix: variables.companyName ? ` pour ${variables.companyName}` : '',
    riskScore: variables.riskScore || 'Non calculé',
    identityStatus: variables.identityStatus || 'Non vérifiée',
    errorCode: variables.errorCode || '',
    serviceName: variables.serviceName || '',
    occurredAt: variables.occurredAt || '',
    amount: variables.amount || '',
    paymentDate: variables.paymentDate || '',
    invoiceUrl: variables.invoiceUrl || variables.lien_paiement || '',
    invoiceNumber: variables.invoiceNumber || '',
    billingDate: variables.billingDate || '',
    retryPaymentUrl: variables.retryPaymentUrl || variables.lien_paiement || '',
    documentsUrl: variables.documentsUrl || `${dashboardUrl}/documents`,
    uploadUrl: variables.uploadUrl || `${dashboardUrl}/documents`,
    identityUploadUrl: variables.identityUploadUrl || `${dashboardUrl}/documents`,
    statutesUrl: variables.statutesUrl || `${dashboardUrl}/statuts`,
    trackingUrl: variables.trackingUrl || dashboardUrl,
    continueUrl: variables.continueUrl || dashboardUrl,
    actionUrl: variables.actionUrl || dashboardUrl,
    replyUrl: variables.replyUrl || supportUrl,
    ratingUrl: variables.ratingUrl || supportUrl,
    opsUrl: variables.opsUrl || `${appUrl}/ops`,
    formalityType: resolveFormalityPublicLabel({
      service: variables.service || variables.formalityType,
      typeFormalite: variables.typeFormalite || variables.type_formalite,
      formeJuridique: variables.formeJuridique || variables.legalForm,
      legalForm: variables.legalForm,
    }),
    documentName: variables.documentName || '',
    actionLabel: variables.actionLabel || 'Vérification de sécurité',
    verificationCode: variables.verificationCode || '',
    clientName: variables.clientName || '',
    liste_documents_requis: variables.liste_documents_requis || variables.missingItems || '',
    motif_complement: variables.motif_complement || variables.rejectionReason || '',
    dossierNumber: variables.dossierNumber || variables.reference_dossier || variables.dossier_number || '',
    reference_dossier: variables.reference_dossier || variables.dossierNumber || '',
    lien_espace_client: variables.lien_espace_client || dashboardUrl,
  };
};

export {
  appUrl,
  ctaButton,
  defineTemplate,
  footerText,
  normalizeEmailVariables,
  simpleNotificationBody,
  simpleNotificationText,
  supportUrl,
  securityUrl,
  dashboardUrl,
  wrapGreffioEmail,
};

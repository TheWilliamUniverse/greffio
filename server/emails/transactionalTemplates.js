import { ctaButton, defineTemplate } from './templateBuilder.js';

const transactionalTemplates = Object.freeze({
  account_welcome: defineTemplate({
    subject: 'Bienvenue sur Greffio',
    tags: ['auth', 'onboarding'],
    requiredVariables: ['firstName', 'dashboardUrl'],
    preheader: 'Votre espace Greffio est prêt.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Votre compte Greffio a bien été créé.',
      'Vous pouvez dès maintenant compléter votre profil, démarrer une formalité ou reprendre un dossier en cours.',
      '',
      'Greffio vous accompagne dans vos démarches entrepreneuriales : création, modification, documents, signature et suivi greffe.',
      '',
      'Accéder à mon espace : {{dashboardUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Votre compte Greffio a bien été créé. Votre espace est prêt à accueillir vos formalités.</p>
      <p style="margin:0 0 16px;">Vous pouvez compléter votre profil, démarrer une démarche ou reprendre un dossier existant. Greffio centralise vos pièces, vos échanges avec l’équipe et le suivi administratif.</p>
      ${ctaButton('Accéder à mon espace', '{{dashboardUrl}}')}
      <p style="margin:16px 0 0;font-size:14px;color:#64748b;">Besoin d’aide ? <a href="{{supportUrl}}" style="color:#214082;">Contactez l’équipe Greffio</a>.</p>
    `,
  }),

  email_verification: defineTemplate({
    subject: 'Confirmez votre adresse email',
    tags: ['auth', 'security'],
    requiredVariables: ['firstName', 'verificationUrl', 'expirationMinutes'],
    preheader: 'Confirmez votre adresse pour sécuriser votre compte.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Pour sécuriser votre compte Greffio, merci de confirmer votre adresse email.',
      'Lien valable {{expirationMinutes}} minutes : {{verificationUrl}}',
      '',
      'Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet email.',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Cette confirmation permet de sécuriser l’accès à votre compte Greffio et à vos dossiers.</p>
      ${ctaButton('Confirmer mon adresse email', '{{verificationUrl}}')}
      <p style="margin:16px 0 0;font-size:14px;color:#64748b;">Ce lien est valable <strong>{{expirationMinutes}} minutes</strong>. Si vous n’êtes pas à l’origine de cette demande, ignorez simplement cet email.</p>
    `,
  }),

  login_notification: defineTemplate({
    subject: 'Nouvelle connexion à votre compte Greffio',
    tags: ['auth', 'security'],
    requiredVariables: ['firstName', 'loginTime'],
    preheader: 'Une connexion vient d’être enregistrée sur votre compte.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Une connexion à votre compte Greffio vient d’être enregistrée.',
      'Date et heure : {{loginTime}}',
      'Appareil : {{deviceLabel}}',
      'Adresse IP : {{ipAddress}}',
      'Localisation approximative : {{locationApproximation}}',
      '',
      'Si vous reconnaissez cette activité, aucune action n’est nécessaire.',
      'Sinon, sécurisez votre compte : {{securityUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Nous vous informons qu’une connexion à votre compte Greffio vient d’être enregistrée. Il s’agit d’une mesure de sécurité habituelle.</p>
      <table role="presentation" width="100%" style="margin:0 0 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
        <tr><td style="padding:14px 16px;font-size:14px;"><strong>Date et heure</strong><br/>{{loginTime}}</td></tr>
        <tr><td style="padding:0 16px 14px;font-size:14px;"><strong>Appareil</strong><br/>{{deviceLabel}}</td></tr>
        <tr><td style="padding:0 16px 14px;font-size:14px;"><strong>Adresse IP</strong><br/>{{ipAddress}}</td></tr>
        <tr><td style="padding:0 16px 14px;font-size:14px;"><strong>Localisation approximative</strong><br/>{{locationApproximation}}</td></tr>
      </table>
      <p style="margin:0 0 16px;">Si vous reconnaissez cette connexion, aucune action n’est requise.</p>
      ${ctaButton('Vérifier l’activité de mon compte', '{{securityUrl}}')}
      <p style="margin:16px 0 0;font-size:14px;color:#64748b;">Si vous n’êtes pas à l’origine de cette connexion, modifiez votre mot de passe sans tarder.</p>
    `,
  }),

  authentication_code: defineTemplate({
    subject: 'Votre code de vérification Greffio',
    tags: ['auth', 'security', '2fa'],
    requiredVariables: ['firstName', 'verificationCode', 'expirationMinutes', 'actionLabel'],
    preheader: 'Votre code de vérification Greffio.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Action concernée : {{actionLabel}}',
      'Votre code de vérification est : {{verificationCode}}',
      'Il est valable pendant {{expirationMinutes}} minutes.',
      '',
      'Ne communiquez ce code à personne. Greffio ne vous le demandera jamais par téléphone ou message.',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Voici votre code de vérification pour : <strong>{{actionLabel}}</strong></p>
      <p style="margin:0 0 8px;font-size:32px;font-weight:800;letter-spacing:6px;color:#214082;text-align:center;">{{verificationCode}}</p>
      <p style="margin:0 0 16px;text-align:center;font-size:14px;color:#64748b;">Valable {{expirationMinutes}} minutes</p>
      <p style="margin:0;font-size:14px;color:#64748b;">Ne communiquez ce code à personne. Greffio ne vous le demandera jamais par téléphone ou message instantané.</p>
    `,
  }),

  suspicious_login_attempt: defineTemplate({
    subject: 'Tentative de connexion inhabituelle détectée',
    tags: ['auth', 'security', 'alert'],
    requiredVariables: ['firstName', 'attemptTime'],
    preheader: 'Une tentative de connexion inhabituelle a été détectée.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Une tentative de connexion inhabituelle a été détectée sur votre compte Greffio.',
      'Date : {{attemptTime}}',
      'Adresse IP : {{ipAddress}}',
      'Localisation approximative : {{locationApproximation}}',
      '',
      'La tentative a été bloquée. Si vous ne reconnaissez pas cette activité, sécurisez votre compte : {{securityUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Une tentative de connexion inhabituelle a été détectée et bloquée sur votre compte Greffio.</p>
      <table role="presentation" width="100%" style="margin:0 0 20px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;">
        <tr><td style="padding:14px 16px;font-size:14px;"><strong>Date</strong><br/>{{attemptTime}}</td></tr>
        <tr><td style="padding:0 16px 14px;font-size:14px;"><strong>Adresse IP</strong><br/>{{ipAddress}}</td></tr>
        <tr><td style="padding:0 16px 14px;font-size:14px;"><strong>Localisation approximative</strong><br/>{{locationApproximation}}</td></tr>
      </table>
      ${ctaButton('Sécuriser mon compte', '{{securityUrl}}')}
      <p style="margin:16px 0 0;font-size:14px;color:#64748b;">Si vous n’êtes pas à l’origine de cette tentative, nous vous recommandons de modifier votre mot de passe.</p>
    `,
  }),

  password_reset: defineTemplate({
    subject: 'Réinitialisation de votre mot de passe Greffio',
    tags: ['auth', 'password'],
    requiredVariables: ['firstName', 'resetUrl', 'expirationMinutes'],
    preheader: 'Demande de réinitialisation de mot de passe.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Nous avons reçu une demande de réinitialisation de votre mot de passe Greffio.',
      'Lien sécurisé (valable {{expirationMinutes}} minutes) : {{resetUrl}}',
      '',
      'Si vous n’avez rien demandé, ignorez cet email. Votre mot de passe actuel reste inchangé.',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Une demande de réinitialisation de mot de passe a été enregistrée pour votre compte Greffio.</p>
      ${ctaButton('Réinitialiser mon mot de passe', '{{resetUrl}}')}
      <p style="margin:16px 0 0;font-size:14px;color:#64748b;">Ce lien est valable <strong>{{expirationMinutes}} minutes</strong>. Si vous n’êtes pas à l’origine de cette demande, ignorez simplement cet email.</p>
    `,
  }),

  password_changed: defineTemplate({
    subject: 'Votre mot de passe Greffio a été modifié',
    tags: ['auth', 'security', 'password'],
    requiredVariables: ['firstName', 'changedAt'],
    preheader: 'Confirmation de changement de mot de passe.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Votre mot de passe Greffio a été modifié avec succès le {{changedAt}}.',
      '',
      'Si vous n’êtes pas à l’origine de cette action, contactez le support : {{supportUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Nous confirmons que votre mot de passe Greffio a été modifié le <strong>{{changedAt}}</strong>.</p>
      ${ctaButton('Vérifier la sécurité de mon compte', '{{securityUrl}}')}
      <p style="margin:16px 0 0;font-size:14px;color:#64748b;">Si vous n’êtes pas à l’origine de cette modification, contactez immédiatement le support Greffio.</p>
    `,
  }),

  email_changed: defineTemplate({
    subject: 'Votre adresse email Greffio a été modifiée',
    tags: ['auth', 'security'],
    requiredVariables: ['firstName', 'newEmail', 'changedAt'],
    preheader: 'Confirmation de changement d’adresse email.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Votre adresse email Greffio a été modifiée le {{changedAt}}.',
      'Ancienne adresse : {{oldEmail}}',
      'Nouvelle adresse : {{newEmail}}',
      '',
      'Si vous n’êtes pas à l’origine de ce changement, sécurisez votre compte : {{securityUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Nous confirmons la modification de votre adresse email Greffio le <strong>{{changedAt}}</strong>.</p>
      <p style="margin:0 0 8px;font-size:14px;">Ancienne adresse : {{oldEmail}}</p>
      <p style="margin:0 0 16px;font-size:14px;">Nouvelle adresse : <strong>{{newEmail}}</strong></p>
      ${ctaButton('Sécuriser mon compte', '{{securityUrl}}')}
    `,
  }),

  dossier_created: defineTemplate({
    subject: 'Votre dossier Greffio a été créé',
    tags: ['dossier', 'onboarding'],
    requiredVariables: ['firstName', 'dossierNumber', 'formalityType', 'dashboardUrl'],
    preheader: 'Votre dossier Greffio est ouvert.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Votre dossier Greffio a bien été créé.',
      'Numéro de dossier : {{dossierNumber}}',
      'Formalité : {{formalityType}}',
      '',
      'Continuer mon dossier : {{dashboardUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Votre dossier Greffio est ouvert et prêt à être complété.</p>
      <p style="margin:0 0 8px;"><strong>Référence :</strong> {{dossierNumber}}</p>
      <p style="margin:0 0 16px;"><strong>Formalité :</strong> {{formalityType}}</p>
      <p style="margin:0 0 16px;">Prochaine étape : compléter les informations demandées et déposer vos pièces.</p>
      ${ctaButton('Continuer mon dossier', '{{dashboardUrl}}')}
    `,
  }),

  dossier_incomplete: defineTemplate({
    subject: 'Votre dossier nécessite encore quelques informations',
    tags: ['dossier', 'reminder'],
    requiredVariables: ['firstName', 'dossierNumber', 'continueUrl'],
    preheader: 'Quelques informations manquent pour avancer.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Votre dossier {{dossierNumber}} avance bien, mais certaines informations sont encore nécessaires :',
      '{{missingItems}}',
      '',
      'Compléter mon dossier : {{continueUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Votre dossier <strong>{{dossierNumber}}</strong> progresse. Il nous manque encore quelques éléments pour poursuivre :</p>
      <p style="margin:0 0 16px;">{{missingItems}}</p>
      ${ctaButton('Compléter mon dossier', '{{continueUrl}}')}
      <p style="margin:16px 0 0;font-size:14px;color:#64748b;">L’équipe Greffio reste disponible si vous avez une question.</p>
    `,
  }),

  document_received: defineTemplate({
    subject: 'Document reçu pour votre dossier Greffio',
    tags: ['dossier', 'document'],
    requiredVariables: ['firstName', 'documentName', 'dossierNumber', 'documentsUrl'],
    preheader: 'Nous avons bien reçu votre document.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Nous confirmons la réception de « {{documentName}} » pour le dossier {{dossierNumber}}.',
      'Le document sera vérifié par l’équipe Greffio si nécessaire.',
      '',
      'Voir mes documents : {{documentsUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Nous confirmons la réception de <strong>{{documentName}}</strong> pour votre dossier <strong>{{dossierNumber}}</strong>.</p>
      <p style="margin:0 0 16px;">L’équipe Greffio le contrôlera si nécessaire et vous indiquera la prochaine étape.</p>
      ${ctaButton('Voir mes documents', '{{documentsUrl}}')}
    `,
  }),

  document_rejected: defineTemplate({
    subject: 'Un document doit être corrigé',
    tags: ['dossier', 'document', 'action'],
    requiredVariables: ['firstName', 'documentName', 'rejectionReason', 'uploadUrl'],
    preheader: 'Un document nécessite une correction.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Le document « {{documentName}} » doit être corrigé ou remplacé.',
      'Motif : {{rejectionReason}}',
      '',
      'Envoyer un nouveau document : {{uploadUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Le document <strong>{{documentName}}</strong> doit être corrigé pour que votre dossier puisse avancer.</p>
      <p style="margin:0 0 16px;padding:12px 14px;background:#f8fafc;border-radius:10px;font-size:14px;"><strong>Motif :</strong> {{rejectionReason}}</p>
      ${ctaButton('Envoyer un nouveau document', '{{uploadUrl}}')}
      <p style="margin:16px 0 0;font-size:14px;color:#64748b;">Besoin d’aide ? <a href="{{supportUrl}}" style="color:#214082;">Contactez le support Greffio</a>.</p>
    `,
  }),

  identity_verification_required: defineTemplate({
    subject: 'Vérification d’identité nécessaire pour finaliser votre dossier',
    tags: ['dossier', 'identity', 'action'],
    requiredVariables: ['firstName', 'dossierNumber', 'identityUploadUrl'],
    preheader: 'Une pièce d’identité est nécessaire.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Pour finaliser le dossier {{dossierNumber}}, une vérification d’identité est nécessaire.',
      'Ajouter ma pièce d’identité : {{identityUploadUrl}}',
      '',
      'Vos documents sont traités de manière sécurisée.',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Pour sécuriser et finaliser votre dossier <strong>{{dossierNumber}}</strong>, merci d’ajouter une pièce d’identité valide.</p>
      ${ctaButton('Ajouter ma pièce d’identité', '{{identityUploadUrl}}')}
      <p style="margin:16px 0 0;font-size:14px;color:#64748b;">Vos documents sont transmis et traités de manière sécurisée.</p>
    `,
  }),

  statutes_generated: defineTemplate({
    subject: 'Votre projet de statuts est prêt',
    tags: ['dossier', 'statuts'],
    requiredVariables: ['firstName', 'dossierNumber', 'statutesUrl', 'disclaimer'],
    preheader: 'Votre projet de statuts est disponible.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Votre projet de statuts pour le dossier {{dossierNumber}} est disponible.',
      '{{disclaimer}}',
      '',
      'Consulter mon projet : {{statutesUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Votre projet de statuts pour le dossier <strong>{{dossierNumber}}</strong> est prêt à être consulté.</p>
      <p style="margin:0 0 16px;padding:12px 14px;background:#fefce8;border:1px solid #fde68a;border-radius:10px;font-size:14px;">{{disclaimer}}</p>
      ${ctaButton('Consulter mon projet de statuts', '{{statutesUrl}}')}
    `,
  }),

  dossier_submitted: defineTemplate({
    subject: 'Votre dossier a été transmis',
    tags: ['dossier', 'submission'],
    requiredVariables: ['firstName', 'dossierNumber', 'submittedAt', 'trackingUrl'],
    preheader: 'Votre dossier a été transmis.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Votre dossier {{dossierNumber}} a été transmis le {{submittedAt}}.',
      'Greffio suit désormais son avancement.',
      '',
      'Suivre mon dossier : {{trackingUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Nous confirmons la transmission de votre dossier <strong>{{dossierNumber}}</strong> le <strong>{{submittedAt}}</strong>.</p>
      <p style="margin:0 0 16px;">L’équipe Greffio suit l’avancement et vous informera des prochaines étapes.</p>
      ${ctaButton('Suivre mon dossier', '{{trackingUrl}}')}
    `,
  }),

  dossier_approved: defineTemplate({
    subject: 'Votre formalité est validée',
    tags: ['dossier', 'success'],
    requiredVariables: ['firstName', 'dossierNumber', 'dashboardUrl'],
    preheader: 'Votre formalité a été validée.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Bonne nouvelle : votre formalité liée au dossier {{dossierNumber}} est validée.',
      'Société : {{companyName}}',
      '',
      'Accéder à mon espace : {{dashboardUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Votre formalité pour le dossier <strong>{{dossierNumber}}</strong> est validée{{companyName}}.</p>
      <p style="margin:0 0 16px;">Vous retrouverez vos documents et l’historique de suivi dans votre espace Greffio.</p>
      ${ctaButton('Accéder à mon espace', '{{dashboardUrl}}')}
    `,
  }),

  dossier_blocked: defineTemplate({
    subject: 'Action requise sur votre dossier Greffio',
    tags: ['dossier', 'urgent', 'action'],
    requiredVariables: ['firstName', 'dossierNumber', 'blockReason', 'actionRequired', 'actionUrl'],
    preheader: 'Une action est requise sur votre dossier.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Votre dossier {{dossierNumber}} nécessite une action de votre part.',
      'Motif : {{blockReason}}',
      'Action attendue : {{actionRequired}}',
      'Échéance : {{deadline}}',
      '',
      'Agir maintenant : {{actionUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Votre dossier <strong>{{dossierNumber}}</strong> nécessite une action pour reprendre son traitement.</p>
      <p style="margin:0 0 8px;"><strong>Motif :</strong> {{blockReason}}</p>
      <p style="margin:0 0 8px;"><strong>Action attendue :</strong> {{actionRequired}}</p>
      <p style="margin:0 0 16px;"><strong>Échéance :</strong> {{deadline}}</p>
      ${ctaButton('Agir sur mon dossier', '{{actionUrl}}')}
    `,
  }),

  payment_confirmed: defineTemplate({
    subject: 'Paiement confirmé — Greffio',
    tags: ['payment', 'billing'],
    requiredVariables: ['firstName', 'amount', 'paymentDate'],
    preheader: 'Votre paiement a été confirmé.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Nous confirmons la réception de votre paiement de {{amount}} le {{paymentDate}}.',
      'Dossier : {{dossierNumber}}',
      '',
      'Voir la facture : {{invoiceUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Votre paiement de <strong>{{amount}}</strong> a bien été enregistré le <strong>{{paymentDate}}</strong>.</p>
      <p style="margin:0 0 16px;">Dossier concerné : {{dossierNumber}}</p>
      ${ctaButton('Voir ma facture', '{{invoiceUrl}}')}
    `,
  }),

  payment_failed: defineTemplate({
    subject: 'Votre paiement n’a pas abouti',
    tags: ['payment', 'billing', 'action'],
    requiredVariables: ['firstName', 'amount', 'retryPaymentUrl'],
    preheader: 'Votre paiement n’a pas pu être validé.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Votre paiement de {{amount}} n’a pas pu être validé.',
      'Réessayer : {{retryPaymentUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Votre paiement de <strong>{{amount}}</strong> n’a pas pu être finalisé. Aucun débit définitif n’a été enregistré.</p>
      ${ctaButton('Réessayer le paiement', '{{retryPaymentUrl}}')}
      <p style="margin:16px 0 0;font-size:14px;color:#64748b;">Besoin d’aide ? <a href="{{supportUrl}}" style="color:#214082;">Contactez le support</a>.</p>
    `,
  }),

  invoice_available: defineTemplate({
    subject: 'Votre facture Greffio est disponible',
    tags: ['payment', 'billing'],
    requiredVariables: ['firstName', 'invoiceNumber', 'invoiceUrl', 'billingDate'],
    preheader: 'Votre facture est disponible.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Votre facture n° {{invoiceNumber}} du {{billingDate}} est disponible.',
      'Télécharger : {{invoiceUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Votre facture n° <strong>{{invoiceNumber}}</strong> du <strong>{{billingDate}}</strong> est disponible dans votre espace.</p>
      ${ctaButton('Télécharger ma facture', '{{invoiceUrl}}')}
    `,
  }),

  support_request_received: defineTemplate({
    subject: 'Nous avons bien reçu votre demande',
    tags: ['support'],
    requiredVariables: ['firstName', 'ticketNumber'],
    preheader: 'Votre demande a bien été reçue.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Nous avons bien reçu votre demande (réf. {{ticketNumber}}).',
      'Réponse attendue : {{expectedResponseTime}}',
      '',
      'Voir ma demande : {{supportUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Nous confirmons la réception de votre message. Référence : <strong>{{ticketNumber}}</strong>.</p>
      <p style="margin:0 0 16px;">L’équipe Greffio vous répondra sous <strong>{{expectedResponseTime}}</strong>.</p>
      ${ctaButton('Voir ma demande', '{{supportUrl}}')}
    `,
  }),

  support_reply_available: defineTemplate({
    subject: 'Une réponse vous attend sur Greffio',
    tags: ['support'],
    requiredVariables: ['firstName', 'ticketNumber', 'replyUrl'],
    preheader: 'Une réponse est disponible.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Une réponse est disponible pour votre demande {{ticketNumber}}.',
      'Consulter : {{replyUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">L’équipe Greffio a répondu à votre demande <strong>{{ticketNumber}}</strong>.</p>
      ${ctaButton('Lire la réponse', '{{replyUrl}}')}
    `,
  }),

  satisfaction_request: defineTemplate({
    subject: 'Votre avis nous aide à améliorer Greffio',
    tags: ['support', 'feedback'],
    requiredVariables: ['firstName', 'dossierNumber', 'ratingUrl'],
    preheader: 'Partagez votre retour d’expérience.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Votre dossier {{dossierNumber}} est finalisé. Votre avis nous aide à améliorer Greffio.',
      'Donner mon avis : {{ratingUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Votre dossier <strong>{{dossierNumber}}</strong> est finalisé. Si vous avez une minute, votre retour nous est précieux.</p>
      ${ctaButton('Donner mon avis', '{{ratingUrl}}')}
    `,
  }),

  ops_new_dossier: defineTemplate({
    subject: 'Nouveau dossier à traiter — {{dossierNumber}}',
    tags: ['ops', 'internal'],
    requiredVariables: ['dossierNumber', 'clientName', 'formalityType', 'opsUrl'],
    preheader: 'Nouveau dossier OPS.',
    textLines: [
      'Nouveau dossier à traiter.',
      'Référence : {{dossierNumber}}',
      'Client : {{clientName}}',
      'Formalité : {{formalityType}}',
      'Score de risque : {{riskScore}}',
      '',
      'Ouvrir : {{opsUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;"><strong>Nouveau dossier à traiter</strong></p>
      <p style="margin:0 0 8px;">Référence : {{dossierNumber}}</p>
      <p style="margin:0 0 8px;">Client : {{clientName}}</p>
      <p style="margin:0 0 8px;">Formalité : {{formalityType}}</p>
      <p style="margin:0 0 16px;">Score de risque : {{riskScore}}</p>
      ${ctaButton('Ouvrir dans OPS', '{{opsUrl}}')}
    `,
  }),

  ops_risk_alert: defineTemplate({
    subject: 'Dossier à risque élevé — {{dossierNumber}}',
    tags: ['ops', 'internal', 'alert'],
    requiredVariables: ['dossierNumber', 'riskScore', 'opsUrl'],
    preheader: 'Alerte dossier à risque.',
    textLines: [
      'Dossier à risque élevé : {{dossierNumber}}',
      'Score : {{riskScore}}',
      'Éléments manquants : {{missingItems}}',
      'Identité : {{identityStatus}}',
      '',
      'Ouvrir : {{opsUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;"><strong>Alerte — dossier à risque élevé</strong></p>
      <p style="margin:0 0 8px;">Référence : {{dossierNumber}}</p>
      <p style="margin:0 0 8px;">Score : {{riskScore}}</p>
      <p style="margin:0 0 8px;">Manquants : {{missingItems}}</p>
      <p style="margin:0 0 16px;">Identité : {{identityStatus}}</p>
      ${ctaButton('Traiter le dossier', '{{opsUrl}}')}
    `,
  }),

  ops_system_error: defineTemplate({
    subject: 'Erreur critique Greffio',
    tags: ['ops', 'internal', 'system'],
    requiredVariables: ['errorCode', 'serviceName', 'occurredAt'],
    preheader: 'Alerte système Greffio.',
    textLines: [
      'Erreur critique détectée.',
      'Code : {{errorCode}}',
      'Service : {{serviceName}}',
      'Date : {{occurredAt}}',
      '',
      'Tableau de bord : {{dashboardUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;"><strong>Erreur critique Greffio</strong></p>
      <p style="margin:0 0 8px;">Code : {{errorCode}}</p>
      <p style="margin:0 0 8px;">Service : {{serviceName}}</p>
      <p style="margin:0 0 16px;">Date : {{occurredAt}}</p>
      ${ctaButton('Ouvrir OPS', '{{dashboardUrl}}')}
    `,
  }),
});

export { transactionalTemplates };

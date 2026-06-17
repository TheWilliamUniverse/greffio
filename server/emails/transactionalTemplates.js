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

  admin_invitation: defineTemplate({
    subject: 'Votre accès administrateur Greffio',
    tags: ['auth', 'admin', 'onboarding'],
    requiredVariables: ['firstName', 'jobTitle', 'loginUrl', 'accountActionLabel', 'accountActionUrl', 'dashboardUrl'],
    preheader: 'Votre compte administrateur Greffio est prêt.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Votre compte Greffio a été configuré avec un accès administrateur.',
      'Fonction : {{jobTitle}}',
      '',
      '{{accountActionLabel}} : {{accountActionUrl}}',
      '',
      'Page de connexion : {{loginUrl}}',
      'Espace de travail : {{dashboardUrl}}',
      '',
      'En tant qu’administrateur, vous pouvez gérer les dossiers clients, suivre les formalités et accéder aux outils opérationnels Greffio.',
      '',
      'Besoin d’aide ? {{supportUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Votre compte Greffio a été configuré avec un accès <strong>administrateur</strong>.</p>
      <table role="presentation" width="100%" style="margin:0 0 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
        <tr><td style="padding:14px 16px;font-size:14px;"><strong>Fonction</strong><br/>{{jobTitle}}</td></tr>
        <tr><td style="padding:0 16px 14px;font-size:14px;"><strong>Connexion</strong><br/><a href="{{loginUrl}}" style="color:#214082;">{{loginUrl}}</a></td></tr>
      </table>
      ${ctaButton('{{accountActionLabel}}', '{{accountActionUrl}}')}
      <p style="margin:0 0 16px;font-size:14px;color:#64748b;">Espace de travail : <a href="{{dashboardUrl}}" style="color:#214082;">{{dashboardUrl}}</a></p>
      <p style="margin:0;font-size:14px;color:#64748b;">En tant qu’administrateur, vous pouvez gérer les dossiers clients, suivre les formalités et accéder aux outils opérationnels Greffio.</p>
    `,
  }),

  credentials_direct: defineTemplate({
    subject: 'Vos identifiants temporaires Greffio',
    tags: ['auth', 'credentials'],
    requiredVariables: ['firstName', 'loginUrl', 'temporaryPassword', 'roleLabel'],
    preheader: 'Vos identifiants temporaires Greffio.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Votre compte Greffio a été actualisé.',
      'Profil : {{roleLabel}}',
      '',
      'Page de connexion : {{loginUrl}}',
      'Mot de passe temporaire : {{temporaryPassword}}',
      '',
      'Changez ce mot de passe dès votre première connexion.',
      'Besoin d’aide ? {{supportUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Votre compte Greffio a été actualisé. Voici vos identifiants temporaires.</p>
      <table role="presentation" width="100%" style="margin:0 0 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
        <tr><td style="padding:14px 16px;font-size:14px;"><strong>Profil</strong><br/>{{roleLabel}}</td></tr>
        <tr><td style="padding:0 16px 14px;font-size:14px;"><strong>Connexion</strong><br/><a href="{{loginUrl}}" style="color:#214082;">{{loginUrl}}</a></td></tr>
        <tr><td style="padding:0 16px 14px;font-size:14px;"><strong>Mot de passe temporaire</strong><br/><span style="font-family:monospace;font-size:16px;">{{temporaryPassword}}</span></td></tr>
      </table>
      ${ctaButton('Se connecter', '{{loginUrl}}')}
      <p style="margin:16px 0 0;font-size:14px;color:#64748b;">Changez ce mot de passe dès votre première connexion.</p>
    `,
  }),

  credentials_secured: defineTemplate({
    subject: 'Accès sécurisé – identifiants Greffio',
    tags: ['auth', 'credentials', 'security'],
    requiredVariables: ['firstName', 'unlockUrl', 'phoneMasked', 'expirationMinutes', 'loginUrl'],
    preheader: 'Déverrouillez vos identifiants avec le code SMS.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Votre compte Greffio a été actualisé.',
      'Pour des raisons de sécurité, votre mot de passe temporaire n’est pas inclus dans cet email.',
      '',
      'Un code de vérification a été envoyé par SMS au numéro se terminant par {{phoneMasked}}.',
      'Ouvrez le lien sécurisé et saisissez ce code pour afficher vos identifiants :',
      '{{unlockUrl}}',
      '',
      'Lien valable {{expirationMinutes}} minutes.',
      'Page de connexion : {{loginUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Votre compte Greffio a été actualisé. Pour protéger vos identifiants, le mot de passe temporaire <strong>n’est pas affiché dans cet email</strong>.</p>
      <p style="margin:0 0 16px;">Un code de vérification a été envoyé par SMS au numéro se terminant par <strong>{{phoneMasked}}</strong>.</p>
      ${ctaButton('Déverrouiller mes identifiants', '{{unlockUrl}}')}
      <p style="margin:16px 0 0;font-size:14px;color:#64748b;">Ce lien est valable <strong>{{expirationMinutes}} minutes</strong>. Saisissez ensuite le code reçu par SMS pour afficher votre mot de passe temporaire.</p>
      <p style="margin:8px 0 0;font-size:14px;color:#64748b;">Connexion : <a href="{{loginUrl}}" style="color:#214082;">{{loginUrl}}</a></p>
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

  dossier_resume_reminder: defineTemplate({
    subject: 'Reprenez votre démarche de création',
    tags: ['dossier', 'reminder', 'onboarding'],
    requiredVariables: ['firstName', 'dossierNumber', 'formalityType', 'continueUrl'],
    preheader: 'Votre démarche Greffio est enregistrée – reprenez quand vous le souhaitez.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Vous avez commencé une démarche sur Greffio. Votre avancement est enregistré.',
      'Référence : {{dossierNumber}}',
      'Formalité : {{formalityType}}',
      '',
      'Reprenez votre questionnaire à tout moment : {{continueUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Vous avez entamé une démarche sur Greffio. Votre progression est sauvegardée : vous pouvez la reprendre quand vous le souhaitez.</p>
      <p style="margin:0 0 8px;"><strong>Référence :</strong> {{dossierNumber}}</p>
      <p style="margin:0 0 16px;"><strong>Formalité :</strong> {{formalityType}}</p>
      <p style="margin:0 0 16px;">Il reste quelques informations à compléter pour finaliser votre dossier.</p>
      ${ctaButton('Reprendre ma démarche', '{{continueUrl}}')}
    `,
  }),

  dossier_created: defineTemplate({
    subject: 'Votre dossier Greffio a été créé',
    tags: ['dossier', 'onboarding'],
    requiredVariables: ['firstName', 'dossierNumber', 'formalityType', 'dashboardUrl'],
    preheader: 'Votre dossier Greffio est validé.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Votre dossier Greffio a bien été validé et enregistré.',
      'Numéro de dossier : {{dossierNumber}}',
      'Formalité : {{formalityType}}',
      '',
      'Accéder à mon dossier : {{dashboardUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Votre dossier Greffio a été validé. Nous pouvons maintenant préparer vos documents et la suite de votre formalité.</p>
      <p style="margin:0 0 8px;"><strong>Référence :</strong> {{dossierNumber}}</p>
      <p style="margin:0 0 16px;"><strong>Formalité :</strong> {{formalityType}}</p>
      <p style="margin:0 0 16px;">Prochaine étape : génération de vos documents et dépôt de vos pièces depuis votre espace.</p>
      ${ctaButton('Accéder à mon dossier', '{{dashboardUrl}}')}
    `,
  }),

  ops_message: defineTemplate({
    subject: '{{subject}}',
    tags: ['dossier', 'ops', 'message'],
    requiredVariables: ['messageBody', 'continueUrl'],
    preheader: 'Un message de l’équipe Greffio.',
    textLines: [
      'Bonjour,',
      '',
      '{{opsAuthor}} vous écrit :',
      '',
      '{{messageBody}}',
      '',
      'Répondre ou consulter votre dossier : {{continueUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour,</p>
      <p style="margin:0 0 8px;font-size:14px;color:#64748b;">Message de <strong>{{opsAuthor}}</strong></p>
      <p style="margin:0 0 16px;padding:14px 16px;background:#f8fafc;border-radius:12px;line-height:1.6;">{{messageBody}}</p>
      ${ctaButton('Ouvrir mon dossier', '{{continueUrl}}')}
    `,
  }),

  dossier_incomplete: defineTemplate({
    subject: 'Reprenez votre démarche de création',
    tags: ['dossier', 'reminder'],
    requiredVariables: ['firstName', 'dossierNumber', 'continueUrl'],
    preheader: 'Votre dossier Greffio attend la suite de votre démarche.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Votre dossier {{dossierNumber}} est en cours. Reprenez votre démarche pour avancer :',
      '{{missingItems}}',
      '',
      'Reprendre ma démarche : {{continueUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Votre dossier <strong>{{dossierNumber}}</strong> est enregistré sur Greffio. Reprenez votre démarche de création pour finaliser les informations restantes :</p>
      <p style="margin:0 0 16px;">{{missingItems}}</p>
      ${ctaButton('Reprendre ma démarche', '{{continueUrl}}')}
      <p style="margin:16px 0 0;font-size:14px;color:#64748b;">L’équipe Greffio reste disponible si vous avez une question.</p>
    `,
  }),

  weekly_digest: defineTemplate({
    subject: 'Récapitulatif hebdomadaire de vos dossiers Greffio',
    tags: ['dossier', 'digest'],
    requiredVariables: ['firstName', 'dossierCount', 'summaryItems', 'continueUrl'],
    preheader: 'Vos dossiers en attente, regroupés en un seul email.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Voici le récapitulatif de vos {{dossierCount}} dossier(s) en attente d’action :',
      '{{summaryItems}}',
      '',
      'Ouvrir mon espace : {{continueUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Récapitulatif de vos <strong>{{dossierCount}}</strong> dossier(s) en attente :</p>
      <p style="margin:0 0 16px;padding:14px 16px;background:#f8fafc;border-radius:12px;line-height:1.6;white-space:pre-line;">{{summaryItems}}</p>
      ${ctaButton('Ouvrir mon espace', '{{continueUrl}}')}
      <p style="margin:16px 0 0;font-size:14px;color:#64748b;">Vous pouvez désactiver ce digest ou les relances depuis votre profil Greffio.</p>
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
    requiredVariables: ['firstName', 'dossierNumber', 'statutesUrl'],
    preheader: 'Votre projet de statuts est disponible.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Votre projet de statuts pour le dossier {{dossierNumber}} est prêt à être consulté.',
      '',
      'Merci de relire attentivement vos statuts avant signature ou dépôt.',
      '',
      'Nous vous remercions.',
      '',
      'Consulter mon projet : {{statutesUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Votre projet de statuts pour le dossier <strong>{{dossierNumber}}</strong> est prêt à être consulté.</p>
      <p style="margin:0 0 16px;">Merci de relire attentivement vos statuts avant signature ou dépôt.</p>
      <p style="margin:0 0 20px;">Nous vous remercions.</p>
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
    subject: 'Paiement confirmé – Greffio',
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
    subject: 'Nouveau dossier à traiter – {{dossierNumber}}',
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
    subject: 'Dossier à risque élevé – {{dossierNumber}}',
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
      <p style="margin:0 0 16px;"><strong>Alerte – dossier à risque élevé</strong></p>
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

  resource_order_received: defineTemplate({
    subject: 'Demande enregistrée – {{service_title}}',
    tags: ['resource_order', 'customer'],
    requiredVariables: ['firstName', 'service_title', 'order_id', 'price_label', 'resources_url', 'payment_url'],
    preheader: 'Votre demande de document a bien été enregistrée.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Nous avons bien enregistré votre demande : {{service_title}}.',
      'Référence commande : {{order_id}}',
      'Montant : {{price_label}}',
      '',
      'Finalisez le paiement si nécessaire : {{payment_url}}',
      'Retour aux ressources : {{resources_url}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Votre demande <strong>{{service_title}}</strong> est enregistrée (réf. {{order_id}}).</p>
      <p style="margin:0 0 16px;">Montant indicatif : <strong>{{price_label}}</strong></p>
      ${ctaButton('Finaliser ma commande', '{{payment_url}}')}
      <p style="margin:16px 0 0;font-size:14px;color:#64748b;"><a href="{{resources_url}}">Retour aux ressources Greffio</a></p>
    `,
  }),

  non_conviction_signature_request: defineTemplate({
    subject: 'Demande de signature électronique - Déclaration de non-condamnation et de filiation',
    tags: ['signature', 'non_conviction'],
    requiredVariables: ['firstName', 'companyName', 'signingLink'],
    preheader: 'Un document Greffio attend votre signature.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Une déclaration de non-condamnation et de filiation est prête à être signée dans Greffio.',
      '',
      'Document : Déclaration de non-condamnation et de filiation',
      'Dossier : {{companyName}}',
      '',
      'Signer le document : {{signingLink}}',
      '',
      'Ce lien est personnel et peut expirer pour des raisons de sécurité.',
      '',
      'Greffio',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Une <strong>déclaration de non-condamnation et de filiation</strong> est prête à être signée dans Greffio.</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Dossier :</strong> {{companyName}}</p>
      ${ctaButton('Signer le document', '{{signingLink}}')}
      <p style="margin:16px 0 0;font-size:13px;color:#64748b;">Ce lien est personnel et peut expirer pour des raisons de sécurité.</p>
    `,
  }),

  non_conviction_signature_completed: defineTemplate({
    subject: 'Document signé - Déclaration de non-condamnation et de filiation',
    tags: ['signature', 'non_conviction'],
    requiredVariables: ['firstName', 'companyName', 'signedDownloadLink'],
    preheader: 'Votre déclaration a été signée.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Votre déclaration de non-condamnation et de filiation a été signée électroniquement.',
      'Dossier : {{companyName}}',
      '',
      'Retrouvez le document dans votre espace Greffio : {{signedDownloadLink}}',
      '',
      'Greffio',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Votre <strong>déclaration de non-condamnation et de filiation</strong> a été signée électroniquement.</p>
      <p style="margin:0 0 16px;font-size:14px;">Dossier : {{companyName}}</p>
      ${ctaButton('Accéder à mes documents', '{{signedDownloadLink}}')}
    `,
  }),

  editable_document_signature_request: defineTemplate({
    subject: 'Demande de signature électronique - {{documentTitle}}',
    tags: ['signature', 'editable_document'],
    requiredVariables: ['firstName', 'companyName', 'signingLink', 'documentTitle'],
    preheader: 'Un document Greffio attend votre signature.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Le document « {{documentTitle}} » est prêt à être signé dans Greffio.',
      '',
      'Dossier : {{companyName}}',
      '',
      'Signer le document : {{signingLink}}',
      '',
      'Greffio',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Le document <strong>{{documentTitle}}</strong> est prêt à être signé dans Greffio.</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Dossier :</strong> {{companyName}}</p>
      ${ctaButton('Signer le document', '{{signingLink}}')}
    `,
  }),

  editable_document_signature_completed: defineTemplate({
    subject: 'Document signé - {{documentTitle}}',
    tags: ['signature', 'editable_document'],
    requiredVariables: ['firstName', 'companyName', 'signedDownloadLink', 'documentTitle'],
    preheader: 'Votre document a été signé.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Votre document « {{documentTitle}} » a été signé électroniquement.',
      'Dossier : {{companyName}}',
      '',
      'Retrouvez le document : {{signedDownloadLink}}',
      '',
      'Greffio',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Votre document <strong>{{documentTitle}}</strong> a été signé électroniquement.</p>
      <p style="margin:0 0 16px;font-size:14px;">Dossier : {{companyName}}</p>
      ${ctaButton('Accéder à mes documents', '{{signedDownloadLink}}')}
    `,
  }),

  subscribers_list_signature_request: defineTemplate({
    subject: 'Demande de signature – Liste des souscripteurs',
    tags: ['signature', 'subscribers_list'],
    requiredVariables: ['firstName', 'companyName', 'signingLink'],
    preheader: 'Votre liste des souscripteurs attend votre signature.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'La liste des souscripteurs de votre société est prête à être signée dans Greffio.',
      'Dossier : {{companyName}}',
      '',
      'Signer le document : {{signingLink}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">La <strong>liste des souscripteurs</strong> est prête à être signée électroniquement.</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Dossier :</strong> {{companyName}}</p>
      ${ctaButton('Signer la liste des souscripteurs', '{{signingLink}}')}
    `,
  }),

  subscribers_list_signature_completed: defineTemplate({
    subject: 'Document signé – Liste des souscripteurs',
    tags: ['signature', 'subscribers_list'],
    requiredVariables: ['firstName', 'companyName', 'signedDownloadLink'],
    preheader: 'Votre liste des souscripteurs a été signée.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Votre liste des souscripteurs a été signée électroniquement.',
      'Dossier : {{companyName}}',
      '',
      'Retrouvez le document : {{signedDownloadLink}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Votre <strong>liste des souscripteurs</strong> a été signée électroniquement.</p>
      ${ctaButton('Accéder à mes documents', '{{signedDownloadLink}}')}
    `,
  }),

  formality_powers_signature_request: defineTemplate({
    subject: 'Demande de signature – Procuration et pouvoirs pour formalités',
    tags: ['signature', 'formality_powers'],
    requiredVariables: ['firstName', 'companyName', 'signingLink'],
    preheader: 'Votre procuration Greffio attend votre signature.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'La procuration et les pouvoirs pour formalités sont prêts à être signés dans Greffio.',
      'Dossier : {{companyName}}',
      '',
      'Signer le document : {{signingLink}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">La <strong>procuration et les pouvoirs pour formalités</strong> sont prêts à être signés.</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Dossier :</strong> {{companyName}}</p>
      ${ctaButton('Signer la procuration', '{{signingLink}}')}
    `,
  }),

  formality_powers_signature_completed: defineTemplate({
    subject: 'Document signé – Procuration et pouvoirs pour formalités',
    tags: ['signature', 'formality_powers'],
    requiredVariables: ['firstName', 'companyName', 'signedDownloadLink'],
    preheader: 'Votre procuration a été signée.',
    textLines: [
      'Bonjour {{firstName}},',
      '',
      'Votre procuration et pouvoirs pour formalités ont été signés électroniquement.',
      'Dossier : {{companyName}}',
      '',
      'Retrouvez le document : {{signedDownloadLink}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>{{firstName}}</strong>,</p>
      <p style="margin:0 0 16px;">Votre <strong>procuration et pouvoirs pour formalités</strong> ont été signés électroniquement.</p>
      ${ctaButton('Accéder à mes documents', '{{signedDownloadLink}}')}
    `,
  }),

  ops_invoice_pending_review: defineTemplate({
    subject: 'Facture à valider – {{invoiceNumber}} ({{dossierReference}})',
    tags: ['ops', 'invoice', 'pending_review'],
    requiredVariables: ['invoiceNumber', 'amountLabel', 'dossierReference', 'reviewUrl'],
    preheader: 'Une facture auto-générée attend votre validation avant envoi client.',
    textLines: [
      'Une facture a été générée automatiquement après paiement client.',
      '',
      'Facture : {{invoiceNumber}}',
      'Montant : {{amountLabel}}',
      'Dossier : {{dossierReference}}',
      '',
      'Valider avant envoi client : {{reviewUrl}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;">Une facture a été générée automatiquement après paiement client et <strong>attend votre validation</strong> avant envoi.</p>
      <ul style="margin:0 0 16px;padding-left:20px;font-size:14px;line-height:1.6;">
        <li>Facture : <strong>{{invoiceNumber}}</strong></li>
        <li>Montant : <strong>{{amountLabel}}</strong></li>
        <li>Dossier : <strong>{{dossierReference}}</strong></li>
      </ul>
      ${ctaButton('Ouvrir la file de validation', '{{reviewUrl}}')}
    `,
  }),

  resource_order_internal: defineTemplate({
    subject: 'Nouvelle commande ressource – {{service_title}}',
    tags: ['ops', 'resource_order'],
    requiredVariables: ['order_id', 'service_title', 'contact_email', 'price_label', 'status'],
    preheader: 'Commande document/service Greffio.',
    textLines: [
      'Nouvelle commande ressource Greffio.',
      'ID : {{order_id}}',
      'Service : {{service_title}}',
      'Entreprise : {{company_name}}',
      'SIREN : {{siren}}',
      'Email client : {{contact_email}}',
      'Montant : {{price_label}}',
      'Statut : {{status}}',
      'Mode : {{fulfillment_mode}}',
      'Notes : {{notes}}',
      '',
      'File OPS : {{ops_url}}',
    ],
    bodyHtml: `
      <p style="margin:0 0 16px;"><strong>Nouvelle commande ressource</strong></p>
      <ul style="margin:0 0 16px;padding-left:20px;font-size:14px;line-height:1.6;">
        <li>ID : {{order_id}}</li>
        <li>Service : {{service_title}}</li>
        <li>Entreprise : {{company_name}}</li>
        <li>SIREN : {{siren}}</li>
        <li>Email : {{contact_email}}</li>
        <li>Montant : {{price_label}}</li>
        <li>Statut : {{status}}</li>
        <li>Traitement : {{fulfillment_mode}}</li>
      </ul>
      <p style="margin:0 0 16px;font-size:14px;">Notes : {{notes}}</p>
      ${ctaButton('Ouvrir la file OPS', '{{ops_url}}')}
    `,
  }),
});

export { transactionalTemplates };

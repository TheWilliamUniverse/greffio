import { transactionalTemplates } from './transactionalTemplates.js';
import { footerText, wrapGreffioEmail } from './templateBuilder.js';

const signatureBlockText = footerText;
const legacyHtml = (bodyHtml) => wrapGreffioEmail({ bodyHtml });

const legacyTemplates = Object.freeze({
  welcome: {
    subject: 'Dossier Greffio initialisé — Réf. {{reference_dossier}}',
    text: [
      'Bonjour {{prenom}},',
      '',
      'Votre dossier a bien été initialisé sur Greffio.',
      'Référence dossier : {{reference_dossier}}',
      '',
      'Vous pouvez reprendre votre dossier ici : {{lien_espace_client}}',
      '',
      signatureBlockText,
    ].join('\n'),
    html: wrapGreffioEmail({ bodyHtml: `<p>Bonjour {{prenom}},</p><p>Votre dossier a bien été initialisé sur Greffio.<br/>Référence dossier : <strong>{{reference_dossier}}</strong></p><p>Vous pouvez reprendre votre dossier ici : <a href="{{lien_espace_client}}">{{lien_espace_client}}</a></p>` }),
    requiredVariables: ['prenom', 'reference_dossier', 'lien_espace_client'],
  },
  contact_confirmed: {
    subject: 'Vos coordonnées ont bien été enregistrées — Réf. {{reference_dossier}}',
    text: [
      'Bonjour {{prenom}},',
      '',
      'Nous confirmons l’enregistrement de vos coordonnées.',
      'Référence : {{reference_dossier}}',
      'Prénom : {{prenom}}',
      'Nom : {{nom}}',
      'Email : {{email}}',
      'Téléphone : {{telephone}}',
      '',
      'Continuez votre parcours : {{lien_espace_client}}',
      '',
      signatureBlockText,
    ].join('\n'),
    html: legacyHtml(`
      <p>Bonjour {{prenom}},</p>
      <p>Nous confirmons l’enregistrement de vos coordonnées.<br/>Référence : <strong>{{reference_dossier}}</strong></p>
      <ul>
        <li>Prénom : {{prenom}}</li>
        <li>Nom : {{nom}}</li>
        <li>Email : {{email}}</li>
        <li>Téléphone : {{telephone}}</li>
      </ul>
      <p>Continuez votre parcours : <a href="{{lien_espace_client}}">{{lien_espace_client}}</a></p>
    `),
    requiredVariables: ['prenom', 'nom', 'email', 'telephone', 'reference_dossier', 'lien_espace_client'],
  },
  documents_requested: {
    subject: 'Documents à transmettre — Réf. {{reference_dossier}}',
    text: [
      'Bonjour {{prenom}},',
      '',
      'Pour poursuivre votre dossier, nous avons besoin des documents suivants :',
      '{{liste_documents_requis}}',
      '',
      'Merci de transmettre des fichiers PDF lisibles, complets et clairement nommés.',
      'Dépôt : {{lien_espace_client}}',
      '',
      signatureBlockText,
    ].join('\n'),
    html: legacyHtml(`
      <p>Bonjour {{prenom}},</p>
      <p>Pour poursuivre votre dossier, nous avons besoin des documents suivants :</p>
      <p>{{liste_documents_requis}}</p>
      <p>Merci de transmettre des fichiers PDF lisibles, complets et clairement nommés.<br/>Dépôt : <a href="{{lien_espace_client}}">{{lien_espace_client}}</a></p>
    `),
    requiredVariables: ['prenom', 'reference_dossier', 'lien_espace_client'],
  },
  documents_received: {
    subject: 'Vos documents ont bien été reçus — Réf. {{reference_dossier}}',
    text: 'Bonjour {{prenom}}, vos documents ont bien été reçus.',
    html: legacyHtml(`<p>Bonjour {{prenom}}, vos documents ont bien été reçus.</p>`),
    requiredVariables: ['prenom', 'reference_dossier'],
  },
  document_invalid: {
    subject: 'Action requise : document à corriger — Réf. {{reference_dossier}}',
    text: 'Bonjour {{prenom}}, un document nécessite une correction : {{motif_complement}}',
    html: legacyHtml(`<p>Bonjour {{prenom}}, un document nécessite une correction : {{motif_complement}}</p>`),
    requiredVariables: ['prenom', 'reference_dossier', 'motif_complement'],
  },
  mandate_required: {
    subject: 'Signature de votre procuration requise — Réf. {{reference_dossier}}',
    text: 'Bonjour {{prenom}}, signez votre procuration ici : {{lien_signature_procuration}}',
    html: legacyHtml(`<p>Bonjour {{prenom}}, signez votre procuration ici : <a href="{{lien_signature_procuration}}">{{lien_signature_procuration}}</a></p>`),
    requiredVariables: ['prenom', 'reference_dossier', 'lien_signature_procuration'],
  },
  mandate_signed: {
    subject: 'Votre procuration a bien été signée — Réf. {{reference_dossier}}',
    text: 'Bonjour {{prenom}}, votre procuration Greffio a bien été signée.',
    html: legacyHtml(`<p>Bonjour {{prenom}}, votre procuration Greffio a bien été signée.</p>`),
    requiredVariables: ['prenom', 'reference_dossier'],
  },
  dossier_preparation: {
    subject: 'Votre dossier est en cours de préparation — Réf. {{reference_dossier}}',
    text: 'Bonjour {{prenom}}, votre dossier est en cours de préparation.',
    html: legacyHtml('<p>Bonjour {{prenom}}, votre dossier est en cours de préparation.</p>'),
    requiredVariables: ['prenom', 'reference_dossier'],
  },
  client_validation_required: {
    subject: 'Validation nécessaire avant dépôt — Réf. {{reference_dossier}}',
    text: 'Bonjour {{prenom}}, merci de valider votre dossier : {{lien_espace_client}}',
    html: legacyHtml('<p>Bonjour {{prenom}}, merci de valider votre dossier : <a href="{{lien_espace_client}}">{{lien_espace_client}}</a></p>'),
    requiredVariables: ['prenom', 'reference_dossier', 'lien_espace_client'],
  },
  validation_reminder: {
    subject: 'Relance — Validation finale nécessaire — Réf. {{reference_dossier}}',
    text: 'Bonjour {{prenom}}, nous attendons votre validation finale.',
    html: legacyHtml('<p>Bonjour {{prenom}}, nous attendons votre validation finale.</p>'),
    requiredVariables: ['prenom', 'reference_dossier'],
  },
  payment_required: {
    subject: 'Paiement requis pour poursuivre — Réf. {{reference_dossier}}',
    text: 'Bonjour {{prenom}}, merci d’effectuer le règlement : {{lien_paiement}}',
    html: legacyHtml('<p>Bonjour {{prenom}}, merci d’effectuer le règlement : <a href="{{lien_paiement}}">{{lien_paiement}}</a></p>'),
    requiredVariables: ['prenom', 'reference_dossier', 'lien_paiement'],
  },
  filed: {
    subject: 'Votre dossier a été déposé — Réf. {{reference_dossier}}',
    text: 'Bonjour {{prenom}}, votre dossier a été déposé.',
    html: legacyHtml('<p>Bonjour {{prenom}}, votre dossier a été déposé.</p>'),
    requiredVariables: ['prenom', 'reference_dossier'],
  },
  under_review: {
    subject: 'Suivi de votre formalité — Réf. {{reference_dossier}}',
    text: 'Bonjour {{prenom}}, votre dossier est en cours d’instruction.',
    html: legacyHtml('<p>Bonjour {{prenom}}, votre dossier est en cours d’instruction.</p>'),
    requiredVariables: ['prenom', 'reference_dossier'],
  },
  regularization_requested: {
    subject: 'Action requise : complément demandé — Réf. {{reference_dossier}}',
    text: 'Bonjour {{prenom}}, un complément est demandé : {{motif_complement}}',
    html: legacyHtml('<p>Bonjour {{prenom}}, un complément est demandé : {{motif_complement}}</p>'),
    requiredVariables: ['prenom', 'reference_dossier', 'motif_complement'],
  },
  regularization_submitted: {
    subject: 'Complément transmis — Réf. {{reference_dossier}}',
    text: 'Bonjour {{prenom}}, le complément demandé a été transmis.',
    html: legacyHtml('<p>Bonjour {{prenom}}, le complément demandé a été transmis.</p>'),
    requiredVariables: ['prenom', 'reference_dossier'],
  },
  rejected: {
    subject: 'Information importante sur votre dossier — Réf. {{reference_dossier}}',
    text: 'Bonjour {{prenom}}, votre dossier a été rejeté : {{motif_complement}}',
    html: legacyHtml('<p>Bonjour {{prenom}}, votre dossier a été rejeté : {{motif_complement}}</p>'),
    requiredVariables: ['prenom', 'reference_dossier', 'motif_complement'],
  },
  accepted: {
    subject: 'Votre formalité a été acceptée — Réf. {{reference_dossier}}',
    text: 'Bonjour {{prenom}}, votre formalité a été acceptée.',
    html: legacyHtml('<p>Bonjour {{prenom}}, votre formalité a été acceptée.</p>'),
    requiredVariables: ['prenom', 'reference_dossier'],
  },
  official_documents_available: {
    subject: 'Vos documents officiels sont disponibles — Réf. {{reference_dossier}}',
    text: 'Bonjour {{prenom}}, vos documents sont disponibles : {{lien_documents}}',
    html: legacyHtml('<p>Bonjour {{prenom}}, vos documents sont disponibles : <a href="{{lien_documents}}">{{lien_documents}}</a></p>'),
    requiredVariables: ['prenom', 'reference_dossier', 'lien_documents'],
  },
  inactive_reminder: {
    subject: 'Votre dossier est en attente — Réf. {{reference_dossier}}',
    text: 'Bonjour {{prenom}}, votre dossier est inactif, vous pouvez le reprendre : {{lien_espace_client}}',
    html: legacyHtml('<p>Bonjour {{prenom}}, votre dossier est inactif, vous pouvez le reprendre : <a href="{{lien_espace_client}}">{{lien_espace_client}}</a></p>'),
    requiredVariables: ['prenom', 'reference_dossier', 'lien_espace_client'],
  },
  statutes_ready: {
    subject: 'Vos statuts sont prêts à relire — Réf. {{reference_dossier}}',
    text: 'Bonjour {{prenom}}, vos statuts sont prêts à relire dans votre espace client.',
    html: legacyHtml('<p>Bonjour {{prenom}}, vos statuts sont prêts à relire dans votre espace client.</p>'),
    requiredVariables: ['prenom', 'reference_dossier'],
  },
  statutes_signed: {
    subject: 'Vos statuts signés ont bien été reçus — Réf. {{reference_dossier}}',
    text: 'Bonjour {{prenom}}, nous confirmons la réception des statuts signés.',
    html: legacyHtml('<p>Bonjour {{prenom}}, nous confirmons la réception des statuts signés.</p>'),
    requiredVariables: ['prenom', 'reference_dossier'],
  },
  capital_certificate_required: {
    subject: 'Attestation de dépôt de capital nécessaire — Réf. {{reference_dossier}}',
    text: 'Bonjour {{prenom}}, merci de transmettre votre attestation de dépôt de capital.',
    html: legacyHtml('<p>Bonjour {{prenom}}, merci de transmettre votre attestation de dépôt de capital.</p>'),
    requiredVariables: ['prenom', 'reference_dossier'],
  },
  registered_office_proof_required: {
    subject: 'Justificatif de siège social nécessaire — Réf. {{reference_dossier}}',
    text: 'Bonjour {{prenom}}, merci de transmettre le justificatif du siège social.',
    html: legacyHtml('<p>Bonjour {{prenom}}, merci de transmettre le justificatif du siège social.</p>'),
    requiredVariables: ['prenom', 'reference_dossier'],
  },
  legal_notice_required: {
    subject: 'Attestation d’annonce légale nécessaire — Réf. {{reference_dossier}}',
    text: 'Bonjour {{prenom}}, merci de transmettre l’attestation d’annonce légale.',
    html: legacyHtml('<p>Bonjour {{prenom}}, merci de transmettre l’attestation d’annonce légale.</p>'),
    requiredVariables: ['prenom', 'reference_dossier'],
  },
  beneficial_owners_required: {
    subject: 'Informations bénéficiaires effectifs requises — Réf. {{reference_dossier}}',
    text: 'Bonjour {{prenom}}, merci de compléter les informations sur les bénéficiaires effectifs.',
    html: legacyHtml('<p>Bonjour {{prenom}}, merci de compléter les informations sur les bénéficiaires effectifs.</p>'),
    requiredVariables: ['prenom', 'reference_dossier'],
  },
  regulated_activity_required: {
    subject: 'Document activité réglementée requis — Réf. {{reference_dossier}}',
    text: 'Bonjour {{prenom}}, un justificatif d’activité réglementée est nécessaire.',
    html: legacyHtml('<p>Bonjour {{prenom}}, un justificatif d’activité réglementée est nécessaire.</p>'),
    requiredVariables: ['prenom', 'reference_dossier'],
  },
  modification_started: {
    subject: 'Votre modification d’entreprise est initialisée — Réf. {{reference_dossier}}',
    text: 'Bonjour {{prenom}}, votre demande de modification est initialisée.',
    html: legacyHtml('<p>Bonjour {{prenom}}, votre demande de modification est initialisée.</p>'),
    requiredVariables: ['prenom', 'reference_dossier'],
  },
  modification_documents_required: {
    subject: 'Documents nécessaires pour votre modification — Réf. {{reference_dossier}}',
    text: 'Bonjour {{prenom}}, des documents sont nécessaires pour votre modification.',
    html: legacyHtml('<p>Bonjour {{prenom}}, des documents sont nécessaires pour votre modification.</p>'),
    requiredVariables: ['prenom', 'reference_dossier'],
  },
  support_received: {
    subject: 'Votre demande a bien été reçue',
    text: 'Bonjour {{prenom}}, nous avons bien reçu votre message.',
    html: legacyHtml('<p>Bonjour {{prenom}}, nous avons bien reçu votre message.</p>'),
    requiredVariables: ['prenom'],
  },
  password_reset: {
    subject: 'Réinitialisation de votre mot de passe Greffio',
    text: [
      'Bonjour {{prenom}},',
      '',
      'Nous avons reçu une demande de réinitialisation de votre mot de passe.',
      'Lien sécurisé (valable {{expiration_minutes}} minutes) : {{reset_link}}',
      '',
      "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.",
      '',
      signatureBlockText,
    ].join('\n'),
    html: legacyHtml(`
      <p>Bonjour {{prenom}},</p>
      <p>Nous avons reçu une demande de réinitialisation de votre mot de passe.</p>
      <p>Lien sécurisé (valable {{expiration_minutes}} minutes) : <a href="{{reset_link}}">{{reset_link}}</a></p>
      <p>Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.</p>
    `),
    requiredVariables: ['prenom', 'reset_link', 'expiration_minutes'],
  },
  booking_request_received: {
    subject: 'Demande de rendez-vous reçue - {{objet}}',
    text: [
      'Bonjour {{prenom}},',
      '',
      'Votre demande de rendez-vous a bien été reçue.',
      'Objet: {{objet}}',
      'Nous revenons vers vous rapidement.',
      '',
      signatureBlockText,
    ].join('\n'),
    html: legacyHtml(`
      <p>Bonjour {{prenom}},</p>
      <p>Votre demande de rendez-vous a bien été reçue.</p>
      <p><strong>Objet :</strong> {{objet}}</p>
      <p>Nous revenons vers vous rapidement.</p>
    `),
    requiredVariables: ['prenom', 'objet'],
  },
  booking_request_internal: {
    subject: 'Nouveau RDV Greffio - {{objet}}',
    text: [
      'Nouvelle demande de rendez-vous Greffio.',
      'Nom: {{nom_complet}}',
      'Entreprise: {{entreprise}}',
      'Email: {{email}}',
      'Téléphone: {{telephone}}',
      'Objet: {{objet}}',
      'Message: {{message}}',
      'Créneau souhaité: {{creneau_souhaite}}',
      'Source: {{source}}',
      '',
      'Lien agenda Google Workspace: {{google_calendar_link}}',
      '',
      signatureBlockText,
    ].join('\n'),
    html: legacyHtml(`
      <p>Nouvelle demande de rendez-vous Greffio.</p>
      <ul>
        <li>Nom : {{nom_complet}}</li>
        <li>Entreprise : {{entreprise}}</li>
        <li>Email : {{email}}</li>
        <li>Téléphone : {{telephone}}</li>
        <li>Objet : {{objet}}</li>
        <li>Créneau souhaité : {{creneau_souhaite}}</li>
        <li>Source : {{source}}</li>
      </ul>
      <p>{{message}}</p>
      <p>Lien agenda Google Workspace : <a href="{{google_calendar_link}}">{{google_calendar_link}}</a></p>
    `),
    requiredVariables: ['nom_complet', 'entreprise', 'email', 'telephone', 'objet', 'message', 'creneau_souhaite', 'source', 'google_calendar_link'],
  },
  out_of_scope_request: {
    subject: 'À propos de votre demande — Réf. {{reference_dossier}}',
    text: 'Bonjour {{prenom}}, cette demande sort du cadre de la mission administrative Greffio.',
    html: legacyHtml('<p>Bonjour {{prenom}}, cette demande sort du cadre de la mission administrative Greffio.</p>'),
    requiredVariables: ['prenom', 'reference_dossier'],
  },
});

const TEMPLATE_ALIASES = Object.freeze({
  support_received: 'support_request_received',
  statutes_ready: 'statutes_generated',
  accepted: 'dossier_approved',
  inactive_reminder: 'dossier_incomplete',
});

const templates = Object.freeze({
  ...legacyTemplates,
  ...transactionalTemplates,
});

const resolveTemplateKey = (templateKey) => TEMPLATE_ALIASES[templateKey] || templateKey;

const getTemplate = (templateKey) => templates[resolveTemplateKey(templateKey)] || null;

export {
  templates,
  legacyTemplates,
  getTemplate,
  resolveTemplateKey,
};

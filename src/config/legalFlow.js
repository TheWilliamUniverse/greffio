export const GREFFIO_CONTACT = {
  company: 'WILLIAM ESTABLISHMENTS',
  brand: 'Greffio',
  website: 'https://greffio.willentreprises.com',
  supportEmail: 'contact@willentreprises.com',
  supportPhone: '04 11 81 86 70',
};

export const INPI_UPLOAD_RULES = {
  maxFileSizeMb: 20,
  acceptedFormats: ['PDF'],
  oneDocumentPerFile: true,
  namingRule: 'Chaque fichier doit avoir un nom en lien direct avec son contenu.',
};

export const DEFAULT_REQUIRED_DOCUMENTS = [
  'Pièce d’identité en cours de validité',
  'Justificatif de domicile récent',
  'Procuration/mandat signé (si mandataire)',
];

export const CREATION_COMPANY_REQUIRED_DOCUMENTS = [
  'Statuts signés',
  'Attestation de dépôt du capital (si nécessaire)',
  'Attestation de parution annonce légale (si nécessaire)',
  'Déclaration des bénéficiaires effectifs (si nécessaire)',
  'Justificatif du siège social',
];

export const MODIFICATION_REQUIRED_DOCUMENTS = [
  'Procès-verbal de décision',
  'Statuts mis à jour (si concernés)',
  'Justificatif lié à la modification (siège, dirigeant, activité, etc.)',
  'Pièce d’identité du nouveau dirigeant (si concerné)',
  'Attestation de parution annonce légale (si requise)',
];

export const FILE_NAMING_EXAMPLES = [
  'Piece_identite_NOM_PRENOM.pdf',
  'Justificatif_domicile_NOM_PRENOM.pdf',
  'Procuration_Greffio_NOM_PRENOM.pdf',
  'Statuts_signes_DENOMINATION.pdf',
  'Attestation_depot_capital_DENOMINATION.pdf',
  'Attestation_annonce_legale_DENOMINATION.pdf',
  'Justificatif_siege_social_DENOMINATION.pdf',
  'Declaration_beneficiaires_effectifs_DENOMINATION.pdf',
];

export const WORKFLOW_STATUSES = [
  'DRAFT_STARTED',
  'CONTACT_SAVED',
  'QUESTIONNAIRE_IN_PROGRESS',
  'DOCUMENTS_REQUESTED',
  'DOCUMENTS_RECEIVED',
  'DOCUMENTS_MISSING',
  'MANDATE_SIGNATURE_REQUIRED',
  'MANDATE_SIGNED',
  'FILE_IN_REVIEW',
  'CLIENT_VALIDATION_REQUIRED',
  'PAYMENT_REQUIRED',
  'READY_TO_FILE',
  'FILED',
  'UNDER_REVIEW',
  'COMPLEMENT_REQUESTED',
  'COMPLEMENT_SENT',
  'REJECTED',
  'ACCEPTED',
  'DOCUMENTS_AVAILABLE',
  'CLOSED',
  'ABANDONED',
  'STATUTES_READY',
  'STATUTES_SIGNED_RECEIVED',
  'CAPITAL_CERTIFICATE_REQUIRED',
  'SEAT_PROOF_REQUIRED',
  'LEGAL_NOTICE_REQUIRED',
  'UBO_INFO_REQUIRED',
];

export const EMAIL_TEMPLATES = {
  DRAFT_STARTED: {
    subject: 'Votre dossier Greffio a bien ete initialise - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Votre dossier a bien ete initialise sur Greffio.
Reference de votre dossier : {{reference_dossier}}

Vous allez etre guide etape par etape afin de completer les informations necessaires a votre formalite d'entreprise.

Vous pouvez reprendre votre dossier a tout moment depuis votre espace :
{{lien_espace_client}}

Cordialement,
L'equipe Greffio`,
  },
  CONTACT_SAVED: {
    subject: 'Vos coordonnees ont bien ete enregistrees - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Nous vous confirmons que vos coordonnees ont bien ete enregistrees dans votre dossier Greffio.
Reference de votre dossier : {{reference_dossier}}

Prenom : {{prenom}}
Nom : {{nom}}
Email : {{email}}
Telephone : {{telephone}}

Cordialement,
L'equipe Greffio`,
  },
  QUESTIONNAIRE_IN_PROGRESS: {
    subject: 'Votre dossier est en cours de completion - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Votre dossier est en cours de completion.
Reference : {{reference_dossier}}

Le parcours est progressif : seules les questions utiles a votre situation vous sont affichees.
Vous pouvez reprendre votre dossier a tout moment :
{{lien_espace_client}}

Cordialement,
L'equipe Greffio`,
  },
  DOCUMENTS_REQUESTED: {
    subject: 'Documents a transmettre pour votre dossier - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Pour poursuivre la preparation de votre dossier, nous avons besoin des pieces justificatives suivantes :
{{liste_documents_requis}}

Merci de transmettre des fichiers PDF lisibles, complets, clairement nommes, dans la limite de 10 Mo par fichier.

{{lien_espace_client}}

Cordialement,
L'equipe Greffio`,
  },
  DOCUMENTS_RECEIVED: {
    subject: 'Vos documents ont bien ete recus - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Nous vous confirmons la bonne reception des documents transmis.
Reference : {{reference_dossier}}

Notre equipe lance la verification de coherence apparente (lisibilite, completude, coherence generale).

Cordialement,
L'equipe Greffio`,
  },
  DOCUMENTS_MISSING: {
    subject: 'Action requise : document a completer - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Un ou plusieurs elements doivent etre completes avant poursuite du dossier.
Reference : {{reference_dossier}}
Element(s) concerne(s) :
{{liste_documents_manquants}}

Merci de transmettre une version corrigee depuis :
{{lien_espace_client}}

Cordialement,
L'equipe Greffio`,
  },
  MANDATE_SIGNATURE_REQUIRED: {
    subject: 'Signature de votre procuration Greffio - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Pour que Greffio puisse deposer et suivre votre dossier pour votre compte, une procuration doit etre signee.

Vous pouvez lire et signer votre procuration ici :
{{lien_signature_procuration}}

Cordialement,
L'equipe Greffio`,
  },
  MANDATE_SIGNED: {
    subject: 'Votre procuration a bien ete signee - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Nous vous confirmons que votre procuration a bien ete signee.
Nous poursuivons le traitement de votre formalite.

Cordialement,
L'equipe Greffio`,
  },
  FILE_IN_REVIEW: {
    subject: 'Votre dossier est en cours de preparation - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Votre dossier est actuellement en cours de preparation par Greffio.
Reference : {{reference_dossier}}
Formalite : {{type_formalite}}
Forme juridique : {{forme_juridique}}

Nous revenons vers vous si un element complementaire est necessaire.

Cordialement,
L'equipe Greffio`,
  },
  CLIENT_VALIDATION_REQUIRED: {
    subject: 'Validation necessaire avant depot - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Votre dossier est pret pour verification avant depot.
Reference : {{reference_dossier}}

Merci de relire puis valider votre dossier ici :
{{lien_espace_client}}

Cordialement,
L'equipe Greffio`,
  },
  PAYMENT_REQUIRED: {
    subject: 'Paiement requis pour poursuivre votre formalite - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Pour poursuivre le traitement de votre dossier, un reglement est requis.
Reference : {{reference_dossier}}
Montant : {{montant_frais}}

Lien de paiement :
{{lien_paiement}}

Cordialement,
L'equipe Greffio`,
  },
  READY_TO_FILE: {
    subject: 'Votre dossier est pret au depot - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Votre dossier est complet et pret au depot.
Reference : {{reference_dossier}}

Nous procedons au depot selon votre validation et les modalites de mission.

Cordialement,
L'equipe Greffio`,
  },
  FILED: {
    subject: 'Votre dossier a ete depose - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Votre dossier a bien ete depose.
Organisme concerne : {{organisme}}
Date de depot : {{date_depot}}

Nous suivons l'instruction et vous tenons informe.

Cordialement,
L'equipe Greffio`,
  },
  UNDER_REVIEW: {
    subject: 'Suivi de votre formalite - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Votre dossier est en cours d'instruction par les organismes competents.
Reference : {{reference_dossier}}

Aucune action n'est requise de votre part pour le moment.

Cordialement,
L'equipe Greffio`,
  },
  COMPLEMENT_REQUESTED: {
    subject: 'Action requise : complement demande - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Un complement a ete demande par l'organisme en charge.
Reference : {{reference_dossier}}
Motif :
{{motif_complement}}

Merci de transmettre les elements via :
{{lien_espace_client}}

Cordialement,
L'equipe Greffio`,
  },
  COMPLEMENT_SENT: {
    subject: 'Le complement demande a ete transmis - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Nous confirmons la transmission du complement demande.
Reference : {{reference_dossier}}

Votre dossier est a nouveau en cours d'instruction.

Cordialement,
L'equipe Greffio`,
  },
  REJECTED: {
    subject: 'Information importante sur votre dossier - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Votre dossier a fait l'objet d'un rejet ou d'une impossibilite de traitement.
Reference : {{reference_dossier}}
Motif transmis :
{{motif_complement}}

Nous analysons les suites possibles dans le cadre de la mission confiee.

Cordialement,
L'equipe Greffio`,
  },
  ACCEPTED: {
    subject: 'Votre formalite a ete acceptee - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Votre formalite a ete acceptee.
Entreprise : {{denomination}}
SIREN : {{numero_siren}}
SIRET : {{numero_siret}}

Documents disponibles : {{lien_documents}}

Cordialement,
L'equipe Greffio`,
  },
  DOCUMENTS_AVAILABLE: {
    subject: 'Vos documents officiels sont disponibles - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Vos documents officiels sont disponibles.
Reference : {{reference_dossier}}

Acces aux documents :
{{lien_documents}}

Cordialement,
L'equipe Greffio`,
  },
  CLOSED: {
    subject: 'Cloture de votre dossier Greffio - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Votre dossier est desormais cloture.
Reference : {{reference_dossier}}

Vous pouvez conserver les documents depuis :
{{lien_documents}}

Cordialement,
L'equipe Greffio`,
  },
  ABANDONED: {
    subject: 'Souhaitez-vous poursuivre votre dossier Greffio ? - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Votre dossier est actuellement inactif.
Reference : {{reference_dossier}}

Vous pouvez le reprendre ici :
{{lien_espace_client}}

Cordialement,
L'equipe Greffio`,
  },
  STATUTES_READY: {
    subject: 'Vos statuts sont prets a etre relus - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Les statuts relatifs a votre projet sont prets a etre relus.
Reference : {{reference_dossier}}

Merci de verifier :
- denomination sociale ;
- forme juridique ;
- siege social ;
- objet social ;
- capital social ;
- repartition des titres ;
- identite du dirigeant.

Acces :
{{lien_espace_client}}

Cordialement,
L'equipe Greffio`,
  },
  STATUTES_SIGNED_RECEIVED: {
    subject: 'Vos statuts signes ont bien ete recus - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Nous confirmons la bonne reception de vos statuts signes.
Reference : {{reference_dossier}}

Nous poursuivons la constitution du dossier et revenons vers vous en cas de piece complementaire.

Cordialement,
L'equipe Greffio`,
  },
  CAPITAL_CERTIFICATE_REQUIRED: {
    subject: 'Attestation de depot de capital necessaire - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Pour finaliser votre dossier, nous avons besoin de l attestation de depot de capital social.
Reference : {{reference_dossier}}

Depot de document :
{{lien_espace_client}}

Cordialement,
L'equipe Greffio`,
  },
  SEAT_PROOF_REQUIRED: {
    subject: 'Justificatif de siege social necessaire - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Nous avons besoin d un justificatif relatif a l adresse du siege social.
Reference : {{reference_dossier}}

Depot de document :
{{lien_espace_client}}

Cordialement,
L'equipe Greffio`,
  },
  LEGAL_NOTICE_REQUIRED: {
    subject: 'Attestation d annonce legale necessaire - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Pour votre dossier de creation, merci de transmettre l attestation de parution d annonce legale.
Reference : {{reference_dossier}}

Depot de document :
{{lien_espace_client}}

Cordialement,
L'equipe Greffio`,
  },
  UBO_INFO_REQUIRED: {
    subject: 'Informations beneficiaires effectifs necessaires - Ref. {{reference_dossier}}',
    body: `Bonjour {{prenom}},

Des informations relatives aux beneficiaires effectifs sont necessaires pour poursuivre le dossier.
Reference : {{reference_dossier}}

Merci de completer ces informations depuis votre espace :
{{lien_espace_client}}

Cordialement,
L'equipe Greffio`,
  },
};

export const SHORT_NOTIFICATIONS = {
  ACTION_REQUIRED: 'Greffio - Votre dossier {{reference_dossier}} necessite une action. {{lien_espace_client}}',
  MANDATE_READY: 'Greffio - Votre procuration est prete a signer. {{lien_signature_procuration}}',
  FILED: 'Greffio - Votre dossier {{reference_dossier}} a bien ete depose.',
  ACCEPTED: 'Greffio - Votre formalite est acceptee. Documents : {{lien_documents}}',
};

export const MAIL_PLACEHOLDERS = [
  '{{prenom}}',
  '{{nom}}',
  '{{email}}',
  '{{telephone}}',
  '{{reference_dossier}}',
  '{{type_formalite}}',
  '{{forme_juridique}}',
  '{{denomination}}',
  '{{nom_commercial}}',
  '{{date_debut_activite}}',
  '{{adresse_siege}}',
  '{{lien_espace_client}}',
  '{{lien_signature_procuration}}',
  '{{liste_documents_manquants}}',
  '{{liste_documents_requis}}',
  '{{date_depot}}',
  '{{organisme}}',
  '{{greffe}}',
  '{{motif_complement}}',
  '{{delai_reponse}}',
  '{{lien_paiement}}',
  '{{montant_frais}}',
  '{{numero_siret}}',
  '{{numero_siren}}',
  '{{lien_documents}}',
  '{{contact_greffio}}',
];

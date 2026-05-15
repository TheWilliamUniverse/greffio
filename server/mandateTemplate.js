const buildMandateText = ({
  dossier,
  signerFullName,
  acceptedAt,
}) => {
  const company = dossier?.companyName || dossier?.denomination || 'Société en formation';
  const ref = dossier?.reference || dossier?.id || 'N/A';

  return `
PROCURATION / MANDAT GREFFIO
Référence dossier: ${ref}

MANDANT
Nom: ${signerFullName}

MANDATAIRE
WILLIAM ESTABLISHMENTS (Greffio)
SIREN: 102 230 414

OBJET DU MANDAT
Le Mandant autorise Greffio à préparer, déposer, suivre et, si nécessaire, régulariser la formalité d’entreprise concernée.

FORMALITE
Entreprise: ${company}
Type: ${dossier?.typeFormalite || dossier?.service || 'Formalité de création/modification'}
Forme juridique: ${dossier?.legalForm || dossier?.formeJuridique || 'À préciser'}

LIMITES
Greffio intervient en accompagnement administratif et technique. Greffio ne se substitue pas à un avocat, notaire ou expert-comptable.

CONSENTEMENT
Je reconnais avoir lu et compris la procuration ci-dessus. J’autorise WILLIAM ESTABLISHMENTS, opérant sous le nom Greffio, à préparer, déposer, suivre et, si nécessaire, régulariser mon dossier de formalité d’entreprise auprès du Guichet unique, du greffe compétent et des organismes concernés, sur la base des informations et documents que je fournis.

SIGNATURE
Signataire: ${signerFullName}
Date de signature: ${acceptedAt}
  `.trim();
};

export {
  buildMandateText,
};

export const SEO_DISCLAIMER =
  'Ces informations sont générales et ne remplacent pas un conseil adapté à votre situation. Greffio est un service privé d\'accompagnement aux formalités, distinct des services officiels de l\'État.';

export const SEO_PILLAR_PAGES = {
  'creation-entreprise': {
    path: '/creation-entreprise',
    title: 'Création d\'entreprise en France — démarches, documents et étapes | Greffio',
    description:
      'Comprendre les étapes de création d\'entreprise en France : choix de la forme juridique, documents, annonce légale, dépôt du dossier et suivi administratif.',
    h1: 'Création d\'entreprise en France : comprendre, préparer et suivre vos démarches',
    intro:
      'Créer une entreprise en France implique plusieurs étapes : choisir la forme juridique adaptée, rédiger les statuts, publier une annonce légale si nécessaire, constituer le dossier d\'immatriculation et le déposer via le guichet unique. Greffio aide les entrepreneurs à structurer ces étapes, préparer les documents et suivre l\'avancement sans perdre de vue les échéances administratives.',
    greffioBlock:
      'Greffio clarifie le parcours de création : questionnaire guidé, liste de pièces, relecture de complétude, suivi du dépôt et des retours du greffe.',
    sections: [
      {
        title: 'Les étapes essentielles d\'une création d\'entreprise',
        paragraphs: [
          'Après le choix de la forme (SASU, SAS, SARL, micro-entreprise, etc.), vous préparez les statuts, les pièces d\'identité, le justificatif de domiciliation et les éléments relatifs aux associés ou au dirigeant.',
          'L\'annonce légale et le dépôt au guichet unique INPI viennent ensuite, avant la réception du KBIS et l\'obtention du numéro SIREN.',
        ],
      },
      {
        title: 'Les documents généralement nécessaires',
        bullets: [
          'Statuts signés et attestations requises',
          'Pièce d\'identité du dirigeant et des associés le cas échéant',
          'Justificatif de domiciliation ou attestation de siège',
          'Attestation de dépôt de capital si applicable',
          'Attestation de parution de l\'annonce légale',
        ],
      },
      {
        title: 'Le rôle de l\'annonce légale',
        paragraphs: [
          'L\'annonce légale informe le public de la création ou de la modification d\'une société. Elle doit être publiée dans un journal habilité avant le dépôt du dossier d\'immatriculation pour la plupart des formes sociétaires.',
        ],
      },
      {
        title: 'Le dépôt du dossier via le guichet unique',
        paragraphs: [
          'Le guichet unique INPI centralise les formalités de création, modification et cessation. Le dossier doit être complet et cohérent pour limiter les demandes de régularisation.',
        ],
      },
      {
        title: 'Les erreurs fréquentes à éviter',
        bullets: [
          'Statuts incomplets ou incohérents avec le projet réel',
          'Annonce légale publiée avec des informations erronées',
          'Justificatif de domiciliation non conforme',
          'Oubli de pièces complémentaires demandées par le greffe',
        ],
      },
    ],
    faq: [
      {
        question: 'Quelles sont les grandes étapes pour créer une entreprise ?',
        answer: 'Choix de la forme, rédaction des statuts, annonce légale le cas échéant, constitution du dossier, dépôt au guichet unique, puis immatriculation et réception du KBIS.',
      },
      {
        question: 'Quels documents faut-il préparer ?',
        answer: 'Statuts, pièces d\'identité, justificatif de siège, attestations légales et documents spécifiques selon la forme choisie.',
      },
      {
        question: 'L\'annonce légale est-elle toujours obligatoire ?',
        answer: 'Elle est requise pour la plupart des sociétés commerciales. Les micro-entrepreneurs suivent un régime différent.',
      },
      {
        question: 'Combien de temps prend une création d\'entreprise ?',
        answer: 'Le délai varie selon la complétude du dossier et les délais de traitement du greffe, généralement de quelques jours à plusieurs semaines.',
      },
      {
        question: 'Comment suivre l\'avancement du dossier ?',
        answer: 'Via le guichet unique et les notifications du greffe. Greffio centralise le suivi dans votre espace client.',
      },
    ],
    relatedLinks: [
      { to: '/annonce-legale', label: 'Annonce légale' },
      { to: '/guichet-unique-inpi', label: 'Guichet unique INPI' },
      { to: '/guides/creer-sasu', label: 'Guide créer une SASU' },
      { to: '/glossaire/kbis', label: 'Glossaire : KBIS' },
    ],
  },
  'modification-entreprise': {
    path: '/modification-entreprise',
    title: 'Modification d\'entreprise — siège, dirigeant, statuts et formalités | Greffio',
    description:
      'Comprendre les formalités de modification d\'entreprise : transfert de siège, changement de dirigeant, modification statutaire, annonce légale et dépôt du dossier.',
    h1: 'Modification d\'entreprise : clarifier les démarches et éviter les oublis',
    intro:
      'Modifier une entreprise existante — transfert de siège, changement de dirigeant, évolution des statuts ou du capital — déclenche des formalités spécifiques. Chaque modification doit être documentée, parfois annoncée légalement, puis déposée au guichet unique. Greffio structure le parcours pour limiter les retours administratifs.',
    greffioBlock: 'Greffio identifie la formalité exacte, prépare le dossier, coordonne l\'annonce légale et suit le dépôt jusqu\'à la mise à jour du KBIS.',
    sections: [
      { title: 'Les modifications fréquentes', bullets: ['Transfert de siège social', 'Changement de dirigeant', 'Modification des statuts', 'Changement de dénomination', 'Augmentation ou réduction de capital'] },
      { title: 'Transfert de siège social', paragraphs: ['Le transfert implique une décision des organes compétents, une mise à jour des statuts si nécessaire, une annonce légale et un dépôt au greffe via le guichet unique.'] },
      { title: 'Changement de dirigeant', paragraphs: ['Le départ ou la nomination d\'un dirigeant doit être acté, déclaré et inscrit au RCS pour être opposable aux tiers.'] },
      { title: 'Annonce légale et dépôt du dossier', paragraphs: ['Selon la modification, une annonce légale est publiée avant le dépôt. Le dossier doit être cohérent avec les décisions prises.'] },
      { title: 'Suivi administratif', paragraphs: ['Après le dépôt, le greffe peut demander des compléments. Un suivi rigoureux accélère la régularisation.'] },
    ],
    faq: [
      { question: 'Toute modification nécessite-t-elle une annonce légale ?', answer: 'Non. L\'obligation dépend du type de modification et de la forme juridique.' },
      { question: 'Combien de temps dure une modification ?', answer: 'De quelques jours à plusieurs semaines selon la complexité et les échanges avec le greffe.' },
      { question: 'Faut-il mettre à jour les statuts ?', answer: 'Souvent oui, notamment en cas de transfert de siège ou de changement statutaire.' },
      { question: 'Greffio peut-il accompagner une modification ?', answer: 'Oui, via un parcours guidé adapté à la formalité concernée.' },
    ],
    relatedLinks: [
      { to: '/transfert-siege', label: 'Transfert de siège' },
      { to: '/changement-dirigeant', label: 'Changement de dirigeant' },
      { to: '/guides/modifier-siege-social', label: 'Guide modifier le siège' },
    ],
  },
  'annonce-legale': {
    path: '/annonce-legale',
    title: 'Annonce légale d\'entreprise — création, modification et publication | Greffio',
    description:
      'Comprendre le rôle de l\'annonce légale lors d\'une création ou modification d\'entreprise : contenu, publication, attestation et dépôt du dossier.',
    h1: 'Annonce légale : comprendre son rôle dans vos formalités d\'entreprise',
    intro:
      'L\'annonce légale est une publication obligatoire dans un journal d\'annonces légales habilité. Elle informe les tiers des actes importants affectant une société : création, modification statutaire, dissolution, etc. Greffio vous aide à préparer le contenu et à intégrer l\'attestation dans votre dossier.',
    greffioBlock: 'Greffio vérifie la cohérence des mentions publiées et rattache l\'attestation au dossier formalité.',
    sections: [
      { title: 'À quoi sert une annonce légale ?', paragraphs: ['Elle rend publiques les informations essentielles sur la vie de la société et constitue une pièce du dossier d\'immatriculation ou de modification.'] },
      { title: 'Dans quels cas est-elle nécessaire ?', bullets: ['Création de société', 'Transfert de siège', 'Changement de dirigeant', 'Modification statutaire', 'Dissolution'] },
      { title: 'Quelles informations contient-elle ?', bullets: ['Dénomination et forme juridique', 'Siège social', 'Capital et durée', 'Identité du dirigeant', 'Objet social selon les cas'] },
      { title: 'Que faire après publication ?', paragraphs: ['Conserver l\'attestation de parution et l\'ajouter au dossier déposé au guichet unique.'] },
      { title: 'Erreurs fréquentes', bullets: ['Informations divergentes entre statuts et annonce', 'Publication dans un support non habilité', 'Attestation absente du dossier'] },
    ],
    faq: [
      { question: 'Où publier une annonce légale ?', answer: 'Dans un journal d\'annonces légales habilité dans le département concerné ou via un prestataire agréé.' },
      { question: 'L\'annonce légale remplace-t-elle le dépôt au greffe ?', answer: 'Non. C\'est une étape préalable ou concomitante au dépôt du dossier complet.' },
      { question: 'Quel délai entre annonce et dépôt ?', answer: 'Le dossier doit généralement être déposé dans les délais légaux après publication.' },
      { question: 'Greffio gère-t-il la publication ?', answer: 'Greffio accompagne la préparation et l\'intégration de l\'attestation dans votre parcours.' },
    ],
    relatedLinks: [
      { to: '/creation-entreprise', label: 'Création d\'entreprise' },
      { to: '/guides/deposer-annonce-legale', label: 'Guide déposer une annonce légale' },
      { to: '/glossaire/annonce-legale', label: 'Glossaire : annonce légale' },
    ],
  },
  'guichet-unique-inpi': {
    path: '/guichet-unique-inpi',
    title: 'Guichet unique INPI — comprendre le dépôt des formalités | Greffio',
    description:
      'Le guichet unique centralise les formalités d\'entreprise en France. Comprenez son rôle, les étapes de dépôt, les documents et les points de vigilance.',
    h1: 'Guichet unique INPI : comprendre le dépôt de vos formalités d\'entreprise',
    intro:
      'Depuis la réforme des formalités des entreprises, le guichet unique INPI regroupe la majorité des démarches de création, modification et cessation. Comprendre son fonctionnement permet d\'éviter les allers-retours et de structurer un dossier complet dès le départ.',
    greffioBlock: 'Greffio prépare les pièces au format attendu, contrôle la cohérence des informations et suit les retours du greffe.',
    sections: [
      { title: 'Le rôle du guichet unique', paragraphs: ['Point d\'entrée numérique pour transmettre les formalités aux greffes, organismes fiscaux et sociaux concernés.'] },
      { title: 'Les démarches concernées', bullets: ['Immatriculation', 'Modification', 'Cessation d\'activité', 'Certaines formalités accessoires'] },
      { title: 'Les informations à préparer', bullets: ['Identité des dirigeants et associés', 'Adresse du siège', 'Activité et codes APE', 'Documents signés et attestations'] },
      { title: 'Le suivi du dossier', paragraphs: ['Chaque dépôt reçoit un suivi en ligne. Des demandes de pièces complémentaires peuvent intervenir.'] },
      { title: 'Les difficultés fréquentes', bullets: ['Dossier incomplet', 'Pièces illisibles', 'Incohérence entre statuts et déclarations'] },
    ],
    faq: [
      { question: 'Le guichet unique remplace-t-il le greffe ?', answer: 'Non. Il transmet le dossier au greffe compétent qui instruit la formalité.' },
      { question: 'Faut-il un compte INPI ?', answer: 'Oui, un compte est nécessaire pour déposer et suivre les formalités.' },
      { question: 'Peut-on corriger un dossier déposé ?', answer: 'Selon l\'état d\'instruction, des régularisations sont possibles via le guichet.' },
      { question: 'Greffio dépose-t-il pour moi ?', answer: 'Greffio accompagne la préparation et le suivi dans le cadre du mandat confié.' },
    ],
    relatedLinks: [
      { to: '/creation-entreprise', label: 'Création d\'entreprise' },
      { to: '/glossaire/guichet-unique', label: 'Glossaire : guichet unique' },
      { to: '/kbis', label: 'Comprendre le KBIS' },
    ],
  },
  kbis: {
    path: '/kbis',
    title: 'KBIS d\'entreprise — comprendre l\'extrait d\'immatriculation | Greffio',
    description:
      'Comprendre ce qu\'est un KBIS, à quoi il sert, quelles informations il contient et comment il s\'inscrit dans le suivi administratif d\'une entreprise.',
    h1: 'KBIS : comprendre l\'extrait d\'immatriculation d\'une entreprise',
    intro:
      'Le KBIS est l\'extrait d\'immatriculation au Registre du Commerce et des Sociétés (RCS). Il atteste de l\'existence juridique de l\'entreprise et recense ses informations essentielles : dénomination, siège, dirigeants, capital, activité. C\'est un document couramment demandé par les banques, partenaires et administrations.',
    greffioBlock: 'Greffio vous aide à vérifier que les informations publiées sont cohérentes après immatriculation ou modification.',
    sections: [
      { title: 'Définition du KBIS', paragraphs: ['Document officiel délivré par le greffe du tribunal de commerce attestant l\'immatriculation au RCS.'] },
      { title: 'Informations présentes sur le KBIS', bullets: ['Dénomination et forme juridique', 'Numéro SIREN et adresse du siège', 'Identité du dirigeant', 'Capital social', 'Date d\'immatriculation'] },
      { title: 'À quoi sert le KBIS ?', paragraphs: ['Justifier l\'existence légale de la société auprès des banques, clients, fournisseurs et administrations.'] },
      { title: 'KBIS, SIREN, SIRET et RCS', paragraphs: ['Le SIREN identifie l\'entreprise, le SIRET un établissement, le RCS est le registre et le KBIS en est l\'extrait.'] },
      { title: 'Quand vérifier ou mettre à jour les informations ?', paragraphs: ['Après toute modification statutaire, transfert de siège ou changement de dirigeant.'] },
    ],
    faq: [
      { question: 'Le KBIS a-t-il une date d\'expiration ?', answer: 'Il est daté du jour de l\'extrait. Certains organismes exigent un KBIS de moins de trois mois.' },
      { question: 'Où obtenir un KBIS ?', answer: 'Auprès du greffe ou via les services en ligne habilités.' },
      { question: 'Le KBIS est-il obligatoire pour une micro-entreprise ?', answer: 'Les micro-entrepreneurs ne disposent pas de KBIS au sens sociétal ; d\'autres attestations existent.' },
      { question: 'Greffio fournit-il le KBIS ?', answer: 'Greffio accompagne le dossier jusqu\'à l\'immatriculation ; le KBIS est délivré par le greffe.' },
    ],
    relatedLinks: [
      { to: '/glossaire/kbis', label: 'Glossaire : KBIS' },
      { to: '/glossaire/siren', label: 'Glossaire : SIREN' },
      { to: '/guides/comprendre-kbis', label: 'Guide comprendre le KBIS' },
    ],
  },
};

export const SEO_GUIDE_PAGES = {
  'creer-sasu': {
    path: '/guides/creer-sasu',
    title: 'Créer une SASU en France — étapes et documents | Greffio',
    description: 'Guide pratique pour comprendre les étapes, documents et formalités de création d\'une SASU en France.',
    h1: 'Créer une SASU : étapes, documents et points de vigilance',
    intro: 'La SASU permet à un associé unique de créer une société par actions avec un cadre juridique souple. Ce guide présente les grandes étapes sans substituer un conseil personnalisé.',
    sections: [
      { title: 'Pourquoi choisir une SASU ?', paragraphs: ['Responsabilité limitée aux apports, président obligatoire, régime social du dirigeant selon statut.'] },
      { title: 'Étapes clés', bullets: ['Rédaction des statuts', 'Dépôt du capital', 'Annonce légale', 'Dépôt au guichet unique', 'Immatriculation'] },
      { title: 'Checklist documents', bullets: ['Statuts signés', 'Pièce d\'identité', 'Justificatif de domiciliation', 'Attestation de dépôt de capital', 'Attestation d\'annonce légale'] },
    ],
    faq: [{ question: 'Peut-on créer une SASU seul ?', answer: 'Oui, un associé unique suffit.' }],
    relatedLinks: [{ to: '/creation-sasu', label: 'Offre création SASU' }, { to: '/creation-entreprise', label: 'Création d\'entreprise' }],
  },
  'creer-sas': {
    path: '/guides/creer-sas',
    title: 'Créer une SAS en France — guide des formalités | Greffio',
    description: 'Comprendre la création d\'une SAS : statuts, gouvernance, capital et dépôt au guichet unique.',
    h1: 'Créer une SAS : formalités et organisation',
    intro: 'La SAS convient aux projets avec plusieurs associés et une gouvernance flexible. Voici les étapes générales de constitution.',
    sections: [{ title: 'Spécificités de la SAS', paragraphs: ['Forme adaptée aux projets avec associés multiples et statuts personnalisables.'] }],
    faq: [{ question: 'Combien d\'associés minimum ?', answer: 'Au moins un associé ; souvent plusieurs pour une SAS classique.' }],
    relatedLinks: [{ to: '/creation-sas', label: 'Offre création SAS' }],
  },
  'creer-sarl': {
    path: '/guides/creer-sarl',
    title: 'Créer une SARL — guide des démarches | Greffio',
    description: 'Étapes, documents et formalités pour créer une SARL en France.',
    h1: 'Créer une SARL : comprendre le parcours',
    intro: 'La SARL est une forme répandue pour les projets entre associés avec responsabilité limitée.',
    sections: [{ title: 'Points clés', bullets: ['Gérance', 'Capital social', 'Statuts', 'Annonce légale', 'Immatriculation'] }],
    faq: [{ question: 'Quel capital minimum ?', answer: 'La SARL peut être constituée avec un capital librement fixé dans les statuts (règles légales applicables).' }],
    relatedLinks: [{ to: '/creation-sarl', label: 'Offre création SARL' }],
  },
  'creer-micro-entreprise': {
    path: '/guides/creer-micro-entreprise',
    title: 'Créer une micro-entreprise — démarches | Greffio',
    description: 'Comprendre la création d\'une micro-entreprise : déclaration, plafonds et formalités.',
    h1: 'Créer une micro-entreprise : parcours simplifié',
    intro: 'La micro-entreprise suit un régime allégé avec déclaration en ligne et comptabilité simplifiée, sous conditions de plafonds de chiffre d\'affaires.',
    sections: [{ title: 'Étapes', bullets: ['Déclaration d\'activité', 'Immatriculation', 'Ouverture compte professionnel si requis'] }],
    faq: [{ question: 'Y a-t-il des statuts à rédiger ?', answer: 'Non pour la forme micro-entreprise en tant qu\'entreprise individuelle.' }],
    relatedLinks: [{ to: '/micro-entreprise', label: 'Parcours micro-entreprise' }],
  },
  'deposer-annonce-legale': {
    path: '/guides/deposer-annonce-legale',
    title: 'Déposer une annonce légale — guide pratique | Greffio',
    description: 'Comment préparer et intégrer une annonce légale dans votre dossier de formalités.',
    h1: 'Déposer une annonce légale : mode d\'emploi',
    intro: 'L\'annonce légale doit contenir des mentions exactes et être publiée dans un support habilité.',
    sections: [{ title: 'Checklist', bullets: ['Vérifier les mentions', 'Choisir le journal habilité', 'Conserver l\'attestation', 'Joindre au dossier INPI'] }],
    faq: [{ question: 'Peut-on modifier une annonce publiée ?', answer: 'Une rectificative peut être nécessaire en cas d\'erreur.' }],
    relatedLinks: [{ to: '/annonce-legale', label: 'Page annonce légale' }],
  },
  'modifier-siege-social': {
    path: '/guides/modifier-siege-social',
    title: 'Modifier le siège social — formalités | Greffio',
    description: 'Transfert de siège : décision, statuts, annonce légale et dépôt.',
    h1: 'Modifier le siège social de votre entreprise',
    intro: 'Le transfert de siège implique une décision collective, une mise à jour des statuts et des formalités au greffe.',
    sections: [{ title: 'Étapes', bullets: ['Décision', 'Mise à jour statutaire', 'Annonce légale', 'Dépôt guichet unique'] }],
    faq: [{ question: 'Faut-il une annonce légale ?', answer: 'Oui, dans la plupart des cas de transfert de siège.' }],
    relatedLinks: [{ to: '/transfert-siege', label: 'Offre transfert de siège' }],
  },
  'changer-dirigeant': {
    path: '/guides/changer-dirigeant',
    title: 'Changer de dirigeant — formalités | Greffio',
    description: 'Nomination ou départ d\'un dirigeant : documents et dépôt au greffe.',
    h1: 'Changer de dirigeant : démarches essentielles',
    intro: 'Tout changement de dirigeant doit être acté, déclaré et inscrit au RCS.',
    sections: [{ title: 'Documents usuels', bullets: ['Procès-verbal de décision', 'Mise à jour des statuts si besoin', 'Identité du nouveau dirigeant'] }],
    faq: [{ question: 'Quel délai pour déclarer ?', answer: 'Les déclarations doivent intervenir dans les délais légaux après la décision.' }],
    relatedLinks: [{ to: '/changement-dirigeant', label: 'Offre changement dirigeant' }],
  },
  'comprendre-kbis': {
    path: '/guides/comprendre-kbis',
    title: 'Comprendre le KBIS — guide | Greffio',
    description: 'Définition, usage et lien avec SIREN, SIRET et RCS.',
    h1: 'Comprendre le KBIS et son usage',
    intro: 'Le KBIS est la carte d\'identité officielle de votre société immatriculée au RCS.',
    sections: [{ title: 'Usages courants', bullets: ['Ouverture de compte bancaire', 'Appels d\'offres', 'Contrats commerciaux'] }],
    faq: [{ question: 'KBIS et extrait INPI ?', answer: 'L\'extrait RCS est couramment appelé KBIS pour les sociétés commerciales.' }],
    relatedLinks: [{ to: '/kbis', label: 'Page KBIS' }],
  },
};

export const SEO_GLOSSARY_PAGES = {
  siren: { path: '/glossaire/siren', term: 'SIREN', title: 'SIREN — définition | Glossaire Greffio', description: 'Le SIREN identifie une entreprise en France à 9 chiffres.', definition: 'Numéro unique à 9 chiffres attribué par l\'INSEE à toute entreprise.', example: 'Présent sur le KBIS, les factures et les déclarations administratives.', related: [{ to: '/glossaire/siret', label: 'SIRET' }, { to: '/kbis', label: 'KBIS' }] },
  siret: { path: '/glossaire/siret', term: 'SIRET', title: 'SIRET — définition | Glossaire Greffio', description: 'Le SIRET identifie un établissement : SIREN + NIC.', definition: 'Numéro à 14 chiffres composé du SIREN et d\'un numéro interne de classement (NIC).', example: 'Chaque étabissement possède son propre SIRET.', related: [{ to: '/glossaire/siren', label: 'SIREN' }] },
  kbis: { path: '/glossaire/kbis', term: 'KBIS', title: 'KBIS — définition | Glossaire Greffio', description: 'Extrait d\'immatriculation au RCS.', definition: 'Document officiel attestant l\'immatriculation au registre du commerce.', example: 'Demandé par les banques et partenaires commerciaux.', related: [{ to: '/kbis', label: 'Page KBIS' }] },
  rcs: { path: '/glossaire/rcs', term: 'RCS', title: 'RCS — définition | Glossaire Greffio', description: 'Registre du Commerce et des Sociétés.', definition: 'Registre tenu par le greffe du tribunal de commerce.', example: 'Toute société commerciale y est immatriculée.', related: [{ to: '/glossaire/kbis', label: 'KBIS' }] },
  'guichet-unique': { path: '/glossaire/guichet-unique', term: 'Guichet unique', title: 'Guichet unique — définition | Glossaire Greffio', description: 'Portail INPI de dépôt des formalités.', definition: 'Plateforme numérique centralisant les formalités d\'entreprise.', example: 'Création, modification et cessation y sont déposées.', related: [{ to: '/guichet-unique-inpi', label: 'Guichet unique INPI' }] },
  'annonce-legale': { path: '/glossaire/annonce-legale', term: 'Annonce légale', title: 'Annonce légale — définition | Glossaire Greffio', description: 'Publication obligatoire dans un JAL habilité.', definition: 'Publication rendant publiques les actes importants de la société.', example: 'Création ou transfert de siège.', related: [{ to: '/annonce-legale', label: 'Annonce légale' }] },
  statuts: { path: '/glossaire/statuts', term: 'Statuts', title: 'Statuts — définition | Glossaire Greffio', description: 'Contrat constitutif de la société.', definition: 'Document définissant la forme, l\'objet, le capital et l\'organisation de la société.', example: 'Annexés au dossier d\'immatriculation.', related: [{ to: '/creation-entreprise', label: 'Création d\'entreprise' }] },
  'siege-social': { path: '/glossaire/siege-social', term: 'Siège social', title: 'Siège social — définition | Glossaire Greffio', description: 'Adresse officielle de la société.', definition: 'Lieu où la société a son administration centrale.', example: 'Figurant sur le KBIS et les statuts.', related: [{ to: '/guides/modifier-siege-social', label: 'Modifier le siège' }] },
  dirigeant: { path: '/glossaire/dirigeant', term: 'Dirigeant', title: 'Dirigeant — définition | Glossaire Greffio', description: 'Personne habilitée à représenter la société.', definition: 'Président, gérant ou directeur général selon la forme juridique.', example: 'Mentionné au RCS et sur le KBIS.', related: [{ to: '/guides/changer-dirigeant', label: 'Changer de dirigeant' }] },
  immatriculation: { path: '/glossaire/immatriculation', term: 'Immatriculation', title: 'Immatriculation — définition | Glossaire Greffio', description: 'Inscription officielle de l\'entreprise.', definition: 'Acte administratif conférant l\'existence juridique au RCS ou au répertoire des métiers.', example: 'Suite à un dépôt accepté au guichet unique.', related: [{ to: '/guichet-unique-inpi', label: 'Guichet unique' }] },
};

export const SEO_FAQ_ITEMS = [
  { question: 'Greffio est-il un service officiel de l\'État ?', answer: 'Non. Greffio est un service privé d\'accompagnement aux formalités administratives.' },
  { question: 'Greffio crée-t-il mon entreprise à ma place ?', answer: 'Greffio aide à préparer, structurer et suivre le dossier. L\'immatriculation est prononcée par le greffe compétent.' },
  { question: 'Puis-je reprendre mon dossier plus tard ?', answer: 'Oui. Votre parcours est sauvegardé dans votre espace client.' },
  { question: 'Quels moyens de paiement acceptez-vous ?', answer: 'Carte bancaire, Apple Pay, Google Pay et prélèvement SEPA selon les parcours.' },
  { question: 'Combien de temps pour une création ?', answer: 'Le délai dépend de la complétude du dossier et des délais d\'instruction du greffe.' },
  { question: 'Proposez-vous un conseil juridique personnalisé ?', answer: 'Greffio fournit un accompagnement administratif structuré, pas un conseil juridique au sens strict.' },
];

export const SEO_HUBS = {
  guides: {
    path: '/guides',
    title: 'Guides formalités d\'entreprise | Greffio',
    description: 'Guides pratiques pour créer, modifier et suivre vos formalités d\'entreprise en France.',
    h1: 'Guides Greffio : formalités d\'entreprise',
    intro: 'Des guides structurés pour comprendre les étapes, documents et points de vigilance des principales démarches.',
    cards: Object.entries(SEO_GUIDE_PAGES).map(([slug, page]) => ({ to: page.path, label: page.h1, slug })),
  },
  glossaire: {
    path: '/glossaire',
    title: 'Glossaire des formalités d\'entreprise | Greffio',
    description: 'Définitions claires : SIREN, SIRET, KBIS, RCS, guichet unique, annonce légale et plus.',
    h1: 'Glossaire Greffio',
    intro: 'Comprendre le vocabulaire administratif des entreprises en France.',
    cards: Object.entries(SEO_GLOSSARY_PAGES).map(([slug, page]) => ({ to: page.path, label: page.term, slug })),
  },
  faq: {
    path: '/faq',
    title: 'FAQ Greffio — questions fréquentes',
    description: 'Réponses aux questions fréquentes sur Greffio et les formalités d\'entreprise.',
    h1: 'Questions fréquentes',
    intro: 'Réponses courtes sur le fonctionnement de Greffio et les démarches administratives.',
  },
};

export const SEO_SITEMAP_PATHS = [
  '/',
  '/tarifs',
  '/services',
  '/contact',
  '/guide',
  '/app',
  '/mentions-legales',
  '/confidentialite',
  '/cookies',
  ...Object.values(SEO_PILLAR_PAGES).map((p) => p.path),
  SEO_HUBS.guides.path,
  ...Object.values(SEO_GUIDE_PAGES).map((p) => p.path),
  SEO_HUBS.glossaire.path,
  ...Object.values(SEO_GLOSSARY_PAGES).map((p) => p.path),
  SEO_HUBS.faq.path,
  '/creation-sasu',
  '/creation-sas',
  '/creation-sarl',
  '/creation-eurl',
  '/creation-sci',
  '/micro-entreprise',
  '/transfert-siege',
  '/changement-dirigeant',
];

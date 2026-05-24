/**
 * Contenu des guides Ressources (CMS léger côté frontend).
 */

const guide = (entry) => entry;

export const RESOURCE_GUIDES = {
  'guide-kbis': guide({
    slug: 'comprendre-le-kbis',
    title: 'Comprendre le Kbis',
    summary: 'Rôle, usages et bonnes pratiques pour l’extrait Kbis.',
    relatedServiceIds: ['kbis-extract'],
    sections: [
      {
        heading: 'Qu’est-ce que le Kbis ?',
        paragraphs: [
          'L’extrait Kbis est la carte d’identité de votre société au registre du commerce et des sociétés (RCS). Il atteste de l’immatriculation et résume les informations publiées.',
        ],
      },
      {
        heading: 'Quand le demander ?',
        paragraphs: [
          'Ouverture de compte professionnel, appel d’offres, bail commercial, reprise d’entreprise ou contrôle par un partenaire.',
        ],
      },
      {
        heading: 'Bonnes pratiques Greffio',
        paragraphs: [
          'Vérifiez la dénomination et le SIREN avant commande. Un Kbis récent (moins de 3 mois) est souvent exigé par les tiers.',
        ],
      },
    ],
  }),
  'guide-rne': guide({
    slug: 'comprendre-le-rne',
    title: 'Comprendre le RNE',
    summary: 'Le registre national des entreprises centralise les données d’immatriculation.',
    relatedServiceIds: ['rne-extract'],
    sections: [
      {
        heading: 'RNE et RCS',
        paragraphs: [
          'Le RNE regroupe les informations issues des greffes et des centres de formalités. L’extrait peut compléter ou remplacer certains usages selon le destinataire.',
        ],
      },
    ],
  }),
  'guide-creation-docs': guide({
    slug: 'documents-creation-societe',
    title: 'Quels documents pour créer une société ?',
    summary: 'Checklist des pièces habituelles selon la forme juridique.',
    relatedServiceIds: ['pack-creation'],
    sections: [
      {
        heading: 'Pièces fréquentes',
        paragraphs: [
          'Statuts signés, justificatif de siège, pièce d’identité des dirigeants, déclaration des bénéficiaires effectifs si requis, attestation de dépôt de capital pour les sociétés à capital.',
        ],
      },
    ],
  }),
  'guide-director-change': guide({
    slug: 'modifier-un-dirigeant',
    title: 'Comment modifier un dirigeant ?',
    summary: 'Décision, acte, dépôt et publication.',
    relatedServiceIds: ['pack-director', 'certified-director'],
    sections: [
      {
        heading: 'Étapes clés',
        paragraphs: [
          'Valider la décision selon les statuts (AGO, décision collective ou acte isolé), rédiger l’acte, le faire signer, puis déposer au guichet unique dans les délais légaux.',
        ],
      },
    ],
  }),
  'guide-collective': guide({
    slug: 'procedure-collective',
    title: 'Que signifie une procédure collective ?',
    summary: 'Redressement, sauvegarde, liquidation : impacts pour les tiers.',
    relatedServiceIds: ['collective-procedure-info'],
    sections: [
      {
        heading: 'Lecture prudente',
        paragraphs: [
          'La mention d’une procédure collective sur un extrait doit inciter à une analyse approfondie avant tout engagement contractuel ou financier.',
        ],
      },
    ],
  }),
  'guide-kbis-rne-sirene': guide({
    slug: 'kbis-rne-sirene',
    title: 'Kbis, RNE et avis Sirene',
    summary: 'Trois sources, trois usages.',
    relatedServiceIds: ['kbis-extract', 'rne-extract'],
    sections: [
      {
        heading: 'En résumé',
        paragraphs: [
          'Le Kbis est l’extrait greffe, le RNE l’immatriculation nationale, l’avis Sirene l’identité économique INSEE. Greffio vous aide à choisir le document adapté à votre besoin.',
        ],
      },
    ],
  }),
  'guide-sasu': guide({
    slug: 'creation-sasu',
    title: 'Guide création SASU',
    summary: 'Associé unique, président, capital et dépôt.',
    relatedServiceIds: ['pack-creation'],
    sections: [
      {
        heading: 'Points de vigilance',
        paragraphs: [
          'Rédaction des statuts, choix du régime fiscal, dépôt des fonds, publication légale et immatriculation via le guichet unique.',
        ],
      },
    ],
  }),
  'guide-sas': guide({
    slug: 'creation-sas',
    title: 'Guide création SAS',
    summary: 'Gouvernance, associés et formalités.',
    relatedServiceIds: ['pack-creation'],
    sections: [
      {
        heading: 'Organisation',
        paragraphs: [
          'Prévoir les statuts (président, cessions, AG), le pacte d’associés si besoin, et la déclaration des bénéficiaires effectifs.',
        ],
      },
    ],
  }),
  'guide-sarl': guide({
    slug: 'creation-sarl',
    title: 'Guide création SARL',
    summary: 'Parts sociales, gérant, formalités.',
    relatedServiceIds: ['pack-creation'],
    sections: [
      {
        heading: 'Spécificités SARL',
        paragraphs: [
          'Rédaction des statuts, répartition du capital, nomination du gérant et dépôt au guichet unique.',
        ],
      },
    ],
  }),
  'guide-seat-transfer': guide({
    slug: 'transfert-siege',
    title: 'Guide transfert de siège',
    summary: 'Décision, justificatif et publicité.',
    relatedServiceIds: ['pack-modification', 'pack-establishment'],
    sections: [
      {
        heading: 'Avant le dépôt',
        paragraphs: [
          'Vérifier la clause statutaire, le justificatif d’occupation au nouveau siège et l’éventuelle publicité légale selon le périmètre du transfert.',
        ],
      },
    ],
  }),
  'guide-dissolution': guide({
    slug: 'dissolution-societe',
    title: 'Guide dissolution',
    summary: 'Clôture, liquidation et radiation.',
    relatedServiceIds: ['pack-modification'],
    sections: [
      {
        heading: 'Phases',
        paragraphs: [
          'Dissolution, liquidation des actifs, apurement du passif, clôture de liquidation et radiation au RCS.',
        ],
      },
    ],
  }),
  'guide-filing': guide({
    slug: 'depot-au-greffe',
    title: 'Guide dépôt au greffe',
    summary: 'Préparer un dépôt clair et complet.',
    relatedServiceIds: ['documentary-pack'],
    sections: [
      {
        heading: 'Qualité du dossier',
        paragraphs: [
          'Pièces lisibles en PDF, intitulés explicites, cohérence entre les informations déclarées et les justificatifs.',
        ],
      },
    ],
  }),
};

export const getGuideBySlug = (slug) => (
  Object.entries(RESOURCE_GUIDES).find(([, content]) => content.slug === slug) || null
);

export const getGuideById = (guideId) => {
  const content = RESOURCE_GUIDES[guideId];
  return content ? [guideId, content] : null;
};

export const listResourceGuideSlugs = () => (
  Object.values(RESOURCE_GUIDES).map((g) => g.slug)
);

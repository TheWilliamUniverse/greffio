import { buildWilliamSasDocument } from './williamSasMaster.js';
import {
  apportsWilliam,
  article,
  buildWilliamCover,
  buildWilliamDefinitions,
  buildWilliamObjetActe,
  buildWilliamSignatures,
  buildWilliamSoussignes,
  capitalRepartitionWilliam,
  legalTitle,
  objetSocialWilliam,
  sigleSuffix,
} from './williamHelpers.js';
import { buildStandardAnnexes } from '../shared/annexes.js';

const replaceAll = (text, pairs) => {
  let out = String(text || '');
  pairs.forEach(([from, to]) => {
    out = out.split(from).join(to);
  });
  return out;
};

const cloneBlock = (block, pairs) => {
  if (!block) return block;
  if (block.kind === 'article') {
    return {
      ...block,
      title: replaceAll(block.title, pairs),
      body: replaceAll(block.body, pairs),
    };
  }
  if (block.text) return { ...block, text: replaceAll(block.text, pairs) };
  return block;
};

const securitiesLabel = (form) => ({
  SARL: { singular: 'part sociale', plural: 'parts sociales' },
  EURL: { singular: 'part sociale', plural: 'parts sociales' },
  SCI: { singular: 'part sociale', plural: 'parts sociales' },
}[form] || { singular: 'part sociale', plural: 'parts sociales' });

const sasuPairs = [
  ['Société par Actions Simplifiée dénommée', 'Société par Actions Simplifiée Unipersonnelle dénommée'],
  ['Société par Actions Simplifiée', 'Société par Actions Simplifiée Unipersonnelle'],
  ['TITRE III – DÉCISIONS COLLECTIVES', "TITRE III – DÉCISIONS DE L'ASSOCIÉ UNIQUE"],
  ['Décisions collectives des Associés', "Décisions de l'associé unique"],
  ['Décisions collectives des associés', "Décisions de l'associé unique"],
  ['des associés', "de l'associé unique"],
  ['des Associés', "de l'associé unique"],
  ['Les associés', "L'associé unique"],
  ['les associés', "l'associé unique"],
  ['Les Associés', "L'associé unique"],
  ['Consultation et convocation de l\'Assemblée Générale', "Consultation et convocation de l'associé unique"],
  ['assemblée générale ordinaire', "décision de l'associé unique"],
  ['Assemblée Générale Ordinaire', "Décision de l'associé unique"],
  ['assemblées générales extraordinaires', "décisions extraordinaires de l'associé unique"],
  ['Assemblée Générale Extraordinaire', "Décision extraordinaire de l'associé unique"],
  ['assemblée générale', "décision de l'associé unique"],
  ['Assemblée Générale', "Décision de l'associé unique"],
  ['Pacte des Associés', "Pacte d'associé"],
  ['Les Associés peuvent', "L'associé unique peut"],
];

export const buildWilliamSasuDocument = (data) => {
  const sas = buildWilliamSasDocument({ ...data, legalForm: 'SASU' });
  const bodyBlocks = sas.blocks.filter((b) => {
    if (['section-title', 'paragraph', 'blank'].includes(b.kind)) return false;
    if (b.kind === 'article' && [17, 18].includes(b.number)) return false;
    return true;
  }).map((b) => cloneBlock(b, sasuPairs));

  const article11 = bodyBlocks.find((b) => b.kind === 'article' && b.number === 11);
  if (article11) {
    article11.title = "Décisions de l'associé unique";
    article11.body = replaceAll(article11.body, [
      ['50% des actions', '100% des actions'],
      ['60% des actions', '100% des actions'],
      ['70 % des actions', '100% des actions'],
      ['75% des actions', '100% des actions'],
    ]);
  }

  return {
    ...sas,
    cover: buildWilliamCover({
      ...data,
      legalFormLabel: 'Société par Actions Simplifiée Unipersonnelle (SASU)',
      legalFormShort: 'Société par Actions Simplifiée Unipersonnelle',
    }),
    blocks: [
      ...buildWilliamSoussignes(data, { unique: true }),
      ...buildWilliamDefinitions(data, { unique: true }),
      ...buildWilliamObjetActe(data, { unique: true }),
      ...bodyBlocks,
    ],
    signatures: buildWilliamSignatures({
      ...data,
      associateBlockOverride: {
        role: "L'associé unique",
        names: [(data.associates || [])[0]?.label].filter(Boolean),
        roles: ['Associé unique'],
      },
    }),
    metadata: { legalForm: 'SASU', template: 'william_establishments_sasu_reference', ...data.metadataBundle },
  };
};

const buildWilliamPartsDocument = (data, form, formLabel) => {
  const sec = securitiesLabel(form);
  const isUnique = form === 'EURL';
  const lastArticle = isUnique ? 24 : 25;
  const diversesSub = (n) => [
    `${n}.1 - Langue officielle : le français est la langue officielle des statuts et documents juridiques.`,
    `${n}.2 - Droit applicable : les statuts sont soumis au droit français.`,
    `${n}.3 - Frais de constitution : les frais de constitution sont avancés par les associés et remboursés après immatriculation.`,
    `${n}.4 - Signature électronique : la Société accepte la signature électronique dans les conditions prévues par la loi.`,
  ].join('\n\n');

  const blocks = [
    ...buildWilliamSoussignes(data, { unique: isUnique }),
    ...buildWilliamDefinitions(data, { unique: isUnique, securities: sec.plural, directorLabel: 'Gérant' }),
    ...buildWilliamObjetActe(data, { unique: isUnique }),
    legalTitle('TITRE I – FORMATION DE LA SOCIÉTÉ'),
    article(1, 'Dénomination', `Il est formé une ${formLabel} dénommée ${data.denomination}${sigleSuffix(data)}.`),
    article(2, 'Objet social', form === 'SCI'
      ? `${objetSocialWilliam(data)}\n\nLa Société a notamment pour objet l'acquisition, la gestion, l'administration et la mise en valeur de biens immobiliers.`
      : objetSocialWilliam(data)),
    article(3, 'Siège social', `Le siège social est fixé au ${data.seat.full}${data.domiciliation ? `, chez ${data.domiciliation}` : ''}.${data.mailingAddress ? `\n\nLe courrier peut être adressé au : ${data.mailingAddress}.` : ''}`),
    article(4, 'Durée', `La Société est constituée pour une durée de ${data.duree || '99 années'} à compter de son immatriculation au Registre du Commerce et des Sociétés, sauf dissolution anticipée ou prorogation.`),
    article(5, 'Capital social et exercice social', [
      `Le capital social est fixé à la somme de ${data.capital} euros, divisé en ${data.nombreTitres} ${sec.plural} de ${data.valeurNominale} euro chacune.`,
      `\n\nLa répartition du capital est la suivante :\n\n${capitalRepartitionWilliam(data).replace(/actions/g, sec.plural)}`,
      `\n\nL'exercice social se termine le ${data.exerciceFin} de chaque année et recommence le jour suivant.`,
      data.premierExerciceFin ? `\nPar exception, le premier exercice sera clôturé le ${data.premierExerciceFin}.` : '',
    ].join('')),
    article(6, 'Apports', apportsWilliam(data).replace(/actions/g, sec.plural).replace(/Président/g, 'Gérant')),
    legalTitle('TITRE II – GÉRANCE'),
    article(7, isUnique ? 'Gérant' : 'Nomination du ou des Gérants', `La société est dirigée par un Gérant nommé ${isUnique ? "par l'associé unique" : 'par décision collective des associés'}.\n\nLe Gérant est ${data.director}.`),
    article(8, 'Pouvoirs du Gérant', "Le Gérant représente la Société à l'égard des tiers. Il est investi des pouvoirs les plus étendus pour agir en toutes circonstances au nom de la Société, dans la limite de l'objet social et sous réserve de ceux expressément attribués par la loi aux associés."),
    article(9, 'Rémunération', "La rémunération éventuelle du Gérant est fixée par décision des associés ou de l'associé unique."),
    article(10, 'Conventions réglementées', "Les conventions visées à l'article L. 223-19 du Code de commerce sont soumises aux règles légales de contrôle et d'autorisation."),
    legalTitle(isUnique ? "TITRE III – DÉCISIONS DE L'ASSOCIÉ UNIQUE" : 'TITRE III – DÉCISIONS COLLECTIVES'),
    ...(isUnique ? [
      article(11, "Compétence de l'associé unique", "L'associé unique exerce les pouvoirs dévolus aux associés. Les décisions sont constatées par procès-verbal inscrit sur un registre coté et paraphé."),
      article(12, 'Registre des décisions', "Un registre des décisions de l'associé unique est tenu au siège social."),
    ] : [
      article(11, 'Décisions ordinaires', 'Les décisions ordinaires sont prises par les associés représentant plus de la moitié des parts sociales, sauf majorité renforcée prévue par la loi.'),
      article(12, 'Décisions extraordinaires', 'Les décisions modificatives des statuts sont prises dans les conditions légales de quorum et majorité.'),
      article(13, 'Convocation et procès-verbaux', "Les associés sont convoqués par le Gérant. Les décisions collectives sont constatées par procès-verbal conservé au siège social."),
    ]),
    legalTitle(`TITRE IV – ${sec.plural.toUpperCase()} & TRANSMISSIONS`),
    article(isUnique ? 13 : 14, `Droits attachés aux ${sec.plural}`, `Chaque ${sec.singular} confère à son titulaire des droits financiers et politiques proportionnels à sa participation au capital social.`),
    article(isUnique ? 14 : 15, `Cession ${isUnique ? 'et transmission' : 'entre associés'}`, isUnique
      ? "L'associé unique peut librement céder tout ou partie de ses parts sociales, sous réserve des dispositions légales."
      : `Les cessions de ${sec.plural} entre associés sont libres, sous réserve des stipulations contraires des présents statuts.`),
    article(isUnique ? 15 : 16, 'Cession aux tiers et agrément', "Toute cession de parts sociales au profit d'un tiers est soumise à l'agrément préalable des associés, selon les modalités prévues aux présents statuts."),
    article(isUnique ? 16 : 17, 'Nantissement', `Le nantissement de ${sec.plural} est soumis aux conditions légales applicables.`),
    legalTitle('TITRE V – FONCTIONNEMENT INTERNE'),
    article(isUnique ? 17 : 18, 'Confidentialité', 'Tous les dirigeants, associés et collaborateurs sont tenus à la confidentialité concernant les informations sensibles de la Société.'),
    article(isUnique ? 18 : 19, 'Règlement intérieur', 'Les associés peuvent adopter un règlement intérieur pour organiser le fonctionnement interne de la Société.'),
    legalTitle('TITRE VI – RÉSULTATS & FIN DE VIE'),
    article(isUnique ? 19 : 20, 'Affectation des résultats', "Les résultats de la Société sont affectés conformément à la décision des associés ou de l'associé unique."),
    article(isUnique ? 20 : 21, 'Dissolution', "La Société prend fin par l'arrivée du terme fixé, ou par dissolution anticipée décidée conformément à la loi et aux présents statuts."),
    article(isUnique ? 21 : 22, 'Liquidation', "En cas de dissolution, le liquidateur est nommé et ses pouvoirs définis conformément à la loi."),
    legalTitle('TITRE VII – RÈGLEMENT DES LITIGES'),
    article(isUnique ? 22 : 23, 'Médiation préalable obligatoire', "Tout différend relatif à l'interprétation ou à l'exécution des présents statuts devra, préalablement à toute action judiciaire, faire l'objet d'une tentative de médiation."),
    article(isUnique ? 23 : 24, 'Litiges', 'Tout litige relatif aux présents statuts ou à la Société sera soumis au Tribunal compétent du siège social.'),
    legalTitle('TITRE VIII – DISPOSITIONS DIVERSES'),
    article(lastArticle, 'Dispositions diverses', diversesSub(lastArticle)),
  ];

  return {
    cover: buildWilliamCover({ ...data, legalFormLabel: `${formLabel} (${form})`, legalFormShort: formLabel }),
    blocks,
    annexes: buildStandardAnnexes(data),
    signatures: buildWilliamSignatures({ ...data, president: null, directeurGeneral: null }),
    footerNotice: '',
    metadata: { legalForm: form, template: `william_establishments_${form.toLowerCase()}_reference`, ...data.metadataBundle },
  };
};

export const buildWilliamSarlDocument = (data) => buildWilliamPartsDocument(data, 'SARL', 'Société à Responsabilité Limitée');
export const buildWilliamEurlDocument = (data) => buildWilliamPartsDocument(data, 'EURL', 'Entreprise Unipersonnelle à Responsabilité Limitée');
export const buildWilliamSciDocument = (data) => buildWilliamPartsDocument(data, 'SCI', 'Société Civile Immobilière');

export { buildWilliamSasDocument } from './williamSasMaster.js';

export const buildWilliamDocumentByForm = (data) => {
  switch (String(data.legalForm || '').toUpperCase()) {
    case 'SAS': return buildWilliamSasDocument(data);
    case 'SASU': return buildWilliamSasuDocument(data);
    case 'SARL': return buildWilliamSarlDocument(data);
    case 'EURL': return buildWilliamEurlDocument(data);
    case 'SCI': return buildWilliamSciDocument(data);
    default: return buildWilliamSasDocument(data);
  }
};

import { article, legalTitle } from '../shared/formatting.js';
import {
  buildCover,
  buildDefinitionsBlocks,
  buildObjetActeBlocks,
  buildSoussignesBlocks,
} from '../shared/identityBlocks.js';
import { buildStandardAnnexes } from '../shared/annexes.js';
import { buildSignatures } from '../shared/signatureBlocks.js';
import { sasFormationClauses } from './sas.template.js';

export const buildSasuStatutes = (data) => {
  const formation = sasFormationClauses(data).map((c, i) => ({
    ...c,
    number: i + 1,
    body: c.body.replace('entre les soussignés', 'entre le soussigné').replace('Société par Actions Simplifiée', 'Société par Actions Simplifiée Unipersonnelle'),
  }));

  const titles = [
    { heading: 'TITRE I – FORMATION DE LA SOCIÉTÉ', clauses: formation },
    {
      heading: 'TITRE II – DIRECTION DE LA SOCIÉTÉ',
      clauses: [
        article(9, 'Président', `${data.director} est nommé(e) Président(e) de la Société pour une durée indéterminée.`),
        article(10, 'Pouvoirs du Président', 'Le Président représente la Société à l’égard des tiers et dispose des pouvoirs les plus étendus pour agir en toutes circonstances au nom de la Société, dans la limite de l’objet social.'),
        article(11, 'Rémunération', 'La rémunération éventuelle du Président est fixée par décision de l’associé unique.'),
        article(12, 'Conventions réglementées', 'Les conventions conclues entre la Société et son dirigeant sont soumises aux règles légales de contrôle applicables aux sociétés unipersonnelles.'),
      ],
    },
    {
      heading: 'TITRE III – DÉCISIONS DE L’ASSOCIÉ UNIQUE',
      clauses: [
        article(13, 'Compétence de l’associé unique', 'L’associé unique exerce les pouvoirs dévolus aux associés dans les sociétés pluripersonnelles.'),
        article(14, 'Modalités des décisions', 'Les décisions de l’associé unique sont constatées par procès-verbal inscrit sur un registre coté et paraphé, ou par acte sous seing privé signé par l’associé unique.'),
        article(15, 'Registre des décisions', 'Un registre des décisions de l’associé unique est tenu au siège social.'),
      ],
    },
    {
      heading: 'TITRE IV – ACTIONS',
      clauses: [
        article(16, 'Forme des actions', 'Les actions sont nominatives et inscrites en compte au nom de l’associé unique.'),
        article(17, 'Droits attachés aux actions', 'Chaque action confère à l’associé unique l’intégralité des droits financiers et politiques attachés au capital social.'),
        article(18, 'Transmission des actions', 'L’associé unique peut librement céder tout ou partie de ses actions, sous réserve des dispositions légales impératives.'),
        article(19, 'Libération des actions', `Les actions souscrites en numéraire sont libérées à hauteur de ${data.liberationCapital}.`),
      ],
    },
    {
      heading: 'TITRE V – COMPTES & RÉSULTATS',
      clauses: [
        article(20, 'Comptes sociaux', 'Le Président arrête les comptes annuels conformément aux dispositions légales.'),
        article(21, 'Affectation du résultat', `Le résultat est affecté conformément à la loi et à la décision de l’associé unique : ${data.affectationResultat}.`),
      ],
    },
    {
      heading: 'TITRE VI – DISSOLUTION & LIQUIDATION',
      clauses: [
        article(22, 'Dissolution', 'La Société est dissoute dans les cas prévus par la loi ou par décision de l’associé unique.'),
        article(23, 'Liquidation', 'La liquidation est organisée conformément à la loi. L’associé unique nomme le liquidateur et fixe ses pouvoirs.'),
      ],
    },
    {
      heading: 'TITRE VII – DISPOSITIONS DIVERSES',
      clauses: [
        article(24, 'Frais', 'Les frais, droits et débours des présentes sont à la charge de la Société.'),
        article(25, 'Formalités', `Tous pouvoirs sont conférés au porteur d’un original des présents statuts pour accomplir les formalités d’immatriculation auprès du greffe de ${data.greffe}.`),
        article(26, 'Pouvoirs', `Pouvoirs sont donnés à ${data.mandataire} pour effectuer les formalités visées à l’annexe 3.`),
        article(27, 'Litiges', `Toute contestation relève des juridictions compétentes du ressort de ${data.greffe}.`),
      ],
    },
  ];

  const blocks = [
    ...buildSoussignesBlocks(data),
    ...buildDefinitionsBlocks(data),
    ...buildObjetActeBlocks(data),
  ];
  titles.forEach((section) => {
    blocks.push(legalTitle(section.heading));
    section.clauses.forEach((c) => blocks.push(c));
  });

  return {
    cover: buildCover(data),
    blocks,
    annexes: buildStandardAnnexes(data),
    signatures: buildSignatures(data),
    footerNotice: 'Document généré par Greffio – WILLIAM ESTABLISHMENTS. Modèle à relire et valider avant signature.',
    metadata: { legalForm: 'SASU', template: 'william_sasu_v1', ...data.metadataBundle },
  };
};

import { article, legalTitle } from '../shared/formatting.js';
import {
  buildCover,
  buildDefinitionsBlocks,
  buildObjetActeBlocks,
  buildSoussignesBlocks,
} from '../shared/identityBlocks.js';
import { buildStandardAnnexes } from '../shared/annexes.js';
import { buildSignatures } from '../shared/signatureBlocks.js';
import { sarlFormation } from './sarl.template.js';

export const buildEurlStatutes = (data) => {
  const formation = sarlFormation(data).map((c) => ({
    ...c,
    body: c.body
      .replace('entre les soussignés une Société à Responsabilité Limitée', 'entre le soussigné une Entreprise Unipersonnelle à Responsabilité Limitée')
      .replace('Société à Responsabilité Limitée', 'Entreprise Unipersonnelle à Responsabilité Limitée')
      .replace('« SARL »', '« EURL »'),
  }));

  const titles = [
    { heading: 'TITRE I – FORMATION DE LA SOCIÉTÉ', clauses: formation },
    {
      heading: 'TITRE II – GÉRANCE',
      clauses: [
        article(10, 'Gérant', `${data.director} est nommé(e) Gérant(e) de la Société.`),
        article(11, 'Pouvoirs du Gérant', 'Le Gérant représente la Société à l’égard des tiers et dispose des pouvoirs les plus étendus pour agir au nom de la Société.'),
        article(12, 'Rémunération', 'La rémunération éventuelle du Gérant est fixée par décision de l’associé unique.'),
        article(13, 'Conventions réglementées', 'Les conventions conclues entre la Société et son Gérant sont soumises aux règles légales applicables.'),
      ],
    },
    {
      heading: 'TITRE III – DÉCISIONS DE L’ASSOCIÉ UNIQUE',
      clauses: [
        article(14, 'Compétence de l’associé unique', 'L’associé unique exerce les pouvoirs dévolus aux associés.'),
        article(15, 'Modalités des décisions', 'Les décisions sont constatées par procès-verbal inscrit sur un registre coté et paraphé.'),
        article(16, 'Registre des décisions', 'Un registre des décisions de l’associé unique est tenu au siège social.'),
      ],
    },
    {
      heading: 'TITRE IV – PARTS SOCIALES',
      clauses: [
        article(17, 'Droits attachés aux parts', 'Chaque part sociale confère à l’associé unique l’intégralité des droits attachés au capital social.'),
        article(18, 'Cession et transmission des parts', 'L’associé unique peut librement céder tout ou partie de ses parts sociales, sous réserve des dispositions légales.'),
        article(19, 'Nantissement', 'Le nantissement de parts sociales est soumis aux conditions légales applicables.'),
      ],
    },
    {
      heading: 'TITRE V – COMPTES & RÉSULTATS',
      clauses: [
        article(20, 'Comptes sociaux', 'Le Gérant arrête les comptes annuels conformément à la loi.'),
        article(21, 'Affectation du résultat', `Le résultat est affecté conformément à la loi : ${data.affectationResultat}.`),
      ],
    },
    {
      heading: 'TITRE VI – DISSOLUTION & LIQUIDATION',
      clauses: [
        article(22, 'Dissolution', 'La Société est dissoute dans les cas prévus par la loi ou par décision de l’associé unique.'),
        article(23, 'Liquidation', 'La liquidation est organisée conformément à la loi.'),
      ],
    },
    {
      heading: 'TITRE VII – DISPOSITIONS DIVERSES',
      clauses: [
        article(24, 'Contestations', `Toute contestation relève des juridictions de ${data.greffe}.`),
        article(25, 'Frais', 'Les frais des présentes sont à la charge de la Société.'),
        article(26, 'Formalités', `Pouvoirs pour l’immatriculation au greffe de ${data.greffe}.`),
        article(27, 'Pouvoirs', `Pouvoirs conférés à ${data.mandataire} selon l’annexe 3.`),
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
    metadata: { legalForm: 'EURL', template: 'william_eurl_v1', ...data.metadataBundle },
  };
};

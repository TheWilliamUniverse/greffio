import { article, legalTitle } from '../shared/formatting.js';
import {
  buildCover,
  buildDefinitionsBlocks,
  buildObjetActeBlocks,
  buildSoussignesBlocks,
} from '../shared/identityBlocks.js';
import { buildStandardAnnexes } from '../shared/annexes.js';
import { buildSignatures } from '../shared/signatureBlocks.js';

export const buildSciStatutes = (data) => {
  const titles = [
    {
      heading: 'TITRE I – FORMATION DE LA SOCIÉTÉ',
      clauses: [
        article(1, 'Forme', 'Il est formé entre les soussignés une Société Civile Immobilière régie par les dispositions législatives et réglementaires applicables aux sociétés civiles ainsi que par les présents statuts.'),
        article(2, 'Dénomination', `La Société prend la dénomination sociale « ${data.denomination} ».`),
        article(3, 'Objet social', `${data.objetSocial} La Société a notamment pour objet l’acquisition, la gestion, l’administration et la mise en valeur de biens immobiliers.`),
        article(4, 'Siège social', `Le siège social est fixé ${data.seat.full}.`),
        article(5, 'Durée', `La durée de la Société est fixée à ${data.duree}.`),
        article(6, 'Capital social', `Le capital social est fixé à ${data.capital} euros, divisé en ${data.nombreTitres} parts sociales.`),
        article(7, 'Apports', 'Les associés apportent les biens et valeurs décrits en annexe, conformément aux règles applicables aux sociétés civiles.'),
        article(8, 'Parts sociales', 'Les parts sociales sont nominatives et inscrites en compte au nom de chaque associé.'),
        article(9, 'Exercice social', `L’exercice social commence le ${data.exerciceDebut} et se termine le ${data.exerciceFin}.`),
      ],
    },
    {
      heading: 'TITRE II – GÉRANCE',
      clauses: [
        article(10, 'Nomination du Gérant', `${data.director} est nommé(e) Gérant(e) de la Société.`),
        article(11, 'Pouvoirs du Gérant', 'Le Gérant administre la Société et la représente à l’égard des tiers dans le cadre de l’objet social.'),
        article(12, 'Rémunération', 'La rémunération éventuelle du Gérant est fixée par décision collective des associés.'),
        article(13, 'Responsabilité du Gérant', 'Le Gérant est responsable des fautes commises dans l’exercice de ses fonctions.'),
      ],
    },
    {
      heading: 'TITRE III – ASSOCIÉS & PARTS SOCIALES',
      clauses: [
        article(14, 'Droits attachés aux parts sociales', 'Chaque associé dispose de droits financiers et politiques proportionnels à sa participation au capital social.'),
        article(15, 'Responsabilité des associés', 'Les associés supportent les pertes sociales à concurrence de leurs apports, sans solidarité entre eux, sauf stipulation contraire des présents statuts.'),
        article(16, 'Cession de parts entre associés', 'Les cessions de parts sociales entre associés sont libres, sous réserve des présents statuts.'),
        article(17, 'Cession de parts à des tiers', 'Toute cession de parts sociales au profit d’un tiers est soumise à l’agrément préalable des associés.'),
        article(18, 'Agrément', 'L’agrément est décidé par les associés dans les conditions prévues aux présents statuts.'),
        article(19, 'Transmission par décès', 'En cas de décès d’un associé, la transmission de ses parts sociales s’effectue conformément à la loi et aux présents statuts.'),
        article(20, 'Retrait d’un associé', 'Le retrait d’un associé peut être organisé dans les conditions prévues par la loi et les présents statuts.'),
      ],
    },
    {
      heading: 'TITRE IV – DÉCISIONS COLLECTIVES',
      clauses: [
        article(21, 'Décisions ordinaires', 'Les décisions ordinaires sont prises par les associés selon les majorités prévues par la loi et les présents statuts.'),
        article(22, 'Décisions extraordinaires', 'Les décisions modificatives des statuts sont prises dans les conditions de quorum et majorité requises.'),
        article(23, 'Convocation', 'Les associés sont convoqués par le Gérant ou par les associés habilités.'),
        article(24, 'Procès-verbaux', 'Les décisions collectives sont constatées par procès-verbal conservé au siège social.'),
      ],
    },
    {
      heading: 'TITRE V – COMPTES & RÉSULTATS',
      clauses: [
        article(25, 'Comptes sociaux', 'Le Gérant arrête les comptes annuels conformément aux dispositions applicables aux sociétés civiles.'),
        article(26, 'Affectation du résultat', `Le résultat est affecté conformément à la loi : ${data.affectationResultat}.`),
        article(27, 'Répartition des bénéfices et pertes', 'Les bénéfices et pertes sont répartis entre les associés proportionnellement à leur participation au capital social.'),
      ],
    },
    {
      heading: 'TITRE VI – DISSOLUTION & LIQUIDATION',
      clauses: [
        article(28, 'Dissolution', 'La Société est dissoute dans les cas prévus par la loi ou par décision collective.'),
        article(29, 'Liquidation', 'La liquidation est conduite conformément à la loi.'),
      ],
    },
    {
      heading: 'TITRE VII – DISPOSITIONS DIVERSES',
      clauses: [
        article(30, 'Contestations', `Toute contestation relève des juridictions de ${data.greffe}.`),
        article(31, 'Frais', 'Les frais des présentes sont à la charge de la Société.'),
        article(32, 'Formalités', `Pouvoirs pour l’immatriculation au greffe de ${data.greffe}.`),
        article(33, 'Pouvoirs', `Pouvoirs conférés à ${data.mandataire} selon l’annexe 3.`),
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
    metadata: { legalForm: 'SCI', template: 'william_sci_v1', ...data.metadataBundle },
  };
};

import { article, legalTitle } from '../shared/formatting.js';
import {
  buildCover,
  buildDefinitionsBlocks,
  buildObjetActeBlocks,
  buildSoussignesBlocks,
} from '../shared/identityBlocks.js';
import { buildStandardAnnexes } from '../shared/annexes.js';
import { buildSignatures } from '../shared/signatureBlocks.js';

const sarlFormation = (data) => [
  article(1, 'Forme', 'Il est formé entre les soussignés une Société à Responsabilité Limitée régie par les dispositions législatives et réglementaires en vigueur ainsi que par les présents statuts.'),
  article(2, 'Dénomination', `La Société prend la dénomination sociale « ${data.denomination} ». Tous actes et documents émanant de la Société mentionnent la dénomination sociale, précédée ou suivie de la mention « Société à Responsabilité Limitée » ou « SARL » et du montant du capital social.`),
  article(3, 'Objet social', `${data.objetSocial} La Société peut réaliser toutes opérations commerciales, financières, mobilières ou immobilières se rapportant directement ou indirectement à cet objet.`),
  article(4, 'Siège social', `Le siège social est fixé ${data.seat.full}. Il pourra être transféré par décision collective extraordinaire des associés.`),
  article(5, 'Durée', `La durée de la Société est fixée à ${data.duree} à compter de son immatriculation.`),
  article(6, 'Capital social', `Le capital social est fixé à ${data.capital} euros. Il est divisé en ${data.nombreTitres} parts sociales de ${data.valeurNominale} euro(s) de valeur nominale chacune.`),
  article(7, 'Apports', data.apportsNature === 'Oui'
    ? `Les associés apportent des apports en numéraire et en nature détaillés en annexe.`
    : `Les associés apportent des apports en numéraire pour un montant total égal au capital social.`),
  article(8, 'Parts sociales', 'Les parts sociales sont nominatives. Un registre des cessions de parts sociales est tenu au siège social.'),
  article(9, 'Exercice social', `Chaque exercice social commence le ${data.exerciceDebut} et se termine le ${data.exerciceFin}.`),
];

export const buildSarlStatutes = (data) => {
  const titles = [
    { heading: 'TITRE I – FORMATION DE LA SOCIÉTÉ', clauses: sarlFormation(data) },
    {
      heading: 'TITRE II – GÉRANCE',
      clauses: [
        article(10, 'Nomination du ou des Gérants', `${data.director} est nommé(e) Gérant(e) de la Société pour une durée indéterminée.`),
        article(11, 'Pouvoirs de la Gérance', 'Le ou les Gérants représentent la Société à l’égard des tiers et disposent des pouvoirs les plus étendus pour agir en toutes circonstances au nom de la Société, dans la limite de l’objet social.'),
        article(12, 'Rémunération', 'La rémunération éventuelle du ou des Gérants est fixée par décision collective des associés.'),
        article(13, 'Responsabilité de la Gérance', 'Le ou les Gérants sont responsables envers la Société et les tiers des fautes commises dans l’exercice de leurs fonctions.'),
        article(14, 'Conventions réglementées', 'Les conventions visées à l’article L. 223-19 du Code de commerce sont soumises aux règles légales de contrôle et d’autorisation.'),
      ],
    },
    {
      heading: 'TITRE III – DÉCISIONS COLLECTIVES',
      clauses: [
        article(15, 'Décisions ordinaires', 'Les décisions ordinaires sont prises par les associés représentant plus de la moitié des parts sociales, sauf majorité renforcée prévue par la loi.'),
        article(16, 'Décisions extraordinaires', 'Les décisions modificatives des statuts et les opérations de fusion, scission ou transformation sont prises dans les conditions légales de quorum et majorité.'),
        article(17, 'Convocation des associés', 'Les associés sont convoqués par le Gérant ou, le cas échéant, par les associés réunissant la fraction requise du capital social.'),
        article(18, 'Procès-verbaux', 'Les décisions collectives sont constatées par procès-verbal conservé au siège social.'),
      ],
    },
    {
      heading: 'TITRE IV – PARTS SOCIALES',
      clauses: [
        article(19, 'Droits attachés aux parts', 'Chaque part sociale confère à son titulaire des droits identiques de nature financière et politique, proportionnels à la quotité du capital qu’elle représente.'),
        article(20, 'Cession entre associés', 'Les cessions de parts sociales entre associés sont libres, sous réserve des stipulations contraires des présents statuts.'),
        article(21, 'Cession aux tiers', 'Toute cession de parts sociales au profit d’un tiers est soumise à l’agrément préalable des associés.'),
        article(22, 'Agrément', 'L’agrément est décidé par les associés représentant au moins la moitié des parts sociales, sauf majorité statutaire plus élevée.'),
        article(23, 'Transmission par décès', 'En cas de décès d’un associé, la transmission des parts sociales s’effectue conformément aux dispositions légales et aux présents statuts.'),
        article(24, 'Nantissement des parts', 'Le nantissement de parts sociales est soumis aux conditions légales et, le cas échéant, à l’agrément des associés.'),
      ],
    },
    {
      heading: 'TITRE V – COMPTES & RÉSULTATS',
      clauses: [
        article(25, 'Comptes sociaux', 'À la clôture de chaque exercice, le ou les Gérants arrêtent les comptes annuels conformément aux dispositions légales.'),
        article(26, 'Affectation du résultat', `Le résultat est affecté conformément à la loi et à la décision collective : ${data.affectationResultat}.`),
        article(27, 'Répartition des bénéfices', 'Les bénéfices distribuables sont répartis entre les associés proportionnellement au nombre de parts sociales détenues.'),
      ],
    },
    {
      heading: 'TITRE VI – DISSOLUTION & LIQUIDATION',
      clauses: [
        article(28, 'Dissolution', 'La Société est dissoute dans les cas prévus par la loi ou par décision collective extraordinaire.'),
        article(29, 'Liquidation', 'La liquidation est conduite conformément à la loi. Le liquidateur est nommé par décision collective.'),
      ],
    },
    {
      heading: 'TITRE VII – DISPOSITIONS DIVERSES',
      clauses: [
        article(30, 'Contestations', `Toute contestation relève des juridictions compétentes du ressort de ${data.greffe}.`),
        article(31, 'Frais', 'Les frais des présentes sont à la charge de la Société.'),
        article(32, 'Formalités', `Tous pouvoirs sont conférés pour l’immatriculation au greffe de ${data.greffe}.`),
        article(33, 'Pouvoirs', `Pouvoirs sont donnés à ${data.mandataire} conformément à l’annexe 3.`),
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
    metadata: { legalForm: 'SARL', template: 'william_sarl_v1', ...data.metadataBundle },
  };
};

export { sarlFormation };

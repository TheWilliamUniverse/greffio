import {
  article,
  legalTitle,
  paragraph,
} from '../shared/formatting.js';
import {
  buildCover,
  buildDefinitionsBlocks,
  buildObjetActeBlocks,
  buildSoussignesBlocks,
} from '../shared/identityBlocks.js';
import { buildStandardAnnexes } from '../shared/annexes.js';
import { buildSignatures } from '../shared/signatureBlocks.js';

const formationClauses = (data) => [
  article(1, 'Forme', 'Il est formé entre les soussignés une Société par Actions Simplifiée régie par les dispositions législatives et réglementaires en vigueur ainsi que par les présents statuts.'),
  article(2, 'Dénomination', `La Société prend la dénomination sociale « ${data.denomination} ».${data.sigle !== 'Non prévu' ? ` Elle pourra utiliser le sigle « ${data.sigle} ».` : ''} Tous actes et documents émanant de la Société indiquent la dénomination sociale, précédée ou suivie immédiatement de la mention « Société par Actions Simplifiée » ou de la sigle « SAS » et du montant du capital social.`),
  article(3, 'Objet social', `${data.objetSocial} La Société peut réaliser, directement ou indirectement, en France ou à l’étranger, toutes opérations commerciales, industrielles, financières, mobilières ou immobilières se rapportant directement ou indirectement à cet objet ou susceptibles d’en favoriser le développement.`),
  article(4, 'Siège social', `Le siège social est fixé ${data.seat.full}. Il pourra être transféré en tout autre lieu du même ressort de greffe, et en tout autre endroit par décision collective extraordinaire des associés, sous réserve des formalités légales.`),
  article(5, 'Durée', `La durée de la Société est fixée à ${data.duree} à compter de la date de son immatriculation au Registre du Commerce et des Sociétés, sauf prorogation ou dissolution anticipée.`),
  article(6, 'Capital social', `Le capital social est fixé à ${data.capital} euros. Il est ${data.capitalType.toLowerCase()}. Il est divisé en ${data.nombreTitres} actions de ${data.valeurNominale} euro(s) de valeur nominale chacune, entièrement souscrites et réparties conformément à l’annexe 1.`),
  article(7, 'Apports', data.apportsNature === 'Oui'
    ? `Les associés apportent à la Société des apports en numéraire et en nature, détaillés en annexe, pour une valeur totale correspondant au capital social. Les apports en nature sont évalués conformément aux dispositions légales.`
    : `Les associés apportent à la Société des apports en numéraire pour un montant total égal au capital social, conformément au tableau de répartition annexé.`),
  article(8, 'Exercice social', `Chaque exercice social a une durée d’une année, commençant le ${data.exerciceDebut} et se terminant le ${data.exerciceFin}. Par exception, le premier exercice pourra se clore à la date fixée par décision des associés.`),
];

export const buildSasStatutes = (data) => {
  const titles = [
    {
      heading: 'TITRE I – FORMATION DE LA SOCIÉTÉ',
      clauses: formationClauses(data),
    },
    {
      heading: 'TITRE II – ADMINISTRATION & ORGANISATION',
      clauses: [
        article(9, 'Président', `${data.director} est nommé(e) Président(e) de la Société pour une durée indéterminée, révocable dans les conditions prévues par la loi et les présents statuts.`),
        article(10, 'Directeur Général éventuel', data.directeursGeneraux === 'Aucun'
          ? 'Aucun Directeur Général n’est nommé à la date des présents statuts. La collectivité des associés pourra en nommer un ou plusieurs et déterminer leurs attributions.'
          : 'Un ou plusieurs Directeurs Généraux pourront être nommés par décision collective des associés. Leurs pouvoirs seront fixés dans l’acte de nomination.'),
        article(11, 'Pouvoirs du Président et du Directeur Général', 'Le Président représente la Société à l’égard des tiers. Il dispose des pouvoirs les plus étendus pour agir en toutes circonstances au nom de la Société, dans la limite de l’objet social. Le Directeur Général, s’il est nommé, exerce les pouvoirs qui lui sont conférés par les associés.'),
        article(12, 'Rémunération', 'La rémunération éventuelle du Président et des Directeurs Généraux est fixée par décision collective des associés.'),
        article(13, 'Conventions réglementées', 'Les conventions visées aux articles L. 227-1 et suivants du Code de commerce sont soumises aux règles légales de contrôle et, le cas échéant, d’autorisation préalable des associés.'),
      ],
    },
    {
      heading: 'TITRE III – DÉCISIONS COLLECTIVES',
      clauses: [
        article(14, 'Décisions collectives des associés', 'Les décisions relevant de la compétence des associés sont prises collectivement dans les formes prévues par la loi et les présents statuts.'),
        article(15, 'Consultation et convocation', `Les associés peuvent être consultés en assemblée générale, par consultation écrite ${data.consultationsEcrites === 'Non prévues' ? 'lorsque les statuts l’autorisent' : 'ou par acte unanime'}, selon les modalités fixées par le Président ou par les associés détenant la fraction requise du capital.`),
        article(16, 'Quorum et majorité', `Sauf dispositions légales ou statutaires contraires, les décisions collectives sont adoptées selon les règles suivantes : ${data.quorumMajorite}.`),
        article(17, 'Procès-verbaux', 'Les décisions collectives sont constatées par procès-verbal signé par le Président de séance et conservé au siège social.'),
      ],
    },
    {
      heading: 'TITRE IV – ACTIONS & MOUVEMENT DES TITRES',
      clauses: [
        article(18, 'Forme des actions / registre des mouvements', 'Les actions sont nominatives. Un registre des mouvements de titres est tenu au siège social conformément aux dispositions légales.'),
        article(19, 'Libération des actions', `Les actions souscrites en numéraire sont libérées à hauteur de ${data.liberationCapital} lors de la souscription.`),
        article(20, 'Cession des actions', 'Les cessions d’actions entre associés sont libres, sous réserve des stipulations contraires des présents statuts.'),
        article(21, 'Agrément', data.clauseAgrement === 'Non'
          ? 'Les cessions au profit de tiers ne sont pas soumises à agrément.'
          : 'Toute cession d’actions au profit d’un tiers est soumise à l’agrément préalable des associés.'),
        article(22, 'Préemption', data.clausePreemption === 'Non'
          ? 'Aucune clause de préemption n’est prévue à la date des présents statuts.'
          : 'Les associés bénéficient d’un droit de préemption sur les actions cédées, selon les modalités définies en annexe.'),
        article(23, 'Exclusion éventuelle', data.clauseExclusion === 'Prévue'
          ? 'Les associés pourront être exclus dans les cas et conditions prévus par la loi et les présents statuts.'
          : 'Aucune clause d’exclusion spécifique n’est prévue à la date des présents statuts.'),
        article(24, 'Droits et obligations attachés aux actions', 'Chaque action confère à son titulaire, compte tenu de la quotité de capital qu’elle représente, un droit aux bénéfices, à l’actif net et au boni de liquidation, ainsi qu’un droit de vote dans les conditions légales et statutaires.'),
      ],
    },
    {
      heading: 'TITRE V – COMPTES & RÉSULTATS',
      clauses: [
        article(25, 'Comptes sociaux', 'À la clôture de chaque exercice, le Président arrête les comptes annuels conformément aux dispositions légales et réglementaires.'),
        article(26, 'Affectation du résultat', `Après approbation des comptes, le résultat est affecté conformément à la loi et selon la règle suivante : ${data.affectationResultat}.`),
      ],
    },
    {
      heading: 'TITRE VI – DISSOLUTION & LIQUIDATION',
      clauses: [
        article(27, 'Dissolution', 'La Société est dissoute dans les cas prévus par la loi ou par décision collective extraordinaire des associés.'),
        article(28, 'Liquidation', 'La liquidation est conduite conformément à la loi. Le liquidateur est nommé et ses pouvoirs définis par décision des associés.'),
      ],
    },
    {
      heading: 'TITRE VII – LITIGES & DISPOSITIONS DIVERSES',
      clauses: [
        article(29, 'Médiation préalable', data.mediation === 'Non prévu'
          ? 'Les parties pourront recourir à une médiation amiable avant toute action judiciaire.'
          : 'Tout différend relatif à l’interprétation ou l’exécution des présents statuts fera l’objet d’une médiation préalable.'),
        article(30, 'Litiges', `Toute contestation relative aux affaires sociales relève, sous réserve des règles impératives, de la compétence des tribunaux du ressort du siège social (${data.greffe}).`),
        article(31, 'Frais, formalités et pouvoirs', `Les frais, droits et débours des présentes et de leurs suites sont à la charge de la Société. Tous pouvoirs sont conférés au porteur d’un original ou d’une copie certifiée conforme des présents statuts pour accomplir les formalités d’immatriculation et de publicité légale, notamment auprès du greffe de ${data.greffe}.`),
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
    metadata: { legalForm: 'SAS', template: 'william_sas_v1', ...data.metadataBundle },
  };
};

export { formationClauses as sasFormationClauses };

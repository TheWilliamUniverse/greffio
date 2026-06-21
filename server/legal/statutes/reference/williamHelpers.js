import { article, legalTitle, paragraph, sectionTitle } from '../shared/formatting.js';
import {
  formatLegalEntityAssociateDescription,
  formatPhysicalPersonIdentityLine,
  formatSignatureColumnForParty,
} from '../../../shared/partyIdentityFormatter.js';

export const sigleSuffix = (data) => (
  data.sigle && data.sigle !== 'Non prévu' ? `, et de sigle ${data.sigle}` : ''
);

export const buildWilliamCover = (data) => ({
  title: 'STATUTS',
  legalForm: data.legalForm,
  legalFormLabel: data.legalFormLabel || 'Société par Actions Simplifiée (SAS)',
  denomination: data.denomination,
  sigle: data.sigle !== 'Non prévu' ? data.sigle : null,
  capitalLine: `${data.legalFormShort || 'Société par Actions Simplifiée'} au capital de ${data.capital} euros`,
  seatBlock: `Siège social :\n${data.seat.line1}${data.seat.line2 ? `\n${data.seat.line2}` : ''}\n${data.seat.postalCode} ${data.seat.city}`,
  registryLine: data.isRegistered === false
    ? `En cours d'immatriculation au Registre du Commerce et des Sociétés de ${data.greffe}`
    : `Immatriculée au Registre du Commerce et des Sociétés de ${data.greffe}`,
  reference: data.reference,
  date: data.dateDocument,
});

export const buildWilliamSoussignes = (data, { unique = false } = {}) => {
  const blocks = [sectionTitle(unique ? 'L\'ASSOCIÉ UNIQUE :' : 'LES SOUSSIGNÉS :')];
  const associates = data.associates || [];

  associates.forEach((associate, index) => {
    if (index > 0 && !unique) blocks.push(paragraph('ET'));
    if (associate.associateType === 'personne_morale') {
      blocks.push(paragraph(formatLegalEntityAssociateDescription(associate, {
        greffeCity: data.greffe,
        companyCapital: data.capital,
      })));
      return;
    }
    blocks.push(paragraph(formatPhysicalPersonIdentityLine(associate)));
    if (associate.legalRepresentatives) {
      blocks.push(paragraph(`Représentée légalement par ${associate.legalRepresentatives}, jusqu'à sa majorité.`));
    } else if (!associate.isMinor || associate.isMinorEmancipated) {
      blocks.push(paragraph(''));
    }
  });

  if (!unique && associates.length > 1) {
    blocks.push(paragraph('Ci-après dénommés collectivement « les Associés »,'));
  }
  blocks.push({ kind: 'blank' });
  return blocks;
};

export const buildWilliamDefinitions = (data, { unique = false, securities = 'actions', directorLabel = 'Président' } = {}) => {
  const blocks = [
    sectionTitle('Définitions :'),
    paragraph('Aux fins des présents statuts, les termes ci-dessous ont la signification suivante :'),
    paragraph(unique
      ? `Associé unique : désigne ${data.associates?.[0]?.label || 'la personne identifiée aux présentes'}.`
      : `Associé(s) : désigne toute personne physique ou morale titulaire d'au moins une ${securities.slice(0, -1)} dans la Société, à la date de constitution ou ultérieurement.`),
    paragraph(`Dirigeant(s) : désigne le ${directorLabel} de la Société, ainsi que tout Directeur Général nommé par la Société.`),
    paragraph('Société : désigne la Société en formation, régie par les présents statuts et les textes juridiques en vigueur, et destinée à acquérir la personnalité morale à son immatriculation au Registre du Commerce et des Sociétés.'),
    { kind: 'blank' },
  ];
  return blocks;
};

export const buildWilliamObjetActe = (data, { unique = false } = {}) => [
  sectionTitle('Objet du présent acte :'),
  paragraph(unique
    ? "L'associé unique convient d'établir les présents statuts, qui régissent l'organisation, et le fonctionnement de la Société."
    : "Les Associés conviennent d'établir entre eux les présents statuts, qui régissent l'organisation, et le fonctionnement de la Société."),
  paragraph(unique
    ? 'Ces statuts s\'appliquent également à toute personne qui deviendrait ultérieurement associé de la Société.'
    : 'Ces statuts s\'appliquent également à toute personne qui deviendrait ultérieurement Associé.'),
  paragraph('IL A ÉTÉ CONVENU ET DÉCIDÉ CE QUI SUIT :'),
  { kind: 'blank' },
];

export const objetSocialWilliam = (data) => {
  const bullets = data.objetSocialBullets?.length
    ? data.objetSocialBullets
    : String(data.objetSocial || '').split(/\n+/).filter(Boolean);
  const bulletText = bullets.length
    ? bullets.map((b) => `● ${b}`).join('\n\n')
    : `● ${data.objetSocial}`;
  return [
    'La Société a pour objet social, directement ou indirectement, tant en France qu\'à l\'étranger :',
    '',
    bulletText,
    '',
    `${data.denomination} est habilitée à exercer ses activités sous toute enseigne, marque ou nom commercial de son choix, et à commercialiser tous biens ou services non réglementés, directement ou indirectement, à ses clients dans ses marchés.`,
    '',
    'Et plus généralement, toutes opérations industrielles, commerciales, financières, mobilières et/ou immobilières se rapportant directement ou indirectement à l\'objet social ci-dessus et à tous objets ou connexes pouvant favoriser son développement.',
  ].join('\n');
};

export const capitalRepartitionWilliam = (data) => {
  if (data.capitalRepartitionLines?.length) {
    return data.capitalRepartitionLines.join('\n');
  }
  return (data.associates || []).map((a) => (
    `${a.label} : ${a.share || '–'} des actions, soit ${a.titlesCount || '–'} actions.`
  )).join('\n');
};

export const apportsWilliam = (data) => {
  if (data.apportsDetail) return data.apportsDetail;
  const num = data.apportsNumeraireTotal || data.capital;
  const nature = data.apportsNatureTotal || (data.apportsNature === 'Oui' ? 'à compléter' : '0');
  const sections = (data.associates || []).map((a, i) => {
    const n = i + 1;
    return [
      `7.${n} Apports de ${a.label} :`,
      `Apport en numéraire de ${a.contributionCash || 'à compléter'} euros, libéré à hauteur de ${a.liberationRate || '50%'} lors de la constitution${a.liberationAmount ? `, soit ${a.liberationAmount} euros` : ''}.`,
      '',
      a.contributionInKind ? `Apports en nature : ${a.contributionInKind}` : 'Pas d\'apports en nature.',
      a.isMinor && !a.isMinorEmancipated
        ? `\nÉtant mineur${a.civility === 'Mme' ? 'e' : ''} non émancipé${a.civility === 'Mme' ? 'e' : ''} au jour de la constitution, la souscription et la libération sont réalisées pour son compte par ses représentants légaux conformément à l’article 382 du Code civil.`
        : '',
      '',
    ].join('\n');
  }).join('\n');
  return [
    `Les associés apportent en numéraire la somme de ${num} euros.`,
    `Les apports en nature sont chiffrés à ${nature} euros.`,
    '',
    sections,
    'Les associés ont décidé de ne pas recourir à un commissaire aux apports conformément à la loi.',
    '',
    '7.4 Libération partielle des apports',
    'Les apports en numéraire qui ne sont pas libérés au moment de la constitution de la Société, le seront par appel du Président dans les cinq années civiles qui suivent sa création, en vertu de la Loi.',
    '',
    '7.5 Dépôt des fonds',
    `La somme de ${data.depotFonds || 'à compléter'} euros, correspondant aux apports en numéraire libérés à la constitution est déposée sur un compte ouvert au nom de la société en formation, attesté par le dépositaire.`,
  ].join('\n');
};

export const buildWilliamSignatures = (data) => {
  const city = data.signatureCity || data.seat?.city || 'Ville à compléter';
  const date = data.signatureDate || data.dateDocument
    || new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const rawCopies = String(data.exemplairesOriginaux || '').trim();
  const associateCount = (data.associates || []).length;
  const copies = /exemplaires?/i.test(rawCopies)
    ? rawCopies
    : (() => {
      const parsed = parseInt(rawCopies.replace(/\D/g, ''), 10);
      if (Number.isFinite(parsed) && parsed > 0) return `${parsed} exemplaires originaux`;
      return `${Math.max(associateCount, 1) + 1} exemplaires originaux`;
    })();
  const associates = data.associates || [];
  const useGrid = associates.length > 1 && ['SAS', 'SASU'].includes(String(data.legalForm || '').toUpperCase());

  const associateBlock = data.associateBlockOverride || (useGrid ? {
    layout: 'grid',
    columns: associates.map((a) => formatSignatureColumnForParty(a)),
  } : {
    role: associates.length === 1 ? "L'associé unique" : 'Les associés',
    names: associates.map((a) => a.label),
    roles: associates.map((a) => a.roleLabel || 'Associé'),
    mention: 'Lu et approuvé',
  });

  return {
    title: 'SIGNATURES',
    intro: [
      `Établi à ${city} le ${date},`,
      `En ${copies}.`,
      'Chaque associé reconnaît avoir pris connaissance de l\'intégralité des présents statuts et les accepter sans réserve.',
      'Signatures des associés précédées de la mention : « Lu et approuvé »',
    ],
    associateBlock,
    directorBlock: useGrid ? null : (data.president ? {
      role: 'Président désigné',
      names: [data.president],
      mention: 'Lu et approuvé',
    } : null),
    generalDirectorBlock: useGrid ? null : (data.directeurGeneral && data.directeurGeneral !== 'Aucun' ? {
      role: 'Directeur Général',
      names: [data.directeurGeneral],
      mention: 'Lu et approuvé',
    } : null),
    minorRepresentationNote: data.minorRepresentationNote || null,
  };
};

export { article, legalTitle, paragraph, sectionTitle };

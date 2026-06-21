import {
  DIRECTOR_LABELS,
  LEGAL_FORM_LABELS,
  SECURITY_LABELS,
  isUniqueAssociateForm,
  paragraph,
  sectionTitle,
} from './formatting.js';

export const buildCover = (data) => {
  const label = LEGAL_FORM_LABELS[data.legalForm] || data.legalForm;
  const securities = SECURITY_LABELS[data.legalForm] || SECURITY_LABELS.SAS;
  const registryStatus = data.isRegistered
    ? `Immatriculée au Registre du Commerce et des Sociétés de ${data.greffe}`
    : `En cours d’immatriculation au Registre du Commerce et des Sociétés de ${data.greffe}`;

  return {
    title: 'STATUTS',
    legalForm: data.legalForm,
    legalFormLabel: label,
    denomination: data.denomination,
    sigle: data.sigle !== 'Non prévu' ? data.sigle : null,
    capitalLine: `${label} au capital de ${data.capital} euros`,
    seatBlock: `Siège social :\n${data.seat.full}`,
    registryLine: registryStatus,
    reference: data.reference,
    date: data.dateDocument,
    securitiesLabel: securities.plural,
  };
};

export const buildSoussignesBlocks = (data) => {
  const blocks = [
    sectionTitle(isUniqueAssociateForm(data.legalForm) ? 'L’ASSOCIÉ UNIQUE :' : 'LES SOUSSIGNÉS :'),
  ];

  data.associates.forEach((associate, index) => {
    const lines = [
      associate.label,
      `demeurant ${associate.address},`,
      associate.birthDate ? `né(e) le ${associate.birthDate}${associate.birthPlace ? ` à ${associate.birthPlace}` : ''},` : null,
      `de nationalité ${associate.nationality || 'Française'}.`,
      associate.isMinor ? 'Agissant en qualité de mineur émancipé ou représenté par son représentant légal, selon le cas.' : null,
    ].filter(Boolean);

    if (!isUniqueAssociateForm(data.legalForm) && data.associates.length > 1) {
      blocks.push(paragraph(`Associé ${index + 1} –`));
    }
    lines.forEach((line) => blocks.push(paragraph(line)));
    blocks.push({ kind: 'blank' });
  });

  return blocks;
};

export const buildDefinitionsBlocks = (data) => {
  const securities = SECURITY_LABELS[data.legalForm] || SECURITY_LABELS.SAS;
  const director = DIRECTOR_LABELS[data.legalForm] || 'Dirigeant';
  const unique = isUniqueAssociateForm(data.legalForm);

  const items = unique
    ? [
      `« Associé unique » : ${data.associates[0]?.label || 'la personne identifiée aux présentes'}.`,
      `« ${securities.plural.charAt(0).toUpperCase() + securities.plural.slice(1)} » : titres composant le capital social de la Société.`,
      `« ${director} » : dirigeant investi des pouvoirs de représentation de la Société.`,
      '« Société » : la société constituée aux termes des présents statuts.',
      '« Décision de l’associé unique » : toute décision relevant de la compétence des associés, prise par l’associé unique.',
    ]
    : [
      '« Associé(s) » : toute personne physique ou morale titulaire de titres dans la Société.',
      `« ${securities.plural.charAt(0).toUpperCase() + securities.plural.slice(1)} » : titres composant le capital social de la Société.`,
      `« ${director} » : dirigeant investi des pouvoirs de représentation de la Société.`,
      '« Société » : la société constituée aux termes des présents statuts.',
      '« Décision collective » : toute décision prise par les associés dans les formes prévues aux présents statuts.',
    ];

  if (data.legalForm === 'SCI') {
    items.push('« Immeuble » : tout bien immobilier détenu par la Société dans le cadre de son objet social.');
  }

  return [
    sectionTitle('DÉFINITIONS'),
    ...items.map((text) => paragraph(text)),
    { kind: 'blank' },
  ];
};

export const buildObjetActeBlocks = (data) => {
  const unique = isUniqueAssociateForm(data.legalForm);
  return [
    sectionTitle('OBJET DU PRÉSENT ACTE'),
    paragraph(unique
      ? 'L’associé unique établit les présents statuts, qui régissent l’organisation et le fonctionnement de la Société.'
      : 'Les Associés conviennent d’établir entre eux les présents statuts, qui régissent l’organisation et le fonctionnement de la Société.'),
    paragraph(unique
      ? 'Ces statuts s’appliquent également à toute personne qui deviendrait ultérieurement associé de la Société.'
      : 'Ces statuts s’appliquent également à toute personne qui deviendrait ultérieurement Associé.'),
    paragraph('IL A ÉTÉ CONVENU ET DÉCIDÉ CE QUI SUIT :'),
    { kind: 'blank' },
  ];
};

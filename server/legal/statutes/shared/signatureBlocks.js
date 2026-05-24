import { DIRECTOR_LABELS, isUniqueAssociateForm } from './formatting.js';

export const buildSignatures = (data) => {
  const directorRole = DIRECTOR_LABELS[data.legalForm] || 'Dirigeant';
  const unique = isUniqueAssociateForm(data.legalForm);
  const city = data.signatureCity || data.seat.city;
  const date = data.signatureDate || data.dateDocument;
  const copies = unique ? '1 exemplaire original' : `${Math.max(data.associates.length, 2)} exemplaires originaux`;

  return {
    title: 'SIGNATURES',
    intro: [
      `Fait à ${city},`,
      `Le ${date},`,
      `En ${copies}.`,
    ],
    associateBlock: unique
      ? {
        role: 'L’associé unique',
        names: data.associates.map((a) => a.label),
        mention: 'Lu et approuvé',
      }
      : {
        role: 'Les associés',
        names: data.associates.map((a) => a.label),
        mention: 'Lu et approuvé',
        footer: 'Chaque associé reconnaît avoir pris connaissance de l’intégralité des présents statuts et les accepter sans réserve.',
      },
    directorBlock: {
      role: directorRole,
      names: [data.director],
      mention: `Bon pour acceptation des fonctions de ${directorRole}`,
    },
  };
};

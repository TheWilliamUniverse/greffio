const SASU_REPLACEMENTS = [
  ['Société par Actions Simplifiée dénommée', 'Société par Actions Simplifiée Unipersonnelle dénommée'],
  ['Société par Actions Simplifiée (SAS)', 'Société par Actions Simplifiée Unipersonnelle (SASU)'],
  ['Société par Actions Simplifiée', 'Société par Actions Simplifiée Unipersonnelle'],
  ['TITRE III – DÉCISIONS COLLECTIVES', "TITRE III – DÉCISIONS DE L'ASSOCIÉ UNIQUE"],
  ['Décisions collectives des Associés', "Décisions de l'associé unique"],
  ['Décisions collectives des associés', "Décisions de l'associé unique"],
  ['des associés', "de l'associé unique"],
  ['des Associés', "de l'associé unique"],
  ['Les associés', "L'associé unique"],
  ['les associés', "l'associé unique"],
  ['Les Associés', "L'associé unique"],
  ["Consultation et convocation de l'Assemblée Générale", "Consultation et convocation de l'associé unique"],
  ['assemblée générale ordinaire', "décision de l'associé unique"],
  ['Assemblée Générale Ordinaire', "Décision de l'associé unique"],
  ['assemblées générales extraordinaires', "décisions extraordinaires de l'associé unique"],
  ['Assemblée Générale Extraordinaire', "Décision extraordinaire de l'associé unique"],
  ['assemblée générale', "décision de l'associé unique"],
  ['Assemblée Générale', "Décision de l'associé unique"],
  ['Pacte des Associés', "Pacte d'associé"],
  ['Les Associés peuvent', "L'associé unique peut"],
];

const replaceAll = (text) => {
  let out = String(text || '');
  SASU_REPLACEMENTS.forEach(([from, to]) => {
    out = out.split(from).join(to);
  });
  return out;
};

export const applySasuAdaptationsToBlocks = (blocks) => blocks
  .filter((block) => !(block.kind === 'article' && [17, 18].includes(block.articleNumber)))
  .map((block) => ({
    ...block,
    text: block.text ? replaceAll(block.text) : block.text,
    heading: block.heading ? replaceAll(block.heading) : block.heading,
  }));

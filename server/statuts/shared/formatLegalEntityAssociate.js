const legalFormLabelFromCode = (form) => {
  const f = String(form || 'SAS').toUpperCase();
  if (f === 'SASU') return 'Société par Actions Simplifiée Unipersonnelle (SASU)';
  if (f === 'SAS') return 'Société par Actions Simplifiée (SAS)';
  return f;
};

export const formatLegalEntityAssociateDescription = (associate = {}, { greffeCity } = {}) => {
  const name = associate.fullName || associate.label || associate.companyName || 'Société associée à compléter';
  const legalForm = associate.legalFormLabel
    || legalFormLabelFromCode(associate.legalForm);
  const greffe = greffeCity || associate.rcsCity || 'Nice';
  const sirenSuffix = associate.siren ? ` ${associate.siren}` : '';
  const rcsPart = `immatriculée au RCS de ${greffe}${sirenSuffix}`;
  const seatPart = associate.address ? `, et dont le siège social est situé ${associate.address}` : '';
  const repPart = associate.representativeName ? `, représentée par ${associate.representativeName}` : '';
  const rolePart = associate.roleLabel ? `, agissant en qualité de ${associate.roleLabel}` : '';
  return `${name}, ${legalForm}, ${rcsPart}${seatPart}${repPart}${rolePart}.`;
};

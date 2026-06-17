const PARIS_TZ = 'Europe/Paris';

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatParisDateTimeParts = (value) => {
  const date = toDate(value);
  if (!date) return null;
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: PARIS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return {
    day: parts.day,
    month: parts.month,
    year: parts.year,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
};

const formatParisFrenchDateLong = (value) => {
  const date = toDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: PARIS_TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

/** DD/MM/YYYY HH:MM:SS — horodatage de signature sur tampon PDF */
const formatParisStampTimestamp = (value) => {
  const parts = formatParisDateTimeParts(value);
  if (!parts) return '';
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`;
};

/** 24 mai 2026 à 14 h 30 — libellé français pour documents signés */
const formatParisFrenchDateTime = (value) => {
  const parts = formatParisDateTimeParts(value);
  if (!parts) return formatParisFrenchDateLong(value);
  const dateLabel = formatParisFrenchDateLong(value);
  return `${dateLabel} à ${parts.hour} h ${parts.minute}`;
};

export {
  formatParisFrenchDateLong,
  formatParisFrenchDateTime,
  formatParisStampTimestamp,
};

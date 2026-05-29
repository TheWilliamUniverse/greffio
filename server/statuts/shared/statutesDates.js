const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

const pad2 = (n) => String(n).padStart(2, '0');

export const todayStatutesFrenchDate = () => (
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
);

const fromSlashDate = (raw) => {
  const match = String(raw || '').trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = match[3] ? Number(match[3]) : new Date().getFullYear();
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${day} ${MONTHS[month - 1]}${match[3] ? ` ${year}` : ''}`;
};

const fromIsoDate = (raw) => {
  const match = String(raw || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${day} ${MONTHS[month - 1]} ${year}`;
};

/** Date longue FR sans slash (naissance, signature, document). */
export const formatStatutesFrenchDate = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return todayStatutesFrenchDate();
  const slash = fromSlashDate(raw);
  if (slash) return slash;
  const iso = fromIsoDate(raw);
  if (iso) return iso;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(parsed);
  }
  return raw.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
};

/** Clôture d'exercice : « 31/12 » → « 31 décembre ». */
export const formatStatutesFiscalEnd = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '31 décembre';
  const slash = fromSlashDate(raw);
  if (slash) return slash;
  return formatStatutesFrenchDate(raw);
};

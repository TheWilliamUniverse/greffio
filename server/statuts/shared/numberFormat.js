/** Formatage nombres FR lisible en PDF (espaces normaux, pas de séparateur fine U+202F). */

export const parseFrenchAmount = (value) => {
  const normalized = String(value || '')
    .replace(/\s/g, '')
    .replace(/\u202F/g, '')
    .replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
};

export const formatFrInteger = (value) => {
  const amount = typeof value === 'number' ? value : parseFrenchAmount(value);
  if (!Number.isFinite(amount) || amount <= 0) return '0';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
    .format(amount)
    .replace(/\u202F/g, '\u00A0')
    .replace(/ /g, '\u00A0');
};

/** Applique des espaces insécables aux groupes de chiffres dans un texte (évite « 1 /000 » en PDF). */
export const pdfSafeAmountsInText = (text) => String(text || '').replace(
  /(\d{1,3}(?:[\s\u00A0\u202F]\d{3})+|\d{4,})/g,
  (match) => match.replace(/[\s\u202F]/g, '\u00A0'),
);

export const formatFrEuros = (value, { suffix = true } = {}) => {
  const formatted = formatFrInteger(value);
  if (!formatted || formatted === '0') return null;
  return suffix ? `${formatted} euros` : formatted;
};

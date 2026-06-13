/** Masque un email : 4 premières lettres visibles par segment (local + domaine), le reste en *. */
export const maskEmailFirstFour = (email) => {
  const raw = String(email || '').trim();
  if (!raw) return '****';

  const maskPart = (part) => {
    if (!part) return '****';
    if (part.length <= 4) return part;
    return `${part.slice(0, 4)}${'*'.repeat(Math.max(part.length - 4, 4))}`;
  };

  const at = raw.indexOf('@');
  if (at <= 0) {
    return maskPart(raw);
  }

  return `${maskPart(raw.slice(0, at))}@${maskPart(raw.slice(at + 1))}`;
};

const formatParisDateTime = (date = new Date()) => new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  dateStyle: 'full',
  timeStyle: 'short',
}).format(date instanceof Date ? date : new Date(date));

const parseDeviceLabel = (userAgent = '') => {
  const ua = String(userAgent || '');
  if (!ua.trim()) return 'Appareil non identifié';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'Appareil Apple';
  if (/Android/i.test(ua)) return 'Appareil Android';
  if (/Windows/i.test(ua)) return 'Ordinateur Windows';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'Ordinateur Mac';
  if (/Linux/i.test(ua)) return 'Ordinateur Linux';
  if (/Mobile/i.test(ua)) return 'Appareil mobile';
  return 'Navigateur web';
};

const getClientIp = (req) => {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req?.ip || req?.socket?.remoteAddress || 'Non disponible';
};

export {
  formatParisDateTime,
  getClientIp,
  parseDeviceLabel,
};

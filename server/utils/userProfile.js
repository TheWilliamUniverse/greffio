const PHONE_PATTERN = /^\+?[0-9][0-9\s().-]{7,18}$/;

const defaultProfile = () => ({
  civility: '',
  birthDate: '',
  phones: [],
  address: {
    searchQuery: '',
    line1: '',
    line2: '',
    city: '',
    postalCode: '',
    country: 'France',
    latitude: null,
    longitude: null,
    manualEntry: false,
  },
  preferences: {
    language: 'fr',
    contactChannel: 'email',
    notifications: {
      email: true,
      sms: false,
      dossierUpdates: true,
      marketing: false,
    },
    security: {
      loginAlertsEnabled: true,
      loginAlertsEnabledUpdatedAt: null,
    },
  },
});

const normalizePhone = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const isValidPhone = (value) => {
  const normalized = normalizePhone(value);
  if (!normalized) return false;
  const digits = normalized.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) return false;
  return PHONE_PATTERN.test(normalized);
};

const sanitizePhones = (phones = []) => {
  const list = Array.isArray(phones) ? phones : [];
  const cleaned = list
    .map((entry, index) => ({
      id: String(entry?.id || `phone_${index + 1}`),
      label: String(entry?.label || 'mobile').slice(0, 40),
      number: normalizePhone(entry?.number),
      isPrimary: Boolean(entry?.isPrimary),
    }))
    .filter((entry) => entry.number);

  if (!cleaned.length) return [];

  const primaryIndex = cleaned.findIndex((entry) => entry.isPrimary);
  const resolvedPrimary = primaryIndex >= 0 ? primaryIndex : 0;
  return cleaned.map((entry, index) => ({
    ...entry,
    isPrimary: index === resolvedPrimary,
  }));
};

const mergeProfile = (current, patch) => {
  const base = { ...defaultProfile(), ...(current || {}) };
  const next = {
    ...base,
    ...patch,
    address: { ...base.address, ...(patch?.address || {}) },
    preferences: {
      ...base.preferences,
      ...(patch?.preferences || {}),
      notifications: {
        ...base.preferences?.notifications,
        ...(patch?.preferences?.notifications || {}),
      },
      security: {
        ...base.preferences?.security,
        ...(patch?.preferences?.security || {}),
      },
    },
    phones: sanitizePhones(patch?.phones ?? base.phones),
  };
  return next;
};

const validateProfile = (profile) => {
  const errors = {};
  if (!String(profile?.firstName || '').trim()) errors.firstName = 'Le prénom est obligatoire.';
  if (!String(profile?.lastName || '').trim()) errors.lastName = 'Le nom est obligatoire.';
  if (profile?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
    errors.email = 'Adresse email invalide.';
  }
  (profile?.phones || []).forEach((phone, index) => {
    if (phone?.number && !isValidPhone(phone.number)) {
      errors[`phones.${index}`] = 'Format de téléphone invalide.';
    }
  });
  if (profile?.address?.postalCode && !/^[0-9A-Za-z\s-]{3,12}$/.test(profile.address.postalCode)) {
    errors.postalCode = 'Code postal invalide.';
  }
  return errors;
};

export {
  defaultProfile,
  mergeProfile,
  sanitizePhones,
  isValidPhone,
  normalizePhone,
  validateProfile,
};

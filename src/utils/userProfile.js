export const CIVILITY_OPTIONS = [
  { value: 'M.', label: 'Monsieur' },
  { value: 'Mme', label: 'Madame' },
  { value: 'Autre', label: 'Autre' },
];

export const CONTACT_CHANNEL_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Téléphone' },
  { value: 'both', label: 'Email et téléphone' },
];

export const LANGUAGE_OPTIONS = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
];

export const defaultUserProfile = () => ({
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
  },
});

export const normalizePhone = (value) => String(value || '').replace(/\s+/g, ' ').trim();

export const isValidPhone = (value) => {
  const normalized = normalizePhone(value);
  if (!normalized) return true;
  const digits = normalized.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) return false;
  return /^\+?[0-9][0-9\s().-]{7,18}$/.test(normalized);
};

export const createPhoneEntry = (overrides = {}) => ({
  id: `phone_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  label: 'mobile',
  number: '',
  isPrimary: false,
  ...overrides,
});

export const sanitizePhones = (phones = []) => {
  const list = Array.isArray(phones) ? phones : [];
  const cleaned = list
    .map((entry, index) => ({
      id: String(entry?.id || `phone_${index + 1}`),
      label: String(entry?.label || 'mobile'),
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

export const mergeUserProfile = (current, patch) => {
  const base = { ...defaultUserProfile(), ...(current || {}) };
  return {
    ...base,
    ...patch,
    address: { ...base.address, ...(patch?.address || {}) },
    preferences: {
      ...base.preferences,
      ...(patch?.preferences || {}),
      notifications: {
        ...base.preferences.notifications,
        ...(patch?.preferences?.notifications || {}),
      },
    },
    phones: sanitizePhones(patch?.phones ?? base.phones),
  };
};

export const profileFromUser = (user) => mergeUserProfile(user?.profile, {
  civility: user?.profile?.civility || '',
  birthDate: user?.profile?.birthDate || '',
  phones: sanitizePhones(
    user?.profile?.phones?.length
      ? user.profile.phones
      : user?.phone
        ? [createPhoneEntry({ number: user.phone, isPrimary: true })]
        : [],
  ),
  address: user?.profile?.address || defaultUserProfile().address,
  preferences: user?.profile?.preferences || defaultUserProfile().preferences,
});

export const validateProfileForm = ({ firstName, lastName, email, phones, address }) => {
  const errors = {};
  if (!String(firstName || '').trim()) errors.firstName = 'Le prénom est obligatoire.';
  if (!String(lastName || '').trim()) errors.lastName = 'Le nom est obligatoire.';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Adresse email invalide.';
  (phones || []).forEach((phone, index) => {
    if (phone?.number && !isValidPhone(phone.number)) {
      errors[`phone_${index}`] = 'Numéro invalide (format FR ou international).';
    }
  });
  if (address?.postalCode && !/^[0-9A-Za-z\s-]{3,12}$/.test(String(address.postalCode).trim())) {
    errors.postalCode = 'Code postal invalide.';
  }
  return errors;
};

export const getCivilityAvatar = (civility) => {
  if (civility === 'Mme') {
    return { label: 'E', className: 'bg-[#1e4d8c] text-white', caption: 'Entrepreneure' };
  }
  if (civility === 'M.') {
    return { label: 'E', className: 'bg-[#0a1220] text-white', caption: 'Entrepreneur' };
  }
  return { label: 'G', className: 'bg-primary text-white', caption: 'Profil Greffio' };
};

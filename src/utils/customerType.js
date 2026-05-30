/**
 * Helpers front pour déterminer le type de client.
 *
 * Règle métier (PAYMENTS_ARCHITECTURE.md) :
 *  - Client particulier (pas de SIREN, pas de société liée) → 'b2c'
 *  - Client professionnel / société (SIREN connu)            → 'b2b'
 *
 * La décision **réelle** est refaite côté serveur ; ces helpers servent
 * uniquement à adapter l'UI (libellés, options affichées, mention de
 * sécurité). Ne **jamais** s'en servir comme source d'autorité.
 */
export const CUSTOMER_TYPE = Object.freeze({
  B2C: 'b2c',
  B2B: 'b2b',
});

export const inferCustomerType = (user, dossier) => {
  if (user?.company?.siren || user?.companyJson || user?.role === 'professional') {
    return CUSTOMER_TYPE.B2B;
  }
  const legalForm = String(dossier?.legalForm || '').toUpperCase();
  const isIndividualForm = legalForm === 'EI' || legalForm.includes('MICRO');
  if (dossier?.companyName && legalForm && !isIndividualForm && legalForm !== 'SASU') {
    return CUSTOMER_TYPE.B2B;
  }
  return CUSTOMER_TYPE.B2C;
};

export const isB2C = (customerType) => customerType === CUSTOMER_TYPE.B2C;
export const isB2B = (customerType) => customerType === CUSTOMER_TYPE.B2B;

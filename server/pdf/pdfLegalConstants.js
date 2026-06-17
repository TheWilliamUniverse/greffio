/** Baseline Y (pdf-lib, from page bottom) for the black signature line (trait noir). */
export const FORMALITY_POWERS_SIGNATURE_LINE_Y = 402;

/** Vertical offsets above the trait noir for the page-5 signature block. */
export const FORMALITY_POWERS_SIGNATURE_HEADING_ABOVE_LINE = 108;
export const FORMALITY_POWERS_SIGNATURE_FAIT_ABOVE_LINE = 86;
export const FORMALITY_POWERS_SIGNATURE_LABEL_ABOVE_LINE = 66;

/** Image stamp sits this many pt above the trait noir (formality powers). */
export const FORMALITY_POWERS_STAMP_ABOVE_LINE = -4;

/** Reserved stamp image height above the trait noir. */
export const FORMALITY_POWERS_STAMP_MAX_HEIGHT = 48;

/** Electronic timestamp sits this many pt below the trait noir. */
export const FORMALITY_POWERS_ELECTRONIC_STAMP_BELOW_LINE = 12;

/** First identity line (name) below the trait noir. */
export const FORMALITY_POWERS_IDENTITY_BELOW_LINE = 30;

export const formalityPowersSignatureStampY = (
  lineY = FORMALITY_POWERS_SIGNATURE_LINE_Y,
) => lineY + FORMALITY_POWERS_STAMP_ABOVE_LINE;

export const formalityPowersElectronicStampY = (
  lineY = FORMALITY_POWERS_SIGNATURE_LINE_Y,
) => lineY - FORMALITY_POWERS_ELECTRONIC_STAMP_BELOW_LINE;

/** Right-column signature line for déclaration de non-condamnation (single page). */
export const NON_CONVICTION_SIGNATURE_LINE_Y = 290;

/** Offset above trait noir for « Fait à… » / « Signature du déclarant : » labels. */
export const NON_CONVICTION_SIGNATURE_LABEL_OFFSET = 30;

/** Name/image stamp sits this many pt above the trait noir (non-conviction only). */
export const NON_CONVICTION_STAMP_ABOVE_LINE = -8;

/** Electronic timestamp sits this many pt below the trait noir (non-conviction only). */
export const NON_CONVICTION_ELECTRONIC_STAMP_BELOW_LINE = 14;

/** Left-column signature line for liste des souscripteurs (last page). */
export const SUBSCRIBERS_LIST_SIGNATURE_LINE_Y = 278;

/** Vertical offsets above the trait noir for the subscribers-list signature block. */
export const SUBSCRIBERS_LIST_SIGNATURE_HEADING_ABOVE_LINE = 108;
export const SUBSCRIBERS_LIST_SIGNATURE_FAIT_ABOVE_LINE = 86;
export const SUBSCRIBERS_LIST_SIGNATURE_NAME_ABOVE_LINE = 66;
export const SUBSCRIBERS_LIST_SIGNATURE_CAPACITY_ABOVE_LINE = 48;
export const SUBSCRIBERS_LIST_SIGNATURE_LABEL_ABOVE_LINE = 32;

/** Electronic timestamp sits this many pt below the trait noir (subscribers list). */
export const SUBSCRIBERS_LIST_ELECTRONIC_STAMP_BELOW_LINE = 14;

/** Flowing content must stay above this Y (pdf-lib, from page bottom). */
export const SUBSCRIBERS_LIST_CONTENT_BOTTOM_Y = 450;

/** Name/image stamp sits this many pt above the trait noir (subscribers list only). */
export const SUBSCRIBERS_LIST_STAMP_ABOVE_LINE = -8;

/** Signature line for procuration / mandat Greffio (single page). */
export const MANDATE_SIGNATURE_LINE_Y = 278;

/** Image/text stamp sits this many pt above the trait noir (mandate default). */
export const SIGNATURE_STAMP_ABOVE_LINE = 8;

/** Stamp Y baseline = line Y + SIGNATURE_STAMP_ABOVE_LINE */
export const signatureStampY = (lineY) => lineY + SIGNATURE_STAMP_ABOVE_LINE;

/** Subscribers list name/image stamp baseline (above trait noir). */
export const subscribersListSignatureStampY = (
  lineY = SUBSCRIBERS_LIST_SIGNATURE_LINE_Y,
) => lineY + SUBSCRIBERS_LIST_STAMP_ABOVE_LINE;

/** Non-conviction signature image bottom / text anchor zone (above trait noir). */
export const nonConvictionSignatureStampY = (
  lineY = NON_CONVICTION_SIGNATURE_LINE_Y,
) => lineY + NON_CONVICTION_STAMP_ABOVE_LINE;

/** Non-conviction electronic timestamp baseline (below trait noir, above rappel). */
export const nonConvictionElectronicStampY = (
  lineY = NON_CONVICTION_SIGNATURE_LINE_Y,
) => lineY - NON_CONVICTION_ELECTRONIC_STAMP_BELOW_LINE;

/** Subscribers list electronic timestamp baseline (below trait noir). */
export const subscribersListElectronicStampY = (
  lineY = SUBSCRIBERS_LIST_SIGNATURE_LINE_Y,
) => lineY - SUBSCRIBERS_LIST_ELECTRONIC_STAMP_BELOW_LINE;

/** Baseline Y for legal rappel text pinned above the footer band (page bottom). */
export const LEGAL_RAPPEL_BOTTOM_Y = 38;

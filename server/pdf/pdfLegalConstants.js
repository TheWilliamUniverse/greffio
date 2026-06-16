/** Baseline Y (pdf-lib, from page bottom) for the black signature line (trait noir). */
export const FORMALITY_POWERS_SIGNATURE_LINE_Y = 463;

/** Right-column signature line for déclaration de non-condamnation (single page). */
export const NON_CONVICTION_SIGNATURE_LINE_Y = 290;

/** Offset above trait noir for « Fait à… » / « Signature du déclarant : » labels. */
export const NON_CONVICTION_SIGNATURE_LABEL_OFFSET = 30;

/** Name/image stamp sits this many pt above the trait noir (non-conviction only). */
export const NON_CONVICTION_STAMP_ABOVE_LINE = 22;

/** Electronic timestamp sits this many pt below the trait noir (non-conviction only). */
export const NON_CONVICTION_ELECTRONIC_STAMP_BELOW_LINE = 14;

/** Left-column signature line for liste des souscripteurs (last page). */
export const SUBSCRIBERS_LIST_SIGNATURE_LINE_Y = 278;

/** Signature line for procuration / mandat Greffio (single page). */
export const MANDATE_SIGNATURE_LINE_Y = 278;

/** Image/text stamp sits this many pt above the trait noir. */
export const SIGNATURE_STAMP_ABOVE_LINE = 8;

/** Stamp Y baseline = line Y + SIGNATURE_STAMP_ABOVE_LINE */
export const signatureStampY = (lineY) => lineY + SIGNATURE_STAMP_ABOVE_LINE;

/** Non-conviction signature image bottom / text anchor zone (above trait noir). */
export const nonConvictionSignatureStampY = (
  lineY = NON_CONVICTION_SIGNATURE_LINE_Y,
) => lineY + NON_CONVICTION_STAMP_ABOVE_LINE;

/** Non-conviction electronic timestamp baseline (below trait noir, above rappel). */
export const nonConvictionElectronicStampY = (
  lineY = NON_CONVICTION_SIGNATURE_LINE_Y,
) => lineY - NON_CONVICTION_ELECTRONIC_STAMP_BELOW_LINE;

/** Baseline Y for legal rappel text pinned above the footer band (page bottom). */
export const LEGAL_RAPPEL_BOTTOM_Y = 38;

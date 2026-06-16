import fs from 'node:fs';
import path from 'node:path';
import { generateNonConvictionPdf } from '../pdf/nonConvictionPdf.js';
import { generateSubscribersListPdf } from '../pdf/subscribersListPdf.js';
import { generateFormalityPowersPdf } from '../pdf/formalityPowersPdf.js';
import { stampSignatureOnPdf } from '../pdf/stampSignatureOnPdf.js';
import {
  FORMALITY_POWERS_SIGNATURE_LINE_Y,
  FORMALITY_POWERS_STAMP_ABOVE_LINE,
  NON_CONVICTION_SIGNATURE_LINE_Y,
  NON_CONVICTION_STAMP_ABOVE_LINE,
  SUBSCRIBERS_LIST_SIGNATURE_LINE_Y,
  SUBSCRIBERS_LIST_STAMP_ABOVE_LINE,
  formalityPowersElectronicStampY,
  formalityPowersSignatureStampY,
  nonConvictionElectronicStampY,
  nonConvictionSignatureStampY,
  subscribersListSignatureStampY,
} from '../pdf/pdfLegalConstants.js';

const fmtNc = (stampAbove) => {
  const lineY = NON_CONVICTION_SIGNATURE_LINE_Y;
  const yBase = lineY + stampAbove;
  return {
    stampY: yBase,
    textSignatureY: yBase + 14,
    timestampY: lineY - 14,
  };
};

const fmtSub = (stampAbove) => {
  const lineY = SUBSCRIBERS_LIST_SIGNATURE_LINE_Y;
  const yBase = lineY + stampAbove;
  return { stampY: yBase, textSignatureY: yBase + 20 };
};

const fmtFp = () => ({
  stampY: formalityPowersSignatureStampY(),
  timestampY: formalityPowersElectronicStampY(),
});

console.log('=== NON-CONVICTION Y (before → after) ===');
console.log({ before: fmtNc(6), after: fmtNc(NON_CONVICTION_STAMP_ABOVE_LINE) });
console.log('timestamp unchanged:', nonConvictionElectronicStampY());

console.log('=== SUBSCRIBERS LIST Y (before → after) ===');
console.log({ before: fmtSub(0), after: fmtSub(SUBSCRIBERS_LIST_STAMP_ABOVE_LINE) });
console.log('helpers:', {
  stampY: subscribersListSignatureStampY(),
});

console.log('=== FORMALITY POWERS Y (before → after) ===');
console.log({
  before: { lineY: 405, stampY: 413, timestampY: 405 - 12 },
  after: {
    lineY: FORMALITY_POWERS_SIGNATURE_LINE_Y,
    stampY: formalityPowersSignatureStampY(),
    timestampY: formalityPowersElectronicStampY(),
    stampAboveLine: FORMALITY_POWERS_STAMP_ABOVE_LINE,
  },
});

const signedAt = '2026-06-16T16:40:36.000Z';
const signer = 'William Abdou';

const ncUnsigned = await generateNonConvictionPdf({
  filename: 'test_stamp_nc.pdf',
  fields: {
    declarantFirstName: 'William',
    declarantBirthName: 'ABDOU',
    declarantBirthDate: '1990-01-15',
    declarantBirthCity: 'Nice',
    addressLine1: '1 rue Example',
    postalCode: '06000',
    city: 'Nice',
    country: 'France',
    parent1FullName: 'Père Example',
    parent2FullName: 'Mère Example',
    statementCity: 'Nice',
    statementDate: '2026-06-16',
    signatureFullName: signer,
    declarationNonCondamnation: true,
    declarationFiliation: true,
  },
});
const ncSigned = await stampSignatureOnPdf({
  inputPath: ncUnsigned,
  outputPath: path.join(path.dirname(ncUnsigned), 'test_stamp_nc_signed.pdf'),
  signerFullName: signer,
  signedAtIso: signedAt,
  layout: 'non_conviction_official',
});

const subUnsigned = await generateSubscribersListPdf({
  filename: 'test_stamp_sub.pdf',
  fields: {
    companyName: 'TRUE LAND',
    legalForm: 'SASU',
    presidentName: signer,
    statementCity: 'DIJON',
    statementDate: '2026-06-16',
    subscribers: [{
      title: 'Président',
      fullName: signer,
      birthDate: '2009-07-28',
      nationality: 'Française',
      address: 'Adresse à compléter',
      shares: '1000',
      capitalPercent: '100 %',
      cashContribution: '1 000',
      natureContribution: '0 €',
      paidAtCreation: '500',
      notes: 'Mineur émancipé',
    }],
  },
});
const subSigned = await stampSignatureOnPdf({
  inputPath: subUnsigned,
  outputPath: path.join(path.dirname(subUnsigned), 'test_stamp_sub_signed.pdf'),
  signerFullName: signer,
  signedAtIso: signedAt,
  layout: 'subscribers_list_official',
});

const fpUnsigned = await generateFormalityPowersPdf({
  filename: 'test_stamp_fp.pdf',
  fields: {
    companyName: 'TRUE LAND',
    legalForm: 'SASU',
    greffe: 'Dijon',
    statementCity: 'DIJON',
    statementDate: '2026-06-16',
    signatoryName: signer,
    signatoryTitle: 'Président',
    clientFullName: signer,
    clientBirthDate: '2009-07-28',
    clientBirthPlace: 'Mamoudzou (976)',
    clientAddress: '29 Boulevard de Magnan',
    companyRegisteredOffice: 'DIJON',
  },
});
const fpSigned = await stampSignatureOnPdf({
  inputPath: fpUnsigned,
  outputPath: path.join(path.dirname(fpUnsigned), 'test_stamp_fp_signed.pdf'),
  signerFullName: signer,
  signedAtIso: signedAt,
  layout: 'formality_powers_official',
});

console.log('Generated:', ncSigned, subSigned, fpSigned);

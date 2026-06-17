import fs from 'node:fs';
import path from 'node:path';
import { generateNonConvictionPdf } from '../pdf/nonConvictionPdf.js';
import { stampSignatureOnPdf } from '../pdf/stampSignatureOnPdf.js';
import {
  LEGAL_RAPPEL_BOTTOM_Y,
  NON_CONVICTION_ELECTRONIC_STAMP_BELOW_LINE,
  NON_CONVICTION_SIGNATURE_LABEL_OFFSET,
  NON_CONVICTION_SIGNATURE_LINE_Y,
  NON_CONVICTION_STAMP_ABOVE_LINE,
  nonConvictionElectronicStampY,
  nonConvictionSignatureStampY,
} from '../pdf/pdfLegalConstants.js';

const LEGAL_REMINDER =
  'Rappel légal. Le fait de donner, de mauvaise foi, des indications inexactes ou incomplètes en vue d\'une formalité au registre du commerce et des sociétés est puni des sanctions prévues par l\'article L. 123-5 du Code de commerce.';

const wrapText = (text, maxChars = 82) => {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines;
};

const rappelLines = wrapText(LEGAL_REMINDER);
const rappelLineHeight = 9.8 * 1.35;
const rappelStartY = LEGAL_RAPPEL_BOTTOM_Y + (rappelLines.length - 1) * rappelLineHeight;
const rappelTopY = rappelStartY + (rappelLines.length - 1) * rappelLineHeight;

const before = {
  lineY: 278,
  labelOffset: 22,
  stampAbove: 8,
  timestampBelow: 18,
};

const after = {
  lineY: NON_CONVICTION_SIGNATURE_LINE_Y,
  labelOffset: NON_CONVICTION_SIGNATURE_LABEL_OFFSET,
  stampAbove: NON_CONVICTION_STAMP_ABOVE_LINE,
  timestampBelow: NON_CONVICTION_ELECTRONIC_STAMP_BELOW_LINE,
};

const fmt = (cfg) => {
  const yBase = cfg.lineY + cfg.stampAbove;
  return {
    lineY: cfg.lineY,
    faitY: cfg.lineY + cfg.labelOffset,
    stampY: yBase,
    textSignatureY: yBase + (cfg.stampAbove >= 20 ? 14 : 20),
    timestampY: cfg.lineY - cfg.timestampBelow,
  };
};

console.log('=== BEFORE ===');
console.log(fmt(before));
console.log('=== AFTER ===');
console.log({
  ...fmt(after),
  stampHelper: nonConvictionSignatureStampY(),
  timestampHelper: nonConvictionElectronicStampY(),
  rappelTopY,
});

const fields = {
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
  signatureFullName: 'William Abdou',
  declarationNonCondamnation: true,
  declarationFiliation: true,
};

const outDir = path.resolve('server/data/generated/declarations');
const unsigned = await generateNonConvictionPdf({
  filename: 'test_nc_layout_fix.pdf',
  fields,
});
const signed = await stampSignatureOnPdf({
  inputPath: unsigned,
  outputPath: path.join(outDir, 'test_nc_layout_fix_signed.pdf'),
  signerFullName: 'William Abdou',
  signedAtIso: '2026-06-16T16:40:36.000Z',
  layout: 'non_conviction_official',
});
console.log('Generated:', signed);

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertDocxBuffer,
  detectBufferFileFormat,
  isDocxBuffer,
  isPdfBuffer,
} from '../fileFormatDetection.js';
import { buildStatutesDocxBuffer } from '../../statuts/shared/statutesOfficeExportCore.js';

test('detectBufferFileFormat – PDF magic bytes', () => {
  const pdf = Buffer.from('%PDF-1.7\n');
  assert.equal(isPdfBuffer(pdf), true);
  assert.equal(detectBufferFileFormat(pdf), 'pdf');
  assert.equal(isDocxBuffer(pdf), false);
});

test('detectBufferFileFormat – DOCX magic bytes', () => {
  const preview = {
    cover: { denomination: 'Greffio Test SAS' },
    blocks: [{ kind: 'article', number: '1', title: 'Forme', body: 'Société par actions simplifiée.' }],
  };
  const docx = buildStatutesDocxBuffer(preview);
  assert.equal(docx.subarray(0, 2).toString('utf8'), 'PK');
  assert.equal(isDocxBuffer(docx), true);
  assert.equal(detectBufferFileFormat(docx), 'docx');
  assert.doesNotThrow(() => assertDocxBuffer(docx));
});

test('assertDocxBuffer – rejects PDF renamed as docx', () => {
  const pdf = Buffer.from('%PDF-1.7\n');
  assert.throws(() => assertDocxBuffer(pdf), (error) => error.code === 'INVALID_DOCX_BUFFER');
});

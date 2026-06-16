import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { parsePdfDocument } from '../analysis/parsePdfDocument.js';
import { analyzeDocumentForCompletion } from '../analysis/analyzeDocument.js';
import { generateFillableCompletionPdf } from '../export/generateFillablePdf.js';
import { isBboxOnPage, toPdfLibBottomLeftBbox } from '../export/pdfCoordinates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePdf = path.join(__dirname, '..', 'fixtures', 'greffio-document-completion-test.pdf');
const cawlFixturePdf = path.join(__dirname, '..', 'fixtures', 'fiche-renseignement-ecawl-sample.pdf');

test('parsePdfDocument scales cerfa-like page units to pdf-lib points', async () => {
  const cerfaPath = process.env.CERFA_TEST_PDF;
  if (!cerfaPath || !fs.existsSync(cerfaPath)) {
    return;
  }
  const parsed = await parsePdfDocument(fs.readFileSync(cerfaPath));
  assert.ok(parsed.pages[0].height > 500, 'page height should be in PDF points');
  assert.ok(parsed.pages[0].blocks.some((block) => block.y >= 0), 'block y should not be negative');
});

test('generateFillableCompletionPdf places interactive fields on fixture PDF', async (t) => {
  if (!fs.existsSync(fixturePdf)) {
    t.skip('fixture PDF missing – run generate-test-document.mjs first');
  }
  const pdfBytes = fs.readFileSync(fixturePdf);
  const analysis = await analyzeDocumentForCompletion({
    documentId: 'fixture-test',
    pdfBytes,
    fileName: 'greffio-document-completion-test.pdf',
    options: { enableAiDetection: false },
  });

  assert.ok(analysis.fields.length > 20, 'fixture should detect many fields');
  assert.equal(analysis.fields.some((field) => field.bbox.y < 0), false, 'no negative y coordinates');

  const parsed = await parsePdfDocument(pdfBytes);
  let offPage = 0;
  for (const field of analysis.fields) {
    const page = parsed.pages[field.pageIndex];
    const converted = toPdfLibBottomLeftBbox(field.bbox, page.width, page.height);
    if (!isBboxOnPage(converted, page.width, page.height)) offPage += 1;
  }
  assert.equal(offPage, 0, 'all detected fields should fit on page');

  const generated = await generateFillableCompletionPdf({
    originalPdfBytes: pdfBytes,
    fields: analysis.fields,
  });
  const doc = await PDFDocument.load(generated);
  const acroFields = doc.getForm().getFields();
  assert.ok(acroFields.length >= 5, 'exported PDF should contain interactive fields');

  for (const field of acroFields) {
    const rect = field.acroField.getWidgets()[0].getRectangle();
    assert.ok(rect.y >= 0, `field ${field.getName()} must have non-negative y`);
  }
});

test('CAWL grid form detects on-page fields and exports fillable PDF', async (t) => {
  if (!fs.existsSync(cawlFixturePdf)) {
    t.skip('CAWL fixture PDF missing');
  }
  const pdfBytes = fs.readFileSync(cawlFixturePdf);
  const analysis = await analyzeDocumentForCompletion({
    documentId: 'cawl-fixture-test',
    pdfBytes,
    fileName: 'fiche-renseignement-ecawl-sample.pdf',
    options: { enableAiDetection: false },
  });

  assert.ok(analysis.fields.length >= 15, 'CAWL sample should detect grid fields');
  assert.equal(analysis.fields.some((field) => field.bbox.y < 0), false, 'no negative y coordinates');

  const parsed = await parsePdfDocument(pdfBytes);
  let offPage = 0;
  for (const field of analysis.fields) {
    const page = parsed.pages[field.pageIndex];
    const converted = toPdfLibBottomLeftBbox(field.bbox, page.width, page.height);
    if (!isBboxOnPage(converted, page.width, page.height)) offPage += 1;
  }
  assert.equal(offPage, 0, 'all CAWL fields should fit on page');

  const generated = await generateFillableCompletionPdf({
    originalPdfBytes: pdfBytes,
    fields: analysis.fields,
  });
  const doc = await PDFDocument.load(generated);
  const acroFields = doc.getForm().getFields();
  assert.ok(acroFields.length >= 10, 'CAWL export should contain interactive fields');
});

test('toPdfLibBottomLeftBbox converts legacy top-left coordinates', () => {
  const converted = toPdfLibBottomLeftBbox({
    x: 10,
    y: 20,
    width: 100,
    height: 18,
    coordinateSystem: 'pdf_points',
  }, 595, 842);
  assert.equal(converted.y, 842 - 20 - 18);
  assert.ok(isBboxOnPage(converted, 595, 842));
});

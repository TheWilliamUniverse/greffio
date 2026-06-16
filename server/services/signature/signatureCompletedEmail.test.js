import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSignatureCompletedEmail } from './signatureCompletedEmail.js';

test('resolveSignatureCompletedEmail uses editable template for formality_powers', () => {
  const result = resolveSignatureCompletedEmail({
    docKey: 'formality_powers',
    dossier: { companyName: 'TRUE LAND' },
    signerFullName: 'William Abdou',
    appUrl: 'https://greffio.willentreprises.com',
  });
  assert.equal(result.templateKey, 'editable_document_signature_completed');
  assert.equal(result.variables.documentTitle, 'Procuration et pouvoirs pour formalités');
  assert.equal(result.variables.firstName, 'William');
});

test('resolveSignatureCompletedEmail uses non-conviction template for manager_non_conviction', () => {
  const result = resolveSignatureCompletedEmail({
    docKey: 'manager_non_conviction',
    dossier: { companyName: 'TRUE LAND' },
    signerFullName: 'William Abdou',
    appUrl: 'https://greffio.willentreprises.com',
  });
  assert.equal(result.templateKey, 'non_conviction_signature_completed');
  assert.equal(result.variables.documentTitle, undefined);
});

test('resolveSignatureCompletedEmail uses editable template for subscribers_list', () => {
  const result = resolveSignatureCompletedEmail({
    docKey: 'subscribers_list',
    dossier: { companyName: 'TRUE LAND' },
    signerFullName: 'Marie Dupont',
    appUrl: 'https://greffio.willentreprises.com',
  });
  assert.equal(result.templateKey, 'editable_document_signature_completed');
  assert.match(result.variables.documentTitle, /souscripteurs/i);
});

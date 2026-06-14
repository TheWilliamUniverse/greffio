import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDocumentVerifyUrl,
  computeSha256,
  createDocumentVerifyToken,
  hashDocumentVerifyToken,
} from '../documentIntegrityService.js';

test('computeSha256 produit un hex SHA-256 stable', () => {
  const hash = computeSha256(Buffer.from('greffio-test'));
  assert.equal(hash.length, 64);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(hash, computeSha256(Buffer.from('greffio-test')));
});

test('createDocumentVerifyToken et hashDocumentVerifyToken sont cohérents', () => {
  const { raw, hash } = createDocumentVerifyToken();
  assert.ok(raw.length >= 32);
  assert.equal(hashDocumentVerifyToken(raw), hash);
  assert.notEqual(hashDocumentVerifyToken('wrong'), hash);
});

test('buildDocumentVerifyUrl inclut documentId et token', () => {
  const url = buildDocumentVerifyUrl({
    appUrl: 'https://greffio.fr',
    documentId: 'doc-123',
    verifyToken: 'abc123',
  });
  assert.equal(url, 'https://greffio.fr/verify/document/doc-123?token=abc123');
});

test('buildDocumentVerifyUrl retourne null sans identifiants', () => {
  assert.equal(buildDocumentVerifyUrl({ documentId: 'x' }), null);
  assert.equal(buildDocumentVerifyUrl({ verifyToken: 'x' }), null);
});

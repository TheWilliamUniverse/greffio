import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DOCUMENT_STATUSES,
  isDocumentCompleteStatus,
  mapClientDocumentStatus,
  normalizeDocumentStatus,
} from '../documentStatus.js';

test('normalizeDocumentStatus – alias validés', () => {
  assert.equal(normalizeDocumentStatus('validated'), DOCUMENT_STATUSES.VALID);
  assert.equal(normalizeDocumentStatus('signed'), DOCUMENT_STATUSES.VALID);
});

test('normalizeDocumentStatus – alias refusés', () => {
  assert.equal(normalizeDocumentStatus('rejected'), DOCUMENT_STATUSES.INVALID);
  assert.equal(normalizeDocumentStatus('INVALID'), DOCUMENT_STATUSES.INVALID);
});

test('normalizeDocumentStatus – en revue', () => {
  assert.equal(normalizeDocumentStatus('pending_review'), DOCUMENT_STATUSES.UNDER_REVIEW);
  assert.equal(normalizeDocumentStatus('uploaded'), DOCUMENT_STATUSES.UNDER_REVIEW);
});

test('normalizeDocumentStatus – demandé par défaut', () => {
  assert.equal(normalizeDocumentStatus(''), DOCUMENT_STATUSES.REQUESTED);
  assert.equal(normalizeDocumentStatus('unknown_status'), DOCUMENT_STATUSES.REQUESTED);
});

test('mapClientDocumentStatus – fichier déposé', () => {
  assert.equal(mapClientDocumentStatus('requested', true), 'PENDING_REVIEW');
  assert.equal(mapClientDocumentStatus('valid', false), 'VALIDATED');
  assert.equal(mapClientDocumentStatus('invalid', false), 'REJECTED');
});

test('isDocumentCompleteStatus', () => {
  assert.equal(isDocumentCompleteStatus('signed'), true);
  assert.equal(isDocumentCompleteStatus('requested'), false);
});

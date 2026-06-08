import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateDossierAccess } from '../utils/dossierAccessPolicy.js';

const dossier = {
  id: 'dossier-1',
  userId: 'user-a',
};

test('IDOR: un client ne peut pas accéder au dossier d’un autre client', () => {
  const result = evaluateDossierAccess({
    dossier,
    authSub: 'user-b',
    authRole: 'CLIENT',
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
  assert.equal(result.error, 'DOSSIER_FORBIDDEN');
});

test('IDOR: le propriétaire accède à son dossier', () => {
  const result = evaluateDossierAccess({
    dossier,
    authSub: 'user-a',
    authRole: 'CLIENT',
  });
  assert.equal(result.ok, true);
});

test('IDOR: un rôle ops interne accède au dossier', () => {
  const result = evaluateDossierAccess({
    dossier,
    authSub: 'ops-1',
    authRole: 'OPS',
  });
  assert.equal(result.ok, true);
});

test('IDOR: dossier inexistant renvoie 404', () => {
  const result = evaluateDossierAccess({
    dossier: null,
    authSub: 'user-a',
    authRole: 'CLIENT',
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 404);
});

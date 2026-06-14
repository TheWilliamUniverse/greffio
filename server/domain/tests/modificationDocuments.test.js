import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MODIFICATION_TYPES,
  resolveModificationType,
  isModificationDossier,
  getModificationFormalityRule,
} from '../modificationDocuments.js';

test('resolveModificationType – typeFormalite français', () => {
  const type = resolveModificationType({
    dossier: { typeFormalite: 'transfert_siege' },
    questionnaire: {},
  });
  assert.equal(type, MODIFICATION_TYPES.TRANSFER_REGISTERED_OFFICE);
});

test('resolveModificationType – service modification', () => {
  const type = resolveModificationType({
    dossier: { service: 'modification' },
    questionnaire: {},
  });
  assert.equal(type, MODIFICATION_TYPES.OTHER_STATUTORY_MODIFICATION);
});

test('resolveModificationType – fallback', () => {
  const type = resolveModificationType({ dossier: {}, questionnaire: {} });
  assert.equal(type, MODIFICATION_TYPES.OTHER_STATUTORY_MODIFICATION);
});

test('isModificationDossier', () => {
  assert.equal(isModificationDossier({ dossier: { service: 'modification' } }), true);
  assert.equal(isModificationDossier({ dossier: { service: 'creation' } }), false);
});

test('getModificationFormalityRule – transfert siège', () => {
  const rule = getModificationFormalityRule({
    legalForm: 'SAS',
    modificationType: MODIFICATION_TYPES.TRANSFER_REGISTERED_OFFICE,
  });
  assert.equal(rule.modificationType, MODIFICATION_TYPES.TRANSFER_REGISTERED_OFFICE);
  assert.ok(rule.requiredDocKeys.includes('registered_office_proof'));
  assert.ok(rule.checklist.some((item) => item.id === 'decision_minutes'));
});

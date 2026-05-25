import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveUpdateState } from '../appUpdateLogic.js';
import { UPDATE_KIND } from '../appUpdateTypes.js';

const baseConfig = {
  latestVersionCode: 42,
  minimumRequiredVersionCode: 38,
  latestVersionName: '1.4.2',
  title: 'Nouvelle version',
  message: 'Mise à jour disponible',
  changelog: ['Corrections', 'Performances'],
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.greffio.app',
  updateUrl: null,
};

test('NoUpdate quand versionCode courant = latest', () => {
  const state = resolveUpdateState({
    currentVersionCode: 42,
    remoteConfig: baseConfig,
  });
  assert.equal(state.kind, UPDATE_KIND.NO_UPDATE);
});

test('NoUpdate quand versionCode courant > latest (canary / dev)', () => {
  const state = resolveUpdateState({
    currentVersionCode: 99,
    remoteConfig: baseConfig,
  });
  assert.equal(state.kind, UPDATE_KIND.NO_UPDATE);
});

test('OptionalUpdate quand minimum <= courant < latest', () => {
  const state = resolveUpdateState({
    currentVersionCode: 40,
    remoteConfig: baseConfig,
  });
  assert.equal(state.kind, UPDATE_KIND.OPTIONAL);
  assert.equal(state.latestVersionCode, 42);
  assert.equal(state.blocking, false);
  assert.equal(state.latestVersionName, '1.4.2');
  assert.deepEqual(state.changelog, ['Corrections', 'Performances']);
});

test('RequiredUpdate quand courant < minimum', () => {
  const state = resolveUpdateState({
    currentVersionCode: 30,
    remoteConfig: baseConfig,
  });
  assert.equal(state.kind, UPDATE_KIND.REQUIRED);
  assert.equal(state.minimumRequiredVersionCode, 38);
  assert.equal(state.blocking, true);
});

test('RequiredUpdate prime sur OptionalUpdate quand minimum=latest', () => {
  const config = { ...baseConfig, minimumRequiredVersionCode: 42 };
  const state = resolveUpdateState({
    currentVersionCode: 41,
    remoteConfig: config,
  });
  assert.equal(state.kind, UPDATE_KIND.REQUIRED);
});

test('NoUpdate quand remoteConfig est null (endpoint indisponible)', () => {
  const state = resolveUpdateState({
    currentVersionCode: 10,
    remoteConfig: null,
  });
  assert.equal(state.kind, UPDATE_KIND.NO_UPDATE);
});

test('NoUpdate quand remoteConfig est malformé', () => {
  const state = resolveUpdateState({
    currentVersionCode: 10,
    remoteConfig: { latestVersionCode: 'abc' },
  });
  assert.equal(state.kind, UPDATE_KIND.NO_UPDATE);
});

test('NoUpdate quand versionCode courant=0 (Capacitor indisponible)', () => {
  const state = resolveUpdateState({
    currentVersionCode: 0,
    remoteConfig: baseConfig,
  });
  assert.equal(state.kind, UPDATE_KIND.NO_UPDATE);
});

test('Valeurs par défaut appliquées si champs optionnels absents', () => {
  const state = resolveUpdateState({
    currentVersionCode: 40,
    remoteConfig: { latestVersionCode: 42 },
  });
  assert.equal(state.kind, UPDATE_KIND.OPTIONAL);
  assert.equal(state.title, 'Nouvelle version disponible');
  assert.equal(state.latestVersionName, 'build 42');
  assert.deepEqual(state.changelog, []);
  assert.equal(state.playStoreUrl, null);
});

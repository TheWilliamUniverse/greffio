import assert from 'node:assert/strict';
import test from 'node:test';

const ENV_KEYS = [
  'NODE_ENV',
  'DOCUMENT_STORAGE_DRIVER',
  'S3_ENDPOINT',
  'AWS_S3_ENDPOINT',
  'S3_REGION',
  'AWS_REGION',
  'AWS_DEFAULT_REGION',
  'S3_ACCESS_KEY_ID',
  'AWS_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'AWS_SECRET_ACCESS_KEY',
  'S3_BUCKET',
  'AWS_S3_BUCKET',
  'S3_FORCE_PATH_STYLE',
  'AWS_S3_FORCE_PATH_STYLE',
  'S3_SERVER_SIDE_ENCRYPTION',
  'AWS_S3_SERVER_SIDE_ENCRYPTION',
  'S3_PRESIGNED_URL_TTL_SECONDS',
  'AWS_S3_PRESIGNED_URL_TTL_SECONDS',
];

const importFresh = async () => import(`../s3StorageService.js?test=${Date.now()}-${Math.random()}`);

const withEnvironment = async (values, callback) => {
  const previous = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
  try {
    for (const key of ENV_KEYS) delete process.env[key];
    Object.assign(process.env, { NODE_ENV: 'test', ...values });
    await callback();
  } finally {
    for (const key of ENV_KEYS) {
      const value = previous.get(key);
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

test('configuration S3 generique pour Garage', async () => {
  await withEnvironment({
    S3_ENDPOINT: 'https://storage.greffio.willentreprises.com/',
    S3_REGION: 'garage',
    S3_ACCESS_KEY_ID: 'GK_TEST_ACCESS',
    S3_SECRET_ACCESS_KEY: 'test-secret',
    S3_BUCKET: 'greffio-documents',
    S3_FORCE_PATH_STYLE: 'true',
    S3_PRESIGNED_URL_TTL_SECONDS: '600',
  }, async () => {
    const { getS3StorageConfig, isS3Configured } = await importFresh();
    assert.equal(isS3Configured(), true);
    assert.deepEqual(getS3StorageConfig(), {
      endpoint: 'https://storage.greffio.willentreprises.com',
      region: 'garage',
      accessKeyId: 'GK_TEST_ACCESS',
      secretAccessKey: 'test-secret',
      bucket: 'greffio-documents',
      forcePathStyle: true,
      serverSideEncryption: null,
      presignedTtlSeconds: 600,
    });
  });
});

test('compatibilite avec les anciennes variables AWS', async () => {
  await withEnvironment({
    AWS_REGION: 'eu-west-3',
    AWS_ACCESS_KEY_ID: 'aws-access',
    AWS_SECRET_ACCESS_KEY: 'aws-secret',
    AWS_S3_BUCKET: 'aws-bucket',
  }, async () => {
    const { getS3StorageConfig, assertS3Config } = await importFresh();
    assert.doesNotThrow(() => assertS3Config());
    const config = getS3StorageConfig();
    assert.equal(config.endpoint, null);
    assert.equal(config.region, 'eu-west-3');
    assert.equal(config.forcePathStyle, false);
    assert.equal(config.serverSideEncryption, 'AES256');
  });
});

test('endpoint personnalise active path-style et desactive AES256 implicite', async () => {
  await withEnvironment({
    AWS_S3_ENDPOINT: 'http://127.0.0.1:3900',
    AWS_ACCESS_KEY_ID: 'garage-access',
    AWS_SECRET_ACCESS_KEY: 'garage-secret',
    AWS_S3_BUCKET: 'garage-bucket',
  }, async () => {
    const { getS3StorageConfig } = await importFresh();
    const config = getS3StorageConfig();
    assert.equal(config.forcePathStyle, true);
    assert.equal(config.serverSideEncryption, null);
  });
});

test('configuration incomplete refuse le demarrage S3', async () => {
  await withEnvironment({
    S3_ACCESS_KEY_ID: 'only-access-key',
  }, async () => {
    const { assertS3Config, isS3Configured } = await importFresh();
    assert.equal(isS3Configured(), false);
    assert.throws(() => assertS3Config(), /S3_SECRET_ACCESS_KEY\/AWS_SECRET_ACCESS_KEY/);
  });
});

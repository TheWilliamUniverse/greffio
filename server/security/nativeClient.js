export const getNativeClientConfig = () => ({
  enabled: process.env.GREFFIO_NATIVE_CLIENT_ENABLED !== 'false',
  secret: String(process.env.GREFFIO_NATIVE_CLIENT_SECRET || '').trim(),
});

export const isTrustedNativeClient = (req) => {
  const { enabled, secret } = getNativeClientConfig();
  if (!enabled) return false;

  const client = String(req.headers['x-greffio-client'] || '').toLowerCase();
  if (!client.startsWith('greffio-native')) return false;

  if (!secret) return true;

  const token = String(req.headers['x-greffio-client-token'] || '').trim();
  return token === secret;
};

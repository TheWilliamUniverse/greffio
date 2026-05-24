let fcmApp = null;

const getFcmApp = async () => {
  if (fcmApp) return fcmApp;
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const admin = await import('firebase-admin');
    if (admin.apps?.length) {
      fcmApp = admin.app();
      return fcmApp;
    }
    const credentials = JSON.parse(raw);
    fcmApp = admin.initializeApp({
      credential: admin.credential.cert(credentials),
    });
    return fcmApp;
  } catch (error) {
    console.error('FCM_INIT_FAILED', error);
    return null;
  }
};

export const sendPushToTokens = async ({ tokens, title, body, data = {} }) => {
  const list = (Array.isArray(tokens) ? tokens : [tokens]).filter(Boolean);
  if (!list.length) return { ok: false, reason: 'NO_TOKENS' };

  const app = await getFcmApp();
  if (!app) {
    console.info('FCM_NOT_CONFIGURED', { count: list.length, title });
    return { ok: false, reason: 'FCM_NOT_CONFIGURED' };
  }

  const admin = await import('firebase-admin');
  const response = await admin.messaging().sendEachForMulticast({
    tokens: list,
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value)])),
    android: { priority: 'high' },
  });

  return {
    ok: true,
    successCount: response.successCount,
    failureCount: response.failureCount,
  };
};

export const isPushConfigured = () => Boolean(process.env.FCM_SERVICE_ACCOUNT_JSON);

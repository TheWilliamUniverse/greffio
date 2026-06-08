export const isProductionEnv = () => process.env.NODE_ENV === 'production';

export const requireWebhookSecret = (secret, label) => {
  if (secret) return { ok: true };
  if (isProductionEnv()) {
    return { ok: false, error: `${label}_MISSING`, status: 503 };
  }
  return { ok: true, devBypass: true };
};

export const rejectIfWebhookSecretMissing = (res, secret, label) => {
  const check = requireWebhookSecret(secret, label);
  if (!check.ok) {
    res.status(check.status || 503).json({ ok: false, error: check.error });
    return true;
  }
  return false;
};

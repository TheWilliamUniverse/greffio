import { issueOpsStepUpToken, verifyToken } from '../tokens.js';
import { isInternalRole } from '../authRoles.js';
import { logStructured } from '../utils/structuredLog.js';
import { getClientIp } from '../utils/loginContext.js';
import {
  canSendOpsStepUpCode,
  issueOpsStepUpCode,
  verifyOpsStepUpCode,
} from '../opsStepUpStore.js';
import { maskEmailAddress } from '../mfaEmailCodeStore.js';
import { sendTransactionalEmail } from '../services/emailService.js';

const STEP_UP_TTL_MS = 15 * 60 * 1000;

export const registerOpsStepUpRoutes = (app, {
  requireAuth,
  requireRole,
  getUserById,
  stepUpLimiter,
}) => {
  app.post('/api/ops/step-up/send-code', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), stepUpLimiter, async (req, res) => {
    try {
      const user = getUserById ? await getUserById(req.auth.sub) : null;
      if (!user?.email) {
        return res.status(400).json({ ok: false, error: 'USER_EMAIL_MISSING' });
      }
      const sendCheck = canSendOpsStepUpCode(user.id);
      if (!sendCheck.ok) {
        return res.status(429).json({
          ok: false,
          error: 'OPS_STEP_UP_COOLDOWN',
          retryAfterSeconds: sendCheck.retryAfterSeconds,
        });
      }
      const { code } = issueOpsStepUpCode(user.id);
      void sendTransactionalEmail({
        to: { email: user.email, name: user.firstName || user.email },
        templateKey: 'authentication_code',
        variables: {
          firstName: user.firstName || 'Ops',
          verificationCode: code,
          expirationMinutes: 10,
          actionLabel: 'accès au Cockpit Ops Greffio',
        },
        userId: user.id,
        tags: ['ops', 'step_up'],
      });
      return res.json({
        ok: true,
        emailMasked: maskEmailAddress(user.email),
        expiresInSeconds: 600,
      });
    } catch (error) {
      if (error.message === 'OPS_STEP_UP_COOLDOWN') {
        return res.status(429).json({
          ok: false,
          error: 'OPS_STEP_UP_COOLDOWN',
          retryAfterSeconds: error.retryAfterSeconds || 60,
        });
      }
      return res.status(500).json({ ok: false, error: 'OPS_STEP_UP_SEND_FAILED' });
    }
  });

  app.post('/api/ops/step-up/verify', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), stepUpLimiter, async (req, res) => {
    try {
      const method = String(req.body?.method || '').trim().toLowerCase();
      const user = getUserById ? await getUserById(req.auth.sub) : null;
      if (!user) return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' });

      if (method === 'mfa_email') {
        const verification = verifyOpsStepUpCode(user.id, req.body?.code);
        if (!verification.ok) {
          return res.status(401).json({
            ok: false,
            error: verification.error,
            message: 'Code de confirmation invalide ou expiré.',
          });
        }
      } else if (method === 'biometric') {
        // Rituel client-side ; l’accès ops reste protégé par JWT step-up court.
      } else {
        return res.status(400).json({ ok: false, error: 'OPS_STEP_UP_METHOD_INVALID' });
      }

      const stepUpToken = issueOpsStepUpToken(user);
      const expiresAt = Date.now() + STEP_UP_TTL_MS;

      logStructured.info('ops_identity_verified', {
        userId: user.id,
        role: user.role,
        method,
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'] || '',
      });

      return res.json({
        ok: true,
        stepUpToken,
        expiresAt,
        expiresInSeconds: Math.floor(STEP_UP_TTL_MS / 1000),
      });
    } catch (_error) {
      return res.status(500).json({ ok: false, error: 'OPS_STEP_UP_VERIFY_FAILED' });
    }
  });
};

export const requireOpsStepUp = (req, res, next) => {
  if (!isInternalRole(req.auth?.role)) return next();
  const token = String(req.headers['x-greffio-ops-step-up'] || '').trim();
  if (!token) {
    return res.status(403).json({
      ok: false,
      error: 'OPS_STEP_UP_REQUIRED',
      message: 'Confirmation d’identité requise pour accéder au cockpit ops.',
    });
  }
  try {
    const payload = verifyToken(token);
    if (payload.typ !== 'ops_step_up' || payload.sub !== req.auth.sub) {
      return res.status(403).json({ ok: false, error: 'OPS_STEP_UP_INVALID' });
    }
    req.opsStepUp = payload;
    return next();
  } catch (_error) {
    return res.status(403).json({
      ok: false,
      error: 'OPS_STEP_UP_EXPIRED',
      message: 'Votre confirmation d’identité a expiré.',
    });
  }
};

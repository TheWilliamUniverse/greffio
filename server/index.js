import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { initPostgresSchema } from './dbClient.js';
import { DOSSIER_STATUSES } from './stateMachine.js';
import { requireAuth, requireRole } from './authMiddleware.js';
import { authenticateUser, createUser, getUserByEmail } from './authStore.js';
import {
  addPaymentEvent,
  createDossier,
  DOCUMENT_STATUSES,
  ensureSeedDossier,
  getAllDossiers,
  getAllPayments,
  getDossier,
  getPaymentByProviderId,
  hasPaymentEventProviderId,
  listDossierDocuments,
  listDossierEvents,
  transitionDossierStatus,
  updateDossierDocument,
  upsertPayment,
} from './store.js';
import { computePaymentAmounts } from './pricing.js';
import { createMolliePayment, isMolliePaidStatus, retrieveMolliePayment } from './mollie.js';
import { issueAccessToken, issueRefreshToken, verifyToken } from './tokens.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);

app.use(cors());
app.use(express.json());

const appUrl = process.env.APP_URL || 'https://greffio.willentreprises.com';
const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8787';
const mollieWebhookUrl = process.env.MOLLIE_WEBHOOK_URL || `${apiBaseUrl}/webhooks/mollie`;

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'greffio-api', timestamp: new Date().toISOString() });
});

app.post('/api/auth/signup', async (req, res) => {
  const {
    email,
    password,
    firstName,
    lastName,
    role = 'CLIENT',
    company = null,
  } = req.body || {};
  if (!email || !password || String(password).length < 6) {
    return res.status(400).json({ ok: false, error: 'INVALID_SIGNUP_PAYLOAD' });
  }
  const existing = await getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ ok: false, error: 'EMAIL_ALREADY_EXISTS' });
  }
  const user = await createUser({
    email,
    password,
    firstName,
    lastName,
    role,
    company,
  });
  return res.status(201).json({
    ok: true,
    user,
    accessToken: issueAccessToken(user),
    refreshToken: issueRefreshToken(user),
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'INVALID_LOGIN_PAYLOAD' });
  }
  const user = await authenticateUser({ email, password });
  if (!user) {
    return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' });
  }
  return res.json({
    ok: true,
    user,
    accessToken: issueAccessToken(user),
    refreshToken: issueRefreshToken(user),
  });
});

app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ ok: false, error: 'REFRESH_TOKEN_REQUIRED' });
  }
  try {
    const payload = verifyToken(refreshToken);
    if (payload.typ !== 'refresh') {
      return res.status(401).json({ ok: false, error: 'INVALID_REFRESH_TOKEN' });
    }
    return res.json({
      ok: true,
      accessToken: issueAccessToken({
        id: payload.sub,
        role: payload.role || 'CLIENT',
        email: payload.email || null,
      }),
    });
  } catch (_error) {
    return res.status(401).json({ ok: false, error: 'REFRESH_TOKEN_INVALID' });
  }
});

app.get('/api/ops/dossiers', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (_req, res) => {
  res.json({
    ok: true,
    dossiers: await getAllDossiers(),
  });
});

app.get('/api/ops/payments', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (_req, res) => {
  res.json({
    ok: true,
    payments: await getAllPayments(),
  });
});

app.get('/api/dossiers/:dossierId', requireAuth, async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) {
    return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  }
  const isOps = ['ADMIN', 'OPS', 'FORMALISTE'].includes(req.auth?.role);
  const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
  if (!isOps && !isOwner) {
    return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });
  }
  return res.json({
    ok: true,
    dossier,
    events: await listDossierEvents(dossier.id),
    documents: await listDossierDocuments(dossier.id),
  });
});

app.post('/api/dossiers', requireAuth, async (req, res) => {
  const {
    companyName,
    legalForm = 'SASU',
    service = 'creation-sasu',
  } = req.body || {};
  if (!companyName || !String(companyName).trim()) {
    return res.status(400).json({ ok: false, error: 'COMPANY_NAME_REQUIRED' });
  }
  const dossier = await createDossier({
    userId: req.auth.sub,
    companyName: String(companyName).trim(),
    legalForm: String(legalForm || 'SASU'),
    service: String(service || 'creation-sasu'),
  });
  return res.status(201).json({ ok: true, dossier });
});

app.post('/api/dossiers/:dossierId/transition', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (req, res) => {
  const { nextStatus, reason, metadata, actorId } = req.body || {};
  if (!nextStatus) {
    return res.status(400).json({ ok: false, error: 'NEXT_STATUS_REQUIRED' });
  }
  const transition = await transitionDossierStatus({
    dossierId: req.params.dossierId,
    nextStatus,
    actorType: 'api',
    actorId: actorId || null,
    reason: reason || null,
    metadata: metadata || {},
  });
  if (!transition.ok) {
    return res.status(409).json({ ok: false, ...transition });
  }
  return res.json({ ok: true, dossier: transition.dossier, event: transition.event });
});

app.get('/api/ops/dossiers/:dossierId/documents', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  return res.json({
    ok: true,
    documents: await listDossierDocuments(dossier.id),
  });
});

app.post('/api/ops/dossiers/:dossierId/documents/:docKey/status', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const {
    status,
    filename,
    fileSizeBytes,
    mimeType,
    storageUrl,
    rejectedReason,
  } = req.body || {};
  const allowed = new Set(Object.values(DOCUMENT_STATUSES));
  if (!allowed.has(status)) {
    return res.status(400).json({ ok: false, error: 'INVALID_DOCUMENT_STATUS' });
  }
  await updateDossierDocument({
    dossierId: dossier.id,
    docKey: req.params.docKey,
    status,
    filename,
    fileSizeBytes,
    mimeType,
    storageUrl,
    rejectedReason: rejectedReason || null,
    reviewerId: req.auth.sub,
  });
  return res.json({
    ok: true,
    documents: await listDossierDocuments(dossier.id),
  });
});

app.post('/api/payments/create', requireAuth, async (req, res) => {
  const { dossierId = 'dos_seed_001', offerCode = 'dossier-standard' } = req.body || {};
  const dossier = await getDossier(dossierId);
  if (!dossier) {
    return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  }
  const isOps = ['ADMIN', 'OPS', 'FORMALISTE'].includes(req.auth?.role);
  const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
  if (!isOps && !isOwner) {
    return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });
  }
  if (
    dossier.status !== DOSSIER_STATUSES.QUOTE_GENERATED
    && dossier.status !== DOSSIER_STATUSES.PAYMENT_PENDING
  ) {
    return res.status(409).json({
      ok: false,
      error: 'DOSSIER_NOT_READY_FOR_PAYMENT',
      dossierStatus: dossier.status,
    });
  }

  if (dossier.status === DOSSIER_STATUSES.QUOTE_GENERATED) {
    const moved = await transitionDossierStatus({
      dossierId: dossier.id,
      nextStatus: DOSSIER_STATUSES.PAYMENT_PENDING,
      actorType: 'system',
      reason: 'payment_initialized',
    });
    if (!moved.ok) {
      return res.status(409).json({ ok: false, error: moved.code });
    }
  }

  const amounts = computePaymentAmounts(offerCode);

  let created;
  const hasMollieKey = Boolean(process.env.MOLLIE_API_KEY);
  if (hasMollieKey) {
    try {
      created = await createMolliePayment({
        amountTotalCents: amounts.amountTotalCents,
        currency: amounts.currency,
        metadata: {
          dossierId: dossier.id,
          offerCode: amounts.normalizedOffer,
          companyName: dossier.companyName,
        },
        redirectUrl: `${appUrl}/paiement/verification?dossierId=${dossier.id}`,
        webhookUrl: mollieWebhookUrl,
        description: `Greffio ${amounts.normalizedOffer} ${dossier.companyName}`,
      });
    } catch (error) {
      return res.status(502).json({
        ok: false,
        error: 'MOLLIE_PAYMENT_CREATE_FAILED',
        message: error.message,
      });
    }
  } else {
    created = {
      providerPaymentId: `mollie_demo_${Date.now()}`,
      status: 'open',
      checkoutUrl: `${appUrl}/paiement/verification?dossierId=${dossier.id}&mock=mollie`,
      raw: {
        provider: 'mollie',
        status: 'open',
        mode: 'mock_fallback',
      },
    };
  }

  const payment = await upsertPayment({
    dossierId: dossier.id,
    userId: req.auth.sub || dossier.userId,
    offerCode: amounts.normalizedOffer,
    amountTotalCents: amounts.amountTotalCents,
    amountServiceCents: amounts.amountServiceCents,
    amountLegalFeesCents: amounts.amountLegalFeesCents,
    currency: amounts.currency,
    status: created.status || 'open',
    provider: 'mollie',
    providerPaymentId: created.providerPaymentId,
    providerPayload: created.raw,
  });

  return res.json({
    ok: true,
    payment,
    checkoutUrl: created.checkoutUrl,
  });
});

const handleMollieWebhook = async (req, res) => {
  const providerPaymentId = req.body?.id;
  const eventType = 'payment.status_sync';

  if (!providerPaymentId) {
    return res.status(400).json({ ok: false, error: 'INVALID_WEBHOOK_PAYLOAD' });
  }

  const payment = await getPaymentByProviderId(providerPaymentId);
  if (!payment) {
    return res.status(404).json({ ok: false, error: 'PAYMENT_NOT_FOUND' });
  }

  let providerState;
  if (process.env.MOLLIE_API_KEY) {
    try {
      providerState = await retrieveMolliePayment({ providerPaymentId });
    } catch (error) {
      return res.status(502).json({
        ok: false,
        error: 'MOLLIE_PAYMENT_RETRIEVE_FAILED',
        message: error.message,
      });
    }
  } else {
    providerState = {
      providerPaymentId,
      status: 'paid',
      paidAt: new Date().toISOString(),
      raw: {
        provider: 'mollie',
        status: 'paid',
        mode: 'mock_fallback',
      },
    };
  }

  const providerEventId = `${providerPaymentId}:${providerState.status || 'status_sync'}`;
  if (await hasPaymentEventProviderId(providerEventId)) {
    return res.json({ ok: true, idempotent: true });
  }

  await addPaymentEvent({
    paymentId: payment.id,
    eventType,
    providerEventId,
    rawPayload: req.body,
  });

  if (isMolliePaidStatus(providerState.status) && payment.status !== 'paid') {
    payment.status = 'paid';
    payment.paidAt = providerState.paidAt || new Date().toISOString();
    payment.providerPayload = providerState.raw;
    await upsertPayment(payment);

    await transitionDossierStatus({
      dossierId: payment.dossierId,
      nextStatus: DOSSIER_STATUSES.PAYMENT_CONFIRMED,
      actorType: 'webhook',
      reason: 'mollie_paid',
      metadata: { providerPaymentId },
    });
  }

  return res.json({ ok: true, paymentStatus: payment.status });
};

app.post('/webhooks/mollie', handleMollieWebhook);
app.post('/api/mollie/webhook', handleMollieWebhook);

const bootstrap = async () => {
  await initPostgresSchema();
  await ensureSeedDossier();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[greffio-api] listening on http://localhost:${port}`);
  });
};

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[greffio-api] bootstrap failed', error);
  process.exit(1);
});

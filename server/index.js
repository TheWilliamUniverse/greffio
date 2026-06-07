import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { initSchema } from './dbClient.js';
import { DOSSIER_STATUSES } from './stateMachine.js';
import { requireAuth, requireRole, isInternalRole } from './authMiddleware.js';
import { authenticateUser, createUser, getUserByEmail, verifyUserPassword } from './authStore.js';
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  getUserById,
  updateUserPasswordById,
  updateUserProfile,
} from './authStore.js';
import {
  addPaymentEvent,
  createDossier,
  DOCUMENT_STATUSES,
  ensureSeedDossier,
  getAllDossiers,
  listDossiersForUser,
  scheduleDossierDeletion,
  restoreDossier,
  listTrashedDossiers,
  getAllPayments,
  getDossier,
  getPaymentByProviderId,
  getPaymentById,
  hasPaymentEventProviderId,
  listGeneratedDocumentsByDossier,
  listDossierDocuments,
  listDossierEvents,
  listOpsNotesByDossier,
  transitionDossierStatus,
  updateDossierQuestionnaire,
  claimDossierForUser,
  updateDossierDocument,
  clearDossierDocumentAttachment,
  updateDossierOpsFields,
  upsertGeneratedDocument,
  syncGeneratedStatutesToDossierChecklist,
  markDossierStatutesGenerated,
  addOpsNote,
  upsertPayment,
  ensureDossierDocuments,
} from './store.js';
import { computePaymentAmounts } from './pricing.js';
import {
  getResourceConfig,
  getResourceOrderForUser,
  listOpsResourceOrders,
  listResourceServices,
  listUserResourceOrders,
  searchResourceCatalog,
  submitResourceOrder,
  updateOpsResourceOrderStatus,
} from './resourcesApi.js';
import { createResourceOrderCheckout } from './resourcesCheckout.js';
import { getResourceOrderById } from './resourceOrderStore.js';
import { handleResourceOrderPaymentPaid } from './services/resourcePaymentWebhook.js';
import { createMolliePayment, isMolliePaidStatus, retrieveMolliePayment } from './mollie.js';
import {
  createGoCardlessCheckout,
  isGoCardlessPaidStatus,
  parseGoCardlessWebhookEvents,
  retrieveGoCardlessBillingRequest,
  verifyGoCardlessWebhook,
} from './gocardless.js';
import { issueAccessToken, issueMfaPendingToken, issueRefreshToken, verifyToken } from './tokens.js';
import { buildCanonicalDocumentFilename } from './documentNaming.js';
import { ROLE } from './stateMachine.js';
import { sendDossierEmailById } from './emails/index.js';
import { parseResendWebhook } from './emails/provider.js';
import { searchAddresses as searchGeoAddresses } from './services/addressSearch.js';
import { sendTransactionalEmail, handleBrevoWebhookEvent } from './services/emailService.js';
import { getUnlockByToken, verifyAndConsumeUnlock } from './credentialUnlockStore.js';
import { formatParisDateTime, getClientIp, parseDeviceLabel } from './utils/loginContext.js';
import { buildLoginAlertsProfilePatch, shouldSendLoginAlert } from './utils/loginAlerts.js';
import { buildMobileSearchResponse } from './utils/mobileSearch.js';
import { buildMobileNotifications } from './utils/mobileNotifications.js';
import { upsertPushDeviceToken, revokePushDeviceToken } from './pushStore.js';
import { uploadPdfOnly } from './uploads.js';
import { analyzeDocument } from './documentAnalysis.js';
import { createSignatureRecord, getLatestSignatureByDossier } from './signatureStore.js';
import { buildMandateText } from './mandateTemplate.js';
import { generateMandatePdf } from './pdf/mandatePdf.js';
import { generateNonConvictionPdf, validateNonConvictionFields } from './pdf/nonConvictionPdf.js';
import {
  NON_CONVICTION_SCHEMA_VERSION,
  persistNonConvictionPdfForDossier,
} from './services/nonConvictionDocumentService.js';
import {
  buildStatutesByLegalForm,
  documentToPreview,
  isStatutesSupportedForm,
} from './legal/statutes/index.js';
import { mapStatutesData, mapStatutesDataFromSimulator } from './utils/statutesDataMapper.js';
import { resolveLegalForm } from './domain/formalities.js';
import { getFormalityRule } from './domain/formalities.js';
import { resolveFormalityPublicLabel } from './domain/formalityLabels.js';
import { getCompanyLookupMetrics, lookupCompany } from './services/companyLookup.js';
import { buildIntelligentPrefill } from './services/intelligentIntake.js';
import { computeDossierRisk, sortAntiRejectionQueue } from './services/opsRisk.js';
import { buildOpsCockpitPayload, enrichDossierForOps } from './services/opsCockpitService.js';
import { draftStatutesDocument } from './services/statutesDrafting.js';
import { buildSimulatorStatutesPreview } from './services/simulatorStatutesPreviewService.js';
import { buildDocumentPreviewBuffer } from './services/documentEditorPreviewService.js';
import { generateStatutesPdf } from './pdf/statutesPdf.js';
import {
  buildStatutesPdfForDossier,
  resolveStatutesPdfAccess,
} from './services/statutesPdfService.js';
import { resolveDossierAccess } from './utils/dossierAccess.js';
import { registerNonConvictionSignatureRoutes } from './routes/nonConvictionSignatureRoutes.js';
import { registerDossierMessageRoutes } from './routes/dossierMessageRoutes.js';
import { createDossierMessageHub } from './messaging/dossierMessageHub.js';
import { registerEditableDocumentSignatureRoutes } from './routes/editableDocumentSignatureRoutes.js';
import {
  getEditableDocumentConfig,
  getSupportedEditableDocumentKeys,
} from './documents/editableDocumentRegistry.js';
import { persistEditableDocumentPdf } from './services/editableDocumentService.js';
import { registerPaymentsRoutes } from './routes/paymentsRoutes.js';
import { registerAppVersionRoutes } from './routes/appVersionRoutes.js';
import verificationRouter from './routes/verificationRoutes.js';
import identityRouter, { createDiditWebhookHandler } from './routes/identityRoutes.js';
import { startIdentityVerificationForDossier } from './services/identity/identity.provider.js';
import {
  createTrustedDevice,
  hasValidTrustedDevice,
} from './mfaTrustedDeviceStore.js';
import { askGreffioAssistant, isAssistantConfigured } from './services/assistant.js';
import {
  createSupabaseSignedDownloadUrl,
  createSignedDownloadUrl,
  deleteDocumentFromConfiguredStorage,
  downloadDocumentBufferFromConfiguredStorage,
  objectStorageConfig,
  uploadDocumentToConfiguredStorage,
} from './services/objectStorage.js';
import {
  enqueueStorageRetry,
  getStorageRetryQueueSnapshot,
  registerStorageFailureForOps,
} from './services/storageRetryQueue.js';
import { listEmailEvents, updateEmailEventByProviderMessageId } from './emailStore.js';
import {
  activateTotp,
  consumeRecoveryCode,
  disableMfa,
  getMfaStatus,
  getTotpSecret,
  isMfaEnabled,
  replaceRecoveryCodes,
  savePendingTotpSecret,
} from './mfaStore.js';
import {
  issueMfaEmailCode,
  maskEmailAddress,
  verifyMfaEmailCode,
} from './mfaEmailCodeStore.js';
import { buildTotpSetup, encryptSecret, verifyTotpCode } from './services/mfaService.js';

dotenv.config();

const app = express();
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
const port = Number(process.env.PORT || 8787);

const allowedOrigins = [
  'https://greffio.willentreprises.com',
  'https://www.greffio.willentreprises.com',
];

const corsOptions = process.env.NODE_ENV === 'production'
  ? {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('CORS_ORIGIN_FORBIDDEN'));
      },
      credentials: true,
    }
  : {
      origin: true,
      credentials: true,
    };

app.use(helmet());
app.use('/assets/email', express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), 'assets', 'email'), {
  maxAge: '7d',
  immutable: true,
}));
app.use(cors(corsOptions));
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('Pragma', 'no-cache');
  }
  next();
});
app.use((req, res, next) => {
  if (req.path === '/api/webhooks/resend' || req.path === '/api/webhooks/brevo') return next();
  if (req.path === '/webhooks/gocardless' || req.path === '/api/webhooks/gocardless') return next();
  return express.json()(req, res, next);
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const companyLookupPublicLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
});
const statutesPreviewDraftLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
const assistantLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
const credentialsUnlockLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
});

const appUrl = process.env.APP_URL || 'https://greffio.willentreprises.com';

const maybeSendLoginAlertEmail = async (req, user, extraTags = []) => {
  if (!shouldSendLoginAlert(user)) return;
  void sendTransactionalEmail({
    to: { email: user.email, name: `${user.firstName || ''} ${user.lastName || ''}`.trim() },
    templateKey: 'login_notification',
    variables: {
      firstName: user.firstName || 'Client',
      loginTime: formatParisDateTime(),
      ipAddress: getClientIp(req),
      deviceLabel: parseDeviceLabel(req.headers['user-agent']),
      locationApproximation: 'Non disponible',
      securityUrl: `${appUrl}/settings`,
    },
    userId: user.id,
    tags: ['auth', 'security', 'login_alert', ...extraTags],
  });
};

const resolveMfaPendingUser = async (mfaToken) => {
  let payload;
  try {
    payload = verifyToken(String(mfaToken));
  } catch (_error) {
    const error = new Error('MFA_TOKEN_INVALID');
    throw error;
  }
  if (payload.typ !== 'mfa_pending') {
    const error = new Error('MFA_TOKEN_INVALID');
    throw error;
  }
  const user = await getUserById(payload.sub);
  if (!user || !(await isMfaEnabled(user.id))) {
    const error = new Error('MFA_NOT_ENABLED');
    throw error;
  }
  return user;
};
const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8787';
const mollieWebhookUrl = process.env.MOLLIE_WEBHOOK_URL || `${apiBaseUrl}/webhooks/mollie`;
const gocardlessWebhookUrl = process.env.GOCARDLESS_WEBHOOK_URL || `${apiBaseUrl}/webhooks/gocardless`;
const uploadsRoot = path.resolve(process.cwd(), 'server', 'data', 'uploads');

const sanitizeFilename = (value, fallback = 'document.pdf') => {
  const cleaned = String(value || '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || fallback;
};

const ensureUniqueFilePath = (filePath) => {
  if (!fs.existsSync(filePath)) return filePath;
  const directory = path.dirname(filePath);
  const extension = path.extname(filePath) || '.pdf';
  const base = path.basename(filePath, extension);
  const uniqueName = `${base}_${Date.now()}${extension}`;
  return path.join(directory, uniqueName);
};

const isSafeUploadPath = (filePath) => {
  if (!filePath) return false;
  const normalizedRoot = path.resolve(process.cwd(), 'server', 'data');
  const normalizedCandidate = path.resolve(filePath);
  return normalizedCandidate.startsWith(normalizedRoot);
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'greffio-api', timestamp: new Date().toISOString() });
});

app.post('/api/observability/client-error', express.json({ limit: '32kb' }), (req, res) => {
  const payload = req.body || {};
  console.error('[CLIENT_ERROR]', {
    message: payload.message,
    route: payload.route,
    source: payload.source,
    stack: payload.stack ? String(payload.stack).slice(0, 500) : null,
    timestamp: new Date().toISOString(),
  });
  if (process.env.SENTRY_DSN) {
    console.info('[CLIENT_ERROR] Sentry DSN configured — forward via votre agent Sentry serveur si activé.');
  }
  return res.status(204).end();
});

app.get('/api/ready', async (_req, res) => {
  const checks = {
    storageDriver: objectStorageConfig.driver,
    requestedStorageDriver: objectStorageConfig.requestedDriver,
    s3Configured: objectStorageConfig.s3Configured,
    supabaseConfigured: objectStorageConfig.supabaseConfigured,
    assistantConfigured: isAssistantConfigured(),
    timestamp: new Date().toISOString(),
  };
  if (checks.requestedStorageDriver === 's3' && !checks.s3Configured) {
    return res.status(503).json({ ok: false, error: 'S3_STORAGE_NOT_CONFIGURED', checks });
  }
  if (checks.storageDriver === 'supabase' && !checks.supabaseConfigured) {
    return res.status(503).json({ ok: false, error: 'STORAGE_NOT_CONFIGURED', checks });
  }
  return res.json({ ok: true, checks });
});

app.get('/api/interfaces/status', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (_req, res) => {
  const databaseStatus = process.env.DATABASE_URL
    ? 'Postgres (DATABASE_URL configuré)'
    : 'SQLite local (mode dev uniquement)';
  const databaseTone = process.env.DATABASE_URL ? 'healthy' : 'warning';

  return res.json({
    ok: true,
    interfaces: [
      {
        key: 'frontend',
        status: 'healthy',
        detail: `URL client attendue: ${appUrl}`,
      },
      {
        key: 'backend',
        status: 'healthy',
        detail: `API active: ${apiBaseUrl} · endpoint santé disponible`,
      },
      {
        key: 'payment',
        status: (process.env.GOCARDLESS_ACCESS_TOKEN || process.env.GOCARDLESS_API_KEY || process.env.MOLLIE_API_KEY)
          ? 'healthy'
          : 'warning',
        detail: (process.env.GOCARDLESS_ACCESS_TOKEN || process.env.GOCARDLESS_API_KEY)
          ? 'GoCardless actif avec webhook /webhooks/gocardless'
          : process.env.MOLLIE_API_KEY
            ? 'Mollie actif (legacy) avec webhook /webhooks/mollie'
            : 'Aucun provider paiement configuré: mode simulation actif',
      },
      {
        key: 'database',
        status: databaseTone,
        detail: databaseStatus,
      },
    ],
    timestamp: new Date().toISOString(),
  });
});

const resolveCompanyIdentifier = (query = {}) => String(
  query.identifier || query.siren || query.siret || query.q || '',
).trim();

const companyLookupResponder = async (req, res) => {
  const startedAt = Date.now();
  const rawIdentifier = resolveCompanyIdentifier(req.query || {});
  const result = await lookupCompany(rawIdentifier);
  if (result.ok) {
    return res.json({
      ok: true,
      company: result.company,
      cached: Boolean(result.cached),
      source: result.company?.source || null,
      latencyMs: Date.now() - startedAt,
    });
  }
  const code = result.error || 'COMPANY_LOOKUP_FAILED';
  const status = code === 'INVALID_SIREN_OR_SIRET'
    ? 400
    : code === 'COMPANY_NOT_FOUND'
      ? 404
      : 502;
  return res.status(status).json({
    ok: false,
    code,
    message: 'Recherche entreprise indisponible pour le moment.',
  });
};

app.get('/api/company-search', companyLookupPublicLimiter, companyLookupResponder);
app.get('/api/public/company-search', companyLookupPublicLimiter, companyLookupResponder);

app.get('/api/resources/config', (_req, res) => {
  return res.json({ ok: true, ...getResourceConfig() });
});

app.get('/api/resources/services', (_req, res) => {
  return res.json({ ok: true, services: listResourceServices() });
});

app.get('/api/resources/search', (req, res) => {
  const query = String(req.query?.q || '').trim();
  if (!query) {
    return res.json({ ok: true, query: '', total: 0, groups: [], flat: [] });
  }
  const result = searchResourceCatalog(query);
  return res.json({ ok: true, ...result });
});

app.get('/api/resources/orders', requireAuth, async (req, res) => {
  const orders = await listUserResourceOrders(req.auth.sub);
  return res.json({ ok: true, orders });
});

app.get('/api/resources/orders/:orderId', requireAuth, async (req, res) => {
  try {
    const order = await getResourceOrderForUser({
      orderId: req.params.orderId,
      userId: req.auth.sub,
      isOps: isInternalRole(req.auth?.role),
    });
    return res.json({ ok: true, order });
  } catch (error) {
    return res.status(error?.status || 500).json({ ok: false, error: error?.message || 'ORDER_ERROR' });
  }
});

app.post('/api/resources/orders', requireAuth, async (req, res) => {
  try {
    const user = await getUserById(req.auth.sub);
    const order = await submitResourceOrder({
      userId: req.auth.sub,
      body: req.body,
      appUrl,
      customerName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
    });
    return res.status(201).json({ ok: true, order, config: getResourceConfig() });
  } catch (error) {
    if (error?.status === 404) {
      return res.status(404).json({ ok: false, error: 'SERVICE_NOT_FOUND' });
    }
    return res.status(400).json({ ok: false, error: error?.message || 'ORDER_ERROR' });
  }
});

app.post('/api/resources/orders/:orderId/checkout', requireAuth, async (req, res) => {
  try {
    const payload = await createResourceOrderCheckout({
      orderId: req.params.orderId,
      userId: req.auth.sub,
      appUrl,
      mollieWebhookUrl,
      gocardlessWebhookUrl,
    });
    return res.json({ ok: true, ...payload });
  } catch (error) {
    return res.status(error?.status || 500).json({
      ok: false,
      error: error?.message || 'CHECKOUT_ERROR',
    });
  }
});

app.get('/api/ops/resource-orders', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (req, res) => {
  const status = req.query?.status ? String(req.query.status) : undefined;
  const orders = await listOpsResourceOrders({ status });
  return res.json({ ok: true, orders });
});

app.patch('/api/ops/resource-orders/:orderId', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (req, res) => {
  const { status, notes } = req.body || {};
  if (!status) {
    return res.status(400).json({ ok: false, error: 'STATUS_REQUIRED' });
  }
  try {
    const order = await updateOpsResourceOrderStatus({
      orderId: req.params.orderId,
      status,
      actorId: req.auth.sub,
      notes,
    });
    return res.json({ ok: true, order });
  } catch (error) {
    return res.status(error?.status || 500).json({ ok: false, error: error?.message || 'UPDATE_ERROR' });
  }
});

app.get('/api/observability/company-lookup', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), (_req, res) => {
  return res.json({
    ok: true,
    metrics: getCompanyLookupMetrics(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/observability/storage', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), (_req, res) => {
  return res.json({
    ok: true,
    storage: objectStorageConfig,
    retryQueue: getStorageRetryQueueSnapshot(),
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/assistant', assistantLimiter, requireAuth, async (req, res) => {
  const { message, history = [], dossierId = null } = req.body || {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({ ok: false, error: 'ASSISTANT_MESSAGE_REQUIRED' });
  }
  try {
    const result = await askGreffioAssistant({
      message: String(message).trim(),
      history: Array.isArray(history) ? history : [],
      dossierId: dossierId ? String(dossierId) : null,
      userContext: {
        userId: req.auth?.sub || null,
        role: req.auth?.role || 'CLIENT',
        email: req.auth?.email || null,
      },
    });
    return res.json({
      ok: true,
      answer: result.answer,
      provider: result.provider,
      model: result.model,
      intent: result.intent || null,
      configured: isAssistantConfigured(),
      degraded: Boolean(result.degraded),
    });
  } catch (error) {
    console.error('ASSISTANT_API_FAILED', error);
    return res.json({
      ok: true,
      answer: 'Je n’ai pas pu générer la réponse pour le moment. Réessayez dans quelques secondes.',
      provider: 'local_fallback',
      model: null,
      configured: isAssistantConfigured(),
      degraded: true,
    });
  }
});

app.post('/api/mobile/search', requireAuth, async (req, res) => {
  const { query } = req.body || {};
  try {
    const payload = await buildMobileSearchResponse({
      userId: req.auth?.sub,
      role: req.auth?.role,
      query: String(query || ''),
    });
    return res.json({ ok: true, ...payload });
  } catch (error) {
    console.error('MOBILE_SEARCH_FAILED', error);
    return res.status(500).json({ ok: false, error: 'MOBILE_SEARCH_FAILED' });
  }
});

app.get('/api/mobile/notifications', requireAuth, async (req, res) => {
  try {
    const notifications = await buildMobileNotifications({
      userId: req.auth?.sub,
      role: req.auth?.role,
    });
    return res.json({ ok: true, notifications, unreadCount: notifications.length });
  } catch (error) {
    console.error('MOBILE_NOTIFICATIONS_FAILED', error);
    return res.status(500).json({ ok: false, error: 'MOBILE_NOTIFICATIONS_FAILED' });
  }
});

app.post('/api/mobile/push/register', requireAuth, async (req, res) => {
  const { token, platform, deviceLabel } = req.body || {};
  try {
    const payload = await upsertPushDeviceToken({
      userId: req.auth?.sub,
      token: String(token || ''),
      platform: String(platform || 'unknown'),
      deviceLabel,
    });
    return res.json({ ok: true, device: payload });
  } catch (error) {
    console.error('PUSH_REGISTER_FAILED', error);
    return res.status(400).json({ ok: false, error: 'PUSH_REGISTER_FAILED' });
  }
});

app.post('/api/mobile/push/unregister', requireAuth, async (req, res) => {
  const { token } = req.body || {};
  try {
    await revokePushDeviceToken({
      userId: req.auth?.sub,
      token: String(token || ''),
    });
    return res.json({ ok: true });
  } catch (error) {
    console.error('PUSH_UNREGISTER_FAILED', error);
    return res.status(400).json({ ok: false, error: 'PUSH_UNREGISTER_FAILED' });
  }
});

const loginFailureTracker = new Map();
const LOGIN_FAILURE_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_FAILURE_THRESHOLD = 3;

const recordLoginFailure = (email) => {
  const key = String(email || '').toLowerCase().trim();
  const now = Date.now();
  const existing = loginFailureTracker.get(key);
  const reset = !existing || now - existing.firstAt > LOGIN_FAILURE_WINDOW_MS;
  const next = reset ? { count: 1, firstAt: now } : { count: existing.count + 1, firstAt: existing.firstAt };
  loginFailureTracker.set(key, next);
  return next.count;
};

const clearLoginFailures = (email) => {
  loginFailureTracker.delete(String(email || '').toLowerCase().trim());
};

const buildGoogleCalendarLink = ({
  title,
  details,
  email,
  startIso,
  endIso,
}) => {
  const encode = encodeURIComponent;
  const start = startIso ? new Date(startIso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z') : '';
  const end = endIso ? new Date(endIso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z') : '';
  const dates = start && end ? `${start}/${end}` : '';
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encode(title)}&details=${encode(details)}&add=${encode(email)}${dates ? `&dates=${dates}` : ''}`;
};

app.post('/api/contact/appointment-request', contactLimiter, async (req, res) => {
  const {
    fullName,
    company,
    email,
    phone,
    need,
    message,
    preferredDate,
    preferredTime,
    source = 'web',
  } = req.body || {};
  if (!fullName || !email || !need || !message) {
    return res.status(400).json({ ok: false, error: 'INVALID_APPOINTMENT_REQUEST_PAYLOAD' });
  }

  const supportInbox = process.env.SALES_EMAIL || process.env.SUPPORT_EMAIL || 'contact@willentreprises.com';
  const now = new Date();
  const requestedStart = preferredDate
    ? new Date(`${preferredDate}T${preferredTime || '09:00'}:00`)
    : new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const requestedEnd = new Date(requestedStart.getTime() + 45 * 60 * 1000);
  const googleCalendarLink = buildGoogleCalendarLink({
    title: `RDV Greffio - ${need}`,
    details: `${message}\nEntreprise: ${company || 'N/A'}\nDemandeur: ${fullName}\nTéléphone: ${phone || 'N/A'}`,
    email,
    startIso: requestedStart.toISOString(),
    endIso: requestedEnd.toISOString(),
  });

  const internalResult = await sendTransactionalEmail({
    templateKey: 'booking_request_internal',
    to: { email: supportInbox, name: 'Greffio Support' },
    variables: {
      nom_complet: String(fullName).trim(),
      entreprise: String(company || 'N/A').trim(),
      email: String(email).trim(),
      telephone: String(phone || 'N/A').trim(),
      objet: String(need).trim(),
      message: String(message).trim(),
      creneau_souhaite: `${requestedStart.toLocaleDateString('fr-FR')} ${requestedStart.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      source: String(source),
      google_calendar_link: googleCalendarLink,
    },
    tags: ['support', 'internal'],
  });
  const customerResult = await sendTransactionalEmail({
    templateKey: 'booking_request_received',
    to: { email: String(email).trim(), name: String(fullName).trim() },
    variables: {
      prenom: String(fullName).trim().split(' ')[0] || 'Client',
      firstName: String(fullName).trim().split(' ')[0] || 'Client',
      objet: String(need).trim(),
      ticketNumber: `RDV-${Date.now()}`,
      expectedResponseTime: 'Réponse dans l’heure pendant les horaires ouvrés',
      supportUrl: `${appUrl}/contact`,
    },
    tags: ['support'],
  });
  if (!internalResult.ok || !customerResult.ok) {
    return res.status(502).json({
      ok: false,
      error: 'EMAIL_DELIVERY_FAILED',
      internalNotified: internalResult.ok,
      customerNotified: customerResult.ok,
    });
  }
  return res.status(201).json({
    ok: true,
    internalNotified: internalResult.ok,
    customerNotified: customerResult.ok,
    calendar: {
      provider: 'google_workspace',
      action: 'email_to_calendar_link',
      link: googleCalendarLink,
    },
  });
});

app.get('/api/dossiers/:dossierId/intelligent-prefill', requireAuth, async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const isOps = isInternalRole(req.auth?.role);
  const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
  if (!isOps && !isOwner) return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });

  const questionnaire = dossier.dataJson ? JSON.parse(dossier.dataJson) : {};
  const docs = await listDossierDocuments(dossier.id);
  const analyses = docs
    .map((doc) => doc?.metadata?.analysis)
    .filter(Boolean);

  let companyLookupResult = null;
  const identifier = questionnaire.companySiren || questionnaire.existingBusinessSiren || '';
  if (identifier) {
    const lookup = await lookupCompany(identifier);
    if (lookup.ok) companyLookupResult = lookup.company;
  }

  const payload = buildIntelligentPrefill({
    dossier,
    questionnaire,
    companyLookup: companyLookupResult,
    analyses,
  });
  return res.json({
    ok: true,
    ...payload,
  });
});

app.post('/api/auth/signup', authLimiter, async (req, res) => {
  const {
    email,
    password,
    firstName,
    lastName,
    company = null,
    loginAlertsEnabled,
  } = req.body || {};
  if (!email || !password || String(password).length < 8) {
    return res.status(400).json({ ok: false, error: 'INVALID_SIGNUP_PAYLOAD' });
  }
  const existing = await getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ ok: false, error: 'EMAIL_ALREADY_EXISTS' });
  }
  const createdUser = await createUser({
    email,
    password,
    firstName,
    lastName,
    role: 'CLIENT',
    company,
  });
  const alertsEnabled = loginAlertsEnabled !== false;
  const user = await updateUserProfile({
    userId: createdUser.id,
    profile: buildLoginAlertsProfilePatch(alertsEnabled),
  }) || createdUser;
  void sendTransactionalEmail({
    to: { email: user.email, name: `${user.firstName || ''} ${user.lastName || ''}`.trim() },
    templateKey: 'account_welcome',
    variables: {
      firstName: user.firstName || 'Client',
      dashboardUrl: `${appUrl}/dashboard`,
      supportUrl: `${appUrl}/contact`,
    },
    userId: user.id,
    tags: ['auth', 'onboarding'],
  });
  return res.status(201).json({
    ok: true,
    user,
    accessToken: issueAccessToken(user),
    refreshToken: issueRefreshToken(user),
  });
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'INVALID_LOGIN_PAYLOAD' });
  }
  const user = await authenticateUser({ email, password });
  if (!user) {
    const probe = await getUserByEmail(String(email || '').trim().toLowerCase() === 'pdg' ? 'pdg@greffio.temp' : String(email || '').toLowerCase().trim());
    if (probe?.profileJson) {
      try {
        const profile = JSON.parse(probe.profileJson);
        if (profile?.tempAccessExpiresAt && Date.now() > new Date(profile.tempAccessExpiresAt).getTime()) {
          return res.status(403).json({ ok: false, error: 'TEMP_ACCOUNT_EXPIRED' });
        }
      } catch (_error) {
        // ignore malformed profile
      }
    }
    const failures = recordLoginFailure(email);
    if (failures >= LOGIN_FAILURE_THRESHOLD) {
      const normalizedEmail = String(email).toLowerCase().trim();
      const target = await getUserByEmail(normalizedEmail);
      if (target) {
        void sendTransactionalEmail({
          to: { email: target.email, name: `${target.firstName || ''} ${target.lastName || ''}`.trim() },
          templateKey: 'suspicious_login_attempt',
          variables: {
            firstName: target.firstName || 'Client',
            attemptTime: formatParisDateTime(),
            ipAddress: getClientIp(req),
            locationApproximation: 'Non disponible',
            securityUrl: `${appUrl}/settings`,
            supportUrl: `${appUrl}/contact`,
          },
          userId: target.id,
          tags: ['auth', 'security'],
        });
      }
    }
    return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' });
  }
  clearLoginFailures(email);
  const mfaDeviceToken = String(req.headers['x-greffio-mfa-device'] || '').trim();
  if (await isMfaEnabled(user.id)) {
    if (mfaDeviceToken && await hasValidTrustedDevice(user.id, mfaDeviceToken)) {
      void maybeSendLoginAlertEmail(req, user, ['trusted_device']);
      return res.json({
        ok: true,
        user,
        accessToken: issueAccessToken(user),
        refreshToken: issueRefreshToken(user),
        mfaSkipped: true,
      });
    }
    return res.json({
      ok: true,
      mfaRequired: true,
      mfaToken: issueMfaPendingToken(user),
      methods: ['totp', 'email', 'recovery'],
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  }
  void maybeSendLoginAlertEmail(req, user);
  return res.json({
    ok: true,
    user,
    accessToken: issueAccessToken(user),
    refreshToken: issueRefreshToken(user),
  });
});

app.post('/api/auth/refresh', authLimiter, (req, res) => {
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

app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body || {};
  if (!email || !String(email).trim()) {
    return res.status(400).json({ ok: false, error: 'EMAIL_REQUIRED' });
  }
  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await getUserByEmail(normalizedEmail);
  if (!user) {
    return res.json({ ok: true, sent: true });
  }
  const expirationMinutes = Number(process.env.PASSWORD_RESET_EXPIRATION_MINUTES || 30);
  const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString();
  const token = await createPasswordResetToken({
    userId: user.id,
    expiresAt,
  });
  const resetLink = `${appUrl}/password-reset?token=${encodeURIComponent(token)}`;
  await sendTransactionalEmail({
    templateKey: 'password_reset',
    to: { email: normalizedEmail, name: user.firstName || 'Client' },
    variables: {
      firstName: user.firstName || 'Client',
      prenom: user.firstName || 'Client',
      resetUrl: resetLink,
      reset_link: resetLink,
      expirationMinutes: String(expirationMinutes),
      expiration_minutes: String(expirationMinutes),
    },
    userId: user.id,
    tags: ['auth', 'password'],
  });
  return res.json({ ok: true, sent: true });
});

app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password || String(password).length < 8) {
    return res.status(400).json({ ok: false, error: 'INVALID_RESET_PASSWORD_PAYLOAD' });
  }
  const userId = await consumePasswordResetToken({ token: String(token) });
  if (!userId) {
    return res.status(400).json({ ok: false, error: 'RESET_TOKEN_INVALID_OR_EXPIRED' });
  }
  await updateUserPasswordById({ userId, password: String(password) });
  const user = await getUserById(userId);
  if (user) {
    void sendTransactionalEmail({
      to: { email: user.email, name: `${user.firstName || ''} ${user.lastName || ''}`.trim() },
      templateKey: 'password_changed',
      variables: {
        firstName: user.firstName || 'Client',
        changedAt: formatParisDateTime(),
        securityUrl: `${appUrl}/settings`,
        supportUrl: `${appUrl}/contact`,
      },
      userId: user.id,
      tags: ['auth', 'password'],
    });
  }
  return res.json({ ok: true });
});

app.get('/api/public/credentials-unlock', credentialsUnlockLimiter, async (req, res) => {
  const token = String(req.query.token || '').trim();
  if (!token) {
    return res.status(400).json({ ok: false, error: 'CREDENTIAL_UNLOCK_TOKEN_REQUIRED' });
  }
  const row = await getUnlockByToken(token);
  if (!row || row.consumedAt || new Date(row.expiresAt).getTime() <= Date.now()) {
    return res.status(404).json({ ok: false, error: 'CREDENTIAL_UNLOCK_NOT_FOUND' });
  }
  const user = await getUserById(row.userId);
  if (!user) {
    return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' });
  }
  return res.json({
    ok: true,
    firstName: user.firstName || 'Utilisateur',
    phoneMasked: row.phoneMasked,
    expiresAt: row.expiresAt,
  });
});

app.post('/api/public/credentials-unlock/verify', credentialsUnlockLimiter, async (req, res) => {
  const token = String(req.body?.token || '').trim();
  const code = String(req.body?.code || '').trim();
  if (!token || !code) {
    return res.status(400).json({ ok: false, error: 'CREDENTIAL_UNLOCK_PAYLOAD_INVALID' });
  }
  const result = await verifyAndConsumeUnlock({ token, code });
  if (!result.ok) {
    const status = result.error === 'CREDENTIAL_UNLOCK_CODE_INVALID' ? 401 : 400;
    return res.status(status).json({ ok: false, error: result.error });
  }
  const user = await getUserById(result.userId);
  if (!user) {
    return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' });
  }
  return res.json({
    ok: true,
    email: user.email,
    temporaryPassword: result.temporaryPassword,
    loginUrl: `${appUrl}/login`,
  });
});

app.get('/api/auth/mfa/status', requireAuth, async (req, res) => {
  const status = await getMfaStatus(req.auth.sub);
  return res.json({ ok: true, ...status });
});

app.post('/api/auth/mfa/totp/setup', requireAuth, async (req, res) => {
  const user = await getUserById(req.auth.sub);
  if (!user) {
    return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' });
  }
  const setup = await buildTotpSetup({ email: user.email });
  await savePendingTotpSecret({
    userId: user.id,
    encryptedSecret: setup.encryptedSecret,
  });
  return res.json({
    ok: true,
    qrCodeDataUrl: setup.qrCodeDataUrl,
    manualSecret: setup.secret,
    otpauthUrl: setup.otpauthUrl,
  });
});

app.post('/api/auth/mfa/totp/enable', requireAuth, async (req, res) => {
  const { code } = req.body || {};
  if (!code) {
    return res.status(400).json({ ok: false, error: 'TOTP_CODE_REQUIRED' });
  }
  const pendingSecret = await getTotpSecret(req.auth.sub, { pending: true });
  if (!pendingSecret) {
    return res.status(400).json({ ok: false, error: 'TOTP_SETUP_REQUIRED' });
  }
  if (!verifyTotpCode({ secret: pendingSecret, token: code })) {
    return res.status(400).json({ ok: false, error: 'TOTP_CODE_INVALID' });
  }
  await activateTotp({
    userId: req.auth.sub,
    encryptedSecret: encryptSecret(pendingSecret),
  });
  const recoveryCodes = await replaceRecoveryCodes(req.auth.sub);
  const user = await getUserById(req.auth.sub);
  return res.json({
    ok: true,
    recoveryCodes,
    user,
    mfaEnabled: true,
    totpEnabled: true,
  });
});

app.post('/api/auth/mfa/totp/disable', requireAuth, async (req, res) => {
  const { password, code } = req.body || {};
  if (!password || !code) {
    return res.status(400).json({ ok: false, error: 'PASSWORD_AND_TOTP_REQUIRED' });
  }
  if (!(await verifyUserPassword({ email: req.auth.email, password }))) {
    return res.status(401).json({ ok: false, error: 'INVALID_PASSWORD' });
  }
  const secret = await getTotpSecret(req.auth.sub);
  if (!secret || !verifyTotpCode({ secret, token: code })) {
    return res.status(400).json({ ok: false, error: 'TOTP_CODE_INVALID' });
  }
  await disableMfa(req.auth.sub);
  const user = await getUserById(req.auth.sub);
  return res.json({ ok: true, user, mfaEnabled: false, totpEnabled: false });
});

app.post('/api/auth/mfa/recovery-codes/regenerate', requireAuth, async (req, res) => {
  const { password, code } = req.body || {};
  if (!password || !code) {
    return res.status(400).json({ ok: false, error: 'PASSWORD_AND_TOTP_REQUIRED' });
  }
  if (!(await verifyUserPassword({ email: req.auth.email, password }))) {
    return res.status(401).json({ ok: false, error: 'INVALID_PASSWORD' });
  }
  const secret = await getTotpSecret(req.auth.sub);
  if (!secret || !verifyTotpCode({ secret, token: code })) {
    return res.status(400).json({ ok: false, error: 'TOTP_CODE_INVALID' });
  }
  const recoveryCodes = await replaceRecoveryCodes(req.auth.sub);
  return res.json({ ok: true, recoveryCodes });
});

app.post('/api/auth/mfa/email/send', authLimiter, async (req, res) => {
  const { mfaToken } = req.body || {};
  if (!mfaToken) {
    return res.status(400).json({ ok: false, error: 'MFA_TOKEN_REQUIRED' });
  }
  try {
    const user = await resolveMfaPendingUser(mfaToken);
    const { code, expiresInMinutes } = issueMfaEmailCode(user.id);
    void sendTransactionalEmail({
      to: { email: user.email, name: `${user.firstName || ''} ${user.lastName || ''}`.trim() },
      templateKey: 'authentication_code',
      userId: user.id,
      variables: {
        firstName: user.firstName || 'Utilisateur',
        verificationCode: code,
        expirationMinutes: expiresInMinutes,
        actionLabel: 'connexion sécurisée à Greffio',
        supportUrl: `${appUrl}/contact`,
      },
      tags: ['auth', 'security', 'mfa', 'email'],
    });
    return res.json({
      ok: true,
      emailMasked: maskEmailAddress(user.email),
      expiresInMinutes,
    });
  } catch (error) {
    if (error?.message === 'MFA_EMAIL_COOLDOWN') {
      return res.status(429).json({
        ok: false,
        error: 'MFA_EMAIL_COOLDOWN',
        retryAfterSeconds: error.retryAfterSeconds || 60,
      });
    }
    if (error?.message === 'MFA_TOKEN_INVALID') {
      return res.status(401).json({ ok: false, error: 'MFA_TOKEN_INVALID' });
    }
    if (error?.message === 'MFA_NOT_ENABLED') {
      return res.status(401).json({ ok: false, error: 'MFA_NOT_ENABLED' });
    }
    throw error;
  }
});

app.post('/api/auth/mfa/verify-login', authLimiter, async (req, res) => {
  const { mfaToken, code, recoveryCode, method = 'totp' } = req.body || {};
  if (!mfaToken || (!code && !recoveryCode)) {
    return res.status(400).json({ ok: false, error: 'MFA_VERIFY_PAYLOAD_INVALID' });
  }
  let user;
  try {
    user = await resolveMfaPendingUser(mfaToken);
  } catch (error) {
    if (error?.message === 'MFA_TOKEN_INVALID') {
      return res.status(401).json({ ok: false, error: 'MFA_TOKEN_INVALID' });
    }
    if (error?.message === 'MFA_NOT_ENABLED') {
      return res.status(401).json({ ok: false, error: 'MFA_NOT_ENABLED' });
    }
    throw error;
  }

  let verified = false;
  if (recoveryCode || method === 'recovery') {
    verified = await consumeRecoveryCode({ userId: user.id, code: recoveryCode });
  } else if (method === 'email') {
    verified = verifyMfaEmailCode({ userId: user.id, code });
  } else {
    const secret = await getTotpSecret(user.id);
    verified = Boolean(secret && verifyTotpCode({ secret, token: code }));
  }
  if (!verified) {
    return res.status(401).json({ ok: false, error: 'MFA_CODE_INVALID' });
  }

  await maybeSendLoginAlertEmail(req, user, ['mfa']);

  return res.json({
    ok: true,
    user,
    accessToken: issueAccessToken(user),
    refreshToken: issueRefreshToken(user),
  });
});

app.get('/api/auth/mfa/trusted-device/status', requireAuth, async (req, res) => {
  const deviceToken = String(req.headers['x-greffio-mfa-device'] || '').trim();
  const remembered = deviceToken
    ? await hasValidTrustedDevice(req.auth.sub, deviceToken)
    : false;
  const mfaEnabled = await isMfaEnabled(req.auth.sub);
  return res.json({ ok: true, mfaEnabled, remembered });
});

app.post('/api/auth/mfa/trust-device', requireAuth, async (req, res) => {
  const mfaEnabled = await isMfaEnabled(req.auth.sub);
  if (!mfaEnabled) {
    return res.status(409).json({ ok: false, error: 'MFA_NOT_ENABLED' });
  }
  const payload = await createTrustedDevice(req.auth.sub, req);
  return res.json({
    ok: true,
    deviceToken: payload.deviceToken,
    expiresAt: payload.expiresAt,
    deviceLabel: payload.deviceLabel,
    ttlDays: payload.ttlDays,
  });
});

app.get('/api/user/profile', requireAuth, async (req, res) => {
  const user = await getUserById(req.auth.sub);
  if (!user) return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' });
  return res.json({ ok: true, user });
});

app.patch('/api/user/profile', requireAuth, async (req, res) => {
  const { firstName, lastName, phone, profile } = req.body || {};
  try {
    const user = await updateUserProfile({
      userId: req.auth.sub,
      firstName,
      lastName,
      phone,
      profile,
    });
    if (!user) return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' });
    return res.json({ ok: true, user });
  } catch (error) {
    if (error?.message === 'PROFILE_VALIDATION_FAILED') {
      return res.status(400).json({ ok: false, error: 'PROFILE_VALIDATION_FAILED', details: error.details || {} });
    }
    throw error;
  }
});

app.get('/api/geo/address-search', requireAuth, async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 3) {
    return res.json({ ok: true, results: [] });
  }
  try {
    const results = await searchGeoAddresses(q);
    return res.json({ ok: true, results });
  } catch (_error) {
    return res.status(502).json({ ok: false, error: 'ADDRESS_SEARCH_FAILED' });
  }
});

app.post('/api/webhooks/resend', express.text({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['resend-signature'];
  if (!signature) {
    return res.status(401).json({ ok: false, error: 'RESEND_SIGNATURE_MISSING' });
  }
  const verified = await parseResendWebhook({
    payload: req.body,
    signature: String(signature),
  });
  if (!verified.ok) {
    return res.status(401).json({ ok: false, error: 'RESEND_WEBHOOK_UNAUTHORIZED' });
  }
  const eventType = String(verified.event?.type || '');
  const normalizedStatus = eventType.includes('bounced')
    ? 'bounced'
    : eventType.includes('complained')
      ? 'complained'
      : eventType.includes('delivered')
        ? 'delivered'
        : eventType.includes('opened')
          ? 'opened'
          : eventType.includes('clicked')
            ? 'clicked'
            : 'received';
  const providerMessageId = verified.event?.data?.email_id || verified.event?.id || null;
  if (providerMessageId) {
    await updateEmailEventByProviderMessageId({
      providerMessageId,
      status: normalizedStatus,
      openedAt: normalizedStatus === 'opened' ? new Date().toISOString() : null,
      clickedAt: normalizedStatus === 'clicked' ? new Date().toISOString() : null,
      payloadPatch: { resendEvent: eventType },
    });
  }

  return res.json({
    ok: true,
    eventType: eventType || null,
    eventCreatedAt: verified.event?.created_at || null,
  });
});

app.post('/api/webhooks/brevo', express.json(), async (req, res) => {
  const token = req.query.token || req.headers['x-brevo-token'];
  const expectedSecret = process.env.BREVO_WEBHOOK_SECRET || '';
  if (expectedSecret && String(token || '') !== expectedSecret) {
    return res.status(401).json({ ok: false, error: 'BREVO_WEBHOOK_UNAUTHORIZED' });
  }

  const events = Array.isArray(req.body) ? req.body : [req.body];
  const results = [];
  for (const event of events.filter(Boolean)) {
    results.push(await handleBrevoWebhookEvent(event));
  }

  return res.json({
    ok: true,
    processed: results.length,
    results,
  });
});

app.get('/api/ops/email-events', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (req, res) => {
  const events = await listEmailEvents({
    limit: req.query?.limit ? Number(req.query.limit) : 100,
    templateId: req.query?.templateId ? String(req.query.templateId) : null,
    recipientEmail: req.query?.recipientEmail ? String(req.query.recipientEmail) : null,
  });
  return res.json({
    ok: true,
    events,
  });
});

app.get('/api/ops/cockpit', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (_req, res) => {
  const payload = await buildOpsCockpitPayload({
    getAllDossiers,
    listDossierDocuments,
    getAllPayments,
  });
  return res.json({ ok: true, ...payload });
});

app.get('/api/ops/dossiers', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (_req, res) => {
  res.json({
    ok: true,
    dossiers: await getAllDossiers(),
  });
});

app.get('/api/ops/dossiers-risk', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (_req, res) => {
  const dossiers = await getAllDossiers();
  const enriched = await Promise.all(
    dossiers.map(async (dossier) => {
      const documents = await listDossierDocuments(dossier.id);
      const risk = computeDossierRisk({ dossier, documents });
      return { dossier, documents, risk };
    }),
  );
  return res.json({
    ok: true,
    queue: sortAntiRejectionQueue(enriched),
  });
});

app.get('/api/ops/payments', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (_req, res) => {
  res.json({
    ok: true,
    payments: await getAllPayments(),
  });
});

app.get('/api/dossiers', requireAuth, async (req, res) => {
  const isOps = isInternalRole(req.auth?.role);
  const visibleDossiers = isOps
    ? await getAllDossiers()
    : await listDossiersForUser({ userId: req.auth?.sub });

  return res.json({
    ok: true,
    dossiers: visibleDossiers,
  });
});

app.get('/api/dossiers/trash', requireAuth, async (req, res) => {
  const items = await listTrashedDossiers({ userId: req.auth?.sub });
  return res.json({ ok: true, dossiers: items });
});

app.post('/api/dossiers/:dossierId/trash', requireAuth, async (req, res) => {
  const access = await resolveDossierAccess(req, req.params.dossierId);
  if (!access.ok) {
    return res.status(access.status).json({ ok: false, error: access.error });
  }
  const scheduled = await scheduleDossierDeletion({
    dossierId: access.dossier.id,
    userId: req.auth?.sub,
  });
  if (!scheduled) {
    return res.status(409).json({ ok: false, error: 'DOSSIER_ALREADY_TRASHED' });
  }
  return res.json({
    ok: true,
    message: 'Dossier placé en corbeille. Suppression définitive sous 72 h sauf annulation.',
    purgeAfter: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
  });
});

app.post('/api/dossiers/:dossierId/restore', requireAuth, async (req, res) => {
  const restored = await restoreDossier({
    dossierId: req.params.dossierId,
    userId: req.auth?.sub,
  });
  if (!restored) {
    return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_IN_TRASH' });
  }
  return res.json({ ok: true, dossierId: restored.id });
});

app.get('/api/dossiers/:dossierId', requireAuth, async (req, res) => {
  const access = await resolveDossierAccess(req, req.params.dossierId);
  if (!access.ok) {
    return res.status(access.status).json({ ok: false, error: access.error });
  }
  const { dossier } = access;
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
  const owner = await getUserById(req.auth.sub);
  if (owner?.email) {
    void sendTransactionalEmail({
      to: { email: owner.email, name: `${owner.firstName || ''} ${owner.lastName || ''}`.trim() },
      templateKey: 'dossier_created',
      variables: {
        firstName: owner.firstName || 'Client',
        dossierNumber: dossier.reference || dossier.id,
        service: dossier.service || service,
        typeFormalite: dossier.typeFormalite,
        legalForm: dossier.legalForm || dossier.formeJuridique || legalForm,
        formalityType: resolveFormalityPublicLabel({
          service: dossier.service || service,
          typeFormalite: dossier.typeFormalite,
          formeJuridique: dossier.formeJuridique || dossier.legalForm || legalForm,
          legalForm: dossier.legalForm || legalForm,
        }),
        dashboardUrl: `${appUrl}/dossier/${dossier.id}`,
      },
      userId: owner.id,
      dossierId: dossier.id,
      tags: ['dossier'],
    });
  }
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
    actorRole: req.auth?.role || ROLE.OPS,
    reason: reason || null,
    metadata: metadata || {},
  });
  if (!transition.ok) {
    return res.status(409).json({ ok: false, ...transition });
  }
  return res.json({ ok: true, dossier: transition.dossier, event: transition.event });
});

app.get('/api/dossiers/:dossierId/questionnaire', requireAuth, async (req, res) => {
  let dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const isOps = isInternalRole(req.auth?.role);
  if (!isOps && dossier.userId && dossier.userId !== req.auth?.sub) {
    return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });
  }
  if (!isOps && !dossier.userId) {
    dossier = await claimDossierForUser(dossier.id, req.auth.sub) || dossier;
  }
  const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
  if (!isOps && !isOwner) return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });
  return res.json({
    ok: true,
    questionnaire: dossier.dataJson ? JSON.parse(dossier.dataJson) : {},
    progressPercent: Number(dossier.progressPercent || 0),
    reference: dossier.reference || dossier.id,
  });
});

app.patch('/api/dossiers/:dossierId/questionnaire', requireAuth, async (req, res) => {
  let dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const isOps = isInternalRole(req.auth?.role);
  if (!isOps && dossier.userId && dossier.userId !== req.auth?.sub) {
    return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });
  }
  if (!isOps && !dossier.userId) {
    dossier = await claimDossierForUser(dossier.id, req.auth.sub) || dossier;
  }
  const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
  if (!isOps && !isOwner) return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });

  const { dataPatch = {}, progressPercent = null } = req.body || {};
  try {
    const updated = await updateDossierQuestionnaire({
      dossierId: dossier.id,
      dataPatch,
      progressPercent,
    });
    return res.json({
      ok: true,
      dossier: updated,
      questionnaire: updated?.dataJson ? JSON.parse(updated.dataJson) : {},
      progressPercent: Number(updated?.progressPercent || 0),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'QUESTIONNAIRE_SAVE_FAILED',
      message: error?.message || 'Save failed',
    });
  }
});

app.post('/api/dossiers/:dossierId/complete-step', requireAuth, async (req, res) => {
  let dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const isOps = isInternalRole(req.auth?.role);
  if (!isOps && dossier.userId && dossier.userId !== req.auth?.sub) {
    return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });
  }
  if (!isOps && !dossier.userId) {
    dossier = await claimDossierForUser(dossier.id, req.auth.sub) || dossier;
  }
  const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
  if (!isOps && !isOwner) return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });

  const { stepId, dataPatch = {}, progressPercent = null } = req.body || {};
  let updated;
  try {
    updated = await updateDossierQuestionnaire({
      dossierId: dossier.id,
      dataPatch,
      progressPercent,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'QUESTIONNAIRE_SAVE_FAILED',
      message: error?.message || 'Save failed',
    });
  }

  const mergedData = updated?.dataJson ? JSON.parse(updated.dataJson) : {};
  if (stepId === 'contact' && mergedData.email) {
    const baseVars = {
      prenom: mergedData.firstName || 'Client',
      nom: mergedData.lastName || '',
      email: mergedData.email,
      telephone: mergedData.phone || '',
      reference_dossier: updated.reference || updated.id,
      lien_espace_client: `${appUrl}/dashboard`,
    };
    try {
      await sendDossierEmailById({
        templateId: 'welcome',
        dossierId: updated.id,
        userId: req.auth.sub,
        toEmail: mergedData.email,
        variables: baseVars,
      });
      await sendDossierEmailById({
        templateId: 'contact_confirmed',
        dossierId: updated.id,
        userId: req.auth.sub,
        toEmail: mergedData.email,
        variables: baseVars,
      });
    } catch (emailError) {
      console.error('[complete-step] contact emails failed:', emailError?.message || emailError);
    }
  }

  return res.json({
    ok: true,
    dossier: updated,
    stepCompleted: stepId || null,
  });
});

app.get('/api/ops/dossiers/:dossierId/documents', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  return res.json({
    ok: true,
    documents: await listDossierDocuments(dossier.id),
  });
});

app.get('/api/ops/dossiers/:dossierId/detail', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const documents = await listDossierDocuments(dossier.id);
  const enriched = enrichDossierForOps({ dossier, documents });
  const owner = dossier.userId ? await getUserById(dossier.userId) : null;
  return res.json({
    ok: true,
    dossier,
    documents,
    events: await listDossierEvents(dossier.id),
    notes: await listOpsNotesByDossier(dossier.id),
    ownerEmail: owner?.email || null,
    risk: enriched.risk,
    completionScore: enriched.completionScore,
    sla: enriched.sla,
    nextBestAction: enriched.nextBestAction,
    checklist: enriched.checklist,
    readyForDeposit: enriched.readyForDeposit,
  });
});

app.patch('/api/ops/dossiers/:dossierId/assignment', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const { assignedToUserId = null, opsQueue, opsPriority } = req.body || {};
  const updated = await updateDossierOpsFields({
    dossierId: dossier.id,
    assignedToUserId,
    opsQueue,
    opsPriority,
  });
  return res.json({ ok: true, dossier: updated });
});

app.get('/api/ops/dossiers/:dossierId/notes', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  return res.json({
    ok: true,
    notes: await listOpsNotesByDossier(dossier.id),
  });
});

app.post('/api/ops/dossiers/:dossierId/notes', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const { note } = req.body || {};
  if (!note || !String(note).trim()) {
    return res.status(400).json({ ok: false, error: 'NOTE_REQUIRED' });
  }
  await addOpsNote({
    dossierId: dossier.id,
    authorId: req.auth.sub,
    note: String(note).trim(),
  });
  return res.status(201).json({
    ok: true,
    notes: await listOpsNotesByDossier(dossier.id),
  });
});

app.get('/api/ops/dossiers/:dossierId/documents/:docKey/download', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });

  const documents = await listDossierDocuments(dossier.id);
  const requested = documents.find((item) => item.docKey === req.params.docKey);
  if (!requested || !requested.storageUrl) {
    return res.status(404).json({ ok: false, error: 'DOCUMENT_FILE_NOT_FOUND' });
  }

  const downloadName = requested.filename || `${requested.docKey}.pdf`;
  const inline = String(req.query.inline || req.query.disposition || '').toLowerCase() === '1'
    || String(req.query.inline || req.query.disposition || '').toLowerCase() === 'inline';
  const disposition = inline ? 'inline' : 'attachment';

  try {
    const buffer = await downloadDocumentBufferFromConfiguredStorage(requested.storageUrl);
    res.setHeader('Content-Type', requested.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${downloadName}"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(buffer);
  } catch (error) {
    console.error('OPS_DOCUMENT_DOWNLOAD_FAILED', error);
    return res.status(404).json({ ok: false, error: 'DOCUMENT_FILE_NOT_FOUND' });
  }
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
    ownerFirstName,
    ownerLastName,
  } = req.body || {};
  const allowed = new Set(Object.values(DOCUMENT_STATUSES));
  if (!allowed.has(status)) {
    return res.status(400).json({ ok: false, error: 'INVALID_DOCUMENT_STATUS' });
  }
  const canonicalFilename = buildCanonicalDocumentFilename({
    docKey: req.params.docKey,
    dossierCompanyName: dossier.companyName,
    ownerFirstName,
    ownerLastName,
  });
  await updateDossierDocument({
    dossierId: dossier.id,
    docKey: req.params.docKey,
    status,
    filename: canonicalFilename || filename,
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

app.post('/api/dossiers/:dossierId/documents', uploadLimiter, requireAuth, uploadPdfOnly.single('file'), async (req, res) => {
  const access = await resolveDossierAccess(req, req.params.dossierId, { allowClaim: true });
  if (!access.ok) {
    return res.status(access.status).json({ ok: false, error: access.error });
  }
  const dossier = access.dossier;
  const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
  const isOps = isInternalRole(req.auth?.role);
  if (!isOwner && !isOps) return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });
  const {
    docKey,
    ownerFirstName,
    ownerLastName,
  } = req.body || {};
  if (!docKey) return res.status(400).json({ ok: false, error: 'DOC_KEY_REQUIRED' });
  if (!req.file) return res.status(400).json({ ok: false, error: 'FILE_REQUIRED' });
  const dossierQuestionnaire = dossier.dataJson ? JSON.parse(dossier.dataJson) : {};
  const formalityRule = getFormalityRule({ dossier, questionnaire: dossierQuestionnaire });
  if (formalityRule.excludedDocumentKeys?.includes(docKey)) {
    return res.status(409).json({ ok: false, error: 'DOCUMENT_NOT_ALLOWED_FOR_FORMALITY', docKey });
  }

  const allowedMimes = new Set(['application/pdf']);
  if (!allowedMimes.has(req.file.mimetype)) {
    return res.status(400).json({ ok: false, error: 'INVALID_FILE_TYPE' });
  }
  if (req.file.size > 10 * 1024 * 1024) {
    return res.status(400).json({ ok: false, error: 'FILE_TOO_LARGE' });
  }

  const canonicalFilename = buildCanonicalDocumentFilename({
    docKey,
    dossierCompanyName: dossier.companyName,
    ownerFirstName,
    ownerLastName,
  });
  const fallbackUploadName = sanitizeFilename(req.file.originalname || 'document.pdf');
  const targetFilename = sanitizeFilename(canonicalFilename || fallbackUploadName, 'document.pdf');
  const sha256 = createHash('sha256').update(req.file.buffer).digest('hex');
  let storageUrl = null;
  let fileUrl = null;
  let storageProvider = objectStorageConfig.driver;
  let storageUploadWarning = null;
  let localFallbackPath = null;

  try {
    const uploadResult = await uploadDocumentToConfiguredStorage({
      dossierId: dossier.id,
      docKey,
      buffer: req.file.buffer,
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype,
      targetFilename,
    });
    if (uploadResult.uploaded) {
      storageUrl = uploadResult.storageUrl;
      fileUrl = uploadResult.storageUrl;
      storageProvider = uploadResult.storageProvider || objectStorageConfig.driver;
      localFallbackPath = uploadResult.localFilePath || null;
    }
  } catch (storageError) {
    if (objectStorageConfig.driver === 'local') {
      throw storageError;
    }
    storageProvider = 'local_fallback';
    console.error('DOCUMENT_STORAGE_UPLOAD_FAILED', {
      dossierId: dossier.id,
      docKey,
      driver: objectStorageConfig.driver,
      message: storageError?.message || storageError,
    });
    const dossierUploadDir = path.join(uploadsRoot, String(dossier.id));
    if (!fs.existsSync(dossierUploadDir)) {
      fs.mkdirSync(dossierUploadDir, { recursive: true });
    }
    const desiredPath = path.join(dossierUploadDir, targetFilename);
    localFallbackPath = ensureUniqueFilePath(desiredPath);
    fs.writeFileSync(localFallbackPath, req.file.buffer);
    storageUrl = localFallbackPath;
    fileUrl = localFallbackPath;
    enqueueStorageRetry({
      dossierId: dossier.id,
      docKey,
      localFilePath: localFallbackPath,
      filename: path.basename(localFallbackPath),
      reason: `${objectStorageConfig.driver}_upload_failed`,
    });
    const alert = registerStorageFailureForOps({
      dossierId: dossier.id,
      docKey,
      reason: `${objectStorageConfig.driver}_upload_failed`,
    });
    if (alert.shouldAlert) {
      console.error('OPS_STORAGE_ALERT', {
        message: 'Repeated storage failures in 5 minute window',
        ...alert,
      });
    }
    storageUploadWarning = 'Stockage cloud temporairement indisponible, votre document est conservé et sera repris automatiquement.';
  }

  const analysis = await analyzeDocument({
    pdfBuffer: req.file.mimetype === 'application/pdf' ? req.file.buffer : undefined,
    filePath: req.file.mimetype === 'application/pdf' ? localFallbackPath : undefined,
    docKey,
  });
  const analysisStatus = analysis.ok && analysis.requiresManualReview
    ? DOCUMENT_STATUSES.UNDER_REVIEW
    : DOCUMENT_STATUSES.UPLOADED;

  await updateDossierDocument({
    dossierId: dossier.id,
    docKey,
    status: analysisStatus,
    originalFilename: req.file.originalname,
    recommendedFilename: targetFilename,
    fileUrl,
    filename: path.basename(targetFilename),
    fileSizeBytes: req.file.size,
    mimeType: req.file.mimetype,
    storageUrl,
    sha256,
    reviewerId: null,
    metadata: {
      analysis,
      storageProvider,
      storageUploadWarning,
      uploadedByRole: req.auth?.role || 'client',
      uploadedAt: new Date().toISOString(),
    },
  });

  const dossierData = dossier.dataJson ? JSON.parse(dossier.dataJson) : {};
  const firstNameForEmail = ownerFirstName || dossierData.firstName || 'Client';
  const recipientEmail = (isOwner ? req.auth.email : null) || dossierData.email || req.auth.email || null;
  const uploadedDoc = (await listDossierDocuments(dossier.id)).find((item) => item.docKey === docKey);
  const documentLabel = uploadedDoc?.label || docKey;
  if (recipientEmail) {
    await sendDossierEmailById({
      templateId: 'documents_received',
      dossierId: dossier.id,
      userId: req.auth.sub,
      toEmail: recipientEmail,
      variables: {
        prenom: firstNameForEmail,
        firstName: firstNameForEmail,
        reference_dossier: dossier.reference || dossier.id,
        documentName: documentLabel,
      },
    });

    if (analysis.ok && analysis.requiresManualReview) {
      await sendDossierEmailById({
        templateId: 'document_invalid',
        dossierId: dossier.id,
        userId: req.auth.sub,
        toEmail: recipientEmail,
        variables: {
          prenom: firstNameForEmail,
          firstName: firstNameForEmail,
          reference_dossier: dossier.reference || dossier.id,
          motif_complement: "La qualité ou lisibilité du document nécessite une vérification manuelle de l'équipe Greffio.",
          documentName: documentLabel,
          rejectionReason: "La qualité ou lisibilité du document nécessite une vérification manuelle de l'équipe Greffio.",
        },
      });
    }
  }

  let identityVerification = null;
  if (docKey === 'identity_proof') {
    try {
      const identityResult = await startIdentityVerificationForDossier({
        dossierId: dossier.id,
        userId: req.auth.sub,
        email: recipientEmail || req.auth.email,
        triggeredByDocKey: docKey,
      });
      if (identityResult.ok && identityResult.verification) {
        identityVerification = {
          status: identityResult.verification.status,
          verificationUrl: identityResult.verification.verification_url,
          reused: Boolean(identityResult.reused),
        };
      }
    } catch (identityError) {
      console.error('[identity] auto-start after upload failed', identityError);
    }
  }

  return res.status(201).json({
    ok: true,
    file: {
      originalFilename: req.file.originalname,
      recommendedFilename: targetFilename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      sha256,
    },
    analysis,
    warning: storageUploadWarning,
    identityVerification,
    documents: await listDossierDocuments(dossier.id),
  });
});

app.delete('/api/dossiers/:dossierId/documents/:docKey', requireAuth, async (req, res) => {
  const access = await resolveDossierAccess(req, req.params.dossierId);
  if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });
  const { dossier } = access;

  const docKey = String(req.params.docKey || '').trim();
  if (!docKey) return res.status(400).json({ ok: false, error: 'DOC_KEY_REQUIRED' });

  const documents = await listDossierDocuments(dossier.id);
  const existing = documents.find((item) => item.docKey === docKey);
  if (!existing) return res.status(404).json({ ok: false, error: 'DOCUMENT_SLOT_NOT_FOUND' });

  const hasFile = Boolean(existing.filename || existing.storageUrl || existing.fileUrl);
  if (!hasFile) {
    return res.status(409).json({ ok: false, error: 'DOCUMENT_NOT_UPLOADED' });
  }

  const isOps = isInternalRole(req.auth?.role);
  if (existing.status === DOCUMENT_STATUSES.VALID && !isOps) {
    return res.status(409).json({ ok: false, error: 'DOCUMENT_VALIDATED_LOCKED' });
  }

  const cleared = await clearDossierDocumentAttachment({
    dossierId: dossier.id,
    docKey,
    actorId: req.auth.sub,
    actorType: isOps ? 'ops' : 'client',
  });
  if (!cleared?.removed) {
    return res.status(409).json({ ok: false, error: 'DOCUMENT_NOT_UPLOADED' });
  }

  if (cleared.previousStorageUrl) {
    try {
      await deleteDocumentFromConfiguredStorage(cleared.previousStorageUrl);
    } catch (storageError) {
      console.error('DOCUMENT_STORAGE_DELETE_FAILED', storageError);
    }
  }

  return res.json({
    ok: true,
    documents: await listDossierDocuments(dossier.id),
  });
});

app.get('/api/dossiers/:dossierId/documents/:docKey/download-url', requireAuth, async (req, res) => {
  const access = await resolveDossierAccess(req, req.params.dossierId);
  if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });
  const { dossier } = access;

  const documents = await listDossierDocuments(dossier.id);
  const requested = documents.find((item) => item.docKey === req.params.docKey);
  if (!requested || !requested.storageUrl) {
    return res.status(404).json({ ok: false, error: 'DOCUMENT_FILE_NOT_FOUND' });
  }

  const source = String(requested.storageUrl);
  if (source.startsWith('s3://') || source.startsWith('supabase://')) {
    const signed = await createSignedDownloadUrl(source);
    if (!signed?.url) {
      return res.status(404).json({ ok: false, error: 'DOCUMENT_FILE_NOT_FOUND' });
    }
    return res.json({
      ok: true,
      success: true,
      url: signed.url,
      expiresIn: signed.expiresIn,
    });
  }

  if (!isSafeUploadPath(source) || !fs.existsSync(source)) {
    return res.status(404).json({ ok: false, error: 'DOCUMENT_FILE_NOT_FOUND' });
  }

  return res.json({
    ok: true,
    success: true,
    url: `/api/dossiers/${dossier.id}/documents/${encodeURIComponent(requested.docKey)}/download`,
    expiresIn: null,
    local: true,
  });
});

app.get('/api/dossiers/:dossierId/documents/:docKey/download', requireAuth, async (req, res) => {
  const access = await resolveDossierAccess(req, req.params.dossierId);
  if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });
  const { dossier } = access;

  const documents = await listDossierDocuments(dossier.id);
  const requested = documents.find((item) => item.docKey === req.params.docKey);
  if (!requested || !requested.storageUrl) {
    return res.status(404).json({ ok: false, error: 'DOCUMENT_FILE_NOT_FOUND' });
  }

  const downloadName = requested.filename || `${requested.docKey}.pdf`;
  const inline = String(req.query.inline || req.query.disposition || '').toLowerCase() === '1'
    || String(req.query.inline || req.query.disposition || '').toLowerCase() === 'inline';
  const disposition = inline ? 'inline' : 'attachment';

  try {
    const buffer = await downloadDocumentBufferFromConfiguredStorage(requested.storageUrl);
    res.setHeader('Content-Type', requested.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${downloadName}"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(buffer);
  } catch (error) {
    console.error('DOCUMENT_DOWNLOAD_FAILED', error);
    return res.status(404).json({ ok: false, error: 'DOCUMENT_FILE_NOT_FOUND' });
  }
});

app.get('/api/dossiers/:dossierId/documents/:docKey/editor', requireAuth, async (req, res) => {
  const access = await resolveDossierAccess(req, req.params.dossierId, { allowClaim: true });
  if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });
  const { dossier } = access;
  const docKey = String(req.params.docKey || '');
  const editableConfig = getEditableDocumentConfig(docKey);
  const supported = new Set(['manager_non_conviction', ...getSupportedEditableDocumentKeys()]);
  if (!supported.has(docKey)) {
    return res.status(409).json({ ok: false, error: 'DOCUMENT_EDITOR_NOT_SUPPORTED' });
  }

  let questionnaire = {};
  try {
    questionnaire = dossier.dataJson ? JSON.parse(dossier.dataJson) : {};
  } catch (_error) {
    questionnaire = {};
  }

  const dossierUser = dossier.userId
    ? await getUserById(dossier.userId)
    : await getUserById(req.auth?.sub);
  let savedFields = {};
  try {
    await ensureDossierDocuments(dossier.id);
    const documents = await listDossierDocuments(dossier.id);
    const existing = documents.find((item) => item.docKey === docKey);
    savedFields = existing?.metadata?.fields && typeof existing.metadata.fields === 'object'
      ? existing.metadata.fields
      : {};
  } catch (error) {
    console.error('DOCUMENT_EDITOR_LOAD_FAILED', error);
    return res.status(500).json({ ok: false, error: 'DOCUMENT_EDITOR_LOAD_FAILED' });
  }

  try {
    if (editableConfig) {
      const fields = editableConfig.buildInitialFields({
        dossier,
        questionnaire,
        user: dossierUser,
        savedFields,
      });
      return res.json({
        ok: true,
        docKey,
        schemaVersion: editableConfig.schemaVersion,
        title: editableConfig.title,
        fields,
      });
    }
  } catch (error) {
    console.error('DOCUMENT_EDITOR_LOAD_FAILED', error);
    return res.status(500).json({ ok: false, error: 'DOCUMENT_EDITOR_LOAD_FAILED' });
  }

  const initialFields = {
    declarantFirstName: questionnaire.firstName || '',
    declarantLastName: questionnaire.lastName || '',
    declarantFullName: `${questionnaire.firstName || ''} ${questionnaire.lastName || ''}`.trim(),
    declarantBirthDate: questionnaire.birthDate || '',
    declarantBirthCity: questionnaire.birthCity || questionnaire.lieuNaissance || '',
    addressLine1: questionnaire.address || questionnaire.homeAddress || '',
    addressLine2: '',
    postalCode: questionnaire.postalCode || questionnaire.codePostal || '',
    city: questionnaire.city || questionnaire.ville || '',
    country: questionnaire.country || 'France',
    declarantAddress: questionnaire.address || questionnaire.homeAddress || '',
    parent1FullName: questionnaire.parent1FullName || '',
    parent2FullName: questionnaire.parent2FullName || '',
    statementDate: new Date().toISOString().slice(0, 10),
    statementCity: questionnaire.city || questionnaire.ville || '',
    declarationNonCondamnation: true,
    declarationFiliation: true,
    signatureFullName: `${questionnaire.firstName || ''} ${questionnaire.lastName || ''}`.trim(),
    signerEmail: '',
  };
  const fields = {
    ...initialFields,
    ...savedFields,
    declarationNonCondamnation: savedFields.declarationNonCondamnation !== false,
    declarationFiliation: savedFields.declarationFiliation !== false,
  };
  if (!fields.signatureFullName?.trim()) {
    fields.signatureFullName = `${fields.declarantFirstName || ''} ${fields.declarantLastName || ''}`.trim();
  }
  return res.json({
    ok: true,
    docKey,
    schemaVersion: NON_CONVICTION_SCHEMA_VERSION,
    title: 'Déclaration de non-condamnation et de filiation',
    fields,
  });
});

app.post('/api/dossiers/:dossierId/documents/:docKey/editor', requireAuth, async (req, res) => {
  const access = await resolveDossierAccess(req, req.params.dossierId, { allowClaim: true });
  if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });
  const { dossier } = access;
  const docKey = String(req.params.docKey || '');
  const editableConfig = getEditableDocumentConfig(docKey);
  if (docKey !== 'manager_non_conviction' && !editableConfig) {
    return res.status(409).json({ ok: false, error: 'DOCUMENT_EDITOR_NOT_SUPPORTED' });
  }

  const fields = req.body?.fields || {};

  if (editableConfig) {
    const validation = editableConfig.validateFields(fields);
    if (!validation.ok) {
      return res.status(400).json({ ok: false, error: validation.error });
    }
    try {
      await ensureDossierDocuments(dossier.id);
      const { sha256, filename, updated } = await persistEditableDocumentPdf({
        docKey: editableConfig.docKey,
        schemaVersion: editableConfig.schemaVersion,
        dossier,
        fields: validation.normalized || fields,
        generatePdf: editableConfig.generatePdf,
        filenamePrefix: editableConfig.filenamePrefix,
        ensureDossierDocuments,
        updateDossierDocument,
        listDossierDocuments,
        DOCUMENT_STATUSES,
        metadataExtra: { generatedFromEditor: true },
      });
      if (!updated) {
        return res.status(409).json({ ok: false, error: 'DOCUMENT_SLOT_NOT_FOUND' });
      }
      return res.status(201).json({
        ok: true,
        filename,
        sha256,
        documents: await listDossierDocuments(dossier.id),
      });
    } catch (error) {
      console.error('DOCUMENT_EDITOR_GENERATION_FAILED', error);
      return res.status(500).json({ ok: false, error: 'DOCUMENT_EDITOR_GENERATION_FAILED' });
    }
  }

  const validation = validateNonConvictionFields(fields);
  if (!validation.ok) {
    return res.status(400).json({ ok: false, error: validation.error });
  }

  try {
    await ensureDossierDocuments(dossier.id);
    const { sha256, filename, updated } = await persistNonConvictionPdfForDossier({
      dossier,
      fields: validation.normalized || fields,
      ensureDossierDocuments,
      updateDossierDocument,
      listDossierDocuments,
      DOCUMENT_STATUSES,
      metadataExtra: {
        generatedFromEditor: true,
      },
    });
    if (!updated) {
      return res.status(409).json({ ok: false, error: 'DOCUMENT_SLOT_NOT_FOUND' });
    }
    return res.status(201).json({
      ok: true,
      filename,
      sha256,
      documents: await listDossierDocuments(dossier.id),
    });
  } catch (error) {
    console.error('DOCUMENT_EDITOR_GENERATION_FAILED', error);
    return res.status(500).json({ ok: false, error: 'DOCUMENT_EDITOR_GENERATION_FAILED' });
  }
});

app.post('/api/dossiers/:dossierId/documents/:docKey/preview-pdf', requireAuth, async (req, res) => {
  const access = await resolveDossierAccess(req, req.params.dossierId, { allowClaim: true });
  if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });
  const docKey = String(req.params.docKey || '');
  const supported = new Set(['manager_non_conviction', ...getSupportedEditableDocumentKeys()]);
  if (!supported.has(docKey)) {
    return res.status(409).json({ ok: false, error: 'DOCUMENT_EDITOR_NOT_SUPPORTED' });
  }

  try {
    const buffer = await buildDocumentPreviewBuffer({ docKey, fields: req.body?.fields || {} });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="apercu.pdf"');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(buffer);
  } catch (error) {
    const code = String(error?.code || error?.message || 'PDF_GENERATION_FAILED');
    if (code.startsWith('DOCUMENT_EDITOR_') || code === 'SIGNATURE_CONSENT_REQUIRED') {
      return res.status(400).json({ ok: false, error: code });
    }
    console.error('DOCUMENT_PREVIEW_PDF_FAILED', error);
    return res.status(500).json({ ok: false, error: 'PDF_GENERATION_FAILED' });
  }
});

app.get('/api/dossiers/:dossierId/mandate', requireAuth, async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
  const isOps = isInternalRole(req.auth?.role);
  if (!isOwner && !isOps) return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });

  const signature = await getLatestSignatureByDossier(dossier.id);
  return res.json({
    ok: true,
    dossierId: dossier.id,
    reference: dossier.reference || dossier.id,
    signature,
  });
});

app.post('/api/dossiers/:dossierId/mandate/sign', requireAuth, async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
  if (!isOwner) return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });

  const {
    signerFullName,
    accepted,
    documentVersion = 'v1',
  } = req.body || {};
  if (!accepted || !signerFullName) {
    return res.status(400).json({ ok: false, error: 'MANDATE_CONSENT_REQUIRED' });
  }

  const signedAt = new Date().toISOString();
  const ipAddress = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.socket.remoteAddress || null;
  const userAgent = req.headers['user-agent'] || null;
  const mandateText = buildMandateText({
    dossier,
    signerFullName: String(signerFullName).trim(),
    acceptedAt: signedAt,
  });
  const documentHash = createHash('sha256').update(`${mandateText}|${signedAt}|${signerFullName}`).digest('hex');
  const safeReference = String(dossier.reference || dossier.id).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Procuration_Greffio_${safeReference}_${Date.now()}.pdf`;
  const pdfPath = await generateMandatePdf({
    filename,
    bodyText: mandateText,
    signatureSummary: `Signé électroniquement par ${signerFullName} le ${signedAt}`,
    evidence: {
      documentHash,
      ipAddress,
      userAgent,
      documentVersion,
    },
  });

  await createSignatureRecord({
    dossierId: dossier.id,
    signerUserId: req.auth.sub,
    signatureType: 'electronic_simple',
    status: 'signed',
    signedAt,
    ipAddress,
    userAgent,
    evidence: {
      documentHash,
      documentVersion,
      consentTextAccepted: true,
      signerFullName: String(signerFullName).trim(),
      pdfPath,
    },
  });

  await updateDossierDocument({
    dossierId: dossier.id,
    docKey: 'proxy_mandate',
    status: DOCUMENT_STATUSES.VALID,
    filename,
    fileSizeBytes: fs.statSync(pdfPath).size,
    mimeType: 'application/pdf',
    storageUrl: pdfPath,
    reviewerId: req.auth.sub,
  });

  await transitionDossierStatus({
    dossierId: dossier.id,
    nextStatus: DOSSIER_STATUSES.MANDATE_SIGNED,
    actorType: 'api',
    actorRole: req.auth?.role || ROLE.CLIENT,
    actorId: req.auth.sub,
    reason: 'mandate_signed',
    metadata: { documentHash, documentVersion },
  });

  await sendDossierEmailById({
    templateId: 'mandate_signed',
    dossierId: dossier.id,
    userId: req.auth.sub,
    toEmail: req.auth.email || null,
    variables: {
      prenom: signerFullName?.split(' ')[0] || 'Client',
      reference_dossier: dossier.reference || dossier.id,
    },
  });

  return res.status(201).json({
    ok: true,
    signature: {
      signedAt,
      ipAddress,
      userAgent,
      documentHash,
      documentVersion,
    },
    mandatePdf: {
      filename,
      path: pdfPath,
    },
  });
});

app.get('/api/dossiers/:dossierId/mandate/pdf', requireAuth, async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
  const isOps = isInternalRole(req.auth?.role);
  if (!isOwner && !isOps) return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });

  const docs = await listDossierDocuments(dossier.id);
  const mandateDoc = docs.find((item) => item.docKey === 'proxy_mandate' && item.storageUrl);
  if (!mandateDoc || !mandateDoc.storageUrl || !fs.existsSync(mandateDoc.storageUrl)) {
    return res.status(404).json({ ok: false, error: 'MANDATE_PDF_NOT_FOUND' });
  }

  const downloadName = mandateDoc.filename || path.basename(mandateDoc.storageUrl);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
  return fs.createReadStream(mandateDoc.storageUrl).pipe(res);
});

app.post('/api/statutes/preview-draft', statutesPreviewDraftLimiter, async (req, res) => {
  try {
    const { preview } = buildSimulatorStatutesPreview(req.body || {});
    return res.json({ ok: true, preview });
  } catch (error) {
    if (error?.code === 'LEGAL_FORM_UNSUPPORTED') {
      return res.status(409).json({ ok: false, error: 'LEGAL_FORM_UNSUPPORTED', legalForm: error.legalForm });
    }
    if (error?.code === 'STATUTES_VALIDATION_FAILED') {
      return res.status(422).json({
        ok: false,
        error: 'STATUTES_VALIDATION_FAILED',
        validation: error.validation,
        missingFields: error?.missingFields,
        completeness: error?.completeness,
      });
    }
    return res.status(500).json({ ok: false, error: 'STATUTES_PREVIEW_FAILED', message: error.message });
  }
});

app.post('/api/statutes/preview-draft/pdf', statutesPreviewDraftLimiter, async (req, res) => {
  let outputPath = null;
  try {
    const { document, statutesData } = buildSimulatorStatutesPreview(req.body || {});
    const safeName = String(statutesData.denomination || 'statuts-greffio')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/gi, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 80) || 'statuts-greffio';
    const filename = `Statuts_${statutesData.legalForm || 'SAS'}_${safeName}.pdf`;
    outputPath = await generateStatutesPdf({ filename: `${safeName}_${Date.now()}.pdf`, document });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store, private');
    const stream = fs.createReadStream(outputPath);
    stream.on('end', () => {
      fs.promises.unlink(outputPath).catch(() => {});
    });
    stream.on('error', () => {
      fs.promises.unlink(outputPath).catch(() => {});
    });
    return stream.pipe(res);
  } catch (error) {
    if (outputPath) fs.promises.unlink(outputPath).catch(() => {});
    if (error?.code === 'LEGAL_FORM_UNSUPPORTED') {
      return res.status(409).json({ ok: false, error: 'LEGAL_FORM_UNSUPPORTED', legalForm: error.legalForm });
    }
    if (error?.code === 'STATUTES_VALIDATION_FAILED') {
      return res.status(422).json({
        ok: false,
        error: 'STATUTES_VALIDATION_FAILED',
        validation: error.validation,
      });
    }
    return res.status(500).json({ ok: false, error: 'STATUTES_PDF_FAILED', message: error.message });
  }
});

app.get('/api/dossiers/:dossierId/statutes/preview', requireAuth, async (req, res) => {
  const access = await resolveDossierAccess(req, req.params.dossierId);
  if (!access.ok) {
    return res.status(access.status).json({ ok: false, error: access.error });
  }
  const { dossier } = access;

  const questionnaire = dossier.dataJson ? JSON.parse(dossier.dataJson) : {};
  const formalityRule = getFormalityRule({ dossier, questionnaire });
  if (!formalityRule.requiresStatutes) {
    return res.status(409).json({ ok: false, error: 'STATUTES_NOT_REQUIRED_FOR_EI' });
  }

  const legalForm = resolveLegalForm({ dossier, questionnaire });
  if (!isStatutesSupportedForm(legalForm)) {
    return res.status(409).json({ ok: false, error: 'LEGAL_FORM_UNSUPPORTED', legalForm });
  }

  const user = dossier.userId ? await getUserById(dossier.userId) : null;
  const statutesData = mapStatutesData({ dossier, questionnaire, user });
  let statutesDocument;
  try {
    statutesDocument = draftStatutesDocument(statutesData);
  } catch (error) {
    if (error?.code === 'STATUTES_INCOMPLETE') {
      return res.status(500).json({ ok: false, error: 'STATUTES_INCOMPLETE', articleCount: error.articleCount });
    }
    if (error?.code === 'STATUTES_VALIDATION_FAILED') {
      return res.status(422).json({
        ok: false,
        error: 'STATUTES_VALIDATION_FAILED',
        validation: error.validation,
        missingFields: statutesData.missingFields,
        completeness: statutesData.completeness,
      });
    }
    throw error;
  }
  const preview = documentToPreview(statutesDocument);

  return res.json({
    ok: true,
    preview: {
      ...preview,
      metadata: { ...preview.metadata, checks: statutesData.checks, completeness: statutesData.completeness, missingFields: statutesData.missingFields },
      incorporatedData: {
        denomination: statutesData.denomination,
        legalForm: statutesData.legalForm,
        objetSocial: statutesData.objetSocial,
        siege: statutesData.seat.full,
        capital: statutesData.capital,
        repartition: statutesData.repartition,
        director: statutesData.director,
        directorRole: statutesData.directorRole,
        beneficiairesEffectifs: statutesData.beneficiairesEffectifs,
        associates: statutesData.associates,
      },
    },
  });
});

app.post('/api/dossiers/:dossierId/statutes/generate', requireAuth, async (req, res) => {
  const access = await resolveDossierAccess(req, req.params.dossierId);
  if (!access.ok) {
    return res.status(access.status).json({ ok: false, error: access.error });
  }
  const { dossier } = access;

  const questionnaire = dossier.dataJson ? JSON.parse(dossier.dataJson) : {};
  const formalityRule = getFormalityRule({ dossier, questionnaire });
  if (!formalityRule.requiresStatutes) {
    return res.status(409).json({ ok: false, error: 'STATUTES_NOT_REQUIRED_FOR_EI' });
  }
  const legalForm = resolveLegalForm({ dossier, questionnaire });
  if (!isStatutesSupportedForm(legalForm)) {
    return res.status(409).json({ ok: false, error: 'LEGAL_FORM_UNSUPPORTED', legalForm });
  }

  const user = dossier.userId ? await getUserById(dossier.userId) : null;
  let buildResult;
  try {
    buildResult = await buildStatutesPdfForDossier({ dossier, questionnaire, user });
  } catch (error) {
    if (error?.code === 'STATUTES_INCOMPLETE') {
      return res.status(500).json({ ok: false, error: 'STATUTES_INCOMPLETE', articleCount: error.articleCount });
    }
    if (error?.code === 'STATUTES_VALIDATION_FAILED') {
      const statutesData = mapStatutesData({ dossier, questionnaire, user });
      return res.status(422).json({
        ok: false,
        error: 'STATUTES_VALIDATION_FAILED',
        validation: error.validation,
        missingFields: statutesData.missingFields,
        completeness: statutesData.completeness,
      });
    }
    if (error?.code === 'LEGAL_FORM_UNSUPPORTED') {
      return res.status(409).json({ ok: false, error: 'LEGAL_FORM_UNSUPPORTED', legalForm });
    }
    throw error;
  }

  const {
    filePath,
    filename,
    contentHash,
    saved,
    statutesDocument,
    legalForm: builtLegalForm,
  } = buildResult;
  const statutesData = mapStatutesData({ dossier, questionnaire, user });
  const docType = `statutes_${builtLegalForm.toLowerCase()}`;
  await syncGeneratedStatutesToDossierChecklist({
    dossierId: dossier.id,
    fileUrl: saved.fileUrl,
    fileSizeBytes: saved.fileSizeBytes,
    filename,
    contentHash,
    legalForm: builtLegalForm,
  });
  await markDossierStatutesGenerated({
    dossierId: dossier.id,
    actorId: req.auth.sub,
    actorRole: req.auth?.role || ROLE.CLIENT,
  });
  const dossierData = questionnaire;
  const recipientEmail = user?.email || dossierData.email || req.auth.email || null;
  if (recipientEmail) {
    await sendDossierEmailById({
      templateId: 'statutes_generated',
      dossierId: dossier.id,
      userId: req.auth.sub,
      toEmail: recipientEmail,
      variables: {
        firstName: dossierData.firstName || user?.firstName || 'Client',
        dossierNumber: dossier.reference || dossier.id,
        companyName: dossier.companyName,
        statutesUrl: `${process.env.APP_URL || 'https://greffio.willentreprises.com'}/statuts?dossierId=${encodeURIComponent(dossier.id)}`,
      },
    });
  }
  const docs = await listGeneratedDocumentsByDossier(dossier.id);
  const statutesDocs = docs.filter((item) => /^statutes_/i.test(String(item.type || '')));
  return res.status(201).json({
    ok: true,
    dossierId: dossier.id,
    document: {
      id: saved.id,
      type: docType,
      filePath,
      fileSizeBytes: saved.fileSizeBytes,
      filename,
      completeness: statutesData.completeness,
      legalForm: builtLegalForm,
      createdAt: saved.createdAt,
    },
    documents: statutesDocs,
  });
});

app.get('/api/dossiers/:dossierId/statutes', requireAuth, async (req, res) => {
  const access = await resolveDossierAccess(req, req.params.dossierId);
  if (!access.ok) {
    return res.status(access.status).json({ ok: false, error: access.error });
  }
  const { dossier } = access;
  const docs = await listGeneratedDocumentsByDossier(dossier.id);
  const statutesDocs = docs.filter((item) => /^statutes_/i.test(String(item.type || '')));
  return res.json({ ok: true, dossierId: dossier.id, documents: statutesDocs });
});

app.get('/api/dossiers/:dossierId/statutes/pdf', requireAuth, async (req, res) => {
  const access = await resolveDossierAccess(req, req.params.dossierId);
  if (!access.ok) {
    return res.status(access.status).json({ ok: false, error: access.error });
  }
  const { dossier } = access;

  const docs = await listGeneratedDocumentsByDossier(dossier.id);
  let latest = docs.find((item) => /^statutes_/i.test(String(item.type || '')));

  let pdfAccess = await resolveStatutesPdfAccess(latest);
  if (pdfAccess.mode === 'missing') {
    const questionnaire = dossier.dataJson ? JSON.parse(dossier.dataJson) : {};
    const formalityRule = getFormalityRule({ dossier, questionnaire });
    if (!formalityRule.requiresStatutes) {
      return res.status(404).json({ ok: false, error: 'STATUTES_PDF_NOT_FOUND' });
    }
    const legalForm = resolveLegalForm({ dossier, questionnaire });
    if (!isStatutesSupportedForm(legalForm)) {
      return res.status(404).json({ ok: false, error: 'STATUTES_PDF_NOT_FOUND' });
    }
    const user = dossier.userId ? await getUserById(dossier.userId) : null;
    try {
      const buildResult = await buildStatutesPdfForDossier({ dossier, questionnaire, user });
      latest = buildResult.saved;
      pdfAccess = await resolveStatutesPdfAccess(latest);
    } catch (_error) {
      return res.status(404).json({ ok: false, error: 'STATUTES_PDF_NOT_FOUND' });
    }
  }

  if (pdfAccess.mode === 'redirect') {
    const remoteResponse = await fetch(pdfAccess.url);
    if (!remoteResponse.ok) {
      return res.status(404).json({ ok: false, error: 'STATUTES_PDF_NOT_FOUND' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfAccess.filename}"`);
    const buffer = Buffer.from(await remoteResponse.arrayBuffer());
    return res.send(buffer);
  }
  if (pdfAccess.mode === 'stream') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfAccess.filename}"`);
    return pdfAccess.stream.pipe(res);
  }
  return res.status(404).json({ ok: false, error: 'STATUTES_PDF_NOT_FOUND' });
});

app.post('/api/payments/create', paymentLimiter, requireAuth, async (req, res) => {
  const { dossierId, offerCode = 'dossier-standard' } = req.body || {};
  if (!dossierId || String(dossierId).trim().length < 3) {
    return res.status(400).json({ ok: false, error: 'DOSSIER_ID_REQUIRED' });
  }
  const dossier = await getDossier(String(dossierId).trim());
  if (!dossier) {
    return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  }
  const isOps = isInternalRole(req.auth?.role);
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
      actorType: 'api',
      actorRole: req.auth?.role || ROLE.CLIENT,
      actorId: req.auth.sub,
      reason: 'payment_initialized',
    });
    if (!moved.ok) {
      return res.status(409).json({ ok: false, error: moved.code });
    }
  }

  const amounts = computePaymentAmounts(offerCode);

  // Garde-fou architecture multi-prestataires : si le frontend précise
  // explicitement un type B2C, on refuse de router vers GoCardless.
  // Le fallback CAWL est géré par POST /api/payments (multi-providers).
  const declaredCustomerType = String(req.body?.customerType || '').toLowerCase();
  if (declaredCustomerType === 'b2c') {
    return res.status(409).json({
      ok: false,
      error: 'GOCARDLESS_FORBIDDEN_FOR_B2C',
      message: 'Les paiements B2C doivent passer par CAWL (POST /api/payments).',
    });
  }

  let created;
  const hasGoCardless = Boolean(process.env.GOCARDLESS_ACCESS_TOKEN || process.env.GOCARDLESS_API_KEY);
  const hasMollieKey = Boolean(process.env.MOLLIE_API_KEY);
  const redirectUrl = `${appUrl}/paiement/verification?dossierId=${dossier.id}`;

  if (hasGoCardless) {
    try {
      created = await createGoCardlessCheckout({
        amountTotalCents: amounts.amountTotalCents,
        currency: amounts.currency,
        metadata: {
          dossier_id: dossier.id,
          offer_code: amounts.normalizedOffer,
          company_name: dossier.companyName,
        },
        redirectUrl,
        exitUrl: `${appUrl}/paiement?offer=${encodeURIComponent(amounts.normalizedOffer)}`,
        description: `Greffio ${amounts.normalizedOffer} ${dossier.companyName}`,
      });
    } catch (error) {
      return res.status(502).json({
        ok: false,
        error: 'GOCARDLESS_PAYMENT_CREATE_FAILED',
        message: error.message,
      });
    }
  } else if (hasMollieKey) {
    try {
      created = await createMolliePayment({
        amountTotalCents: amounts.amountTotalCents,
        currency: amounts.currency,
        metadata: {
          dossierId: dossier.id,
          offerCode: amounts.normalizedOffer,
          companyName: dossier.companyName,
        },
        redirectUrl,
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
  } else if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({
      ok: false,
      error: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
    });
  } else {
    created = {
      providerPaymentId: `gocardless_demo_${Date.now()}`,
      status: 'open',
      checkoutUrl: `${redirectUrl}&mock=gocardless`,
      raw: {
        provider: 'gocardless',
        status: 'open',
        mode: 'mock_fallback',
      },
    };
  }

  const paymentProvider = hasGoCardless ? 'gocardless' : 'mollie';

  const payment = await upsertPayment({
    dossierId: dossier.id,
    userId: req.auth.sub || dossier.userId,
    offerCode: amounts.normalizedOffer,
    amountTotalCents: amounts.amountTotalCents,
    amountServiceCents: amounts.amountServiceCents,
    amountLegalFeesCents: amounts.amountLegalFeesCents,
    currency: amounts.currency,
    status: created.status || 'open',
    provider: paymentProvider,
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

    const resourceHandled = await handleResourceOrderPaymentPaid(payment);
    if (!resourceHandled?.handled && payment.dossierId) {
      await transitionDossierStatus({
        dossierId: payment.dossierId,
        nextStatus: DOSSIER_STATUSES.PAYMENT_CONFIRMED,
        actorType: 'webhook',
        actorRole: ROLE.WEBHOOK,
        reason: 'mollie_paid',
        metadata: { providerPaymentId, paymentConfirmed: true },
      });
    }
  }

  return res.json({ ok: true, paymentStatus: payment.status });
};

app.post('/webhooks/mollie', handleMollieWebhook);
app.post('/api/mollie/webhook', handleMollieWebhook);
app.post('/api/webhooks/mollie', handleMollieWebhook);

const handleGoCardlessWebhook = async (req, res) => {
  const rawBody = req.body;
  const signatureHeader = req.headers['webhook-signature'];
  const secret = process.env.GOCARDLESS_WEBHOOK_SECRET || '';

  const verified = verifyGoCardlessWebhook({
    rawBody,
    signatureHeader,
    secret,
  });
  if (!verified.ok && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ ok: false, error: verified.error || 'GOCARDLESS_WEBHOOK_UNAUTHORIZED' });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (_error) {
    return res.status(400).json({ ok: false, error: 'INVALID_WEBHOOK_PAYLOAD' });
  }

  const events = parseGoCardlessWebhookEvents(payload);
  for (const event of events) {
    const providerPaymentId = event.billingRequestId || event.paymentId;
    if (!providerPaymentId) continue;

    const payment = await getPaymentByProviderId(providerPaymentId)
      || (event.paymentId ? await getPaymentByProviderId(event.paymentId) : null);
    if (!payment) continue;

    let providerState;
    if (payment.provider === 'gocardless' && event.billingRequestId) {
      try {
        providerState = await retrieveGoCardlessBillingRequest({ providerPaymentId: event.billingRequestId });
      } catch (_error) {
        providerState = { status: event.action, providerPaymentId: event.billingRequestId };
      }
    } else {
      providerState = {
        status: ['confirmed', 'paid_out', 'fulfilled'].includes(event.action) ? 'paid' : event.action,
        providerPaymentId,
      };
    }

    const providerEventId = event.id || `${providerPaymentId}:${event.action}`;
    if (await hasPaymentEventProviderId(providerEventId)) {
      continue;
    }

    await addPaymentEvent({
      paymentId: payment.id,
      eventType: `gocardless.${event.resourceType}.${event.action}`,
      providerEventId,
      rawPayload: event.raw,
    });

    if (isGoCardlessPaidStatus(providerState.status) && payment.status !== 'paid') {
      payment.status = 'paid';
      payment.paidAt = providerState.paidAt || new Date().toISOString();
      payment.providerPayload = providerState.raw || event.raw;
      await upsertPayment(payment);

      const resourceHandled = await handleResourceOrderPaymentPaid(payment);
      if (!resourceHandled?.handled && payment.dossierId) {
        await transitionDossierStatus({
          dossierId: payment.dossierId,
          nextStatus: DOSSIER_STATUSES.PAYMENT_CONFIRMED,
          actorType: 'webhook',
          actorRole: ROLE.WEBHOOK,
          reason: 'gocardless_paid',
          metadata: { providerPaymentId, paymentConfirmed: true },
        });
      }
    }
  }

  return res.json({ ok: true, processed: events.length });
};

app.post('/webhooks/gocardless', express.text({ type: '*/*' }), handleGoCardlessWebhook);
app.post('/api/webhooks/gocardless', express.text({ type: '*/*' }), handleGoCardlessWebhook);
app.post('/api/webhooks/didit', express.text({ type: '*/*' }), createDiditWebhookHandler());

app.use('/api/verification', verificationRouter);
app.use('/api/identity', identityRouter);

registerEditableDocumentSignatureRoutes(app, {
  requireAuth,
  getDossier,
  ensureDossierDocuments,
  updateDossierDocument,
  listDossierDocuments,
  DOCUMENT_STATUSES,
  createSignatureRecord,
  appUrl,
});

registerNonConvictionSignatureRoutes(app, {
  requireAuth,
  isInternalRole,
  getDossier,
  ensureDossierDocuments,
  updateDossierDocument,
  listDossierDocuments,
  DOCUMENT_STATUSES,
  createSignatureRecord,
  appUrl,
});

// Webhook CAWL : on accepte le corps brut (texte) pour permettre la
// vérification HMAC à venir. Doit être enregistré AVANT le router générique
// JSON afin de ne pas perdre le payload.
app.post('/api/webhooks/cawl', express.text({ type: '*/*' }), async (req, res, next) => {
  if (typeof req.body === 'string') {
    try {
      req.rawBody = req.body;
      req.body = JSON.parse(req.body || '{}');
    } catch (_error) {
      req.body = {};
    }
  }
  return next();
});

registerPaymentsRoutes(app, {
  requireAuth,
  requireRole,
  getUserById,
  store: {
    upsertPayment,
    getPaymentById,
    getPaymentByProviderId,
    addPaymentEvent,
    hasPaymentEventProviderId,
    getDossier,
    getResourceOrderById,
  },
});

registerAppVersionRoutes(app);

const dossierMessageEvents = {
  notify: () => {},
};

registerDossierMessageRoutes(app, {
  requireAuth,
  requireRole,
  appUrl,
  onMessagesUpdated: (dossierId) => dossierMessageEvents.notify(dossierId),
});

const bootstrap = async () => {
  await initSchema();
  if (process.env.NODE_ENV !== 'production') {
    await ensureSeedDossier();
  }
  const server = http.createServer(app);
  const messageHub = createDossierMessageHub(server);
  dossierMessageEvents.notify = messageHub.notifyDossierMessagesUpdated;
  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[greffio-api] listening on http://localhost:${port} | storage=${objectStorageConfig.driver}`);
  });
};

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[greffio-api] bootstrap failed', error);
  process.exit(1);
});

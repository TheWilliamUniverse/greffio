import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
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
  getAllPayments,
  getDossier,
  getPaymentByProviderId,
  hasPaymentEventProviderId,
  listGeneratedDocumentsByDossier,
  listDossierDocuments,
  listDossierEvents,
  listOpsNotesByDossier,
  transitionDossierStatus,
  updateDossierQuestionnaire,
  updateDossierDocument,
  updateDossierOpsFields,
  upsertGeneratedDocument,
  addOpsNote,
  upsertPayment,
  ensureDossierDocuments,
} from './store.js';
import { computePaymentAmounts } from './pricing.js';
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
import { generateStatutesPdf } from './pdf/statutesPdf.js';
import {
  buildStatutesByLegalForm,
  documentToPreview,
  isStatutesSupportedForm,
} from './legal/statutes/index.js';
import { mapStatutesData, mapStatutesDataFromSimulator } from './utils/statutesDataMapper.js';
import { resolveLegalForm } from './domain/formalities.js';
import { getFormalityRule } from './domain/formalities.js';
import { getCompanyLookupMetrics, lookupCompany } from './services/companyLookup.js';
import { buildIntelligentPrefill } from './services/intelligentIntake.js';
import { computeDossierRisk, sortAntiRejectionQueue } from './services/opsRisk.js';
import { draftStatutesDocument } from './services/statutesDrafting.js';
import {
  createTrustedDevice,
  hasValidTrustedDevice,
} from './mfaTrustedDeviceStore.js';
import { askGreffioAssistant, isAssistantConfigured } from './services/assistant.js';
import {
  createSupabaseSignedDownloadUrl,
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

app.get('/api/ready', async (_req, res) => {
  const checks = {
    storageDriver: objectStorageConfig.driver,
    supabaseConfigured: objectStorageConfig.supabaseConfigured,
    assistantConfigured: isAssistantConfigured(),
    timestamp: new Date().toISOString(),
  };
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
  const { message, history = [] } = req.body || {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({ ok: false, error: 'ASSISTANT_MESSAGE_REQUIRED' });
  }
  try {
    const result = await askGreffioAssistant({
      message: String(message).trim(),
      history: Array.isArray(history) ? history : [],
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
  if (!email || !password || String(password).length < 6) {
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
  const dossiers = await getAllDossiers();
  const isOps = isInternalRole(req.auth?.role);
  const visibleDossiers = isOps
    ? dossiers
    : dossiers.filter((dossier) => dossier.userId && dossier.userId === req.auth?.sub);

  return res.json({
    ok: true,
    dossiers: visibleDossiers,
  });
});

app.get('/api/dossiers/:dossierId', requireAuth, async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) {
    return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  }
  const isOps = isInternalRole(req.auth?.role);
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
  const owner = await getUserById(req.auth.sub);
  if (owner?.email) {
    void sendTransactionalEmail({
      to: { email: owner.email, name: `${owner.firstName || ''} ${owner.lastName || ''}`.trim() },
      templateKey: 'dossier_created',
      variables: {
        firstName: owner.firstName || 'Client',
        dossierNumber: dossier.reference || dossier.id,
        formalityType: dossier.service || service,
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
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const isOps = isInternalRole(req.auth?.role);
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
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const isOps = isInternalRole(req.auth?.role);
  const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
  if (!isOps && !isOwner) return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });

  const { dataPatch = {}, progressPercent = null } = req.body || {};
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
});

app.post('/api/dossiers/:dossierId/complete-step', requireAuth, async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
  if (!isOwner) return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });

  const { stepId, dataPatch = {}, progressPercent = null } = req.body || {};
  if (stepId === 'validation') {
    const docsBefore = await listDossierDocuments(dossier.id);
    const riskBefore = computeDossierRisk({ dossier, documents: docsBefore });
    if (riskBefore.identityVerificationBlocked) {
      return res.status(409).json({
        ok: false,
        error: 'IDENTITY_VERIFICATION_REQUIRED',
        risk: riskBefore,
      });
    }
  }
  const updated = await updateDossierQuestionnaire({
    dossierId: dossier.id,
    dataPatch,
    progressPercent,
  });

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
  const risk = computeDossierRisk({ dossier, documents });
  return res.json({
    ok: true,
    dossier,
    documents,
    events: await listDossierEvents(dossier.id),
    notes: await listOpsNotesByDossier(dossier.id),
    risk,
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
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
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
  const dossierUploadDir = path.join(uploadsRoot, String(dossier.id));
  if (!fs.existsSync(dossierUploadDir)) {
    fs.mkdirSync(dossierUploadDir, { recursive: true });
  }
  const desiredPath = path.join(dossierUploadDir, targetFilename);
  const finalPath = ensureUniqueFilePath(desiredPath);
  fs.renameSync(req.file.path, finalPath);
  const sha256 = createHash('sha256').update(fs.readFileSync(finalPath)).digest('hex');
  let storageUrl = finalPath;
  let fileUrl = finalPath;
  let storageProvider = 'local';
  let storageUploadWarning = null;
  try {
    const uploadResult = await uploadDocumentToConfiguredStorage({
      dossierId: dossier.id,
      filename: path.basename(finalPath),
      localFilePath: finalPath,
    });
    if (uploadResult.uploaded) {
      storageUrl = uploadResult.storageUrl;
      fileUrl = uploadResult.storageUrl;
      storageProvider = 'supabase';
    }
  } catch (storageError) {
    storageProvider = 'local_fallback';
    console.error('DOCUMENT_STORAGE_UPLOAD_FAILED', storageError);
    enqueueStorageRetry({
      dossierId: dossier.id,
      docKey,
      localFilePath: finalPath,
      filename: path.basename(finalPath),
      reason: 'supabase_upload_failed',
    });
    const alert = registerStorageFailureForOps({
      dossierId: dossier.id,
      docKey,
      reason: 'supabase_upload_failed',
    });
    if (alert.shouldAlert) {
      console.error('OPS_STORAGE_ALERT', {
        message: 'Repeated storage failures in 5 minute window',
        ...alert,
      });
    }
    storageUploadWarning = 'Stockage cloud temporairement indisponible, votre document est conserve et sera repris automatiquement.';
  }
  const analysis = await analyzeDocument({
    filePath: finalPath,
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
    filename: path.basename(finalPath),
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
  await sendDossierEmailById({
    templateId: 'documents_received',
    dossierId: dossier.id,
    userId: req.auth.sub,
    toEmail: recipientEmail,
    variables: {
      prenom: firstNameForEmail,
      reference_dossier: dossier.reference || dossier.id,
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
        reference_dossier: dossier.reference || dossier.id,
        motif_complement: "La qualité ou lisibilité du document nécessite une vérification manuelle de l'équipe Greffio.",
      },
    });
  }

  return res.status(201).json({
    ok: true,
    file: {
      originalFilename: req.file.originalname,
      recommendedFilename: path.basename(finalPath),
      mimeType: req.file.mimetype,
      size: req.file.size,
      sha256,
    },
    analysis,
    warning: storageUploadWarning,
    documents: await listDossierDocuments(dossier.id),
  });
});

app.get('/api/dossiers/:dossierId/documents/:docKey/download', requireAuth, async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
  const isOps = isInternalRole(req.auth?.role);
  if (!isOwner && !isOps) return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });

  const documents = await listDossierDocuments(dossier.id);
  const requested = documents.find((item) => item.docKey === req.params.docKey);
  if (!requested || !requested.storageUrl) {
    return res.status(404).json({ ok: false, error: 'DOCUMENT_FILE_NOT_FOUND' });
  }
  if (String(requested.storageUrl).startsWith('supabase://')) {
    const signedUrl = await createSupabaseSignedDownloadUrl(requested.storageUrl, 120);
    if (!signedUrl) {
      return res.status(404).json({ ok: false, error: 'DOCUMENT_FILE_NOT_FOUND' });
    }
    return res.redirect(signedUrl);
  }
  if (!isSafeUploadPath(requested.storageUrl) || !fs.existsSync(requested.storageUrl)) {
    return res.status(404).json({ ok: false, error: 'DOCUMENT_FILE_NOT_FOUND' });
  }

  const downloadName = requested.filename || `${requested.docKey}.pdf`;
  res.setHeader('Content-Type', requested.mimeType || 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
  return fs.createReadStream(requested.storageUrl).pipe(res);
});

app.get('/api/dossiers/:dossierId/documents/:docKey/editor', requireAuth, async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
  const isOps = isInternalRole(req.auth?.role);
  if (!isOwner && !isOps) return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });
  const docKey = String(req.params.docKey || '');
  const supported = new Set(['manager_non_conviction']);
  if (!supported.has(docKey)) {
    return res.status(409).json({ ok: false, error: 'DOCUMENT_EDITOR_NOT_SUPPORTED' });
  }
  const questionnaire = dossier.dataJson ? JSON.parse(dossier.dataJson) : {};
  const initialFields = {
    declarantFullName: `${questionnaire.firstName || ''} ${questionnaire.lastName || ''}`.trim(),
    declarantBirthDate: questionnaire.birthDate || '',
    declarantBirthCity: questionnaire.birthCity || '',
    declarantAddress: questionnaire.address || questionnaire.homeAddress || '',
    parent1FullName: questionnaire.parent1FullName || '',
    parent2FullName: questionnaire.parent2FullName || '',
    statementDate: new Date().toISOString().slice(0, 10),
    statementCity: questionnaire.city || '',
    declarationNonCondamnation: false,
    declarationFiliation: false,
    useCase: 'self',
    useCaseSelf: true,
    useCaseParents: false,
    signatureFullName: `${questionnaire.firstName || ''} ${questionnaire.lastName || ''}`.trim(),
  };
  return res.json({
    ok: true,
    docKey,
    schemaVersion: 'manager_non_conviction_v1',
    title: 'Déclaration de non-condamnation et de filiation',
    fields: initialFields,
  });
});

app.post('/api/dossiers/:dossierId/documents/:docKey/editor', requireAuth, async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
  const isOps = isInternalRole(req.auth?.role);
  if (!isOwner && !isOps) return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });
  const docKey = String(req.params.docKey || '');
  if (docKey !== 'manager_non_conviction') {
    return res.status(409).json({ ok: false, error: 'DOCUMENT_EDITOR_NOT_SUPPORTED' });
  }

  const fields = req.body?.fields || {};
  const validation = validateNonConvictionFields(fields);
  if (!validation.ok) {
    return res.status(400).json({ ok: false, error: validation.error });
  }

  try {
    await ensureDossierDocuments(dossier.id);
    const safeReference = String(dossier.reference || dossier.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Declaration_non_condamnation_filiation_${safeReference}_${Date.now()}.pdf`;
    const pdfPath = await generateNonConvictionPdf({ filename, fields });
    const sha256 = createHash('sha256').update(fs.readFileSync(pdfPath)).digest('hex');
    const updated = await updateDossierDocument({
      dossierId: dossier.id,
      docKey,
      status: DOCUMENT_STATUSES.UPLOADED,
      filename,
      fileSizeBytes: fs.statSync(pdfPath).size,
      mimeType: 'application/pdf',
      storageUrl: pdfPath,
      sha256,
      reviewerId: null,
      metadata: {
        editorSchemaVersion: 'manager_non_conviction_v2',
        generatedFromEditor: true,
        fields,
        generatedAt: new Date().toISOString(),
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
  const { data = {}, answers = {} } = req.body || {};
  const legalForm = String(
    answers.formeJuridique || data.legalForm || data.formeJuridique || 'SASU',
  ).toUpperCase();

  if (!isStatutesSupportedForm(legalForm)) {
    return res.status(409).json({ ok: false, error: 'LEGAL_FORM_UNSUPPORTED', legalForm });
  }

  try {
    const statutesData = mapStatutesDataFromSimulator({ data, answers });
    const document = draftStatutesDocument(statutesData);
    const preview = documentToPreview(document);

    return res.json({
      ok: true,
      preview: {
        ...preview,
        metadata: {
          ...preview.metadata,
          checks: statutesData.checks,
          completeness: statutesData.completeness,
          missingFields: statutesData.missingFields,
        },
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
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'STATUTES_PREVIEW_FAILED', message: error.message });
  }
});

app.get('/api/dossiers/:dossierId/statutes/preview', requireAuth, async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
  const isOps = isInternalRole(req.auth?.role);
  if (!isOwner && !isOps) return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });

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
  const document = draftStatutesDocument(statutesData);
  const preview = documentToPreview(document);

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
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
  const isOps = isInternalRole(req.auth?.role);
  if (!isOwner && !isOps) return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });

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
    throw error;
  }

  const safeReference = String(dossier.reference || dossier.id).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Statuts_${legalForm}_${safeReference}_${Date.now()}.pdf`;
  const filePath = await generateStatutesPdf({
    filename,
    document: statutesDocument,
  });
  const fileSizeBytes = fs.statSync(filePath).size;
  const contentHash = createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  const docType = `statutes_${legalForm.toLowerCase()}`;
  await upsertGeneratedDocument({
    dossierId: dossier.id,
    type: docType,
    status: 'generated',
    version: 1,
    fileUrl: filePath,
    fileSizeBytes,
    contentHash,
    metadata: {
      completeness: statutesData.completeness,
      missingFields: statutesData.missingFields,
      generatedBy: 'greffio_william_template',
      template: statutesDocument.metadata?.template,
    },
  });
  return res.status(201).json({
    ok: true,
    document: {
      type: docType,
      filePath,
      fileSizeBytes,
      filename,
      completeness: statutesData.completeness,
      legalForm,
    },
  });
});

app.get('/api/dossiers/:dossierId/statutes', requireAuth, async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
  const isOps = isInternalRole(req.auth?.role);
  if (!isOwner && !isOps) return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });
  const docs = await listGeneratedDocumentsByDossier(dossier.id);
  const statutesDocs = docs.filter((item) => /^statutes_/i.test(String(item.type || '')));
  return res.json({ ok: true, documents: statutesDocs });
});

app.get('/api/dossiers/:dossierId/statutes/pdf', requireAuth, async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
  const isOps = isInternalRole(req.auth?.role);
  if (!isOwner && !isOps) return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });

  const docs = await listGeneratedDocumentsByDossier(dossier.id);
  const latest = docs.find((item) => /^statutes_/i.test(String(item.type || '')));
  if (!latest?.fileUrl || !fs.existsSync(latest.fileUrl)) {
    return res.status(404).json({ ok: false, error: 'STATUTES_PDF_NOT_FOUND' });
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${path.basename(latest.fileUrl)}"`);
  return fs.createReadStream(latest.fileUrl).pipe(res);
});

app.post('/api/payments/create', paymentLimiter, requireAuth, async (req, res) => {
  const { dossierId = 'dos_seed_001', offerCode = 'dossier-standard' } = req.body || {};
  const dossier = await getDossier(dossierId);
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

    await transitionDossierStatus({
      dossierId: payment.dossierId,
      nextStatus: DOSSIER_STATUSES.PAYMENT_CONFIRMED,
      actorType: 'webhook',
      actorRole: ROLE.WEBHOOK,
      reason: 'mollie_paid',
      metadata: { providerPaymentId, paymentConfirmed: true },
    });
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

  return res.json({ ok: true, processed: events.length });
};

app.post('/webhooks/gocardless', express.text({ type: '*/*' }), handleGoCardlessWebhook);
app.post('/api/webhooks/gocardless', express.text({ type: '*/*' }), handleGoCardlessWebhook);

const bootstrap = async () => {
  await initSchema();
  if (process.env.NODE_ENV !== 'production') {
    await ensureSeedDossier();
  }
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[greffio-api] listening on http://localhost:${port} | storage=${objectStorageConfig.driver}`);
  });
};

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[greffio-api] bootstrap failed', error);
  process.exit(1);
});

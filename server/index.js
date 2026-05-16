import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { initSchema } from './dbClient.js';
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
} from './store.js';
import { computePaymentAmounts } from './pricing.js';
import { createMolliePayment, isMolliePaidStatus, retrieveMolliePayment } from './mollie.js';
import { issueAccessToken, issueRefreshToken, verifyToken } from './tokens.js';
import { buildCanonicalDocumentFilename } from './documentNaming.js';
import { ROLE } from './stateMachine.js';
import { sendDossierEmailById } from './emails/index.js';
import { uploadPdfOnly } from './uploads.js';
import { analyzeDocument } from './documentAnalysis.js';
import { createSignatureRecord, getLatestSignatureByDossier } from './signatureStore.js';
import { buildMandateText } from './mandateTemplate.js';
import { generateMandatePdf } from './pdf/mandatePdf.js';
import { generateStatutesPdf } from './pdf/statutesPdf.js';
import { buildSasuStatutesSections } from './legal/statutes/sasuTemplate.js';
import { buildSasStatutesSections } from './legal/statutes/sasTemplate.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);

app.use(cors());
app.use(express.json());

const appUrl = process.env.APP_URL || 'https://greffio.willentreprises.com';
const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8787';
const mollieWebhookUrl = process.env.MOLLIE_WEBHOOK_URL || `${apiBaseUrl}/webhooks/mollie`;
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
  const normalizedRoot = path.resolve(uploadsRoot);
  const normalizedCandidate = path.resolve(filePath);
  return normalizedCandidate.startsWith(normalizedRoot);
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'greffio-api', timestamp: new Date().toISOString() });
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
        status: process.env.MOLLIE_API_KEY ? 'healthy' : 'warning',
        detail: process.env.MOLLIE_API_KEY
          ? 'Mollie actif avec webhook /api/webhooks/mollie'
          : 'Mollie key absente: mode simulation actif',
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

app.get('/api/company-search', requireAuth, async (req, res) => {
  const rawSiren = String(req.query?.siren || '').trim();
  if (!/^\d{9}$/.test(rawSiren)) {
    return res.status(400).json({ ok: false, error: 'INVALID_SIREN' });
  }
  try {
    const response = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(rawSiren)}&per_page=1`);
    if (!response.ok) {
      return res.status(502).json({ ok: false, error: 'ANNNUAIRE_UNAVAILABLE' });
    }
    const payload = await response.json();
    const first = payload?.results?.[0];
    if (!first) {
      return res.status(404).json({ ok: false, error: 'COMPANY_NOT_FOUND' });
    }
    return res.json({
      ok: true,
      company: {
        siren: first.siren || rawSiren,
        denomination: first.nom_complet || first.nom_raison_sociale || '',
        legalForm: first.nature_juridique || '',
        city: first.siege?.libelle_commune || '',
        country: 'France',
      },
    });
  } catch (_error) {
    return res.status(502).json({ ok: false, error: 'ANNUAIRE_LOOKUP_FAILED' });
  }
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
  const isOps = ['ADMIN', 'OPS', 'FORMALISTE'].includes(req.auth?.role);
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
  const isOps = ['ADMIN', 'OPS', 'FORMALISTE'].includes(req.auth?.role);
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
  return res.json({
    ok: true,
    dossier,
    documents: await listDossierDocuments(dossier.id),
    events: await listDossierEvents(dossier.id),
    notes: await listOpsNotesByDossier(dossier.id),
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

app.post('/api/dossiers/:dossierId/documents', requireAuth, uploadPdfOnly.single('file'), async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
  const isOps = ['ADMIN', 'OPS', 'FORMALISTE'].includes(req.auth?.role);
  if (!isOwner && !isOps) return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });
  const {
    docKey,
    ownerFirstName,
    ownerLastName,
  } = req.body || {};
  if (!docKey) return res.status(400).json({ ok: false, error: 'DOC_KEY_REQUIRED' });
  if (!req.file) return res.status(400).json({ ok: false, error: 'FILE_REQUIRED' });

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
    fileUrl: finalPath,
    filename: path.basename(finalPath),
    fileSizeBytes: req.file.size,
    mimeType: req.file.mimetype,
    storageUrl: finalPath,
    reviewerId: null,
    metadata: {
      analysis,
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
    },
    analysis,
    documents: await listDossierDocuments(dossier.id),
  });
});

app.get('/api/dossiers/:dossierId/documents/:docKey/download', requireAuth, async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
  const isOps = ['ADMIN', 'OPS', 'FORMALISTE'].includes(req.auth?.role);
  if (!isOwner && !isOps) return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });

  const documents = await listDossierDocuments(dossier.id);
  const requested = documents.find((item) => item.docKey === req.params.docKey);
  if (!requested || !requested.storageUrl) {
    return res.status(404).json({ ok: false, error: 'DOCUMENT_FILE_NOT_FOUND' });
  }
  if (!isSafeUploadPath(requested.storageUrl) || !fs.existsSync(requested.storageUrl)) {
    return res.status(404).json({ ok: false, error: 'DOCUMENT_FILE_NOT_FOUND' });
  }

  const downloadName = requested.filename || `${requested.docKey}.pdf`;
  res.setHeader('Content-Type', requested.mimeType || 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
  return fs.createReadStream(requested.storageUrl).pipe(res);
});

app.get('/api/dossiers/:dossierId/mandate', requireAuth, async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
  const isOps = ['ADMIN', 'OPS', 'FORMALISTE'].includes(req.auth?.role);
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
  const isOps = ['ADMIN', 'OPS', 'FORMALISTE'].includes(req.auth?.role);
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

app.post('/api/dossiers/:dossierId/statutes/generate', requireAuth, async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
  const isOps = ['ADMIN', 'OPS', 'FORMALISTE'].includes(req.auth?.role);
  if (!isOwner && !isOps) return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });

  const data = dossier.dataJson ? JSON.parse(dossier.dataJson) : {};
  const legalForm = String(data.formeJuridique || dossier.legalForm || 'SASU').toUpperCase();
  if (!['SASU', 'SAS'].includes(legalForm)) {
    return res.status(409).json({ ok: false, error: 'LEGAL_FORM_UNSUPPORTED', legalForm });
  }
  const statutesData = {
    denomination: data.denomination || dossier.companyName || 'Greffio Société',
    objetSocial: data.activite || "La société exerce toute activité autorisée compatible avec son objet.",
    siege: data.adresseSiege || 'Siège à compléter',
    duree: '99 ans',
    capital: Number(data.capital || 1000),
    president: data.dirigeant || 'Président à compléter',
    exerciceDebut: '1er janvier',
    exerciceFin: '31 décembre',
  };
  const clauses = legalForm === 'SAS' ? buildSasStatutesSections(statutesData) : buildSasuStatutesSections(statutesData);
  const safeReference = String(dossier.reference || dossier.id).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Statuts_${legalForm}_${safeReference}_${Date.now()}.pdf`;
  const filePath = await generateStatutesPdf({
    filename,
    company: statutesData.denomination,
    legalForm,
    reference: dossier.reference || dossier.id,
    clauses,
  });
  const fileSizeBytes = fs.statSync(filePath).size;
  const contentHash = createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  await upsertGeneratedDocument({
    dossierId: dossier.id,
    type: legalForm === 'SAS' ? 'statutes_sas' : 'statutes_sasu',
    status: 'generated',
    version: 1,
    fileUrl: filePath,
    fileSizeBytes,
    contentHash,
    metadata: {
      pagesTarget: 10,
      generatedBy: 'greffio',
    },
  });
  return res.status(201).json({
    ok: true,
    document: {
      type: legalForm === 'SAS' ? 'statutes_sas' : 'statutes_sasu',
      filePath,
      fileSizeBytes,
      filename,
    },
  });
});

app.get('/api/dossiers/:dossierId/statutes', requireAuth, async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
  const isOps = ['ADMIN', 'OPS', 'FORMALISTE'].includes(req.auth?.role);
  if (!isOwner && !isOps) return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });
  const docs = await listGeneratedDocumentsByDossier(dossier.id);
  const statutesDocs = docs.filter((item) => item.type === 'statutes_sas' || item.type === 'statutes_sasu');
  return res.json({ ok: true, documents: statutesDocs });
});

app.get('/api/dossiers/:dossierId/statutes/pdf', requireAuth, async (req, res) => {
  const dossier = await getDossier(req.params.dossierId);
  if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
  const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
  const isOps = ['ADMIN', 'OPS', 'FORMALISTE'].includes(req.auth?.role);
  if (!isOwner && !isOps) return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });

  const docs = await listGeneratedDocumentsByDossier(dossier.id);
  const latest = docs.find((item) => item.type === 'statutes_sasu' || item.type === 'statutes_sas');
  if (!latest?.fileUrl || !fs.existsSync(latest.fileUrl)) {
    return res.status(404).json({ ok: false, error: 'STATUTES_PDF_NOT_FOUND' });
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${path.basename(latest.fileUrl)}"`);
  return fs.createReadStream(latest.fileUrl).pipe(res);
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
      actorRole: ROLE.SYSTEM,
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

const bootstrap = async () => {
  await initSchema();
  if (process.env.NODE_ENV !== 'production') {
    await ensureSeedDossier();
  }
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

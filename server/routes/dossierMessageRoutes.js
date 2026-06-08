import { getUserById } from '../authStore.js';
import { sendDossierEmail } from '../emails/index.js';
import { addDossierMessage,
  getDossier,
  listDossierMessagesByDossier,
  markDossierMessageEmailSent,
} from '../store.js';
import { resolveDossierAccess } from '../utils/dossierAccess.js';
import { isInternalRole } from '../authMiddleware.js';

const resolveAuthorName = async (req, authorType) => {
  if (authorType === 'ops') {
    const user = await getUserById(req.auth?.sub);
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    return name || 'Équipe Greffio';
  }
  if (authorType === 'client') {
    const user = await getUserById(req.auth?.sub);
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    return name || 'Client';
  }
  return 'Greffio';
};

export const registerDossierMessageRoutes = (app, { requireAuth, requireRole, appUrl, onMessagesUpdated }) => {
  app.get('/api/dossiers/:dossierId/messages', requireAuth, async (req, res) => {
    const access = await resolveDossierAccess(req, req.params.dossierId);
    if (!access.ok) {
      return res.status(access.status).json({ ok: false, error: access.error });
    }
    const messages = await listDossierMessagesByDossier(access.dossier.id);
    return res.json({ ok: true, messages });
  });

  app.post('/api/dossiers/:dossierId/messages', requireAuth, async (req, res) => {
    const access = await resolveDossierAccess(req, req.params.dossierId);
    if (!access.ok) {
      return res.status(access.status).json({ ok: false, error: access.error });
    }
    const body = String(req.body?.body || req.body?.message || '').trim();
    if (!body) {
      return res.status(400).json({ ok: false, error: 'MESSAGE_BODY_REQUIRED' });
    }
    const isOwner = access.dossier.userId && access.dossier.userId === req.auth?.sub;
    const authorType = isOwner ? 'client' : (isInternalRole(req.auth?.role) ? 'ops' : 'client');
    const authorName = await resolveAuthorName(req, authorType);
    const message = await addDossierMessage({
      dossierId: access.dossier.id,
      authorType,
      authorId: req.auth.sub,
      authorName,
      body,
      channel: 'thread',
    });
    if (!message) {
      return res.status(400).json({ ok: false, error: 'MESSAGE_BODY_REQUIRED' });
    }
    const messages = await listDossierMessagesByDossier(access.dossier.id);
    onMessagesUpdated?.(access.dossier.id, messages);
    return res.status(201).json({
      ok: true,
      message,
      messages,
    });
  });

  app.get('/api/ops/dossiers/:dossierId/messages', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (req, res) => {
    const dossier = await getDossier(req.params.dossierId);
    if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
    const messages = await listDossierMessagesByDossier(dossier.id);
    return res.json({ ok: true, messages });
  });

  app.post('/api/ops/dossiers/:dossierId/messages', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (req, res) => {
    const dossier = await getDossier(req.params.dossierId);
    if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
    const body = String(req.body?.body || req.body?.message || '').trim();
    if (!body) {
      return res.status(400).json({ ok: false, error: 'MESSAGE_BODY_REQUIRED' });
    }
    const authorName = await resolveAuthorName(req, 'ops');
    const message = await addDossierMessage({
      dossierId: dossier.id,
      authorType: 'ops',
      authorId: req.auth.sub,
      authorName,
      body,
      channel: 'thread',
    });
    const messages = await listDossierMessagesByDossier(dossier.id);
    onMessagesUpdated?.(dossier.id, messages);
    return res.status(201).json({
      ok: true,
      message,
      messages,
    });
  });

  app.post('/api/ops/dossiers/:dossierId/messages/send-email', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (req, res) => {
    const dossier = await getDossier(req.params.dossierId);
    if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });

    const body = String(req.body?.body || req.body?.message || '').trim();
    const subject = String(req.body?.subject || 'Message de l’équipe Greffio').trim();
    const toEmail = String(req.body?.toEmail || '').trim().toLowerCase();
    if (!body) {
      return res.status(400).json({ ok: false, error: 'MESSAGE_BODY_REQUIRED' });
    }
    if (!toEmail) {
      return res.status(400).json({ ok: false, error: 'RECIPIENT_EMAIL_REQUIRED' });
    }

    const authorName = await resolveAuthorName(req, 'ops');
    const message = await addDossierMessage({
      dossierId: dossier.id,
      authorType: 'ops',
      authorId: req.auth.sub,
      authorName,
      body,
      channel: 'email',
    });

    const owner = dossier.userId ? await getUserById(dossier.userId) : null;
    const emailResult = await sendDossierEmail({
      templateId: 'ops_message',
      dossier,
      userId: owner?.id || null,
      toEmail,
      variables: {
        subject,
        messageBody: body,
        opsAuthor: authorName,
        firstName: owner?.firstName || 'Client',
        continueUrl: `${appUrl}/dossier/${dossier.id}?tab=messages`,
        forceEmail: Boolean(req.body?.force),
      },
    });

    if (message?.id && emailResult?.ok !== false && !emailResult?.skipped) {
      await markDossierMessageEmailSent(message.id);
    }

    const messages = await listDossierMessagesByDossier(dossier.id);
    onMessagesUpdated?.(dossier.id, messages);
    return res.status(201).json({
      ok: true,
      message,
      email: emailResult,
      messages,
    });
  });
};

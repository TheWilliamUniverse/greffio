import { getUserById } from '../authStore.js';
import { hasRecentSuccessfulEmail } from './dossierEmailPolicy.js';

const REMINDER_TEMPLATES = new Set(['dossier_incomplete', 'dossier_resume_reminder', 'inactive_reminder']);
const DIGEST_TEMPLATE = 'weekly_digest';

const parseProfileNotifications = (user) => {
  try {
    const raw = user?.profileJson ? JSON.parse(user.profileJson) : {};
    return raw?.preferences?.notifications || {};
  } catch (_error) {
    return {};
  }
};

export const resolveUserEmailPreferences = (user) => {
  const notifications = parseProfileNotifications(user);
  return {
    emailEnabled: notifications.email !== false,
    dossierUpdates: notifications.dossierUpdates !== false,
    emailReminders: notifications.emailReminders !== false,
    emailDigest: notifications.emailDigest || 'immediate',
    marketing: notifications.marketing === true,
  };
};

export const resolveMinReminderDays = () => {
  const parsed = Number.parseInt(String(process.env.DOSSIER_REMINDER_MIN_DAYS ?? ''), 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 2;
};

export const shouldSendReminderForUser = async ({
  userId,
  templateId,
  dossierId = null,
  recipientEmail,
  daysSinceAction = 0,
  minDays = resolveMinReminderDays(),
}) => {
  if (!REMINDER_TEMPLATES.has(templateId) && templateId !== DIGEST_TEMPLATE) {
    return { ok: true };
  }

  const user = userId ? await getUserById(userId) : null;
  const prefs = resolveUserEmailPreferences(user);

  if (!prefs.emailEnabled || !prefs.dossierUpdates) {
    return { ok: false, reason: 'EMAIL_DISABLED' };
  }

  if (templateId !== DIGEST_TEMPLATE && prefs.emailReminders === false) {
    return { ok: false, reason: 'REMINDERS_DISABLED' };
  }

  if (prefs.emailDigest === 'weekly' && templateId !== DIGEST_TEMPLATE) {
    return { ok: false, reason: 'WEEKLY_DIGEST_MODE' };
  }

  if (templateId !== DIGEST_TEMPLATE && daysSinceAction < minDays) {
    return { ok: false, reason: 'ACTION_TOO_RECENT' };
  }

  const duplicate = await hasRecentSuccessfulEmail({
    templateId,
    dossierId,
    recipientEmail,
    withinHours: templateId === DIGEST_TEMPLATE ? 168 : 72,
  });
  if (duplicate) {
    return { ok: false, reason: 'EMAIL_RECENTLY_SENT' };
  }

  return { ok: true };
};

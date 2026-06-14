import dotenv from 'dotenv';
import { getAllDossiers } from '../store.js';
import { getUserById } from '../authStore.js';
import { sendDossierEmail } from '../emails/index.js';
import { resolveUserEmailPreferences } from '../emails/dossierReminderPolicy.js';
import { resolveFormalityPublicLabel } from '../domain/formalityLabels.js';
import { isEmailFeatureEnabled } from '../config/emailFeatureFlags.js';
import { hasRecentSuccessfulEmail } from '../emails/dossierEmailPolicy.js';

dotenv.config({ quiet: true });

const APP_URL = process.env.APP_URL || 'https://greffio.willentreprises.com';
const REMINDER_MILESTONE_DAYS = [7, 14];
const SATISFACTION_INTERVAL_DAYS = Number.parseInt(
  String(process.env.EMAIL_SATISFACTION_INTERVAL_DAYS || '9'),
  10,
) || 9;

const QUESTIONNAIRE_PHASE_STATUSES = new Set([
  'draft',
  'contact_started',
  'contact_completed',
  'legal_form_selected',
  'questionnaire_in_progress',
]);

const REMINDER_STATUSES = new Set([
  ...QUESTIONNAIRE_PHASE_STATUSES,
  'documents_requested',
  'documents_missing_or_invalid',
  'mandate_required',
  'mandate_pending_signature',
  'statutes_generated',
  'client_validation_required',
  'payment_pending',
]);

const SATISFACTION_END_STATUSES = new Set([
  'completed',
  'official_documents_available',
  'accepted',
]);

const daysSince = (iso) => {
  const timestamp = new Date(iso || 0).getTime();
  if (Number.isNaN(timestamp)) return 999;
  return Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000));
};

const buildContinueUrl = (dossier) => {
  const id = encodeURIComponent(dossier.id);
  const status = String(dossier.status || '').toLowerCase();
  const progress = Number(dossier.progressPercent || 0);

  if (['draft', 'contact_started', 'contact_completed', 'legal_form_selected', 'questionnaire_in_progress'].includes(status)) {
    return `${APP_URL}/questionnaire?dossierId=${id}`;
  }
  if (['questionnaire_completed', 'payment_pending', 'payment_confirmed', 'dossier_preparation'].includes(status)) {
    return progress < 40 ? `${APP_URL}/questionnaire?dossierId=${id}` : `${APP_URL}/tarifs`;
  }
  if (['documents_requested', 'documents_missing_or_invalid', 'documents_uploaded', 'documents_under_review', 'mandate_required', 'mandate_pending_signature'].includes(status)) {
    return `${APP_URL}/documents?dossierId=${id}`;
  }
  if (['statutes_generated', 'statutes_under_review', 'client_validation_required'].includes(status)) {
    return `${APP_URL}/statuts?dossierId=${id}`;
  }
  return `${APP_URL}/dossier/${id}?tab=progress`;
};

const summarizeDossier = (dossier) => {
  const label = dossier.companyName || dossier.denomination || dossier.reference || dossier.id;
  return `• ${label} (${dossier.reference || dossier.id}) - ${String(dossier.status || 'draft').replace(/_/g, ' ')}`;
};

const isQuestionnaireValidated = (dossier) => {
  const status = String(dossier.status || '').toLowerCase();
  if (status === 'questionnaire_completed') return true;
  try {
    const data = dossier.dataJson ? JSON.parse(dossier.dataJson) : {};
    return data.validationConfirmed === true;
  } catch (_error) {
    return false;
  }
};

const resolveReminderMilestone = (days) => {
  if (days === 14) return 14;
  if (days === 7) return 7;
  return null;
};

const runReminders = async () => {
  if (!isEmailFeatureEnabled('dossierReminders')) {
    return { sent: 0, skipped: 0, mode: 'reminders', disabled: true };
  }
  const dossiers = await getAllDossiers();
  let sent = 0;
  let skipped = 0;

  for (const dossier of dossiers) {
    if (!dossier.userId) {
      skipped += 1;
      continue;
    }
    const status = String(dossier.status || '').toLowerCase();
    if (!REMINDER_STATUSES.has(status)) {
      skipped += 1;
      continue;
    }
    if (QUESTIONNAIRE_PHASE_STATUSES.has(status) && isQuestionnaireValidated(dossier)) {
      skipped += 1;
      continue;
    }

    const days = daysSince(dossier.updatedAt);
    const milestone = resolveReminderMilestone(days);
    if (!milestone) {
      skipped += 1;
      continue;
    }

    const user = await getUserById(dossier.userId);
    if (!user?.email) {
      skipped += 1;
      continue;
    }

    const duplicate = await hasRecentSuccessfulEmail({
      templateId: 'dossier_resume_reminder',
      dossierId: dossier.id,
      recipientEmail: user.email,
      withinHours: milestone === 14 ? 168 : 72,
    });
    if (duplicate) {
      skipped += 1;
      continue;
    }

    const result = await sendDossierEmail({
      templateId: 'dossier_resume_reminder',
      dossier,
      userId: dossier.userId,
      toEmail: user.email,
      daysSinceAction: milestone,
      variables: {
        firstName: user.firstName || 'Client',
        formalityType: resolveFormalityPublicLabel({
          service: dossier.service,
          typeFormalite: dossier.typeFormalite,
          formeJuridique: dossier.formeJuridique || dossier.legalForm,
          legalForm: dossier.legalForm,
        }),
        continueUrl: buildContinueUrl(dossier),
        reminderMilestoneDays: String(milestone),
      },
    });

    if (result.skipped) skipped += 1;
    else if (result.ok) sent += 1;
    else skipped += 1;
  }

  return { sent, skipped, mode: 'reminders' };
};

const runWeeklyDigest = async () => {
  if (!isEmailFeatureEnabled('weeklyDigest')) {
    return { sent: 0, skipped: 0, mode: 'weekly_digest', disabled: true };
  }
  const dossiers = await getAllDossiers();
  const byUser = new Map();

  for (const dossier of dossiers) {
    if (!dossier.userId) continue;
    const status = String(dossier.status || '').toLowerCase();
    if (!REMINDER_STATUSES.has(status)) continue;
    const bucket = byUser.get(dossier.userId) || [];
    bucket.push(dossier);
    byUser.set(dossier.userId, bucket);
  }

  let sent = 0;
  let skipped = 0;

  for (const [userId, userDossiers] of byUser.entries()) {
    const user = await getUserById(userId);
    if (!user?.email) {
      skipped += 1;
      continue;
    }
    const prefs = resolveUserEmailPreferences(user);
    if (prefs.emailDigest !== 'weekly') {
      skipped += 1;
      continue;
    }

    const result = await sendDossierEmail({
      templateId: 'weekly_digest',
      dossier: userDossiers[0],
      userId,
      toEmail: user.email,
      daysSinceAction: 7,
      variables: {
        firstName: user.firstName || 'Client',
        dossierCount: String(userDossiers.length),
        summaryItems: userDossiers.map(summarizeDossier).join('\n'),
        continueUrl: `${APP_URL}/dashboard`,
      },
    });

    if (result.skipped) skipped += 1;
    else if (result.ok) sent += 1;
    else skipped += 1;
  }

  return { sent, skipped, mode: 'weekly_digest' };
};

const runSatisfactionSurveys = async () => {
  if (!isEmailFeatureEnabled('satisfactionRequest')) {
    return { sent: 0, skipped: 0, mode: 'satisfaction', disabled: true };
  }

  const dossiers = await getAllDossiers();
  let sent = 0;
  let skipped = 0;

  for (const dossier of dossiers) {
    if (!dossier.userId) {
      skipped += 1;
      continue;
    }

    const status = String(dossier.status || '').toLowerCase();
    const isEndOfFormality = SATISFACTION_END_STATUSES.has(status);
    const isActiveJourney = REMINDER_STATUSES.has(status) || [
      'questionnaire_completed',
      'documents_uploaded',
      'documents_under_review',
      'dossier_preparation',
      'ready_for_filing',
      'filed_to_guichet_unique',
    ].includes(status);

    if (!isEndOfFormality && !isActiveJourney) {
      skipped += 1;
      continue;
    }

    const user = await getUserById(dossier.userId);
    if (!user?.email) {
      skipped += 1;
      continue;
    }

    const days = daysSince(dossier.updatedAt);
    if (!isEndOfFormality && days < SATISFACTION_INTERVAL_DAYS) {
      skipped += 1;
      continue;
    }

    const withinHours = isEndOfFormality ? 24 * 30 : SATISFACTION_INTERVAL_DAYS * 24;
    const duplicate = await hasRecentSuccessfulEmail({
      templateId: 'satisfaction_request',
      dossierId: dossier.id,
      recipientEmail: user.email,
      withinHours,
    });
    if (duplicate) {
      skipped += 1;
      continue;
    }

    const result = await sendDossierEmail({
      templateId: 'satisfaction_request',
      dossier,
      userId: dossier.userId,
      toEmail: user.email,
      daysSinceAction: days,
      variables: {
        firstName: user.firstName || 'Client',
        formalityType: resolveFormalityPublicLabel({
          service: dossier.service,
          typeFormalite: dossier.typeFormalite,
          formeJuridique: dossier.formeJuridique || dossier.legalForm,
          legalForm: dossier.legalForm,
        }),
        feedbackUrl: `${APP_URL}/dossier/${dossier.id}?tab=feedback`,
      },
    });

    if (result.skipped) skipped += 1;
    else if (result.ok) sent += 1;
    else skipped += 1;
  }

  return { sent, skipped, mode: 'satisfaction' };
};

const mode = process.argv[2] || 'reminders';

const summary = mode === 'digest'
  ? await runWeeklyDigest()
  : mode === 'satisfaction'
    ? await runSatisfactionSurveys()
    : await runReminders();

console.log(JSON.stringify(summary, null, 2));
process.exit(0);

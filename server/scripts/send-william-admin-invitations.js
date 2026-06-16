import dotenv from 'dotenv';
import {
  createPasswordResetToken,
  getUserByEmail,
} from '../authStore.js';
import { sendTransactionalEmail } from '../services/emailService.js';

dotenv.config({ quiet: true });

const appUrl = String(process.env.APP_URL || 'https://greffio.willentreprises.com').replace(/\/$/, '');

const ADMIN_USERS = [
  {
    email: 'william@willentreprises.com',
    jobTitle: 'Président – Co-fondateur',
    needsPasswordSetup: false,
  },
  {
    email: 'nobatene@willentreprises.com',
    jobTitle: 'Directeur Général – Co-fondateur',
    needsPasswordSetup: true,
  },
  {
    email: 'ibtissam@willentreprises.com',
    jobTitle: 'Cheffe de cabinet',
    needsPasswordSetup: true,
  },
];

const sendInvitation = async (entry) => {
  const email = String(entry.email).toLowerCase().trim();
  const user = await getUserByEmail(email);
  if (!user) {
    return { email, ok: false, error: 'USER_NOT_FOUND' };
  }

  const loginUrl = `${appUrl}/login`;
  const dashboardUrl = `${appUrl}/dashboard`;
  let accountActionLabel = 'Accéder à mon espace';
  let accountActionUrl = dashboardUrl;

  if (entry.needsPasswordSetup) {
    const expirationMinutes = Number(process.env.PASSWORD_RESET_EXPIRATION_MINUTES || 1440);
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString();
    const token = await createPasswordResetToken({
      userId: user.id,
      expiresAt,
    });
    accountActionLabel = 'Définir mon mot de passe';
    accountActionUrl = `${appUrl}/password-reset?token=${encodeURIComponent(token)}`;
  }

  const result = await sendTransactionalEmail({
    to: {
      email: user.email,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    },
    templateKey: 'admin_invitation',
    variables: {
      firstName: user.firstName || 'Administrateur',
      jobTitle: entry.jobTitle,
      loginUrl,
      dashboardUrl,
      accountActionLabel,
      accountActionUrl,
      supportUrl: `${appUrl}/contact`,
    },
    userId: user.id,
    tags: ['auth', 'admin', 'invitation'],
  });

  return {
    email: user.email,
    ok: result.ok,
    templateKey: result.templateKey,
    providerMessageId: result.providerMessageId || null,
    error: result.error || result.errorCode || null,
    passwordSetupLink: entry.needsPasswordSetup,
  };
};

const run = async () => {
  const results = [];
  for (const entry of ADMIN_USERS) {
    results.push(await sendInvitation(entry));
  }

  const allOk = results.every((item) => item.ok);
  process.stdout.write(`${JSON.stringify({ ok: allOk, results }, null, 2)}\n`);
  if (!allOk) process.exit(1);
};

run().catch((error) => {
  process.stderr.write(`${error.message || 'ADMIN_INVITATION_SEND_FAILED'}\n`);
  process.exit(1);
});

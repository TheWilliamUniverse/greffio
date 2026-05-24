import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';
import {
  getUserByEmail,
  updateUserPasswordById,
} from '../authStore.js';
import { sendTransactionalEmail } from '../services/emailService.js';

dotenv.config({ quiet: true });

const appUrl = String(process.env.APP_URL || 'https://greffio.willentreprises.com').replace(/\/$/, '');
const loginUrl = `${appUrl}/login`;

const ACCOUNTS = [
  {
    email: 'william.abdou01@gmail.com',
    roleLabel: 'Espace client',
  },
  {
    email: 'nobatene@willentreprises.com',
    roleLabel: 'Administrateur Greffio',
  },
  {
    email: 'ibtissam@willentreprises.com',
    roleLabel: 'Administrateur Greffio',
  },
];

const generatePassword = () => randomBytes(12).toString('base64url');

const run = async () => {
  if (process.env.CONFIRM_SEND_DIRECT_CREDENTIALS !== 'YES') {
    throw new Error('CONFIRM_SEND_DIRECT_CREDENTIALS=YES required');
  }

  const results = [];
  for (const entry of ACCOUNTS) {
    const email = String(entry.email).toLowerCase().trim();
    const user = await getUserByEmail(email);
    if (!user) {
      results.push({ email, ok: false, error: 'USER_NOT_FOUND' });
      continue;
    }

    const temporaryPassword = generatePassword();
    await updateUserPasswordById({ userId: user.id, password: temporaryPassword });

    const emailResult = await sendTransactionalEmail({
      to: { email: user.email, name: `${user.firstName} ${user.lastName}`.trim() },
      templateKey: 'credentials_direct',
      userId: user.id,
      variables: {
        firstName: user.firstName || 'Utilisateur',
        loginUrl,
        temporaryPassword,
        roleLabel: entry.roleLabel,
        supportUrl: `${appUrl}/contact`,
      },
      tags: ['credentials', 'direct', 'no-sms'],
    });

    results.push({
      email: user.email,
      role: user.role,
      emailSent: emailResult.ok,
      emailError: emailResult.errorCode || emailResult.error || null,
      temporaryPassword: emailResult.ok ? temporaryPassword : null,
    });
  }

  process.stdout.write(`${JSON.stringify({
    ok: results.every((item) => item.emailSent),
    mode: 'direct_unlocked_email',
    smsUsed: false,
    results,
  }, null, 2)}\n`);
};

run().catch((error) => {
  process.stderr.write(`${error.message || 'SEND_DIRECT_CREDENTIALS_FAILED'}\n`);
  process.exit(1);
});

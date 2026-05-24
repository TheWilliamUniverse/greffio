import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';
import {
  getUserByEmail,
  updateUserPasswordById,
  updateUserProfile,
  updateUserRoleByEmail,
} from '../authStore.js';
import { createCredentialUnlock, markSmsSent } from '../credentialUnlockStore.js';
import { sendTransactionalSms } from '../emails/brevoSmsProvider.js';
import { sendTransactionalEmail } from '../services/emailService.js';

dotenv.config({ quiet: true });

const appUrl = String(process.env.APP_URL || 'https://greffio.willentreprises.com').replace(/\/$/, '');
const loginUrl = `${appUrl}/login`;
const expirationMinutes = Number(process.env.CREDENTIAL_UNLOCK_EXPIRATION_MINUTES || 60);

const ACCOUNTS = [
  {
    email: 'william@willentreprises.com',
    role: 'ADMIN',
    phone: null,
    secured: false,
    roleLabel: 'Administrateur Greffio',
  },
  {
    email: 'william.abdou01@gmail.com',
    role: 'CLIENT',
    phone: '0656717221',
    secured: true,
    roleLabel: 'Espace client',
  },
  {
    email: 'nobatene@willentreprises.com',
    role: 'ADMIN',
    phone: '0766483298',
    secured: true,
    roleLabel: 'Administrateur Greffio',
  },
  {
    email: 'ibtissam@willentreprises.com',
    role: 'ADMIN',
    phone: '0782412616',
    secured: true,
    roleLabel: 'Administrateur Greffio',
  },
];

const generatePassword = () => randomBytes(12).toString('base64url');

const normalizeEmail = (email) => String(email || '').toLowerCase().trim();

const ensureAccountState = async (entry) => {
  const email = normalizeEmail(entry.email);
  let user = await getUserByEmail(email);
  if (!user) {
    throw new Error(`USER_NOT_FOUND:${email}`);
  }

  user = await updateUserRoleByEmail({
    email,
    role: entry.role,
    firstName: user.firstName,
    lastName: user.lastName,
  });

  if (entry.phone) {
    user = await updateUserProfile({
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: entry.phone,
      profile: {
        phones: [{
          id: 'phone_primary',
          label: 'mobile',
          number: entry.phone,
          isPrimary: true,
        }],
      },
    });
  }

  return user;
};

const deliverDirectCredentials = async ({ user, temporaryPassword, roleLabel }) => {
  return sendTransactionalEmail({
    to: { email: user.email, name: `${user.firstName} ${user.lastName}`.trim() },
    templateKey: 'credentials_direct',
    userId: user.id,
    variables: {
      firstName: user.firstName || 'Utilisateur',
      loginUrl,
      temporaryPassword,
      roleLabel,
      supportUrl: `${appUrl}/contact`,
    },
    tags: ['credentials', 'direct'],
  });
};

const deliverSecuredCredentials = async ({ user, temporaryPassword, phone }) => {
  const unlock = await createCredentialUnlock({
    userId: user.id,
    temporaryPassword,
    phone,
    expirationMinutes,
  });

  const smsResult = await sendTransactionalSms({
    to: phone,
    content: `Greffio : votre code pour acceder a vos identifiants est ${unlock.smsCode}. Valable ${expirationMinutes} min.`,
  });

  if (smsResult.ok) {
    await markSmsSent(unlock.id);
  }

  const unlockUrl = `${appUrl}/credentials-unlock?token=${encodeURIComponent(unlock.token)}`;
  const emailResult = await sendTransactionalEmail({
    to: { email: user.email, name: `${user.firstName} ${user.lastName}`.trim() },
    templateKey: 'credentials_secured',
    userId: user.id,
    variables: {
      firstName: user.firstName || 'Utilisateur',
      unlockUrl,
      phoneMasked: unlock.phoneMasked,
      expirationMinutes,
      loginUrl,
      supportUrl: `${appUrl}/contact`,
    },
    tags: ['credentials', 'secured'],
  });

  let smsFallbackEmail = null;
  if (!smsResult.ok) {
    smsFallbackEmail = await sendTransactionalEmail({
      to: { email: user.email, name: `${user.firstName} ${user.lastName}`.trim() },
      templateKey: 'authentication_code',
      userId: user.id,
      variables: {
        firstName: user.firstName || 'Utilisateur',
        verificationCode: unlock.smsCode,
        expirationMinutes,
        actionLabel: 'déverrouillage de vos identifiants Greffio',
        supportUrl: `${appUrl}/contact`,
      },
      tags: ['credentials', 'sms-fallback'],
    });
  }

  return {
    email: emailResult,
    sms: smsResult,
    smsFallbackEmail,
    unlockUrl,
    smsCode: smsResult.ok ? undefined : unlock.smsCode,
  };
};

const run = async () => {
  if (process.env.CONFIRM_SEND_ACCOUNT_CREDENTIALS !== 'YES') {
    throw new Error('CONFIRM_SEND_ACCOUNT_CREDENTIALS=YES required');
  }

  const results = [];
  for (const entry of ACCOUNTS) {
    const user = await ensureAccountState(entry);
    const temporaryPassword = generatePassword();
    await updateUserPasswordById({ userId: user.id, password: temporaryPassword });

    if (entry.secured) {
      const delivery = await deliverSecuredCredentials({
        user,
        temporaryPassword,
        phone: entry.phone,
      });
      results.push({
        email: user.email,
        role: entry.role,
        secured: true,
        phone: entry.phone,
        emailSent: delivery.email?.ok || false,
        smsSent: delivery.sms?.ok || false,
        smsFallbackEmailSent: delivery.smsFallbackEmail?.ok || false,
        emailError: delivery.email?.errorCode || delivery.email?.error || null,
        smsError: delivery.sms?.errorCode || delivery.sms?.errorMessage || null,
        unlockUrl: delivery.unlockUrl,
        smsFallbackCode: delivery.sms?.ok ? null : delivery.smsCode || null,
      });
      continue;
    }

    const emailResult = await deliverDirectCredentials({
      user,
      temporaryPassword,
      roleLabel: entry.roleLabel,
    });
    results.push({
      email: user.email,
      role: entry.role,
      secured: false,
      emailSent: emailResult.ok,
      emailError: emailResult.errorCode || emailResult.error || null,
      temporaryPassword,
    });
  }

  process.stdout.write(`${JSON.stringify({
    ok: results.every((item) => item.emailSent && (!item.secured || item.smsSent || item.smsFallbackEmailSent)),
    results,
  }, null, 2)}\n`);
};

run().catch((error) => {
  process.stderr.write(`${error.message || 'SEND_ACCOUNT_CREDENTIALS_FAILED'}\n`);
  process.exit(1);
});

import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';
import {
  createUser,
  getUserByEmail,
  updateUserProfile,
  updateUserRoleByEmail,
} from '../authStore.js';

dotenv.config({ quiet: true });

const COMPANY = {
  name: 'WILLIAM ESTABLISHMENTS',
  service: 'Greffio',
  domain: 'greffio.willentreprises.com',
};

const ADMIN_USERS = [
  {
    email: 'william@willentreprises.com',
    firstName: 'William',
    lastName: 'Abdou',
    jobTitle: 'Président – Co-fondateur',
  },
  {
    email: 'nobatene@willentreprises.com',
    firstName: 'Nobatène',
    lastName: 'Abdou',
    jobTitle: 'Directeur Général – Co-fondateur',
  },
  {
    email: 'ibtissam@willentreprises.com',
    firstName: 'Ibtissam',
    lastName: 'Abdou',
    jobTitle: 'Cheffe de cabinet',
  },
];

const generatePassword = () => randomBytes(12).toString('base64url');

const resolveBootstrapPassword = () => {
  const fromEnv = String(process.env.ADMIN_BOOTSTRAP_PASSWORD || process.env.INTERNAL_USER_PASSWORD || '').trim();
  if (fromEnv.length >= 12) return fromEnv;
  return generatePassword();
};

const provisionOne = async (entry, bootstrapPassword) => {
  const email = String(entry.email).toLowerCase().trim();
  const company = { ...COMPANY, jobTitle: entry.jobTitle };
  let createdPassword = null;
  let action = 'promoted';

  let user = await getUserByEmail(email);
  if (!user) {
    createdPassword = bootstrapPassword;
    user = await createUser({
      email,
      password: createdPassword,
      firstName: entry.firstName,
      lastName: entry.lastName,
      role: 'ADMIN',
      company,
    });
    action = 'created';
  } else {
    user = await updateUserRoleByEmail({
      email,
      role: 'ADMIN',
      firstName: entry.firstName,
      lastName: entry.lastName,
      company,
    });
  }

  user = await updateUserProfile({
    userId: user.id,
    firstName: entry.firstName,
    lastName: entry.lastName,
    profile: { jobTitle: entry.jobTitle },
  });

  return {
    email: user.email,
    role: user.role,
    name: `${user.firstName} ${user.lastName}`.trim(),
    jobTitle: entry.jobTitle,
    action,
    temporaryPassword: createdPassword,
  };
};

const run = async () => {
  const bootstrapPassword = resolveBootstrapPassword();
  const results = [];
  for (const entry of ADMIN_USERS) {
    results.push(await provisionOne(entry, bootstrapPassword));
  }

  process.stdout.write(`${JSON.stringify({ ok: true, results }, null, 2)}\n`);
};

run().catch((error) => {
  process.stderr.write(`${error.message || 'ADMIN_PROVISION_FAILED'}\n`);
  process.exit(1);
});

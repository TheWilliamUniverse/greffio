import dotenv from 'dotenv';
import { createUser, getUserByEmail, updateUserRoleByEmail } from '../authStore.js';

dotenv.config({ quiet: true });

const INTERNAL_ROLES = new Set(['ADMIN', 'OPS', 'FORMALISTE']);

const email = String(process.env.INTERNAL_USER_EMAIL || process.argv[2] || 'william@willentreprises.com')
  .toLowerCase()
  .trim();
const role = String(process.env.INTERNAL_USER_ROLE || process.argv[3] || 'ADMIN').toUpperCase().trim();

const company = {
  name: 'WILLIAM ESTABLISHMENTS',
  service: 'Greffio',
  domain: 'greffio.willentreprises.com',
};

const run = async () => {
  if (!email || !email.includes('@')) {
    throw new Error('INTERNAL_USER_EMAIL_INVALID');
  }
  if (!INTERNAL_ROLES.has(role)) {
    throw new Error('INTERNAL_USER_ROLE_INVALID');
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    const user = await updateUserRoleByEmail({
      email,
      role,
      firstName: existing.firstName || 'William',
      lastName: existing.lastName || 'Establishments',
      company,
    });
    process.stdout.write(`INTERNAL_USER_PROMOTED:${user.email}:${user.role}\n`);
    return;
  }

  const password = process.env.INTERNAL_USER_PASSWORD;
  if (!password || String(password).length < 12) {
    throw new Error('INTERNAL_USER_PASSWORD_REQUIRED_FOR_CREATE');
  }

  const user = await createUser({
    email,
    password,
    firstName: process.env.INTERNAL_USER_FIRST_NAME || 'William',
    lastName: process.env.INTERNAL_USER_LAST_NAME || 'Establishments',
    role,
    company,
  });

  process.stdout.write(`INTERNAL_USER_CREATED:${user.email}:${user.role}\n`);
};

run().catch((error) => {
  process.stderr.write(`${error.message || 'INTERNAL_USER_PROMOTION_FAILED'}\n`);
  process.exit(1);
});

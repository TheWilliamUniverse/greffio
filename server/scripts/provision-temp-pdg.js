import dotenv from 'dotenv';
import {
  createUser,
  getUserByEmail,
  updateUserPasswordById,
  updateUserProfile,
} from '../authStore.js';

dotenv.config({ quiet: true });

const TEMP_EMAIL = 'pdg@greffio.temp';
const TEMP_PASSWORD = 'PDG';

const getParisTodayAt10Iso = () => {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return `${day}T10:00:00+02:00`;
};

const run = async () => {
  const expiresAt = process.env.TEMP_PDG_EXPIRES_AT || getParisTodayAt10Iso();
  let user = await getUserByEmail(TEMP_EMAIL);
  let action = 'updated';

  if (!user) {
    user = await createUser({
      email: TEMP_EMAIL,
      password: TEMP_PASSWORD,
      firstName: 'PDG',
      lastName: 'Démo',
      role: 'CLIENT',
    });
    action = 'created';
  } else {
    await updateUserPasswordById({ userId: user.id, password: TEMP_PASSWORD });
  }

  await updateUserProfile({
    userId: user.id,
    firstName: 'PDG',
    lastName: 'Démo',
    profile: {
      tempAccount: true,
      tempAccessExpiresAt: expiresAt,
      loginAlias: 'pdg',
    },
  });

  process.stdout.write(`${JSON.stringify({
    ok: true,
    action,
    identifiant: 'PDG',
    email: TEMP_EMAIL,
    password: TEMP_PASSWORD,
    expiresAt,
    timezone: 'Europe/Paris',
  }, null, 2)}\n`);
};

run().catch((error) => {
  process.stderr.write(`${error.message || 'TEMP_PDG_PROVISION_FAILED'}\n`);
  process.exit(1);
});

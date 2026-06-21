/**
 * Réinitialise la MFA TOTP pour tous les comptes (admin + client).
 * Usage :
 *   node server/scripts/reset-all-totp-mfa.js           # dry-run
 *   node server/scripts/reset-all-totp-mfa.js --confirm # exécution
 */
import dotenv from 'dotenv';
import { listUsersWithTotpMfa, resetAllTotpMfa } from '../mfaStore.js';

dotenv.config({ quiet: true });

const confirm = process.argv.includes('--confirm');

const users = await listUsersWithTotpMfa();
console.log(JSON.stringify({
  mode: confirm ? 'confirm' : 'dry-run',
  affectedCount: users.length,
  users: users.map((user) => ({
    email: user.email,
    role: user.role,
    mfaEnabled: Boolean(user.mfaEnabled),
  })),
}, null, 2));

if (!confirm) {
  console.log('\nDry-run uniquement. Relancez avec --confirm pour réinitialiser.');
  process.exit(0);
}

if (!users.length) {
  console.log('\nAucun compte MFA TOTP à réinitialiser.');
  process.exit(0);
}

const result = await resetAllTotpMfa();
console.log(`\nRéinitialisation terminée : ${result.resetCount} compte(s).`);
process.exit(0);

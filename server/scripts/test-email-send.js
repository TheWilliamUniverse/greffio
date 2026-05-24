import dotenv from 'dotenv';
import { sendTransactionalEmail } from '../services/emailService.js';

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1') });

const targetEmail = process.argv[2] || process.env.SUPPORT_EMAIL || 'contact@willentreprises.com';

const result = await sendTransactionalEmail({
  to: { email: targetEmail, name: 'Test Greffio' },
  templateKey: 'account_welcome',
  variables: {
    firstName: 'William',
    dashboardUrl: `${process.env.APP_URL || 'https://greffio.willentreprises.com'}/dashboard`,
    supportUrl: `${process.env.APP_URL || 'https://greffio.willentreprises.com'}/contact`,
  },
  tags: ['deploy-test'],
});

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);

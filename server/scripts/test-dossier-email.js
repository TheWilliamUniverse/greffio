import dotenv from 'dotenv';
import { sendTransactionalEmail } from '../services/emailService.js';

dotenv.config({ quiet: true });

const targetEmail = process.argv[2] || 'william@willentreprises.com';

const result = await sendTransactionalEmail({
  to: { email: targetEmail, name: 'William' },
  templateKey: 'dossier_created',
  variables: {
    firstName: 'William',
    dossierNumber: 'GF-TEST01',
    formalityType: 'Formalité de création de SASU',
    dashboardUrl: `${process.env.APP_URL || 'https://greffio.willentreprises.com'}/dashboard`,
  },
  tags: ['design-test'],
});

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);

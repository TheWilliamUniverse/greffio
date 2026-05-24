import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const { askGreffioAssistant, isAssistantConfigured } = await import('../services/assistant.js');

try {
  console.log('configured', isAssistantConfigured(), 'model', process.env.OPENAI_MODEL || 'default');
  const result = await askGreffioAssistant({
    message: 'Explique la difference SAS et SARL',
    userContext: { role: 'CLIENT' },
    history: [],
  });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error('FAILED', error?.message || error);
  process.exit(1);
}

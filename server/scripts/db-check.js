import dotenv from 'dotenv';
import { checkDatabaseConnection } from '../dbClient.js';

dotenv.config();

const run = async () => {
  const result = await checkDatabaseConnection();
  process.stdout.write(`${result}\n`);
};

run().catch((_error) => {
  process.stdout.write('DB CHECK FAILED\n');
  process.exit(1);
});

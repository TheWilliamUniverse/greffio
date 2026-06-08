import dotenv from 'dotenv';
import { uploadDocumentToS3WithRetry } from '../services/s3StorageService.js';

dotenv.config({ quiet: true });

const buffer = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

const run = async () => {
  const cases = [
    { label: 'ascii', originalFilename: 'Declaration_BE.pdf' },
    { label: 'unicode', originalFilename: 'Déclaration bénéficiaires effectifs.pdf' },
  ];
  for (const entry of cases) {
    try {
      const result = await uploadDocumentToS3WithRetry({
        buffer,
        dossierId: 'dos_test_upload',
        docKey: 'ubo_declaration',
        originalFilename: entry.originalFilename,
        mimeType: 'application/pdf',
      });
      process.stdout.write(`OK ${entry.label} ${result.storageUrl}\n`);
    } catch (error) {
      process.stderr.write(`FAIL ${entry.label} ${error?.message || error}\n`);
    }
  }
};

run();

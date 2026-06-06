import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { generateStatutesPdf } from '../pdf/statutesPdf.js';
import { draftStatutesDocument } from './statutesDrafting.js';
import { mapStatutesData } from '../utils/statutesDataMapper.js';
import { isStatutesSupportedForm } from '../legal/statutes/index.js';
import { uploadDocumentToConfiguredStorage, createSignedDownloadUrl } from './objectStorage.js';
import { upsertGeneratedDocument } from '../store.js';

export const buildStatutesPdfForDossier = async ({ dossier, questionnaire, user }) => {
  const legalForm = String(dossier.legalForm || questionnaire?.formeJuridique || 'SAS').toUpperCase();
  if (!isStatutesSupportedForm(legalForm)) {
    const error = new Error('LEGAL_FORM_UNSUPPORTED');
    error.code = 'LEGAL_FORM_UNSUPPORTED';
    throw error;
  }

  const statutesData = mapStatutesData({ dossier, questionnaire, user });
  const statutesDocument = draftStatutesDocument(statutesData);
  const safeReference = String(dossier.reference || dossier.id).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Statuts_${legalForm}_${safeReference}_${Date.now()}.pdf`;
  const filePath = await generateStatutesPdf({ filename, document: statutesDocument });
  const buffer = fs.readFileSync(filePath);
  const contentHash = createHash('sha256').update(buffer).digest('hex');

  const uploadResult = await uploadDocumentToConfiguredStorage({
    dossierId: dossier.id,
    docKey: 'signed_statutes',
    buffer,
    originalFilename: filename,
    mimeType: 'application/pdf',
    localFilePath: filePath,
  });

  const saved = await upsertGeneratedDocument({
    dossierId: dossier.id,
    type: `statutes_${legalForm.toLowerCase()}`,
    status: 'generated',
    version: 1,
    fileUrl: uploadResult.storageUrl,
    fileSizeBytes: buffer.length,
    contentHash,
    metadata: {
      completeness: statutesData.completeness,
      missingFields: statutesData.missingFields,
      generatedBy: 'greffio_william_template',
      template: statutesDocument.metadata?.template,
      filename,
      storageProvider: uploadResult.storageProvider,
    },
  });

  return { filePath, filename, buffer, contentHash, saved, statutesDocument, legalForm };
};

export const resolveStatutesPdfAccess = async (latest) => {
  const source = String(latest?.fileUrl || '');
  if (source.startsWith('s3://') || source.startsWith('supabase://')) {
    const signed = await createSignedDownloadUrl(source);
    if (signed?.url) {
      return { mode: 'redirect', url: signed.url, filename: latest.metadata?.filename || 'Statuts_Greffio.pdf' };
    }
  }
  if (source && fs.existsSync(source)) {
    return {
      mode: 'stream',
      stream: fs.createReadStream(source),
      filename: latest.metadata?.filename || source.split(/[/\\]/).pop() || 'Statuts_Greffio.pdf',
    };
  }
  return { mode: 'missing' };
};

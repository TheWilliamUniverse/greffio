import multer from 'multer';
import path from 'node:path';
import { documentCompletionConfig } from '../features/documentCompletion/config.js';
import {
  deleteDocumentCompletion,
  downloadDocumentCompletionFile,
  exportDocumentCompletion,
  getDocumentCompletionStatus,
  listUserDocumentCompletions,
  runDocumentAnalysisJob,
  uploadDocumentCompletion,
} from '../features/documentCompletion/documentCompletion.service.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: documentCompletionConfig.maxFileSizeBytes },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(String(file.originalname || '')).toLowerCase();
    if (file.mimetype !== 'application/pdf' || extension !== '.pdf') {
      return cb(new Error('INVALID_FILE_TYPE'));
    }
    return cb(null, true);
  },
});

const mapError = (error) => {
  const code = error?.code || String(error?.message || 'UPLOAD_FAILED');
  const statusMap = {
    INVALID_FILE_TYPE: 400,
    FILE_TOO_LARGE: 413,
    UNAUTHORIZED: 403,
    NOT_FOUND: 404,
    PDF_PARSE_FAILED: 422,
    PDF_EMPTY: 422,
    EXPORT_FAILED: 500,
    UPLOAD_FAILED: 500,
    STORAGE_FAILED: 503,
  };
  return {
    status: statusMap[code] || 500,
    code,
    message: String(error?.message || code),
  };
};

export const registerDocumentCompletionRoutes = (app, { requireAuth }) => {
  app.post(
    '/api/document-completion/documents',
    requireAuth,
    upload.single('file'),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ ok: false, error: 'INVALID_FILE_TYPE', message: 'PDF requis.' });
        }
        const payload = await uploadDocumentCompletion({
          userId: req.auth.sub,
          file: req.file,
        });
        return res.status(201).json({
          ok: true,
          documentId: payload.document.id,
          status: payload.document.status,
          document: payload.document,
        });
      } catch (error) {
        const mapped = mapError(error);
        return res.status(mapped.status).json({ ok: false, error: mapped.code, message: mapped.message });
      }
    },
  );

  app.get('/api/document-completion/documents', requireAuth, async (req, res) => {
    const payload = await listUserDocumentCompletions(req.auth.sub);
    return res.json(payload);
  });

  app.get('/api/document-completion/documents/:documentId', requireAuth, async (req, res) => {
    const payload = await getDocumentCompletionStatus(req.params.documentId, req.auth.sub);
    if (!payload.ok) return res.status(payload.status).json({ ok: false, error: payload.error });
    return res.json({ ok: true, document: payload.document, fields: payload.fields });
  });

  app.get('/api/document-completion/documents/:documentId/status', requireAuth, async (req, res) => {
    const payload = await getDocumentCompletionStatus(req.params.documentId, req.auth.sub);
    if (!payload.ok) return res.status(payload.status).json({ ok: false, error: payload.error });
    return res.json({
      ok: true,
      document: payload.document,
      fields: payload.fields,
    });
  });

  app.post('/api/document-completion/documents/:documentId/analyze', requireAuth, async (req, res) => {
    const payload = await getDocumentCompletionStatus(req.params.documentId, req.auth.sub);
    if (!payload.ok) return res.status(payload.status).json({ ok: false, error: payload.error });
    runDocumentAnalysisJob(req.params.documentId).catch((error) => {
      console.error('DOCUMENT_COMPLETION_REANALYZE_FAILED', error?.message || error);
    });
    return res.json({ ok: true, status: 'processing', documentId: req.params.documentId });
  });

  app.post('/api/document-completion/documents/:documentId/export', requireAuth, async (req, res) => {
    try {
      const payload = await exportDocumentCompletion(req.params.documentId, req.auth.sub);
      if (!payload.ok) return res.status(payload.status).json({ ok: false, error: payload.error });
      return res.json({
        ok: true,
        documentId: payload.document.id,
        status: payload.document.status,
        document: payload.document,
        fields: payload.fields,
      });
    } catch (error) {
      const mapped = mapError(error);
      return res.status(mapped.status).json({ ok: false, error: mapped.code, message: mapped.message });
    }
  });

  app.get('/api/document-completion/documents/:documentId/download', requireAuth, async (req, res) => {
    try {
      const payload = await downloadDocumentCompletionFile(req.params.documentId, req.auth.sub);
      if (!payload.ok) return res.status(payload.status).json({ ok: false, error: payload.error });
      res.setHeader('Content-Type', payload.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${payload.fileName.replace(/"/g, '')}"`);
      return res.send(payload.buffer);
    } catch (error) {
      const mapped = mapError(error);
      return res.status(mapped.status).json({ ok: false, error: mapped.code, message: mapped.message });
    }
  });

  app.delete('/api/document-completion/documents/:documentId', requireAuth, async (req, res) => {
    const payload = await deleteDocumentCompletion(req.params.documentId, req.auth.sub);
    if (!payload.ok) return res.status(payload.status).json({ ok: false, error: payload.error });
    return res.json(payload);
  });
};

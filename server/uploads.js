import multer from 'multer';
import path from 'node:path';

const allowedMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

const allowedExtensions = new Set(['.pdf', '.jpg', '.jpeg', '.png']);

const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mimeOk = allowedMimeTypes.has(file.mimetype);
    const extension = path.extname(String(file.originalname || '')).toLowerCase();
    const extensionOk = allowedExtensions.has(extension);
    if (!mimeOk || !extensionOk) {
      return cb(new Error('INVALID_FILE_TYPE'));
    }
    return cb(null, true);
  },
});

/** @deprecated use uploadMiddleware — kept for existing imports */
const uploadPdfOnly = uploadMiddleware;

export {
  uploadMiddleware,
  uploadPdfOnly,
};

import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';

const uploadsRoot = path.resolve(process.cwd(), 'server', 'data', 'uploads');
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsRoot),
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const sanitized = String(file.originalname || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}_${sanitized}`);
  },
});

const uploadPdfOnly = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isPdfMime = file.mimetype === 'application/pdf';
    const isPdfName = String(file.originalname || '').toLowerCase().endsWith('.pdf');
    if (isPdfMime && isPdfName) return cb(null, true);
    return cb(new Error('ONLY_PDF_ALLOWED'));
  },
});

export {
  uploadPdfOnly,
};

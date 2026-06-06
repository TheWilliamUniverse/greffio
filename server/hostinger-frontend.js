import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');
const app = express();
const port = Number(process.env.PORT || 3000);

app.disable('x-powered-by');

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'greffio-frontend', timestamp: new Date().toISOString() });
});

app.use(express.static(distDir, {
  index: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('sw.js')) {
      res.setHeader('Cache-Control', 'no-store');
      return;
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  },
}));

app.use((req, res) => {
  if (req.method !== 'GET') {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
  }
  return res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[greffio-frontend] serving ${distDir} on port ${port}`);
});

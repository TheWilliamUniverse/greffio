import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');
const app = express();
const port = Number(process.env.PORT || 3000);
const apiBase = String(
  process.env.VITE_API_BASE_URL
  || process.env.API_PUBLIC_URL
  || 'https://api.greffio.willentreprises.com',
).replace(/\/$/, '');

app.disable('x-powered-by');

/** Canonical : www → apex HTTPS (revue Mollie + SEO). */
app.use((req, res, next) => {
  const host = String(req.headers.host || '').split(':')[0].toLowerCase();
  if (host.startsWith('www.')) {
    return res.redirect(301, `https://${host.slice(4)}${req.originalUrl}`);
  }
  return next();
});

const proxyToApi = async (req, res, apiPath) => {
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const target = `${apiBase}${apiPath}${query}`;
  try {
    const headers = {};
    if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];
    const init = { method: req.method, headers };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = req.body;
    }
    const response = await fetch(target, init);
    const body = await response.text();
    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    return res.status(response.status).send(body);
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: 'MOLLIE_API_PROXY_FAILED',
      message: error?.message || 'Proxy failed',
    });
  }
};

/** Mollie : éviter que le SPA avale /api/* (dashboard → greffio.willentreprises.com). */
app.get('/api/mollie/callback', (req, res) => {
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  return res.redirect(302, `${apiBase}/api/mollie/callback${query}`);
});
app.get('/api/mollie/status', (req, res) => proxyToApi(req, res, '/api/mollie/status'));
app.post(
  '/api/webhooks/mollie',
  express.raw({ type: '*/*' }),
  (req, res) => proxyToApi(req, res, '/api/webhooks/mollie'),
);
app.post(
  '/api/mollie/webhook',
  express.raw({ type: '*/*' }),
  (req, res) => proxyToApi(req, res, '/api/webhooks/mollie'),
);

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

export const securityHeadersMiddleware = (_req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=(self)');

  const cspReportOnly = process.env.CSP_REPORT_ONLY !== 'false';
  if (cspReportOnly) {
    const reportUri = process.env.CSP_REPORT_URI || '';
    const onlyOfficeOrigin = (() => {
      const raw = String(process.env.ONLYOFFICE_URL || '').trim().replace(/\/$/, '');
      if (!raw) return '';
      try {
        return new URL(raw).origin;
      } catch (_error) {
        return '';
      }
    })();
    const scriptSrcExtras = [
      'https://js.mollie.com',
      'https://challenges.cloudflare.com',
      'https://www.google.com',
      'https://www.gstatic.com',
      onlyOfficeOrigin,
    ].filter(Boolean).join(' ');
    const frameSrcExtras = [
      'https://js.mollie.com',
      'https://www.mollie.com',
      'https://challenges.cloudflare.com',
      'https://www.google.com',
      onlyOfficeOrigin,
    ].filter(Boolean).join(' ');
    const directives = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' ${scriptSrcExtras}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https: https://api.mollie.com",
      `frame-src ${frameSrcExtras}`,
      reportUri ? `report-uri ${reportUri}` : null,
    ].filter(Boolean).join('; ');
    res.setHeader('Content-Security-Policy-Report-Only', directives);
  }

  next();
};

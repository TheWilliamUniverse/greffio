const readAnalyticsConsent = () => {
  try {
    const raw = window.localStorage.getItem('greffio_cookie_consent_v1');
    if (!raw) return false;
    if (raw === 'accepted') return true;
    const parsed = JSON.parse(raw);
    return Boolean(parsed?.analytics);
  } catch (_error) {
    return false;
  }
};

export const initWebVitals = async () => {
  if (!import.meta.env.PROD) return;
  try {
    const { onCLS, onINP, onLCP, onFCP, onTTFB } = await import('web-vitals');
    const send = (metric) => {
      if (!readAnalyticsConsent()) return;
      if (import.meta.env.DEV) {
        console.info('[web-vitals]', metric.name, metric.value);
      }
      window.dispatchEvent(new CustomEvent('greffio:web-vital', { detail: metric }));
    };
    onCLS(send);
    onINP(send);
    onLCP(send);
    onFCP(send);
    onTTFB(send);
  } catch (_error) {
    // optional telemetry
  }
};

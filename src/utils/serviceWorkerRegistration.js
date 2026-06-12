import { isCapacitorNative } from '@/utils/platform.js';

const applyWaitingWorker = (registration) => {
  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
};

export const registerGreffioServiceWorker = () => {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD || isCapacitorNative()) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      if (registration.waiting) applyWaitingWorker(registration);

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            applyWaitingWorker(registration);
          }
        });
      });
    }).catch(() => {});

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (window.sessionStorage.getItem('greffio_sw_reloading')) return;
      window.sessionStorage.setItem('greffio_sw_reloading', '1');
      window.location.reload();
    });
  });
};

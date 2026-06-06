import { toast } from 'sonner';
import { isCapacitorNative } from '@/utils/platform.js';

let updateToastShown = false;

const notifyUpdateReady = (registration) => {
  if (updateToastShown || isCapacitorNative()) return;
  updateToastShown = true;
  toast('Une nouvelle version de Greffio est disponible.', {
    duration: Infinity,
    action: {
      label: 'Recharger',
      onClick: () => {
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      },
    },
  });
};

export const registerGreffioServiceWorker = () => {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD || isCapacitorNative()) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      if (registration.waiting) notifyUpdateReady(registration);

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            notifyUpdateReady(registration);
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

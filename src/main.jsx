import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import './index.css';
import { clearChunkReloadGuard, isChunkLoadError, reloadForChunkError } from '@/utils/chunkRecovery.js';
import { initializeClientDataCache } from '@/utils/clientDataCache.js';
import { registerGreffioServiceWorker } from '@/utils/serviceWorkerRegistration.js';
import { queryClient } from '@/lib/queryClient.js';
import { initWebVitals } from '@/utils/observability/webVitals.js';
import { initClientErrorReporting } from '@/utils/observability/errorReporting.js';
import { installClareffioBranding } from '@/utils/clareffioBranding.js';

initializeClientDataCache(null);
clearChunkReloadGuard();
initClientErrorReporting();
initWebVitals();
installClareffioBranding();

window.addEventListener('error', (event) => {
  if (isChunkLoadError(event?.message || '')) {
    reloadForChunkError();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const message = String(event?.reason?.message || event?.reason || '');
  if (isChunkLoadError(message)) {
    event.preventDefault();
    reloadForChunkError();
  }
});

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
  rootElement.querySelector('#clareffio-boot')?.remove();
  rootElement.querySelector('#greffio-boot')?.remove();
}

registerGreffioServiceWorker();

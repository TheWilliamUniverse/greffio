import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { clearChunkReloadGuard, isChunkLoadError, reloadForChunkError } from '@/utils/chunkRecovery.js';
import { initializeClientDataCache } from '@/utils/clientDataCache.js';
import { registerGreffioServiceWorker } from '@/utils/serviceWorkerRegistration.js';

initializeClientDataCache(null);
clearChunkReloadGuard();

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
  ReactDOM.createRoot(rootElement).render(<App />);
  rootElement.querySelector('#greffio-boot')?.remove();
}

registerGreffioServiceWorker();
